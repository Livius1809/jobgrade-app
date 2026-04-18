"use client"

import type { ClassDetection } from "@/lib/evaluation/pitariu-grades"

interface Props {
  classDetection: ClassDetection
  effectiveClassCount: number
  userClassCount: number | null
  onClassCountChange: (count: number | null) => void
  effectiveStepCount: number
  userStepCount: number | null
  onStepCountChange: (count: number | null) => void
}

const DISPERSION_LEVELS = [
  {
    id: "low",
    label: "Dispersie redusă",
    cvRange: "sub 15%",
    cvMax: 15,
    classes: "3 – 5",
    bgActive: "bg-emerald-50 border-emerald-300",
    bgInactive: "bg-slate-50/50 border-slate-200",
    dot: "bg-emerald-500",
    description: "Scorurile de evaluare sunt concentrate. Posturile au complexitate similară. Un număr mic de clase este suficient pentru a diferenția nivelurile salariale.",
  },
  {
    id: "medium",
    label: "Dispersie moderată",
    cvRange: "15% – 30%",
    cvMax: 30,
    classes: "5 – 7",
    bgActive: "bg-amber-50 border-amber-300",
    bgInactive: "bg-slate-50/50 border-slate-200",
    dot: "bg-amber-500",
    description: "Scorurile sunt distribuite echilibrat. Există diferențe clare între posturi, dar fără extreme. Se recomandă un număr moderat de clase pentru a reflecta diversitatea posturilor.",
  },
  {
    id: "high",
    label: "Dispersie mare",
    cvRange: "peste 30%",
    cvMax: Infinity,
    classes: "7 – 11",
    bgActive: "bg-red-50 border-red-300",
    bgInactive: "bg-slate-50/50 border-slate-200",
    dot: "bg-red-500",
    description: "Scorurile variază semnificativ. Organizația are posturi cu complexitate foarte diferită. Un număr mai mare de clase permite o structură salarială mai nuanțată și mai echitabilă.",
  },
] as const

const DEFAULT_STEP_COUNT = 4

export default function ClassCountSelector({ classDetection, effectiveClassCount, userClassCount, onClassCountChange, effectiveStepCount, userStepCount, onStepCountChange }: Props) {
  const activeLevel = classDetection.cvPercent < 15 ? "low" : classDetection.cvPercent < 30 ? "medium" : "high"

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Structura salarială</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Clase formate pe baza dispersiei salariilor din statul dvs.
          </p>
        </div>

        {/* Selectoare nr. clase + nr. trepte */}
        <div className="flex items-center gap-4 shrink-0">
          {/* Nr. clase */}
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-slate-500 font-medium">Clase:</label>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  const next = effectiveClassCount - 1
                  if (next >= 3) onClassCountChange(next)
                }}
                disabled={effectiveClassCount <= 3}
                className="w-6 h-6 rounded text-xs font-bold bg-slate-100 hover:bg-indigo-100 active:bg-indigo-200 disabled:opacity-30 text-slate-700 flex items-center justify-center transition-colors"
              >
                −
              </button>
              <span className="text-sm font-bold text-indigo-600 w-6 text-center tabular-nums">
                {effectiveClassCount}
              </span>
              <button
                onClick={() => {
                  const next = effectiveClassCount + 1
                  if (next <= 11) onClassCountChange(next)
                }}
                disabled={effectiveClassCount >= 11}
                className="w-6 h-6 rounded text-xs font-bold bg-slate-100 hover:bg-indigo-100 active:bg-indigo-200 disabled:opacity-30 text-slate-700 flex items-center justify-center transition-colors"
              >
                +
              </button>
            </div>
            {userClassCount !== null && userClassCount !== classDetection.suggested && (
              <button
                onClick={() => onClassCountChange(null)}
                className="text-[9px] text-slate-400 hover:text-indigo-500 underline"
              >
                reset
              </button>
            )}
          </div>

          {/* Separator */}
          <div className="w-px h-5 bg-slate-200" />

          {/* Nr. trepte */}
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-slate-500 font-medium">Trepte:</label>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  const next = effectiveStepCount - 1
                  if (next >= 2) onStepCountChange(next)
                }}
                disabled={effectiveStepCount <= 2}
                className="w-6 h-6 rounded text-xs font-bold bg-slate-100 hover:bg-violet-100 active:bg-violet-200 disabled:opacity-30 text-slate-700 flex items-center justify-center transition-colors"
              >
                −
              </button>
              <span className="text-sm font-bold text-violet-600 w-6 text-center tabular-nums">
                {effectiveStepCount}
              </span>
              <button
                onClick={() => {
                  const next = effectiveStepCount + 1
                  if (next <= 10) onStepCountChange(next)
                }}
                disabled={effectiveStepCount >= 10}
                className="w-6 h-6 rounded text-xs font-bold bg-slate-100 hover:bg-violet-100 active:bg-violet-200 disabled:opacity-30 text-slate-700 flex items-center justify-center transition-colors"
              >
                +
              </button>
            </div>
            {userStepCount !== null && userStepCount !== DEFAULT_STEP_COUNT && (
              <button
                onClick={() => onStepCountChange(null)}
                className="text-[9px] text-slate-400 hover:text-violet-500 underline"
              >
                reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Ghid dispersie — 3 niveluri */}
      <div className="flex gap-2">
        {DISPERSION_LEVELS.map(level => {
          const isActive = level.id === activeLevel
          return (
            <div
              key={level.id}
              className={`flex-1 rounded-lg border px-3 py-2 transition-all ${
                isActive ? level.bgActive + " shadow-sm" : level.bgInactive + " opacity-60"
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`w-2 h-2 rounded-full ${level.dot}`} />
                <span className={`text-[10px] font-bold ${isActive ? "text-slate-800" : "text-slate-500"}`}>
                  {level.label}
                </span>
              </div>
              <div className="text-[9px] text-slate-500 leading-snug">
                <span className="font-medium">CV {level.cvRange}</span>
                <span className="mx-1">·</span>
                <span>{level.classes} clase recomandate</span>
              </div>
              {isActive && (
                <p className="text-[9px] text-slate-600 mt-1.5 leading-relaxed">
                  {level.description}
                </p>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-[9px] text-slate-400 text-right">
        Organizația dvs.: CV = {classDetection.cvPercent}% · {effectiveClassCount} clase × {effectiveStepCount} trepte · sugestie: {classDetection.suggested} clase
      </p>
    </div>
  )
}
