export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import {
  contemplate,
  getRecentInsights,
  isContemplationEnabled,
} from "@/lib/engines/contemplation-engine"

function checkAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

/**
 * GET /api/v1/agents/contemplate
 * Returns recent contemplation insights.
 * Query: ?limit=20
 */
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const url = new URL(req.url)
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 20), 50)

    const insights = await getRecentInsights(limit)
    const enabled = await isContemplationEnabled()

    return NextResponse.json({
      enabled,
      count: insights.length,
      insights,
    })
  } catch (err) {
    console.error("[API contemplate GET]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    )
  }
}

/**
 * POST /api/v1/agents/contemplate
 * Triggers a contemplation cycle. Auth required.
 */
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await contemplate()

    return NextResponse.json({
      ok: true,
      insightsGenerated: result.insights.length,
      inputSummary: result.inputSummary,
      contemplationDurationMs: result.contemplationDurationMs,
      insights: result.insights,
    })
  } catch (err) {
    console.error("[API contemplate POST]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    )
  }
}
