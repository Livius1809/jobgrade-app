"use client"

/**
 * CardPipeline — Vizualizare pipeline per card B2B (C1-C4)
 *
 * Arată fazele unui card ca un flux vizual cu deblocare progresivă.
 * Fiecare fază: nume, status (locked/active/done), progres, ce lipsește.
 *
 * Reutilizabil pentru toate cardurile — primește configurația ca prop.
 */

import { useState } from "react"

export interface PipelinePhase {
  id: string           // F1, F2, etc.
  name: string         // "Fișe de post"
  description: string  // ce face faza
  status: "LOCKED" | "ACTIVE" | "IN_PROGRESS" | "DONE"
  progress?: number    // 0-100 (opțional, pentru faze parțiale)
  detail?: string      // "3/5 posturi definite" sau "Lipsesc date salariale"
  actionLabel?: string // "Adaugă posturi" / "Pornește evaluarea"
  actionUrl?: string   // link la pagina relevantă
  missingInputs?: string[] // ce inputuri lipsesc pentru deblocare
}

/**
 * Gradient per card: fazele progresează de la culoarea inputului (cardul anterior)
 * la culoarea outputului (cardul curent).
 *
 * C1: slate → indigo
 * C2: indigo → violet
 * C3: violet → rose
 * C4: rose → amber
 */

// Pași de gradient per card: [inputColor, ...intermediate, outputColor]
const CARD_GRADIENTS: Record<string, Array<{
  bg: string; border: string; dot: string; text: string; line: string
}>> = {
  C1: [
    { bg: "bg-slate-50",    border: "border-slate-300",    dot: "bg-slate-400",    text: "text-slate-600",  line: "bg-slate-300" },
    { bg: "bg-slate-100",   border: "border-indigo-200",   dot: "bg-indigo-300",   text: "text-indigo-500", line: "bg-indigo-200" },
    { bg: "bg-indigo-50",   border: "border-indigo-300",   dot: "bg-indigo-400",   text: "text-indigo-600", line: "bg-indigo-300" },
    { bg: "bg-indigo-100",  border: "border-indigo-400",   dot: "bg-indigo-500",   text: "text-indigo-700", line: "bg-indigo-400" },
  ],
  C2: [
    { bg: "bg-indigo-50",   border: "border-indigo-300",   dot: "bg-indigo-400",   text: "text-indigo-600", line: "bg-indigo-300" },
    { bg: "bg-indigo-50",   border: "border-violet-200",   dot: "bg-violet-300",   text: "text-violet-500", line: "bg-violet-200" },
    { bg: "bg-violet-50",   border: "border-violet-300",   dot: "bg-violet-400",   text: "text-violet-600", line: "bg-violet-300" },
    { bg: "bg-violet-50",   border: "border-violet-300",   dot: "bg-violet-450",   text: "text-violet-600", line: "bg-violet-350" },
    { bg: "bg-violet-100",  border: "border-violet-400",   dot: "bg-violet-500",   text: "text-violet-700", line: "bg-violet-400" },
  ],
  C3: [
    { bg: "bg-violet-50",   border: "border-violet-300",   dot: "bg-violet-400",   text: "text-violet-600", line: "bg-violet-300" },
    { bg: "bg-violet-50",   border: "border-fuchsia-200",  dot: "bg-fuchsia-300",  text: "text-fuchsia-500",line: "bg-fuchsia-200" },
    { bg: "bg-fuchsia-50",  border: "border-fuchsia-300",  dot: "bg-fuchsia-400",  text: "text-fuchsia-600",line: "bg-fuchsia-300" },
    { bg: "bg-pink-50",     border: "border-pink-300",     dot: "bg-pink-400",     text: "text-pink-600",   line: "bg-pink-300" },
    { bg: "bg-rose-50",     border: "border-rose-300",     dot: "bg-rose-400",     text: "text-rose-600",   line: "bg-rose-300" },
    { bg: "bg-rose-50",     border: "border-rose-300",     dot: "bg-rose-450",     text: "text-rose-600",   line: "bg-rose-350" },
    { bg: "bg-rose-50",     border: "border-rose-300",     dot: "bg-rose-400",     text: "text-rose-600",   line: "bg-rose-300" },
    { bg: "bg-rose-100",    border: "border-rose-400",     dot: "bg-rose-500",     text: "text-rose-700",   line: "bg-rose-400" },
  ],
  C4: [
    { bg: "bg-rose-50",     border: "border-rose-300",     dot: "bg-rose-400",     text: "text-rose-600",   line: "bg-rose-300" },
    { bg: "bg-rose-50",     border: "border-orange-200",   dot: "bg-orange-300",   text: "text-orange-500", line: "bg-orange-200" },
    { bg: "bg-orange-50",   border: "border-orange-300",   dot: "bg-orange-400",   text: "text-orange-600", line: "bg-orange-300" },
    { bg: "bg-amber-50",    border: "border-amber-300",    dot: "bg-amber-400",    text: "text-amber-600",  line: "bg-amber-300" },
    { bg: "bg-amber-50",    border: "border-amber-300",    dot: "bg-amber-400",    text: "text-amber-600",  line: "bg-amber-300" },
    { bg: "bg-amber-50",    border: "border-amber-300",    dot: "bg-amber-450",    text: "text-amber-600",  line: "bg-amber-350" },
    { bg: "bg-amber-100",   border: "border-amber-400",    dot: "bg-amber-500",    text: "text-amber-700",  line: "bg-amber-400" },
  ],
}

