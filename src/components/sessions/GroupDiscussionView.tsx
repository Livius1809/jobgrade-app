"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import DiscussionPanel from "./DiscussionPanel"

// ─── Types ────────────────────────────────────────────

interface Subfactor {
  id: string
  code: string
  description: string
  points: number
  order: number
}

interface CriterionData {
  id: string
  name: string
  order: number
  category: string | null
  subfactors: Subfactor[]
  consensusPercent: number
  majorityCode: string | null
  isConsensus: boolean
  consensusStatus: string
  finalCode: string | null
  votes: Record<string, { subfactorId: string; code: string }>
}

interface Participant {
  id: string
  firstName: string
  lastName: string
  jobTitle: string | null
  departmentId: string | null
  completedPreScoring: boolean
}

interface JobInfo {
  id: string
  sessionJobId: string
  title: string
  department: { id: string; name: string } | null
  representative: {
    id: string
    firstName: string
    lastName: string
    jobTitle: string | null
  } | null
}

interface SessionInfo {
  id: string
  status: string
  currentRound: number
  evaluationType: string
}

interface GroupData {
  session: SessionInfo
  job: JobInfo
  participants: Participant[]
  criteria: CriterionData[]
  preScores: Record<string, Record<string, string>>
  commentCounts: Record<string, number>
}

// ─── Consensus Principles ────────────────────────────

const CONSENSUS_PRINCIPLES = [
  "Consensul nu este vot — e un proces de acord bazat pe fapte și logică",
  "Fiecare criteriu trebuie discutat și agreat de toți membrii",
  "Diversitatea opiniilor este sănătoasă și naturală",
  "Schimbă-ți opinia doar pe bază de logică, nu pentru a evita conflictul",
  "Nu evita conflictul prin sub-grupuri, votare sau medierea cifrelor",
  "Nu împinge agresiv propria clasare — expune-ți vederea obiectiv",
  "Nu intra cu mentalitatea câștig-pierdere",
]

// ─── Main Component ──────────────────────────────────

interface Props {
  sessionId: string
  sessionJobId: string
  currentUserId: string
}

