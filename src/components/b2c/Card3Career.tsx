"use client"

import { useState, useCallback, useMemo } from "react"
import {
  HERMANN_QUESTIONS,
  LIKERT_LABELS,
  QUADRANT_DESCRIPTIONS,
  scoreHermann,
  hermannProgress,
  isHermannComplete,
} from "@/lib/b2c/questionnaires/hermann-hbdi"
import {
  MBTI_QUESTIONS,
  scoreMBTI,
  mbtiProgress,
  isMBTIComplete,
  MBTI_TYPE_DESCRIPTIONS,
} from "@/lib/b2c/questionnaires/mbti"
import type {
  HermannAnswers,
  HermannResult,
  MBTIAnswers,
  MBTIResult,
} from "@/lib/b2c/questionnaires/types"

/**
 * Card 3 — "Îmi asum un rol profesional"
 *
 * Flow: Formular → Hermann HBDI → MBTI → Upload CV → Profil extras → Posturi → Matching
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

type Step = "questionnaire" | "hermann" | "mbti" | "cv-upload" | "profile" | "jobs" | "match-result"

const STEPS: Step[] = ["questionnaire", "hermann", "mbti", "cv-upload", "profile", "jobs", "match-result"]

const STEP_LABELS: Record<Step, string> = {
  questionnaire: "Preferințe",
  hermann: "Stil cognitiv",
  mbti: "Personalitate",
  "cv-upload": "CV",
  profile: "Profil",
  jobs: "Posturi",
  "match-result": "Potrivire",
}

// Items per pagină (paginare chestionare lungi)
const HERMANN_PAGE_SIZE = 12
const MBTI_PAGE_SIZE = 10

export default function Card3Career({ userId }: { userId: string }) {
  const [step, setStep] = useState<Step>("questionnaire")
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState<ExtractedProfile | null>(null)
  const [jobs, setJobs] = useState<AvailableJob[]>([])
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null)
  const [matchedJob, setMatchedJob] = useState<AvailableJob | null>(null)

  // Formular preferințe carieră
  const [form, setForm] = useState({
    experienceLevel: "",
    contractType: "",
    relocation: "",
    salaryExpectation: "",
    geography: "",
  })

  // Hermann HBDI
  const [hermannAnswers, setHermannAnswers] = useState<HermannAnswers>({})
  const [hermannResult, setHermannResult] = useState<HermannResult | null>(null)
  const [hermannPage, setHermannPage] = useState(0)

  // MBTI
  const [mbtiAnswers, setMbtiAnswers] = useState<MBTIAnswers>({})
  const [mbtiResult, setMbtiResult] = useState<MBTIResult | null>(null)
  const [mbtiPage, setMbtiPage] = useState(0)

  const hermannProg = useMemo(() => hermannProgress(hermannAnswers), [hermannAnswers])
  const mbtiProg = useMemo(() => mbtiProgress(mbtiAnswers), [mbtiAnswers])

  // ── Pas 1: Formular suplimentar ──────────────────────────

  const submitQuestionnaire = useCallback(async () => {
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append("userId", userId)
      fd.append("action", "questionnaire")
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))

      await fetch("/api/v1/b2c/card-3", { method: "POST", body: fd })
      setStep("hermann")
    } finally {
      setLoading(false)
    }
  }, [userId, form])

  // ── Pas 2: Hermann HBDI ──────────────────────────────────

  const submitHermann = useCallback(async () => {
    const result = scoreHermann(hermannAnswers)
    setHermannResult(result)
    setLoading(true)
    try {
      await fetch("/api/v1/b2c/card-3", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          action: "hermann",
          answers: hermannAnswers,
          result,
        }),
      })
      setStep("mbti")
    } finally {
      setLoading(false)
    }
  }, [userId, hermannAnswers])

  // ── Pas 3: MBTI ──────────────────────────────────────────

  const submitMBTI = useCallback(async () => {
    const result = scoreMBTI(mbtiAnswers)
    setMbtiResult(result)
    setLoading(true)
    try {
      await fetch("/api/v1/b2c/card-3", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          action: "mbti",
          answers: mbtiAnswers,
          result,
        }),
      })
      setStep("cv-upload")
    } finally {
      setLoading(false)
    }
  }, [userId, mbtiAnswers])

  // ── Pas 4: Upload CV ─────────────────────────────────────

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
        const jobsRes = await fetch(`/api/v1/b2c/card-3?userId=${userId}`)
        const jobsData = await jobsRes.json()
        setJobs(jobsData.availableJobs || [])
        setStep("profile")
      }
    } finally {
      setLoading(false)
    }
  }, [userId])

  // ── Pas 6: Matching cu un post ───────────────────────────

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

  // ── Helpers render ───────────────────────────────────────

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

  const currentStepIndex = STEPS.indexOf(step)

  // ── Paginare Hermann ─────────────────────────────────────
  const hermannTotalPages = Math.ceil(HERMANN_QUESTIONS.length / HERMANN_PAGE_SIZE)
  const hermannPageQuestions = HERMANN_QUESTIONS.slice(
    hermannPage * HERMANN_PAGE_SIZE,
    (hermannPage + 1) * HERMANN_PAGE_SIZE
  )

  // ── Paginare MBTI (doar primele 95 scorabile) ────────────
  const scorableMBTI = MBTI_QUESTIONS.filter(q => q.id <= 95)
  const mbtiTotalPages = Math.ceil(scorableMBTI.length / MBTI_PAGE_SIZE)
  const mbtiPageQuestions = scorableMBTI.slice(
    mbtiPage * MBTI_PAGE_SIZE,
    (mbtiPage + 1) * MBTI_PAGE_SIZE
  )

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="flex items-center gap-1.5 mb-6 overflow-x-auto">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-1.5 shrink-0">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${
              step === s ? "bg-indigo-600 text-white" :
              currentStepIndex > i ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"
            }`}>
              {i + 1}
            </div>
            <span className={`text-[10px] ${step === s ? "text-indigo-600 font-medium" : "text-gray-400"}`}>
              {STEP_LABELS[s]}
            </span>
            {i < STEPS.length - 1 && <div className="w-4 h-0.5 bg-gray-200" />}
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

      {/* ═══ PAS 2: Hermann HBDI — Preferință emisferică ═══ */}
      {step === "hermann" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-bold text-gray-900">Stilul tau cognitiv</h2>
            <span className="text-xs text-gray-400">{hermannProg.answered}/72</span>
          </div>
          <p className="text-sm text-gray-500 mb-2">
            In ce masura modurile de mai jos de a gandi sau actiona te caracterizeaza?
          </p>

          {/* Bară progres */}
          <div className="w-full bg-gray-100 rounded-full h-1.5 mb-5">
            <div className="bg-indigo-500 h-1.5 rounded-full transition-all" style={{ width: `${hermannProg.percent}%` }} />
          </div>

          {/* Întrebări paginate */}
          <div className="space-y-4">
            {hermannPageQuestions.map(q => (
              <div key={q.id} className="border-b border-gray-50 pb-3">
                <p className="text-sm text-gray-800 mb-2">
                  <span className="text-xs text-gray-400 mr-1">{q.id}.</span>
                  {q.text}
                </p>
                <div className="flex gap-2">
                  {([1, 2, 3, 4, 5] as const).map(val => (
                    <button key={val}
                      onClick={() => setHermannAnswers(prev => ({ ...prev, [q.id]: val }))}
                      className={`flex-1 py-1.5 rounded text-xs border transition-colors ${
                        hermannAnswers[q.id] === val
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
                      }`}>
                      {LIKERT_LABELS[val]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Navigare pagini */}
          <div className="flex items-center justify-between mt-5">
            <button onClick={() => setHermannPage(p => Math.max(0, p - 1))}
              disabled={hermannPage === 0}
              className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30">
              Inapoi
            </button>
            <span className="text-xs text-gray-400">
              Pagina {hermannPage + 1} / {hermannTotalPages}
            </span>
            {hermannPage < hermannTotalPages - 1 ? (
              <button onClick={() => setHermannPage(p => p + 1)}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                Urmatoare
              </button>
            ) : (
              <button onClick={submitHermann}
                disabled={loading || !isHermannComplete(hermannAnswers)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                {loading ? "Se calculeaza..." : "Finalizeaza stilul cognitiv"}
              </button>
            )}
          </div>

          {/* Skip */}
          <button onClick={() => setStep("mbti")}
            className="block mx-auto mt-3 text-xs text-gray-400 hover:text-gray-600">
            Treci peste (completez mai tarziu)
          </button>
        </div>
      )}

      {/* ═══ PAS 3: MBTI — Tip de personalitate ═══ */}
      {step === "mbti" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-bold text-gray-900">Tipul tau de personalitate</h2>
            <span className="text-xs text-gray-400">{mbtiProg.answered}/95</span>
          </div>
          <p className="text-sm text-gray-500 mb-2">
            Care dintre raspunsuri exprima mai bine felul in care simti sau actionezi de obicei?
          </p>

          {/* Bară progres */}
          <div className="w-full bg-gray-100 rounded-full h-1.5 mb-5">
            <div className="bg-purple-500 h-1.5 rounded-full transition-all" style={{ width: `${mbtiProg.percent}%` }} />
          </div>

          {/* Întrebări paginate */}
          <div className="space-y-4">
            {mbtiPageQuestions.map(q => (
              <div key={q.id} className="border-b border-gray-50 pb-3">
                <p className="text-sm text-gray-800 mb-2">
                  <span className="text-xs text-gray-400 mr-1">{q.id}.</span>
                  {q.text}
                </p>
                <div className="space-y-1.5">
                  <button
                    onClick={() => setMbtiAnswers(prev => ({ ...prev, [q.id]: "A" }))}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors ${
                      mbtiAnswers[q.id] === "A"
                        ? "bg-purple-600 text-white border-purple-600"
                        : "bg-white text-gray-700 border-gray-200 hover:border-purple-300"
                    }`}>
                    <span className="font-medium mr-1">A.</span> {q.optionA}
                  </button>
                  <button
                    onClick={() => setMbtiAnswers(prev => ({ ...prev, [q.id]: "B" }))}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors ${
                      mbtiAnswers[q.id] === "B"
                        ? "bg-purple-600 text-white border-purple-600"
                        : "bg-white text-gray-700 border-gray-200 hover:border-purple-300"
                    }`}>
                    <span className="font-medium mr-1">B.</span> {q.optionB}
                  </button>
                  {q.optionC && (
                    <button
                      onClick={() => setMbtiAnswers(prev => ({ ...prev, [q.id]: "C" }))}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors ${
                        mbtiAnswers[q.id] === "C"
                          ? "bg-purple-600 text-white border-purple-600"
                          : "bg-white text-gray-700 border-gray-200 hover:border-purple-300"
                      }`}>
                      <span className="font-medium mr-1">C.</span> {q.optionC}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Navigare pagini */}
          <div className="flex items-center justify-between mt-5">
            <button onClick={() => setMbtiPage(p => Math.max(0, p - 1))}
              disabled={mbtiPage === 0}
              className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30">
              Inapoi
            </button>
            <span className="text-xs text-gray-400">
              Pagina {mbtiPage + 1} / {mbtiTotalPages}
            </span>
            {mbtiPage < mbtiTotalPages - 1 ? (
              <button onClick={() => setMbtiPage(p => p + 1)}
                className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                Urmatoare
              </button>
            ) : (
              <button onClick={submitMBTI}
                disabled={loading || !isMBTIComplete(mbtiAnswers)}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50">
                {loading ? "Se calculeaza..." : "Finalizeaza personalitatea"}
              </button>
            )}
          </div>

          {/* Skip */}
          <button onClick={() => setStep("cv-upload")}
            className="block mx-auto mt-3 text-xs text-gray-400 hover:text-gray-600">
            Treci peste (completez mai tarziu)
          </button>
        </div>
      )}

      {/* ═══ PAS 4: Upload CV ═══ */}
      {step === "cv-upload" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {/* Rezumat rezultate profilare (dacă au fost completate) */}
          {(hermannResult || mbtiResult) && (
            <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg">
              <p className="text-xs text-gray-500 font-medium mb-3">Profilul tau pana acum</p>
              <div className="grid grid-cols-2 gap-3">
                {hermannResult && (
                  <div>
                    <p className="text-xs text-indigo-600 font-medium">Stil cognitiv</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {QUADRANT_DESCRIPTIONS[hermannResult.dominant].short}
                    </p>
                    <div className="mt-1 space-y-0.5">
                      {(["CoS", "CoD", "LiS", "LiD"] as const).map(q => (
                        <div key={q} className="flex items-center gap-1">
                          <span className="text-[10px] text-gray-500 w-16">{QUADRANT_DESCRIPTIONS[q].short}</span>
                          <div className="flex-1 bg-gray-200 rounded-full h-1">
                            <div className="bg-indigo-500 h-1 rounded-full" style={{ width: `${hermannResult[q]}%` }} />
                          </div>
                          <span className="text-[10px] text-gray-600 w-8 text-right">{hermannResult[q].toFixed(0)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {mbtiResult && (
                  <div>
                    <p className="text-xs text-purple-600 font-medium">Personalitate</p>
                    <p className="text-sm font-semibold text-gray-900">{mbtiResult.type}</p>
                    {MBTI_TYPE_DESCRIPTIONS[mbtiResult.type] && (
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        {MBTI_TYPE_DESCRIPTIONS[mbtiResult.type].title}
                      </p>
                    )}
                    <div className="mt-1 space-y-0.5">
                      {(["EI", "SN", "TF", "JP"] as const).map(d => (
                        <div key={d} className="flex items-center gap-1">
                          <span className="text-[10px] text-gray-500 w-6">{d[0]}</span>
                          <div className="flex-1 bg-gray-200 rounded-full h-1 relative">
                            <div className="bg-purple-500 h-1 rounded-full" style={{ width: `${mbtiResult.clarity[d]}%` }} />
                          </div>
                          <span className="text-[10px] text-gray-500 w-6 text-right">{d[1]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="text-center">
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
        </div>
      )}

      {/* ═══ PAS 5: Profil extras ═══ */}
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

      {/* ═══ PAS 6: Posturi disponibile ═══ */}
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

      {/* ═══ PAS 7: Rezultat matching ═══ */}
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

          {/* GRATUIT: rezumat + scor per criteriu */}
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

          {/* TRANZIȚIE GRATUIT → PLĂTIT */}
          <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
            <p className="text-xs text-indigo-600 font-medium mb-2">Vrei sa afli mai mult?</p>
            <p className="text-[11px] text-gray-600 mb-3">
              Ai vazut scorul si directia generala. Pentru a sti exact ce sa faci, ai nevoie de:
            </p>
            <div className="space-y-2 mb-4">
              <div className="flex items-start gap-2">
                <span className="text-indigo-400 text-xs mt-0.5">1.</span>
                <div>
                  <p className="text-xs font-medium text-gray-800">Raport detaliat de compatibilitate</p>
                  <p className="text-[10px] text-gray-500">Analiza aprofundata pe fiecare criteriu cu plan concret de dezvoltare</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-indigo-400 text-xs mt-0.5">2.</span>
                <div>
                  <p className="text-xs font-medium text-gray-800">Consiliere interviu personalizata</p>
                  <p className="text-[10px] text-gray-500">Intrebari probabile, puncte forte de evidentiat, puncte slabe de gestionat</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-indigo-400 text-xs mt-0.5">3.</span>
                <div>
                  <p className="text-xs font-medium text-gray-800">Ghid de selectie posturi</p>
                  <p className="text-[10px] text-gray-500">Ce criterii sa prioritizezi cand alegi intre mai multe oferte</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700">
                Deblocheaza raportul complet
              </button>
              <button className="flex-1 bg-purple-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-purple-700">
                Consiliere interviu
              </button>
            </div>
            <p className="text-[9px] text-gray-400 text-center mt-2">Se debiteaza din credite. Nu ai credite? Oferi mai multe date = primesti mai mult gratuit.</p>
          </div>

          <button onClick={() => setStep("jobs")} className="mt-4 w-full border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50">
            Verifica alte posturi (gratuit)
          </button>
        </div>
      )}
    </div>
  )
}
