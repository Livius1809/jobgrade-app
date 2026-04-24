"use client"

import { useState } from "react"

interface SubFactor {
  name: string
  value: string | number
  status: "HEALTHY" | "WARNING" | "CRITICAL"
}

interface Alarm {
  message: string
  severity?: string
}

interface LayerData {
  key: string
  label: string
  status: "HEALTHY" | "WARNING" | "CRITICAL"
  subFactors: SubFactor[]
  alarmCount: number
  alarms: Alarm[]
}

const STATUS_DOT: Record<string, string> = {
  HEALTHY: "bg-emerald-500",
  WARNING: "bg-amber-400",
  CRITICAL: "bg-red-500 animate-pulse",
}

const STATUS_BORDER: Record<string, string> = {
  HEALTHY: "border-emerald-500/30",
  WARNING: "border-amber-400/40",
  CRITICAL: "border-red-500/40",
}

const STATUS_BG: Record<string, string> = {
  HEALTHY: "bg-white",
  WARNING: "bg-amber-50/50",
  CRITICAL: "bg-red-50/50",
}

const STATUS_LABEL: Record<string, string> = {
  HEALTHY: "Sănătos",
  WARNING: "Atenție",
  CRITICAL: "Critic",
}

const LAYER_DESCRIPTIONS: Record<string, string> = {
  awareness: "Percepția organismului: semnale externe, teme emergente, intervenții recente.",
  goals: "Obiectivele strategice și operaționale — starea de sănătate, progres, riscuri.",
  action: "Capacitatea de acțiune: taskuri active, rata de rezolvare, blocaje.",
  homeostasis: "Echilibrul intern: disfuncții detectate, remedieri în curs, stabilitate.",
  immune: "Sistemul imunitar: reguli de graniță, violări detectate, pattern-uri blocate.",
  metabolism: "Resursele: buget, credite API, consum, eficiență.",
  evolution: "Capacitatea de evoluție: brainstorming, idei noi, maturitate KB.",
  rhythm: "Ritmul organismului: cicluri manageriale, ritualuri, consistență.",
}

export default function LayerCardInteractive({ layer, icon }: { layer: LayerData; icon: string }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      className={`rounded-xl border ${STATUS_BORDER[layer.status]} ${STATUS_BG[layer.status]} shadow-sm hover:shadow-md transition-all cursor-pointer ${
        expanded ? "col-span-2 lg:col-span-2" : ""
      }`}
    >
      {/* Collapsed view */}
      <div className="p-3.5">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2.5">
          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 rounded px-1.5 py-0.5 uppercase tracking-wider">
            {icon}
          </span>
          <span className="text-xs font-semibold text-slate-800 flex-1 truncate">{layer.label}</span>
          <span className={`w-2 h-2 rounded-full ${STATUS_DOT[layer.status]}`} />
          <svg
            className={`w-3.5 h-3.5 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Sub-factors (always visible) */}
        <div className="space-y-1">
          {layer.subFactors.map((sf, i) => (
            <div key={i} className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500 truncate">{sf.name}</span>
              <span className={`font-mono font-medium ${
                sf.status === "CRITICAL" ? "text-red-600" :
                sf.status === "WARNING" ? "text-amber-600" :
                "text-slate-700"
              }`}>{typeof sf.value === "number" ? Math.round(sf.value) : sf.value}</span>
            </div>
          ))}
        </div>

        {/* Alarm preview (collapsed) */}
        {!expanded && layer.alarmCount > 0 && (
          <div className="mt-2 text-[10px] text-red-500 bg-red-50 rounded px-2 py-1 truncate">
            {layer.alarms[0]?.message}
          </div>
        )}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-slate-100 px-3.5 pb-3.5 pt-3 space-y-3">
          {/* Description */}
          <p className="text-xs text-slate-500 leading-relaxed">
            {LAYER_DESCRIPTIONS[layer.key] ?? ""}
          </p>

          {/* Status badge */}
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              layer.status === "CRITICAL" ? "bg-red-100 text-red-700" :
              layer.status === "WARNING" ? "bg-amber-100 text-amber-700" :
              "bg-emerald-100 text-emerald-700"
            }`}>
              {STATUS_LABEL[layer.status]}
            </span>
            <span className="text-[10px] text-slate-400">
              {layer.subFactors.filter(sf => sf.status === "CRITICAL").length} critice,{" "}
              {layer.subFactors.filter(sf => sf.status === "WARNING").length} atenție
            </span>
          </div>

          {/* All alarms */}
          {layer.alarmCount > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Alarme ({layer.alarmCount})
              </span>
              {layer.alarms.map((alarm, i) => (
                <div key={i} className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 leading-relaxed">
                  {alarm.message}
                </div>
              ))}
            </div>
          )}

          {/* Sub-factors detail bars */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Subfactori
            </span>
            {layer.subFactors.map((sf, i) => (
              <div key={i} className="space-y-0.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-600 font-medium">{sf.name}</span>
                  <span className={`font-mono font-bold ${
                    sf.status === "CRITICAL" ? "text-red-600" :
                    sf.status === "WARNING" ? "text-amber-600" :
                    "text-emerald-600"
                  }`}>{typeof sf.value === "number" ? Math.round(sf.value) : sf.value}</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      sf.status === "CRITICAL" ? "bg-red-500" :
                      sf.status === "WARNING" ? "bg-amber-400" :
                      "bg-emerald-500"
                    }`}
                    style={{
                      width: typeof sf.value === "number"
                        ? `${Math.min(100, Math.max(5, Number(sf.value)))}%`
                        : sf.status === "HEALTHY" ? "85%" : sf.status === "WARNING" ? "50%" : "20%"
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