export default function GroupDiscussionView({ sessionId, sessionJobId, currentUserId }: Props) {
  const router = useRouter()
  const [data, setData] = useState<GroupData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeCriterionId, setActiveCriterionId] = useState<string | null>(null)
  const [showPrinciples, setShowPrinciples] = useState(false)
  const [votingLoading, setVotingLoading] = useState<string | null>(null)

  const baseUrl = `/api/v1/sessions/${sessionId}/consensus/${sessionJobId}`

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${baseUrl}/group-data`)
      if (!res.ok) throw new Error("Eroare la încărcare date")
      const json = await res.json()
      setData(json)
      setError(null)
    } catch {
      setError("Nu s-au putut încărca datele discuției de grup.")
    } finally {
      setLoading(false)
    }
  }, [baseUrl])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Poll for updates every 10s
  useEffect(() => {
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [fetchData])

  async function handleVote(criterionId: string, subfactorId: string) {
    setVotingLoading(criterionId)
    try {
      const res = await fetch(`${baseUrl}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          criterionId,
          action: "cast",
          subfactorId,
        }),
      })
      if (!res.ok) {
        const json = await res.json()
        setError(json.message || "Eroare la vot.")
      } else {
        await fetchData()
      }
    } catch {
      setError("Eroare de rețea.")
    } finally {
      setVotingLoading(null)
    }
  }

  async function handleMarkConsensus(criterionId: string, subfactorId: string) {
    try {
      const res = await fetch(`${baseUrl}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          criterionId,
          subfactorId,
          rationale: "Consens unanim atins prin discuția de grup.",
        }),
      })
      if (res.ok) {
        await fetchData()
      }
    } catch {
      setError("Eroare la marcarea consensului.")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
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

  const { session, job, participants, criteria, preScores, commentCounts } = data
  const completedCriteria = criteria.filter((c) => c.isConsensus).length
  const totalCriteria = criteria.length
  const overallPercent = totalCriteria > 0 ? Math.round((completedCriteria / totalCriteria) * 100) : 0

  const activeCriterion = criteria.find((c) => c.id === activeCriterionId)

  return (
    <div className="flex gap-6 h-full min-h-[600px]">
      {/* LEFT — Job list with progress */}
      <div className="w-72 shrink-0 space-y-3">
        {/* Overall progress */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm font-medium text-gray-700 mb-2">
            Consens: {completedCriteria}/{totalCriteria} criterii
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${overallPercent}%` }}
            />
          </div>
          {overallPercent === 100 && (
            <div className="mt-2 text-sm font-bold text-green-700">
              CONSENS COMPLET
            </div>
          )}
        </div>

        {/* Criteria list */}
        <div className="space-y-1.5">
          {criteria.map((crit) => (
            <button
              key={crit.id}
              onClick={() => setActiveCriterionId(crit.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                activeCriterionId === crit.id
                  ? "border-blue-400 bg-blue-50"
                  : crit.isConsensus
                  ? "border-green-200 bg-green-50 hover:bg-green-100"
                  : "border-gray-200 bg-white hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
                    crit.isConsensus
                      ? "bg-green-500 text-white"
                      : activeCriterionId === crit.id
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {crit.isConsensus ? "✓" : crit.order}
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {crit.name}
                  </div>
                  {crit.isConsensus ? (
                    <div className="text-xs text-green-700 font-semibold">
                      CONSENS — {crit.finalCode}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="h-1.5 flex-1 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${crit.consensusPercent}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-500 shrink-0">
                        {crit.consensusPercent}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
              {(commentCounts[crit.id] ?? 0) > 0 && (
                <div className="mt-1 text-[10px] text-gray-400 pl-7">
                  {commentCounts[crit.id]} comentarii
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Principles toggle */}
        <button
          onClick={() => setShowPrinciples(!showPrinciples)}
          className="w-full text-left px-3 py-2 text-xs text-gray-500 hover:text-gray-700 border border-dashed border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          {showPrinciples ? "▼" : "▶"} Principii directoare consens
        </button>
        {showPrinciples && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1.5">
            {CONSENSUS_PRINCIPLES.map((p, i) => (
              <div key={i} className="text-xs text-amber-800 flex gap-2">
                <span className="shrink-0 text-amber-500">•</span>
                <span>{p}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RIGHT — Active criterion detail */}
      <div className="flex-1 min-w-0">
        {!activeCriterion ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
            <div className="text-lg mb-2">Selectează un criteriu din stânga</div>
            <div className="text-sm">pentru a vedea voturile și a participa la discuție</div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Job header */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              {job.representative && (
                <div className="text-sm text-gray-500 mb-1">
                  Reprezentant dept.: {job.representative.firstName} {job.representative.lastName}
                  {job.representative.jobTitle && ` · ${job.representative.jobTitle}`}
                  {job.department && ` · ${job.department.name}`}
                </div>
              )}
              <div className="text-lg font-semibold text-gray-900">{job.title}</div>
              <div className="mt-2 text-sm font-medium text-blue-700">
                Criteriu: {activeCriterion.name}
                {activeCriterion.category && (
                  <span className="text-gray-400 font-normal"> ({activeCriterion.category})</span>
                )}
              </div>
            </div>

            {/* Consensus progress for this criterion */}
            {activeCriterion.isConsensus ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <div className="text-lg font-bold text-green-700">
                  CONSENS — {activeCriterion.finalCode}
                </div>
                <div className="text-sm text-green-600 mt-1">
                  Toți membrii sunt de acord pe acest criteriu.
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Progres consens
                  </span>
                  <span className="text-sm font-bold text-blue-600">
                    {activeCriterion.consensusPercent}%
                  </span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      activeCriterion.consensusPercent === 100
                        ? "bg-green-500"
                        : activeCriterion.consensusPercent >= 75
                        ? "bg-blue-500"
                        : "bg-orange-400"
                    }`}
                    style={{ width: `${activeCriterion.consensusPercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Votes table: rows = participants, columns show pre-score + current vote */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-2.5 text-gray-600 font-medium">
                      Membru
                    </th>
                    <th className="text-center px-3 py-2.5 text-gray-600 font-medium w-28">
                      Pre-scorare
                    </th>
                    <th className="text-center px-3 py-2.5 text-gray-600 font-medium w-28">
                      Vot curent
                    </th>
                    <th className="text-center px-3 py-2.5 text-gray-600 font-medium w-20">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map((p) => {
                    const preScore = preScores[p.id]?.[activeCriterion.id] ?? "—"
                    const vote = activeCriterion.votes[p.id]
                    const currentCode = vote?.code ?? null
                    const agreesWithMajority =
                      currentCode !== null &&
                      activeCriterion.majorityCode !== null &&
                      currentCode === activeCriterion.majorityCode
                    const isCurrentUser = p.id === currentUserId

                    return (
                      <tr
                        key={p.id}
                        className={`border-b border-gray-50 ${
                          isCurrentUser ? "bg-blue-50/50" : ""
                        }`}
                      >
                        <td className="px-4 py-2.5">
                          <div className="font-medium text-gray-900">
                            {p.firstName} {p.lastName}
                            {isCurrentUser && (
                              <span className="ml-1 text-xs text-blue-500">(tu)</span>
                            )}
                          </div>
                          {p.jobTitle && (
                            <div className="text-xs text-gray-500">{p.jobTitle}</div>
                          )}
                        </td>
                        <td className="text-center px-3 py-2.5">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-gray-700 font-bold text-sm">
                            {preScore}
                          </span>
                        </td>
                        <td className="text-center px-3 py-2.5">
                          {isCurrentUser && !activeCriterion.isConsensus ? (
                            <VoteSelector
                              subfactors={activeCriterion.subfactors}
                              currentSubfactorId={vote?.subfactorId ?? null}
                              loading={votingLoading === activeCriterion.id}
                              onVote={(sfId) => handleVote(activeCriterion.id, sfId)}
                            />
                          ) : currentCode ? (
                            <span
                              className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-bold text-sm ${
                                agreesWithMajority
                                  ? "bg-green-100 text-green-700"
                                  : "bg-orange-100 text-orange-700"
                              }`}
                            >
                              {currentCode}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">
                              Încă nu a votat
                            </span>
                          )}
                        </td>
                        <td className="text-center px-3 py-2.5">
                          {currentCode ? (
                            agreesWithMajority ? (
                              <span className="text-green-600 text-xs">✓</span>
                            ) : (
                              <span className="text-orange-500 text-xs">⚠</span>
                            )
                          ) : (
                            <span className="text-gray-300 text-xs">○</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Auto-finalize when all agree */}
              {!activeCriterion.isConsensus &&
                activeCriterion.consensusPercent === 100 &&
                activeCriterion.majorityCode && (
                  <div className="px-4 py-3 bg-green-50 border-t border-green-200 flex items-center justify-between">
                    <div className="text-sm text-green-700 font-medium">
                      Toți membrii sunt de acord: {activeCriterion.majorityCode}
                    </div>
                    <button
                      onClick={() => {
                        const sf = activeCriterion.subfactors.find(
                          (s) => s.code === activeCriterion.majorityCode
                        )
                        if (sf) handleMarkConsensus(activeCriterion.id, sf.id)
                      }}
                      className="px-4 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Confirmă consens
                    </button>
                  </div>
                )}
            </div>

            {/* Discussion panel */}
            {!activeCriterion.isConsensus && (
              <DiscussionPanel
                sessionId={sessionId}
                sessionJobId={sessionJobId}
                criterionId={activeCriterion.id}
                criterionName={activeCriterion.name}
                currentUserId={currentUserId}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Vote Selector (inline dropdown) ─────────────────

function VoteSelector({
  subfactors,
  currentSubfactorId,
  loading,
  onVote,
}: {
  subfactors: Subfactor[]
  currentSubfactorId: string | null
  loading: boolean
  onVote: (subfactorId: string) => void
}) {
  return (
    <select
      value={currentSubfactorId ?? ""}
      onChange={(e) => {
        if (e.target.value) onVote(e.target.value)
      }}
      disabled={loading}
      className="w-20 px-1.5 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-center focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
    >
      <option value="">—</option>
      {subfactors.map((sf) => (
        <option key={sf.id} value={sf.id}>
          {sf.code}
        </option>
      ))}
    </select>
  )
}
