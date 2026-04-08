import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { readFileSync } from "fs"
import { join } from "path"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { buildClientContext, formatContextForPrompt } from "@/lib/context/client-context-engine"
import { getClientProfile, formatClientProfileForPrompt, recordClientMemory } from "@/lib/agents/client-memory"
import { createEscalation, ESCALATION_CHAIN } from "@/lib/agents/escalation-chain"
import { injectKBContext } from "@/lib/kb/kb-injector"
import { checkPromptInjection, getInjectionBlockResponse } from "@/lib/security/prompt-injection-filter"

export const maxDuration = 60

const AGENT_ROLE = "SOA"
const THREAD_TYPE = "ASSISTANT" as const
const MODEL = "claude-sonnet-4-20250514"

// ── Load system prompt from .md file ────────────────────────────────────────

let cachedSystemPrompt: string | null = null

function loadSystemPrompt(): string {
  if (cachedSystemPrompt) return cachedSystemPrompt
  try {
    const filepath = join(process.cwd(), "src", "lib", "agents", "system-prompts", "soa-system-prompt.md")
    cachedSystemPrompt = readFileSync(filepath, "utf-8")
    return cachedSystemPrompt
  } catch {
    return ""
  }
}

// ── Escalation detection ────────────────────────────────────────────────────

const ESCALATION_TRIGGERS = [
  { pattern: /client\s*enterprise/i, reason: "Client enterprise cu cerințe custom", priority: "HIGH" as const },
  { pattern: /discount\s*>\s*20|reducere\s*major/i, reason: "Cerere discount >20%", priority: "HIGH" as const },
  { pattern: /contract\s*atipic|clauze?\s*speciale?/i, reason: "Contract atipic solicitat", priority: "MEDIUM" as const },
  { pattern: /competitor|concuren[tț]/i, reason: "Competitor agresiv menționat", priority: "MEDIUM" as const },
  { pattern: /legal|juridic|contract/i, reason: "Întrebare contractuală/legală — redirecționare CJA", priority: "MEDIUM" as const },
]

function detectEscalation(message: string, reply: string): { needed: boolean; reason: string; priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"; target: string } | null {
  const combined = `${message} ${reply}`
  for (const trigger of ESCALATION_TRIGGERS) {
    if (trigger.pattern.test(combined)) {
      const target = trigger.reason.includes("CJA") ? "CJA" : ESCALATION_CHAIN[AGENT_ROLE] || "COCSA"
      return { needed: true, reason: trigger.reason, priority: trigger.priority, target }
    }
  }
  return null
}

// ── POST /api/v1/agents/soa/chat ────────────────────────────────────────────

