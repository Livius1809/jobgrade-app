import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import EmployeeImportClient from "./EmployeeImportClient"

export const metadata = { title: "Angajați & Salarii — Pay Gap" }

export default async function PayGapEmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>
}) {
  const session = await auth()
  const tenantId = session!.user.tenantId
  const { year: yearParam } = await searchParams
  const year = parseInt(yearParam ?? String(new Date().getFullYear()))

  const [records, salaryGrades] = await Promise.all([
    prisma.employeeSalaryRecord.findMany({
      where: { tenantId, periodYear: year },
      include: { salaryGrade: { select: { name: true } } },
      orderBy: { employeeCode: "asc" },
    }),
    prisma.salaryGrade.findMany({
      where: { tenantId },
      orderBy: { order: "asc" },
      select: { id: true, name: true },
    }),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Angajați &amp; Salarii</h1>
          <p className="text-sm text-gray-500 mt-1">
            Înregistrări salariale pentru calculul indicatorilor Art. 9
          </p>
        </div>
        <a
          href="/pay-gap"
          className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          ← Dashboard Pay Gap
        </a>
      </div>

      <EmployeeImportClient
        year={year}
        records={records.map((r) => ({
          ...r,
          salaryGradeName: r.salaryGrade?.name ?? null,
        }))}
        salaryGrades={salaryGrades}
      />
    </div>
  )
}
