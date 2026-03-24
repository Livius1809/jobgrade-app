"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { UserRole } from "@/generated/prisma"

interface Subfactor {
  id: string
  code: string
  points: number
  description: string
  order: number
}

interface CriterionDistribution {
  criterion: {
    id: string
    name: string
    order: number
  }
  distribution: {
    subfactor: Subfactor
    count: number
    evaluators: string[]
    percentage: number
  }[]
  mode: {
    subfactor: Subfactor
    count: number
    evaluators: string[]
    percentage: number
  }
  cv: number
  consensusReached: boolean
  totalEvaluators: number
}

interface ConsensusViewProps {
  sessionId: string
  sessionJobId: string
  distributionByCriterion: CriterionDistribution[]
  sessionStatus: string
  userRole: UserRole
}

const CV_THRESHOLD = 25 // % - below this = consensus

export default function ConsensusView({
  sessionId,
  sessionJobId,
  distributionByCriterion,
  sessionStatus,
  userRole,
}: ConsensusViewProps) {
  const router = useRouter()
  const [expandedCrit, setExpandedCrit] = useState<string | null>(null)
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // Decide modal state
  const [decideModal, setDecideModal] = useState<{
    criterionId: string
    criterionName: string
    subfactors: Subfactor[]
  } | null>(null)
  const [decideSubfactorId, setDecideSubfactorId] = useState("")
  const [decideRationale, setDecideRationale] = useState("")

  const consensusCount = distributionByCriterion.filter((c) => c.consensusReached).length
  const total = distributionByCriterion.length

  const canFacilitate =
    userRole === UserRole.COMPANY_ADMIN ||
    userRole === UserRole.OWNER ||
    userRole === UserRole.FACILITATOR

  const baseUrl = `/api/v1/sessions/${sessionId}/consensus/${sessionJobId}`

  async function handleRecalibrate(criterionId: string) {
    setLoadingAction(`recalibrate-${criterionId}`)
    setActionError(null)
    try {
      const res = await fetch(`${baseUrl}/recalibrate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ criterionId }),
      })
      const json = await res.json()
      if (!res.ok) {
        setActionError(json.message || "Eroare la recalibrare.")
      } else {
        router.refresh()
      }
    } catch {
      setActionError("Eroare de rețea.")
    } finally {
      setLoadingAction(null)
    }
  }

  async function handleTriggerVote(criterionId: string) {
    setLoadingAction(`vote-${criterionId}`)
    setActionError(null)
    try {
      const res = await fetch(`${baseUrl}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ criterionId, action: "trigger" }),
      })
      const json = await res.json()
      if (!res.ok) {
        setActionError(json.message || "Eroare la declanșarea votului.")
      } else {
        router.refresh()
      }
    } catch {
      setActionError("Eroare de rețea.")
    } finally {
      setLoadingAction(null)
    }
  }

  async function handleDecide() {
    if (!decideModal || !decideSubfactorId || !decideRationale.trim()) return
    setLoadingAction(`decide-${decideModal.criterionId}`)
    setActionError(null)
    try {
      const res = await fetch(`${baseUrl}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          criterionId: decideModal.criterionId,
          subfactorId: decideSubfactorId,
          rationale: decideRationale,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setActionError(json.message || "Eroare la decizie.")
      } else {
        setDecideModal(null)
        setDecideSubfactorId("")
        setDecideRationale("")
        router.refresh()
      }
    } catch {
      setActionError("Eroare de rețea.")
    } finally {
      setLoadingAction(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="grid grid-cols-3 gap-6 text-center">
          <div>
            <div className="text-3xl font-bold text-green-600">{consensusCount}</div>
            <div className="text-sm text-gray-500 mt-1">Criterii cu consens</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-orange-600">
              {total - consensusCount}
            </div>
            <div className="text-sm text-gray-500 mt-1">Necesită recalibrare</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-gray-900">{total}</div>
            <div className="text-sm text-gray-500 mt-1">Total criterii</div>
          </div>
        </div>
      </div>

      {actionError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {actionError}
        </div>
      )}

      {/* Per-criterion */}
      <div className="space-y-3">
        {distributionByCriterion.map((item) => {
          const isExpanded = expandedCrit === item.criterion.id
          const hasVotes = item.distribution.some((d) => d.count > 0)

          return (
            <div
              key={item.criterion.id}
              className={`bg-white rounded-xl border ${
                item.consensusReached ? "border-green-200" : "border-orange-200"
              } overflow-hidden`}
            >
              <button
                className="w-full px-5 py-4 flex items-center justify-between text-left"
                onClick={() =>
                  setExpandedCrit(isExpanded ? null : item.criterion.id)
                }
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                      item.consensusReached
                        ? "bg-green-100 text-green-700"
                        : "bg-orange-100 text-orange-700"
                    }`}
                  >
                    {item.criterion.order}
                  </span>
                  <div>
                    <span className="font-medium text-gray-900">
                      {item.criterion.name}
                    </span>
                    {item.mode && hasVotes && (
                      <span className="ml-2 text-sm text-gray-500">
                        Mod: {item.mode.subfactor.code} ({item.mode.subfactor.points} pct)
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xs text-gray-500">CV</div>
                    <div
                      className={`text-sm font-bold ${
                        item.cv <= CV_THRESHOLD ? "text-green-600" : "text-orange-600"
                      }`}
                    >
                      {item.cv.toFixed(1)}%
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      item.consensusReached
                        ? "bg-green-100 text-green-700"
                        : "bg-orange-100 text-orange-700"
                    }`}
                  >
                    {item.consensusReached ? "✓ Consens" : "⚠ Dispersat"}
                  </span>
                  <span className="text-gray-400">{isExpanded ? "▲" : "▼"}</span>
                </div>
              </button>

              {isExpanded && (
                <div className="px-5 pb-5 border-t border-gray-100">
                  {!hasVotes ? (
                    <p className="text-sm text-gray-400 py-3">
                      Nicio evaluare trimisă pentru acest criteriu.
                    </p>
                  ) : (
                    <div className="space-y-3 mt-3">
                      {item.distribution
                        .filter((d) => d.count > 0)
                        .map((d) => (
                          <div key={d.subfactor.id}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm text-gray-900">
                                  {d.subfactor.code}
                                </span>
                                <span className="text-xs text-blue-600">
                                  {d.subfactor.points} pct
                                </span>
                                <span className="text-xs text-gray-500 max-w-xs truncate">
                                  {d.subfactor.description.substring(0, 60)}...
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="text-sm font-medium text-gray-900">
                                  {d.count}/{item.totalEvaluators}
                                </span>
                                <span className="text-xs text-gray-400 ml-1">
                                  ({d.percentage.toFixed(0)}%)
                                </span>
                              </div>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full">
                              <div
                                className={`h-2 rounded-full ${
                                  d.subfactor.id === item.mode?.subfactor.id
                                    ? "bg-blue-600"
                                    : "bg-gray-400"
                                }`}
                                style={{ width: `${d.percentage}%` }}
                              />
                            </div>
                            {d.evaluators.length > 0 && (
                              <div className="mt-1 text-xs text-gray-400">
                                {d.evaluators.join(", ")}
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  )}

                  {!item.consensusReached && canFacilitate && (
                    <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2 flex-wrap items-center">
                      <span className="text-xs text-gray-500 self-center">
                        Acțiuni facilitator:
                      </span>
                      <button
                        onClick={() => handleRecalibrate(item.criterion.id)}
                        disabled={loadingAction === `recalibrate-${item.criterion.id}`}
                        className="px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg text-xs font-medium hover:bg-orange-200 transition-colors disabled:opacity-50"
                      >
                        {loadingAction === `recalibrate-${item.criterion.id}`
                          ? "Se procesează..."
                          : "Declanșează recalibrare"}
                      </button>
                      <button
                        onClick={() => handleTriggerVote(item.criterion.id)}
                        disabled={loadingAction === `vote-${item.criterion.id}`}
                        className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium hover:bg-purple-200 transition-colors disabled:opacity-50"
                      >
                        {loadingAction === `vote-${item.criterion.id}`
                          ? "Se procesează..."
                          : "Declanșează vot"}
                      </button>
                      <button
                        onClick={() => {
                          const allSubfactors = item.distribution.map((d) => d.subfactor)
                          setDecideModal({
                            criterionId: item.criterion.id,
                            criterionName: item.criterion.name,
                            subfactors: allSubfactors,
                          })
                          setDecideSubfactorId(item.mode?.subfactor.id ?? "")
                          setDecideRationale("")
                        }}
                        className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200 transition-colors"
                      >
                        Decide direct
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Decide Modal */}
      {decideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">
              Decizie facilitator — {decideModal.criterionName}
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subfactor ales *
              </label>
              <select
                value={decideSubfactorId}
                onChange={(e) => setDecideSubfactorId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Selectează —</option>
                {decideModal.subfactors.map((sf) => (
                  <option key={sf.id} value={sf.id}>
                    {sf.code} — {sf.points} pct · {sf.description.substring(0, 50)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Motivare *
              </label>
              <textarea
                value={decideRationale}
                onChange={(e) => setDecideRationale(e.target.value)}
                rows={3}
                placeholder="Explică motivul deciziei tale..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {actionError && (
              <p className="text-sm text-red-600">{actionError}</p>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setDecideModal(null)
                  setActionError(null)
                }}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Anulează
              </button>
              <button
                onClick={handleDecide}
                disabled={
                  !decideSubfactorId ||
                  !decideRationale.trim() ||
                  loadingAction?.startsWith("decide-")
                }
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loadingAction?.startsWith("decide-")
                  ? "Se salvează..."
                  : "Confirmă decizia"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
