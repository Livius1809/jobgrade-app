"use client"

import { useState, useEffect } from "react"

// ── Types ──────────────────────────────────────────────────────────────────────

interface StrategicAdjustment {
  area: string
  recommendation: string
}

interface OrganismSelfValidationData {
  spiralVelocity: number
  autonomyTrend: "ACCELERATING" | "STEADY" | "DECELERATING"
  selfHealingRate: number
  escalationsToOwner: number
  escalationsTrend: number // delta vs last period
  selfAssessment: "EVOLVING" | "FUNCTIONAL" | "PLATEAUING" | "DETERIORATING"
  strategicAdjustments: StrategicAdjustment[]
}

// ── Config ─────────────────────────────────────────────────────────────────────

const ASSESSMENT_CONFIG = {
  EVOLVING: {
    label: "EVOLVING",
    bg: "bg-emerald-50 border-emerald-200",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
  },
  FUNCTIONAL: {
    label: "FUNCTIONAL",
    bg: "bg-sky-50 border-sky-200",
    text: "text-sky-700",
    dot: "bg-sky-500",
  },
  PLATEAUING: {
    label: "PLATEAUING",
    bg: "bg-amber-50 border-amber-200",
    text: "text-amber-700",
    dot: "bg-amber-500",
  },
  DETERIORATING: {
    label: "DETERIORATING",
    bg: "bg-red-50 border-red-200",
    text: "text-red-700",
    dot: "bg-red-500",
  },
} as const

const TREND_ARROW: Record<string, { symbol: string; label: string; color: string }> = {
  ACCELERATING: { symbol: "\u2191", label: "ACCELERATING", color: "text-emerald-600" },
  STEADY: { symbol: "\u2192", label: "STEADY", color: "text-slate-500" },
  DECELERATING: { symbol: "\u2193", label: "DECELERATING", color: "text-red-600" },
}

function velocityColor(v: number): string {
  if (v > 0.5) return "text-emerald-600"
  if (v > 0) return "text-emerald-500"
  if (v === 0) return "text-amber-500"
  if (v > -0.5) return "text-amber-600"
  return "text-red-600"
}

// ── Component ──────────────────────────────────────────────────────────────────

interface OrganismSelfValidationProps {
  serverData?: any // pre-loaded from server (Owner page SSR)
}

