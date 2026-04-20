"use client"

import React, { useState, useCallback, createContext, useContext } from "react"
import type { MasterReportData, MasterJobEvaluation } from "@/lib/reports/master-report-data"

// ─── Shared state context ──────────────────────────────────────────────────

export interface SimulatorState {
  /** Secțiunea activă din master (determină ce simulator apare) */
  activeSection: string | null
  /** Modificări JE: jobIndex → criterionKey → newLetter */
  jeModifications: Record<number, Record<string, string>>
  /** Jurnal modificări */
  journal: JournalEntry[]
}

export interface JournalEntry {
  timestamp: number
  section: string
  description: string
  oldValue: string
  newValue: string
}

interface SimulatorContextType {
  state: SimulatorState
  setActiveSection: (section: string | null) => void
  addJeModification: (jobIndex: number, criterionKey: string, oldLetter: string, newLetter: string, jobTitle: string) => void
  getModifiedJE: (originalJE: MasterJobEvaluation[]) => MasterJobEvaluation[]
}

const SimulatorContext = createContext<SimulatorContextType | null>(null)

export function useSimulator() {
  const ctx = useContext(SimulatorContext)
  if (!ctx) throw new Error("useSimulator must be used within MasterSimulatorLayout")
  return ctx
}

// ─── Layout principal ──────────────────────────────────────────────────────

interface Props {
  data: MasterReportData
  masterContent: React.ReactNode
  simulatorContent: React.ReactNode
}

export default function MasterSimulatorLayout({ data, masterContent, simulatorContent }: Props) {
  const [state, setState] = useState<SimulatorState>({
    activeSection: null,
    jeModifications: {},
    journal: [],
  })

  const setActiveSection = useCallback((section: string | null) => {
    setState(prev => ({ ...prev, activeSection: section }))
  }, [])

  const addJeModification = useCallback((
    jobIndex: number,
    criterionKey: string,
    oldLetter: string,
    newLetter: string,
    jobTitle: string,
  ) => {
    setState(prev => ({
      ...prev,
      jeModifications: {
        ...prev.jeModifications,
        [jobIndex]: {
          ...(prev.jeModifications[jobIndex] || {}),
          [criterionKey]: newLetter,
        },
      },
      journal: [
        ...prev.journal,
        {
          timestamp: Date.now(),
          section: "JE",
          description: `${jobTitle}: ${criterionKey} ${oldLetter} → ${newLetter}`,
          oldValue: oldLetter,
          newValue: newLetter,
        },
      ],
    }))
  }, [])

  const getModifiedJE = useCallback((originalJE: MasterJobEvaluation[]): MasterJobEvaluation[] => {
    if (Object.keys(state.jeModifications).length === 0) return originalJE

    return originalJE.map((je, idx) => {
      const mods = state.jeModifications[idx]
      if (!mods || !je.letters) return je

      const newLetters = { ...je.letters }
      for (const [key, letter] of Object.entries(mods)) {
        if (key in newLetters) {
          (newLetters as any)[key] = letter
        }
      }

      // Recalculăm scorul — dar NU expunem tabelul de scorare
      // Scorul se recalculează server-side prin API
      return { ...je, letters: newLetters }
    })
  }, [state.jeModifications])

  const contextValue: SimulatorContextType = {
    state,
    setActiveSection,
    addJeModification,
    getModifiedJE,
  }

  const isSimulatorOpen = state.activeSection !== null

  return (
    <SimulatorContext.Provider value={contextValue}>
      <div className={`flex gap-6 transition-all duration-300 ${isSimulatorOpen ? "" : ""}`}>
        {/* Master — stânga */}
        <div className={`transition-all duration-300 ${isSimulatorOpen ? "w-1/2" : "w-full max-w-4xl mx-auto"}`}>
          {masterContent}
        </div>

        {/* Simulator — dreapta (slide-in) */}
        {isSimulatorOpen && (
          <div className="w-1/2 sticky top-16 h-[calc(100vh-5rem)] overflow-y-auto">
            <div className="bg-white rounded-lg shadow-lg border border-indigo-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900">
                  Simulator
                </h3>
                <button
                  onClick={() => setActiveSection(null)}
                  className="text-slate-400 hover:text-slate-600 text-sm px-2 py-1 rounded hover:bg-slate-100"
                >
                  Închide
                </button>
              </div>
              {simulatorContent}
            </div>

            {/* Jurnal modificări */}
            {state.journal.length > 0 && (
              <div className="mt-4 bg-white rounded-lg shadow border border-slate-100 p-4">
                <h4 className="text-xs font-bold text-slate-700 mb-2">Jurnal modificări</h4>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {state.journal.slice().reverse().map((entry, i) => (
                    <div key={i} className="text-[10px] text-slate-500 flex gap-2">
                      <span className="text-slate-300 tabular-nums">
                        {new Date(entry.timestamp).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span className="text-indigo-500 font-medium">[{entry.section}]</span>
                      <span>{entry.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </SimulatorContext.Provider>
  )
}
