import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { chatWithCOG } from "@/lib/agents/cog-chat"
import { checkPromptInjection, getInjectionBlockResponse, checkEscalation, getEscalationBlockResponse } from "@/lib/security"

/**
 * POST /api/v1/chat
 * Proxy autentificat pentru COG Chat — folosit din interfața browser.
 * Verifică sesiunea NextAuth (nu x-internal-key).
 * Body: { message: string, history?: Array<{role, content}> }
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Nu ești autentificat" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { message, history } = body

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "Mesajul nu poate fi gol" }, { status: 400 })
    }

    // 0a. Prompt injection pre-filter
    const injectionCheck = checkPromptInjection(message.trim())
    if (injectionCheck.blocked) {
      return NextResponse.json({ reply: getInjectionBlockResponse(), blocked: true })
    }

    // 0b. Escalation detector — sliding window (VUL-005)
    const escalationCheck = checkEscalation(
      session.user.id,
      message.trim(),
      injectionCheck.detections.map((d) => d.category),
      injectionCheck.flagged
    )
    if (escalationCheck.blocked) {
      return NextResponse.json({ reply: getEscalationBlockResponse(), blocked: true })
    }

    const response = await chatWithCOG(message.trim(), prisma, history)

    try {
      const { learningFunnel } = await import("@/lib/agents/learning-funnel")
      await learningFunnel({
        agentRole: "COG", type: "CONVERSATION",
        input: message.trim().slice(0, 500), output: (response.reply || "").slice(0, 1000),
        success: true, metadata: { source: "chat-proxy" },
      })
    } catch {}

    return NextResponse.json(response)
  } catch (e: any) {
    console.error("[CHAT PROXY] Error:", e instanceof Error ? e.constructor.name : "Unknown")
    return NextResponse.json(
      { error: "Nu am putut procesa mesajul" },
      { status: 500 }
    )
  }
}