export default function OrganismSelfValidation({ serverData }: OrganismSelfValidationProps = {}) {
  const [data, setData] = useState<OrganismSelfValidationData | null>(null)
  const [loading, setLoading] = useState(!serverData)

  useEffect(() => {
    // If server already provided data, use it
    if (serverData) {
      const v = serverData.validation || serverData
      if (v.spiralVelocity !== undefined) {
        setData({
          spiralVelocity: v.spiralVelocity ?? 0,
          autonomyTrend: v.autonomyTrend90Days || v.autonomyTrend || "STEADY",
          selfHealingRate: v.selfHealingRate ?? 0,
          escalationsToOwner: v.escalationsToOwner ?? 0,
          escalationsTrend: v.escalationsTrend === "DECREASING" ? -1 : v.escalationsTrend === "INCREASING" ? 1 : 0,
          selfAssessment: v.selfAssessment || "FUNCTIONAL",
          strategicAdjustments: (v.strategicAdjustments || []).map((s: any) =>
            typeof s === "string" ? { area: "Organism", recommendation: s } : s
          ),
        })
      }
      setLoading(false)
      return
    }

    // Fallback: client-side fetch
    let cancelled = false
    async function load() {
      try {
        const res = await fetch("/api/v1/agents/self-validation?level=organism")
        if (!res.ok) { setLoading(false); return }
        const json = await res.json()
        const v = json.validation || json
        if (!cancelled && v.spiralVelocity !== undefined) {
          setData({
            spiralVelocity: v.spiralVelocity ?? 0,
            autonomyTrend: v.autonomyTrend90Days || v.autonomyTrend || "STEADY",
            selfHealingRate: v.selfHealingRate ?? 0,
            escalationsToOwner: v.escalationsToOwner ?? 0,
            escalationsTrend: v.escalationsTrend === "DECREASING" ? -1 : v.escalationsTrend === "INCREASING" ? 1 : 0,
            selfAssessment: v.selfAssessment || "FUNCTIONAL",
            strategicAdjustments: (v.strategicAdjustments || []).map((s: any) =>
              typeof s === "string" ? { area: "Organism", recommendation: s } : s
            ),
          })
        }
      } catch {}
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [serverData])

  if (loading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm animate-pulse">
        <div className="h-4 w-40 bg-slate-100 rounded mb-4" />
        <div className="h-12 w-24 bg-slate-100 rounded" />
      </section>
    )
  }

  if (!data) return null

  const assessment = ASSESSMENT_CONFIG[data.selfAssessment] || ASSESSMENT_CONFIG.FUNCTIONAL
  const trend = TREND_ARROW[data.autonomyTrend] || TREND_ARROW.STEADY

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-1">
            Self-Validation — Organism
          </h2>
          <p className="text-[10px] text-slate-400">
            Ce crede organismul despre propria evolutie
          </p>
        </div>
        <div className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider ${assessment.bg} ${assessment.text}`}>
          <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${assessment.dot}`} />
          {assessment.label}
        </div>
      </div>

      {/* ── Main metrics row ────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
        {/* spiralVelocity — hero number */}
        <div className="col-span-2 sm:col-span-1">
          <p className="text-[9px] uppercase tracking-wider text-slate-400 font-medium mb-1">
            Spiral Velocity
          </p>
          <p className={`text-3xl font-bold tabular-nums ${velocityColor(data.spiralVelocity)}`}>
            {data.spiralVelocity > 0 ? "+" : ""}{data.spiralVelocity.toFixed(2)}
          </p>
        </div>

        {/* autonomyTrend — arrow */}
        <div>
          <p className="text-[9px] uppercase tracking-wider text-slate-400 font-medium mb-1">
            Autonomy Trend
          </p>
          <p className={`text-2xl font-bold ${trend.color}`}>
            {trend.symbol}
            <span className="text-xs ml-1.5 font-medium">{trend.label}</span>
          </p>
        </div>

        {/* selfHealingRate */}
        <div>
          <p className="text-[9px] uppercase tracking-wider text-slate-400 font-medium mb-1">
            Self-Healing
          </p>
          <p className={`text-2xl font-bold tabular-nums ${
            data.selfHealingRate >= 80 ? "text-emerald-600" :
            data.selfHealingRate >= 50 ? "text-amber-600" : "text-red-600"
          }`}>
            {Math.round(data.selfHealingRate)}%
          </p>
        </div>

        {/* escalationsToOwner */}
        <div>
          <p className="text-[9px] uppercase tracking-wider text-slate-400 font-medium mb-1">
            Escalations
          </p>
          <div className="flex items-baseline gap-1.5">
            <p className={`text-2xl font-bold tabular-nums ${
              data.escalationsToOwner === 0 ? "text-emerald-600" :
              data.escalationsToOwner <= 3 ? "text-amber-600" : "text-red-600"
            }`}>
              {data.escalationsToOwner}
            </p>
            {data.escalationsTrend !== 0 && (
              <span className={`text-xs font-medium ${data.escalationsTrend > 0 ? "text-red-500" : "text-emerald-500"}`}>
                {data.escalationsTrend > 0 ? "+" : ""}{data.escalationsTrend}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Strategic adjustments ───────────────────────────── */}
      {data.strategicAdjustments.length > 0 && (
        <div className="border-t border-slate-100 pt-4">
          <p className="text-[9px] uppercase tracking-wider text-slate-400 font-medium mb-2">
            Ajustari strategice propuse
          </p>
          <ul className="space-y-1.5">
            {data.strategicAdjustments.map((adj, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                <span className="text-amber-500 mt-0.5 shrink-0">&#x25CF;</span>
                <span>
                  <span className="font-medium text-slate-700">{adj.area}:</span>{" "}
                  {adj.recommendation}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
