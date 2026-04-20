"use client"

import React, { useState, useCallback } from "react"
import { useSimulator } from "../MasterSimulatorLayout"
import type { MasterJobEvaluation } from "@/lib/reports/master-report-data"

// Literele disponibile per criteriu (fără a dezvălui punctajele)
const CRITERION_LEVELS: Record<string, string[]> = {
  Knowledge: ["A", "B", "C", "D", "E", "F", "G"],
  Communications: ["A", "B", "C", "D", "E"],
  ProblemSolving: ["A", "B", "C", "D", "E", "F", "G"],
  DecisionMaking: ["A", "B", "C", "D", "E", "F", "G"],
  BusinessImpact: ["A", "B", "C", "D"],
  WorkingConditions: ["A", "B", "C"],
}

// Descrieri per criteriu (ce vede clientul)
const CRITERION_LABELS: Record<string, string> = {
  Knowledge: "Educație și experiență",
  Communications: "Comunicare",
  ProblemSolving: "Rezolvarea problemelor",
  DecisionMaking: "Luarea deciziilor",
  BusinessImpact: "Impact asupra afacerii",
  WorkingConditions: "Condiții de muncă",
}

// Maparea la cele 4 criterii legale
const LEGAL_GROUPS = [
  { label: "Cunoștințe", keys: ["Knowledge", "Communications"] },
  { label: "Efort", keys: ["ProblemSolving"] },
  { label: "Responsabilități", keys: ["DecisionMaking", "BusinessImpact"] },
  { label: "Condiții", keys: ["WorkingConditions"] },
]

interface Props {
  jobs: MasterJobEvaluation[]
}

export default function JESimulator({ jobs }: Props) {
  const { addJeModification, state, antiGaming, checkAntiGaming } = useSimulator()
  const [selectedJob, setSelectedJob] = useState<number>(0)

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

    // Anti-gaming check (persistat la nivel de sesiune)
    const allowed = checkAntiGaming(currentJob.position, criterionKey, newLetter)
    if (!allowed) return

    addJeModification(selectedJob, criterionKey, oldLetter, newLetter, currentJob.position)
  }, [selectedJob, currentJob, currentLetters, checkAntiGaming, addJeModification])

  return (
    <div className="space-y-4">
      {/* Anti-gaming warning */}
      {antiGaming.message && (
        <div className={`p-3 rounded-lg text-xs ${
          antiGaming.status === "BLOCKED" ? "bg-red-50 text-red-700 border border-red-200" :
          antiGaming.status === "COOLDOWN" ? "bg-amber-50 text-amber-700 border border-amber-200" :
          "bg-amber-50 text-amber-600 border border-amber-100"
        }`}>
          {antiGaming.message}
        </div>
      )}

      {/* Selector post */}
      <div>
        <label className="text-xs font-medium text-slate-500 block mb-1">Poziție</label>
        <select
          value={selectedJob}
          onChange={(e) => setSelectedJob(Number(e.target.value))}
          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
        >
          {jobs.map((j, i) => (
            <option key={i} value={i}>
              {j.position} — {j.department}
            </option>
          ))}
        </select>
      </div>

      {/* Criterii grupate pe cele 4 legale */}
      <div className="space-y-3">
        {LEGAL_GROUPS.map(group => (
          <div key={group.label} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
            <h4 className="text-xs font-bold text-slate-700 mb-2">{group.label}</h4>
            <div className="space-y-2">
              {group.keys.map(key => {
                const levels = CRITERION_LEVELS[key]
                const currentLetter = (currentLetters as any)[key] || "—"
                const isModified = mods?.[key] !== undefined

                return (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">{CRITERION_LABELS[key]}</span>
                    <div className="flex items-center gap-1">
                      {levels.map(letter => (
                        <button
                          key={letter}
                          onClick={() => handleLetterChange(key, letter)}
                          disabled={antiGaming.status === "BLOCKED" || antiGaming.status === "COOLDOWN"}
                          className={`w-6 h-6 rounded text-[10px] font-bold transition-colors ${
                            currentLetter === letter
                              ? isModified
                                ? "bg-indigo-600 text-white ring-2 ring-indigo-300"
                                : "bg-slate-800 text-white"
                              : "bg-white border border-slate-200 text-slate-400 hover:border-indigo-300 hover:text-indigo-600"
                          } disabled:opacity-30 disabled:cursor-not-allowed`}
                        >
                          {letter}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Rezumat litere pe 4 criterii legale */}
      <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
        <h4 className="text-xs font-bold text-indigo-700 mb-2">Rezumat evaluare</h4>
        <div className="grid grid-cols-4 gap-2 text-center">
          {LEGAL_GROUPS.map(group => {
            const letters = group.keys.map(k => (currentLetters as any)[k] || "—")
            const display = letters.length > 1 ? letters.join("·") : letters[0]
            return (
              <div key={group.label}>
                <p className="text-[10px] text-indigo-400">{group.label}</p>
                <p className="text-lg font-mono font-bold text-indigo-700">{display}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Info */}
      <p className="text-[10px] text-slate-400 italic">
        Modificările se reflectă în raportul din stânga. Scorul se recalculează automat.
        Evaluarea trebuie să reflecte complexitatea reală a postului.
      </p>
    </div>
  )
}
