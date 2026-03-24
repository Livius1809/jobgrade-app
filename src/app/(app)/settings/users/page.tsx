import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import UsersManager from "@/components/settings/UsersManager"

export const metadata = { title: "Utilizatori" }

export default async function UsersPage() {
  const session = await auth()
  const tenantId = session!.user.tenantId

  const users = await prisma.user.findMany({
    where: { tenantId },
    include: {
      department: { select: { name: true } },
    },
    orderBy: [{ role: "asc" }, { firstName: "asc" }],
  })

  const departments = await prisma.department.findMany({
    where: { tenantId, isActive: true },
    orderBy: { name: "asc" },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Utilizatori</h1>
          <p className="text-sm text-gray-500 mt-1">
            {users.length} utilizatori în cont
          </p>
        </div>
      </div>
      <UsersManager users={users} departments={departments} />
    </div>
  )
}
