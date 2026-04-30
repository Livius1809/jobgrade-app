/**
 * /api/v1/matching
 *
 * C3 F5 — Matching B2B ↔ B2C
 * POST — Găsește candidați B2C compatibili cu o poziție B2B
 * GET  — Listează cererile de matching active
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { anthropic, AI_MODEL } from "@/lib/ai/client"
import { getTenantData, setTenantData } from "@/lib/tenant-storage"

export const dynamic = "force-dynamic"

// Schema de validare pentru cererea de matching
const matchSchema = z.object({
  jobId: z.string().min(1),
  matchCriteria: z.enum(["FIT_CULTURAL", "AGENT_SCHIMBARE"]).optional(),
  limit: z.number().int().min(1).max(50).optional().default(10),
})

// Tipuri interne
interface MatchingRequest {
  id: string
  jobId: string
  jobTitle: string
  matchCriteria: string
  status: "ACTIVE" | "COMPLETED" | "EXPIRED"
  matchCount: number
  createdAt: string
  createdBy: string
}

interface MatchResult {
  pseudonym: string
  compatibilityScore: number
  strengths: string[]
  gaps: string[]
  recommendation: string
}

interface MatchingState {
  requests: MatchingRequest[]
}

/**
 * POST — Caută candidați B2C compatibili cu o poziție B2B
 * Scorare pe cele 6 criterii JE + analiză Claude
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const tenantId = session.user.tenantId
    const body = await req.json()
    const data = matchSchema.parse(body)

    // Încarcă datele jobului (criterii, descriere, cerințe)
    const job = await prisma.job.findFirst({
      where: { id: data.jobId, tenantId },
      include: {
        department: { select: { name: true } },
      },
    })
    if (!job) {
      return NextResponse.json({ message: "Jobul nu a fost găsit." }, { status: 404 })
    }

    // Încarcă rezultatele evaluării pentru acest job
    const jobResults = await prisma.jobResult.findMany({
      where: { job: { id: data.jobId, tenantId } },
      select: { totalScore: true, rank: true, salaryGradeId: true },
    })

    // Caută profiluri B2C disponibile
    const b2cProfiles = await prisma.b2CProfile.findMany({
      include: {
        user: true,
      },
    })

    // Dacă nu există profiluri B2C, returnează mesaj informativ
    if (b2cProfiles.length === 0) {
      return NextResponse.json({
        matches: [],
        totalCandidates: 0,
        criteria: data.matchCriteria ?? "FIT_CULTURAL",
        message: "Nu există încă profiluri B2C în sistem. Matching-ul va fi disponibil când candidații se înregistrează.",
      })
    }

    // Construiește contextul jobului pentru Claude
    const jobContext = [
      `Titlu: ${job.title}`,
      `Departament: ${job.department?.name ?? "—"}`,
      job.purpose ? `Scop: ${job.purpose}` : null,
      job.description ? `Descriere: ${job.description}` : null,
      job.requirements ? `Cerințe: ${job.requirements}` : null,
      job.responsibilities ? `Responsabilități: ${job.responsibilities}` : null,
      jobResults.length > 0
        ? `Rezultate JE: scor ${jobResults[0].totalScore}, grad ${jobResults[0].salaryGradeId}, rank ${jobResults[0].rank}`
        : null,
    ].filter(Boolean).join("\n")

    // Construiește lista de profiluri B2C (anonimizate)
    const profilesSummary = b2cProfiles.map((p, idx) => {
      const pseudonym = (p as any).user?.pseudonym ?? `Candidat_${idx + 1}`
      return {
        pseudonym,
        herrmann: p.herrmannA != null ? `A:${p.herrmannA} B:${p.herrmannB} C:${p.herrmannC} D:${p.herrmannD}` : "nedisponibil",
        hawkins: p.hawkinsEstimate ?? "nedisponibil",
        spiralLevel: p.spiralLevel,
        spiralStage: p.spiralStage,
        viaSignature: p.viaSignature.length > 0 ? p.viaSignature.join(", ") : "nedisponibil",
        dialogInsights: p.dialogInsights ? JSON.stringify(p.dialogInsights).slice(0, 300) : "nedisponibil",
      }
    })

    // Analiză Claude — scorare compatibilitate
    const matchType = data.matchCriteria ?? "FIT_CULTURAL"
    const prompt = `Ești expert în matching recrutare. Analizează compatibilitatea între o poziție B2B și candidații B2C disponibili.

## Poziția B2B
${jobContext}

## Criteriu de matching: ${matchType === "FIT_CULTURAL" ? "Fit Cultural — compatibilitate valori, stil de lucru, personalitate" : "Agent de Schimbare — potențial de transformare, adaptabilitate, leadership"}

## Candidați disponibili (${profilesSummary.length}):
${profilesSummary.map(p => `
### ${p.pseudonym}
- Herrmann HBDI: ${p.herrmann}
- Hawkins (nivel conștiință): ${p.hawkins}
- Spirală: nivel ${p.spiralLevel}, etapa ${p.spiralStage}
- Puncte forte VIA: ${p.viaSignature}
- Insights dialog: ${p.dialogInsights}
`).join("\n")}

Returnează un JSON valid cu structura:
{
  "matches": [
    {
      "pseudonym": "...",
      "compatibilityScore": 0-100,
      "strengths": ["punct forte 1", "punct forte 2"],
      "gaps": ["gap 1"],
      "recommendation": "recomandare scurtă"
    }
  ]
}

Sortează descrescător după compatibilityScore. Returnează maxim ${data.limit} rezultate.
Fii obiectiv și fundamentează scorurile pe datele disponibile.`

    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    })

    const aiText = response.content[0].type === "text" ? response.content[0].text : ""

    // Extrage JSON din răspunsul Claude
    let matches: MatchResult[] = []
    try {
      const jsonMatch = aiText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        matches = parsed.matches ?? []
      }
    } catch {
      // Dacă parsarea eșuează, returnează răspunsul brut
      matches = []
    }

    // Salvează cererea de matching în starea tenant-ului
    const state = await getTenantData<MatchingState>(tenantId, "MATCHING") ?? { requests: [] }
    const newRequest: MatchingRequest = {
      id: crypto.randomUUID(),
      jobId: data.jobId,
      jobTitle: job.title,
      matchCriteria: matchType,
      status: "ACTIVE",
      matchCount: matches.length,
      createdAt: new Date().toISOString(),
      createdBy: session.user.id,
    }
    state.requests.push(newRequest)
    await setTenantData(tenantId, "MATCHING", state)

    return NextResponse.json({
      matches,
      totalCandidates: b2cProfiles.length,
      criteria: matchType,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Date invalide.", errors: error.issues },
        { status: 400 }
      )
    }
    console.error("[MATCHING POST]", error)
    return NextResponse.json({ message: "Eroare internă." }, { status: 500 })
  }
}

/**
 * GET — Listează cererile de matching active
 */
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const state = await getTenantData<MatchingState>(session.user.tenantId, "MATCHING") ?? { requests: [] }

    // Filtrează doar cererile active
    const activeRequests = state.requests.filter(r => r.status === "ACTIVE")

    return NextResponse.json({
      requests: activeRequests,
      total: activeRequests.length,
    })
  } catch (error) {
    console.error("[MATCHING GET]", error)
    return NextResponse.json({ message: "Eroare internă." }, { status: 500 })
  }
}
