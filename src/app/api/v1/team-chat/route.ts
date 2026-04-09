import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { buildAgentPromptWithKB } from "@/lib/agents/agent-prompt-builder"
import { calibrateOwnerInput } from "@/lib/agents/owner-calibration"
import { logOwnerCalibration } from "@/lib/agents/owner-calibration-log"
import Anthropic from "@anthropic-ai/sdk"

export const maxDuration = 60

const MODEL = "claude-sonnet-4-20250514"

/**
 * POST /api/v1/team-chat
 * Chat cu orice agent din organigramă.
 * Body: { message: string, targetAgent: string, history?: Array<{role, content}> }
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Nu ești autentificat" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { message, targetAgent, history } = body

    if (!message?.trim() || !targetAgent) {
      return NextResponse.json({ error: "Necesar: message + targetAgent" }, { status: 400 })
    }

    const p = prisma as any

    // Găsește agentul
    const agent = await p.agentDefinition.findUnique({
      where: { agentRole: targetAgent },
      select: { agentRole: true, displayName: true, description: true, level: true, objectives: true },
    })

    if (!agent) {
      return NextResponse.json({ error: `Agent ${targetAgent} nu există` }, { status: 404 })
    }

    // Calibrare Owner input
    const ownerCalibration = calibrateOwnerInput(message.trim())
    logOwnerCalibration(ownerCalibration, "direct", prisma as any).catch(() => {})

    // Construiește prompt-ul agentului cu KB + L1+L2+L3
    const systemPrompt = await buildAgentPromptWithKB(
      agent.agentRole,
      agent.description,
      p,
      {
        additionalContext: [
          `Vorbești DIRECT cu Owner-ul (${session.user.name || "Owner"}).`,
          agent.objectives?.length ? `Obiectivele tale: ${agent.objectives.join("; ")}` : "",
          `Răspunde din perspectiva rolului tău. Fii concis, profesional, la obiect.`,
          `Dacă întrebarea depășește competența ta, spune explicit și recomandă agentul potrivit.`,
          ownerCalibration.summary || "",
        ].filter(Boolean).join("\n"),
        includeSystemPrompt: true,
      }
    )

    // Construiește history
    const historyMessages = (history || []).map((h: any) => ({
      role: h.role === "owner" ? "user" as const : "assistant" as const,
      content: h.content,
    }))

    const client = new Anthropic()
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: systemPrompt,
      messages: [
        ...historyMessages,
        { role: "user", content: `OWNER: ${message.trim()}` },
      ],
    })

    const answer = response.content[0].type === "text" ? response.content[0].text : "Nu am putut genera un răspuns."

    return NextResponse.json({
      answer,
      agent: { role: agent.agentRole, name: agent.displayName, level: agent.level },
      ...(ownerCalibration.flags.length > 0 && {
        ownerCalibration: {
          flags: ownerCalibration.flags,
          isAligned: ownerCalibration.isAligned,
        },
      }),
    })
  } catch (e: any) {
    console.error("[TEAM CHAT] Error:", e instanceof Error ? e.constructor.name : "Unknown")
    return NextResponse.json({ error: "Eroare internă" }, { status: 500 })
  }
}
