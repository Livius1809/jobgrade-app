"use client"

import { useState, useEffect } from "react"

// ── Types ──────────────────────────────────────────────────────────────────────

interface AgentSelfValidationData {
  selfAssessment: "GROWING" | "COMPETENT" | "STAGNATING" | "DECLINING"
  autonomyRate: number   // 0-100
  kbHitRate: number      // 0-100
  qualityTrend: "IMPROVING" | "STABLE" | "DECLINING"
  adjustmentNeeded: string[]
  knowledgeGaps: string[]
}

interface AgentSelfMirrorProps {
  agentRole: string
}

// ── Config ─────────────────────────────────────────────────────────────────────

const ASSESSMENT_STYLE = {
  GROWING: { label: "GROWING", bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500" },
  COMPETENT: { label: "COMPETENT", bg: "bg-sky-50", border: "border-sky-200", text: "text-sky-700", dot: "bg-sky-500" },
  STAGNATING: { label: "STAGNATING", bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", dot: "bg-amber-500" },
  DECLINING: { label: "DECLINING", bg: "bg-red-50", border: "border-red-200", text: "text-red-700", dot: "bg-red-500" },
} as const

const QUALITY_ARROW: Record<string, { symbol: string; color: string }> = {
  IMPROVING: { symbol: "\u2191", color: "text-emerald-600" },
  STABLE: { symbol: "\u2192", color: "text-slate-500" },
  DECLINING: { symbol: "\u2193", color: "text-red-600" },
}

function rateColor(rate: number): string {
  if (rate >= 70) return "text-emerald-600"
  if (rate >= 40) return "text-amber-600"
  return "text-red-600"
}

function barColor(rate: number): string {
  if (rate >= 70) return "bg-emerald-500"
  if (rate >= 40) return "bg-amber-400"
  return "bg-red-500"
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function AgentSelfMirror({ agentRole }: AgentSelfMirrorProps) {
  const [data, setData] = useState<AgentSelfValidationData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch(
          `/api/v1/agents/self-validation?level=agent&role=${encodeURIComponent(agentRole)}`
        )
        if (!res.ok) { setLoading(false); return }
        const json = await res.json()
        if (!cancelled) setData(json)
      } catch {
        // graceful — component just won't render
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [agentRole])

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 animate-pulse">
        <div className="h-3 w-28 bg-slate-100 rounded mb-3" />
        <div className="h-8 w-16 bg-slate-100 rounded" />
      </div>
    )
  }

  if (!data) return null

  const assessment = ASSESSMENT_STYLE[data.selfAssessment] || ASSESSMENT_STYLE.COMPETENT
  const quality = QUALITY_ARROW[data.qualityTrend] || QUALITY_ARROW.STABLE

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
          Self-Mirror
        </h3>
        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${assessment.bg} ${assessment.border} ${assessment.text}`}>
          <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${assessment.dot}`} />
          {assessment.label}
        </span>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        {/* Autonomy — circular progress approximated with ring */}
        <div>
          <p className="text-[8px] uppercase tracking-wider text-slate-400 mb-1">Autonomie</p>
          <div className="relative w-12 h-12 mx-auto">
            <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="20" fill="none" stroke="#e2e8f0" strokeWidth="4" />
              <circle
                cx="24" cy="24" r="20" fill="none"
                stroke={data.autonomyRate >= 70 ? "#10b981" : data.autonomyRate >= 40 ? "#f59e0b" : "#ef4444"}
                strokeWidth="4"
                strokeDasharray={`${(data.autonomyRate / 100) * 125.6} 125.6`}
                strokeLinecap="round"
              />
            </svg>
            <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${rateColor(data.autonomyRate)}`}>
              {Math.round(data.autonomyRate)}%
            </span>
          </div>
        </div>

        {/* KB Hit Rate */}
        <div>
          <p className="text-[8px] uppercase tracking-wider text-slate-400 mb-1">KB Hit</p>
          <p className={`text-lg font-bold tabular-nums ${rateColor(data.kbHitRate)}`}>
            {Math.round(data.kbHitRate)}%
          </p>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
            <div
              className={`h-full rounded-full ${barColor(data.kbHitRate)}`}
              style={{ width: `${Math.min(data.kbHitRate, 100)}%` }}
            />
          </div>
        </div>

        {/* Quality Trend */}
        <div>
          <p className="text-[8px] uppercase tracking-wider text-slate-400 mb-1">Calitate</p>
          <p className={`text-lg font-bold ${quality.color}`}>
            {quality.symbol}
            <span className="text-[10px] ml-1">{data.qualityTrend}</span>
          </p>
        </div>
      </div>

      {/* Adjustments needed */}
      {data.adjustmentNeeded.length > 0 && (
        <div className="border-t border-slate-100 pt-2 mb-2">
          <p className="text-[8px] uppercase tracking-wider text-slate-400 mb-1">Ajustari necesare</p>
          <ul className="space-y-0.5">
            {data.adjustmentNeeded.map((adj, i) => (
              <li key={i} className="text-[10px] text-slate-600 flex items-start gap-1.5">
                <span className="text-amber-500 mt-0.5 shrink-0">&#x25CF;</span>
                {adj}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Knowledge gaps as tags */}
      {data.knowledgeGaps.length > 0 && (
        <div className="border-t border-slate-100 pt-2">
          <p className="text-[8px] uppercase tracking-wider text-slate-400 mb-1">Lacune cunoastere</p>
          <div className="flex flex-wrap gap-1">
            {data.knowledgeGaps.map((gap, i) => (
              <span key={i} className="text-[9px] bg-red-50 text-red-600 border border-red-200 rounded px-1.5 py-0.5">
                {gap}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
