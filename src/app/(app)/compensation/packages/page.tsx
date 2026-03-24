import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import PackagesManager from "@/components/compensation/PackagesManager"

export const metadata = { title: "Pachete de compensații" }

export default async function PackagesPage() {
  const session = await auth()
  const tenantId = session!.user.tenantId

  const [packages, jobs] = await Promise.all([
    prisma.compensationPackage.findMany({
      where: { tenantId },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            code: true,
            department: { select: { name: true } },
          },
        },
        _count: { select: { simulations: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.job.findMany({
      where: { tenantId, isActive: true },
      select: {
        id: true,
        title: true,
        code: true,
        department: { select: { name: true } },
      },
      orderBy: { title: "asc" },
    }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pachete de compensații</h1>
        <p className="text-sm text-gray-500 mt-1">
          Definește salariu de bază și componente variabile pentru fiecare post
        </p>
      </div>
      <PackagesManager packages={packages as any} jobs={jobs} />
    </div>
  )
}
