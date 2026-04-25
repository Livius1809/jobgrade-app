"use client"

import { useState, useCallback } from "react"

/**
 * Card 3 — "Îmi asum un rol profesional"
 *
 * Flow: Formular suplimentar → Upload CV → Profil extras → Posturi disponibile → Matching
 * Principiu: clientul vede rezumat prietenos, nu fișă tehnică
 */

interface ExtractedProfile {
  title?: string
  purpose?: string
  responsibilities?: string
  requirements?: string
  experience?: string
  education?: string
  languages?: string
  criteriaEstimate?: Record<string, string>
}

interface AvailableJob {
  id: string
  title: string
  code?: string
  purpose?: string
  department?: string
  company?: string
}

interface MatchCriterion {
  criterion: string
  label: string
  candidateLevel: string
  jobLevel: string
  match: "ABOVE" | "MATCH" | "CLOSE" | "GAP"
  recommendation: string
}

interface MatchResult {
  overallScore: number
  overallMatch: string
  criteria: MatchCriterion[]
  forCandidate: string
}

type Step = "questionnaire" | "cv-upload" | "profile" | "jobs" | "match-result"

export default function Card3Career({ userId }: { userId: string }) {
  const [step, setStep] = useState<Step>("questionnaire")
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState<ExtractedProfile | null>(null)
  const [jobs, setJobs] = useState<AvailableJob[]>([])
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null)
  const [matchedJob, setMatchedJob] = useState<AvailableJob | null>(null)

  // Formular
  const [form, setForm] = useState({
    experienceLevel: "",
    contractType: "",
    relocation: "",
    salaryExpectation: "",
    geography: "",
  })

  // ── Pas 1: Formular suplimentar ──────────────────────────

  const submitQuestionnaire = useCallback(async () => {
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append("userId", userId)
      fd.append("action", "questionnaire")
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))

      await fetch("/api/v1/b2c/card-3", { method: "POST", body: fd })
      setStep("cv-upload")
    } finally {
      setLoading(false)
    }
  }, [userId, form])

  // ── Pas 2: Upload CV ─────────────────────────────────────

  const uploadCV = useCallback(async (file: File) => {
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append("userId", userId)
      fd.append("action", "cv-upload")
      fd.append("cv", file)

      const res = await fetch("/api/v1/b2c/card-3", { method: "POST", body: fd })
      const data = await res.json()

      if (data.ok) {
        setProfile(data.profile)
        // Încărcăm și posturile disponibile
        const jobsRes = await fetch(`/api/v1/b2c/card-3?userId=${userId}`)
        const jobsData = await jobsRes.json()
        setJobs(jobsData.availableJobs || [])
        setStep("profile")
      }
    } finally {
      setLoading(false)
    }
  }, [userId])

  // ── Pas 4: Matching cu un post ───────────────────────────

  const runMatch = useCallback(async (job: AvailableJob) => {
    setLoading(true)
    setMatchedJob(job)
    try {
      const res = await fetch("/api/v1/b2c/card-3/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, jobId: job.id }),
      })
      const data = await res.json()
      if (data.match) {
        setMatchResult(data.match)
        setStep("match-result")
      }
    } finally {
      setLoading(false)
    }
  }, [userId])

  // ── Render ────────────────────────────────────────────────

  const MATCH_COLORS: Record<string, string> = {
    ABOVE: "text-emerald-600 bg-emerald-50",
    MATCH: "text-indigo-600 bg-indigo-50",
    CLOSE: "text-amber-600 bg-amber-50",
    GAP: "text-red-600 bg-red-50",
  }

  const MATCH_LABELS: Record<string, string> = {
    ABOVE: "Peste cerință",
    MATCH: "Potrivire",
    CLOSE: "Aproape",
    GAP: "Diferență",
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="flex items-center gap-2 mb-6">
        {["questionnaire", "cv-upload", "profile", "jobs", "match-result"].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
              step === s ? "bg-indigo-600 text-white" :
              ["questionnaire", "cv-upload", "profile", "jobs", "match-result"].indexOf(step) > i
                ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"
            }`}>
              {i + 1}
            </div>
            {i < 4 && <div className="w-8 h-0.5 bg-gray-200" />}
          </div>
        ))}
      </div>

      {/* ═══ PAS 1: Formular suplimentar ═══ */}
      {step === "questionnaire" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Despre cariera ta</h2>
          <p className="text-sm text-gray-500 mb-5">Cateva intrebari scurte ca sa te cunoastem mai bine.</p>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-700 font-medium">Nivel experienta</label>
              <select value={form.experienceLevel} onChange={e => setForm(f => ({ ...f, experienceLevel: e.target.value }))}
                className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">Alege...</option>
                <option value="junior">La inceput de drum (0-2 ani)</option>
                <option value="mid">Am experienta (3-7 ani)</option>
                <option value="senior">Expert in domeniu (8+ ani)</option>
                <option value="executive">Nivel executiv / management</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-700 font-medium">Ce tip de colaborare cauti?</label>
              <select value={form.contractType} onChange={e => setForm(f => ({ ...f, contractType: e.target.value }))}
                className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">Alege...</option>
                <option value="full-time">Angajare cu norma intreaga</option>
                <option value="part-time">Part-time</option>
                <option value="freelance">Freelance / proiecte</option>
                <option value="open">Sunt deschis la mai multe variante</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-700 font-medium">Ai lua in considerare relocarea?</label>
              <select value={form.relocation} onChange={e => setForm(f => ({ ...f, relocation: e.target.value }))}
                className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">Alege...</option>
                <option value="da">Da, sunt deschis</option>
                <option value="nu">Prefer sa raman in zona mea</option>
                <option value="poate">Depinde de oportunitate</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-700 font-medium">Zona geografica preferata</label>
              <input type="text" value={form.geography} onChange={e => setForm(f => ({ ...f, geography: e.target.value }))}
                placeholder="ex: Bucuresti, Cluj, remote"
                className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>

            <div>
              <label className="text-sm text-gray-700 font-medium">Asteptari salariale (orientativ)</label>
              <input type="text" value={form.salaryExpectation} onChange={e => setForm(f => ({ ...f, salaryExpectation: e.target.value }))}
                placeholder="ex: 5000-7000 RON net"
                className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          <button onClick={submitQuestionnaire} disabled={loading || !form.experienceLevel}
            className="mt-5 w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            {loading ? "Se salveaza..." : "Continua"}
          </button>
        </div>
      )}

      {/* ═══ PAS 2: Upload CV ═══ */}
      {step === "cv-upload" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Incarca-ti CV-ul</h2>
          <p className="text-sm text-gray-500 mb-5">
            Analizam CV-ul tau ca sa iti construim profilul profesional.
            Acceptam PDF, DOCX sau imagini.
          </p>

          <label className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 cursor-pointer">
            {loading ? "Se analizeaza..." : "Alege fisier"}
            <input type="file" accept=".pdf,.docx,.doc,.png,.jpg,.jpeg" className="hidden"
              onChange={e => { if (e.target.files?.[0]) uploadCV(e.target.files[0]) }} disabled={loading} />
          </label>

          <button onClick={() => setStep("profile")} className="block mx-auto mt-4 text-sm text-gray-400 hover:text-gray-600">
            Sari peste (completez manual mai tarziu)
          </button>
        </div>
      )}

      {/* ═══ PAS 3: Profil extras ═══ */}
      {step === "profile" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Profilul tau profesional</h2>
          <p className="text-sm text-gray-500 mb-5">
            {profile ? "Am analizat CV-ul tau. Verifica daca informatiile sunt corecte." : "Nu ai incarcat CV. Poti reveni oricand."}
          </p>

          {profile && (
            <div className="space-y-3">
              {profile.title && (
                <div className="bg-indigo-50 rounded-lg p-3">
                  <p className="text-xs text-indigo-600 font-medium">Rolul tau</p>
                  <p className="text-sm font-semibold text-gray-900">{profile.title}</p>
                </div>
              )}
              {profile.experience && (
                <div>
                  <p className="text-xs text-gray-500 font-medium">Experienta</p>
                  <p className="text-sm text-gray-700">{profile.experience}</p>
                </div>
              )}
              {profile.education && (
                <div>
                  <p className="text-xs text-gray-500 font-medium">Educatie</p>
                  <p className="text-sm text-gray-700">{profile.education}</p>
                </div>
              )}
              {profile.responsibilities && (
                <div>
                  <p className="text-xs text-gray-500 font-medium">Ce faci cel mai bine</p>
                  <p className="text-sm text-gray-700">{profile.responsibilities}</p>
                </div>
              )}
              {profile.criteriaEstimate && (
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500 font-medium mb-2">Profilul tau pe 6 dimensiuni</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(profile.criteriaEstimate).map(([key, level]) => (
                      <div key={key} className="flex items-center justify-between bg-gray-50 rounded px-2 py-1">
                        <span className="text-xs text-gray-600">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                        <span className="text-xs font-bold text-indigo-600">{level}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <button onClick={() => setStep("jobs")} className="mt-5 w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700">
            Vezi posturi disponibile
          </button>
        </div>
      )}

      {/* ═══ PAS 4: Posturi disponibile ═══ */}
      {step === "jobs" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Posturi disponibile</h2>
          <p className="text-sm text-gray-500 mb-5">
            {jobs.length > 0 ? `${jobs.length} posturi de la companii care evalueaza corect.` : "Momentan nu sunt posturi disponibile. Revino curand."}
          </p>

          <div className="space-y-3">
            {jobs.map(job => (
              <div key={job.id} className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{job.title}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {job.company}{job.department ? ` · ${job.department}` : ""}
                    </p>
                    {job.purpose && <p className="text-xs text-gray-600 mt-1">{job.purpose.slice(0, 100)}</p>}
                  </div>
                  <button onClick={() => runMatch(job)} disabled={loading || !profile}
                    className="shrink-0 text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                    {loading ? "..." : "Verifica potrivirea"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {!profile && (
            <p className="mt-4 text-xs text-amber-600 bg-amber-50 rounded-lg p-3">
              Incarca CV-ul pentru a putea verifica potrivirea cu posturile.
            </p>
          )}
        </div>
      )}

      {/* ═══ PAS 5: Rezultat matching ═══ */}
      {step === "match-result" && matchResult && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="text-center mb-6">
            <p className={`text-4xl font-bold ${
              matchResult.overallScore >= 70 ? "text-emerald-600" :
              matchResult.overallScore >= 45 ? "text-amber-600" : "text-red-600"
            }`}>
              {matchResult.overallScore}%
            </p>
            <p className="text-sm text-gray-500 mt-1">compatibilitate cu {matchedJob?.title}</p>
            <p className="text-xs text-gray-400">{matchedJob?.company}</p>
          </div>

          <p className="text-sm text-gray-700 mb-4 bg-gray-50 rounded-lg p-3">{matchResult.forCandidate}</p>

          <div className="space-y-2">
            {matchResult.criteria.map(c => (
              <div key={c.criterion} className="flex items-center gap-3">
                <span className="text-xs text-gray-600 w-32 shrink-0">{c.label}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${MATCH_COLORS[c.match]}`}>
                  {MATCH_LABELS[c.match]}
                </span>
                <span className="text-[10px] text-gray-400 flex-1">{c.recommendation.slice(0, 60)}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 flex gap-3">
            <button onClick={() => setStep("jobs")} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">
              Alte posturi
            </button>
            <button className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm hover:bg-indigo-700">
              Consiliere interviu
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
