export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import {
  runVigilance,
  runVigilanceForAll,
  getRecentVigilanceAlerts,
  saveVigilanceAlerts,
} from "@/lib/engines/vigilance-engine"

function checkAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

/**
 * GET /api/v1/agents/vigilance
 * Returns recent vigilance alerts.
 * Query: ?agentRole=SOA (optional — filters by agent)
 */
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const url = new URL(req.url)
    const agentRole = url.searchParams.get("agentRole")

    const alerts = await getRecentVigilanceAlerts()
    const filtered = agentRole
      ? alerts.filter((a) => a.agentRole === agentRole)
      : alerts

    return NextResponse.json({
      count: filtered.length,
      alerts: filtered,
    })
  } catch (err) {
    console.error("[API vigilance GET]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    )
  }
}

/**
 * POST /api/v1/agents/vigilance
 * Triggers vigilance check. Auth required.
 * Body: { agentRole?: string } — if provided, checks only that agent.
 *        If omitted, checks ALL operational agents.
 */
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    let body: { agentRole?: string } = {}
    try {
      body = await req.json()
    } catch {
      // Empty body = run for all
    }

    if (body.agentRole) {
      // Single agent vigilance
      const alerts = await runVigilance(body.agentRole)
      await saveVigilanceAlerts(alerts)

      return NextResponse.json({
        ok: true,
        agentRole: body.agentRole,
        alertsFound: alerts.length,
        alerts,
      })
    }

    // All operational agents
    const results = await runVigilanceForAll()
    const allAlerts = results.flatMap((r) => r.alerts)
    await saveVigilanceAlerts(allAlerts)

    return NextResponse.json({
      ok: true,
      agentsChecked: results.length,
      totalAlerts: allAlerts.length,
      criticalAlerts: allAlerts.filter((a) => a.severity === "CRITICAL").length,
      warningAlerts: allAlerts.filter((a) => a.severity === "WARNING").length,
      results: results.map((r) => ({
        agentRole: r.agentRole,
        alerts: r.alerts.length,
        durationMs: r.durationMs,
      })),
      alerts: allAlerts,
    })
  } catch (err) {
    console.error("[API vigilance POST]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    )
  }
}
