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
  const [showCompletionCard, setShowCompletionCard] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<
    Record<string, { code: string; subfactorId: string | null; reasoning: string; highlights: string[] }>
  >({})
  const [aiLoading, setAiLoading] = useState<string | null>(null)

  const totalPoints = criteria.reduce((sum, crit) => {
    const subfactorId = scores[crit.id]
    if (!subfactorId) return sum
    const sf = crit.subfactors.find((s) => s.id === subfactorId)
    return sum + (sf?.points ?? 0)
  }, 0)

  const completedCriteria = criteria.filter((c) => scores[c.id]).length
  const allCompleted = completedCriteria === criteria.length

  async function requestAiSuggestion(criterionId: string) {
    setAiLoading(criterionId)
    try {
      const res = await fetch(
        `/api/v1/sessions/${sessionId}/jobs/${sessionJobId}/ai-suggest`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ criterionId }),
        }
      )
      if (res.ok) {
        const data = await res.json()
        setAiSuggestions((prev) => ({
          ...prev,
          [criterionId]: {
            code: data.suggestedCode,
            subfactorId: data.suggestedSubfactorId,
            reasoning: data.reasoning,
            highlights: data.highlights || [],
          },
        }))
      }
    } catch {
      // silent
    } finally {
      setAiLoading(null)
    }
  }

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
        setShowCompletionCard(true)
        setSubmitting(false)
      }
    } catch {
      setError("Eroare la trimitere.")
      setSubmitting(false)
    }
  }

  if (showCompletionCard) {
    return (
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="text-center mb-4">
            <div className="text-3xl mb-2">✅</div>
            <h2 className="text-lg font-bold text-green-800">Evaluarea a fost trimisă</h2>
            <p className="text-sm text-green-700 mt-1">
              {jobTitle} — {completedCriteria} criterii evaluate
            </p>
          </div>
        </div>

        {/* Ce ai făcut */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h3 className="text-sm font-bold text-gray-900">Ce ați realizat</h3>
          <div className="text-sm text-gray-600 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>{completedCriteria} criterii evaluate pe fișa de post „{jobTitle}"</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>Tabel sumar cu literele alese:</span>
            </div>
            <div className="flex flex-wrap gap-2 ml-6">
              {criteria.map((crit) => {
                const sfId = scores[crit.id]
                const sf = crit.subfactors.find((s) => s.id === sfId)
                return (
                  <span key={crit.id} className="px-2 py-1 bg-gray-100 rounded text-xs">
                    {crit.name}: <span className="font-bold">{sf?.code ?? "—"}</span>
                  </span>
                )
              })}
            </div>
          </div>
        </div>

        {/* Ce urmează */}
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-5 space-y-3">
          <h3 className="text-sm font-bold text-blue-900">Ce urmează</h3>
          <div className="text-sm text-blue-800 space-y-1.5">
            <div className="flex items-start gap-2">
              <span className="text-blue-500 shrink-0">1.</span>
              <span><strong>Discuția de grup</strong> — toți membrii comisiei vor evalua toate fișele de post.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-500 shrink-0">2.</span>
              <span>Se pornește de la <strong>varianta dumneavoastră</strong> pe fișele din calupul alocat.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-500 shrink-0">3.</span>
              <span>AI-ul mediator identifică divergențele și facilitează atingerea <strong>consensului</strong>.</span>
            </div>
          </div>
        </div>

        {/* Principii consens */}
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-5 space-y-2">
          <h3 className="text-sm font-bold text-amber-900">Cum contribuiți la atingerea consensului</h3>
          <ul className="text-xs text-amber-800 space-y-1.5 list-none">
            <li className="flex items-start gap-2">
              <span className="text-amber-500 shrink-0">•</span>
              <span>Susțineți-vă poziția inițială cu argumente raportate la <strong>criteriile de scorare</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 shrink-0">•</span>
              <span>Acceptați argumente valide de la ceilalți membri</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 shrink-0">•</span>
              <span>Consens ≠ vot — e un proces de acord bazat pe <strong>fapte și logică</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 shrink-0">•</span>
              <span>Schimbați opinia doar pe bază de logică, nu pentru a evita conflictul</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 shrink-0">•</span>
              <span>Diversitatea opiniilor este sănătoasă și naturală</span>
            </li>
          </ul>
        </div>

        <div className="flex justify-center">
          <button
            onClick={() => {
              router.push(`/sessions/${sessionId}`)
              router.refresh()
            }}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Înapoi la sesiune
          </button>
        </div>
      </div>
    )
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
              <div className="flex items-center gap-2 shrink-0 ml-4">
                {selectedSf && (
                  <div className="text-lg font-bold text-indigo-dark">
                    {selectedSf.code}
                  </div>
                )}
                {!isSubmitted && (
                  <button
                    type="button"
                    onClick={() => requestAiSuggestion(crit.id)}
                    disabled={aiLoading === crit.id}
                    className="px-2.5 py-1 bg-purple-100 text-purple-700 text-xs rounded-lg hover:bg-purple-200 disabled:opacity-50 transition-colors flex items-center gap-1"
                  >
                    {aiLoading === crit.id ? (
                      <>
                        <span className="animate-spin w-3 h-3 border border-purple-600 border-t-transparent rounded-full" />
                        AI...
                      </>
                    ) : (
                      "Sugestie AI"
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* AI Suggestion card */}
            {aiSuggestions[crit.id] && (
              <div className="mb-3 ml-8 bg-purple-50 border border-purple-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-purple-700 flex items-center gap-1">
                    <span className="bg-purple-200 text-purple-700 px-1.5 py-0.5 rounded text-[10px]">AI</span>
                    Sugestie: {aiSuggestions[crit.id].code}
                  </span>
                  {!isSubmitted && aiSuggestions[crit.id].subfactorId && (
                    <button
                      type="button"
                      onClick={() => {
                        const sfId = aiSuggestions[crit.id].subfactorId
                        if (sfId) {
                          setScores((prev) => ({ ...prev, [crit.id]: sfId }))
                        }
                      }}
                      className="px-2 py-1 bg-purple-600 text-white text-[10px] rounded hover:bg-purple-700 transition-colors"
                    >
                      Adoptă
                    </button>
                  )}
                </div>
                <p className="text-xs text-purple-800 leading-relaxed">
                  {aiSuggestions[crit.id].reasoning}
                </p>
                {aiSuggestions[crit.id].highlights.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="text-[10px] text-purple-600 font-medium">Fragmente relevante din fișa postului:</div>
                    {aiSuggestions[crit.id].highlights.map((h, i) => (
                      <div key={i} className="text-[10px] text-purple-700 bg-purple-100 rounded px-2 py-1 italic">
                        &ldquo;{h}&rdquo;
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

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
