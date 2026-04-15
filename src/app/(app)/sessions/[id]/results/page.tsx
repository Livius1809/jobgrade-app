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

  const jobsData = sessionJobs.map(sj => {
    // Get the latest evaluation per criterion (from any assignment)
    const selectedSubfactors: Record<string, string> = {}
    for (const assignment of sj.assignments) {
      for (const ev of assignment.evaluations) {
        selectedSubfactors[ev.criterionId] = ev.subfactorId
      }
    }

    return {
      jobId: sj.job.id,
      jobTitle: sj.job.title,
      department: sj.job.department?.name || "",
      selectedSubfactors,
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
        <p className="text-sm text-slate-500 mt-1">
          Scor final = suma punctajelor subfactorilor selectați pe cele 6 criterii.
          {isOwnerOrAdmin && " Puteți ajusta nivelul per criteriu și valida raportul final."}
        </p>
      </div>

      {jobsData.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 text-center py-12">
          <p className="text-slate-400">Nicio evaluare completată în această sesiune.</p>
        </div>
      ) : (
        <JEResultsTable
          criteria={criteriaData}
          jobs={jobsData}
          sessionId={id}
          canEdit={isOwnerOrAdmin}
        />
      )}
    </div>
  )
}
