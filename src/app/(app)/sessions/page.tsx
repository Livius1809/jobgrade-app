import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { formatDateTime } from "@/lib/utils"
import { SessionStatus } from "@/generated/prisma"

export const metadata = { title: "Sesiuni de evaluare" }

const STATUS_LABELS: Record<SessionStatus, string> = {
  DRAFT: "Ciornă",
  BENCHMARK_SELECTION: "Selectare benchmark",
  PRE_SCORING: "Pre-scorare individuală",
  IN_PROGRESS: "În curs",
  RECALIBRATION: "Recalibrare",
  VOTING: "Vot",
  FACILITATION: "Facilitator",
  SLOTTING: "Clasificare posturi",
  OWNER_VALIDATION: "Validare Owner",
  COMPLETED: "Finalizată",
  VALIDATED: "Validată",
}

const STATUS_STYLES: Record<SessionStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  BENCHMARK_SELECTION: "bg-blue-100 text-blue-700",
  PRE_SCORING: "bg-indigo-100 text-indigo-700",
  IN_PROGRESS: "bg-yellow-100 text-yellow-700",
  RECALIBRATION: "bg-orange-100 text-orange-700",
  VOTING: "bg-purple-100 text-purple-700",
  FACILITATION: "bg-red-100 text-red-700",
  SLOTTING: "bg-cyan-100 text-cyan-700",
  OWNER_VALIDATION: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-green-100 text-green-700",
  VALIDATED: "bg-emerald-100 text-emerald-800",
}

export default async function SessionsPage() {
  const session = await auth()
  const tenantId = session!.user.tenantId

  const sessions = await prisma.evaluationSession.findMany({
    where: { tenantId },
    include: {
      participants: {
        select: { id: true, completedAt: true },
      },
      _count: { select: { sessionJobs: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Sesiuni de evaluare
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {sessions.length} sesiuni în total
          </p>
        </div>
        <Link
          href="/sessions/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + Sesiune nouă
        </Link>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-16">
          <p className="text-gray-400 text-lg mb-2">Nicio sesiune de evaluare</p>
          <p className="text-gray-400 text-sm mb-6">
            Creează prima sesiune pentru a începe evaluarea posturilor
          </p>
          <Link
            href="/sessions/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + Sesiune nouă
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {sessions.map((s) => {
            const completed = s.participants.filter(
              (p) => p.completedAt
            ).length
            const total = s.participants.length
            const progress = total > 0 ? (completed / total) * 100 : 0

            return (
              <Link
                key={s.id}
                href={`/sessions/${s.id}`}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h2 className="font-semibold text-gray-900">{s.name}</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {s._count.sessionJobs} posturi · {total} evaluatori
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[s.status]}`}
                  >
                    {STATUS_LABELS[s.status]}
                  </span>
                </div>

                {total > 0 && (
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Progres evaluatori</span>
                      <span>
                        {completed}/{total}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-200 rounded-full">
                      <div
                        className="h-1.5 bg-blue-500 rounded-full"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="text-xs text-gray-400 mt-3">
                  {formatDateTime(s.createdAt)}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
