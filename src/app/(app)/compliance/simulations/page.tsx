"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

type Tab = "salary" | "policy" | "grid"

interface Job {
  id: string
  title: string
  code: string | null
}

// Salary simulation result
interface SalaryResult {
  impact: {
    before: { gapPct: number; aligned: boolean }
    after: { gapPct: number; aligned: boolean }
    delta: number
  }
  gradeCheck?: {
    gradeName: string
    salaryMin: number | null
    salaryMax: number | null
    inRange: boolean
  }
  summary: string
}

// Policy simulation result
interface PolicyIssue {
  law: string
  article: string
  description: string
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
}

interface PolicyResult {
  compliant: boolean
  issues: PolicyIssue[]
  recommendations: string[]
  summary: string
}

// Grid simulation result
interface GradeResult {
  name: string
  order: number
  salaryMin: number | null
  salaryMax: number | null
  legalMinimum: number
  compliant: boolean
  marketPosition: string | null
  benchmarkMedian: number | null
  issues: string[]
}

interface GridResult {
  compliant: boolean
  grades: GradeResult[]
  overtimeCompliant: boolean
  summary: string
}

const TAB_LABELS: Record<Tab, string> = {
  salary: "Ajustez salariu",
  policy: "Verific politica",
  grid: "Compar grila",
}

const POLICY_TYPES = [
  { value: "PAY_TRANSPARENCY", label: "Transparenta salariala" },
  { value: "GDPR", label: "Protectia datelor (GDPR)" },
  { value: "LABOR_LAW", label: "Legislatia muncii" },
  { value: "AI_ACT", label: "AI Act" },
  { value: "BENEFITS", label: "Beneficii angajati" },
  { value: "OTHER", label: "Altele" },
]

const SEVERITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  CRITICAL: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  HIGH: { bg: "bg-coral-50", text: "text-red-600", border: "border-red-200" },
  MEDIUM: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  LOW: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
}

