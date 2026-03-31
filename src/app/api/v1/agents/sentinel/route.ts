import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { runPatternSentinel, runAllSentinels } from "@/lib/agents/pattern-sentinel"
import { notifySentinelAlert } from "@/lib/agents/owner-notify"

function checkAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

/**
 * POST /api/v1/agents/sentinel
 * Body: { role?: string } — single agent or all managers
 */
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json().catch(() => ({}))

    if (body.role) {
      const result = await runPatternSentinel(body.role, prisma)
      return NextResponse.json(result)
    }

    const result = await runAllSentinels(prisma)

    // Notify Owner for any ALERT signals
    for (const r of result.results) {
      const alerts = r.signals.filter(s => s.severity === "ALERT")
      if (alerts.length > 0) {
        notifySentinelAlert(r.agentRole, alerts.length, alerts[0].description).catch(() => {})
      }
    }

    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
