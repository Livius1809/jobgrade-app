import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * POST /api/v1/admin/pilot-toggle
 * Toggle pilot mode for a tenant. Owner/Super Admin only.
 * Pilot tenants get full access without billing, data collected for improvement.
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || !["OWNER", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 403 })
  }

  const { tenantId, isPilot } = await req.json()
  if (!tenantId || typeof isPilot !== "boolean") {
    return NextResponse.json({ error: "tenantId și isPilot sunt obligatorii" }, { status: 400 })
  }

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { isPilot },
  })

  return NextResponse.json({ ok: true, tenantId, isPilot })
}
