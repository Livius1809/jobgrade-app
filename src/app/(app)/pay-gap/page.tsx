import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { calculatePayGapIndicators } from "@/lib/pay-gap"
import Link from "next/link"
import PayGapDashboardClient from "./PayGapDashboardClient"

export const metadata = { title: "Pay Gap Analytics — Art. 9 EU 2023/970" }

export default async function PayGapPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>
}) {
  const session = await auth()
  const tenantId = session!.user.tenantId
  const { year: yearParam } = await searchParams
  const year = parseInt(yearParam ?? String(new Date().getFullYear()))

  const [records, assessments, existingReport] = await Promise.all([
    prisma.employeeSalaryRecord.findMany({
      where: { tenantId, periodYear: year },
      select: {
        gender: true,
        baseSalary: true,
        variableComp: true,
        department: true,
        jobCategory: true,
        salaryGradeId: true,
        salaryGrade: { select: { name: true } },
      },
    }),
    prisma.jointPayAssessment.findMany({
      where: { tenantId, status: { in: ["OPEN", "IN_PROGRESS"] } },
      orderBy: { triggeredAt: "desc" },
      take: 3,
    }),
    prisma.payGapReport.findUnique({
      where: { tenantId_reportYear: { tenantId, reportYear: year } },
    }),
  ])

  const indicators = records.length > 0 ? calculatePayGapIndicators(records) : null

  // Available years from data
  const yearGroups = await prisma.employeeSalaryRecord.groupBy({
    by: ["periodYear"],
    where: { tenantId },
    orderBy: { periodYear: "desc" },
  })
  const availableYears = yearGroups.map((g) => g.periodYear)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pay Gap Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">
            Indicatori Art. 9 — Directiva EU 2023/970 privind transparența salarială
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/pay-gap/employees"
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Angajați &amp; Salarii
          </Link>
          <Link
            href="/pay-gap/assessments"
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Evaluări comune
            {assessments.length > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                {assessments.length}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Active JointPayAssessment alert */}
      {assessments.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-red-500 text-xl mt-0.5">⚠️</span>
            <div>
              <p className="text-sm font-semibold text-red-800">
                {assessments.length} evaluare comună deschisă (Art. 10)
              </p>
              <p className="text-sm text-red-600 mt-0.5">
                Diferența salarială depășește pragul de 5%. Este obligatorie inițierea unui proces
                de evaluare comună cu reprezentanții angajaților.
              </p>
              <Link
                href="/pay-gap/assessments"
                className="text-sm text-red-700 font-medium underline mt-1 inline-block"
              >
                Vezi evaluările →
              </Link>
            </div>
          </div>
        </div>
      )}

      <PayGapDashboardClient
        year={year}
        availableYears={availableYears}
        indicators={indicators}
        employeeCount={records.length}
        reportStatus={existingReport?.status ?? null}
        reportId={existingReport?.id ?? null}
      />
    </div>
  )
}
