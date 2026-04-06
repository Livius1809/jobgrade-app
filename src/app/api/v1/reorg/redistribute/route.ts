import { NextRequest, NextResponse } from "next/server"
import { redistributeSubordinates } from "@/lib/disfunctions/reorg-engine"

function verifyInternalAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

/**
 * POST /api/v1/reorg/redistribute
 * Body: { triggeredByRole: string, triggeredByEventId?: string }
 *
 * Redistribuie subordonații unui rol D2 la un peer disponibil.
 */
export async function POST(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  try {
    const { triggeredByRole, triggeredByEventId } = await req.json()

    if (!triggeredByRole) {
      return NextResponse.json({ error: "triggeredByRole required" }, { status: 400 })
    }

    const result = await redistributeSubordinates(triggeredByRole, triggeredByEventId)

    return NextResponse.json(result, { status: result.success ? 201 : 409 })
  } catch (error: any) {
    console.error("[REORG REDISTRIBUTE]", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
