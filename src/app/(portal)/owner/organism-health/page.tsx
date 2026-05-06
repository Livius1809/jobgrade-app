"use client"

import { useState, useEffect } from "react"
import OrganismSelfValidation from "@/components/dashboard/OrganismSelfValidation"

interface Check {
  component: string
  status: "VERDE" | "GALBEN" | "ROSU"
  detail: string
  metric?: number
}

interface HealthData {
  timestamp: string
  verdict: string
  summary: { verde: number; galben: number; rosu: number; total: number }
  checks: Check[]
}

const STATUS_STYLES = {
  VERDE: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-400", label: "OK" },
  GALBEN: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", dot: "bg-amber-400", label: "Atentie" },
  ROSU: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", dot: "bg-red-400", label: "Problema" },
}

const VERDICT_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  SANATOS: { bg: "bg-emerald-100", text: "text-emerald-800", label: "Organismul functioneaza normal" },
  ATENTIE: { bg: "bg-amber-100", text: "text-amber-800", label: "Atentie — unele sisteme necesita monitorizare" },
  PROBLEME: { bg: "bg-red-100", text: "text-red-800", label: "Probleme detectate — actiuni necesare" },
}

export default function OrganismHealthPage() {
  const [data, setData] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<string>("")

  async function loadData() {
    setLoading(true)
    try {
      const res = await fetch("/api/v1/organism-health", {
        headers: { "x-internal-key": "from-session" },
      })
      if (res.ok) {
        const d = await res.json()
        setData(d)
        setLastRefresh(new Date().toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" }))
      }
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 5 * 60 * 1000) // auto-refresh 5 min
    return () => clearInterval(interval)
  }, [])

  if (loading && !data) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4">
        <p className="text-sm text-slate-500">Se incarca diagnosticul...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4">
        <p className="text-sm text-red-500">Eroare la incarcarea diagnosticului. Verificati autentificarea.</p>
      </div>
    )
  }

  const verdictStyle = VERDICT_STYLES[data.verdict] || VERDICT_STYLES.PROBLEME

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <a href="/owner" className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 mb-4">
        <span>←</span> Dashboard
      </a>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Sanatate organism</h1>
          <p className="text-sm text-slate-500 mt-1">Diagnostic complet — auto-refresh la 5 min</p>
        </div>
        <div className="text-right">
          <button onClick={loadData} disabled={loading}
            className="text-xs font-medium bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-40">
            {loading ? "..." : "Actualizeaza"}
          </button>
          <p className="text-[9px] text-slate-400 mt-1">Ultima: {lastRefresh || "—"}</p>
        </div>
      </div>

      {/* Verdict */}
      <div className={`rounded-xl p-4 mb-6 ${verdictStyle.bg}`}>
        <div className="flex items-center justify-between">
          <p className={`text-sm font-bold ${verdictStyle.text}`}>{verdictStyle.label}</p>
          <div className="flex gap-3">
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <span className="text-xs font-bold text-emerald-700">{data.summary.verde}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
              <span className="text-xs font-bold text-amber-700">{data.summary.galben}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
              <span className="text-xs font-bold text-red-700">{data.summary.rosu}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Self-Validation — Organism Pulse */}
      <div className="mb-6">
        <OrganismSelfValidation />
      </div>

      {/* Checks — ROSU first, apoi GALBEN, apoi VERDE */}
      <div className="space-y-2">
        {[...data.checks]
          .sort((a, b) => {
            const order = { ROSU: 0, GALBEN: 1, VERDE: 2 }
            return order[a.status] - order[b.status]
          })
          .map((check, i) => {
            const st = STATUS_STYLES[check.status]
            return (
              <div key={i} className={`rounded-lg border p-3 ${st.bg} ${st.border}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${st.dot}`}></span>
                    <span className={`text-xs font-bold ${st.text}`}>{st.label}</span>
                    <span className="text-sm font-medium text-slate-800">{check.component}</span>
                  </div>
                  {check.metric !== undefined && check.metric >= 0 && (
                    <span className="text-xs font-mono text-slate-500">{check.metric}</span>
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-1 ml-5">{check.detail}</p>
              </div>
            )
          })}
      </div>

      {/* Timestamp */}
      <p className="text-[9px] text-slate-400 text-center mt-6">
        Generat: {new Date(data.timestamp).toLocaleString("ro-RO")}
      </p>
    </div>
  )
}
