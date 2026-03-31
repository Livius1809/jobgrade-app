import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

function checkAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

/**
 * GET /api/v1/agents/metrics
 * List latest metrics for all agents.
 * Query: ?period=daily|weekly|monthly
 */
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const metrics = await (prisma as any).agentMetric.findMany({
      orderBy: { periodEnd: "desc" },
      distinct: ["agentRole"],
      take: 100,
    })

    return NextResponse.json({
      metrics: metrics.map((m: any) => ({
        agentRole: m.agentRole,
        performanceScore: m.performanceScore,
        tasksCompleted: m.tasksCompleted,
        tasksEscalated: m.tasksEscalated,
        kbEntriesAdded: m.kbEntriesAdded,
        kbEntriesUsed: m.kbEntriesUsed,
        propagationsOut: m.propagationsOut,
        propagationsIn: m.propagationsIn,
        healthScoreAvg: m.healthScoreAvg,
        periodStart: m.periodStart,
        periodEnd: m.periodEnd,
      })),
      total: metrics.length,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
