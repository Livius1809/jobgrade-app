import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import { formatDateTime } from "@/lib/utils"

export const metadata = { title: "Rezultate sesiune" }

export default async function SessionResultsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  const { id } = await params
  const tenantId = session!.user.tenantId

  const evalSession = await prisma.evaluationSession.findFirst({
    where: { id, tenantId },
    include: {
      jobResults: {
        include: {
          job: {
            select: {
              id: true,
              title: true,
              code: true,
              department: { select: { name: true } },
            },
          },
          salaryGrade: true,
        },
        orderBy: { rank: "asc" },
      },
    },
  })

  if (!evalSession) notFound()

  // Obțin scorurile per criteriu pentru fiecare job
  const sessionJobs = await prisma.sessionJob.findMany({
    where: { sessionId: id },
    include: {
      job: { select: { id: true, title: true, code: true, department: { select: { name: true } } } },
      assignments: {
        include: {
          evaluations: {
            include: {
              criterion: { select: { name: true, order: true } },
              subfactor: { select: { code: true, points: true } },
            },
          },
        },
      },
    },
  })

  // Calculează scorul mediu per job per criteriu (din evaluările trimise)
  const jobScores: Record<
    string,
    {
      criterionScores: Record<string, number[]>
      totalAvg: number
    }
  > = {}

  for (const sj of sessionJobs) {
    const criterionScores: Record<string, number[]> = {}

    for (const assignment of sj.assignments) {
      if (!assignment.submittedAt) continue
      for (const ev of assignment.evaluations) {
        if (!criterionScores[ev.criterion.name]) {
          criterionScores[ev.criterion.name] = []
        }
        criterionScores[ev.criterion.name].push(ev.subfactor.points)
      }
    }

    const allPoints = Object.values(criterionScores).flatMap((pts) => pts)
    const totalAvg =
      allPoints.length > 0
        ? allPoints.reduce((s, p) => s + p, 0) / allPoints.length
        : 0

    jobScores[sj.job.id] = { criterionScores, totalAvg }
  }

  // Sortează joburile după scorul mediu total
  const sortedJobs = sessionJobs
    .map((sj) => ({
      ...sj,
      avgScore: jobScores[sj.job.id]?.totalAvg ?? 0,
    }))
    .sort((a, b) => b.avgScore - a.avgScore)

  const maxScore = Math.max(...sortedJobs.map((j) => j.avgScore), 1)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href={`/sessions/${id}`}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Sesiune
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Rezultate: {evalSession.name}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Ierarhia joburilor bazată pe evaluările colectate
          </p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Export Excel
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            Export PDF
          </button>
        </div>
      </div>

      {sortedJobs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-12">
          <p className="text-gray-400">
            Nicio evaluare completată în această sesiune.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase w-10">
                  Rang
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                  Job / Departament
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                  Scor mediu
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                  Vizualizare
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                  Clasă salarială
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedJobs.map((sj, index) => {
                const result = evalSession.jobResults.find(
                  (r) => r.job.id === sj.job.id
                )
                const barWidth = maxScore > 0
                  ? `${(sj.avgScore / maxScore) * 100}%`
                  : "0%"

                return (
                  <tr key={sj.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0
                            ? "bg-yellow-100 text-yellow-700"
                            : index === 1
                            ? "bg-gray-200 text-gray-700"
                            : index === 2
                            ? "bg-orange-100 text-orange-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {index + 1}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 text-sm">
                        {sj.job.title}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {sj.job.department?.name ?? "—"}
                        {sj.job.code ? ` · ${sj.job.code}` : ""}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full max-w-24">
                          <div
                            className="h-2 bg-blue-500 rounded-full"
                            style={{ width: barWidth }}
                          />
                        </div>
                        <span className="text-sm font-bold text-gray-900">
                          {Math.round(sj.avgScore)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/sessions/${id}/consensus/${sj.id}`}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Consens →
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {result?.salaryGrade?.name ?? (
                        <span className="text-gray-400 text-xs">
                          Neasignat
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
