"use client"

import React, { useState, useCallback, useRef, useEffect, createContext, useContext } from "react"
import type { MasterReportData, MasterJobEvaluation } from "@/lib/reports/master-report-data"
import { createAntiGamingState, checkModification, type AntiGamingState } from "@/lib/evaluation/anti-gaming"

// ─── Shared state context ──────────────────────────────────────────────────

export type JEParcurs = "ai_pur" | "ai_comisie" | "comisie_pura"

export interface SimulatorState {
  /** Secțiunea activă din master (determină ce simulator apare) */
  activeSection: string | null
  /** Parcursul JE ales */
  jeParcurs: JEParcurs
  /** Dacă evaluarea a fost validată final */
  jeValidated: boolean
  /** Timestamp validare */
  jeValidatedAt: number | null
  /** Modificări JE: jobIndex → criterionKey → newLetter */
  jeModifications: Record<number, Record<string, string>>
  /** Scoruri recalculate: jobIndex → newScore */
  recalculatedScores: Record<number, number>
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
  setJeParcurs: (parcurs: JEParcurs) => void
  validateJE: (companyName: string) => void
  addJeModification: (jobIndex: number, criterionKey: string, oldLetter: string, newLetter: string, jobTitle: string) => void
  getModifiedJE: (originalJE: MasterJobEvaluation[]) => MasterJobEvaluation[]
  /** Anti-gaming state — persistat la nivel de sesiune, NU se resetează la close */
  antiGaming: AntiGamingState
  checkAntiGaming: (jobId: string, criterionKey: string, newLetter: string) => boolean
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
  isDemo?: boolean
  masterContent: React.ReactNode
  simulatorContent: React.ReactNode
}

