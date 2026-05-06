/**
 * /api/v1/reports/strategic-metrics
 *
 * C3 — Metrici strategice de performanta
 * POST — Analiza: objectives completion rate, time-to-complete, cascade effectiveness
 */

import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"
import { cpuCall } from "@/lib/cpu/gateway"
import { setTenantData } from "@/lib/tenant-storage"

export const dynamic = "force-dynamic"

interface StrategicMetricsResult {
  objectivesTotal: number
  objectivesCompleted: number
  completionRate: number
  avgTimeToComplete: number | null
  cascadeEffectiveness: number
  dimensions: Array<{
    name: string
    score: number
    insight: string
  }>
  overallScore: number
  strategicInsight: string
  createdAt: string
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const tenantId = session.user.tenantId

    // Gather objectives data
    const objectives = await prisma.organizationalObjective.findMany({
      where: { businessId: tenantId },
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        completedAt: true,
        parentObjectiveId: true,
        ownerRoles: true,
      },
    }).catch(() => [])

    const total = objectives.length
    const completed = objectives.filter(o => o.completedAt !== null)
    const completionRate = total > 0 ? Math.round((completed.length / total) * 100) : 0

    // Average time to complete (in days)
    let avgTimeToComplete: number | null = null
    if (completed.length > 0) {
      const totalDays = completed.reduce((sum, o) => {
        const start = new Date(o.createdAt).getTime()
        const end = new Date(o.completedAt!).getTime()
        return sum + (end - start) / (1000 * 60 * 60 * 24)
      }, 0)
      avgTimeToComplete = Math.round(totalDays / completed.length)
    }

    // Cascade effectiveness: % of child objectives completed when parent is completed
    const parentObjectives = objectives.filter(o => !o.parentObjectiveId && o.completedAt)
    let cascadeEffectiveness = 0
    if (parentObjectives.length > 0) {
      const childCompletionRates = parentObjectives.map(parent => {
        const children = objectives.filter(o => o.parentObjectiveId === parent.id)
        if (children.length === 0) return 100
        const childCompleted = children.filter(c => c.completedAt !== null).length
        return Math.round((childCompleted / children.length) * 100)
      })
      cascadeEffectiveness = Math.round(
        childCompletionRates.reduce((s, r) => s + r, 0) / childCompletionRates.length
      )
    }

    const contextData = `## Metrici strategice

- Obiective totale: ${total}
- Obiective completate: ${completed.length}
- Rata completare: ${completionRate}%
- Timp mediu completare: ${avgTimeToComplete !== null ? `${avgTimeToComplete} zile` : "N/A"}
- Eficacitate cascada: ${cascadeEffectiveness}%
- Obiective cu sub-obiective: ${parentObjectives.length}
- Distributie roluri responsabile: ${JSON.stringify(
      objectives.reduce((acc, o) => {
        (o.ownerRoles ?? []).forEach((r: string) => { acc[r] = (acc[r] || 0) + 1 })
        return acc
      }, {} as Record<string, number>)
    )}
`

    const result = await cpuCall({
      system: `Esti expert in analiza performantei strategice organizationale. Returneaza un JSON valid.`,
      messages: [
        {
          role: "user",
          content: `${contextData}

Analizeaza performanta strategica pe 4 dimensiuni:
1. Executie strategica (rata completare, viteza)
2. Aliniere cascada (eficacitate propagare obiective)
3. Distributie efort (echilibrul roluri/responsabilitati)
4. Momentum strategic (trend completare in timp)

Returneaza JSON:
{
  "dimensions": [{ "name": "...", "score": 0-100, "insight": "..." }],
  "overallScore": 0-100,
  "strategicInsight": "sinteza strategica in 2-3 propozitii"
}`,
        },
      ],
      max_tokens: 2000,
      agentRole: "COA",
      operationType: "report-strategic-metrics",
      tenantId,
      skipObjectiveCheck: true,
    })

    if (result.degraded) {
      return NextResponse.json({ message: "Serviciu temporar indisponibil." }, { status: 503 })
    }

    let parsed: { dimensions: Array<{ name: string; score: number; insight: string }>; overallScore: number; strategicInsight: string }
    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error("JSON not found")
      parsed = JSON.parse(jsonMatch[0])
    } catch {
      return NextResponse.json({ message: "Eroare la procesarea raspunsului AI." }, { status: 502 })
    }

    const report: StrategicMetricsResult = {
      objectivesTotal: total,
      objectivesCompleted: completed.length,
      completionRate,
      avgTimeToComplete,
      cascadeEffectiveness,
      dimensions: parsed.dimensions,
      overallScore: parsed.overallScore,
      strategicInsight: parsed.strategicInsight,
      createdAt: new Date().toISOString(),
    }

    await setTenantData(tenantId, "REPORT_STRATEGIC_METRICS", report)
    return NextResponse.json(report)
  } catch (error) {
    console.error("[STRATEGIC METRICS POST]", error)
    return NextResponse.json({ message: "Eroare interna." }, { status: 500 })
  }
}
