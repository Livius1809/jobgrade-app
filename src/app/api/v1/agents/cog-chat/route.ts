import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { chatWithCOG } from "@/lib/agents/cog-chat"
import { checkPromptInjection, getInjectionBlockResponse, checkEscalation, getEscalationBlockResponse } from "@/lib/security"

function checkAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

/**
 * POST /api/v1/agents/cog-chat
 * Chat with COG (Chief Orchestrator General).
 * Body: { message: string, history?: Array<{role: "owner"|"cog", content: string}> }
 */
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { message, history } = body

    if (!message) {
      return NextResponse.json({ error: "Required: message" }, { status: 400 })
    }

    // 0a. Prompt injection pre-filter
    const injectionCheck = checkPromptInjection(message.trim())
    if (injectionCheck.blocked) {
      return NextResponse.json({ reply: getInjectionBlockResponse(), blocked: true })
    }

    // 0b. Escalation detector — sliding window (VUL-005)
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "internal"
    const escalationCheck = checkEscalation(
      ip,
      message.trim(),
      injectionCheck.detections.map((d) => d.category),
      injectionCheck.flagged
    )
    if (escalationCheck.blocked) {
      return NextResponse.json({ reply: getEscalationBlockResponse(), blocked: true })
    }

    const response = await chatWithCOG(message, prisma, history)

    try {
      const { learningFunnel } = await import("@/lib/agents/learning-funnel")
      await learningFunnel({
        agentRole: "COG", type: "CONVERSATION",
        input: message.slice(0, 500), output: ((response as any).reply || (response as any).response || "").slice(0, 1000),
        success: true, metadata: { source: "cog-chat" },
      })
    } catch {}

    return NextResponse.json(response)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
