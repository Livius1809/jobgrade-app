/**
 * POST /api/v1/objectives/negotiate
 *
 * Negocierea termenelor — evaluează fezabilitatea unui obiectiv cu termen.
 * Cascadează evaluarea pe niveluri ierarhice.
 *
 * Body: {
 *   objectiveTitle: "Primul client B2B",
 *   requestedDeadline: "2026-05-15",
 *   startFromRole: "COG" (default),
 *   requestedBy: "OWNER"
 * }
 *
 * Returnează: fezabilitate per nivel, alternative, consecințe.
 */

import { NextRequest, NextResponse } from "next/server"
import { cascadedNegotiation } from "@/lib/agents/deadline-negotiation"

export const dynamic = "force-dynamic"
export const maxDuration = 60

function verifyAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (key && req.headers.get("x-internal-key") === key) return true
  return false
}

export async function POST(req: NextRequest) {
  // Auth: internal key sau Owner session
  const hasKey = verifyAuth(req)
  if (!hasKey) {
    const { auth } = await import("@/lib/auth")
    const session = await auth()
    if (!session?.user || !["OWNER", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Acces restricționat" }, { status: 401 })
    }
  }

  const body = await req.json()
  const {
    objectiveTitle,
    requestedDeadline,
    startFromRole = "COG",
    requestedBy = "OWNER",
  } = body

  if (!objectiveTitle || !requestedDeadline) {
    return NextResponse.json({ error: "objectiveTitle și requestedDeadline obligatorii" }, { status: 400 })
  }

  const deadline = new Date(requestedDeadline)
  if (isNaN(deadline.getTime())) {
    return NextResponse.json({ error: "requestedDeadline invalid" }, { status: 400 })
  }

  const result = await cascadedNegotiation(
    objectiveTitle,
    deadline,
    startFromRole,
    requestedBy,
  )

  return NextResponse.json({
    ...result,
    requestedDeadline: deadline.toISOString().split("T")[0],
    daysUntilDeadline: Math.round((deadline.getTime() - Date.now()) / (24 * 3600000)),
  })
}
