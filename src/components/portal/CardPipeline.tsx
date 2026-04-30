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

export interface CardColorTheme {
  // Culori card curent (done = culoarea cardului)
  doneBg: string; doneBorder: string; doneDot: string; doneText: string; doneLine: string
  // Culori fază activă (blend input→output)
  activeBg: string; activeBorder: string; activeDot: string; activeText: string; activeLine: string
  // Badge + progress bar
  badge: string; progressBar: string
}

// Teme per card — gradientul brandului
export const CARD_THEMES: Record<string, CardColorTheme> = {
  C1: {
    doneBg: "bg-indigo-50", doneBorder: "border-indigo-200", doneDot: "bg-indigo-500", doneText: "text-indigo-700", doneLine: "bg-indigo-400",
    activeBg: "bg-indigo-50/50", activeBorder: "border-indigo-300 ring-2 ring-indigo-100", activeDot: "bg-indigo-400 animate-pulse", activeText: "text-indigo-600", activeLine: "bg-indigo-300",
    badge: "text-indigo-600 bg-indigo-50", progressBar: "bg-indigo-500",
  },
  C2: {
    doneBg: "bg-violet-50", doneBorder: "border-violet-200", doneDot: "bg-violet-500", doneText: "text-violet-700", doneLine: "bg-violet-400",
    activeBg: "bg-violet-50/50", activeBorder: "border-violet-300 ring-2 ring-violet-100", activeDot: "bg-violet-400 animate-pulse", activeText: "text-violet-600", activeLine: "bg-violet-300",
    badge: "text-violet-600 bg-violet-50", progressBar: "bg-violet-500",
  },
  C3: {
    doneBg: "bg-rose-50", doneBorder: "border-rose-200", doneDot: "bg-rose-500", doneText: "text-rose-700", doneLine: "bg-rose-400",
    activeBg: "bg-rose-50/50", activeBorder: "border-rose-300 ring-2 ring-rose-100", activeDot: "bg-rose-400 animate-pulse", activeText: "text-rose-600", activeLine: "bg-rose-300",
    badge: "text-rose-600 bg-rose-50", progressBar: "bg-rose-500",
  },
  C4: {
    doneBg: "bg-amber-50", doneBorder: "border-amber-200", doneDot: "bg-amber-500", doneText: "text-amber-700", doneLine: "bg-amber-400",
    activeBg: "bg-amber-50/50", activeBorder: "border-amber-300 ring-2 ring-amber-100", activeDot: "bg-amber-400 animate-pulse", activeText: "text-amber-600", activeLine: "bg-amber-300",
    badge: "text-amber-600 bg-amber-50", progressBar: "bg-amber-500",
  },
}

interface CardPipelineProps {
  cardId: string
  cardName: string
  phases: PipelinePhase[]
  overallProgress: number
}

function getStatusConfig(status: PipelinePhase["status"], theme: CardColorTheme) {
  switch (status) {
    case "LOCKED": return { bg: "bg-slate-50", border: "border-slate-200", dot: "bg-slate-300", text: "text-slate-400", line: "bg-slate-200" }
    case "ACTIVE": return { bg: theme.activeBg, border: theme.activeBorder, dot: theme.activeDot, text: theme.activeText, line: theme.activeLine }
    case "IN_PROGRESS": return { bg: theme.activeBg, border: theme.activeBorder, dot: theme.activeDot.replace("animate-pulse", ""), text: theme.activeText, line: theme.activeLine }
    case "DONE": return { bg: theme.doneBg, border: theme.doneBorder, dot: theme.doneDot, text: theme.doneText, line: theme.doneLine }
  }
}

export default function CardPipeline({ cardId, cardName, phases, overallProgress }: CardPipelineProps) {
  const theme = CARD_THEMES[cardId] || CARD_THEMES.C1
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
          <span className={`text-xs font-bold ${theme.badge} px-2.5 py-1 rounded-lg`}>{cardId}</span>
          <span className="text-sm font-bold text-slate-900">{cardName}</span>
          <span className="text-xs text-slate-400">{doneCount}/{phases.length} faze</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Progress bar compact */}
          <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${overallProgress >= 100 ? theme.progressBar : theme.progressBar}`}
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
              const cfg = getStatusConfig(phase.status, theme)
              const isLast = i === phases.length - 1

              return (
                <div key={phase.id} className="flex gap-3">
                  {/* Linia verticală + dot */}
                  <div className="flex flex-col items-center w-6 shrink-0">
                    <div className={`w-3 h-3 rounded-full ${cfg.dot} shrink-0 mt-3.5`} />
                    {!isLast && <div className={`w-0.5 flex-1 ${cfg.line} min-h-[20px]`} />}
                  </div>

                  {/* Card fază */}
                  <div className={`flex-1 rounded-xl border ${cfg.border} ${cfg.bg} mb-2`} style={{ padding: "12px 16px" }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold ${cfg.text}`}>{phase.id}</span>
                        <span className={`text-sm font-medium ${phase.status === "LOCKED" ? "text-slate-400" : "text-slate-800"}`}>
                          {phase.name}
                        </span>
                        {phase.status === "DONE" && <span className="text-emerald-500 text-xs">✓</span>}
                      </div>

                      {phase.actionUrl && phase.status !== "LOCKED" && (
                        <a href={phase.actionUrl} className={`text-[10px] font-bold ${theme.badge} px-2.5 py-1 rounded-lg hover:opacity-80 transition-opacity`}>
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
                          <div className={`h-full ${theme.progressBar} rounded-full`} style={{ width: `${phase.progress}%` }} />
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