export default function SimulationsPage() {
  const [tab, setTab] = useState<Tab>("salary")
  const [jobs, setJobs] = useState<Job[]>([])
  const [loadingJobs, setLoadingJobs] = useState(true)

  // Salary tab state
  const [salaryJobId, setSalaryJobId] = useState("")
  const [newSalary, setNewSalary] = useState("")
  const [salaryLoading, setSalaryLoading] = useState(false)
  const [salaryResult, setSalaryResult] = useState<SalaryResult | null>(null)
  const [salaryError, setSalaryError] = useState<string | null>(null)

  // Policy tab state
  const [policyTitle, setPolicyTitle] = useState("")
  const [policyContent, setPolicyContent] = useState("")
  const [policyType, setPolicyType] = useState("PAY_TRANSPARENCY")
  const [policyLoading, setPolicyLoading] = useState(false)
  const [policyResult, setPolicyResult] = useState<PolicyResult | null>(null)
  const [policyError, setPolicyError] = useState<string | null>(null)

  // Grid tab state
  const [gridLoading, setGridLoading] = useState(false)
  const [gridResult, setGridResult] = useState<GridResult | null>(null)
  const [gridError, setGridError] = useState<string | null>(null)

  useEffect(() => { loadJobs() }, [])

  async function loadJobs() {
    setLoadingJobs(true)
    try {
      const res = await fetch("/api/v1/jobs")
      const data = await res.json()
      setJobs(data.jobs || data || [])
    } catch {}
    setLoadingJobs(false)
  }

  // ── Salary simulation ──
  async function handleSalarySim() {
    if (!newSalary || Number(newSalary) <= 0) return
    setSalaryLoading(true)
    setSalaryResult(null)
    setSalaryError(null)
    try {
      const res = await fetch("/api/v1/compliance/simulate-salary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: salaryJobId || undefined,
          newSalary: Number(newSalary),
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setSalaryError(err.error || `Eroare ${res.status}`)
      } else {
        setSalaryResult(await res.json())
      }
    } catch {
      setSalaryError("Eroare de conexiune.")
    }
    setSalaryLoading(false)
  }

  // ── Policy simulation ──
  async function handlePolicySim() {
    if (!policyTitle.trim() || !policyContent.trim()) return
    setPolicyLoading(true)
    setPolicyResult(null)
    setPolicyError(null)
    try {
      const res = await fetch("/api/v1/compliance/simulate-policy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          policyTitle: policyTitle.trim(),
          policyContent: policyContent.trim(),
          policyType,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setPolicyError(err.error || `Eroare ${res.status}`)
      } else {
        setPolicyResult(await res.json())
      }
    } catch {
      setPolicyError("Eroare de conexiune.")
    }
    setPolicyLoading(false)
  }

  // ── Grid simulation ──
  async function handleGridSim() {
    setGridLoading(true)
    setGridResult(null)
    setGridError(null)
    try {
      const res = await fetch("/api/v1/compliance/simulate-grid-legal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setGridError(err.error || `Eroare ${res.status}`)
      } else {
        setGridResult(await res.json())
      }
    } catch {
      setGridError("Eroare de conexiune.")
    }
    setGridLoading(false)
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-foreground">Simulari conformitate</h1>
        <Link href="/compliance" className="text-xs text-indigo-600 hover:underline">
          &larr; Portal conformitate
        </Link>
      </div>
      <p className="text-sm text-text-secondary mb-6">
        Testati impactul modificarilor inainte de a le aplica
      </p>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 bg-slate-100 rounded-lg">
        {(Object.keys(TAB_LABELS) as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === t
                ? "bg-white text-foreground shadow-sm"
                : "text-text-secondary hover:text-foreground"
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* ═══════ TAB 1: Salary ═══════ */}
      {tab === "salary" && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Post (optional)</label>
            {loadingJobs ? (
              <p className="text-sm text-text-secondary">Se incarca...</p>
            ) : (
              <select
                value={salaryJobId}
                onChange={e => setSalaryJobId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="">— Fara post specific —</option>
                {jobs.map(j => (
                  <option key={j.id} value={j.id}>
                    {j.title}{j.code ? ` (${j.code})` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Salariu nou (RON brut)</label>
            <input
              type="number"
              value={newSalary}
              onChange={e => setNewSalary(e.target.value)}
              placeholder="ex. 5500"
              min={1}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <button
            onClick={handleSalarySim}
            disabled={salaryLoading || !newSalary}
            className="px-5 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {salaryLoading ? "Se simuleaza..." : "Simuleaza impact"}
          </button>

          {salaryError && (
            <div className="p-4 rounded-xl border border-red-200 bg-red-50">
              <p className="text-sm text-red-700">{salaryError}</p>
            </div>
          )}

          {salaryResult && (
            <div className="space-y-3">
              <div className={`p-4 rounded-xl border ${
                salaryResult.impact.after.aligned
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-amber-200 bg-amber-50"
              }`}>
                <h3 className="text-sm font-semibold text-foreground mb-2">Impact pay gap</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-text-secondary">Inainte</p>
                    <p className="text-lg font-bold text-foreground">{salaryResult.impact.before.gapPct}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-text-secondary">Dupa ajustare</p>
                    <p className={`text-lg font-bold ${
                      salaryResult.impact.delta < 0 ? "text-emerald-700" : salaryResult.impact.delta > 0 ? "text-red-700" : "text-foreground"
                    }`}>
                      {salaryResult.impact.after.gapPct}%
                      <span className="text-xs font-normal ml-1">
                        ({salaryResult.impact.delta > 0 ? "+" : ""}{salaryResult.impact.delta}%)
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {salaryResult.gradeCheck && (
                <div className={`p-4 rounded-xl border ${
                  salaryResult.gradeCheck.inRange
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-red-200 bg-red-50"
                }`}>
                  <h3 className="text-sm font-semibold text-foreground mb-1">Incadrare in grila</h3>
                  <p className="text-xs text-text-secondary">
                    Grad: <strong>{salaryResult.gradeCheck.gradeName}</strong> —
                    {salaryResult.gradeCheck.salaryMin != null && salaryResult.gradeCheck.salaryMax != null
                      ? ` ${salaryResult.gradeCheck.salaryMin.toLocaleString("ro-RO")} - ${salaryResult.gradeCheck.salaryMax.toLocaleString("ro-RO")} RON`
                      : " grila nedefinita"
                    }
                  </p>
                  <p className={`text-xs font-medium mt-1 ${
                    salaryResult.gradeCheck.inRange ? "text-emerald-700" : "text-red-700"
                  }`}>
                    {salaryResult.gradeCheck.inRange ? "Salariul se incadreaza in grila" : "Salariul este in afara grilei"}
                  </p>
                </div>
              )}

              <div className="p-4 rounded-xl border border-border bg-surface">
                <p className="text-sm text-text-secondary whitespace-pre-wrap">{salaryResult.summary}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════ TAB 2: Policy ═══════ */}
      {tab === "policy" && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Titlu politica</label>
            <input
              type="text"
              value={policyTitle}
              onChange={e => setPolicyTitle(e.target.value)}
              placeholder="ex. Politica de lucru remote 2026"
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Tip politica</label>
            <select
              value={policyType}
              onChange={e => setPolicyType(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {POLICY_TYPES.map(pt => (
                <option key={pt.value} value={pt.value}>{pt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Continutul politicii</label>
            <textarea
              value={policyContent}
              onChange={e => setPolicyContent(e.target.value)}
              rows={8}
              placeholder="Lipiti textul complet al politicii pentru verificare conformitate..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-y"
            />
          </div>
          <button
            onClick={handlePolicySim}
            disabled={policyLoading || !policyTitle.trim() || !policyContent.trim()}
            className="px-5 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {policyLoading ? "Se analizeaza..." : "Verifica conformitate"}
          </button>

          {policyError && (
            <div className="p-4 rounded-xl border border-red-200 bg-red-50">
              <p className="text-sm text-red-700">{policyError}</p>
            </div>
          )}

          {policyResult && (
            <div className="space-y-3">
              <div className={`p-4 rounded-xl border ${
                policyResult.compliant
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-red-200 bg-red-50"
              }`}>
                <h3 className={`text-lg font-bold ${
                  policyResult.compliant ? "text-emerald-700" : "text-red-700"
                }`}>
                  {policyResult.compliant ? "Politica conforma" : `${policyResult.issues.length} probleme identificate`}
                </h3>
              </div>

              {policyResult.issues.length > 0 && (
                <div className="space-y-2">
                  {policyResult.issues.map((issue, idx) => {
                    const sc = SEVERITY_COLORS[issue.severity] || SEVERITY_COLORS.MEDIUM
                    return (
                      <div key={idx} className={`p-3 rounded-xl border ${sc.border} ${sc.bg}`}>
                        <div className="flex items-start gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${sc.text} bg-white/60 shrink-0 mt-0.5`}>
                            {issue.severity}
                          </span>
                          <div>
                            <p className="text-xs font-medium text-foreground">{issue.law} — {issue.article}</p>
                            <p className="text-xs text-text-secondary mt-0.5">{issue.description}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {policyResult.recommendations.length > 0 && (
                <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50">
                  <h3 className="text-sm font-semibold text-indigo-700 mb-2">Recomandari</h3>
                  <ul className="space-y-1">
                    {policyResult.recommendations.map((rec, idx) => (
                      <li key={idx} className="text-xs text-indigo-600 flex gap-2">
                        <span className="shrink-0">-</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="p-4 rounded-xl border border-border bg-surface">
                <p className="text-sm text-text-secondary whitespace-pre-wrap">{policyResult.summary}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════ TAB 3: Grid ═══════ */}
      {tab === "grid" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-border bg-surface">
            <p className="text-sm text-text-secondary">
              Compara grila salariala actuala cu salariul minim pe economie, regulile de overtime si benchmark-ul de piata.
              Nu necesita date suplimentare — analiza se face pe baza gradelor existente.
            </p>
          </div>

          <button
            onClick={handleGridSim}
            disabled={gridLoading}
            className="px-5 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {gridLoading ? "Se compara..." : "Compara grila cu minimele legale"}
          </button>

          {gridError && (
            <div className="p-4 rounded-xl border border-red-200 bg-red-50">
              <p className="text-sm text-red-700">{gridError}</p>
            </div>
          )}

          {gridResult && (
            <div className="space-y-3">
              <div className={`p-4 rounded-xl border ${
                gridResult.compliant
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-red-200 bg-red-50"
              }`}>
                <h3 className={`text-lg font-bold ${
                  gridResult.compliant ? "text-emerald-700" : "text-red-700"
                }`}>
                  {gridResult.compliant ? "Grila conforma" : "Neconformitati in grila"}
                </h3>
                <p className={`text-xs mt-1 ${
                  gridResult.overtimeCompliant ? "text-emerald-600" : "text-amber-600"
                }`}>
                  Overtime: {gridResult.overtimeCompliant ? "conform Cod Muncii Art.123" : "necesita verificare"}
                </p>
              </div>

              {/* Grades table */}
              {gridResult.grades.length > 0 && (
                <div className="rounded-xl border border-border bg-surface overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-slate-50">
                        <th className="text-left px-3 py-2 font-medium text-text-secondary">Grad</th>
                        <th className="text-right px-3 py-2 font-medium text-text-secondary">Minim grila</th>
                        <th className="text-right px-3 py-2 font-medium text-text-secondary">Maxim grila</th>
                        <th className="text-right px-3 py-2 font-medium text-text-secondary">Minim legal</th>
                        <th className="text-center px-3 py-2 font-medium text-text-secondary">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gridResult.grades.map(grade => (
                        <tr key={grade.name} className="border-b border-border last:border-0">
                          <td className="px-3 py-2 font-medium text-foreground">{grade.name}</td>
                          <td className="px-3 py-2 text-right text-text-secondary">
                            {grade.salaryMin != null ? `${grade.salaryMin.toLocaleString("ro-RO")} RON` : "—"}
                          </td>
                          <td className="px-3 py-2 text-right text-text-secondary">
                            {grade.salaryMax != null ? `${grade.salaryMax.toLocaleString("ro-RO")} RON` : "—"}
                          </td>
                          <td className="px-3 py-2 text-right text-text-secondary">
                            {grade.legalMinimum.toLocaleString("ro-RO")} RON
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              grade.compliant
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-red-50 text-red-700 border border-red-200"
                            }`}>
                              {grade.compliant ? "OK" : "NOK"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Issues per grade */}
              {gridResult.grades.filter(g => g.issues.length > 0).length > 0 && (
                <div className="space-y-2">
                  {gridResult.grades.filter(g => g.issues.length > 0).map(grade => (
                    <div key={grade.name} className="p-3 rounded-xl border border-amber-200 bg-amber-50">
                      <p className="text-xs font-semibold text-amber-700 mb-1">{grade.name}</p>
                      {grade.issues.map((issue, idx) => (
                        <p key={idx} className="text-xs text-amber-600">- {issue}</p>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              <div className="p-4 rounded-xl border border-border bg-surface">
                <p className="text-sm text-text-secondary whitespace-pre-wrap">{gridResult.summary}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
