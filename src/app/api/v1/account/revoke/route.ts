/**
 * POST /api/v1/account/revoke — Confirmare revocare acces (cumulativă)
 *
 * Fiecare admin confirmă separat. Revocare efectivă doar când TOȚI confirmă.
 * Body: { suspendedUserId }
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { confirmRevocation } from "@/lib/auth/email-check"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId || !["OWNER", "COMPANY_ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Doar adminii pot confirma revocarea" }, { status: 401 })
  }

  const { suspendedUserId } = await req.json()
  if (!suspendedUserId) {
    return NextResponse.json({ error: "suspendedUserId obligatoriu" }, { status: 400 })
  }

  const result = await confirmRevocation(session.user.tenantId, suspendedUserId, session.user.id)

  if (!result.confirmed) {
    return NextResponse.json({ error: "Revocare negăsită sau deja procesată" }, { status: 404 })
  }

  return NextResponse.json({
    ok: true,
    totalRequired: result.totalRequired,
    totalConfirmed: result.totalConfirmed,
    fullyRevoked: result.fullyRevoked,
    message: result.fullyRevoked
      ? "Acces revocat definitiv. Toți administratorii au confirmat."
      : `${result.totalConfirmed}/${result.totalRequired} confirmări. Mai sunt necesare ${result.totalRequired - result.totalConfirmed}.`,
  })
}
