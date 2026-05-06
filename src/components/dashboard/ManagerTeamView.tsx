"use client"

import { useState, useEffect } from "react"

// ── Types ──────────────────────────────────────────────────────────────────────

interface TeamMember {
  role: string
  selfAssessment: "GROWING" | "COMPETENT" | "STAGNATING" | "DECLINING"
}

interface ManagerTeamValidationData {
  teamAutonomyRate: number
  teamAutonomyTrend: "IMPROVING" | "STABLE" | "DECLINING"
  teamMembers: TeamMember[]
  weakestLink: { role: string; reason: string } | null
  strongestGrower: { role: string; reason: string } | null
  systematicGaps: string[]
  selfAssessment: "EFFECTIVE_LEADER" | "COMPETENT_MANAGER" | "NEEDS_ADJUSTMENT" | "BOTTLENECK"
}

interface ManagerTeamViewProps {
  managerRole: string
}

// ── Config ─────────────────────────────────────────────────────────────────────

const MANAGER_ASSESSMENT = {
  EFFECTIVE_LEADER: { label: "EFFECTIVE LEADER", bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700" },
  COMPETENT_MANAGER: { label: "COMPETENT MANAGER", bg: "bg-sky-50", border: "border-sky-200", text: "text-sky-700" },
  NEEDS_ADJUSTMENT: { label: "NEEDS ADJUSTMENT", bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" },
  BOTTLENECK: { label: "BOTTLENECK", bg: "bg-red-50", border: "border-red-200", text: "text-red-700" },
} as const

const MEMBER_DOT: Record<string, string> = {
  GROWING: "bg-emerald-500",
  COMPETENT: "bg-sky-500",
  STAGNATING: "bg-amber-500",
  DECLINING: "bg-red-500",
}

const TREND_ICON: Record<string, { symbol: string; color: string }> = {
  IMPROVING: { symbol: "\u2191", color: "text-emerald-600" },
  STABLE: { symbol: "\u2192", color: "text-slate-500" },
  DECLINING: { symbol: "\u2193", color: "text-red-600" },
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function ManagerTeamView({ managerRole }: ManagerTeamViewProps) {
  const [data, setData] = useState<ManagerTeamValidationData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch(
          `/api/v1/agents/self-validation?level=manager&role=${encodeURIComponent(managerRole)}`
        )
        if (!res.ok) { setLoading(false); return }
        const json = await res.json()
        if (!cancelled) setData(json)
      } catch {
        // graceful
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [managerRole])

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 animate-pulse">
        <div className="h-4 w-36 bg-slate-100 rounded mb-4" />
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-10 bg-slate-100 rounded" />
          ))}
        </div>
      </div>
    )
  }

  if (!data) return null

  const assessment = MANAGER_ASSESSMENT[data.selfAssessment] || MANAGER_ASSESSMENT.COMPETENT_MANAGER
  const trend = TREND_ICON[data.teamAutonomyTrend] || TREND_ICON.STABLE

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
            Team View — {managerRole}
          </h3>
        </div>
        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider border ${assessment.bg} ${assessment.border} ${assessment.text}`}>
          {assessment.label}
        </span>
      </div>

      {/* Team autonomy */}
      <div className="flex items-center gap-4 mb-4">
        <div>
          <p className="text-[9px] uppercase tracking-wider text-slate-400 font-medium mb-1">
            Team Autonomy
          </p>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold tabular-nums ${
              data.teamAutonomyRate >= 70 ? "text-emerald-600" :
              data.teamAutonomyRate >= 40 ? "text-amber-600" : "text-red-600"
            }`}>
              {Math.round(data.teamAutonomyRate)}%
            </span>
            <span className={`text-sm font-bold ${trend.color}`}>
              {trend.symbol}
            </span>
          </div>
        </div>

        {/* Team autonomy bar */}
        <div className="flex-1">
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                data.teamAutonomyRate >= 70 ? "bg-emerald-500" :
                data.teamAutonomyRate >= 40 ? "bg-amber-400" : "bg-red-500"
              }`}
              style={{ width: `${Math.min(data.teamAutonomyRate, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Team members grid */}
      {data.teamMembers.length > 0 && (
        <div className="mb-4">
          <p className="text-[9px] uppercase tracking-wider text-slate-400 font-medium mb-2">
            Membri echipa
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {data.teamMembers.map((member) => (
              <div
                key={member.role}
                className="flex items-center gap-1.5 rounded-lg bg-slate-50 border border-slate-100 px-2 py-1.5"
                title={`${member.role}: ${member.selfAssessment}`}
              >
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${MEMBER_DOT[member.selfAssessment] || "bg-slate-300"}`} />
                <span className="text-[10px] font-mono text-slate-700 truncate">{member.role}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Highlights row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {/* Weakest link */}
        {data.weakestLink && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="text-[9px] uppercase tracking-wider text-red-400 font-bold mb-1">Necesita atentie</p>
            <p className="text-xs font-medium text-red-700">{data.weakestLink.role}</p>
            <p className="text-[10px] text-red-600 mt-0.5">{data.weakestLink.reason}</p>
          </div>
        )}

        {/* Strongest grower */}
        {data.strongestGrower && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
            <p className="text-[9px] uppercase tracking-wider text-emerald-400 font-bold mb-1">Crestere remarcabila</p>
            <p className="text-xs font-medium text-emerald-700">{data.strongestGrower.role}</p>
            <p className="text-[10px] text-emerald-600 mt-0.5">{data.strongestGrower.reason}</p>
          </div>
        )}
      </div>

      {/* Systematic gaps */}
      {data.systematicGaps.length > 0 && (
        <div className="border-t border-slate-100 pt-3">
          <p className="text-[9px] uppercase tracking-wider text-slate-400 font-medium mb-2">
            Lacune sistematice
          </p>
          <ul className="space-y-1">
            {data.systematicGaps.map((gap, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[10px] text-slate-600">
                <span className="text-amber-500 mt-0.5 shrink-0">&#x25CF;</span>
                {gap}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
