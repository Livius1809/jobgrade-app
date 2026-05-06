import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { cpuCall } from "@/lib/cpu/gateway"
import { readFileSync } from "fs"
import { join } from "path"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"
import { buildClientContext, formatContextForPrompt } from "@/lib/context/client-context-engine"
import { getClientProfile, formatClientProfileForPrompt, recordClientMemory } from "@/lib/agents/client-memory"
import { createEscalation, ESCALATION_CHAIN } from "@/lib/agents/escalation-chain"
import { injectKBContext } from "@/lib/kb/kb-injector"
import { injectCommercialKnowledge } from "@/lib/shared/commercial-knowledge"
import { observeB2BInteraction, applyB2BInsight } from "@/lib/b2b/counselor-shadow"
import { checkPromptInjection, getInjectionBlockResponse } from "@/lib/security/prompt-injection-filter"
import { checkEscalation, getEscalationBlockResponse } from "@/lib/security/escalation-detector"
import { checkBudget, recordAPIUsage, getBudgetExceededResponse } from "@/lib/ai/budget-cap"
import { guardBoundaries, getBoundaryBlockResponse } from "@/lib/agents/boundary-guard"

export const maxDuration = 60

const AGENT_ROLE = "CSSA"
const THREAD_TYPE = "ASSISTANT" as const
const MODEL = "claude-sonnet-4-20250514"

// ── Load system prompt from .md file ────────────────────────────────────────

let cachedSystemPrompt: string | null = null

function loadSystemPrompt(): string {
  if (cachedSystemPrompt) return cachedSystemPrompt
  try {
    const filepath = join(process.cwd(), "src", "lib", "agents", "system-prompts", "cssa-system-prompt.md")
    cachedSystemPrompt = readFileSync(filepath, "utf-8")
    return cachedSystemPrompt
  } catch {
    return ""
  }
}

// ── Escalation detection ────────────────────────────────────────────────────

const ESCALATION_TRIGGERS = [
  { pattern: /vreau\s*s[aă]\s*plec|reziliez|anule?z|churn/i, reason: "Risc churn confirmat — client amenință cu plecarea", priority: "CRITICAL" as const },
  { pattern: /nemul[tț]um|dezam[aă]gi|frustrat|furios/i, reason: "Client nemulțumit — intervenție necesară", priority: "HIGH" as const },
  { pattern: /discount|compensare|reducere|ramburs/i, reason: "Cerere discount/compensare — aprobare necesară", priority: "HIGH" as const },
  { pattern: /feature\s*nou|func[tț]ionalitate\s*lips[aă]|de\s*ce\s*nu\s*pot/i, reason: "Feature request major — redirecționare PMA", priority: "MEDIUM" as const },
  { pattern: /enterprise|customiz|personali[sz]/i, reason: "Client enterprise cu cerințe custom", priority: "HIGH" as const },
]

function detectEscalation(message: string, reply: string): { needed: boolean; reason: string; priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"; target: string } | null {
  const combined = `${message} ${reply}`
  for (const trigger of ESCALATION_TRIGGERS) {
    if (trigger.pattern.test(combined)) {
      const target = ESCALATION_CHAIN[AGENT_ROLE] || "COCSA"
      return { needed: true, reason: trigger.reason, priority: trigger.priority, target }
    }
  }
  return null
}

// ── POST /api/v1/agents/cssa/chat ───────────────────────────────────────────

/**
 * POST /api/v1/agents/cssa/chat
 *
 * Chat cu CSSA (Customer Success Agent) — client-facing B2B.
 * Monitorizează sănătatea contului, ghidează adoptarea progresivă,
 * intervine la riscuri de churn, identifică oportunități de upsell.
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

    // 1. Build client context + client memory profile + KB context + Company Profiler
    const [clientContext, clientProfile, kbContext, profilerCtx] = await Promise.all([
      buildClientContext(userId, tenantId, prisma).catch(() => null),
      getClientProfile(tenantId, prisma).catch(() => null),
      injectKBContext(AGENT_ROLE, message.trim()).catch(() => ""),
      tenantId ? import("@/lib/company-profiler").then(m => m.getAgentContext(tenantId, "SOA")).catch(() => null) : Promise.resolve(null),
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
    const profilerPrompt = profilerCtx ? `\n--- COMPANY PROFILER ---\n${profilerCtx.companyEssence}${profilerCtx.deviationsToFlag.length > 0 ? `\nDeviații: ${profilerCtx.deviationsToFlag.join("; ")}` : ""}` : ""
    const fullSystemPrompt = [
      systemPromptMd,
      "",
      "--- CONTEXT CLIENT ---",
      contextPrompt,
      "",
      "--- MEMORIE CLIENT ---",
      memoryPrompt,
      "",
      profilerPrompt,
      "",
      kbContext,
      injectCommercialKnowledge(message.trim(), "B2B"),
      "",
      "REGULA DE AUR — NICIODATĂ nu transpare urmărirea:",
      "- NU spui \"Văd că ai vizitat...\", \"Am observat că nu ai...\"",
      "- DA construiești pasul următor natural, ca într-o conversație organică",
      "- Clientul simte că ești intuitiv, nu că l-ai urmărit",
      "- Contextul e INVIZIBIL — informează tonul și direcția, nu conținutul explicit",
      "",
      "COMPORTAMENT CUSTOMER SUCCESS:",
      "- Răspunsuri concise, orientate spre acțiune (2-4 paragrafe)",
      "- Dacă clientul e frustrat, validează emoția ÎNAINTE de a oferi soluția",
      "- Dacă identifici oportunitate de upsell, menționeaz-o subtil și natural",
      "- Fiecare interacțiune trebuie să lase clientul mai încrezător în platformă",
    ].filter(Boolean).join("\n")

    // 6. Call Claude via CPU gateway
    const cpuResult = await cpuCall({
      model: MODEL,
      max_tokens: 1500,
      system: fullSystemPrompt,
      messages: history,
      agentRole: "CSSA",
      operationType: "chat",
      tenantId,
      userId,
    })

    const assistantText = cpuResult.text

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

    // 10. Record memory from interaction (non-blocking)
    recordClientMemory(
      tenantId,
      "HISTORY",
      `CSSA chat: "${message.trim().substring(0, 100)}"`,
      AGENT_ROLE,
      prisma,
      { importance: 0.4, tags: ["cssa", "chat", "customer-success"] }
    ).catch(() => {})

    // 11. HR_Counselor shadow — observă invizibil interacțiunea B2B (non-blocking)
    const existingMemory = clientProfile ? formatClientProfileForPrompt(clientProfile) : ""
    observeB2BInteraction(
      {
        source: AGENT_ROLE,
        interactionType: "CHAT",
        summary: "",
        clientAction: message.trim(),
        systemResponse: assistantText,
        tenantId,
      },
      existingMemory
    ).then(async (insight) => {
      if (insight) await applyB2BInsight(tenantId, insight, prisma).catch(() => {})
    }).catch(() => {})

    // 12. Check escalation triggers
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

    try {
      const { learningFunnel } = await import("@/lib/agents/learning-funnel")
      await learningFunnel({
        agentRole: AGENT_ROLE, type: "CONVERSATION",
        input: message.trim().slice(0, 500), output: assistantText.slice(0, 1000),
        success: true, metadata: { source: "cssa-chat", threadId: thread.id },
      })
    } catch {}

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
