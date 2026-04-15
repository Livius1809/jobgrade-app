import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import JEResultsTable from "@/components/sessions/JEResultsTable"

export const dynamic = "force-dynamic"
export const metadata = { title: "Rezultate evaluare — JobGrade" }

export default async function SessionResultsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  const { id } = await params
  const tenantId = session!.user.tenantId
  const isOwnerOrAdmin = ["OWNER", "SUPER_ADMIN", "COMPANY_ADMIN"].includes(session!.user.role)

  const evalSession = await prisma.evaluationSession.findFirst({
    where: { id, tenantId },
  })
  if (!evalSession) notFound()

  // Get criteria with subfactors
  const criteria = await prisma.criterion.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
    include: {
      subfactors: {
        orderBy: { order: "asc" },
      },
    },
  })

  // Get session jobs with evaluations
  const sessionJobs = await prisma.sessionJob.findMany({
    where: { sessionId: id },
    include: {
      job: {
        select: {
          id: true,
          title: true,
          department: { select: { name: true } },
        },
      },
      assignments: {
        include: {
          evaluations: {
            select: {
              criterionId: true,
              subfactorId: true,
            },
          },
        },
      },
    },
  })

  // Transform data for component
  const criteriaData = criteria.map(c => ({
    id: c.id,
    name: c.name,
    shortName: c.name,
    order: c.order,
    subfactors: c.subfactors.map(sf => ({
      id: sf.id,
      code: sf.code || String.fromCharCode(65 + sf.order - 1), // A, B, C...
      points: sf.points,
      description: sf.description || "",
    })),
  }))

  // Salary grades for this session
  const salaryGrades = await prisma.salaryGrade.findMany({
    where: { sessionId: id },
    orderBy: { order: "asc" },
    include: {
      steps: {
        orderBy: { step: "asc" },
      },
    },
  })

  const gradesData = salaryGrades.map(g => ({
    name: g.name,
    scoreMin: g.scoreMin,
    scoreMax: g.scoreMax,
    salaryMin: g.salaryMin ?? 0,
    salaryMax: g.salaryMax ?? 0,
    steps: g.steps.map(s => ({
      step: s.step,
      name: s.name,
      salary: Number(s.salary),
      criteria: s.criteria,
    })),
  }))

  // Real salaries from PayrollEntry (H8 only) — cu nume pentru raport nominal
  const payrollEntries = await (prisma as any).payrollEntry.findMany({
    where: { tenantId, workSchedule: "H8" },
    select: { jobTitle: true, baseSalary: true, jobCode: true },
  }).catch(() => [])

  // Benchmarks
  const benchmarks = await (prisma as any).salaryBenchmark.findMany({
    where: { isActive: true },
    select: { jobTitle: true, salaryP25: true, salaryMedian: true, salaryP75: true },
  }).catch(() => [])

  const jobsData = sessionJobs.map(sj => {
    const selectedSubfactors: Record<string, string> = {}
    for (const assignment of sj.assignments) {
      for (const ev of assignment.evaluations) {
        selectedSubfactors[ev.criterionId] = ev.subfactorId
      }
    }

    // Average real salary for this job title
    const salaries = (payrollEntries as any[])
      .filter((p: any) => p.jobTitle === sj.job.title)
      .map((p: any) => Number(p.baseSalary))
    const avgSalary = salaries.length > 0
      ? Math.round(salaries.reduce((s: number, v: number) => s + v, 0) / salaries.length)
      : undefined

    // Benchmark for this job
    const bm = (benchmarks as any[]).find((b: any) => b.jobTitle === sj.job.title)
    const benchmark = bm ? {
      p25: Number(bm.salaryP25),
      median: Number(bm.salaryMedian),
      p75: Number(bm.salaryP75),
    } : undefined

    // Employees nominali per post (pentru raportul detaliat)
    const employeesForJob = (payrollEntries as any[])
      .filter((p: any) => p.jobTitle === sj.job.title)
      .map((p: any) => ({
        name: `Marca ${p.jobCode}`,
        salary: Number(p.baseSalary),
      }))

    return {
      jobId: sj.job.id,
      jobTitle: sj.job.title,
      department: sj.job.department?.name || "",
      selectedSubfactors,
      avgSalary,
      benchmark,
      employees: employeesForJob,
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-1">
        <Link href={`/sessions/${id}`} className="text-sm text-slate-500 hover:text-slate-700">
          ← Sesiune
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Rezultate: {evalSession.name}
        </h1>
        {isOwnerOrAdmin && (
          <p className="text-sm text-slate-500 mt-1">
            Puteți ajusta nivelul per criteriu și valida raportul final.
          </p>
        )}
      </div>

      {jobsData.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 text-center py-12">
          <p className="text-slate-400">Nicio evaluare completată în această sesiune.</p>
        </div>
      ) : (
        <JEResultsTable
          criteria={criteriaData}
          jobs={jobsData}
          grades={gradesData}
          sessionId={id}
          canEdit={isOwnerOrAdmin}
        />
      )}
    </div>
  )
}
