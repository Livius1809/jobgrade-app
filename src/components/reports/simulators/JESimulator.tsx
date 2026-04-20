"use client"

import React, { useState, useCallback, useRef, useEffect } from "react"
import { useSimulator } from "../MasterSimulatorLayout"
import { CRITERION_DESCRIPTIONS, CRITERION_LABELS, LEGAL_GROUPS } from "@/lib/evaluation/criterion-descriptions"
import type { MasterJobEvaluation } from "@/lib/reports/master-report-data"

// ─── Dropdown cu fade overlay (ca în portal) ───────────────────────────────

function CriterionDropdown({
  criterionKey,
  currentLetter,
  isModified,
  disabled,
  onChange,
}: {
  criterionKey: string
  currentLetter: string
  isModified: boolean
  disabled: boolean
  onChange: (letter: string) => void
}) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  const descriptions = CRITERION_DESCRIPTIONS[criterionKey] || []
  const label = CRITERION_LABELS[criterionKey] || criterionKey

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (btnRef.current && !btnRef.current.contains(e.target as Node)) {
        const panel = document.getElementById(`sim-dropdown-${criterionKey}`)
        if (panel && !panel.contains(e.target as Node)) setOpen(false)
      }
    }
    if (open) document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open, criterionKey])

  function handleOpen() {
    if (disabled) return
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      const panelWidth = Math.min(500, window.innerWidth * 0.85)
      let left = rect.left
      if (left + panelWidth > window.innerWidth - 10) left = window.innerWidth - panelWidth - 10
      if (left < 10) left = 10
      const midScreen = window.innerHeight / 2
      const top = rect.top > midScreen ? rect.top - 280 : rect.bottom + 4
      setPos({ top, left })
    }
    setOpen(!open)
  }

  return (
    <div className="inline-block">
      <button
        ref={btnRef}
        onClick={handleOpen}
        disabled={disabled}
        className={`px-2 py-1 rounded text-xs font-bold border transition-all cursor-pointer ${
          open
            ? "border-indigo-500 bg-indigo-100 text-indigo-700 ring-2 ring-indigo-200 shadow-lg z-50 relative"
            : isModified
              ? "border-indigo-400 bg-indigo-50 text-indigo-700"
              : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300"
        } disabled:opacity-30 disabled:cursor-not-allowed`}
      >
        {currentLetter}
        <svg className="inline-block ml-1 w-3 h-3 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <>
          {/* Fade background */}
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] transition-opacity"
            onClick={() => setOpen(false)}
          />
          <div
            id={`sim-dropdown-${criterionKey}`}
            className="fixed z-50 bg-white rounded-xl shadow-2xl border-2 border-indigo-500 overflow-hidden"
            style={{ top: pos.top, left: pos.left, width: "min(500px, 85vw)" }}
          >
            <div className="px-3 py-2 bg-indigo-50 border-b border-indigo-100">
              <p className="text-xs font-bold text-indigo-700">{label}</p>
              <p className="text-[10px] text-indigo-400">Selectați nivelul care reflectă complexitatea reală a postului</p>
            </div>
            <div>
              {descriptions.map(desc => (
                <button
                  key={desc.letter}
                  onClick={() => { onChange(desc.letter); setOpen(false) }}
                  className={`w-full text-left px-3 py-2.5 text-xs transition-colors cursor-pointer flex items-start gap-2 ${
                    desc.letter === currentLetter
                      ? "bg-indigo-50 text-indigo-900"
                      : "hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <span className={`flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${
                    desc.letter === currentLetter ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
                  }`}>
                    {desc.letter}
                  </span>
                  <span className="leading-relaxed">{desc.description}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Mesaj consilier (în loc de block sec) ─────────────────────────────────

function CounselorMessage({ status, criterionKey }: { status: string; criterionKey?: string }) {
  if (status === "OK") return null

  const messages = {
    WARNING: {
      icon: "💬",
      title: "Consilier evaluare",
      text: `Observ că explorați intensiv acest criteriu. Pot să vă ajut să înțelegeți ce nivel reflectă cel mai bine complexitatea postului? Fiecare nivel are o semnificație precisă — selectați-l pe cel care corespunde cel mai fidel realității.`,
      color: "bg-amber-50 border-amber-200 text-amber-800",
    },
    COOLDOWN: {
      icon: "⏸️",
      title: "Pauză de reflecție",
      text: "Prea multe modificări în timp scurt. Vă recomandăm să analizați cu atenție descrierile nivelurilor înainte de a continua. Simulatorul va fi disponibil din nou în câteva secunde.",
      color: "bg-blue-50 border-blue-200 text-blue-800",
    },
    BLOCKED: {
      icon: "🛡️",
      title: "Acces suspendat temporar",
      text: "Am detectat un pattern neobișnuit de modificări. Pentru protecția integrității evaluării, simulatorul este temporar indisponibil. Contactați echipa de suport pentru asistență.",
      color: "bg-red-50 border-red-200 text-red-800",
    },
  }

  const msg = messages[status as keyof typeof messages]
  if (!msg) return null

  return (
    <div className={`p-4 rounded-lg border ${msg.color}`}>
      <div className="flex items-start gap-2">
        <span className="text-lg">{msg.icon}</span>
        <div>
          <p className="text-xs font-bold mb-1">{msg.title}</p>
          <p className="text-xs leading-relaxed">{msg.text}</p>
        </div>
      </div>
    </div>
  )
}

// ─── Parcurs descriptions ──────────────────────────────────────────────────

const PARCURS_OPTIONS = [
  {
    value: "ai_pur" as const,
    label: "Evaluare generată AI",
    description: "Clasamentul a fost generat automat din fișele de post. Puteți ajusta evaluarea criteriilor.",
  },
  {
    value: "ai_comisie" as const,
    label: "AI → Comisie JE",
    description: "Clasamentul AI a fost dezbătut și ajustat de comisia de evaluare.",
  },
  {
    value: "comisie_pura" as const,
    label: "Comisie JE",
    description: "Clasamentul a fost stabilit integral de comisia de evaluare prin consens.",
  },
]

// ─── Componenta principală ─────────────────────────────────────────────────

interface Props {
  jobs: MasterJobEvaluation[]
  companyName?: string
}

export default function JESimulator({ jobs, companyName = "—" }: Props) {
  const { addJeModification, state, antiGaming, checkAntiGaming, setJeParcurs, validateJE } = useSimulator()
  const [selectedJob, setSelectedJob] = useState<number>(0)
  const [showValidateConfirm, setShowValidateConfirm] = useState(false)

  const currentJob = jobs[selectedJob]
  if (!currentJob?.letters) return <p className="text-sm text-slate-400">Nu există date de evaluare.</p>

  // Aplicăm modificările existente
  const currentLetters = { ...currentJob.letters }
  const mods = state.jeModifications[selectedJob]
  if (mods) {
    for (const [key, letter] of Object.entries(mods)) {
      if (key in currentLetters) {
        (currentLetters as any)[key] = letter
      }
    }
  }

  const handleLetterChange = useCallback((criterionKey: string, newLetter: string) => {
    const oldLetter = (currentLetters as any)[criterionKey]
    if (oldLetter === newLetter) return

    const allowed = checkAntiGaming(currentJob.position, criterionKey, newLetter)
    if (!allowed) return

    addJeModification(selectedJob, criterionKey, oldLetter, newLetter, currentJob.position)
  }, [selectedJob, currentJob, currentLetters, checkAntiGaming, addJeModification])

  // Anti-gaming calibrat per parcurs
  const isPostComisie = state.jeParcurs === "ai_comisie" || state.jeParcurs === "comisie_pura"
  const isDisabled = state.jeValidated || antiGaming.status === "BLOCKED" || antiGaming.status === "COOLDOWN"

  // Post-validare: totul read-only
  if (state.jeValidated) {
    return (
      <div className="space-y-4">
        <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">✅</span>
            <h4 className="text-sm font-bold text-emerald-800">Evaluare validată</h4>
          </div>
          <p className="text-xs text-emerald-700">
            Configurația a fost validată la {new Date(state.jeValidatedAt!).toLocaleString("ro-RO")}.
            Evaluarea este blocată. Straturile ulterioare (structura salarială, pay gap) sunt acum active.
          </p>
        </div>

        {/* Rezumat read-only */}
        <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
          <h4 className="text-xs font-bold text-slate-700 mb-2">Clasament validat</h4>
          <div className="space-y-1">
            {jobs.map((j, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-slate-600">#{i + 1} {j.position}</span>
                <span className="font-mono text-slate-500">{state.recalculatedScores[i] ?? j.score}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Selector parcurs */}
      <div>
        <label className="text-xs font-medium text-slate-500 block mb-1">Parcurs evaluare</label>
        <div className="space-y-1.5">
          {PARCURS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setJeParcurs(opt.value)}
              className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-colors ${
                state.jeParcurs === opt.value
                  ? "border-indigo-400 bg-indigo-50 text-indigo-800"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              <span className="font-medium">{opt.label}</span>
              <p className="text-[10px] text-slate-400 mt-0.5">{opt.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Buton inițiere comisie (doar pe parcurs AI pur) */}
      {state.jeParcurs === "ai_pur" && (
        <button
          onClick={() => setJeParcurs("ai_comisie")}
          className="w-full py-2 rounded-lg border-2 border-dashed border-violet-200 text-violet-600 text-xs font-medium hover:bg-violet-50 transition-colors"
        >
          Inițiază proces JE mediat (Comisie) →
        </button>
      )}

      {/* Consilier (calibrat — mai relaxat post-comisie) */}
      {!isPostComisie && <CounselorMessage status={antiGaming.status} />}
      {isPostComisie && antiGaming.status !== "OK" && <CounselorMessage status={antiGaming.status} />}

      {/* Selector post */}
      <div>
        <label className="text-xs font-medium text-slate-500 block mb-1">Poziție evaluată</label>
        <select
          value={selectedJob}
          onChange={(e) => setSelectedJob(Number(e.target.value))}
          disabled={isDisabled}
          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 disabled:opacity-50"
        >
          {jobs.map((j, i) => (
            <option key={i} value={i}>
              {j.position} — {j.department}
            </option>
          ))}
        </select>
      </div>

      {/* Criterii grupate pe cele 4 legale — cu dropdown + descrieri */}
      <div className="space-y-3">
        {LEGAL_GROUPS.map(group => (
          <div key={group.shortLabel} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
            <h4 className="text-xs font-bold text-slate-700 mb-0.5">{group.label}</h4>
            <p className="text-[10px] text-slate-400 mb-2">{group.shortLabel}</p>
            <div className="space-y-2">
              {group.keys.map(key => {
                const currentLetter = (currentLetters as any)[key] || "—"
                const isModified = mods?.[key] !== undefined

                return (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">{CRITERION_LABELS[key]}</span>
                    <CriterionDropdown
                      criterionKey={key}
                      currentLetter={currentLetter}
                      isModified={isModified}
                      disabled={isDisabled}
                      onChange={(letter) => handleLetterChange(key, letter)}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Rezumat litere pe 4 criterii legale */}
      <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
        <h4 className="text-xs font-bold text-indigo-700 mb-2">Rezumat evaluare — {currentJob.position}</h4>
        <div className="grid grid-cols-4 gap-2 text-center">
          {LEGAL_GROUPS.map(group => {
            const letters = group.keys.map(k => (currentLetters as any)[k] || "—")
            const display = letters.length > 1 ? letters.join("·") : letters[0]
            return (
              <div key={group.shortLabel}>
                <p className="text-[10px] text-indigo-400">{group.shortLabel}</p>
                <p className="text-lg font-mono font-bold text-indigo-700">{display}</p>
              </div>
            )
          })}
        </div>
        <p className="text-center text-xs text-slate-400 mt-2">
          Scor total: <span className="font-mono font-bold text-slate-700">{state.recalculatedScores[selectedJob] ?? currentJob.score}</span>
          {state.recalculatedScores[selectedJob] !== undefined && state.recalculatedScores[selectedJob] !== currentJob.score && (
            <span className="text-[10px] text-slate-400 ml-2">(inițial: {currentJob.score})</span>
          )}
        </p>
      </div>

      {/* Buton validare finală */}
      {!showValidateConfirm ? (
        <button
          onClick={() => setShowValidateConfirm(true)}
          className="w-full py-3 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors"
        >
          Validez configurația evaluării
        </button>
      ) : (
        <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200 space-y-3">
          <p className="text-xs text-slate-700 leading-relaxed">
            Subsemnatul, în calitate de Director General / reprezentant legal al <strong>{companyName}</strong>,
            validez configurația actuală a evaluării posturilor ca fiind conformă cu misiunea, viziunea, valorile,
            structura organizațională și complexitatea reală a posturilor evaluate din compania noastră.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => { validateJE(companyName); setShowValidateConfirm(false) }}
              className="flex-1 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors"
            >
              Validez configurația
            </button>
            <button
              onClick={() => setShowValidateConfirm(false)}
              className="flex-1 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50 transition-colors"
            >
              Revin la modificări
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
