import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateRecommendations } from "@/lib/agents/perf-recommendations"

function checkAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

/**
 * GET /api/v1/agents/metrics/summary
 * Aggregated performance summary with top/under performers and recommendations.
 */
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const report = await generateRecommendations(prisma)
    return NextResponse.json(report)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
