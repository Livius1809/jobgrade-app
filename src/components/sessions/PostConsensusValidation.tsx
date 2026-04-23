"use client"

import { useState, useEffect, useCallback } from "react"

interface CriterionComparison {
  criterionId: string
  criterionName: string
  criterionOrder: number
  preScore: string | null
  consensus: string | null
  changed: boolean
  accepted: boolean
  acceptedAt: string | null
}

interface JobValidation {
  sessionJobId: string
  jobId: string
  jobTitle: string
  department: string | null
  criteria: CriterionComparison[]
  totalChanged: number
  totalAccepted: number
  allAccepted: boolean
}

interface ValidationData {
  sessionId: string
  userId: string
  sessionStatus: string
  jobs: JobValidation[]
  userFullyValidated: boolean
}

interface Props {
  sessionId: string
}

export default function PostConsensusValidation({ sessionId }: Props) {
  const [data, setData] = useState<ValidationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState<string | null>(null)
  const [expandedJob, setExpandedJob] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/sessions/${sessionId}/post-consensus`)
      if (!res.ok) throw new Error("Eroare")
      const json = await res.json()
      setData(json)
      // Auto-expand first job with changes
      if (!expandedJob) {
        const firstWithChanges = json.jobs.find((j: JobValidation) => j.totalChanged > 0 && !j.allAccepted)
        if (firstWithChanges) setExpandedJob(firstWithChanges.jobId)
      }
    } catch {
      setError("Nu s-au putut încărca datele de validare.")
    } finally {
      setLoading(false)
    }
  }, [sessionId, expandedJob])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleAccept(jobId: string, criterionId: string, preScore: string, consensus: string) {
    setAccepting(`${jobId}-${criterionId}`)
    try {
      const res = await fetch(`/api/v1/sessions/${sessionId}/post-consensus`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, criterionId, preScore, consensus }),
      })
      if (res.ok) {
        await fetchData()
      }
    } catch {
      setError("Eroare la acceptare.")
    } finally {
      setAccepting(null)
    }
  }

  async function handleAcceptAll(jobId: string) {
    setAccepting(`all-${jobId}`)
    try {
      const res = await fetch(`/api/v1/sessions/${sessionId}/post-consensus`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, acceptAll: true }),
      })
      if (res.ok) {
        await fetchData()
      }
    } catch {
      setError("Eroare la acceptare.")
    } finally {
      setAccepting(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
        {error}
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-4">
      {/* Summary */}
      {data.userFullyValidated ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
          <div className="text-lg font-bold text-green-700">
            Validare completă
          </div>
          <div className="text-sm text-green-600 mt-1">
            Ați validat toate criteriile modificate. Procesul de validare individuală este finalizat.
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="text-sm text-amber-800">
            Verificați criteriile unde consensul diferă de scorarea dumneavoastră inițială.
            Acceptarea confirmă că ați luat la cunoștință rezultatul procesului de consens.
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Per-job validation */}
      <div className="space-y-3">
        {data.jobs.map((job) => {
          const isExpanded = expandedJob === job.jobId
          const changedCriteria = job.criteria.filter((c) => c.changed)
          const unchangedCriteria = job.criteria.filter((c) => !c.changed)

          return (
            <div
              key={job.jobId}
              className={`bg-white rounded-xl border overflow-hidden ${
                job.allAccepted
                  ? "border-green-200"
                  : job.totalChanged > 0
                  ? "border-amber-200"
                  : "border-gray-200"
              }`}
            >
              {/* Job header */}
              <button
                className="w-full px-5 py-4 flex items-center justify-between text-left"
                onClick={() => setExpandedJob(isExpanded ? null : job.jobId)}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                      job.allAccepted
                        ? "bg-green-100 text-green-700"
                        : job.totalChanged > 0
                        ? "bg-amber-100 text-amber-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {job.allAccepted ? "✓" : job.totalChanged}
                  </span>
                  <div>
                    <div className="font-medium text-gray-900">{job.jobTitle}</div>
                    <div className="text-xs text-gray-500">{job.department ?? "—"}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {job.totalChanged > 0 && (
                    <span className="text-xs text-gray-500">
                      {job.totalAccepted}/{job.totalChanged} acceptate
                    </span>
                  )}
                  {job.totalChanged === 0 && (
                    <span className="text-xs text-green-600">Nicio diferență</span>
                  )}
                  <span className="text-gray-400">{isExpanded ? "▲" : "▼"}</span>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-gray-100">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-5 py-2 text-gray-600 font-medium">
                          Criteriu
                        </th>
                        <th className="text-center px-3 py-2 text-gray-600 font-medium w-24">
                          Scorarea mea
                        </th>
                        <th className="text-center px-3 py-2 text-gray-600 font-medium w-24">
                          Consens
                        </th>
                        <th className="text-center px-3 py-2 text-gray-600 font-medium w-32">
                          Acțiune
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Changed criteria first */}
                      {changedCriteria.map((crit) => (
                        <tr
                          key={crit.criterionId}
                          className={`border-b border-gray-50 ${
                            crit.accepted ? "bg-green-50/50" : "bg-amber-50/30"
                          }`}
                        >
                          <td className="px-5 py-3">
                            <div className="font-medium text-gray-900">
                              {crit.criterionName}
                            </div>
                            <div className="text-[10px] text-amber-600 font-medium">
                              Modificat
                            </div>
                          </td>
                          <td className="text-center px-3 py-3">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-gray-600 font-bold text-sm">
                              {crit.preScore ?? "—"}
                            </span>
                          </td>
                          <td className="text-center px-3 py-3">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-bold text-sm">
                              {crit.consensus ?? "—"}
                            </span>
                          </td>
                          <td className="text-center px-3 py-3">
                            {crit.accepted ? (
                              <span className="text-xs text-green-600 font-medium">
                                ✓ Acceptat
                              </span>
                            ) : (
                              <button
                                onClick={() =>
                                  handleAccept(
                                    job.jobId,
                                    crit.criterionId,
                                    crit.preScore ?? "",
                                    crit.consensus ?? ""
                                  )
                                }
                                disabled={accepting === `${job.jobId}-${crit.criterionId}`}
                                className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                              >
                                {accepting === `${job.jobId}-${crit.criterionId}`
                                  ? "..."
                                  : "Accept"}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {/* Unchanged criteria */}
                      {unchangedCriteria.map((crit) => (
                        <tr key={crit.criterionId} className="border-b border-gray-50">
                          <td className="px-5 py-2.5 text-gray-500 text-sm">
                            {crit.criterionName}
                          </td>
                          <td className="text-center px-3 py-2.5">
                            <span className="text-sm text-gray-500">
                              {crit.preScore ?? "—"}
                            </span>
                          </td>
                          <td className="text-center px-3 py-2.5">
                            <span className="text-sm text-gray-500">
                              {crit.consensus ?? "—"}
                            </span>
                          </td>
                          <td className="text-center px-3 py-2.5">
                            <span className="text-[10px] text-gray-400">Identic</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Accept all button */}
                  {changedCriteria.length > 0 && !job.allAccepted && (
                    <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
                      <button
                        onClick={() => handleAcceptAll(job.jobId)}
                        disabled={accepting === `all-${job.jobId}`}
                        className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        {accepting === `all-${job.jobId}`
                          ? "Se procesează..."
                          : `Acceptă toate (${changedCriteria.length - job.totalAccepted} rămase)`}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
