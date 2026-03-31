import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { runFullAnalysis, analyzeCoverage, analyzeGaps, analyzeRedundancies } from "@/lib/agents/org-analysis"

function checkAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

/**
 * GET /api/v1/agents/analysis
 * Run org analysis on-demand.
 * Query params: ?type=full|coverage|gaps|redundancies (default: full)
 *
 * Note: full and gaps/redundancies call Claude API (costs credits).
 * Coverage is free (DB queries only).
 */
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const type = url.searchParams.get("type") || "full"

  try {
    switch (type) {
      case "coverage": {
        const coverage = await analyzeCoverage(prisma)
        return NextResponse.json({ type: "coverage", coverage })
      }
      case "gaps": {
        const gaps = await analyzeGaps(prisma)
        return NextResponse.json({ type: "gaps", gaps })
      }
      case "redundancies": {
        const redundancies = await analyzeRedundancies(prisma)
        return NextResponse.json({ type: "redundancies", redundancies })
      }
      case "full":
      default: {
        const report = await runFullAnalysis(prisma)
        return NextResponse.json({ type: "full", report })
      }
    }
  } catch (e: any) {
    console.error("[ANALYSIS]", e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
