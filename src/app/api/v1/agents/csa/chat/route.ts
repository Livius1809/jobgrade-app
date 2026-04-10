import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { readFileSync } from "fs"
import { join } from "path"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { buildClientContext, formatContextForPrompt } from "@/lib/context/client-context-engine"
import { getClientProfile, formatClientProfileForPrompt, recordClientMemory, recordSupportInteraction } from "@/lib/agents/client-memory"
import { createEscalation, ESCALATION_CHAIN } from "@/lib/agents/escalation-chain"
import { injectKBContext } from "@/lib/kb/kb-injector"
import { checkPromptInjection, getInjectionBlockResponse } from "@/lib/security/prompt-injection-filter"
import { checkEscalation, getEscalationBlockResponse } from "@/lib/security/escalation-detector"
import { checkBudget, recordAPIUsage, getBudgetExceededResponse } from "@/lib/ai/budget-cap"
import { guardBoundaries, getBoundaryBlockResponse } from "@/lib/agents/boundary-guard"

export const maxDuration = 60

const AGENT_ROLE = "CSA"
const THREAD_TYPE = "ASSISTANT" as const
const MODEL = "claude-sonnet-4-20250514"

// ── Load system prompt from .md file ────────────────────────────────────────

let cachedSystemPrompt: string | null = null

function loadSystemPrompt(): string {
  if (cachedSystemPrompt) return cachedSystemPrompt
  try {
    const filepath = join(process.cwd(), "src", "lib", "agents", "system-prompts", "csa-system-prompt.md")
    cachedSystemPrompt = readFileSync(filepath, "utf-8")
    return cachedSystemPrompt
  } catch {
    return ""
  }
}

// ── Escalation detection ────────────────────────────────────────────────────

const ESCALATION_TRIGGERS_CSSA = [
  { pattern: /nemul[tț]um|dezam[aă]gi|frustrat|furios|plec|reziliez/i, reason: "Client nemulțumit — escaladare la CSSA", priority: "HIGH" as const, target: "CSSA" },
  { pattern: /upgrade|tier\s*superior|plan\s*mai\s*mare|pre[tț]/i, reason: "Cerere comercială — redirecționare CSSA/SOA", priority: "MEDIUM" as const, target: "CSSA" },
  { pattern: /feature\s*nou|func[tț]ionalitate\s*lips[aă]|de\s*ce\s*nu\s*pot/i, reason: "Feature request — redirecționare CSSA → PMA", priority: "MEDIUM" as const, target: "CSSA" },
  { pattern: /problema\s*recurent|a\s*treia\s*oar[aă]|din\s*nou\s*acela[sș]i/i, reason: "Problemă recurentă — escaladare cu istoric", priority: "HIGH" as const, target: "CSSA" },
]

const ESCALATION_TRIGGERS_QLA = [
  { pattern: /bug|eroare\s*500|crash|nu\s*func[tț]ioneaz[aă]|se\s*blocheaz[aă]/i, reason: "Bug confirmat — escaladare la QLA", priority: "HIGH" as const, target: "QLA" },
  { pattern: /date\s*pierdute|calcul\s*gre[sș]it|rezultat\s*incorect/i, reason: "Bug date/calcule — escaladare la QLA", priority: "CRITICAL" as const, target: "QLA" },
  { pattern: /foarte\s*[iî]ncet|se\s*[iî]ncarc[aă]\s*greu|performan[tț][aă]/i, reason: "Problemă performanță — escaladare la QLA", priority: "MEDIUM" as const, target: "QLA" },
]

const ESCALATION_TRIGGERS_EMA = [
  { pattern: /date\s*migra|import\s*e[sș]uat|date\s*vechi\s*lips[aă]/i, reason: "Eroare date/migrare — escaladare la EMA", priority: "HIGH" as const, target: "EMA" },
]

function detectEscalation(message: string, reply: string): { needed: boolean; reason: string; priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"; target: string } | null {
  const combined = `${message} ${reply}`

  // Check QLA triggers first (bugs are highest priority)
  for (const trigger of ESCALATION_TRIGGERS_QLA) {
    if (trigger.pattern.test(combined)) {
      return { needed: true, reason: trigger.reason, priority: trigger.priority, target: trigger.target }
    }
  }

  // Check EMA triggers
  for (const trigger of ESCALATION_TRIGGERS_EMA) {
    if (trigger.pattern.test(combined)) {
      return { needed: true, reason: trigger.reason, priority: trigger.priority, target: trigger.target }
    }
  }

  // Check CSSA triggers
  for (const trigger of ESCALATION_TRIGGERS_CSSA) {
    if (trigger.pattern.test(combined)) {
      return { needed: true, reason: trigger.reason, priority: trigger.priority, target: trigger.target }
    }
  }

  return null
}

