"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

interface Job {
  id: string
  title: string
  code: string
  department?: { name: string }
}

interface MatchCandidate {
  id: string
  alias: string
  score: number
  strengths: string[]
  gaps: string[]
  fitType: string
}

type MatchCriteria = "FIT_CULTURAL" | "AGENT_SCHIMBARE"

export default function MatchingPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [selectedJob, setSelectedJob] = useState("")
  const [criteria, setCriteria] = useState<MatchCriteria>("FIT_CULTURAL")
  const [candidates, setCandidates] = useState<MatchCandidate[]>([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)

  useEffect(() => { loadJobs() }, [])

  async function loadJobs() {
    setLoading(true)
    try {
      const res = await fetch("/api/v1/jobs")
      const data = await res.json()
      setJobs(data.jobs || data || [])
    } catch { /* silent */ }
    setLoading(false)
  }

  async function searchCandidates() {
    if (!selectedJob) return
    setSearching(true)
    setCandidates([])
    try {
      const res = await fetch("/api/v1/matching", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: selectedJob, criteria }),
      })
      if (res.ok) {
        const data = await res.json()
        setCandidates(data.candidates || data || [])
      }
    } catch { /* silent */ }
    setSearching(false)
  }

  function scoreColor(score: number) {
    if (score >= 80) return "text-emerald-600"
    if (score >= 60) return "text-amber-600"
    return "text-red-600"
  }

  function scoreBg(score: number) {
    if (score >= 80) return "bg-emerald-50 border-emerald-200"
    if (score >= 60) return "bg-amber-50 border-amber-200"
    return "bg-red-50 border-red-200"
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Matching candidati</h1>
          <p className="text-sm text-text-secondary mt-1">
            Gaseste candidati B2C compatibili cu posturile tale, anonimizat
          </p>
        </div>
        <Link
          href="/portal"
          className="text-sm text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          &larr; Portal
        </Link>
      </div>

      {loading && <p className="text-sm text-text-secondary">Se incarca...</p>}

      {!loading && (
        <>
          {/* Search form */}
          <div className="rounded-lg border border-border bg-surface p-5 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Selecteaza postul
                </label>
                <select
                  value={selectedJob}
                  onChange={(e) => setSelectedJob(e.target.value)}
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
                >
                  <option value="">-- Alege un post --</option>
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title} ({job.code})
                      {job.department ? ` — ${job.department.name}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Criteriu de matching
                </label>
                <div className="flex gap-3 mt-2">
                  <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                    <input
                      type="radio"
                      name="criteria"
                      checked={criteria === "FIT_CULTURAL"}
                      onChange={() => setCriteria("FIT_CULTURAL")}
                      className="accent-indigo-600"
                    />
                    Fit cultural
                  </label>
                  <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                    <input
                      type="radio"
                      name="criteria"
                      checked={criteria === "AGENT_SCHIMBARE"}
                      onChange={() => setCriteria("AGENT_SCHIMBARE")}
                      className="accent-indigo-600"
                    />
                    Agent al schimbarii
                  </label>
                </div>
              </div>
            </div>

            <button
              onClick={searchCandidates}
              disabled={searching || !selectedJob}
              className="text-sm font-medium bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {searching ? "Se cauta..." : "Cauta candidati"}
            </button>
          </div>

          {/* Results */}
          {candidates.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3">
                Rezultate ({candidates.length} candidati)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {candidates.map((c) => (
                  <div
                    key={c.id}
                    className={`rounded-lg border p-4 ${scoreBg(c.score)}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-foreground">
                        {c.alias}
                      </span>
                      <span className={`text-lg font-bold ${scoreColor(c.score)}`}>
                        {c.score}%
                      </span>
                    </div>

                    <div className="text-xs text-text-secondary mb-1">
                      Tip: {c.fitType === "FIT_CULTURAL" ? "Fit cultural" : "Agent al schimbarii"}
                    </div>

                    {c.strengths && c.strengths.length > 0 && (
                      <div className="mt-2">
                        <div className="text-[10px] uppercase tracking-wide text-text-secondary mb-1">
                          Puncte forte
                        </div>
                        <ul className="space-y-0.5">
                          {c.strengths.map((s, i) => (
                            <li key={i} className="text-xs text-emerald-700">
                              + {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {c.gaps && c.gaps.length > 0 && (
                      <div className="mt-2">
                        <div className="text-[10px] uppercase tracking-wide text-text-secondary mb-1">
                          Gap-uri
                        </div>
                        <ul className="space-y-0.5">
                          {c.gaps.map((g, i) => (
                            <li key={i} className="text-xs text-red-600">
                              - {g}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!searching && candidates.length === 0 && selectedJob && (
            <p className="text-sm text-text-secondary text-center mt-4">
              Apasa &quot;Cauta candidati&quot; pentru a gasi potriviri.
            </p>
          )}
        </>
      )}
    </div>
  )
}
