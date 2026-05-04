import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"
import { ORG_ROLE_DEFINITIONS } from "@/lib/permissions"

export const dynamic = "force-dynamic"

/**
 * GET /api/v1/org-roles/suggest?departmentId=X
 *
 * Sugerează roluri OrgRole pe baza departamentului (template Opțiunea B).
 * Citește DEPT_ROLE_TEMPLATE din SystemConfig per tenant.
 * Dacă nu există template, returnează roluri default (SAL).
 */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ message: "Neautorizat." }, { status: 401 })

  const tenantId = session.user.tenantId
  const departmentId = new URL(req.url).searchParams.get("departmentId")

  if (!departmentId) {
    return NextResponse.json({ message: "departmentId obligatoriu." }, { status: 400 })
  }

  // Găsim departamentul
  const dept = await prisma.department.findUnique({
    where: { id: departmentId },
    select: { name: true, tenantId: true },
  })
  if (!dept || dept.tenantId !== tenantId) {
    return NextResponse.json({ message: "Departament negasit." }, { status: 404 })
  }

  // Citim template-ul din SystemConfig
  const templateConfig = await prisma.systemConfig.findUnique({
    where: { key: `DEPT_ROLE_TEMPLATE:${tenantId}` },
  })

  let suggestedRoles: string[] = ["SAL"]
  let description = "Rol implicit — salariat"

  if (templateConfig) {
    const template = JSON.parse(templateConfig.value) as Record<string, { roles: string[]; description: string }>
    const match = template[dept.name]
    if (match) {
      suggestedRoles = match.roles
      description = match.description
    }
  }

  // Enrich cu definiții complete
  const suggestions = suggestedRoles.map(roleId => {
    const def = ORG_ROLE_DEFINITIONS.find(d => d.role === roleId)
    return {
      role: roleId,
      label: def?.label ?? roleId,
      description: def?.description ?? "",
      category: def?.category ?? "employee",
      required: def?.required ?? false,
    }
  })

  return NextResponse.json({
    department: dept.name,
    description,
    suggestions,
  })
}
