import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { runMetricsCollection } from "@/lib/agents/metrics-collector"

function checkAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

/**
 * POST /api/v1/agents/metrics/collect
 * Trigger metrics collection for all agents.
 * Body: { period?: "daily" | "weekly" | "monthly" }
 */
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json().catch(() => ({}))
    const period = body.period || "daily"

    const result = await runMetricsCollection(prisma, period)

    return NextResponse.json({
      collected: result.collected,
      period,
      agents: result.agents,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
