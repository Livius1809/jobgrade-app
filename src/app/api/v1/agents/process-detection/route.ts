import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import {
  trackTransition,
  detectAnomalies,
  getRecentTransitions,
  getBufferStats,
} from "@/lib/engines/process-detection-engine"

export const dynamic = "force-dynamic"

function checkAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

const transitionSchema = z.object({
  fromAgent: z.string().min(1),
  toAgent: z.string().min(1),
  transitionType: z.enum(["HANDOFF", "ESCALATION", "DELEGATION", "FEEDBACK"]),
  timestamp: z.string().or(z.number()).optional(),
  success: z.boolean(),
  durationMs: z.number().int().nonnegative().optional(),
})

/**
 * GET /api/v1/agents/process-detection
 *
 * Returnează anomaliile procesuale recente + statistici buffer.
 * Query: ?window=60 (minute, default 60)
 */
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const windowStr = req.nextUrl.searchParams.get("window")
    const windowMinutes = windowStr ? parseInt(windowStr, 10) : 60

    const [anomalies, stats, recent] = await Promise.all([
      detectAnomalies(isNaN(windowMinutes) ? 60 : windowMinutes),
      Promise.resolve(getBufferStats()),
      Promise.resolve(getRecentTransitions(20)),
    ])

    return NextResponse.json({
      anomalies,
      anomalyCount: anomalies.length,
      bufferStats: stats,
      recentTransitions: recent,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

/**
 * POST /api/v1/agents/process-detection
 *
 * Înregistrează o tranziție între agenți.
 * Body: { fromAgent, toAgent, transitionType, success, durationMs? }
 */
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = transitionSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const input = parsed.data

  await trackTransition({
    fromAgent: input.fromAgent,
    toAgent: input.toAgent,
    transitionType: input.transitionType,
    timestamp: input.timestamp ? new Date(input.timestamp) : new Date(),
    success: input.success,
    durationMs: input.durationMs,
  })

  return NextResponse.json({ tracked: true })
}
