import { NextRequest, NextResponse } from "next/server"
import { distillRecentSessions } from "@/lib/kb/distill"

function verifyInternalAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

/**
 * POST /api/v1/kb/distill — Extrage pattern-uri din conversații recente
 *
 * Query params:
 *   agentRole — filtrează pe un singur agent (opțional)
 *   hoursBack — fereastră de timp (default 24h)
 *   maxSessions — limită sesiuni procesate (default 20)
 *   dryRun — true = doar numără, nu salvează (default false)
 */
export async function POST(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
  }

  try {
    const searchParams = new URL(req.url).searchParams
    const agentRole = searchParams.get("agentRole") ?? undefined
    const hoursBack = searchParams.get("hoursBack")
      ? parseInt(searchParams.get("hoursBack")!)
      : 24
    const maxSessions = searchParams.get("maxSessions")
      ? parseInt(searchParams.get("maxSessions")!)
      : 20
    const dryRun = searchParams.get("dryRun") === "true"

    const results = await distillRecentSessions({
      agentRole,
      hoursBack,
      maxSessions,
      dryRun,
    })

    const totalInsights = results.reduce((s, r) => s + r.insightsExtracted, 0)
    const totalBuffers = results.reduce((s, r) => s + r.buffersCreated, 0)
    const totalSessions = results.reduce((s, r) => s + r.sessionsProcessed, 0)

    return NextResponse.json({
      summary: {
        agentRoles: results.length,
        sessionsProcessed: totalSessions,
        insightsExtracted: totalInsights,
        buffersCreated: totalBuffers,
        dryRun,
      },
      byAgent: results,
    })
  } catch (error: any) {
    console.error("[KB DISTILL]", error)
    return NextResponse.json(
      { message: "Eroare la distilare.", details: error.message },
      { status: 500 }
    )
  }
}
