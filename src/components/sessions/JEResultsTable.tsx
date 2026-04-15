"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import dynamic from "next/dynamic"
import {
  buildPitariuGrades,
  autoDetectClassCount,
  type ClassDetection,
  type ScorePoint,
} from "@/lib/evaluation/pitariu-grades"

const SalaryGradeChart = dynamic(() => import("./SalaryGradeChart"), { ssr: false })
const ClassCountSelector = dynamic(() => import("./ClassCountSelector"), { ssr: false })

interface CriterionInfo {
  id: string
  name: string
  shortName: string
  order: number
  subfactors: Array<{
    id: string
    code: string
    points: number
    description: string
  }>
}

interface SalaryStep {
  step: number
  name: string
  salary: number
  criteria: string | null
}

interface SalaryGrade {
  name: string
  scoreMin: number
  scoreMax: number
  salaryMin: number
  salaryMax: number
  steps?: SalaryStep[]
}

interface BenchmarkData {
  p25: number
  median: number
  p75: number
}

interface EmployeeDetail {
  name: string
  salary: number
  step?: SalaryStep
  adjustmentFlag?: "UP" | "DOWN" | "OK"
}

interface JobResult {
  jobId: string
  jobTitle: string
  department: string
  selectedSubfactors: Record<string, string>
  avgSalary?: number
  benchmark?: BenchmarkData
  employees?: EmployeeDetail[]
}

interface Props {
  criteria: CriterionInfo[]
  jobs: JobResult[]
  grades: SalaryGrade[]
  sessionId: string
  canEdit: boolean
}

// Mapare criterii legale
const LEGAL_CRITERIA = [
  { name: "Cunoștințe și deprinderi", criteriaIds: [] as string[], color: "indigo" },
  { name: "Efort intelectual/fizic", criteriaIds: [] as string[], color: "violet" },
  { name: "Responsabilități", criteriaIds: [] as string[], color: "fuchsia" },
  { name: "Condiții de muncă", criteriaIds: [] as string[], color: "slate" },
]

const CRITERIA_SHORT = ["E", "C", "R", "D", "I", "CL"]

function findStep(salary: number | undefined, steps: SalaryStep[]): { step: SalaryStep; status: "OK" | "BETWEEN" | "BELOW" | "ABOVE" } | undefined {
  if (!salary || steps.length === 0) return undefined
  const sorted = [...steps].sort((a, b) => a.salary - b.salary)
  const minStep = sorted[0]
  const maxStep = sorted[sorted.length - 1]

  if (salary < minStep.salary) return { step: minStep, status: "BELOW" }
  if (salary > maxStep.salary) return { step: maxStep, status: "ABOVE" }

  // Exact match
  const exact = sorted.find(s => Number(s.salary) === salary)
  if (exact) return { step: exact, status: "OK" }

  // Between steps — find the lower one
  const lower = [...sorted].reverse().find(s => salary >= Number(s.salary))
  return lower ? { step: lower, status: "BETWEEN" } : { step: minStep, status: "BETWEEN" }
}

function findGrade(total: number, grades: SalaryGrade[]): SalaryGrade | undefined {
  return grades.find(g => total >= g.scoreMin && total <= g.scoreMax)
}

function salaryFlag(avgSalary: number | undefined, benchmark: BenchmarkData | undefined): { label: string; color: string } {
  if (!avgSalary || !benchmark) return { label: "—", color: "text-slate-400" }
  if (avgSalary < benchmark.p25) {
    const pct = Math.round((benchmark.p25 - avgSalary) / benchmark.p25 * 100)
    return { label: `-${pct}%`, color: "text-red-600 bg-red-50" }
  }
  if (avgSalary <= benchmark.p75) {
    return { label: "în piață", color: "text-emerald-600 bg-emerald-50" }
  }
  const pct = Math.round((avgSalary - benchmark.p75) / benchmark.p75 * 100)
  return { label: `+${pct}%`, color: "text-amber-600 bg-amber-50" }
}

