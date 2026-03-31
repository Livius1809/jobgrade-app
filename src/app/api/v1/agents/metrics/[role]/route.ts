import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

function checkAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

/**
 * GET /api/v1/agents/metrics/[role]
 * Detailed metrics for a single agent with historical trend.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ role: string }> }
) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { role } = await params

  try {
    const metrics = await (prisma as any).agentMetric.findMany({
      where: { agentRole: role },
      orderBy: { periodEnd: "desc" },
      take: 30, // last 30 periods
    })

    if (metrics.length === 0) {
      return NextResponse.json({ error: `No metrics for ${role}` }, { status: 404 })
    }

    const latest = metrics[0]
    const trend = metrics.length >= 2
      ? (latest.performanceScore || 0) - (metrics[1].performanceScore || 0)
      : 0

    return NextResponse.json({
      agentRole: role,
      latest,
      trend: trend > 0 ? `+${trend}` : `${trend}`,
      history: metrics,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
