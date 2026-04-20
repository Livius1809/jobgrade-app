import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import { formatDateTime } from "@/lib/utils"
import SessionActions from "@/components/sessions/SessionActions"

export const metadata = { title: "Sesiune de evaluare" }

const SESSION_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Ciornă",
  IN_PROGRESS: "În curs",
  COMPLETED: "Finalizată",
  ARCHIVED: "Arhivată",
}

const CONSENSUS_LABELS: Record<string, string> = {
  PENDING: "În așteptare",
  AUTO_CONSENSUS: "Consens auto",
  RECALIBRATION: "Recalibrare",
  VOTE: "Vot",
  FACILITATOR: "Facilitator",
  RESOLVED: "Rezolvat",
}

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  const { id } = await params
  const tenantId = session!.user.tenantId
  const userId = session!.user.id

  const evalSession = await prisma.evaluationSession.findFirst({
    where: { id, tenantId },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
              jobTitle: true,
            },
          },
        },
      },
      sessionJobs: {
        include: {
          job: {
            select: {
              id: true,
              title: true,
              code: true,
              department: { select: { name: true } },
            },
          },
          assignments: {
            where: { userId },
            select: { id: true, submittedAt: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  })

  if (!evalSession) notFound()

  const myParticipant = evalSession.participants.find(
    (p) => p.userId === userId
  )
  const isParticipant = !!myParticipant
  const completedJobs = evalSession.sessionJobs.filter(
    (sj) => sj.assignments.length > 0 && sj.assignments[0].submittedAt
  ).length
  const totalJobs = evalSession.sessionJobs.length
  const completedParticipants = evalSession.participants.filter(
    (p) => p.completedAt
  ).length
  const totalParticipants = evalSession.participants.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link
              href="/sessions"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Sesiuni
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {evalSession.name}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-sm text-gray-500">
              {formatDateTime(evalSession.createdAt)}
            </span>
            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">
              {SESSION_STATUS_LABELS[evalSession.status]}
            </span>
          </div>
        </div>

        <SessionActions
          sessionId={id}
          status={evalSession.status}
          isParticipant={isParticipant}
          myCompletedAt={myParticipant?.completedAt ?? null}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-sm text-gray-500 mb-1">Posturi evaluate</div>
          <div className="text-2xl font-bold text-gray-900">
            {completedJobs}/{totalJobs}
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full mt-2">
            <div
              className="h-1.5 bg-blue-500 rounded-full"
              style={{
                width: totalJobs > 0 ? `${(completedJobs / totalJobs) * 100}%` : "0%",
              }}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-sm text-gray-500 mb-1">Evaluare finalizată</div>
          <div className="text-2xl font-bold text-gray-900">
            {completedParticipants}/{totalParticipants}
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full mt-2">
            <div
              className="h-1.5 bg-green-500 rounded-full"
              style={{
                width:
                  totalParticipants > 0
                    ? `${(completedParticipants / totalParticipants) * 100}%`
                    : "0%",
              }}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-sm text-gray-500 mb-1">Status consens</div>
          <div className="text-sm font-medium text-gray-900 mt-2">
            {0}{" "}
            / {totalJobs} posturi rezolvate
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Jobs list */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Posturi în sesiune</h2>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                  Job
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                  Consens
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                  Evaluarea mea
                </th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {evalSession.sessionJobs.map((sj) => {
                const myAssignment = sj.assignments[0]
                const submitted = myAssignment?.submittedAt

                return (
                  <tr
                    key={sj.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 text-sm">
                        {sj.job.title}
                      </div>
                      <div className="text-xs text-gray-400">
                        {sj.job.department?.name ?? "—"}
                        {sj.job.code ? ` · ${sj.job.code}` : ""}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-gray-600">—</span>
                    </td>
                    <td className="px-6 py-4">
                      {submitted ? (
                        <span className="text-xs text-green-600 font-medium">
                          ✓ Trimis
                        </span>
                      ) : myAssignment ? (
                        <span className="text-xs text-yellow-600 font-medium">
                          ✏️ Ciornă
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">
                          Neevaluat
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isParticipant && evalSession.status === "IN_PROGRESS" && (
                        <Link
                          href={`/sessions/${id}/evaluate/${sj.id}`}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          {submitted ? "Vizualizează" : "Evaluează →"}
                        </Link>
                      )}
                      {(evalSession.status === "COMPLETED" ||
                        session!.user.role === "COMPANY_ADMIN" ||
                        session!.user.role === "OWNER") && (
                        <Link
                          href={`/sessions/${id}/consensus/${sj.id}`}
                          className="text-sm text-purple-600 hover:underline ml-3"
                        >
                          Consens
                        </Link>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Participants */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Evaluatori</h2>
          <div className="space-y-3">
            {evalSession.participants.map((p) => (
              <div key={p.id} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                  {p.user.firstName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">
                    {p.user.firstName} {p.user.lastName}
                  </div>
                  <div className="text-xs text-gray-500">
                    {p.user.jobTitle ?? p.user.role}
                  </div>
                </div>
                <span>
                  {p.completedAt ? (
                    <span className="text-green-500 text-sm">✓</span>
                  ) : (
                    <span className="text-gray-300 text-sm">⏳</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
