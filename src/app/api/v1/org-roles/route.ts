import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { OrgRole } from "@/generated/prisma"
import { ORG_ROLE_DEFINITIONS } from "@/lib/permissions"

export const dynamic = "force-dynamic"

const AssignSchema = z.object({
  userId: z.string().min(1),
  orgRole: z.nativeEnum(OrgRole),
})

/**
 * GET /api/v1/org-roles — Lista rolurilor organizationale per tenant
 */
export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ message: "Neautorizat." }, { status: 401 })

  const assignments = await prisma.userOrgRole.findMany({
    where: { tenantId: session.user.tenantId },
    include: {
      user: { select: { firstName: true, lastName: true, email: true, jobTitle: true } },
    },
    orderBy: { assignedAt: "desc" },
  })

  return NextResponse.json({ assignments })
}

/**
 * POST /api/v1/org-roles — Alocă un rol organizațional unui user
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ message: "Neautorizat." }, { status: 401 })

    const { role, tenantId, id: currentUserId } = session.user
    if (!["OWNER", "COMPANY_ADMIN", "SUPER_ADMIN"].includes(role)) {
      return NextResponse.json({ message: "Acces interzis." }, { status: 403 })
    }

    const body = await req.json()
    const parsed = AssignSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ message: "Date invalide." }, { status: 422 })
    }

    // Verifică că user-ul aparține aceluiași tenant
    const targetUser = await prisma.user.findFirst({
      where: { id: parsed.data.userId, tenantId },
      select: { id: true, orgRoles: { select: { orgRole: true } } },
    })
    if (!targetUser) {
      return NextResponse.json({ message: "Utilizator negasit." }, { status: 404 })
    }

    // Verifică cumulabilitate
    const existingRoles = targetUser.orgRoles.map((r) => r.orgRole)
    const newRoleDef = ORG_ROLE_DEFINITIONS.find((d) => d.role === parsed.data.orgRole)

    if (newRoleDef && existingRoles.length > 0) {
      const incompatible = existingRoles.some((existing) => {
        const existingDef = ORG_ROLE_DEFINITIONS.find((d) => d.role === existing)
        return (
          !newRoleDef.cumulableWith.includes(existing) &&
          !existingDef?.cumulableWith.includes(parsed.data.orgRole)
        )
      })
      if (incompatible) {
        return NextResponse.json(
          { message: `Rolul ${parsed.data.orgRole} nu este cumulabil cu rolurile existente: ${existingRoles.join(", ")}` },
          { status: 409 }
        )
      }
    }

    const assignment = await prisma.userOrgRole.create({
      data: {
        userId: parsed.data.userId,
        tenantId,
        orgRole: parsed.data.orgRole,
        assignedBy: currentUserId,
      },
    })

    return NextResponse.json({ assignment }, { status: 201 })
  } catch (error) {
    // Duplicate
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json(
        { message: "Acest rol este deja alocat acestui utilizator." },
        { status: 409 }
      )
    }
    console.error("[ORG-ROLES POST]", error)
    return NextResponse.json({ message: "Eroare server." }, { status: 500 })
  }
}
