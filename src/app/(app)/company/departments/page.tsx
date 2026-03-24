import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import DepartmentsManager from "@/components/company/DepartmentsManager"

export const metadata = { title: "Departamente" }

export default async function DepartmentsPage() {
  const session = await auth()
  const tenantId = session!.user.tenantId

  const departments = await prisma.department.findMany({
    where: { tenantId },
    include: {
      _count: { select: { jobs: true, users: true } },
    },
    orderBy: { name: "asc" },
  })

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Departamente</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gestionează departamentele companiei
        </p>
      </div>
      <DepartmentsManager departments={departments} />
    </div>
  )
}
