import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { formatDateTime } from "@/lib/utils"
import ExportButtons from "@/components/reports/ExportButtons"

export const metadata = { title: "Rapoarte" }

export default async function ReportsPage() {
  const session = await auth()
  const tenantId = session!.user.tenantId

  const [completedSessions, reports] = await Promise.all([
    prisma.evaluationSession.findMany({
      where: { tenantId, status: "COMPLETED" },
      include: {
        _count: { select: { jobResults: true, sessionJobs: true } },
      },
      orderBy: { completedAt: "desc" },
    }),
    prisma.report.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rapoarte</h1>
          <p className="text-sm text-gray-500 mt-1">
            Generează și descarcă rapoarte din sesiunile finalizate
          </p>
        </div>
        <Link
          href="/reports/master"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
        >
          📖 Raport Master
        </Link>
      </div>

      {/* Sesiuni disponibile */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">
            Sesiuni finalizate ({completedSessions.length})
          </h2>
        </div>

        {completedSessions.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            Nicio sesiune finalizată.{" "}
            <Link href="/sessions" className="text-blue-600 hover:underline">
              Vezi sesiunile active
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                  Sesiune
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                  Joburi evaluate
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                  Finalizat
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                  Acțiuni
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {completedSessions.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link
                      href={`/sessions/${s.id}/results`}
                      className="font-medium text-gray-900 hover:text-blue-600 text-sm"
                    >
                      {s.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {s._count.sessionJobs} joburi
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {s.completedAt ? formatDateTime(s.completedAt) : "—"}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-2">
                      <Link
                        href={`/sessions/${s.id}/results`}
                        className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap"
                      >
                        Vezi ierarhia
                      </Link>
                      <ExportButtons sessionId={s.id} sessionName={s.name} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Rapoarte generate */}
      {reports.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Rapoarte generate</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {reports.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-6 py-3">
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {r.type} — {r.format}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {formatDateTime(r.createdAt)}
                  </div>
                </div>
                {r.filePath && (
                  <a
                    href={r.filePath}
                    className="text-sm text-blue-600 hover:underline"
                    download
                  >
                    Descarcă
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
