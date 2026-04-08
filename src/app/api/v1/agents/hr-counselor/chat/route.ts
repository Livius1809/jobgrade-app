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
import { injectCommercialKnowledge } from "@/lib/shared/commercial-knowledge"
import { observeB2BInteraction, applyB2BInsight } from "@/lib/b2b/counselor-shadow"
import { checkPromptInjection, getInjectionBlockResponse } from "@/lib/security/prompt-injection-filter"
import { checkEscalation, getEscalationBlockResponse } from "@/lib/security/escalation-detector"
import { checkBudget, recordAPIUsage, getBudgetExceededResponse } from "@/lib/ai/budget-cap"

export const maxDuration = 60

const AGENT_ROLE = "HR_COUNSELOR"
const THREAD_TYPE = "ASSISTANT" as const
const MODEL = "claude-sonnet-4-20250514"

// ── Load system prompt from .md file ────────────────────────────────────────

let cachedSystemPrompt: string | null = null

function loadSystemPrompt(): string {
  if (cachedSystemPrompt) return cachedSystemPrompt
  try {
    const filepath = join(process.cwd(), "src", "lib", "agents", "system-prompts", "hr-counselor-system-prompt.md")
    cachedSystemPrompt = readFileSync(filepath, "utf-8")
    return cachedSystemPrompt
  } catch {
    return ""
  }
}

// ── Escalation detection ────────────────────────────────────────────────────

const ESCALATION_TRIGGERS = [
  { pattern: /conflict\s*(între|intre|evaluator)|dezacord\s*(comitet|evaluator)|nu\s*cad\s*de\s*acord|impas\s*evaluare/i, reason: "Mediere necesară — conflict între membrii comitetului de evaluare", priority: "HIGH" as const },
  { pattern: /lege\s*munc|cod\s*munc|contract\s*(individual|colectiv)|discriminare|hărțuire|h[aă]r[tț]uire|concediere\s*(abuziv|ilegal)|drepturile?\s*(mele|angaja)/i, reason: "Întrebare juridică — legislație muncii, contracte, discriminare", priority: "HIGH" as const },
  { pattern: /test\s*psihometric|evaluare\s*psihologic|profil\s*personalitate|assessment\s*center|baterie\s*(de\s*)?teste/i, reason: "Cerere evaluare psihometrică — redirecționare PPMO", priority: "MEDIUM" as const },
  { pattern: /negociere\s*salar|mărire\s*salar|m[aă]rire\s*salar|pay\s*gap|diferenț[aă]\s*salarial|echitate\s*salarial/i, reason: "Negociere salarială — redirecționare pay gap analysis", priority: "HIGH" as const },
  { pattern: /vreau\s*s[aă]\s*plec|reziliez|anule?z|churn/i, reason: "Risc churn confirmat — client amenință cu plecarea", priority: "CRITICAL" as const },
  { pattern: /nemul[tț]um|dezam[aă]gi|frustrat|furios/i, reason: "Client nemulțumit — intervenție necesară", priority: "HIGH" as const },
]

function detectEscalation(message: string, reply: string): { needed: boolean; reason: string; priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"; target: string } | null {
  const combined = `${message} ${reply}`
  for (const trigger of ESCALATION_TRIGGERS) {
    if (trigger.pattern.test(combined)) {
      const target = ESCALATION_CHAIN[AGENT_ROLE] || "PMA"
      return { needed: true, reason: trigger.reason, priority: trigger.priority, target }
    }
  }
  return null
}

// ── POST /api/v1/agents/hr-counselor/chat ──────────────────────────────────

/**
 * POST /api/v1/agents/hr-counselor/chat
 *
 * Chat cu HR_COUNSELOR — client-facing B2B principal.
 * Facilitează sesiunile de evaluare și ierarhizare a joburilor,
 * ghidează procesul de consens, integrează funcționalitate MGA (mediere).
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
      injectCommercialKnowledge(message.trim(), "B2B"),
      "",
      "REGULA DE AUR — NICIODATĂ nu transpare urmărirea:",
      "- NU spui \"Văd că ai vizitat...\", \"Am observat că nu ai...\"",
      "- DA construiești pasul următor natural, ca într-o conversație organică",
      "- Clientul simte că ești intuitiv, nu că l-ai urmărit",
      "- Contextul e INVIZIBIL — informează tonul și direcția, nu conținutul explicit",
      "",
      "COMPORTAMENT HR COUNSELOR:",
      "- Răspunsuri structurate, adaptate la nivelul de expertiză al interlocutorului (2-4 paragrafe)",
      "- Dacă clientul e frustrat, validează emoția ÎNAINTE de a oferi soluția",
      "- Facilitează consensul cu obiectivitate — focusează pe argumente, nu persoane",
      "- Când detectezi conflict între evaluatori, activează mediere (MGA): anonimizare, redirecționare pe date",
      "- Dacă apar întrebări juridice (legislație muncii, discriminare, contracte) → semnalează că nu ești jurist și recomandă validare CJA",
      "- Dacă clientul cere evaluare psihometrică → redirecționează elegant spre PPMO",
      "- Fiecare interacțiune trebuie să lase clientul mai încrezător în procesul de evaluare",
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

    // 10. Record memory from interaction (non-blocking)
    recordClientMemory(
      tenantId,
      "HISTORY",
      `HR_COUNSELOR chat: "${message.trim().substring(0, 100)}"`,
      AGENT_ROLE,
      prisma,
      { importance: 0.5, tags: ["hr-counselor", "chat", "evaluare", "facilitare"] }
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