/**
 * POST /api/v1/agents/soa/chat
 *
 * Chat cu SOA (Sales & Onboarding Agent) — client-facing B2B.
 * Califică lead-uri, oferă demo-uri, răspunde la întrebări comerciale,
 * ghidează onboarding-ul noilor clienți.
 *
 * Body: { message: string, threadId?: string, companyId?: string }
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nu ești autentificat" }, { status: 401 })
  }

  const p = prisma as any

  try {
    const body = await req.json()
    const { message, threadId, companyId } = body

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "Mesajul nu poate fi gol" }, { status: 400 })
    }

    // 0. Prompt injection pre-filter
    const injectionCheck = checkPromptInjection(message.trim())
    if (injectionCheck.blocked) {
      return NextResponse.json({
        reply: getInjectionBlockResponse(),
        threadId: threadId || null,
        agentRole: AGENT_ROLE,
        blocked: true,
      })
    }

    const userId = session.user.id
    const tenantId = companyId || (session.user as any).tenantId

    // 1. Build client context + client memory profile + KB context
    const [clientContext, clientProfile, kbContext] = await Promise.all([
      buildClientContext(userId, tenantId, prisma).catch(() => null),
      getClientProfile(tenantId, prisma).catch(() => null),
      injectKBContext(AGENT_ROLE, message.trim()).catch(() => ""),
    ])

    const contextPrompt = clientContext ? formatContextForPrompt(clientContext) : ""
    const memoryPrompt = clientProfile ? formatClientProfileForPrompt(clientProfile) : ""

    // 2. Get or create conversation thread
    let thread: any
    if (threadId) {
      thread = await p.conversationThread.findFirst({
        where: { id: threadId, userId },
        include: { messages: { orderBy: { createdAt: "asc" }, take: 20 } },
      })
    }

    if (!thread) {
      thread = await p.conversationThread.create({
        data: {
          tenantId,
          userId,
          agentRole: AGENT_ROLE,
          threadType: THREAD_TYPE,
          pageContext: null,
        },
        include: { messages: [] as any },
      })
      thread.messages = thread.messages || []
    }

    // 3. Save user message
    await p.conversationMessage.create({
      data: { threadId: thread.id, role: "USER", content: message.trim() },
    })

    // 4. Build conversation history for Claude
    const history = thread.messages.map((m: any) => ({
      role: m.role === "USER" ? "user" as const : "assistant" as const,
      content: m.content,
    }))
    history.push({ role: "user" as const, content: message.trim() })

    // 5. Build system prompt with all context
    const systemPromptMd = loadSystemPrompt()
    const fullSystemPrompt = [
      systemPromptMd,
      "",
      "--- CONTEXT CLIENT ---",
      contextPrompt,
      "",
      "--- MEMORIE CLIENT ---",
      memoryPrompt,
      "",
      kbContext,
      "",
      "REGULA DE AUR — NICIODATĂ nu transpare urmărirea:",
      "- NU spui \"Văd că ai vizitat...\", \"Am observat că nu ai...\"",
      "- DA construiești pasul următor natural, ca într-o conversație organică",
      "- Clientul simte că ești intuitiv, nu că l-ai urmărit",
      "- Contextul e INVIZIBIL — informează tonul și direcția, nu conținutul explicit",
    ].filter(Boolean).join("\n")

    // 6. Call Claude
    const client = new Anthropic()
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: fullSystemPrompt,
      messages: history,
    })

    const assistantText = response.content[0].type === "text" ? response.content[0].text : ""

    // 7. Save assistant response
    await p.conversationMessage.create({
      data: { threadId: thread.id, role: "ASSISTANT", content: assistantText },
    })

    // 8. Update thread title on first exchange
    if (thread.messages.length === 0) {
      const title = message.trim().substring(0, 80)
      await p.conversationThread.update({
        where: { id: thread.id },
        data: { title, updatedAt: new Date() },
      })
    } else {
      await p.conversationThread.update({
        where: { id: thread.id },
        data: { updatedAt: new Date() },
      })
    }

    // 9. Log interaction
    await p.interactionLog.create({
      data: {
        tenantId,
        userId,
        eventType: "CHAT_MESSAGE",
        pageRoute: null,
        entityType: "conversation",
        entityId: thread.id,
      },
    }).catch(() => {})

    // 10. Record memory from interaction (non-blocking)
    recordClientMemory(
      tenantId,
      "HISTORY",
      `SOA chat: "${message.trim().substring(0, 100)}"`,
      AGENT_ROLE,
      prisma,
      { importance: 0.3, tags: ["soa", "chat"] }
    ).catch(() => {})

    // 11. Check escalation triggers
    const escalation = detectEscalation(message, assistantText)
    if (escalation) {
      createEscalation({
        sourceRole: AGENT_ROLE,
        targetRole: escalation.target,
        aboutRole: AGENT_ROLE,
        reason: escalation.reason,
        details: `Mesaj client: "${message.trim().substring(0, 200)}"`,
        priority: escalation.priority,
      }, prisma).catch(() => {})
    }

    return NextResponse.json({
      reply: assistantText,
      threadId: thread.id,
      agentRole: AGENT_ROLE,
    })
  } catch (e: any) {
    console.error(`[${AGENT_ROLE}] Error:`, e.message)
    return NextResponse.json(
      { error: "Nu am putut procesa mesajul", details: e.message },
      { status: 500 }
    )
  }
}
