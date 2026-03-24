import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import KpisManager from "@/components/compensation/KpisManager"

export const metadata = { title: "KPI-uri posturi" }

export default async function KpisPage() {
  const session = await auth()
  const tenantId = session!.user.tenantId

  const [jobs, kpis] = await Promise.all([
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
    prisma.kpiDefinition.findMany({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
    }),
  ])

  // Group KPIs by jobId
  const kpisByJob = kpis.reduce<Record<string, typeof kpis>>((acc, kpi) => {
    if (!acc[kpi.jobId]) acc[kpi.jobId] = []
    acc[kpi.jobId].push(kpi)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">KPI-uri posturi</h1>
        <p className="text-sm text-gray-500 mt-1">
          Definește indicatorii de performanță pentru fiecare post
        </p>
      </div>
      <KpisManager jobs={jobs} kpisByJob={kpisByJob} />
    </div>
  )
}
