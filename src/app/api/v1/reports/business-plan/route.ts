/**
 * /api/v1/reports/business-plan
 *
 * C4 — Plan operational de business
 * POST — Sinteza C1-C4: structura, conformitate, simulari WIF, calcule ROI
 */

import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"
import { cpuCall } from "@/lib/cpu/gateway"
import { getTenantData, setTenantData } from "@/lib/tenant-storage"

export const dynamic = "force-dynamic"

interface BusinessPlanResult {
  executiveSummary: string
  sections: Array<{
    title: string
    content: string
    metrics: Record<string, number | string>
  }>
  roiProjection: {
    investment: number
    expectedReturn: number
    timeframeMonths: number
    confidence: number
  }
  priorities: Array<{
    action: string
    impact: "HIGH" | "MEDIUM" | "LOW"
    effort: "HIGH" | "MEDIUM" | "LOW"
    timeline: string
  }>
  createdAt: string
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const tenantId = session.user.tenantId

    // Gather all C1-C4 data
    const [company, departments, jobs, cultureAudit, wifData, roiData, objectives, interventionPlan] = await Promise.all([
      prisma.companyProfile.findFirst({ where: { tenantId } }),
      prisma.department.findMany({ where: { tenantId, isActive: true }, select: { name: true } }),
      prisma.job.count({ where: { tenantId, isActive: true } }),
      getTenantData<Record<string, unknown>>(tenantId, "CULTURE_AUDIT"),
      getTenantData<Record<string, unknown>>(tenantId, "WIF_SIMULATION"),
      getTenantData<Record<string, unknown>>(tenantId, "ROI_CALCULATION"),
      prisma.organizationalObjective.findMany({
        where: { businessId: tenantId },
        select: { title: true, status: true, completedAt: true },
      }).catch(() => []),
      getTenantData<Record<string, unknown>>(tenantId, "INTERVENTION_PLAN"),
    ])

    const contextData = `## Date pentru plan operational

### C1 — Structura
- Industrie: ${company?.industry ?? "N/A"}
- Departamente: ${departments.map(d => d.name).join(", ") || "—"}
- Pozitii active: ${jobs}

### C2 — Conformitate
- MVV: Misiune=${company?.mission ? "DA" : "NU"}, Viziune=${company?.vision ? "DA" : "NU"}, Valori=${company?.values?.length ? "DA" : "NU"}

### C3 — Competitivitate
- Audit cultural: ${cultureAudit ? JSON.stringify(cultureAudit).slice(0, 800) : "nedisponibil"}
- Obiective: ${objectives.length} totale, ${objectives.filter(o => o.completedAt).length} completate

### C4 — Dezvoltare
- Simulari WIF: ${wifData ? JSON.stringify(wifData).slice(0, 500) : "nerulate"}
- Calcul ROI: ${roiData ? JSON.stringify(roiData).slice(0, 500) : "necalculat"}
- Plan interventie: ${interventionPlan ? "DA" : "NU"}
`

    const result = await cpuCall({
      system: `Esti consultant de business senior. Genereaza un plan operational bazat exclusiv pe datele disponibile. Fii pragmatic, masurabil, orientat spre actiune. Returneaza JSON valid.`,
      messages: [
        {
          role: "user",
          content: `${contextData}

Genereaza un PLAN OPERATIONAL DE BUSINESS cu:
1. Sumar executiv (max 3 paragrafe)
2. 4 sectiuni tematice (structura, cultura, competitivitate, dezvoltare) cu metrici concrete
3. Proiectie ROI (estimare investitie vs return, timeline, nivel incredere)
4. Top 5 prioritati cu impact, efort si timeline

Returneaza JSON:
{
  "executiveSummary": "...",
  "sections": [{ "title": "...", "content": "...", "metrics": { "key": "value" } }],
  "roiProjection": { "investment": 0, "expectedReturn": 0, "timeframeMonths": 0, "confidence": 0-100 },
  "priorities": [{ "action": "...", "impact": "HIGH|MEDIUM|LOW", "effort": "HIGH|MEDIUM|LOW", "timeline": "..." }]
}`,
        },
      ],
      max_tokens: 4000,
      agentRole: "COG",
      operationType: "report-business-plan",
      tenantId,
      skipObjectiveCheck: true,
    })

    if (result.degraded) {
      return NextResponse.json({ message: "Serviciu temporar indisponibil." }, { status: 503 })
    }

    let parsed: Omit<BusinessPlanResult, "createdAt">
    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error("JSON not found")
      parsed = JSON.parse(jsonMatch[0])
    } catch {
      return NextResponse.json({ message: "Eroare la procesarea raspunsului AI." }, { status: 502 })
    }

    const report: BusinessPlanResult = {
      ...parsed,
      createdAt: new Date().toISOString(),
    }

    await setTenantData(tenantId, "REPORT_BUSINESS_PLAN", report)
    return NextResponse.json(report)
  } catch (error) {
    console.error("[BUSINESS PLAN POST]", error)
    return NextResponse.json({ message: "Eroare interna." }, { status: 500 })
  }
}
