/**
 * /api/v1/reports/compatibility-pdf
 *
 * POST — Raport compatibilitate bilateral (HTML pentru conversie PDF client-side)
 * Incarca scorul de matching existent si genereaza HTML cu:
 * header, scoruri per criteriu, scor general, recomandare.
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"
import { anthropic, AI_MODEL } from "@/lib/ai/client"

export const dynamic = "force-dynamic"

const compatSchema = z.object({
  jobId: z.string().min(1),
  candidateId: z.string().min(1),
})

interface CriterionScore {
  criterion: string
  score: number
  note: string
}

interface CompatibilityScores {
  overall: number
  criteria: CriterionScore[]
  recommendation: string
  jobTitle: string
  candidatePseudonym: string
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const tenantId = session.user.tenantId
    const body = await req.json()
    const data = compatSchema.parse(body)

    // Load job
    const job = await prisma.job.findFirst({
      where: { id: data.jobId, tenantId },
      include: {
        department: { select: { name: true } },
      },
    })
    if (!job) {
      return NextResponse.json(
        { message: "Jobul nu a fost gasit." },
        { status: 404 },
      )
    }

    // Load B2C profile (candidate)
    const profile = await prisma.b2CProfile.findUnique({
      where: { id: data.candidateId },
      include: { user: true },
    })
    if (!profile) {
      return NextResponse.json(
        { message: "Candidatul nu a fost gasit." },
        { status: 404 },
      )
    }

    const pseudonym =
      (profile.user as Record<string, unknown>)?.pseudonym as string | undefined ??
      `Candidat_${data.candidateId.slice(-6)}`

    // Build matching context for Claude
    const jobContext = [
      `Titlu: ${job.title}`,
      `Departament: ${job.department?.name ?? "N/A"}`,
      job.purpose ? `Scop: ${job.purpose}` : null,
      job.requirements ? `Cerinte: ${job.requirements}` : null,
    ]
      .filter(Boolean)
      .join("\n")

    const candidateContext = [
      profile.herrmannA != null
        ? `Herrmann HBDI: A=${profile.herrmannA} B=${profile.herrmannB} C=${profile.herrmannC} D=${profile.herrmannD}`
        : null,
      profile.hawkinsEstimate != null
        ? `Hawkins: ${profile.hawkinsEstimate}`
        : null,
      profile.viaSignature.length > 0
        ? `VIA Strengths: ${profile.viaSignature.join(", ")}`
        : null,
      `Spiral: nivel ${profile.spiralLevel}, etapa ${profile.spiralStage}`,
    ]
      .filter(Boolean)
      .join("\n")

    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `Esti expert in matching recrutare. Evalueaza compatibilitatea bilaterala.

## Pozitie B2B
${jobContext}

## Candidat: ${pseudonym}
${candidateContext}

Evalueaza pe 6 criterii JobGrade:
1. Educatie si pregatire
2. Comunicare
3. Rezolvare probleme
4. Luarea deciziilor
5. Impact asupra afacerii
6. Conditii de munca

Returneaza JSON valid:
{
  "overall": 0-100,
  "criteria": [
    { "criterion": "...", "score": 0-100, "note": "observatie scurta" }
  ],
  "recommendation": "recomandare in 2-3 propozitii"
}`,
        },
      ],
    })

    const aiText =
      response.content[0].type === "text" ? response.content[0].text : ""

    let scores: CompatibilityScores
    try {
      const jsonMatch = aiText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error("JSON not found")
      const parsed = JSON.parse(jsonMatch[0]) as {
        overall: number
        criteria: CriterionScore[]
        recommendation: string
      }
      scores = {
        ...parsed,
        jobTitle: job.title,
        candidatePseudonym: pseudonym,
      }
    } catch {
      return NextResponse.json(
        { message: "Eroare la procesarea raspunsului AI." },
        { status: 502 },
      )
    }

    // Generate HTML report
    const html = buildReportHtml(scores)

    return NextResponse.json({ html, scores })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Date invalide.", errors: error.issues },
        { status: 400 },
      )
    }
    console.error("[COMPATIBILITY-PDF POST]", error)
    return NextResponse.json({ message: "Eroare interna." }, { status: 500 })
  }
}

/* ------------------------------------------------------------------ */
/*  HTML builder                                                       */
/* ------------------------------------------------------------------ */

function scoreColor(score: number): string {
  if (score >= 70) return "#059669"
  if (score >= 40) return "#d97706"
  return "#dc2626"
}

function buildReportHtml(scores: CompatibilityScores): string {
  const criteriaRows = scores.criteria
    .map(
      (c) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${c.criterion}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">
        <span style="color:${scoreColor(c.score)};font-weight:600;">${c.score}%</span>
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#6b7280;">
        ${c.note}
      </td>
    </tr>`,
    )
    .join("")

  return `<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8" />
  <title>Raport Compatibilitate - ${scores.jobTitle}</title>
  <style>
    body { font-family: system-ui, sans-serif; color: #1f2937; max-width: 800px; margin: 0 auto; padding: 32px; }
    h1 { font-size: 22px; margin-bottom: 4px; }
    h2 { font-size: 16px; color: #6b7280; margin-top: 0; }
    .overall { text-align: center; margin: 24px 0; padding: 20px; border-radius: 12px; background: #f9fafb; }
    .overall .score { font-size: 48px; font-weight: 700; color: ${scoreColor(scores.overall)}; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th { text-align: left; padding: 8px 12px; background: #f3f4f6; font-size: 13px; text-transform: uppercase; color: #6b7280; }
    .rec { margin-top: 24px; padding: 16px; border-left: 4px solid #6366f1; background: #eef2ff; border-radius: 0 8px 8px 0; }
    .footer { margin-top: 32px; font-size: 12px; color: #9ca3af; text-align: center; }
  </style>
</head>
<body>
  <h1>Raport compatibilitate bilaterala</h1>
  <h2>${scores.jobTitle} &mdash; ${scores.candidatePseudonym}</h2>

  <div class="overall">
    <div style="font-size:13px;color:#6b7280;text-transform:uppercase;">Scor general compatibilitate</div>
    <div class="score">${scores.overall}%</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Criteriu</th>
        <th style="text-align:center;">Scor</th>
        <th>Observatii</th>
      </tr>
    </thead>
    <tbody>${criteriaRows}</tbody>
  </table>

  <div class="rec">
    <strong>Recomandare</strong>
    <p style="margin:8px 0 0;">${scores.recommendation}</p>
  </div>

  <div class="footer">
    Generat de JobGrade &bull; ${new Date().toLocaleDateString("ro-RO")}
  </div>
</body>
</html>`
}
