/**
 * /api/v1/reports/adaptation-capacity
 *
 * C3 — Raport capacitate de adaptare organizationala
 * POST — Analiza: WIF simulations run, culture audit changes, intervention plan progress
 */

import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { cpuCall } from "@/lib/cpu/gateway"
import { getTenantData, setTenantData } from "@/lib/tenant-storage"

export const dynamic = "force-dynamic"

interface AdaptationCapacityResult {
  wifSimulationsCount: number
  cultureAuditChanges: number
  interventionProgress: number
  dimensions: Array<{
    name: string
    score: number
    insight: string
  }>
  overallScore: number
  adaptationProfile: string
  createdAt: string
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const tenantId = session.user.tenantId

    // Gather adaptation data from tenant storage
    const [wifData, cultureAudit, interventionPlan, previousAudit] = await Promise.all([
      getTenantData<{ simulations?: Array<Record<string, unknown>> }>(tenantId, "WIF_SIMULATION"),
      getTenantData<{ overallScore?: number; dimensions?: Array<{ score: number }> }>(tenantId, "CULTURE_AUDIT"),
      getTenantData<{ actions?: Array<{ status: string }> }>(tenantId, "INTERVENTION_PLAN"),
      getTenantData<{ overallScore?: number }>(tenantId, "CULTURE_AUDIT_PREV"),
    ])

    const wifSimulationsCount = wifData?.simulations?.length ?? 0
    const currentAuditScore = cultureAudit?.overallScore ?? 0
    const previousAuditScore = previousAudit?.overallScore ?? 0
    const cultureAuditChanges = currentAuditScore - previousAuditScore

    const interventionActions = interventionPlan?.actions ?? []
    const completedActions = interventionActions.filter(a => a.status === "COMPLETED")
    const interventionProgress = interventionActions.length > 0
      ? Math.round((completedActions.length / interventionActions.length) * 100)
      : 0

    const contextData = `## Metrici adaptare organizationala

- Simulari WIF rulate: ${wifSimulationsCount}
- Scor audit cultural curent: ${currentAuditScore}
- Delta audit cultural (vs anterior): ${cultureAuditChanges > 0 ? "+" : ""}${cultureAuditChanges}
- Actiuni plan interventie: ${interventionActions.length}
- Actiuni completate: ${completedActions.length}
- Progres interventii: ${interventionProgress}%
`

    const result = await cpuCall({
      system: `Esti expert in analiza capacitatii de adaptare organizationala. Analizeaza datele si returneaza un JSON valid.`,
      messages: [
        {
          role: "user",
          content: `${contextData}

Analizeaza capacitatea de adaptare pe 4 dimensiuni:
1. Proactivitate (simulari WIF rulate, pregatire scenarii)
2. Reactivitate culturala (delta audit, viteza schimbare)
3. Executie interventii (progres plan, actiuni completate)
4. Rezilienta (capacitate de absorbtie socuri)

Returneaza JSON:
{
  "dimensions": [{ "name": "...", "score": 0-100, "insight": "..." }],
  "overallScore": 0-100,
  "adaptationProfile": "descriere profilul de adaptare in 2-3 propozitii"
}`,
        },
      ],
      max_tokens: 2000,
      agentRole: "COA",
      operationType: "report-adaptation-capacity",
      tenantId,
      skipObjectiveCheck: true,
    })

    if (result.degraded) {
      return NextResponse.json({ message: "Serviciu temporar indisponibil." }, { status: 503 })
    }

    let parsed: { dimensions: Array<{ name: string; score: number; insight: string }>; overallScore: number; adaptationProfile: string }
    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error("JSON not found")
      parsed = JSON.parse(jsonMatch[0])
    } catch {
      return NextResponse.json({ message: "Eroare la procesarea raspunsului AI." }, { status: 502 })
    }

    const report: AdaptationCapacityResult = {
      wifSimulationsCount,
      cultureAuditChanges,
      interventionProgress,
      dimensions: parsed.dimensions,
      overallScore: parsed.overallScore,
      adaptationProfile: parsed.adaptationProfile,
      createdAt: new Date().toISOString(),
    }

    await setTenantData(tenantId, "REPORT_ADAPTATION_CAPACITY", report)
    return NextResponse.json(report)
  } catch (error) {
    console.error("[ADAPTATION CAPACITY POST]", error)
    return NextResponse.json({ message: "Eroare interna." }, { status: 500 })
  }
}
