/**
 * CandidatesList — Lista candidati B2C anonimizati cu scoruri compatibilitate
 */

"use client"

import { useState } from "react"

interface MatchResult {
  pseudonym: string
  compatibilityScore: number
  strengths: string[]
  gaps: string[]
  recommendation: string
  jobId: string
  jobTitle: string
  matchedAt: string
}

interface Props {
  candidates: MatchResult[]
}

export default function CandidatesList({ candidates }: Props) {
  const [filter, setFilter] = useState<string>("all")
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  // Unique job titles for filtering
  const jobTitles = Array.from(new Set(candidates.map(c => c.jobTitle)))

  const filtered = filter === "all"
    ? candidates
    : candidates.filter(c => c.jobTitle === filter)

  function getScoreColor(score: number): string {
    if (score >= 80) return "text-green-700 bg-green-100"
    if (score >= 60) return "text-amber-700 bg-amber-100"
    return "text-red-700 bg-red-100"
  }

  if (candidates.length === 0) {
    return (
      <div className="text-center py-16 border border-dashed border-gray-200 rounded-lg">
        <p className="text-gray-500">Nu exista candidati identificati inca.</p>
        <p className="text-sm text-gray-400 mt-2">
          Adaugati pozitii si rulati matching-ul pentru a identifica candidati compatibili.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      {jobTitles.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-500">Filtru pozitie:</span>
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === "all" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Toate ({candidates.length})
          </button>
          {jobTitles.map(title => (
            <button
              key={title}
              onClick={() => setFilter(title)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filter === title ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {title}
            </button>
          ))}
        </div>
      )}

      {/* Candidates list */}
      <div className="space-y-3">
        {filtered.map((candidate, idx) => {
          const isExpanded = expandedIdx === idx

          return (
            <div
              key={`${candidate.pseudonym}-${candidate.jobId}-${idx}`}
              className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors cursor-pointer"
              onClick={() => setExpandedIdx(isExpanded ? null : idx)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Avatar placeholder */}
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-500">
                    {candidate.pseudonym.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{candidate.pseudonym}</h4>
                    <p className="text-sm text-gray-500">Pozitie: {candidate.jobTitle}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getScoreColor(candidate.compatibilityScore)}`}>
                    {candidate.compatibilityScore}%
                  </span>
                </div>
              </div>

              {isExpanded && (
                <div className="mt-4 pt-3 border-t border-gray-100 space-y-3">
                  {/* Strengths */}
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Puncte forte:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {candidate.strengths.map((s, i) => (
                        <span key={i} className="px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Gaps */}
                  {candidate.gaps.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Gap-uri:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {candidate.gaps.map((g, i) => (
                          <span key={i} className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded">
                            {g}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendation */}
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Recomandare:</p>
                    <p className="text-sm text-gray-700">{candidate.recommendation}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <button className="px-3 py-1.5 text-xs font-medium bg-gray-900 text-white rounded hover:bg-gray-800">
                      Solicita detalii
                    </button>
                    <button className="px-3 py-1.5 text-xs font-medium border border-gray-300 text-gray-700 rounded hover:bg-gray-50">
                      Salveaza
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Summary */}
      <div className="text-xs text-gray-400 text-center pt-4">
        {filtered.length} candidat{filtered.length !== 1 ? "i" : ""} identificat{filtered.length !== 1 ? "i" : ""}
        {" "}— identitatea reala se dezvaluie doar la accept reciproc
      </div>
    </div>
  )
}
