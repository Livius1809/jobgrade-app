import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"
import { anthropic, AI_MODEL } from "@/lib/ai/client"
import { deductCredits, hasCredits, CREDIT_COSTS } from "@/lib/credits"

export const dynamic = "force-dynamic"

const requestSchema = z.object({
  criterionId: z.string(),
  round: z.number().int().min(1).max(20),
})

/**
 * POST — AI Mediation for group discussion.
 *
 * Analyzes all pre-scores, current votes, and discussion comments
 * for a specific criterion. Identifies inconsistencies, proposes
 * approaches (not solutions), and posts as AI comment.
 *
 * Rounds 1-3: included in package.
 * Round 4+: costs credits.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; sessionJobId: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const { id: sessionId, sessionJobId } = await params
    const tenantId = session.user.tenantId
    const body = await req.json()
    const { criterionId, round } = requestSchema.parse(body)

    // Verify session
    const evalSession = await prisma.evaluationSession.findFirst({
      where: { id: sessionId, tenantId },
      select: { id: true, currentRound: true },
    })
    if (!evalSession) {
      return NextResponse.json({ message: "Sesiunea nu a fost găsită." }, { status: 404 })
    }

    const sessionJob = await prisma.sessionJob.findFirst({
      where: { id: sessionJobId, sessionId },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            purpose: true,
            responsibilities: true,
            requirements: true,
            department: { select: { name: true } },
          },
        },
      },
    })
    if (!sessionJob) {
      return NextResponse.json({ message: "Jobul nu a fost găsit." }, { status: 404 })
    }

    // Credit check for round 4+
    if (round > 3) {
      const has = await hasCredits(tenantId, CREDIT_COSTS.AI_MEDIATION_ROUND)
      if (!has) {
        return NextResponse.json(
          {
            message: "Credite insuficiente pentru mediere suplimentară.",
            requiresCredits: true,
            cost: CREDIT_COSTS.AI_MEDIATION_ROUND,
          },
          { status: 402 }
        )
      }
    }

    // Get criterion info
    const criterion = await prisma.criterion.findUnique({
      where: { id: criterionId },
      include: { subfactors: { orderBy: { order: "asc" } } },
    })
    if (!criterion) {
      return NextResponse.json({ message: "Criteriu invalid." }, { status: 400 })
    }

    // Get all participants
    const participants = await prisma.sessionParticipant.findMany({
      where: { sessionId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, jobTitle: true },
        },
      },
    })

    // Get pre-scores for this job
    const evaluations = await prisma.evaluation.findMany({
      where: {
        sessionId,
        criterionId,
        assignment: { sessionJob: { id: sessionJobId } },
      },
      include: {
        assignment: { select: { userId: true } },
        subfactor: { select: { code: true, description: true } },
      },
    })

    // Get ALL pre-scores across ALL jobs for pattern detection
    const allEvaluations = await prisma.evaluation.findMany({
      where: { sessionId, criterionId },
      include: {
        assignment: {
          select: {
            userId: true,
            sessionJob: { include: { job: { select: { title: true } } } },
          },
        },
        subfactor: { select: { code: true } },
      },
    })

    // Get current votes for this criterion
    const votes = await prisma.vote.findMany({
      where: { sessionId, jobId: sessionJob.job.id, criterionId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        subfactor: { select: { code: true } },
      },
    })

    // Get existing discussion comments for context
    const existingComments = await prisma.discussionComment.findMany({
      where: { sessionId, jobId: sessionJob.job.id, criterionId },
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "asc" },
    })

    // ─── Build AI Context ────────────────────

    const participantMap: Record<string, string> = {}
    for (const p of participants) {
      participantMap[p.user.id] = `${p.user.firstName} ${p.user.lastName}`
    }

    // Pre-scores for this job
    const preScoreLines = evaluations.map((ev) => {
      const name = participantMap[ev.assignment.userId] ?? "Necunoscut"
      return `  - ${name}: ${ev.subfactor.code} (${ev.subfactor.description.substring(0, 80)})`
    })

    // Current votes
    const voteLines = votes.map((v) => {
      return `  - ${v.user.firstName} ${v.user.lastName}: ${v.subfactor.code}`
    })

    // Cross-job patterns per evaluator on this criterion
    const patternsByUser: Record<string, string[]> = {}
    for (const ev of allEvaluations) {
      const uid = ev.assignment.userId
      const name = participantMap[uid] ?? uid
      if (!patternsByUser[name]) patternsByUser[name] = []
      patternsByUser[name].push(
        `${ev.assignment.sessionJob.job.title}: ${ev.subfactor.code}`
      )
    }
    const patternLines = Object.entries(patternsByUser).map(
      ([name, scores]) => `  - ${name}: ${scores.join(", ")}`
    )

    // Discussion so far
    const discussionLines = existingComments
      .filter((c) => !c.isAi)
      .slice(-10) // last 10 human comments
      .map((c) => {
        const author = c.user
          ? `${c.user.firstName} ${c.user.lastName}`
          : "Anonim"
        return `  - ${author}: "${c.content.substring(0, 150)}"`
      })

    // Subfactor descriptors
    const subfactorDescriptors = criterion.subfactors
      .map((sf) => `  ${sf.code}: ${sf.description}`)
      .join("\n")

    const systemPrompt = `Ești mediator AI într-un proces de evaluare a posturilor (Job Evaluation).
Rolul tău: ajuți membrii comisiei să ajungă la consens pe criteriul "${criterion.name}".

REGULI FUNDAMENTALE:
- NU impui un scor. NU ești arbitru. Participi la discuție.
- Propui ABORDĂRI, nu soluții.
- Identifici inconsistențe transversale (cum scorează fiecare pe alte posturi similare).
- Ceri clarificări când observi divergențe mari.
- Folosești cunoașterea din pre-scorare pentru a înțelege cum gândește fiecare.
- Limbaj profesional, neutru, respectuos, în limba română.
- Maximum 200 de cuvinte.
- NU menționezi puncte sau calcule — doar litere (A-G).`

    const userPrompt = `POSTUL ÎN DISCUȚIE: ${sessionJob.job.title}
Departament: ${sessionJob.job.department?.name ?? "—"}
${sessionJob.job.purpose ? `Scop: ${sessionJob.job.purpose}` : ""}
${sessionJob.job.responsibilities ? `Responsabilități: ${sessionJob.job.responsibilities.substring(0, 300)}` : ""}

CRITERIUL: ${criterion.name}
${criterion.description ? `Descriere: ${criterion.description}` : ""}

NIVELURI DISPONIBILE:
${subfactorDescriptors}

PRE-SCORĂRI INDIVIDUALE (acest post):
${preScoreLines.join("\n") || "  Nicio pre-scorare disponibilă"}

VOTURI CURENTE:
${voteLines.join("\n") || "  Niciun vot încă"}

PATTERN-URI TRANSVERSALE (scorări pe ${criterion.name} pentru TOATE posturile din sesiune):
${patternLines.join("\n") || "  Nicio dată transversală"}

DISCUȚIA PÂNĂ ACUM:
${discussionLines.join("\n") || "  Nicio argumentare încă"}

RUNDA DE MEDIERE: ${round}

${round === 1 ? `Este prima rundă. Prezintă sintetic divergențele și pune 1-2 întrebări specifice membrilor care au scorat diferit, raportate la descriptorul nivelului.` : ""}
${round === 2 ? `A doua rundă. Pe baza argumentelor membrilor, identifică ce i-ar putea convinge pe fiecare și propune o abordare de compromis bazată pe fapte din fișa postului.` : ""}
${round >= 3 ? `Runda ${round}. Sintetizează argumentele tuturor, identifică punctul comun și propune o formulare care ar putea fi acceptabilă pentru toți, cu referire directă la descriptorul literei.` : ""}

Scrie mesajul de mediere în limba română.`

    // ─── Call AI ──────────────────────────────

    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    })

    const aiContent =
      response.content[0].type === "text"
        ? response.content[0].text
        : "Nu am putut genera o recomandare."

    // Deduct credits if round 4+
    if (round > 3) {
      await deductCredits(
        tenantId,
        CREDIT_COSTS.AI_MEDIATION_ROUND,
        `Mediere AI runda ${round} — ${criterion.name} — ${sessionJob.job.title}`,
        sessionId
      )
    }

    // Save as discussion comment
    const comment = await prisma.discussionComment.create({
      data: {
        sessionId,
        jobId: sessionJob.job.id,
        criterionId,
        userId: null, // AI
        round,
        content: aiContent,
        isAi: true,
      },
    })

    return NextResponse.json({
      comment: {
        id: comment.id,
        content: aiContent,
        isAi: true,
        round,
        createdAt: comment.createdAt,
        user: null,
      },
      round,
      creditCharged: round > 3,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Date invalide.", errors: error.issues },
        { status: 400 }
      )
    }
    console.error("[AI-MEDIATE]", error)
    return NextResponse.json({ message: "Eroare internă." }, { status: 500 })
  }
}
