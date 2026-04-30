"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

interface Job {
  id: string
  title: string
  code: string | null
  department?: { name: string } | null
}

interface AuditIssue {
  field: string
  expected: string
  actual: string
  severity: "INFO" | "WARNING" | "CRITICAL"
  recommendation: string
}

interface AuditResult {
  coherent: boolean
  jobTitle: string
  issues: AuditIssue[]
  summary?: string
}

const SEVERITY_STYLES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  INFO: { label: "Info", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  WARNING: { label: "Atentie", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  CRITICAL: { label: "Critic", bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
}

export default function ContractAuditPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [selectedJobId, setSelectedJobId] = useState("")
  const [loadingJobs, setLoadingJobs] = useState(true)
  const [auditing, setAuditing] = useState(false)
  const [result, setResult] = useState<AuditResult | null>(null)
  const [error, setError] = useState<string | null>(null)

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

  async function handleAudit() {
    if (!selectedJobId) return
    setAuditing(true)
    setResult(null)
    setError(null)
    try {
      const res = await fetch("/api/v1/compliance/contract-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: selectedJobId }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setError(err.error || `Eroare ${res.status}`)
      } else {
        const data = await res.json()
        setResult(data)
      }
    } catch {
      setError("Eroare de conexiune. Incercati din nou.")
    }
    setAuditing(false)
  }

  const criticalCount = result?.issues.filter(i => i.severity === "CRITICAL").length || 0
  const warningCount = result?.issues.filter(i => i.severity === "WARNING").length || 0
  const infoCount = result?.issues.filter(i => i.severity === "INFO").length || 0

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-foreground">Audit conformitate contracte</h1>
        <Link href="/compliance" className="text-xs text-indigo-600 hover:underline">
          &larr; Portal conformitate
        </Link>
      </div>
      <p className="text-sm text-text-secondary mb-6">
        Verificati coerenta intre fisa postului, gradul salarial, grila si codul COR
      </p>

      {/* Job selector */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-foreground mb-1">Selectati postul</label>
        {loadingJobs ? (
          <p className="text-sm text-text-secondary">Se incarca posturile...</p>
        ) : jobs.length === 0 ? (
          <p className="text-sm text-text-secondary">Nu exista posturi definite. Adaugati posturi din sectiunea Posturi.</p>
        ) : (
          <select
            value={selectedJobId}
            onChange={e => { setSelectedJobId(e.target.value); setResult(null) }}
            className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">— Alegeti un post —</option>
            {jobs.map(job => (
              <option key={job.id} value={job.id}>
                {job.title}{job.code ? ` (${job.code})` : ""}{job.department ? ` — ${job.department.name}` : ""}
              </option>
            ))}
          </select>
        )}
      </div>

      <button
        onClick={handleAudit}
        disabled={auditing || !selectedJobId}
        className="px-5 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        {auditing ? "Se auditeaza..." : "Auditeaza"}
      </button>

      {/* Error */}
      {error && (
        <div className="mt-6 p-4 rounded-xl border border-red-200 bg-red-50">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="mt-6 space-y-4">
          {/* Overall status */}
          <div className={`p-4 rounded-xl border ${
            result.coherent
              ? "border-emerald-200 bg-emerald-50"
              : criticalCount > 0
                ? "border-red-200 bg-red-50"
                : "border-amber-200 bg-amber-50"
          }`}>
            <h2 className={`text-lg font-bold ${
              result.coherent ? "text-emerald-700"
              : criticalCount > 0 ? "text-red-700"
              : "text-amber-700"
            }`}>
              {result.coherent ? "Contract coerent" : `${result.issues.length} probleme identificate`}
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              Post auditat: <strong>{result.jobTitle}</strong>
            </p>
            {result.issues.length > 0 && (
              <div className="flex gap-3 mt-2">
                {criticalCount > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">
                    {criticalCount} critice
                  </span>
                )}
                {warningCount > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">
                    {warningCount} atentie
                  </span>
                )}
                {infoCount > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">
                    {infoCount} informative
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Issues list */}
          {result.issues.length > 0 && (
            <div className="space-y-3">
              {result.issues.map((issue, idx) => {
                const style = SEVERITY_STYLES[issue.severity] || SEVERITY_STYLES.INFO
                return (
                  <div key={idx} className={`p-4 rounded-xl border ${style.border} ${style.bg}`}>
                    <div className="flex items-start gap-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${style.text} bg-white/60 shrink-0 mt-0.5`}>
                        {style.label}
                      </span>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-foreground">{issue.field}</h3>
                        <div className="mt-1 space-y-1">
                          <p className="text-xs text-text-secondary">
                            <span className="font-medium">Asteptat:</span> {issue.expected}
                          </p>
                          <p className="text-xs text-text-secondary">
                            <span className="font-medium">Gasit:</span> {issue.actual}
                          </p>
                        </div>
                        <div className="mt-2 p-2 rounded-lg bg-white/40 border border-black/5">
                          <p className="text-xs text-foreground">
                            <span className="font-medium">Recomandare:</span> {issue.recommendation}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Summary */}
          {result.summary && (
            <div className="p-4 rounded-xl border border-border bg-surface">
              <h3 className="text-sm font-semibold text-foreground mb-2">Sumar</h3>
              <p className="text-sm text-text-secondary whitespace-pre-wrap">{result.summary}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