export default function JEResultsTable({ criteria, jobs: initialJobs, grades, sessionId, canEdit }: Props) {
  const [jobs, setJobs] = useState(initialJobs)
  const [saving, setSaving] = useState(false)
  const [validated, setValidated] = useState(false)
  const [salaryAdjustments, setSalaryAdjustments] = useState<Record<string, number>>({}) // "jobId-empIndex" → new salary

  // Build lookup: subfactorId → points, code
  const sfLookup = useMemo(() => {
    const map: Record<string, { points: number; code: string; criterionId: string }> = {}
    for (const crit of criteria) {
      for (const sf of crit.subfactors) {
        map[sf.id] = { points: sf.points, code: sf.code, criterionId: crit.id }
      }
    }
    return map
  }, [criteria])

  // Calculate scores
  const scoredJobs = useMemo(() => {
    return jobs.map(job => {
      const criterionScores: Record<string, { points: number; letter: string }> = {}
      let total = 0

      for (const crit of criteria) {
        const sfId = job.selectedSubfactors[crit.id]
        if (sfId && sfLookup[sfId]) {
          const sf = sfLookup[sfId]
          criterionScores[crit.id] = { points: sf.points, letter: sf.code }
          total += sf.points
        } else {
          criterionScores[crit.id] = { points: 0, letter: "—" }
        }
      }

      return { ...job, criterionScores, total }
    }).sort((a, b) => b.total - a.total)
  }, [jobs, criteria, sfLookup])

  // --- Pitariu: clase salariale din dispersia datelor reale ---
  const salaryPoints = useMemo(() =>
    scoredJobs.flatMap(j =>
      (j.employees || [])
        .filter(e => e.salary > 0)
        .map(e => ({ score: j.total, salary: e.salary, label: `${e.name} — ${j.jobTitle}` }))
    ), [scoredJobs])

  const hasSalaryData = salaryPoints.length >= 2

  const classDetection = useMemo<ClassDetection | null>(() => {
    if (!hasSalaryData) return null
    return autoDetectClassCount(salaryPoints.map(p => p.score))
  }, [salaryPoints, hasSalaryData])

  const [userClassCount, setUserClassCount] = useState<number | null>(null)
  const effectiveClassCount = userClassCount ?? classDetection?.suggested ?? 5

  const pitariuGrades = useMemo(() => {
    if (!hasSalaryData) return null
    const computed = buildPitariuGrades(salaryPoints, effectiveClassCount)
    return computed.length > 0 ? computed : null
  }, [salaryPoints, effectiveClassCount, hasSalaryData])

  const activeGrades: SalaryGrade[] = useMemo(() => {
    if (pitariuGrades) {
      return pitariuGrades.map(g => ({
        name: g.name,
        scoreMin: g.scoreMin,
        scoreMax: g.scoreMax,
        salaryMin: g.salaryMin,
        salaryMax: g.salaryMax,
      }))
    }
    return grades
  }, [pitariuGrades, grades])

  // Hybrid: moștenește steps de la DB grades prin overlap de scor
  const activeGradesWithSteps: SalaryGrade[] = useMemo(() => {
    if (!pitariuGrades) return grades
    return activeGrades.map(ag => {
      const dbMatch = grades.find(dbg =>
        Math.max(ag.scoreMin, dbg.scoreMin) < Math.min(ag.scoreMax, dbg.scoreMax)
      )
      return { ...ag, steps: dbMatch?.steps }
    })
  }, [activeGrades, grades, pitariuGrades])

  // Budget impact calculation
  const budgetImpact = useMemo(() => {
    let totalCurrent = 0
    let totalProposed = 0
    let adjustmentCount = 0

    for (const [key, newSalary] of Object.entries(salaryAdjustments)) {
      const [jobId, empIdx] = key.split("-")
      const job = initialJobs.find(j => j.jobId === jobId)
      const emp = job?.employees?.[parseInt(empIdx)]
      if (emp) {
        totalCurrent += emp.salary
        totalProposed += newSalary
        adjustmentCount++
      }
    }

    return { totalCurrent, totalProposed, diff: totalProposed - totalCurrent, count: adjustmentCount }
  }, [salaryAdjustments, initialJobs])

  const [changeLog, setChangeLog] = useState<Array<{
    timestamp: string; jobTitle: string; criterion: string; from: string; to: string
  }>>([])

  function handleLetterChange(jobId: string, criterionId: string, subfactorId: string) {
    const job = jobs.find(j => j.jobId === jobId)
    const crit = criteria.find(c => c.id === criterionId)
    const oldSfId = job?.selectedSubfactors[criterionId]
    const oldCode = oldSfId ? sfLookup[oldSfId]?.code || "?" : "—"
    const newCode = sfLookup[subfactorId]?.code || "?"

    if (oldCode !== newCode) {
      setChangeLog(prev => [...prev, {
        timestamp: new Date().toLocaleString("ro-RO"),
        jobTitle: job?.jobTitle || "",
        criterion: crit?.name || "",
        from: oldCode,
        to: newCode,
      }])
    }

    setJobs(prev => prev.map(j => {
      if (j.jobId !== jobId) return j
      return { ...j, selectedSubfactors: { ...j.selectedSubfactors, [criterionId]: subfactorId } }
    }))
    setValidated(false)
  }

  async function handleValidate() {
    setSaving(true)
    try {
      await fetch(`/api/v1/sessions/${sessionId}/validate-results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobs: scoredJobs.map(j => ({
            jobId: j.jobId,
            total: j.total,
            subfactors: j.selectedSubfactors,
          })),
          changeLog,
        }),
      })
      setValidated(true)
    } catch (e) {
      console.error("Validation failed:", e)
    }
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Ierarhizarea posturilor</h2>
          <p className="text-sm text-slate-500">
            {canEdit ? "Ajustați nivelul per criteriu dacă e cazul." : ""}
          </p>
        </div>
        {canEdit && (
          <button
            onClick={handleValidate}
            disabled={saving || validated}
            className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              validated
                ? "bg-emerald-100 text-emerald-700"
                : "bg-indigo-600 text-white hover:bg-indigo-700"
            } disabled:opacity-50`}
          >
            {validated ? "✓ Raport validat" : saving ? "Se salvează..." : "Validează raportul final"}
          </button>
        )}
      </div>

      {/* Legendă criterii */}
      <div className="bg-slate-50 rounded-lg p-4 text-xs text-slate-500 grid grid-cols-3 sm:grid-cols-6 gap-2">
        {criteria.map((c, i) => (
          <div key={c.id}>
            <span className="font-bold text-slate-700">{CRITERIA_SHORT[i] || c.name}</span>
            <p className="mt-0.5">{c.name}</p>
            <p className="text-slate-400">{c.subfactors.length} niveluri (A–{String.fromCharCode(64 + c.subfactors.length)})</p>
          </div>
        ))}
      </div>

      {/* Tabel centralizat evaluare — litere editabile per poziție */}
      <div className="bg-white rounded-xl border border-indigo-200 overflow-x-auto">
        <table className="w-full">
          <thead className="bg-indigo-50/50 border-b border-indigo-200">
            <tr>
              <th className="px-2 py-2 text-[8px] text-indigo-500 text-left w-6">#</th>
              <th className="px-2 py-2 text-[8px] text-indigo-500 text-left">Poziție</th>
              <th className="px-2 py-2 text-[8px] text-indigo-500 text-right w-8">Scor</th>
              {criteria.map((c, i) => (
                <th key={c.id} className="px-1 py-2 text-[8px] text-indigo-400 text-center w-6" title={c.name}>
                  {CRITERIA_SHORT[i]}
                </th>
              ))}
              {/* Coloana Clasă apare doar în Secțiunea B (structura salarială) */}
            </tr>
          </thead>
          <tbody>
            {scoredJobs.map((job, rank) => {
              const match = job.jobTitle.match(/^([^(]+?)(?:\s*\((.+)\))?$/)
              const mainTitle = match?.[1]?.trim() || job.jobTitle
              const detail = match?.[2]?.trim()

              return (
                <tr key={job.jobId} className="border-b border-indigo-50 hover:bg-indigo-50/30">
                  <td className="px-2 py-1.5 text-[9px] text-slate-400">{rank + 1}</td>
                  <td className="px-2 py-1.5">
                    <p className="text-[9px] text-slate-700">{mainTitle}</p>
                    {detail && <p className="text-[7px] text-slate-400">{detail}</p>}
                  </td>
                  <td className="px-2 py-1.5 text-right text-[9px] text-indigo-600 font-semibold">{job.total}</td>
                  {criteria.map(crit => {
                    const score = job.criterionScores[crit.id]
                    return (
                      <td key={crit.id} className="px-0.5 py-1.5 text-center">
                        {canEdit ? (
                          <CriterionDropdown
                            currentSfId={job.selectedSubfactors[crit.id] || ""}
                            currentLetter={score?.letter || "—"}
                            criterionName={crit.name}
                            subfactors={crit.subfactors}
                            onChange={(sfId) => handleLetterChange(job.jobId, crit.id, sfId)}
                          />
                        ) : (
                          <span className="text-slate-600 text-[9px]">{score?.letter || "—"}</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECȚIUNEA B: Structura salarială — apare doar cu date din stat
         ═══════════════════════════════════════════════════════════════════ */}

      {!hasSalaryData ? (
        <div className="bg-slate-50 rounded-xl border border-dashed border-slate-300 p-8 text-center">
          <p className="text-sm text-slate-500">Pentru a vedea structura salarială, importați statul de salarii.</p>
          <p className="text-xs text-slate-400 mt-1">Clasele salariale se calculează automat din dispersia salariilor reale.</p>
        </div>
      ) : (
        <>
        {/* Selector clase + ghid dispersie */}
        {classDetection && (
          <ClassCountSelector
            classDetection={classDetection}
            effectiveClassCount={effectiveClassCount}
            userClassCount={userClassCount}
            onClassCountChange={setUserClassCount}
          />
        )}

        {/* Grafic Pitariu */}
        {activeGrades.length > 0 && (
          <SalaryGradeChart
            grades={activeGrades}
            salaryPoints={salaryPoints}
          />
        )}

        {/* Clase salariale și trepte — detaliere naturală a graficului */}
        {activeGradesWithSteps.some(g => g.steps && g.steps.length > 0) && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Clase salariale și trepte</h3>
            <p className="text-xs text-slate-500">
              Fiecare clasă salarială conține mai multe trepte de salarizare. Avansarea între trepte se va face corelat cu evoluția profesională a angajatului aflat în poziția analizată luând în calcul parametri măsurabili cum ar fi nivelul de performanță, vechimea, nivelul de instruire etc. Dacă un angajat se află pe ultima treaptă a clasei de salarizare în care este încadrat, se recomandă elaborarea unui Plan de carieră în vederea retenției acestuia.
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeGradesWithSteps.filter(g => g.steps && g.steps.length > 0).map((g, i) => {
                const colors = ["border-l-indigo-500", "border-l-violet-500", "border-l-fuchsia-500", "border-l-coral", "border-l-emerald-500"]
                const bgColors = ["bg-indigo-50/30", "bg-violet-50/30", "bg-fuchsia-50/30", "bg-orange-50/30", "bg-emerald-50/30"]
                const jobsInGrade = scoredJobs.filter(j => j.total >= g.scoreMin && j.total <= g.scoreMax)

                return (
                  <div key={g.name} className={`rounded-lg border border-slate-200 border-l-4 ${colors[i % 5]} ${bgColors[i % 5]} p-4`}>
                    <p className="text-xs font-bold text-slate-900 mb-1">{g.name.replace("Grad", "Clasa")}</p>
                    <p className="text-[10px] text-slate-400 mb-3">Punctaj: {g.scoreMin}–{g.scoreMax}</p>

                    <div className="space-y-1.5">
                      {g.steps!.map(s => (
                        <div key={s.step} className="flex items-center justify-between text-[10px]">
                          <div className="flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded bg-white border border-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-500">{s.step}</span>
                            <span className="text-slate-700">{s.name}</span>
                          </div>
                          <span className="font-semibold text-slate-900">{Number(s.salary).toLocaleString()} RON</span>
                        </div>
                      ))}
                    </div>

                    {g.steps![0]?.criteria && (
                      <div className="mt-3 pt-2 border-t border-slate-200/50">
                        <p className="text-[9px] text-slate-400 italic">{g.steps![g.steps!.length - 1]?.criteria}</p>
                      </div>
                    )}

                    {jobsInGrade.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-200/50">
                        <p className="text-[9px] text-slate-400 mb-1">Posturi încadrate:</p>
                        {jobsInGrade.map(j => {
                          if (j.employees && j.employees.length > 0 && g.steps && g.steps.length > 0) {
                            return j.employees.map((emp, ei) => {
                              const adjKey = `${j.jobId}-${ei}`
                              const adjustedSalary = salaryAdjustments[adjKey]
                              const displaySalary = adjustedSalary ?? emp.salary
                              const empResult = findStep(displaySalary, g.steps!)
                              const isAdjusted = adjustedSalary !== undefined
                              const sortedSteps = [...g.steps!].sort((a, b) => a.salary - b.salary)
                              const benchmarkMedian = j.benchmark?.median
                              const currentSalary = adjustedSalary ?? emp.salary

                              return (
                                <div key={adjKey} className={`py-1.5 ${isAdjusted ? "bg-emerald-50/50 rounded px-1 -mx-1" : ""}`}>
                                  <div className="flex items-center justify-between text-[10px]">
                                    <span className="text-slate-600">
                                      {emp.name} — <span className="italic text-slate-400">{j.jobTitle}</span>
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                      {empResult && <span className="text-violet-600 font-semibold">T{empResult.step.step}</span>}
                                      {emp.salary > 0 ? (
                                        <>
                                          <span className={`${isAdjusted ? "line-through text-slate-300" : "text-slate-500"}`}>{emp.salary.toLocaleString()}</span>
                                          {isAdjusted && <span className="font-bold text-emerald-700">{adjustedSalary.toLocaleString()} RON</span>}
                                          {!isAdjusted && <span className="text-slate-400">RON</span>}
                                        </>
                                      ) : (
                                        <span className="text-slate-300 italic">fără date salariale</span>
                                      )}
                                    </div>
                                  </div>
                                  {/* Toate treptele din clasă + benchmark */}
                                  {canEdit && emp.salary > 0 && !isAdjusted && (
                                    <div className="flex flex-wrap items-center gap-1 mt-1 ml-4">
                                      {sortedSteps
                                        .filter(s => Number(s.salary) !== currentSalary)
                                        .map(s => {
                                          const stepSalary = Number(s.salary)
                                          const isAbove = stepSalary > currentSalary
                                          return (
                                            <button
                                              key={s.step}
                                              onClick={() => setSalaryAdjustments(prev => ({ ...prev, [adjKey]: stepSalary }))}
                                              className={`text-[8px] font-medium px-1.5 py-0.5 rounded cursor-pointer ${
                                                isAbove
                                                  ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                                                  : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                                              }`}
                                            >
                                              T{s.step} ({stepSalary.toLocaleString()})
                                            </button>
                                          )
                                        })}
                                      {benchmarkMedian && benchmarkMedian !== currentSalary && (
                                        <button
                                          onClick={() => setSalaryAdjustments(prev => ({ ...prev, [adjKey]: benchmarkMedian }))}
                                          className="text-[8px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer"
                                        >
                                          Benchmark ({benchmarkMedian.toLocaleString()})
                                        </button>
                                      )}
                                    </div>
                                  )}
                                  {isAdjusted && (
                                    <button onClick={() => setSalaryAdjustments(prev => { const n = { ...prev }; delete n[adjKey]; return n })} className="text-[8px] text-slate-400 hover:text-red-500 ml-4 mt-0.5 cursor-pointer">
                                      ✕ Anulează ajustarea
                                    </button>
                                  )}
                                </div>
                              )
                            })
                          }
                          const jStepResult = g.steps ? findStep(j.avgSalary, g.steps) : undefined
                          return (
                            <p key={j.jobId} className="text-[10px] text-slate-600">
                              • {j.jobTitle}
                              {jStepResult ? <span className="text-violet-600 font-semibold ml-1">T{jStepResult.step.step}</span> : null}
                              {j.avgSalary ? <span className="text-slate-400 ml-1">({j.avgSalary.toLocaleString()} RON)</span> : null}
                            </p>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

      {/* Tabel detaliat salarii — per angajat */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full">
          <thead>
            {/* Group headers */}
            <tr className="border-b border-slate-200 bg-slate-50">
              <th colSpan={4 + criteria.length} className="px-1 py-1 text-[8px] font-medium text-slate-400 text-left uppercase">Evaluare</th>
              <th colSpan={3} className="px-1 py-1 text-[8px] font-bold text-coral text-center uppercase border-l border-slate-200">Situația curentă</th>
              <th className="px-1 py-1 text-[8px] text-slate-300 text-center border-l border-slate-200">Δ</th>
              <th colSpan={3} className="px-1 py-1 text-[8px] font-bold text-emerald-600 text-center uppercase border-l border-slate-200">Situația adaptată</th>
              <th className="px-1 py-1 text-[8px] text-slate-300 text-center border-l border-slate-200">Δ</th>
              <th colSpan={3} className="px-1 py-1 text-[8px] font-medium text-slate-400 text-center uppercase border-l border-slate-200">Referință</th>
            </tr>
            {/* Column headers — rotite 180° */}
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-1 py-2 text-[8px] text-slate-400 text-left w-5">#</th>
              <th className="px-1 py-2 text-[8px] text-slate-400 text-left w-10">Ang.</th>
              <th className="px-1 py-2 text-[8px] text-slate-400 text-left" style={{maxWidth:"100px"}}>Poziție</th>
              <th className="px-1 py-2 text-[8px] text-slate-400 text-right w-8">Scor</th>
              {criteria.map((c, i) => (
                <th key={c.id} className="px-0.5 py-2 text-[8px] text-slate-400 text-center w-5" title={c.name}>
                  {CRITERIA_SHORT[i]}
                </th>
              ))}
              {/* Situația curentă */}
              <th className="px-1 py-1 text-[7px] text-slate-400 text-center border-l border-slate-200 h-14" style={{writingMode:"vertical-lr",transform:"rotate(180deg)"}}>Sal.RON</th>
              <th className="px-0.5 py-1 text-[7px] text-slate-400 text-center h-14" style={{writingMode:"vertical-lr",transform:"rotate(180deg)"}}>Cls</th>
              <th className="px-0.5 py-1 text-[7px] text-slate-400 text-center h-14" style={{writingMode:"vertical-lr",transform:"rotate(180deg)"}}>Tr</th>
              <th className="px-0.5 py-1 text-[7px] text-slate-400 text-center border-l border-slate-200 h-14" style={{writingMode:"vertical-lr",transform:"rotate(180deg)"}}>Δ%</th>
              {/* Situația adaptată */}
              <th className="px-1 py-1 text-[7px] text-emerald-500 text-center border-l border-slate-200 h-14" style={{writingMode:"vertical-lr",transform:"rotate(180deg)"}}>Sal.RON</th>
              <th className="px-0.5 py-1 text-[7px] text-emerald-500 text-center h-14" style={{writingMode:"vertical-lr",transform:"rotate(180deg)"}}>Cls</th>
              <th className="px-0.5 py-1 text-[7px] text-emerald-500 text-center h-14" style={{writingMode:"vertical-lr",transform:"rotate(180deg)"}}>Tr</th>
              <th className="px-0.5 py-1 text-[7px] text-emerald-500 text-center border-l border-slate-200 h-14" style={{writingMode:"vertical-lr",transform:"rotate(180deg)"}}>Δ%</th>
              {/* Referință */}
              <th className="px-0.5 py-1 text-[7px] text-slate-400 text-center border-l border-slate-200 h-14" style={{writingMode:"vertical-lr",transform:"rotate(180deg)"}}>Sal.minim</th>
              <th className="px-0.5 py-1 text-[7px] text-slate-400 text-center h-14" style={{writingMode:"vertical-lr",transform:"rotate(180deg)"}}>Sal.maxim</th>
              <th className="px-0.5 py-1 text-[7px] text-indigo-400 text-center h-14" style={{writingMode:"vertical-lr",transform:"rotate(180deg)"}}>Benchmark</th>
            </tr>
          </thead>
          <tbody>
            {scoredJobs.flatMap((job, jobIdx) => {
              const grade = findGrade(job.total, activeGrades)
              const gradeNum = grade ? grade.name.replace("Grad ", "").split(" ")[0] : "—"
              const match = job.jobTitle.match(/^([^(]+?)(?:\s*\((.+)\))?$/)
              const mainTitle = match?.[1]?.trim() || job.jobTitle
              const detail = match?.[2]?.trim()

              // If no employees, show one row with avg
              const employees = job.employees && job.employees.length > 0
                ? job.employees
                : [{ name: "—", salary: job.avgSalary || 0 }]

              return employees.map((emp, empIdx) => {
                const isFirstOfJob = empIdx === 0
                const adjKey = `${job.jobId}-${empIdx}`
                const adjustedSalary = salaryAdjustments[adjKey]
                const displaySalary = adjustedSalary ?? emp.salary

                const stepCurrent = grade?.steps ? findStep(emp.salary, grade.steps) : undefined
                const flagCurrent = salaryFlag(emp.salary, job.benchmark)

                const stepAdj = grade?.steps && adjustedSalary ? findStep(adjustedSalary, grade.steps) : undefined
                const flagAdj = adjustedSalary ? salaryFlag(adjustedSalary, job.benchmark) : undefined

                return (
                  <tr key={`${job.jobId}-${empIdx}`} className={`hover:bg-slate-50/30 ${isFirstOfJob ? "border-t border-slate-200" : "border-t border-slate-50"}`}>
                    {/* # — only on first row of job */}
                    <td className="px-1 py-1 text-[8px] text-slate-400">{isFirstOfJob ? jobIdx + 1 : ""}</td>
                    {/* Angajat */}
                    <td className="px-1 py-1 text-[8px] text-slate-500 w-10">{emp.name}</td>
                    {/* Poziție — only on first row */}
                    <td className="px-1 py-1" style={{maxWidth:"100px"}}>
                      {isFirstOfJob ? (
                        <>
                          <p className="text-[8px] text-slate-700 leading-tight">{mainTitle}</p>
                          {detail && <p className="text-[7px] text-slate-400 leading-tight">{detail}</p>}
                        </>
                      ) : null}
                    </td>
                    {/* Scor — only on first */}
                    <td className="px-1 py-1 text-right text-[8px] text-slate-500">{isFirstOfJob ? job.total : ""}</td>
                    {/* Criterii — read-only, doar pe primul rând */}
                    {criteria.map(crit => {
                      const score = job.criterionScores[crit.id]
                      return (
                        <td key={crit.id} className="px-0.5 py-1 text-center">
                          {isFirstOfJob ? <span className="text-slate-500 text-[7px]">{score?.letter || "—"}</span> : null}
                        </td>
                      )
                    })}
                    {/* Situația curentă — per angajat */}
                    <td className={`px-1 py-1 text-right text-[8px] border-l border-slate-100 ${
                      stepCurrent && stepCurrent.status !== "OK" ? "bg-amber-50" : ""
                    } text-slate-600`}>
                      {emp.salary ? emp.salary.toLocaleString() : "—"}
                    </td>
                    <td className="px-0.5 py-1 text-center text-[8px] text-slate-500">{isFirstOfJob ? gradeNum : ""}</td>
                    <td className="px-0.5 py-1 text-center">
                      {stepCurrent ? (
                        <span className={`text-[7px] font-semibold ${
                          stepCurrent.status === "OK" ? "text-emerald-600" :
                          stepCurrent.status === "BELOW" ? "text-red-600" :
                          stepCurrent.status === "ABOVE" ? "text-amber-600" : "text-violet-600"
                        }`}>
                          {stepCurrent.step.step}{stepCurrent.status !== "OK" ? (stepCurrent.status === "BELOW" ? "↓" : stepCurrent.status === "ABOVE" ? "↑" : "↕") : ""}
                        </span>
                      ) : <span className="text-[7px] text-slate-300">—</span>}
                    </td>
                    <td className="px-0.5 py-1 text-center border-l border-slate-100">
                      <span className={`text-[7px] font-bold ${flagCurrent.color}`}>{flagCurrent.label}</span>
                    </td>
                    {/* Situația adaptată */}
                    <td className={`px-1 py-1 text-right text-[8px] border-l border-slate-100 ${adjustedSalary ? "text-emerald-700 font-semibold" : "text-slate-300"}`}>
                      {adjustedSalary ? adjustedSalary.toLocaleString() : "—"}
                    </td>
                    <td className="px-0.5 py-1 text-center text-[8px] text-slate-400">{adjustedSalary && isFirstOfJob ? gradeNum : ""}</td>
                    <td className="px-0.5 py-1 text-center">
                      {stepAdj ? (
                        <span className={`text-[7px] font-semibold ${stepAdj.status === "OK" ? "text-emerald-600" : "text-violet-600"}`}>
                          {stepAdj.step.step}{stepAdj.status !== "OK" ? "↕" : ""}
                        </span>
                      ) : <span className="text-[7px] text-slate-300">—</span>}
                    </td>
                    <td className="px-0.5 py-1 text-center border-l border-slate-100">
                      {flagAdj ? (
                        <span className={`text-[7px] font-bold ${flagAdj.color}`}>{flagAdj.label}</span>
                      ) : <span className="text-[7px] text-slate-300">—</span>}
                    </td>
                    {/* Referință — Min, Max, Benchmark (doar pe primul rând) */}
                    <td className="px-0.5 py-1 text-center text-[7px] text-slate-400 border-l border-slate-100">{isFirstOfJob && grade ? grade.salaryMin.toLocaleString() : ""}</td>
                    <td className="px-0.5 py-1 text-center text-[7px] text-slate-400">{isFirstOfJob && grade ? grade.salaryMax.toLocaleString() : ""}</td>
                    <td className="px-0.5 py-1 text-center text-[7px] text-indigo-400">{isFirstOfJob && job.benchmark ? job.benchmark.median.toLocaleString() : ""}</td>
                  </tr>
                )
              })
            })}
          </tbody>
        </table>
      </div>

      </>
      )}

      {/* Impact bugetar */}
      {budgetImpact.count > 0 && (
        <div className="bg-indigo-50 rounded-xl border border-indigo-200 p-5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-700 mb-3">
            Simulare impact bugetar ({budgetImpact.count} ajustări propuse)
          </h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-[10px] text-slate-500 mb-1">Buget curent (selectați)</p>
              <p className="text-lg font-bold text-slate-900">{budgetImpact.totalCurrent.toLocaleString()} RON</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 mb-1">Buget propus</p>
              <p className="text-lg font-bold text-indigo-700">{budgetImpact.totalProposed.toLocaleString()} RON</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 mb-1">Diferență lunară</p>
              <p className={`text-lg font-bold ${budgetImpact.diff > 0 ? "text-red-600" : "text-emerald-600"}`}>
                {budgetImpact.diff > 0 ? "+" : ""}{budgetImpact.diff.toLocaleString()} RON
              </p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-indigo-200/50 flex items-center justify-between">
            <p className="text-[10px] text-indigo-600">
              Impact anual estimat: <span className="font-bold">{budgetImpact.diff > 0 ? "+" : ""}{(budgetImpact.diff * 12).toLocaleString()} RON</span>
            </p>
            <button
              className="text-[10px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg cursor-pointer"
              onClick={() => {
                // TODO: export stat actualizat
                alert(`Statul actualizat cu ${budgetImpact.count} ajustări va fi exportat. Impact lunar: ${budgetImpact.diff > 0 ? "+" : ""}${budgetImpact.diff.toLocaleString()} RON`)
              }}
            >
              Exportă stat actualizat
            </button>
          </div>
        </div>
      )}

      {/* Jurnal modificări */}
      {changeLog.length > 0 && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-amber-700 mb-3">
            Jurnal modificări ({changeLog.length})
          </h3>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {changeLog.map((entry, i) => (
              <div key={i} className="flex items-center gap-3 text-xs text-amber-800">
                <span className="text-amber-500 flex-shrink-0">{entry.timestamp}</span>
                <span className="font-medium">{entry.jobTitle}</span>
                <span className="text-amber-600">{entry.criterion}:</span>
                <span className="line-through text-amber-400">{entry.from}</span>
                <span>→</span>
                <span className="font-bold">{entry.to}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}

// ── Custom dropdown cu descrieri ─────────────────────────────────────

function CriterionDropdown({
  currentSfId, currentLetter, criterionName, subfactors, onChange,
}: {
  currentSfId: string
  currentLetter: string
  criterionName: string
  subfactors: Array<{ id: string; code: string; points: number; description: string }>
  onChange: (sfId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (btnRef.current && !btnRef.current.contains(e.target as Node)) {
        const panel = document.getElementById("criterion-dropdown-panel")
        if (panel && !panel.contains(e.target as Node)) setOpen(false)
      }
    }
    if (open) document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  function handleOpen() {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      const panelWidth = Math.min(600, window.innerWidth * 0.9)
      let left = rect.left
      // Keep panel within viewport
      if (left + panelWidth > window.innerWidth - 10) left = window.innerWidth - panelWidth - 10
      if (left < 10) left = 10
      // Open upward if button is in lower half of viewport
      const midScreen = window.innerHeight / 2
      const top = rect.top > midScreen ? rect.top - 310 : rect.bottom + 4
      setPos({ top, left })
    }
    setOpen(!open)
  }

  return (
    <div className="inline-block">
      <button
        ref={btnRef}
        onClick={handleOpen}
        className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer ${
          open ? "border-indigo-500 bg-indigo-100 text-indigo-700 ring-3 ring-indigo-200 shadow-lg relative z-50" : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300"
        }`}
      >
        {currentLetter}
        <svg className="inline-block ml-1 w-3 h-3 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <>
          {/* Fade background */}
          <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] transition-opacity" onClick={() => setOpen(false)} />
          <div
            id="criterion-dropdown-panel"
            className="fixed z-50 bg-white rounded-xl shadow-2xl border-[3px] border-indigo-500 overflow-hidden"
            style={{ top: pos.top, left: pos.left, width: "min(600px, 90vw)", maxHeight: "300px" }}
          >
            <div className="px-3 py-2 bg-indigo-50 border-b border-indigo-100">
              <p className="text-xs font-bold text-indigo-700">{criterionName}</p>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: "250px" }}>
              {subfactors.map(sf => (
                <button
                  key={sf.id}
                  onClick={() => { onChange(sf.id); setOpen(false) }}
                  className={`w-full text-left px-3 py-2.5 text-xs transition-colors cursor-pointer flex items-start gap-2 ${
                    sf.id === currentSfId
                      ? "bg-indigo-50 text-indigo-900"
                      : "hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <span className={`flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${
                    sf.id === currentSfId ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
                  }`}>
                    {sf.code}
                  </span>
                  <span className="leading-relaxed">{sf.description}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
