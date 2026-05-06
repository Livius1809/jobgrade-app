/**
 * /api/v1/cfo/service-costing — Estimare cost AI per tip serviciu
 *
 * GET — Cost mediu AI per execuție, preț perceput, marjă per serviciu
 *
 * Logica simplificată: BudgetLine API_AI actual / nr execuții serviciu = cost mediu
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

export async function GET(req: NextRequest) {
  const session = await authOrKey(req)
  if (!session?.user) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const currentMonthStart = startOfMonth(new Date())

  // ── Parallel queries ─────────────────────────────────────────────────────
  const [apiAiBudget, revenueByType, totalExecutions] = await Promise.all([
    // Cost AI actual din BudgetLine
    prisma.budgetLine.findFirst({
      where: { month: currentMonthStart, category: "API_AI" },
      select: { actual: true, planned: true },
    }),

    // Venituri per tip serviciu (current month)
    prisma.revenueEntry.groupBy({
      by: ["type"],
      where: { periodMonth: currentMonthStart },
      _sum: { amount: true },
      _count: { id: true },
    }),

    // Total execuții agent — ca proxy pentru nr servicii livrate
    prisma.agentMetric.aggregate({
      where: {
        periodStart: { gte: currentMonthStart },
      },
      _sum: { tasksCompleted: true },
    }),
  ])

  const totalAiCost = toNumber(apiAiBudget?.actual)
  const plannedAiCost = toNumber(apiAiBudget?.planned)
  const totalTasks = totalExecutions._sum.tasksCompleted || 1 // avoid div/0
  const avgCostPerExecution = totalTasks > 0
    ? Number((totalAiCost / totalTasks).toFixed(2))
    : 0

  // ── Per service type breakdown ───────────────────────────────────────────
  const serviceTypes = ["SUBSCRIPTION", "CREDITS", "SERVICE", "REFUND"] as const
  const serviceCosting = serviceTypes
    .filter((t) => t !== "REFUND")
    .map((type) => {
      const row = revenueByType.find((r) => r.type === type)
      const revenueAmount = toNumber(row?._sum.amount)
      const count = row?._count.id || 0
      const avgPrice = count > 0 ? Number((revenueAmount / count).toFixed(2)) : 0
      // Distribute AI cost proportionally to number of transactions
      const totalTransactions = revenueByType
        .filter((r) => r.type !== "REFUND")
        .reduce((acc, r) => acc + (r._count.id || 0), 0)
      const estimatedCost = totalTransactions > 0
        ? Number(((totalAiCost * (count / totalTransactions))).toFixed(2))
        : 0
      const margin = revenueAmount > 0
        ? Number(((revenueAmount - estimatedCost) / revenueAmount).toFixed(4))
        : 0

      return {
        type,
        transactionCount: count,
        totalRevenue: revenueAmount,
        avgPricePerTransaction: avgPrice,
        estimatedAiCost: estimatedCost,
        margin,
      }
    })

  return NextResponse.json({
    periodMonth: `${currentMonthStart.getUTCFullYear()}-${String(currentMonthStart.getUTCMonth() + 1).padStart(2, "0")}`,
    aiCost: {
      planned: plannedAiCost,
      actual: totalAiCost,
      variancePercent: plannedAiCost > 0
        ? Number((((totalAiCost - plannedAiCost) / plannedAiCost) * 100).toFixed(2))
        : 0,
    },
    totalAgentExecutions: totalTasks,
    avgCostPerExecution,
    serviceCosting,
  })
}