// Badge și progress bar — culoarea OUTPUT a cardului
const CARD_OUTPUT_COLORS: Record<string, { badge: string; progressBar: string }> = {
  C1: { badge: "text-indigo-600 bg-indigo-50", progressBar: "bg-indigo-500" },
  C2: { badge: "text-violet-600 bg-violet-50", progressBar: "bg-violet-500" },
  C3: { badge: "text-rose-600 bg-rose-50",     progressBar: "bg-rose-500" },
  C4: { badge: "text-amber-600 bg-amber-50",   progressBar: "bg-amber-500" },
}

interface CardPipelineProps {
  cardId: string
  cardName: string
  phases: PipelinePhase[]
  overallProgress: number
}

function getPhaseColors(cardId: string, phaseIndex: number, totalPhases: number, status: PipelinePhase["status"]) {
  if (status === "LOCKED") {
    return { bg: "bg-slate-50", border: "border-slate-200", dot: "bg-slate-300", text: "text-slate-400", line: "bg-slate-200" }
  }

  const gradient = CARD_GRADIENTS[cardId] || CARD_GRADIENTS.C1
  // Mapăm indexul fazei pe gradientul disponibil
  const gradientIndex = Math.round((phaseIndex / Math.max(1, totalPhases - 1)) * (gradient.length - 1))
  const colors = gradient[Math.min(gradientIndex, gradient.length - 1)]

  if (status === "ACTIVE") {
    return { ...colors, dot: colors.dot + " animate-pulse", border: colors.border + " ring-2 ring-opacity-30" }
  }
  return colors
}

export default function CardPipeline({ cardId, cardName, phases, overallProgress }: CardPipelineProps) {
  const outputColors = CARD_OUTPUT_COLORS[cardId] || CARD_OUTPUT_COLORS.C1
  const [expanded, setExpanded] = useState(true)

  const doneCount = phases.filter(p => p.status === "DONE").length
  const activePhase = phases.find(p => p.status === "ACTIVE" || p.status === "IN_PROGRESS")

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className={`text-xs font-bold ${outputColors.badge} px-2.5 py-1 rounded-lg`}>{cardId}</span>
          <span className="text-sm font-bold text-slate-900">{cardName}</span>
          <span className="text-xs text-slate-400">{doneCount}/{phases.length} faze</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Progress bar compact */}
          <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${outputColors.progressBar}`}
              style={{ width: `${Math.min(100, overallProgress)}%` }}
            />
          </div>
          <span className="text-xs font-bold text-slate-500">{overallProgress}%</span>
          <span className={`text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`}>▾</span>
        </div>
      </button>

      {/* Faze */}
      {expanded && (
        <div className="px-6 pb-5">
          {/* Hint faza curentă */}
          {activePhase && (
            <div className="mb-4 px-3 py-2 bg-indigo-50 rounded-lg border border-indigo-100">
              <p className="text-xs text-indigo-700">
                <span className="font-bold">Pasul curent:</span> {activePhase.id} — {activePhase.name}
                {activePhase.detail && <span className="text-indigo-500 ml-1">({activePhase.detail})</span>}
              </p>
            </div>
          )}

          <div className="space-y-0">
            {phases.map((phase, i) => {
              const cfg = getPhaseColors(cardId, i, phases.length, phase.status)
              const isLast = i === phases.length - 1

              return (
                <div key={phase.id} className="flex gap-3">
                  {/* Linia verticală + dot */}
                  <div className="flex flex-col items-center w-6 shrink-0">
                    <div className={`w-3 h-3 rounded-full ${cfg.dot} shrink-0 mt-3.5`} />
                    {!isLast && <div className={`w-0.5 flex-1 ${cfg.line} min-h-[20px]`} />}
                  </div>

                  {/* Card fază */}
                  <div className={`flex-1 rounded-xl border ${cfg.border} ${cfg.bg} mb-2 ${phase.status === "LOCKED" ? "opacity-60 pointer-events-none" : ""}`} style={{ padding: "12px 16px" }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold ${cfg.text}`}>{phase.id}</span>
                        <span className={`text-sm font-medium ${phase.status === "LOCKED" ? "text-slate-400" : "text-slate-800"}`}>
                          {phase.name}
                        </span>
                        {phase.status === "DONE" && <span className="text-emerald-500 text-xs">✓</span>}
                      </div>

                      {phase.actionUrl && phase.status !== "LOCKED" && (
                        <a href={phase.actionUrl} className={`text-[10px] font-bold ${outputColors.badge} px-2.5 py-1 rounded-lg hover:opacity-80 transition-opacity`}>
                          {phase.actionLabel || "Deschide"}
                        </a>
                      )}
                    </div>

                    {/* Descriere + detalii */}
                    <p className={`text-[11px] mt-1 ${phase.status === "LOCKED" ? "text-slate-300" : "text-slate-500"}`}>
                      {phase.description}
                    </p>

                    {/* Progres per fază */}
                    {phase.progress !== undefined && phase.status !== "LOCKED" && phase.status !== "DONE" && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full ${outputColors.progressBar} rounded-full`} style={{ width: `${phase.progress}%` }} />
                        </div>
                        <span className="text-[10px] text-slate-400">{phase.progress}%</span>
                      </div>
                    )}

                    {/* Detail text */}
                    {phase.detail && phase.status !== "LOCKED" && (
                      <p className={`text-[10px] mt-1 ${cfg.text}`}>{phase.detail}</p>
                    )}

                    {/* Missing inputs */}
                    {phase.status === "LOCKED" && phase.missingInputs && phase.missingInputs.length > 0 && (
                      <div className="mt-1.5">
                        <p className="text-[10px] text-slate-300">Necesită: {phase.missingInputs.join(", ")}</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
