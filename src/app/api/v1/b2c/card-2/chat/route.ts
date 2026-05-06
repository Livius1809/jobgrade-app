import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { cpuCall } from "@/lib/cpu/gateway"
import { readFileSync } from "fs"
import { join } from "path"
import { prisma } from "@/lib/prisma"
import { injectKBContext } from "@/lib/kb/kb-injector"
import { injectCommercialKnowledge } from "@/lib/shared/commercial-knowledge"
import { observeInteraction, applyProfileUpdate } from "@/lib/b2c/profiler-shadow"
import { guardProfileIntegrity, quarantineInteraction } from "@/lib/b2c/coherence-guard"
import { checkPromptInjection, getInjectionBlockResponse } from "@/lib/security/prompt-injection-filter"
import { checkEscalation, getEscalationBlockResponse } from "@/lib/security/escalation-detector"
import { extractB2CAuth, verifyB2COwnership } from "@/lib/security/b2c-auth"
import { checkBudget, recordAPIUsage, getBudgetExceededResponse } from "@/lib/ai/budget-cap"
import { guardBoundaries, getBoundaryBlockResponse } from "@/lib/agents/boundary-guard"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const AGENT_ROLE = "CARD2_COUNSELOR"
const THREAD_TYPE = "B2C_RELATIONSHIPS" as const
const MODEL = "claude-sonnet-4-20250514"

// ── Load system prompt ─────────────────────────────────────────────────────

let cachedSystemPrompt: string | null = null

function loadSystemPrompt(): string {
  if (cachedSystemPrompt) return cachedSystemPrompt
  try {
    const filepath = join(process.cwd(), "src", "lib", "agents", "system-prompts", "card-2-system-prompt.md")
    cachedSystemPrompt = readFileSync(filepath, "utf-8")
    return cachedSystemPrompt
  } catch {
    return ""
  }
}

// ── Safety triggers ────────────────────────────────────────────────────────

const SAFETY_TRIGGERS = [
  { pattern: /sinucid|suicid|s[aă]\s*m[aă]\s*omor|vreau\s*s[aă]\s*mor/i, level: "CRITICAL" as const },
  { pattern: /auto-v[aă]t[aă]m|m[aă]\s*tai|m[aă]\s*r[aă]nesc/i, level: "CRITICAL" as const },
  { pattern: /nu\s*mai\s*vreau\s*s[aă]\s*tr[aă]iesc|totul\s*e\s*degeaba/i, level: "CRITICAL" as const },
  { pattern: /halucinezi|voci\s*(care|ce)|aud\s*voci|v[aă]d\s*lucruri/i, level: "HIGH" as const },
  { pattern: /depresi[ea]|anxietat[ea]\s*sever[aă]|atacuri?\s*de\s*panic[aă]/i, level: "HIGH" as const },
  { pattern: /violen[tț][aă]\s*(domestic[aă]|fizic[aă])|m[aă]\s*bate|m[aă]\s*amenin[tț]/i, level: "CRITICAL" as const },
  { pattern: /abuz\s*(sexual|fizic|emo[tț]ional)/i, level: "CRITICAL" as const },
]

function checkSafety(message: string): { level: "CRITICAL" | "HIGH" | null } {
  for (const trigger of SAFETY_TRIGGERS) {
    if (trigger.pattern.test(message)) {
      return { level: trigger.level }
    }
  }
  return { level: null }
}

// ── POST /api/v1/b2c/card-2/chat ─────────────────────────────────────────

/**
 * Chat cu Consilierul de Dezvoltare Relationala B2C (Card 2 — "Eu si ceilalti").
 * Relatii interpersonale, comunicare, empatie, rezolvare conflicte.
 *
 * Body: { userId: string, message: string, threadId?: string }
 */
