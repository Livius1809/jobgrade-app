/**
 * /api/v1/reports/learning-capacity
 *
 * C3 — Raport capacitate de invatare organizationala
 * POST — Analiza: KB growth rate, learning artifacts count, knowledge debt ratio
 */

import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"
import { cpuCall } from "@/lib/cpu/gateway"
import { getTenantData, setTenantData } from "@/lib/tenant-storage"

export const dynamic = "force-dynamic"

interface LearningCapacityResult {
  kbGrowthRate: number
  learningArtifactsCount: number
  knowledgeDebtRatio: number
  dimensions: Array<{
    name: string
    score: number
    insight: string
  }>
  overallScore: number
  recommendations: string[]
  createdAt: string
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const tenantId = session.user.tenantId

    // Gather learning data — KBEntry uses tags for tenant scope, objectives use businessId
    const [kbEntries, kbBuffers, objectives] = await Promise.all([
      prisma.kBEntry.findMany({
        where: { tags: { has: tenantId } },
        select: { createdAt: true, status: true, confidence: true },
        orderBy: { createdAt: "desc" },
        take: 500,
      }).catch(() => []),
      prisma.kBBuffer.findMany({
        select: { createdAt: true, status: true },
      }).catch(() => []),
      prisma.organizationalObjective.findMany({
        where: { businessId: tenantId },
        select: { title: true, completedAt: true, createdAt: true },
      }).catch(() => []),
    ])

    // Calculate metrics
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const recentEntries = kbEntries.filter(e => new Date(e.createdAt) > thirtyDaysAgo)
    const kbGrowthRate = recentEntries.length // entries per 30 days

    const validatedEntries = kbEntries.filter(e => e.status === "PERMANENT")
    const pendingBuffers = kbBuffers.filter(b => b.status === "PENDING")
    const knowledgeDebtRatio = kbEntries.length > 0
      ? pendingBuffers.length / (validatedEntries.length + pendingBuffers.length)
      : 0

    const contextData = `## Metrici invatare organizationala

- Total KB entries: ${kbEntries.length}
- Entries validate: ${validatedEntries.length}
- Rata crestere (30 zile): ${kbGrowthRate} entries noi
- Buffere pending (knowledge debt): ${pendingBuffers.length}
- Ratio knowledge debt: ${(knowledgeDebtRatio * 100).toFixed(1)}%
- Obiective totale: ${objectives.length}
- Obiective completate: ${objectives.filter(o => o.completedAt).length}
`

    const result = await cpuCall({
      system: `Esti expert in analiza capacitatii de invatare organizationala. Analizeaza datele si returneaza un JSON valid.`,
      messages: [
        {
          role: "user",
          content: `${contextData}

Analizeaza capacitatea de invatare pe 4 dimensiuni:
1. Viteza de acumulare cunostinte
2. Calitate cunostinte (validated vs pending)
3. Transfer cunostinte in obiective
4. Sustenabilitate invatare (trend)

Returneaza JSON:
{
  "dimensions": [{ "name": "...", "score": 0-100, "insight": "..." }],
  "overallScore": 0-100,
  "recommendations": ["recomandare 1", "recomandare 2", "recomandare 3"]
}`,
        },
      ],
      max_tokens: 2000,
      agentRole: "COA",
      operationType: "report-learning-capacity",
      tenantId,
      skipObjectiveCheck: true,
    })

    if (result.degraded) {
      return NextResponse.json({ message: "Serviciu temporar indisponibil." }, { status: 503 })
    }

    // Parse AI response
    let parsed: { dimensions: Array<{ name: string; score: number; insight: string }>; overallScore: number; recommendations: string[] }
    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error("JSON not found")
      parsed = JSON.parse(jsonMatch[0])
    } catch {
      return NextResponse.json({ message: "Eroare la procesarea raspunsului AI." }, { status: 502 })
    }

    const report: LearningCapacityResult = {
      kbGrowthRate,
      learningArtifactsCount: kbEntries.length,
      knowledgeDebtRatio: Math.round(knowledgeDebtRatio * 100) / 100,
      dimensions: parsed.dimensions,
      overallScore: parsed.overallScore,
      recommendations: parsed.recommendations,
      createdAt: new Date().toISOString(),
    }

    await setTenantData(tenantId, "REPORT_LEARNING_CAPACITY", report)
    return NextResponse.json(report)
  } catch (error) {
    console.error("[LEARNING CAPACITY POST]", error)
    return NextResponse.json({ message: "Eroare interna." }, { status: 500 })
  }
}
