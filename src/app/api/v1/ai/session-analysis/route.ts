import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { deductCredits, hasCredits, CREDIT_COSTS } from "@/lib/credits"
import { anthropic, AI_MODEL } from "@/lib/ai/client"
import { buildKBContext } from "@/lib/kb/inject"

const CREDIT_COST = CREDIT_COSTS.SESSION_ANALYSIS

const schema = z.object({
  sessionId: z.string(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const tenantId = session.user.tenantId
    const body = await req.json()
    const data = schema.parse(body)

    const sufficient = await hasCredits(tenantId, CREDIT_COST)
    if (!sufficient) {
      return NextResponse.json(
        { message: `Credite insuficiente. Necesari: ${CREDIT_COST}.` },
        { status: 402 }
      )
    }

    // Fetch full session data for analysis
    const evalSession = await prisma.evaluationSession.findFirst({
      where: { id: data.sessionId, tenantId },
      include: {
        sessionJobs: {
          include: {
            job: {
              select: {
                title: true,
                code: true,
                department: { select: { name: true } },
              },
            },
            assignments: {
              select: { submittedAt: true },
            },
          },
        },
        participants: {
          select: { completedAt: true },
        },
        jobResults: {
          include: {
            job: { select: { title: true, code: true } },
          },
          orderBy: { rank: "asc" },
        },
        consensusStatuses: {
          include: {
            criterion: { select: { name: true } },
          },
        },
        facilitatorDecisions: {
          select: { id: true },
        },
        votes: {
          select: { id: true },
        },
      },
    })

    if (!evalSession) {
      return NextResponse.json(
        { message: "Sesiunea nu a fost găsită." },
        { status: 404 }
      )
    }

    // Build structured context for AI
    const totalParticipants = evalSession.participants.length
    const completedParticipants = evalSession.participants.filter(
      (p) => p.completedAt !== null
    ).length
    const totalJobs = evalSession.sessionJobs.length

    // Consensus statistics
    const consensusStats = {
      consensus: 0,
      recalibrating: 0,
      voting: 0,
      facilitated: 0,
      resolved: 0,
      pending: 0,
    }
    for (const cs of evalSession.consensusStatuses) {
      const s = cs.status.toLowerCase() as keyof typeof consensusStats
      if (s in consensusStats) consensusStats[s]++
    }

    // Job results summary
    const jobRankings = evalSession.jobResults.map((jr) => ({
      rank: jr.rank,
      title: jr.job.title,
      code: jr.job.code ?? "—",
      totalScore: jr.totalScore,
      normalizedScore: Math.round(jr.normalizedScore * 100) / 100,
    }))

    // Score distribution
    const scores = evalSession.jobResults.map((jr) => jr.totalScore)
    const maxScore = scores.length ? Math.max(...scores) : 0
    const minScore = scores.length ? Math.min(...scores) : 0
    const avgScore =
      scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0

    // Jobs by department
    const deptMap: Record<string, string[]> = {}
    for (const sj of evalSession.sessionJobs) {
      const dept = sj.job.department?.name ?? "Fără departament"
      if (!deptMap[dept]) deptMap[dept] = []
      deptMap[dept].push(sj.job.title)
    }

    // Criteria that needed intervention
    const difficultCriteria = evalSession.consensusStatuses
      .filter((cs) =>
        ["RECALIBRATING", "VOTING", "FACILITATED"].includes(cs.status)
      )
      .map((cs) => cs.criterion.name)

    // KB context: căutăm experiență relevantă pentru tipul sesiunii curente
    const kbQueryContext = [
      "sesiune evaluare job grading consens ierarhizare",
      difficultCriteria.length > 0 ? `criterii dificile: ${difficultCriteria.slice(0, 3).join(" ")}` : "",
      evalSession.facilitatorDecisions.length > 0 ? "facilitare decizie conflict evaluatori" : "",
      evalSession.votes.length > 0 ? "vot evaluatori divergenta scoruri" : "",
    ].filter(Boolean).join(" ")

    const kbContext = await buildKBContext({
      agentRole: "HR_COUNSELOR",
      context: kbQueryContext,
      limit: 5,
    })

    // System prompt: identitatea agentului + experiență KB (dacă există)
    const systemPrompt = [
      "Ești expert senior în evaluarea și ierarhizarea posturilor (job grading) din România, cu experiență în metodologia Hay Group / Willis Towers Watson.",
      kbContext,
    ].filter(Boolean).join("\n\n")

    // User prompt: doar datele specifice sesiunii + instrucțiuni
    const prompt = `Analizează rezultatele sesiunii de evaluare de mai jos și furnizează o analiză detaliată în limba română.

## DATE SESIUNE

**Nume sesiune:** ${evalSession.name}
**Status:** ${evalSession.status}
**Număr participanți:** ${totalParticipants} (${completedParticipants} au finalizat evaluarea)
**Număr joburi evaluate:** ${totalJobs}
**Runde de recalibrare:** ${evalSession.currentRound}
**Prag consens:** ${Math.round(evalSession.consensusThreshold * 100)}%
${evalSession.startedAt ? `**Data start:** ${evalSession.startedAt.toLocaleDateString("ro-RO")}` : ""}
${evalSession.completedAt ? `**Data finalizare:** ${evalSession.completedAt.toLocaleDateString("ro-RO")}` : ""}

## IERARHIA FINALĂ A JOBURILOR

${jobRankings.length > 0
  ? jobRankings
      .map(
        (jr) =>
          `#${jr.rank}. ${jr.title}${jr.code !== "—" ? ` (${jr.code})` : ""} — Scor: ${jr.totalScore} pct. (normalizat: ${jr.normalizedScore})`
      )
      .join("\n")
  : "Rezultatele nu au fost calculate încă."}

## STATISTICI SCORURI

- Scor maxim: ${maxScore} pct.
- Scor minim: ${minScore} pct.
- Scor mediu: ${avgScore} pct.
- Dispersie: ${maxScore - minScore} pct. diferență între primul și ultimul loc

## DISTRIBUȚIE PE DEPARTAMENTE

${Object.entries(deptMap)
  .map(([dept, jobs]) => `**${dept}:** ${jobs.join(", ")}`)
  .join("\n")}

## STATISTICI CONSENS

- Consens direct (fără intervenție): ${consensusStats.consensus}
- În recalibrare: ${consensusStats.recalibrating}
- La vot: ${consensusStats.voting}
- Decizie facilitator: ${consensusStats.facilitated}
- Rezolvate: ${consensusStats.resolved}
- Voturi utilizate: ${evalSession.votes.length}
- Decizii facilitator: ${evalSession.facilitatorDecisions.length}
${difficultCriteria.length > 0 ? `\n**Criterii cu dificultăți de consens:** ${[...new Set(difficultCriteria)].join(", ")}` : ""}

## INSTRUCȚIUNI ANALIZĂ

Generează o analiză structurată cu următoarele secțiuni:

**1. REZUMAT EXECUTIV** (3-4 fraze)
Sinteză a sesiunii: câte joburi, participare, calitate proces, rezultate cheie.

**2. ANALIZA IERARHIEI**
Comentează distribuția scorurilor, grupurile naturale de joburi (benzi de gradare), joburile cu scoruri neașteptate față de titlu/departament, și implicațiile pentru structura organizatorică.

**3. CALITATEA PROCESULUI DE CONSENS**
Evaluează dificultatea consensului: care criterii au generat divergențe, ce înseamnă asta despre percepțiile evaluatorilor, recomandări pentru sesiuni viitoare.

**4. RECOMANDĂRI ACȚIONALE**
3-5 recomandări concrete: ajustări de grad, joburi ce necesită revizuire a fișei de post, criterii unde e nevoie de calibrare a evaluatorilor, etc.

**5. NEXT STEPS**
Ce urmează după această sesiune (definire grile salariale, comunicare cu managementul, actualizare fișe de post).

Fii specific, folosește datele furnizate, și oferă perspective practice pentru HR.`

    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
    })

    const analysis =
      response.content[0].type === "text"
        ? response.content[0].text.trim()
        : ""

    if (!analysis) {
      return NextResponse.json(
        { message: "Eroare la generarea analizei." },
        { status: 500 }
      )
    }

    await deductCredits(
      tenantId,
      CREDIT_COST,
      `Analiză sesiune: ${evalSession.name}`,
      evalSession.id
    )

    return NextResponse.json({ analysis })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Date invalide.", errors: error.issues },
        { status: 400 }
      )
    }
    console.error("[AI SESSION-ANALYSIS]", error instanceof Error ? error.constructor.name : "Unknown")
    return NextResponse.json({ message: "Eroare la generare." }, { status: 500 })
  }
}
