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

export const maxDuration = 60

const AGENT_ROLE = "CALAUZA"
const THREAD_TYPE = "B2C_GUIDE" as const
const MODEL = "claude-sonnet-4-20250514"

// ── Load system prompt ─────────────────────────────────────────────────────

let cachedSystemPrompt: string | null = null

function loadSystemPrompt(): string {
  if (cachedSystemPrompt) return cachedSystemPrompt
  try {
    const filepath = join(process.cwd(), "src", "lib", "agents", "system-prompts", "calauza-system-prompt.md")
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
]

function checkSafety(message: string): { level: "CRITICAL" | "HIGH" | null } {
  for (const trigger of SAFETY_TRIGGERS) {
    if (trigger.pattern.test(message)) {
      return { level: trigger.level }
    }
  }
  return { level: null }
}

// ── POST /api/v1/b2c/calauza/chat ─────────────────────────────────────────

/**
 * Chat cu Călăuza B2C (Card 1 — "Drumul către mine").
 * Cel mai profund strat — auto-cunoaștere, autenticitate, metamorfoză.
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

    // 1. Verifică user B2C + Card 1 activ
    const user = await p.b2CUser.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        cards: true,
        testResults: { orderBy: { administeredAt: "desc" }, take: 5 },
      },
    })

    if (!user) {
      return NextResponse.json({ error: "Utilizator negăsit" }, { status: 404 })
    }

    const card1 = user.cards.find((c: any) => c.card === "CARD_1")
    if (!card1 || card1.status === "LOCKED") {
      return NextResponse.json(
        { error: "Card 1 nu este activat. Activează-l pentru a vorbi cu Călăuza." },
        { status: 403 }
      )
    }

    // 2. Safety check
    const safety = checkSafety(message.trim())
    if (safety.level === "CRITICAL") {
      // Log escalation
      await p.b2CEvolutionEntry.create({
        data: {
          userId, card: "CARD_1", type: "MILESTONE",
          title: "Escaladare SAFETY_MONITOR — nivel CRITIC",
          phase: card1.phase, stage: card1.stage, agentRole: AGENT_ROLE,
        },
      }).catch(() => {})

      return NextResponse.json({
        reply: "Înțeleg că treci printr-un moment foarte greu. Te rog să suni acum la Telefonul Speranței: 0800 801 200 (gratuit, non-stop). Sunt oameni care te pot ajuta imediat. Sunt aici când ești gata să continuăm.",
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
      `Spirală globală: nivel ${profile.spiralLevel}, etapă ${profile.spiralStage}`,
      profile.dialogInsights ? `Insights dialog: ${JSON.stringify(profile.dialogInsights)}` : null,
    ].filter(Boolean).join("\n") : ""

    const evolutionContext = recentEvolution.length
      ? `Traseu evolutiv:\n${recentEvolution.map((e: any) => `  - ${e.title} [${e.card}, ${e.phase}, etapă ${e.stage}]`).join("\n")}`
      : ""

    const crossCardContext = allSessions
      .filter((s: any) => s.card !== "CARD_1")
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

    // 7. Build history
    const history = thread.messages.map((m: any) => ({
      role: m.role === "USER" ? "user" as const : "assistant" as const,
      content: m.content,
    }))
    history.push({ role: "user" as const, content: message.trim() })

    // 8. System prompt — Călăuza: cel mai calibrat ton, cel mai rar vorbește
    const systemPromptMd = loadSystemPrompt()
    const messageCount = thread.messages.filter((m: any) => m.role === "USER").length

    const fullSystemPrompt = [
      systemPromptMd,
      "",
      "--- CONTEXT INVIZIBIL (NICIODATĂ nu transpare) ---",
      `Alias: ${user.alias}`,
      `Card 1: faza ${card1.phase}, etapă ${card1.stage}`,
      profileLines,
      evolutionContext,
      crossCardContext.length ? `Activitate pe alte carduri: ${crossCardContext.join(", ")}` : "",
      testsContext,
      kbContext,
      injectCommercialKnowledge(message.trim(), "B2C"),
      "",
      "--- CALIBRARE CĂLĂUZA ---",
      "Ești cel mai RAR vorbești dintre toți agenții. Răspunsuri SCURTE (1-3 paragrafe).",
      "Ascultă mai mult decât vorbești. Lasă spațiu. Întrebări care deschid, nu direcționează.",
      "ZERO jargon spiritual sau psihologic. Limbaj simplu, cald, uman.",
      "Nu menționezi NICIODATĂ: Hawkins, Herrmann, VIA, CÂMP, Umbra, onion, scale.",
      `Mesaj #${messageCount + 1} din conversație — ${messageCount === 0 ? "primul contact pe Card 1" : "continuare drum"}.`,
      safety.level === "HIGH"
        ? "ATENȚIE: semnale subclinice detectate. Monitorizează cu grijă. Fii prezentă, nu alarmantă."
        : "",
    ].filter(Boolean).join("\n")

    // 9. Call Claude
    const client = new Anthropic()
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 800, // Călăuza: scurt, rar vorbește
      system: fullSystemPrompt,
      messages: history,
    })

    let assistantText = response.content[0].type === "text" ? response.content[0].text : ""

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
        title: thread.messages.length === 0 ? `Călăuza — ${user.alias}` : undefined,
        updatedAt: new Date(),
      },
    })

    // 13. Profiler shadow — observă invizibil (SKIP dacă datele sunt contaminate)
    if (!guard.quarantine) {
      observeInteraction(
      {
        card: "CARD_1",
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
      // Date contaminate — izolăm, nu actualizăm profilul
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
        card: "CARD_1",
        agentRole: AGENT_ROLE,
        threadId: thread.id,
        status: "ACTIVE",
      },
      update: { status: "ACTIVE" },
    }).catch(() => {})

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
