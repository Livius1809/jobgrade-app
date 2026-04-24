import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import RolesConfigClient from "./RolesConfigClient"

export const dynamic = "force-dynamic"
export const metadata = { title: "Configurare roluri organizationale" }

export default async function RolesConfigPage() {
  const session = await auth()
  if (!session) notFound()

  const { tenantId, role } = session.user
  if (!["OWNER", "COMPANY_ADMIN", "SUPER_ADMIN"].includes(role)) notFound()

  const [users, assignments, purchase] = await Promise.all([
    prisma.user.findMany({
      where: { tenantId, status: "ACTIVE" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        jobTitle: true,
        role: true,
        orgRoles: { select: { id: true, orgRole: true, assignedAt: true } },
      },
      orderBy: { firstName: "asc" },
    }),
    prisma.userOrgRole.findMany({
      where: { tenantId },
      select: { orgRole: true },
      distinct: ["orgRole"],
    }),
    prisma.servicePurchase.findUnique({
      where: { tenantId },
      select: { layer: true },
    }),
  ])

  const assignedRoles = assignments.map((a) => a.orgRole)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Configurare roluri organizationale
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Alocati roluri din departamentul HR persoanelor din echipa. Drepturile
          in platforma se activeaza automat pe baza rolurilor alocate si a
          modulelor cumparate (Layer {purchase?.layer ?? 0}).
        </p>
      </div>

      <RolesConfigClient
        users={users.map((u) => ({
          ...u,
          orgRoles: u.orgRoles.map((r) => ({
            ...r,
            assignedAt: r.assignedAt.toISOString(),
          })),
        }))}
        assignedRoles={assignedRoles}
        currentLayer={purchase?.layer ?? 0}
        currentUserId={session.user.id}
      />
    </div>
  )
}
