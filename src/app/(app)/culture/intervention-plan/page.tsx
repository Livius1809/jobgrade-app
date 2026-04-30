"use client"

import { useState } from "react"
import Link from "next/link"

interface PlanAction {
  action: string
  responsible: string
  kpi: string
  deadline: string
}

interface PlanLevel {
  level: string
  actions: PlanAction[]
}

interface InterventionResult {
  levels: PlanLevel[]
  estimatedInvestment: number
  projectedRoi: number
}

const TIMELINE_OPTIONS = [
  { value: "6M", label: "6 luni" },
  { value: "12M", label: "12 luni" },
  { value: "24M", label: "24 luni" },
]

const LEVEL_LABELS: Record<string, string> = {
  strategic: "Strategic",
  tactic: "Tactic",
  operational: "Operational",
  individual: "Individual",
  transversal: "Transversal",
}

export default function InterventionPlanPage() {
  const [objectives, setObjectives] = useState("")
  const [timeline, setTimeline] = useState("12M")
  const [result, setResult] = useState<InterventionResult | null>(null)
  const [running, setRunning] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  async function generatePlan() {
    setRunning(true)
    setResult(null)
    try {
      const payload: Record<string, unknown> = { timeline }
      if (objectives.trim()) payload.objectives = objectives

      const res = await fetch("/api/v1/culture/intervention-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const data = await res.json()
        setResult(data.result || data)
        // expand all levels by default
        const exp: Record<string, boolean> = {}
        const levels = (data.result || data).levels || []
        levels.forEach((l: PlanLevel) => { exp[l.level] = true })
        setExpanded(exp)
      }
    } catch { /* silent */ }
    setRunning(false)
  }

  function toggleLevel(level: string) {
    setExpanded((prev) => ({ ...prev, [level]: !prev[level] }))
  }

  function formatCurrency(value: number) {
    return new Intl.NumberFormat("ro-RO", {
      style: "currency",
      currency: "RON",
      maximumFractionDigits: 0,
    }).format(value)
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Plan interventie multi-nivel
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Actiuni structurate pe 5 niveluri organizationale
          </p>
        </div>
        <Link
          href="/portal"
          className="text-sm text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          &larr; Portal
        </Link>
      </div>

      {/* Inputs */}
      <div className="rounded-lg border border-border bg-surface p-5 mb-6">
        <div className="mb-4">
          <label className="block text-xs text-text-secondary mb-1">
            Obiective strategice (optional)
          </label>
          <textarea
            value={objectives}
            onChange={(e) => setObjectives(e.target.value)}
            rows={3}
            placeholder="Descrieti obiectivele strategice ale organizatiei..."
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground resize-none"
          />
        </div>

        <div className="mb-4">
          <label className="block text-xs text-text-secondary mb-1">
            Orizont de timp
          </label>
          <div className="flex gap-2">
            {TIMELINE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTimeline(opt.value)}
                className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                  timeline === opt.value
                    ? "border-amber-600 bg-amber-50 text-amber-700 font-medium"
                    : "border-border bg-surface text-text-secondary hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={generatePlan}
          disabled={running}
          className="text-sm font-medium bg-amber-600 text-white px-5 py-2 rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
        >
          {running ? "Se genereaza..." : "Genereaza plan"}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div>
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="rounded-lg border border-border bg-surface p-4 text-center">
              <span className="text-xs text-text-secondary">Investitie estimata</span>
              <div className="text-2xl font-bold text-amber-600 mt-1">
                {formatCurrency(result.estimatedInvestment)}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-surface p-4 text-center">
              <span className="text-xs text-text-secondary">ROI proiectat</span>
              <div className="text-2xl font-bold text-emerald-600 mt-1">
                {result.projectedRoi}%
              </div>
            </div>
          </div>

          {/* Levels */}
          <h2 className="text-sm font-semibold text-foreground mb-3">
            Plan pe niveluri
          </h2>
          <div className="space-y-3">
            {result.levels.map((lvl, idx) => (
              <div key={idx} className="rounded-lg border border-border bg-surface overflow-hidden">
                <button
                  onClick={() => toggleLevel(lvl.level)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm font-semibold text-foreground">
                    {LEVEL_LABELS[lvl.level] || lvl.level}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-secondary">
                      {lvl.actions.length} actiuni
                    </span>
                    <span className="text-text-secondary text-xs">
                      {expanded[lvl.level] ? "▲" : "▼"}
                    </span>
                  </div>
                </button>

                {expanded[lvl.level] && lvl.actions.length > 0 && (
                  <div className="border-t border-border overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-left">
                          <th className="px-4 py-2 text-xs font-medium text-text-secondary">Actiune</th>
                          <th className="px-4 py-2 text-xs font-medium text-text-secondary">Responsabil</th>
                          <th className="px-4 py-2 text-xs font-medium text-text-secondary">KPI</th>
                          <th className="px-4 py-2 text-xs font-medium text-text-secondary">Termen</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lvl.actions.map((act, ai) => (
                          <tr key={ai} className="border-t border-border/50">
                            <td className="px-4 py-2 text-foreground">{act.action}</td>
                            <td className="px-4 py-2 text-text-secondary">{act.responsible}</td>
                            <td className="px-4 py-2 text-text-secondary">{act.kpi}</td>
                            <td className="px-4 py-2 text-text-secondary whitespace-nowrap">{act.deadline}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
