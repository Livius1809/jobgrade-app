/**
 * /api/v1/cfo/financial-summary — Rezumat financiar complet
 *
 * GET — Venituri, costuri, profitabilitate, trend 6 luni
 *
 * Folosit de: CFO agent (ciclu lunar), Owner Dashboard financial page
 */

import { NextRequest, NextResponse } from "next/server"
import { authOrKey } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"
// Decimal from Prisma — convert with Number()

export const dynamic = "force-dynamic"

function toNumber(d: any): number {
  if (d === null || d === undefined) return 0
  return typeof d === "number" ? d : Number(d)
}

function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
}

function formatMonth(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
}

export async function GET(req: NextRequest) {
  const session = await authOrKey(req)
  if (!session?.user) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const now = new Date()
  const currentMonthStart = startOfMonth(now)

  // Build array of last 6 months (including current)
  const trendMonths: Date[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
    trendMonths.push(d)
  }
  const oldestMonth = trendMonths[0]

  // ── Parallel queries ─────────────────────────────────────────────────────
  const [
    revenueByType,
    revenueByTenant,
    revenueTrendRaw,
    budgetLines,
  ] = await Promise.all([
    // 1. Revenue grouped by type — current month
    prisma.revenueEntry.groupBy({
      by: ["type"],
      where: { periodMonth: currentMonthStart },
      _sum: { amount: true },
    }),

    // 2. Revenue grouped by tenant — current month
    prisma.revenueEntry.groupBy({
      by: ["tenantId"],
      where: { periodMonth: currentMonthStart },
      _sum: { amount: true },
    }),

    // 3. Revenue per month — last 6 months (for trend)
    prisma.revenueEntry.groupBy({
      by: ["periodMonth"],
      where: {
        periodMonth: { gte: oldestMonth, lte: currentMonthStart },
      },
      _sum: { amount: true },
    }),

    // 4. Budget lines — current month
    prisma.budgetLine.findMany({
      where: { month: currentMonthStart },
    }),
  ])

  // ── Tenant names lookup ──────────────────────────────────────────────────
  const tenantIds = revenueByTenant.map((r) => r.tenantId)
  const tenants = tenantIds.length > 0
    ? await prisma.tenant.findMany({
        where: { id: { in: tenantIds } },
        select: { id: true, name: true },
      })
    : []
  const tenantMap = new Map(tenants.map((t) => [t.id, t.name]))

  // ── Revenue assembly ─────────────────────────────────────────────────────
  const byType: Record<string, number> = {
    SUBSCRIPTION: 0,
    CREDITS: 0,
    SERVICE: 0,
    REFUND: 0,
  }
  for (const row of revenueByType) {
    byType[row.type] = toNumber(row._sum.amount)
  }
  const totalRevenue = Object.values(byType).reduce((a, b) => a + b, 0)

  const byTenant = revenueByTenant.map((r) => ({
    tenantId: r.tenantId,
    tenantName: tenantMap.get(r.tenantId) || r.tenantId,
    amount: toNumber(r._sum.amount),
  }))
  byTenant.sort((a, b) => b.amount - a.amount)

  // ── Trend ────────────────────────────────────────────────────────────────
  const trendMap = new Map<string, number>()
  for (const row of revenueTrendRaw) {
    const key = formatMonth(new Date(row.periodMonth))
    trendMap.set(key, toNumber(row._sum.amount))
  }
  const trend = trendMonths.map((m) => ({
    month: formatMonth(m),
    amount: trendMap.get(formatMonth(m)) || 0,
  }))

  // ── Costs assembly ───────────────────────────────────────────────────────
  const costCategories = ["INFRA", "API_AI", "MARKETING", "PERSONAL", "DIVERSE"] as const
  const planned: Record<string, number> = {}
  const actual: Record<string, number> = {}
  const byCategory: Record<string, number> = {}

  for (const cat of costCategories) {
    planned[cat] = 0
    actual[cat] = 0
    byCategory[cat] = 0
  }

  for (const bl of budgetLines) {
    const cat = bl.category as string
    if (cat === "REVENUE") continue // Skip revenue budget lines for costs
    planned[cat] = toNumber(bl.planned)
    actual[cat] = toNumber(bl.actual)
    byCategory[cat] = toNumber(bl.actual)
  }

  const totalPlanned = Object.values(planned).reduce((a, b) => a + b, 0)
  const totalActual = Object.values(actual).reduce((a, b) => a + b, 0)
  const variancePercent = totalPlanned > 0
    ? Number((((totalActual - totalPlanned) / totalPlanned) * 100).toFixed(2))
    : 0

  // ── Profitability ────────────────────────────────────────────────────────
  const grossMargin = totalRevenue > 0
    ? Number(((totalRevenue - totalActual) / totalRevenue).toFixed(4))
    : 0
  const netRevenue = totalRevenue - totalActual
  const costToRevenueRatio = totalRevenue > 0
    ? Number((totalActual / totalRevenue).toFixed(4))
    : 0

  return NextResponse.json({
    periodMonth: formatMonth(currentMonthStart),
    revenue: {
      total: totalRevenue,
      byType,
      byTenant,
      trend,
    },
    costs: {
      byCategory,
      planned,
      actual,
      variancePercent,
    },
    profitability: {
      grossMargin,
      netRevenue,
      costToRevenueRatio,
    },
  })
}
