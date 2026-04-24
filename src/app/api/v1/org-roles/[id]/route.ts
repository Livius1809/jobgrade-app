import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

/**
 * DELETE /api/v1/org-roles/[id] — Retrage un rol organizațional
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ message: "Neautorizat." }, { status: 401 })

    const { role, tenantId } = session.user
    if (!["OWNER", "COMPANY_ADMIN", "SUPER_ADMIN"].includes(role)) {
      return NextResponse.json({ message: "Acces interzis." }, { status: 403 })
    }

    const { id } = await params

    const existing = await prisma.userOrgRole.findFirst({
      where: { id, tenantId },
    })
    if (!existing) {
      return NextResponse.json({ message: "Alocare negasita." }, { status: 404 })
    }

    await prisma.userOrgRole.delete({ where: { id } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[ORG-ROLES DELETE]", error)
    return NextResponse.json({ message: "Eroare server." }, { status: 500 })
  }
}
