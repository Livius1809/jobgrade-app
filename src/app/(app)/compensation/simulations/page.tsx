import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import SimulationsManager from "@/components/compensation/SimulationsManager"

export const metadata = { title: "Simulări salarii" }

export default async function SimulationsPage() {
  const session = await auth()
  const tenantId = session!.user.tenantId

  const [packages, simulations] = await Promise.all([
    prisma.compensationPackage.findMany({
      where: { tenantId },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            code: true,
            kpiDefinitions: {
              select: {
                id: true,
                name: true,
                weight: true,
                targetValue: true,
                measurementUnit: true,
                frequency: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.simulationScenario.findMany({
      where: { tenantId },
      include: {
        job: { select: { title: true, code: true } },
        package: { select: { baseSalary: true, currency: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Simulări salarii</h1>
        <p className="text-sm text-gray-500 mt-1">
          Simulează compensația pentru 3 niveluri de performanță (inferior, target, superior)
        </p>
      </div>
      <SimulationsManager packages={packages} simulations={simulations} />
    </div>
  )
}