export default function MasterSimulatorLayout({ data, isDemo = false, masterContent, simulatorContent }: Props) {
  const [state, setState] = useState<SimulatorState>({
    activeSection: null,
    jeParcurs: "ai_pur",
    jeValidated: false,
    jeValidatedAt: null,
    jeModifications: {},
    recalculatedScores: {},
    journal: [],
  })

  // Fetch JE status din DB la mount (doar producție, nu demo)
  const [sessionId, setSessionId] = useState<string | null>(null)
  useEffect(() => {
    if (isDemo) return
    fetch("/api/v1/master/je-status")
      .then(r => r.json())
      .then(status => {
        if (status.hasSession) {
          setSessionId(status.sessionId)
          const parcursMap: Record<string, JEParcurs> = {
            AI_GENERATED: "ai_pur",
            AI_COMMITTEE: "ai_comisie",
            COMMITTEE_ONLY: "comisie_pura",
          }
          setState(prev => ({
            ...prev,
            jeParcurs: parcursMap[status.parcurs] || "ai_pur",
            jeValidated: status.validated,
            jeValidatedAt: status.validatedAt ? new Date(status.validatedAt).getTime() : null,
          }))
        }
      })
      .catch(() => {})
  }, [isDemo])

  // Anti-gaming persistat cu useRef (supraviețuiește close/reopen simulator)
  const antiGamingRef = useRef<AntiGamingState>(createAntiGamingState())
  const [antiGaming, setAntiGaming] = useState<AntiGamingState>(antiGamingRef.current)

  const checkAntiGaming = useCallback((jobId: string, criterionKey: string, newLetter: string): boolean => {
    const { newState, allowed } = checkModification(antiGamingRef.current, jobId, criterionKey, newLetter)
    antiGamingRef.current = newState
    setAntiGaming(newState)
    return allowed
  }, [])

  const setActiveSection = useCallback((section: string | null) => {
    setState(prev => ({ ...prev, activeSection: section }))
  }, [])

  const setJeParcurs = useCallback((parcurs: JEParcurs) => {
    setState(prev => ({
      ...prev,
      jeParcurs: parcurs,
      journal: [
        ...prev.journal,
        {
          timestamp: Date.now(),
          section: "JE",
          description: `Parcurs schimbat: ${parcurs === "ai_pur" ? "AI pur" : parcurs === "ai_comisie" ? "AI → Comisie" : "Comisie pură"}`,
          oldValue: prev.jeParcurs,
          newValue: parcurs,
        },
      ],
    }))
  }, [])

  const validateJE = useCallback((companyName: string) => {
    // Persistare în DB (producție)
    if (!isDemo && sessionId) {
      fetch("/api/v1/master/validate-je", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      })
        .then(r => r.json())
        .then(result => {
          if (!result.ok) console.error("[validate-je]", result.error)
        })
        .catch(err => console.error("[validate-je]", err))
    }

    setState(prev => ({
      ...prev,
      jeValidated: true,
      jeValidatedAt: Date.now(),
      journal: [
        ...prev.journal,
        {
          timestamp: Date.now(),
          section: "JE",
          description: `Evaluare validată de reprezentantul legal al ${companyName}`,
          oldValue: "nevalidat",
          newValue: "validat",
        },
      ],
    }))
  }, [isDemo, sessionId])

  const addJeModification = useCallback((
    jobIndex: number,
    criterionKey: string,
    oldLetter: string,
    newLetter: string,
    jobTitle: string,
  ) => {
    setState(prev => {
      const newMods = {
        ...prev.jeModifications,
        [jobIndex]: {
          ...(prev.jeModifications[jobIndex] || {}),
          [criterionKey]: newLetter,
        },
      }

      // Recalculare scor server-side (async, se actualizează când revine)
      const je = data.layers.baza.jobEvaluations[jobIndex]
      if (je?.letters) {
        const mergedLetters = { ...je.letters, ...newMods[jobIndex] }
        fetch("/api/v1/evaluate/recalculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ letters: mergedLetters }),
        })
          .then(r => r.json())
          .then(({ score }) => {
            if (typeof score === "number") {
              setState(s => {
                const newScores = { ...s.recalculatedScores, [jobIndex]: score }

                // Calculăm rangul vechi și nou
                const allJE = data.layers.baza.jobEvaluations
                const oldRank = allJE
                  .map((j, i) => ({ score: s.recalculatedScores[i] ?? j.score, idx: i }))
                  .sort((a, b) => b.score - a.score)
                  .findIndex(x => x.idx === jobIndex) + 1

                const newRank = allJE
                  .map((j, i) => ({ score: newScores[i] ?? j.score, idx: i }))
                  .sort((a, b) => b.score - a.score)
                  .findIndex(x => x.idx === jobIndex) + 1

                const rankChanged = oldRank !== newRank
                const journal = rankChanged
                  ? [
                      ...s.journal,
                      {
                        timestamp: Date.now(),
                        section: "JE",
                        description: `${jobTitle}: loc ${oldRank} → loc ${newRank} (scor: ${allJE[jobIndex].score} → ${score})`,
                        oldValue: String(oldRank),
                        newValue: String(newRank),
                      },
                    ]
                  : s.journal

                return { ...s, recalculatedScores: newScores, journal }
              })
            }
          })
          .catch(() => {})
      }

      return {
        ...prev,
        jeModifications: newMods,
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
      }
    })
  }, [data])

  const getModifiedJE = useCallback((originalJE: MasterJobEvaluation[]): MasterJobEvaluation[] => {
    if (Object.keys(state.jeModifications).length === 0 && Object.keys(state.recalculatedScores).length === 0) {
      return originalJE
    }

    const modified = originalJE.map((je, idx) => {
      const mods = state.jeModifications[idx]
      const newScore = state.recalculatedScores[idx]
      if (!mods && newScore === undefined) return je

      const result = { ...je }

      if (mods && je.letters) {
        const newLetters = { ...je.letters }
        for (const [key, letter] of Object.entries(mods)) {
          if (key in newLetters) {
            (newLetters as any)[key] = letter
          }
        }
        result.letters = newLetters
      }

      if (newScore !== undefined) {
        result.score = newScore
      }

      return result
    })

    // Reordonare descrescătoare după scor (clasamentul se actualizează)
    return [...modified].sort((a, b) => b.score - a.score)
  }, [state.jeModifications, state.recalculatedScores])

  const contextValue: SimulatorContextType = {
    state,
    setActiveSection,
    setJeParcurs,
    validateJE,
    addJeModification,
    getModifiedJE,
    antiGaming,
    checkAntiGaming,
  }

  const isSimulatorOpen = state.activeSection !== null

  return (
    <SimulatorContext.Provider value={contextValue}>
      <div className={`transition-all duration-300 ${isSimulatorOpen ? "flex gap-6 max-w-[1600px] mx-auto px-4" : ""}`}>
        {/* Master — stânga */}
        <div className={`transition-all duration-300 ${isSimulatorOpen ? "w-3/5 shrink-0" : "w-full max-w-4xl mx-auto"}`}>
          {masterContent}
        </div>

        {/* Simulator — dreapta (slide-in) */}
        {isSimulatorOpen && (
          <div className="w-2/5 shrink-0 sticky top-16 h-[calc(100vh-5rem)] overflow-y-auto">
            <div className="bg-white rounded-lg shadow-lg border border-indigo-100 p-6" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.85), rgba(255,255,255,0.85)), url(/images/brand/hex-pattern.png)", backgroundSize: "auto, 250px", backgroundRepeat: "no-repeat, repeat" }}>
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
