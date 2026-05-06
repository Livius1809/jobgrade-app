/**
 * /api/v1/reports/leadership-profile
 *
 * C3 — Profil leadership manager
 * POST — Analiza: 18 trasaturi leadership, integrare PIE, rapoarte echipa
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { cpuCall } from "@/lib/cpu/gateway"
import { getTenantData, setTenantData } from "@/lib/tenant-storage"

export const dynamic = "force-dynamic"

const leadershipSchema = z.object({
  managerId: z.string().optional(),
  departmentId: z.string().optional(),
})

// 18 trasaturi leadership conform specificatiei
const LEADERSHIP_TRAITS = [
  "Viziune strategica",
  "Comunicare inspirationala",
  "Luarea deciziilor",
  "Delegare eficienta",
  "Dezvoltare echipa",
  "Gestionare conflicte",
  "Inteligenta emotionala",
  "Adaptabilitate",
  "Integritate",
  "Orientare rezultate",
  "Inovatie",
  "Rezilienta",
  "Colaborare",
  "Influenta pozitiva",
  "Gandire critica",
  "Asumarea riscurilor",
  "Empatie organizationala",
  "Coaching continuu",
] as const

interface LeadershipProfileResult {
  managerId: string | null
  traits: Array<{
    name: string
    score: number
    evidence: string
    developmentHint: string
  }>
  overallScore: number
  leadershipStyle: string
  pieIntegration: {
    personFit: number
    roleFit: number
    orgFit: number
  }
  teamImpact: string
  developmentPlan: string[]
  createdAt: string
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const tenantId = session.user.tenantId
    const body = await req.json()
    const data = leadershipSchema.parse(body)

    // Load leadership and PIE data
    const [leadershipData, pieData, psychometricData] = await Promise.all([
      getTenantData<Record<string, unknown>>(tenantId, "LEADERSHIP_EVAL"),
      getTenantData<{ personFit?: number; roleFit?: number; orgFit?: number }>(tenantId, "PIE_RESULTS"),
      getTenantData<Record<string, unknown>>(tenantId, "PSYCHOMETRIC_DATA"),
    ])

    if (!leadershipData && !psychometricData) {
      return NextResponse.json(
        { message: "Date insuficiente. Necesare: evaluari leadership sau date psihometrice." },
        { status: 400 }
      )
    }

    const contextData = `## Date profil leadership

### Evaluare Leadership
${leadershipData ? JSON.stringify(leadershipData).slice(0, 1500) : "Date din evaluare psihometrica"}

### Integrare PIE (Persoana x Post x Organizatie)
- Person-Job Fit: ${pieData?.personFit ?? "N/A"}
- Role Fit: ${pieData?.roleFit ?? "N/A"}
- Organization Fit: ${pieData?.orgFit ?? "N/A"}

### Date Psihometrice (Herrmann/MBTI)
${psychometricData ? JSON.stringify(psychometricData).slice(0, 1000) : "nedisponibile"}

### Trasaturi de evaluat
${LEADERSHIP_TRAITS.join(", ")}
`

    const result = await cpuCall({
      system: `Esti expert in evaluarea profilului de leadership. Analizeaza pe cele 18 trasaturi si returneaza un JSON valid. NU mentiona surse academice.`,
      messages: [
        {
          role: "user",
          content: `${contextData}

Evalueaza profilul de leadership pe cele 18 trasaturi. Pentru fiecare:
- Scor 0-100 bazat pe datele disponibile
- Evidenta concreta
- Sugestie de dezvoltare

Plus: stil leadership predominant, impact pe echipa, plan dezvoltare (5 actiuni).

Returneaza JSON:
{
  "traits": [{ "name": "...", "score": 0-100, "evidence": "...", "developmentHint": "..." }],
  "overallScore": 0-100,
  "leadershipStyle": "descriere stil in 2-3 propozitii",
  "pieIntegration": { "personFit": 0-100, "roleFit": 0-100, "orgFit": 0-100 },
  "teamImpact": "impactul asupra echipei in 2-3 propozitii",
  "developmentPlan": ["actiune 1", "actiune 2", "actiune 3", "actiune 4", "actiune 5"]
}`,
        },
      ],
      max_tokens: 4000,
      agentRole: "COA",
      operationType: "report-leadership-profile",
      tenantId,
      skipObjectiveCheck: true,
    })

    if (result.degraded) {
      return NextResponse.json({ message: "Serviciu temporar indisponibil." }, { status: 503 })
    }

    let parsed: Omit<LeadershipProfileResult, "managerId" | "createdAt">
    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error("JSON not found")
      parsed = JSON.parse(jsonMatch[0])
    } catch {
      return NextResponse.json({ message: "Eroare la procesarea raspunsului AI." }, { status: 502 })
    }

    const report: LeadershipProfileResult = {
      managerId: data.managerId ?? null,
      ...parsed,
      createdAt: new Date().toISOString(),
    }

    await setTenantData(tenantId, "REPORT_LEADERSHIP_PROFILE", report)
    return NextResponse.json(report)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Date invalide.", errors: error.issues }, { status: 400 })
    }
    console.error("[LEADERSHIP PROFILE POST]", error)
    return NextResponse.json({ message: "Eroare interna." }, { status: 500 })
  }
}
