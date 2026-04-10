import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
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

export const maxDuration = 60

const AGENT_ROLE = "PROFILER"
const THREAD_TYPE = "B2C_PROFILER" as const
const MODEL = "claude-sonnet-4-20250514"

// ── Load system prompt ─────────────────────────────────────────────────────

let cachedSystemPrompt: string | null = null

function loadSystemPrompt(): string {
  if (cachedSystemPrompt) return cachedSystemPrompt
  try {
    const filepath = join(process.cwd(), "src", "lib", "agents", "system-prompts", "profiler-system-prompt.md")
    cachedSystemPrompt = readFileSync(filepath, "utf-8")
    return cachedSystemPrompt
  } catch {
    return ""
  }
}

// ── Safety triggers (escalation to SAFETY_MONITOR) ─────────────────────────

const SAFETY_TRIGGERS = [
  { pattern: /sinucid|suicid|s[aă]\s*m[aă]\s*omor|vreau\s*s[aă]\s*mor/i, level: "CRITICAL" as const },
  { pattern: /auto-v[aă]t[aă]m|m[aă]\s*tai|m[aă]\s*r[aă]nesc/i, level: "CRITICAL" as const },
  { pattern: /nu\s*mai\s*vreau\s*s[aă]\s*tr[aă]iesc|totul\s*e\s*degeaba/i, level: "CRITICAL" as const },
  { pattern: /halucinezi|voci\s*(care|ce)|aud\s*voci|v[aă]d\s*lucruri/i, level: "HIGH" as const },
  { pattern: /depresi[ea]|anxietat[ea]\s*sever[aă]|atacuri?\s*de\s*panic[aă]/i, level: "HIGH" as const },
]

function checkSafety(message: string): { level: "CRITICAL" | "HIGH" | null } {
  for (const trigger of SAFETY_TRIGGERS) {
    if (trigger.pattern.test(message)) {
      return { level: trigger.level }
    }
  }
  return { level: null }
}

// ── POST /api/v1/b2c/profiler/chat ─────────────────────────────────────────

/**
 * Chat cu Profiler-ul B2C (Card 6).
 * Prima interacțiune la onboarding + sesiuni ulterioare de profilare.
 *
 * Body: { userId: string, message: string, threadId?: string }
 */