export async function POST(req: NextRequest) {
  const p = prisma as any

  try {
    const body = await req.json()
    const { userId, message, threadId } = body

    if (!userId || !message?.trim()) {
      return NextResponse.json({ error: "userId si message sunt obligatorii" }, { status: 400 })
    }

    // 0a. B2C Auth — verifica token + ownership
    const b2cAuth = extractB2CAuth(req)
    if (!b2cAuth) {
      return NextResponse.json({ error: "Token B2C invalid sau lipsa" }, { status: 401 })
    }
    if (!verifyB2COwnership(b2cAuth, userId)) {
      return NextResponse.json({ error: "Nu ai acces la acest cont" }, { status: 403 })
    }

    // 0b. Prompt injection pre-filter
    const injectionCheck = checkPromptInjection(message.trim())
    if (injectionCheck.blocked) {
      return NextResponse.json({
        reply: getInjectionBlockResponse(),
        threadId: threadId || null,
        agentRole: AGENT_ROLE,
        blocked: true,
      })
    }

    // 0c. Escalation detector — sliding window (VUL-005)
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

    // 0d. Boundary check (immune system) — A3 audit
    const boundaryVerdict = await guardBoundaries(prisma, {
      sourceType: "client_input",
      sourceRole: "B2C_USER",
      content: message.trim(),
    }, null)

    if (!boundaryVerdict.passed && boundaryVerdict.highestAction === "BLOCK") {
      return NextResponse.json({
        reply: getBoundaryBlockResponse(boundaryVerdict, "ro"),
        threadId: threadId || null,
        agentRole: AGENT_ROLE,
        blocked: true,
      })
    }

    // 0e. Budget cap check (BUILD-008)
    const budgetCheck = checkBudget(userId, 'B2C', 0.015)
    if (!budgetCheck.allowed) {
      return NextResponse.json({
        reply: getBudgetExceededResponse('ro'),
        threadId: threadId || null,
        agentRole: AGENT_ROLE,
        blocked: true,
      })
    }

    // 1. Verifica user B2C + Card 2 activ
    const user = await p.b2CUser.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        cards: true,
        testResults: { orderBy: { administeredAt: "desc" }, take: 5 },
      },
    })

    if (!user) {
      return NextResponse.json({ error: "Utilizator negasit" }, { status: 404 })
    }

    const card2 = user.cards.find((c: any) => c.card === "CARD_2")
    if (!card2 || card2.status === "LOCKED") {
      return NextResponse.json(
        { error: "Card 2 nu este activat. Activeaza-l pentru a vorbi cu Consilierul de Relatii." },
        { status: 403 }
      )
    }

    // 2. Safety check
    const safety = checkSafety(message.trim())
    if (safety.level === "CRITICAL") {
      await p.b2CEvolutionEntry.create({
        data: {
          userId, card: "CARD_2", type: "MILESTONE",
          title: "Escaladare SAFETY_MONITOR — nivel CRITIC",
          phase: card2.phase, stage: card2.stage, agentRole: AGENT_ROLE,
        },
      }).catch(() => {})

      return NextResponse.json({
        reply: "Inteleg ca treci printr-un moment foarte greu. Te rog sa suni acum la Telefonul Sperantei: 0800 801 200 (gratuit, non-stop). Sunt oameni care te pot ajuta imediat. Sunt aici cand esti gata sa continuam.",
        threadId: threadId || null,
        agentRole: AGENT_ROLE,
        safetyEscalation: "CRITICAL",
      })
    }

    // 3. Aggregate context from ALL B2C fluxuri (invizibil)
    const [recentEvolution, allSessions, kbContext] = await Promise.all([
      p.b2CEvolutionEntry.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 15,
        select: { card: true, type: true, title: true, phase: true, stage: true, createdAt: true },
      }).catch(() => []),
      p.b2CSession.findMany({
        where: { userId },
        orderBy: { startedAt: "desc" },
        take: 8,
        select: { card: true, agentRole: true, milestones: true, startedAt: true },
      }).catch(() => []),
      injectKBContext(AGENT_ROLE, message.trim()).catch(() => ""),
    ])

    // 4. Build invisible profile context
    const profile = user.profile
    const profileLines = profile ? [
      profile.herrmannA != null ? `Herrmann: A=${profile.herrmannA} B=${profile.herrmannB} C=${profile.herrmannC} D=${profile.herrmannD}` : null,
      profile.hawkinsEstimate ? `Hawkins estimat: ~${profile.hawkinsEstimate} (conf: ${profile.hawkinsConfidence})` : null,
      profile.viaSignature?.length ? `VIA signature: ${profile.viaSignature.join(", ")}` : null,
      profile.viaUndeveloped?.length ? `VIA necultivate: ${profile.viaUndeveloped.join(", ")}` : null,
      `Spirala globala: nivel ${profile.spiralLevel}, etapa ${profile.spiralStage}`,
      profile.dialogInsights ? `Insights dialog: ${JSON.stringify(profile.dialogInsights)}` : null,
    ].filter(Boolean).join("\n") : ""

    const evolutionContext = recentEvolution.length
      ? `Traseu evolutiv:\n${recentEvolution.map((e: any) => `  - ${e.title} [${e.card}, ${e.phase}, etapa ${e.stage}]`).join("\n")}`
      : ""

    const crossCardContext = allSessions
      .filter((s: any) => s.card !== "CARD_2")
      .map((s: any) => `${s.card}/${s.agentRole}`)

    const testsContext = user.testResults.length
      ? `Teste: ${user.testResults.map((t: any) => `${t.testName} (${t.testType})`).join(", ")}`
      : ""

    // 5. Get or create thread
    let thread: any
    if (threadId) {
      thread = await p.conversationThread.findFirst({
        where: { id: threadId, userId },
        include: { messages: { orderBy: { createdAt: "asc" }, take: 30 } },
      })
    }

    if (!thread) {
      thread = await p.conversationThread.create({
        data: {
          tenantId: "b2c",
          userId,
          agentRole: AGENT_ROLE,
          threadType: THREAD_TYPE,
        },
        include: { messages: [] as any },
      })
      thread.messages = thread.messages || []
    }

    // 6. Coherence guard — protectie integritate profil
    const recentClientMessages = (thread.messages || [])
      .filter((m: any) => m.role === "USER")
      .map((m: any) => m.content)
      .slice(-10)

    const guard = await guardProfileIntegrity(
      message.trim(),
      user.profile,
      recentClientMessages,
      {
        totalSessions: user.testResults?.length || 0,
        avgMessageLength: recentClientMessages.length > 0
          ? Math.round(recentClientMessages.join(" ").split(/\s+/).length / recentClientMessages.length)
          : 0,
        dominantTopics: [],
      }
    )

    // 7. Save user message
    await p.conversationMessage.create({
      data: { threadId: thread.id, role: "USER", content: message.trim() },
    })

    // 7b. Build history
    const history = thread.messages.map((m: any) => ({
      role: m.role === "USER" ? "user" as const : "assistant" as const,
      content: m.content,
    }))
    history.push({ role: "user" as const, content: message.trim() })

    // 8. System prompt — Consilier Relational: empatic, cald, reflectiv
    const systemPromptMd = loadSystemPrompt()
    const messageCount = thread.messages.filter((m: any) => m.role === "USER").length

    const fullSystemPrompt = [
      systemPromptMd,
      "",
      "--- CONTEXT INVIZIBIL (NICIODATA nu transpare) ---",
      `Alias: ${user.alias}`,
      `Card 2: faza ${card2.phase}, etapa ${card2.stage}`,
      profileLines,
      evolutionContext,
      crossCardContext.length ? `Activitate pe alte carduri: ${crossCardContext.join(", ")}` : "",
      testsContext,
      kbContext,
      injectCommercialKnowledge(message.trim(), "B2C"),
      "",
      "--- CALIBRARE CONSILIER RELATIONAL ---",
      "Raspunsuri de 2-4 paragrafe. Empatice dar nu sentimentale.",
      "Asculta activ — reformuleaza ce spune clientul.",
      "Intrebari care deschid reflectia, nu care directioneaza.",
      "ZERO jargon psihologic. Limbaj simplu, cald, uman.",
      "Nu mentionezi NICIODATA: Hawkins, Herrmann, VIA, atasament anxios/evitant, Bowlby, Gottman.",
      `Mesaj #${messageCount + 1} din conversatie — ${messageCount === 0 ? "primul contact pe Card 2" : "continuare drum"}.`,
      safety.level === "HIGH"
        ? "ATENTIE: semnale subclinice detectate. Monitorizeaza cu grija. Fii prezent, nu alarmant."
        : "",
    ].filter(Boolean).join("\n")

    // 9. Call Claude via CPU gateway
    const cpuResult = await cpuCall({
      model: MODEL,
      max_tokens: 900,
      system: fullSystemPrompt,
      messages: history,
      agentRole: AGENT_ROLE,
      operationType: "chat",
    })

    let assistantText = cpuResult.text

    // 9b. Record API usage (BUILD-008)
    recordAPIUsage(userId, 'B2C', 0.015)

    // 10. Append protection message if guard detected something
    if (guard.protectionMessage) {
      assistantText = assistantText + "\n\n---\n\n" + guard.protectionMessage
    }

    // 11. Save response
    await p.conversationMessage.create({
      data: { threadId: thread.id, role: "ASSISTANT", content: assistantText },
    })

    // 12. Update thread
    await p.conversationThread.update({
      where: { id: thread.id },
      data: {
        title: thread.messages.length === 0 ? `Consilier Relatii — ${user.alias}` : undefined,
        updatedAt: new Date(),
      },
    })

    // 13. Profiler shadow — observa invizibil (SKIP daca datele sunt contaminate)
    if (!guard.quarantine) {
      observeInteraction(
        {
          card: "CARD_2",
          agentRole: AGENT_ROLE,
          conversationSummary: "",
          lastClientMessage: message.trim(),
          lastAgentResponse: assistantText,
        },
        user.profile
      ).then(async (update) => {
        if (update) await applyProfileUpdate(userId, update, prisma).catch(() => {})
      }).catch(() => {})
    } else {
      quarantineInteraction(
        userId, thread.id,
        guard.detectionType === "PROXY" ? "PROXY_DETECTED" : "COHERENCE_ANOMALY",
        `Guard: ${guard.detectionType}, mesaj: "${message.trim().substring(0, 100)}"`,
        prisma
      ).catch(() => {})
    }

    // 14. Create/update session
    await p.b2CSession.upsert({
      where: { id: threadId || "new" },
      create: {
        userId,
        card: "CARD_2",
        agentRole: AGENT_ROLE,
        threadId: thread.id,
        status: "ACTIVE",
      },
      update: { status: "ACTIVE" },
    }).catch(() => {})

    // 15. Learning funnel
    try {
      const { learningFunnel } = await import("@/lib/agents/learning-funnel")
      await learningFunnel({
        agentRole: AGENT_ROLE, type: "CONVERSATION",
        input: message.trim().slice(0, 500), output: assistantText.slice(0, 1000),
        success: true, metadata: { source: "card-2-chat", threadId: thread.id },
      })
    } catch {}

    // 16. Learning hooks — onClientFeedback
    try {
      const { onClientFeedback } = await import("@/lib/agents/learning-hooks")
      await onClientFeedback({
        sessionId: thread.id,
        agentRole: AGENT_ROLE,
        feedbackType: "implicit_behavior",
        feedbackValue: assistantText.slice(0, 300),
        sentiment: "neutral",
        sessionContext: message.trim().slice(0, 300),
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
