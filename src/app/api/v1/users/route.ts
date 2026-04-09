import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const ADMIN_ROLES = ["SUPER_ADMIN", "COMPANY_ADMIN", "OWNER"] as const

/**
 * GET /api/v1/users
 * List users for the authenticated user's tenant.
 * Requires SUPER_ADMIN, COMPANY_ADMIN, or OWNER role.
 */
export async function GET() {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const { role, tenantId } = session.user

    if (!ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number])) {
      return NextResponse.json(
        { message: "Acces interzis. Rol insuficient." },
        { status: 403 }
      )
    }

    const users = await prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        jobTitle: true,
        role: true,
        status: true,
        locale: true,
        lastLogin: true,
        createdAt: true,
        department: {
          select: { id: true, name: true },
        },
      },
      orderBy: [{ role: "asc" }, { firstName: "asc" }],
    })

    return NextResponse.json({ users, total: users.length })
  } catch (error) {
    console.error("[USERS GET]", error)
    return NextResponse.json({ message: "Eroare internă." }, { status: 500 })
  }
}
