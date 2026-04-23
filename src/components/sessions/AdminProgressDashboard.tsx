"use client"

import { useState, useEffect } from "react"

interface MemberProgress {
  userId: string
  firstName: string
  lastName: string
  email: string
  jobTitle: string | null
  lastLogin: string | null
  completedAt: string | null
  hasStarted: boolean
  totalJobs: number
  submittedJobs: number
  percent: number
  status: "completed" | "ready" | "in_progress" | "started" | "not_started"
  validation: { total: number; accepted: number } | null
}

interface ProgressData {
  session: {
    id: string
    name: string
    status: string
    deadline: string | null
    daysLeft: number | null
  }
  members: MemberProgress[]
  totals: {
    totalMembers: number
    completed: number
    inProgress: number
    notStarted: number
  }
}

const STATUS_CONFIG = {
  completed: { label: "Finalizat", color: "bg-green-100 text-green-700", dot: "bg-green-500" },
  ready: { label: "Gata de trimitere", color: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  in_progress: { label: "În lucru", color: "bg-yellow-100 text-yellow-700", dot: "bg-yellow-500" },
  started: { label: "Început", color: "bg-orange-100 text-orange-700", dot: "bg-orange-500" },
  not_started: { label: "Neînceput", color: "bg-gray-100 text-gray-500", dot: "bg-gray-400" },
}

interface Props {
  sessionId: string
}

export default function AdminProgressDashboard({ sessionId }: Props) {
  const [data, setData] = useState<ProgressData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/v1/sessions/${sessionId}/admin-progress`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [sessionId])

  // Poll every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      fetch(`/api/v1/sessions/${sessionId}/admin-progress`)
        .then((r) => r.json())
        .then(setData)
        .catch(() => {})
    }, 30000)
    return () => clearInterval(interval)
  }, [sessionId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!data) return null

  const { session, members, totals } = data

  return (
    <div className="space-y-4">
      {/* Deadline alert */}
      {session.deadline && session.daysLeft !== null && (
        <div
          className={`rounded-lg p-3 text-sm ${
            session.daysLeft <= 1
              ? "bg-red-50 border border-red-200 text-red-700"
              : session.daysLeft <= 3
              ? "bg-amber-50 border border-amber-200 text-amber-700"
              : "bg-blue-50 border border-blue-200 text-blue-700"
          }`}
        >
          Termen: {new Date(session.deadline).toLocaleDateString("ro-RO")} —{" "}
          {session.daysLeft <= 0
            ? "Termen depășit"
            : `${session.daysLeft} ${session.daysLeft === 1 ? "zi" : "zile"} rămase`}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-green-50 rounded-lg border border-green-200 p-3 text-center">
          <div className="text-xl font-bold text-green-700">{totals.completed}</div>
          <div className="text-xs text-green-600">Finalizat</div>
        </div>
        <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-3 text-center">
          <div className="text-xl font-bold text-yellow-700">{totals.inProgress}</div>
          <div className="text-xs text-yellow-600">În lucru</div>
        </div>
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 text-center">
          <div className="text-xl font-bold text-gray-600">{totals.notStarted}</div>
          <div className="text-xs text-gray-500">Neînceput</div>
        </div>
      </div>

      {/* Per-member table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-2.5 text-gray-600 font-medium">Membru</th>
              <th className="text-center px-3 py-2.5 text-gray-600 font-medium">Progres</th>
              <th className="text-center px-3 py-2.5 text-gray-600 font-medium">Status</th>
              <th className="text-center px-3 py-2.5 text-gray-600 font-medium">Validare</th>
              <th className="text-right px-4 py-2.5 text-gray-600 font-medium">Ultima activitate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {members.map((m) => {
              const cfg = STATUS_CONFIG[m.status]
              return (
                <tr key={m.userId}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {m.firstName} {m.lastName}
                    </div>
                    <div className="text-xs text-gray-500">
                      {m.jobTitle || m.email}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            m.percent === 100 ? "bg-green-500" : "bg-blue-500"
                          }`}
                          style={{ width: `${m.percent}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-12 text-right">
                        {m.submittedJobs}/{m.totalJobs}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${cfg.color}`}>
                      {cfg.label}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    {m.validation ? (
                      <span className="text-xs text-gray-600">
                        {m.validation.accepted}/{m.validation.total}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-xs text-gray-400">
                      {m.lastLogin
                        ? new Date(m.lastLogin).toLocaleDateString("ro-RO")
                        : "Niciodată"}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
