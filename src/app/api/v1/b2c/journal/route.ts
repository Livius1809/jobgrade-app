import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { prisma } from "@/lib/prisma"
import { extractB2CAuth, verifyB2COwnership } from "@/lib/security/b2c-auth"
import {
  generateJournalPrompt,
  determineHermannDominance,
  getCommunicationStyle,
  type CognitiveProfile,
} from "@/lib/b2c/journaling/cognitive-adapter"
import {
  calibrateDosage,
  shouldOfferJournal,
} from "@/lib/b2c/journaling/dosage-calibrator"

export const maxDuration = 30

const MODEL = "claude-sonnet-4-20250514"

/**
 * POST /api/v1/b2c/journal
 *
 * Generează un prompt de journaling adaptat la:
 *   1. Profilul cognitiv Herrmann (CUM gândește)
 *   2. Faza spirală + etapa competenței (UNDE e pe drum)
 *   3. Nivelul Hawkins estimat (DE UNDE privește)
 *   4. Doza de cunoaștere (CÂT poate integra ACUM)
 *   5. Limbajul propriu al clientului (CUM vorbește)
 *
 * Body: { userId: string, card?: string, topic?: string }
 */
export async function POST(req: NextRequest) {
  const p = prisma as any

  try {
    const body = await req.json()
    const { userId, card, topic } = body

    if (!userId) {
      return NextResponse.json({ error: "userId e obligatoriu" }, { status: 400 })
    }

    // B2C Auth
    const b2cAuth = extractB2CAuth(req)
    if (!b2cAuth || !verifyB2COwnership(b2cAuth, userId)) {
      return NextResponse.json({ error: "Autentificare B2C invalidă" }, { status: 401 })
    }

    // 1. Load user + profile + session history
    const user = await p.b2CUser.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        cards: true,
        sessions: { orderBy: { startedAt: "desc" }, take: 20 },
        evolutionLog: {
          where: { type: "REGRESSION" },
          select: { id: true },
        },
        journalEntries: {
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { createdAt: true, status: true, content: true, herrmannDominance: true },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: "Utilizator negăsit" }, { status: 404 })
    }

    const profile = user.profile
    if (!profile) {
      return NextResponse.json({ error: "Profilul nu a fost creat" }, { status: 400 })
    }

    // 2. Determine cognitive profile
    const herrmann = determineHermannDominance(
      profile.herrmannA, profile.herrmannB, profile.herrmannC, profile.herrmannD
    )

    const activeCard = card || user.cards.find((c: any) => c.status === "ACTIVE")?.card || "CARD_6"
    const cardProgress = user.cards.find((c: any) => c.card === activeCard)

    const cognitiveProfile: CognitiveProfile = {
      herrmann,
      spiralPhase: cardProgress?.phase || "CHRYSALIS",
      competenceStage: cardProgress?.stage || 1,
      hawkinsEstimate: profile.hawkinsEstimate || 0,
      activeCard,
    }

    // 3. Calibrate dosage
    const lastSessionDaysAgo = user.sessions.length > 0
      ? (Date.now() - new Date(user.sessions[0].startedAt).getTime()) / (1000 * 60 * 60 * 24)
      : 999

    const sessionsLastWeek = user.sessions.filter((s: any) =>
      new Date(s.startedAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
    ).length

    const dosage = calibrateDosage(cognitiveProfile, {
      totalSessions: user.sessions.length,
      lastSessionDaysAgo: Math.round(lastSessionDaysAgo),
      avgSessionsPerWeek: sessionsLastWeek,
      regressionCount: user.evolutionLog.length,
      lastMilestoneType: undefined,
    })

    // 4. Check if it's the right time
    const lastJournal = user.journalEntries.length > 0
      ? new Date(user.journalEntries[0].createdAt)
      : null
    const journalsToday = user.journalEntries.filter((j: any) =>
      new Date(j.createdAt).toDateString() === new Date().toDateString()
    ).length

    const blockReason = shouldOfferJournal(dosage, lastJournal, journalsToday)
    if (blockReason) {
      return NextResponse.json({
        available: false,
        reason: blockReason,
        dosageLevel: dosage.level,
        nextAvailable: lastJournal
          ? new Date(lastJournal.getTime() + dosage.minIntervalHours * 60 * 60 * 1000).toISOString()
          : null,
      })
    }

    // 5. Generate raw prompt (adapted to Herrmann + phase)
    const rawPrompt = generateJournalPrompt(cognitiveProfile, topic)

    // 6. Linguistic calibration — adapt vocabulary to client's own language
    // PSYCHOLINGUIST layer: take the raw prompt and rewrite it in the
    // client's register, using their words, their rhythm.
    const commStyle = getCommunicationStyle(herrmann)

    // Collect client's own vocabulary from recent journal entries + conversations
    const clientVocab = user.journalEntries
      .filter((j: any) => j.content)
      .map((j: any) => j.content)
      .join(" ")
      .substring(0, 500) // sample

    let adaptedPrompt = rawPrompt.prompt
    let adaptedHint = rawPrompt.hint

    // If we have enough client text, adapt linguistically via Claude
    if (clientVocab.length > 50) {
      try {
        const client = new Anthropic()
        const response = await client.messages.create({
          model: MODEL,
          max_tokens: 300,
          messages: [{
            role: "user",
            content: `Ești Specialistul Psiholingvistică al platformei JobGrade. Rescrie acest prompt de journaling
PĂSTRÂND EXACT sensul și profunzimea, dar ADAPTÂND la modul cum scrie acest client.

PROMPT ORIGINAL:
"${rawPrompt.prompt}"

STILUL CLIENTULUI (extras din jurnalele lui):
"${clientVocab.substring(0, 400)}"

PROFILUL COGNITIV: Herrmann ${herrmann} dominant
${commStyle.receptivity}
Format preferat: ${commStyle.format}
De evitat: ${commStyle.avoid}

REGULI:
- Folosește cuvintele și expresiile clientului, NU le înlocui cu sinonime
- Păstrează nivelul de complexitate al prompt-ului original
- Dacă clientul scrie simplu, scrie simplu. Dacă scrie elaborat, poți fi elaborat.
- NU adăuga jargon psihologic sau spiritual
- NU schimba întrebarea de fond — doar reformulează
- Maxim 2-3 propoziții
- Română cu diacritice

CRITICĂ — LIMBA ROMÂNĂ NATURALĂ:
- Scrie cum vorbește un om, nu cum traduce un algoritm
- Fiecare propoziție trebuie să SUNE BINE citită cu voce tare
- Verifică: subiect, verb, complement — nimic suspendat în aer
- GREȘIT: "Imaginează-ți un loc liniștit, doar tu" (suspendat, sună tradus)
- CORECT: "Imaginează-ți un loc liniștit, în care ești doar tu" (natural, complet)
- NU pune virgulă înainte de "și"
- Evită construcțiile eliptice care sună artificial — mai bine o propoziție completă decât una scurtată forțat
- Ritmul propoziției contează — citește-o cu voce tare mental înainte de a o trimite

Răspunde DOAR cu prompt-ul rescris, nimic altceva.`,
          }],
        })

        const adapted = response.content[0].type === "text" ? response.content[0].text.trim() : ""
        if (adapted.length > 10 && adapted.length < 500) {
          adaptedPrompt = adapted
        }
      } catch {
        // Fallback la prompt-ul original — e deja adaptat la Herrmann
      }
    }

    // 7. Save journal entry (PROMPT_SENT — clientul nu a scris încă)
    const journal = await p.b2CJournalEntry.create({
      data: {
        userId,
        card: activeCard,
        promptText: adaptedPrompt,
        suggestedMinutes: rawPrompt.suggestedMinutes,
        herrmannDominance: herrmann,
        dosageLevel: dosage.level,
        spiralPhase: cognitiveProfile.spiralPhase,
        competenceStage: cognitiveProfile.competenceStage,
        internalPurpose: rawPrompt.internalPurpose,
        targetDimension: rawPrompt.targetDimension,
        status: "PROMPT_SENT",
      },
    })

    return NextResponse.json({
      journalId: journal.id,
      prompt: adaptedPrompt,
      hint: adaptedHint,
      suggestedMinutes: rawPrompt.suggestedMinutes,
      dosageLevel: dosage.level,
      // Ce vede clientul:
      encouragement: dosage.level === "SEED"
        ? "Nu contează cât scrii. Contează că scrii."
        : dosage.level === "SPROUT"
        ? "Scrie fără cenzură. Primul gând e cel mai onest."
        : "Lasă-te purtat de gând. Editezi mai târziu — sau niciodată.",
    })
  } catch (e: any) {
    console.error("[B2C Journal POST] Error:", e.message)
    return NextResponse.json(
      { error: "Eroare la generarea jurnalului", details: e.message },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/v1/b2c/journal
 *
 * Clientul trimite ce a scris. Se salvează + se actualizează profilul.
 *
 * Body: { journalId: string, content: string, actualMinutes?: number }
 */
export async function PATCH(req: NextRequest) {
  const p = prisma as any

  try {
    const body = await req.json()
    const { journalId, content, actualMinutes } = body

    if (!journalId || !content?.trim()) {
      return NextResponse.json({ error: "journalId și content sunt obligatorii" }, { status: 400 })
    }

    // B2C Auth
    const b2cAuth = extractB2CAuth(req)
    if (!b2cAuth) {
      return NextResponse.json({ error: "Autentificare B2C invalidă" }, { status: 401 })
    }

    const journal = await p.b2CJournalEntry.findUnique({
      where: { id: journalId },
    })

    if (!journal) {
      return NextResponse.json({ error: "Jurnal negăsit" }, { status: 404 })
    }

    // Salvează răspunsul
    await p.b2CJournalEntry.update({
      where: { id: journalId },
      data: {
        content: content.trim(),
        actualMinutes: actualMinutes || null,
        status: "COMPLETED",
        writtenAt: new Date(),
      },
    })

    // Log evolutiv
    await p.b2CEvolutionEntry.create({
      data: {
        userId: journal.userId,
        card: journal.card,
        type: "MILESTONE",
        title: "A scris o reflecție în jurnal",
        phase: journal.spiralPhase,
        stage: journal.competenceStage,
        agentRole: "PROFILER",
        metadata: {
          journalId,
          dosageLevel: journal.dosageLevel,
          herrmann: journal.herrmannDominance,
          targetDimension: journal.targetDimension,
          wordCount: content.trim().split(/\s+/).length,
        },
      },
    })

    return NextResponse.json({
      saved: true,
      journalId,
      wordCount: content.trim().split(/\s+/).length,
    })
  } catch (e: any) {
    console.error("[B2C Journal PATCH] Error:", e.message)
    return NextResponse.json(
      { error: "Eroare la salvarea jurnalului", details: e.message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/v1/b2c/journal?userId=...&limit=10
 *
 * Returnează jurnalele clientului (traduse, fără date interne).
 */
export async function GET(req: NextRequest) {
  const p = prisma as any
  const userId = req.nextUrl.searchParams.get("userId")
  const limit = Math.min(50, parseInt(req.nextUrl.searchParams.get("limit") || "10", 10))

  if (!userId) {
    return NextResponse.json({ error: "userId e obligatoriu" }, { status: 400 })
  }

  // B2C Auth
  const b2cAuth = extractB2CAuth(req)
  if (!b2cAuth || !verifyB2COwnership(b2cAuth, userId)) {
    return NextResponse.json({ error: "Autentificare B2C invalidă" }, { status: 401 })
  }

  try {
    const entries = await p.b2CJournalEntry.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        card: true,
        promptText: true,
        content: true,
        suggestedMinutes: true,
        actualMinutes: true,
        status: true,
        createdAt: true,
        writtenAt: true,
      },
    })

    return NextResponse.json({
      entries: entries.map((e: any) => ({
        id: e.id,
        card: e.card,
        prompt: e.promptText,
        response: e.content,
        suggestedMinutes: e.suggestedMinutes,
        actualMinutes: e.actualMinutes,
        status: e.status,
        date: e.writtenAt || e.createdAt,
      })),
      total: entries.length,
    })
  } catch (e: any) {
    console.error("[B2C Journal GET] Error:", e.message)
    return NextResponse.json(
      { error: "Eroare la citirea jurnalelor", details: e.message },
      { status: 500 }
    )
  }
}
