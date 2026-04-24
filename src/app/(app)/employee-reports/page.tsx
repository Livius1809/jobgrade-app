import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import EmployeeReportsClient from "./EmployeeReportsClient"

export const dynamic = "force-dynamic"

export default async function EmployeeReportsPage() {
  const session = await auth()
  if (!session) redirect("/auth/signin")

  const { tenantId, role } = session.user
  if (!["COMPANY_ADMIN", "OWNER", "SUPER_ADMIN", "FACILITATOR"].includes(role)) {
    redirect("/portal")
  }

  const reports = await prisma.employeeContinuousReport.findMany({
    where: { tenantId },
    include: {
      sections: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          module: true,
          title: true,
          order: true,
          version: true,
          updatedAt: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  })

  // Statistici agregate
  const totalSections = reports.reduce((sum, r) => sum + r.sections.length, 0)
  const activeCount = reports.filter((r) => r.status === "ACTIVE").length
  const visibleCount = reports.filter((r) => r.visibleToEmployee).length

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rapoarte angajati</h1>
          <p className="text-sm text-gray-500 mt-1">
            Document viu transversal — creste cu fiecare modul achizitionat
          </p>
        </div>
        <div className="flex gap-4 text-center">
          <div>
            <p className="text-xl font-bold text-indigo-700">{reports.length}</p>
            <p className="text-xs text-gray-500">rapoarte</p>
          </div>
          <div>
            <p className="text-xl font-bold text-green-600">{activeCount}</p>
            <p className="text-xs text-gray-500">active</p>
          </div>
          <div>
            <p className="text-xl font-bold text-emerald-600">{totalSections}</p>
            <p className="text-xs text-gray-500">sectiuni</p>
          </div>
          <div>
            <p className="text-xl font-bold text-amber-600">{visibleCount}</p>
            <p className="text-xs text-gray-500">vizibile angajat</p>
          </div>
        </div>
      </div>

      <EmployeeReportsClient
        initialReports={JSON.parse(JSON.stringify(reports))}
        canCreate={["COMPANY_ADMIN", "OWNER", "SUPER_ADMIN"].includes(role)}
      />
    </div>
  )
}