// ── POST /api/v1/agents/csa/chat ────────────────────────────────────────────

/**
 * POST /api/v1/agents/csa/chat
 *
 * Chat cu CSA (Customer Support Agent) — client-facing B2B.
 * Triază, diagnostichează și rezolvă cererile de suport.
 * Tier 1 — rezolvare directă. Tier 2+ — escaladare la CSSA/QLA/EMA.
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

    // 0a. Prompt injection pre-filter
    const injectionCheck = checkPromptInjection(message.trim())
    if (injectionCheck.blocked) {
      return NextResponse.json({
        reply: getInjectionBlockResponse(),
        threadId: threadId || null,
        agentRole: AGENT_ROLE,
        blocked: true,
      })
    }

    // 0b. Escalation detector — sliding window (VUL-005)
    const userId = session.user.id
    const escalationCheck = checkEscalation(
      userId,
      message.trim(),
      injectionCheck.detections.map((d) => d.category),
      injectionCheck.flagged
    )
    if (escalationCheck.blocked) {
      console.warn(`[${AGENT_ROLE}] Escalation blocked for user ${userId}: ${escalationCheck.reason}`)
      return NextResponse.json({
        reply: getEscalationBlockResponse(),
        threadId: threadId || null,
        agentRole: AGENT_ROLE,
        blocked: true,
      })
    }
    const tenantId = companyId || (session.user as any).tenantId

    // 0d. Boundary check (immune system) — A3 audit
    const boundaryVerdict = await guardBoundaries(prisma, {
      sourceType: "client_input",
      sourceRole: "B2B_USER",
      content: message.trim(),
    }, tenantId)

    if (!boundaryVerdict.passed && boundaryVerdict.highestAction === "BLOCK") {
      return NextResponse.json({
        reply: getBoundaryBlockResponse(boundaryVerdict, "ro"),
        threadId: threadId || null,
        agentRole: AGENT_ROLE,
        blocked: true,
      })
    }

    // 0c. Budget cap check (BUILD-008)
    const budgetCheck = checkBudget(tenantId || userId, 'B2B', 0.015)
    if (!budgetCheck.allowed) {
      return NextResponse.json({
        reply: getBudgetExceededResponse('ro'),
        threadId: threadId || null,
        agentRole: AGENT_ROLE,
        blocked: true,
      })
    }

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
      "",
      "COMPORTAMENT SUPORT:",
      "- Confirmare imediată: clientul trebuie să știe că a fost auzit",
      "- Diagnostic rapid: maxim 2 întrebări de clarificare",
      "- Rezolvare Tier 1 direct, cu pași clari și numerotați",
      "- Tier 2+: escaladare transparentă cu timeframe estimat",
      "- Follow-up: confirmă întotdeauna rezolvarea",
      "- NICIODATĂ nu minimiza problema clientului",
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

    // 6b. Record API usage (BUILD-008)
    recordAPIUsage(tenantId || userId, 'B2B', 0.015)

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

    // 10. Record support interaction in client memory (non-blocking)
    recordSupportInteraction(
      tenantId,
      message.trim().substring(0, 150),
      assistantText.substring(0, 150),
      AGENT_ROLE,
      prisma
    ).catch(() => {})

    // 11. Check escalation triggers
    const escalation = detectEscalation(message, assistantText)
    if (escalation) {
      createEscalation({
        sourceRole: AGENT_ROLE,
        targetRole: escalation.target,
        aboutRole: AGENT_ROLE,
        reason: escalation.reason,
        details: `Mesaj client suport: "${message.trim().substring(0, 200)}"`,
        priority: escalation.priority,
      }, prisma).catch(() => {})
    }

    return NextResponse.json({
      reply: assistantText,
      threadId: thread.id,
      agentRole: AGENT_ROLE,
    })
  } catch (e: any) {
    console.error(`[${AGENT_ROLE}] Error:`, e instanceof Error ? e.constructor.name : "Unknown")
    return NextResponse.json(
      { error: "Nu am putut procesa mesajul", details: e.message },
      { status: 500 }
    )
  }
}
