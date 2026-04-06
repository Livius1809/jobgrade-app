import { NextRequest, NextResponse } from "next/server"
import { revertReorganization, autoRevertExpired } from "@/lib/disfunctions/reorg-engine"

function verifyInternalAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

/**
 * POST /api/v1/reorg/revert
 * Body: { eventId: string, reason: "owner_override" | "role_recovered" }
 *
 * Revert manual al unei reorganizări active.
 * Fără body: auto-revert toate reorganizările expirate.
 */
export async function POST(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const { eventId, reason } = body as { eventId?: string; reason?: string }

    // Manual revert
    if (eventId) {
      const validReasons = ["owner_override", "role_recovered"] as const
      const r = validReasons.includes(reason as any) ? (reason as any) : "owner_override"
      const result = await revertReorganization(eventId, r)
      return NextResponse.json(result)
    }

    // Auto-revert expired
    const result = await autoRevertExpired()
    return NextResponse.json({
      message: `Auto-revert: ${result.reverted} reverted, ${result.escalated} escalated`,
      ...result,
    })
  } catch (error: any) {
    console.error("[REORG REVERT]", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
