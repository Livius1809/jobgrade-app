import { NextRequest, NextResponse } from "next/server"
import { computeMetaMetrics } from "@/lib/agents/meta-metrics"

function verifyInternalAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

/**
 * GET /api/v1/agents/meta-metrics
 * Meta-metrici de adaptare a organismului.
 */
export async function GET(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  try {
    const snapshot = await computeMetaMetrics()
    return NextResponse.json(snapshot)
  } catch (error: any) {
    console.error("[META-METRICS]", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
