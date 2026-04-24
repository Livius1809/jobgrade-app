import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import EmployeePortalClient from "./EmployeePortalClient"

export const dynamic = "force-dynamic"
export const metadata = { title: "Portal Angajati — Cereri Art. 5-7" }

export default async function EmployeePortalPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const session = await auth()
  const tenantId = session!.user.tenantId
  const { status } = await searchParams

  // Mark overdue before fetching
  await prisma.employeeRequest.updateMany({
    where: {
      tenantId,
      status: { in: ["PENDING", "IN_REVIEW"] },
      dueDate: { lt: new Date() },
    },
    data: { status: "OVERDUE" },
  })

  const [requests, salaryGrades, company] = await Promise.all([
    prisma.employeeRequest.findMany({
      where: {
        tenantId,
        ...(status ? { status: status as never } : {}),
      },
      include: { salaryGrade: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.salaryGrade.findMany({
      where: { tenantId },
      orderBy: { order: "asc" },
      select: { id: true, name: true },
    }),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true, name: true },
    }),
  ])

  const counts = {
    all: requests.length,
    PENDING: requests.filter((r) => r.status === "PENDING").length,
    IN_REVIEW: requests.filter((r) => r.status === "IN_REVIEW").length,
    OVERDUE: requests.filter((r) => r.status === "OVERDUE").length,
    RESPONDED: requests.filter((r) => r.status === "RESPONDED").length,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Portal Angajați — Art. 7</h1>
          <p className="text-sm text-gray-500 mt-1">
            Cereri de transparență salarială conform Art. 7 Directiva EU 2023/970
          </p>
        </div>
        <div className="text-right space-y-1">
          <p className="text-xs text-gray-500">Link-uri publice angajati:</p>
          <div className="flex flex-col items-end gap-1">
            <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700">
              /portal/{company?.slug} (Art. 7 — cerere info)
            </code>
            <code className="text-xs bg-violet-100 px-2 py-1 rounded text-violet-700">
              /portal/{company?.slug}/posturi (Art. 5 — posturi cu salary bands)
            </code>
          </div>
        </div>
      </div>

      {counts.OVERDUE > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-red-500 text-xl">⏰</span>
          <div>
            <p className="text-sm font-semibold text-red-800">
              {counts.OVERDUE} cerere{counts.OVERDUE > 1 ? "i" : ""} depășit{counts.OVERDUE > 1 ? "e" : ""} termenul legal
            </p>
            <p className="text-sm text-red-600">
              Art. 7.4 obligă răspuns în 2 luni. Răspundeți urgent pentru conformitate.
            </p>
          </div>
        </div>
      )}

      <EmployeePortalClient
        requests={requests.map((r) => ({
          ...r,
          dueDate: r.dueDate.toISOString(),
          createdAt: r.createdAt.toISOString(),
          respondedAt: r.respondedAt?.toISOString() ?? null,
          salaryGradeName: r.salaryGrade?.name ?? null,
        }))}
        salaryGrades={salaryGrades}
        counts={counts}
        currentStatus={status ?? ""}
        canRespond={["COMPANY_ADMIN", "OWNER", "SUPER_ADMIN"].includes(session!.user.role)}
      />
    </div>
  )
}