export async function POST(req: NextRequest) {
  const p = prisma as any

  try {
    const body = await req.json()
    const { userId, message, threadId } = body

    if (!userId || !message?.trim()) {
      return NextResponse.json({ error: "userId și message sunt obligatorii" }, { status: 400 })
    }

    // 0a. B2C Auth — verifică token + ownership
    const b2cAuth = extractB2CAuth(req)
    if (!b2cAuth) {
      return NextResponse.json({ error: "Token B2C invalid sau lipsă" }, { status: 401 })
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

    // 1. Verifică user B2C
    const user = await p.b2CUser.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        cards: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "Utilizator negăsit" }, { status: 404 })
    }

    // 2. Safety check
    const safety = checkSafety(message.trim())
    if (safety.level === "CRITICAL") {
      return NextResponse.json({
        reply: "Înțeleg că treci printr-un moment foarte greu. Te rog să suni acum la Telefonul Speranței: 0800 801 200 (gratuit, non-stop). Sunt oameni care te pot ajuta imediat.",
        threadId: threadId || null,
        agentRole: AGENT_ROLE,
        safetyEscalation: "CRITICAL",
      })
    }

    // 3. Build context from all B2C interactions (Flux 1, 2, 4, 5 — invizibil)
    const [recentSessions, testResults, evolutionLog, kbContext] = await Promise.all([
      p.b2CSession.findMany({
        where: { userId },
        orderBy: { startedAt: "desc" },
        take: 5,
        select: { card: true, agentRole: true, milestones: true },
      }).catch(() => []),
      p.b2CTestResult.findMany({
        where: { userId },
        orderBy: { administeredAt: "desc" },
        take: 10,
        select: { testType: true, testName: true, normScore: true },
      }).catch(() => []),
      p.b2CEvolutionEntry.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { card: true, type: true, title: true, phase: true, stage: true },
      }).catch(() => []),
      injectKBContext(AGENT_ROLE, message.trim()).catch(() => ""),
    ])

    // 4. Build invisible context
    const profileContext = user.profile
      ? [
          user.profile.herrmannA != null ? `Herrmann: A=${user.profile.herrmannA} B=${user.profile.herrmannB} C=${user.profile.herrmannC} D=${user.profile.herrmannD}` : null,
          user.profile.hawkinsEstimate ? `Hawkins estimat: ~${user.profile.hawkinsEstimate} (confidence: ${user.profile.hawkinsConfidence})` : null,
          user.profile.viaSignature?.length ? `VIA signature: ${user.profile.viaSignature.join(", ")}` : null,
          `Spirală: nivel ${user.profile.spiralLevel}, etapă ${user.profile.spiralStage}`,
        ].filter(Boolean).join("\n")
      : ""

    const cardsContext = user.cards
      .map((c: any) => `${c.card}: ${c.status} (faza: ${c.phase})`)
      .join(", ")

    const sessionsContext = recentSessions.length
      ? `Sesiuni recente: ${recentSessions.map((s: any) => `${s.card}/${s.agentRole}`).join(", ")}`
      : ""

    const testsContext = testResults.length
      ? `Teste parcurse: ${testResults.map((t: any) => t.testName).join(", ")}`
      : ""

    const evolutionContext = evolutionLog.length
      ? `Traseu: ${evolutionLog.map((e: any) => `${e.title} (${e.phase})`).join(" → ")}`
      : ""

    // 5. Get or create conversation thread
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

    // 6. Coherence guard — protecție integritate profil
    const recentClientMessages = (thread.messages || [])
      .filter((m: any) => m.role === "USER")
      .map((m: any) => m.content)
      .slice(-10)

    const guard = await guardProfileIntegrity(
      message.trim(),
      user.profile,
      recentClientMessages,
      {
        totalSessions: 0,
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

    // 7. Build conversation history
    const history = thread.messages.map((m: any) => ({
      role: m.role === "USER" ? "user" as const : "assistant" as const,
      content: m.content,
    }))
    history.push({ role: "user" as const, content: message.trim() })

    // 8. Build system prompt with all 5 fluxuri de profilare invizibile
    const systemPromptMd = loadSystemPrompt()
    const isFirstMessage = thread.messages.length === 0

    const fullSystemPrompt = [
      systemPromptMd,
      "",
      "--- CONTEXT INVIZIBIL (nu transpare NICIODATĂ) ---",
      `Alias: ${user.alias}`,
      `Vârstă: ${user.age || "necunoscută"}, Gen: ${user.gender || "nespecificat"}`,
      `Job anterior: ${user.lastJobTitle || "nespecificat"}, Job curent: ${user.hasCurrentJob ? "da" : user.hasCurrentJob === false ? "nu" : "nespecificat"}`,
      `Carduri: ${cardsContext}`,
      profileContext,
      sessionsContext,
      testsContext,
      evolutionContext,
      kbContext,
      injectCommercialKnowledge(message.trim(), "B2C"),
      "",
      "--- COMPORTAMENT ---",
      isFirstMessage
        ? 'Aceasta e PRIMA interacțiune. Salută cu "Bine ai venit, [alias]!" și ghidează ușor.'
        : "Continuă conversația natural. Nu repeta salutul.",
      "CONTEXT INVIZIBIL: construiești natural pe ce știi, nu arăți ce știi.",
      "Răspunsuri calde, naturale, 2-4 paragrafe. Profilezi din fiecare mesaj.",
      safety.level === "HIGH"
        ? "ATENȚIE: semnale subclinice detectate. Monitorizează cu atenție. Dacă se agravează, escaladează."
        : "",
    ].filter(Boolean).join("\n")

    // 9. Call Claude
    const client = new Anthropic()
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1200,
      system: fullSystemPrompt,
      messages: history,
    })

    let assistantText = response.content[0].type === "text" ? response.content[0].text : ""

    // 9b. Record API usage (BUILD-008)
    recordAPIUsage(userId, 'B2C', 0.015)

    // 10. Append protection message if guard detected something
    if (guard.protectionMessage) {
      assistantText = assistantText + "\n\n---\n\n" + guard.protectionMessage
    }

    // 11. Save assistant response
    await p.conversationMessage.create({
      data: { threadId: thread.id, role: "ASSISTANT", content: assistantText },
    })

    // 12. Update thread
    if (thread.messages.length === 0) {
      await p.conversationThread.update({
        where: { id: thread.id },
        data: { title: `Profiler — ${user.alias}`, updatedAt: new Date() },
      })
    } else {
      await p.conversationThread.update({
        where: { id: thread.id },
        data: { updatedAt: new Date() },
      })
    }

    // 13. Profiler shadow — observă propria interacțiune (SKIP dacă contaminate)
    if (!guard.quarantine) {
      observeInteraction(
        {
          card: "CARD_6",
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

    // 13. Create/update B2C session
    await p.b2CSession.upsert({
      where: { id: threadId || "new" },
      create: {
        userId,
        card: "CARD_6",
        agentRole: AGENT_ROLE,
        threadId: thread.id,
        status: "ACTIVE",
      },
      update: { status: "ACTIVE" },
    }).catch(() => {})

    // 13. Activate user if still onboarding
    if (user.status === "ONBOARDING") {
      await p.b2CUser.update({
        where: { id: userId },
        data: { status: "ACTIVE" },
      }).catch(() => {})
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
