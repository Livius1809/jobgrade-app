"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface Subfactor {
  id: string
  code: string
  description: string
  points: number
  order: number
}

interface Criterion {
  id: string
  name: string
  description: string | null
  category: string | null
  order: number
  subfactors: Subfactor[]
}

interface EvaluationFormProps {
  sessionId: string
  sessionJobId: string
  assignmentId: string
  isSubmitted: boolean
  criteria: Criterion[]
  existingScores: Record<string, string>
  existingJustifications: Record<string, string>
  jobTitle: string
}

export default function EvaluationForm({
  sessionId,
  sessionJobId,
  assignmentId,
  isSubmitted,
  criteria,
  existingScores,
  existingJustifications,
  jobTitle,
}: EvaluationFormProps) {
  const router = useRouter()
  const [scores, setScores] = useState<Record<string, string>>(existingScores)
  const [justifications, setJustifications] = useState<Record<string, string>>(
    existingJustifications
  )
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [savedAt, setSavedAt] = useState<Date | null>(null)

  const totalPoints = criteria.reduce((sum, crit) => {
    const subfactorId = scores[crit.id]
    if (!subfactorId) return sum
    const sf = crit.subfactors.find((s) => s.id === subfactorId)
    return sum + (sf?.points ?? 0)
  }, 0)

  const completedCriteria = criteria.filter((c) => scores[c.id]).length
  const allCompleted = completedCriteria === criteria.length

  async function saveDraft() {
    setSaving(true)
    setError("")
    try {
      const res = await fetch(
        `/api/v1/sessions/${sessionId}/jobs/${sessionJobId}/evaluate`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assignmentId,
            scores: Object.entries(scores).map(([criterionId, subfactorId]) => ({
              criterionId,
              subfactorId,
              justification: justifications[criterionId] ?? "",
            })),
            isDraft: true,
          }),
        }
      )
      if (!res.ok) {
        const json = await res.json()
        setError(json.message || "Eroare la salvare.")
      } else {
        setSavedAt(new Date())
      }
    } catch {
      setError("Eroare la salvare.")
    } finally {
      setSaving(false)
    }
  }

  async function submitEvaluation() {
    if (!allCompleted) {
      setError("Completează toate criteriile înainte de a trimite.")
      return
    }
    setSubmitting(true)
    setError("")
    try {
      const res = await fetch(
        `/api/v1/sessions/${sessionId}/jobs/${sessionJobId}/evaluate`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assignmentId,
            scores: Object.entries(scores).map(([criterionId, subfactorId]) => ({
              criterionId,
              subfactorId,
              justification: justifications[criterionId] ?? "",
            })),
            isDraft: false,
          }),
        }
      )
      if (!res.ok) {
        const json = await res.json()
        setError(json.message || "Eroare la trimitere.")
        setSubmitting(false)
      } else {
        router.push(`/app/sessions/${sessionId}`)
        router.refresh()
      }
    } catch {
      setError("Eroare la trimitere.")
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Criterii completate: {completedCriteria}/{criteria.length}
          </span>
          <span className="text-lg font-bold text-blue-600">
            {totalPoints} pct
          </span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full">
          <div
            className="h-2 bg-blue-600 rounded-full transition-all"
            style={{
              width: `${(completedCriteria / criteria.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Criteria */}
      {criteria.map((crit, index) => {
        const selectedSubfactorId = scores[crit.id]
        const selectedSf = crit.subfactors.find(
          (s) => s.id === selectedSubfactorId
        )

        return (
          <div
            key={crit.id}
            className={`bg-white rounded-xl border p-6 transition-colors ${
              selectedSubfactorId
                ? "border-blue-200"
                : "border-gray-200"
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full text-xs font-bold flex items-center justify-center">
                    {index + 1}
                  </span>
                  <h3 className="font-semibold text-gray-900">{crit.name}</h3>
                  {crit.category && (
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {crit.category}
                    </span>
                  )}
                </div>
                {crit.description && (
                  <p className="text-sm text-gray-500 mt-1 ml-8">
                    {crit.description}
                  </p>
                )}
              </div>
              {selectedSf && (
                <div className="text-right shrink-0 ml-4">
                  <div className="text-lg font-bold text-blue-600">
                    {selectedSf.points} pct
                  </div>
                  <div className="text-xs text-gray-500">
                    Nivel {selectedSf.code}
                  </div>
                </div>
              )}
            </div>

            {/* Subfactors */}
            <div className="space-y-2">
              {crit.subfactors.map((sf) => (
                <label
                  key={sf.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    isSubmitted
                      ? "cursor-default"
                      : "hover:bg-gray-50"
                  } ${
                    selectedSubfactorId === sf.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200"
                  }`}
                >
                  <input
                    type="radio"
                    name={`criterion-${crit.id}`}
                    value={sf.id}
                    checked={selectedSubfactorId === sf.id}
                    onChange={() => {
                      if (!isSubmitted) {
                        setScores((prev) => ({ ...prev, [crit.id]: sf.id }))
                      }
                    }}
                    disabled={isSubmitted}
                    className="mt-1 shrink-0"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-gray-900">
                        {sf.code}
                      </span>
                      <span className="text-xs text-blue-600 font-medium">
                        {sf.points} pct
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {sf.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>

            {/* Justification */}
            {selectedSubfactorId && !isSubmitted && (
              <div className="mt-3">
                <textarea
                  value={justifications[crit.id] ?? ""}
                  onChange={(e) =>
                    setJustifications((prev) => ({
                      ...prev,
                      [crit.id]: e.target.value,
                    }))
                  }
                  placeholder="Justificare (opțional) — motivează alegerea..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-gray-50"
                />
              </div>
            )}
            {isSubmitted && justifications[crit.id] && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-600 italic">
                &ldquo;{justifications[crit.id]}&rdquo;
              </div>
            )}
          </div>
        )
      })}

      {/* Actions */}
      {!isSubmitted && (
        <div className="flex items-center justify-between py-4">
          <div className="text-xs text-gray-400">
            {savedAt && `Salvat la ${savedAt.toLocaleTimeString("ro-RO")}`}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={saveDraft}
              disabled={saving}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {saving ? "Se salvează..." : "Salvează ciornă"}
            </button>
            <button
              type="button"
              onClick={submitEvaluation}
              disabled={submitting || !allCompleted}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? "Se trimite..." : "Trimite evaluarea"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
