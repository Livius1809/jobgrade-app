"use client"

/**
 * SalaryGradeManager — Fluxul complet de gestiune clase salariale
 *
 * T0: Clientul vede alocarea curentă a salariilor pe clase (starea inițială)
 * Alege nr. trepte → Platforma arată potriviri vs diferențe
 * Clientul alege informat → Ajustează → Validează
 *
 * Apare după validarea evaluării (Pachet 1) + import stat salarii (Pachet 2)
 */

import { useState, useEffect, useMemo } from "react"
import { buildPitariuGrades, autoDetectClassCount, type PitariuGrade, type ScorePoint } from "@/lib/evaluation/pitariu-grades"

interface Employee {
  name: string
  position: string
  department: string
  salary: number
  score: number
  gender?: string
}

interface Props {
  employees: Employee[]
  evaluationResults: Array<{ position: string; score: number }>
  onSave?: (grades: PitariuGrade[], stepCount: number, adjustments: Adjustment[]) => void
}

interface Adjustment {
  employeeName: string
  currentSalary: number
  proposedSalary: number
  currentStep: number
  proposedStep: number
  gradeIndex: number
  reason: string
}

interface StepFit {
  employee: Employee
  gradeIndex: number
  gradeName: string
  nearestStep: number
  nearestStepSalary: number
  difference: number // + = peste treaptă, - = sub treaptă
  differencePercent: number
  isMatch: boolean // diferență < 5%
}

export default function SalaryGradeManager({ employees, evaluationResults, onSave }: Props) {
  const [stepCount, setStepCount] = useState(4)
  const [showDetails, setShowDetails] = useState<number | null>(null)
  const [adjustments, setAdjustments] = useState<Adjustment[]>([])

  // Construim punctele scor-salariu
  const scorePoints: ScorePoint[] = useMemo(() => {
    return employees.map(emp => {
      const evalResult = evaluationResults.find(e => e.position === emp.position)
      return {
        score: evalResult?.score ?? 0,
        salary: emp.salary,
        label: `${emp.name} (${emp.position})`,
      }
    }).filter(p => p.score > 0 && p.salary > 0)
  }, [employees, evaluationResults])

  // Auto-detect clase
  const classDetection = useMemo(() => autoDetectClassCount(scorePoints.map(p => p.score)), [scorePoints])
  const [classCount, setClassCount] = useState(classDetection.suggested)

  useEffect(() => {
    setClassCount(classDetection.suggested)
  }, [classDetection.suggested])

  // Construim clasele
  const grades = useMemo(() => {
    if (scorePoints.length < 2) return []
    return buildPitariuGrades(scorePoints, classCount, stepCount)
  }, [scorePoints, classCount, stepCount])

  // Calculăm potriviri salariu curent vs trepte
  const stepFits: StepFit[] = useMemo(() => {
    return employees.map(emp => {
      const evalResult = evaluationResults.find(e => e.position === emp.position)
      const score = evalResult?.score ?? 0
      if (score === 0 || emp.salary === 0) return null

      // Găsim clasa
      const gradeIndex = grades.findIndex(g => score >= g.scoreMin && score <= g.scoreMax)
      if (gradeIndex < 0) return null
      const grade = grades[gradeIndex]

      // Găsim treapta cea mai apropiată
      let nearestStep = 0
      let nearestDiff = Infinity
      for (const step of grade.steps) {
        const diff = Math.abs(emp.salary - step.salary)
        if (diff < nearestDiff) {
          nearestDiff = diff
          nearestStep = step.stepNumber
        }
      }
      const nearestStepSalary = grade.steps.find(s => s.stepNumber === nearestStep)?.salary ?? 0
      const difference = emp.salary - nearestStepSalary
      const differencePercent = nearestStepSalary > 0 ? Math.round(difference / nearestStepSalary * 100) : 0

      return {
        employee: emp,
        gradeIndex,
        gradeName: grade.name,
        nearestStep,
        nearestStepSalary,
        difference,
        differencePercent,
        isMatch: Math.abs(differencePercent) <= 5,
      } as StepFit
    }).filter(Boolean) as StepFit[]
  }, [employees, evaluationResults, grades])

  const matchCount = stepFits.filter(f => f.isMatch).length
  const totalFits = stepFits.length
  const matchPercent = totalFits > 0 ? Math.round(matchCount / totalFits * 100) : 0

  // Impact bugetar
  const currentTotal = stepFits.reduce((s, f) => s + f.employee.salary, 0)
  const proposedTotal = stepFits.reduce((s, f) => s + f.nearestStepSalary, 0)
  const budgetDelta = proposedTotal - currentTotal
  const budgetDeltaPercent = currentTotal > 0 ? Math.round(budgetDelta / currentTotal * 100) : 0

  if (scorePoints.length < 2) {
    return (
      <div className="bg-amber-50 rounded-xl border border-amber-200 p-6 text-center">
        <p className="text-sm text-amber-700">Sunt necesare minim 2 posturi evaluate cu salarii importate pentru a genera clase salariale.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ═══ HEADER: T0 — Situația curentă ═══ */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-1">Situația curentă (T0)</h3>
        <p className="text-xs text-slate-500 mb-4">
          Alocarea salariilor existente pe clasele generate din evaluare.
          {classDetection.cvPercent < 15 ? " Dispersie redusă — 3-5 clase recomandate." :
           classDetection.cvPercent < 30 ? " Dispersie moderată — 5-7 clase recomandate." :
           " Dispersie mare — 7-11 clase recomandate."}
        </p>

        {/* Selector clase */}
        <div className="flex items-center gap-4 mb-4">
          <label className="text-xs text-slate-600 font-medium">Clase:</label>
          <div className="flex gap-1">
            {[3, 5, 7, 9, 11].map(n => (
              <button key={n} onClick={() => setClassCount(n)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                  classCount === n
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}>
                {n}
              </button>
            ))}
          </div>
          <span className="text-[10px] text-slate-400">Sugerat: {classDetection.suggested} (CV: {classDetection.cvPercent.toFixed(0)}%)</span>
        </div>

        {/* Selector trepte */}
        <div className="flex items-center gap-4">
          <label className="text-xs text-slate-600 font-medium">Trepte per clasă:</label>
          <div className="flex gap-1">
            {[2, 3, 4, 5, 6].map(n => (
              <button key={n} onClick={() => setStepCount(n)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                  stepCount === n
                    ? "bg-violet-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}>
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ ANALIZĂ POTRIVIRI ═══ */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Analiză potriviri</h3>
            <p className="text-xs text-slate-500">Salariile actuale vs treptele din {classCount} clase × {stepCount} trepte</p>
          </div>
          <div className="flex gap-3">
            <div className="text-center">
              <div className={`text-2xl font-bold ${matchPercent >= 70 ? "text-emerald-600" : matchPercent >= 40 ? "text-amber-600" : "text-red-600"}`}>
                {matchCount}/{totalFits}
              </div>
              <div className="text-[9px] text-slate-400">potriviri (±5%)</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${Math.abs(budgetDeltaPercent) <= 5 ? "text-emerald-600" : "text-amber-600"}`}>
                {budgetDeltaPercent > 0 ? "+" : ""}{budgetDeltaPercent}%
              </div>
              <div className="text-[9px] text-slate-400">impact buget</div>
            </div>
          </div>
        </div>

        {/* Bară potriviri */}
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden mb-4 flex">
          <div className="h-full bg-emerald-500" style={{ width: `${matchPercent}%` }} title="Potriviri" />
          <div className="h-full bg-amber-400" style={{ width: `${100 - matchPercent}%` }} title="Diferențe" />
        </div>

        {/* Tabel angajați */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-3 py-2 text-slate-500">Angajat</th>
                <th className="text-left px-3 py-2 text-slate-500">Post</th>
                <th className="text-right px-3 py-2 text-slate-500">Salariu actual</th>
                <th className="text-center px-3 py-2 text-slate-500">Clasă</th>
                <th className="text-center px-3 py-2 text-slate-500">Treaptă</th>
                <th className="text-right px-3 py-2 text-slate-500">Salariu treaptă</th>
                <th className="text-right px-3 py-2 text-slate-500">Diferență</th>
                <th className="text-center px-3 py-2 text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {stepFits.sort((a, b) => a.gradeIndex - b.gradeIndex).map((fit, i) => (
                <tr key={i} className={`border-t border-slate-50 ${fit.isMatch ? "" : "bg-amber-50/30"}`}>
                  <td className="px-3 py-2 font-medium text-slate-800">{fit.employee.name}</td>
                  <td className="px-3 py-2 text-slate-600">{fit.employee.position}</td>
                  <td className="px-3 py-2 text-right font-mono">{fit.employee.salary.toLocaleString("ro-RO")}</td>
                  <td className="px-3 py-2 text-center">
                    <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 text-[10px] font-bold">{fit.gradeName}</span>
                  </td>
                  <td className="px-3 py-2 text-center font-mono">T{fit.nearestStep}</td>
                  <td className="px-3 py-2 text-right font-mono">{fit.nearestStepSalary.toLocaleString("ro-RO")}</td>
                  <td className={`px-3 py-2 text-right font-mono font-bold ${
                    fit.isMatch ? "text-emerald-600" : fit.difference > 0 ? "text-amber-600" : "text-red-600"
                  }`}>
                    {fit.difference > 0 ? "+" : ""}{fit.difference.toLocaleString("ro-RO")} ({fit.differencePercent > 0 ? "+" : ""}{fit.differencePercent}%)
                  </td>
                  <td className="px-3 py-2 text-center">
                    {fit.isMatch
                      ? <span className="text-emerald-600 font-bold">✓</span>
                      : <span className="text-amber-500 font-bold">{fit.difference > 0 ? "↑" : "↓"}</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legendă */}
        <div className="flex gap-4 mt-3 text-[10px] text-slate-400">
          <span className="flex items-center gap-1"><span className="text-emerald-600 font-bold">✓</span> Potrivire (±5%)</span>
          <span className="flex items-center gap-1"><span className="text-amber-500 font-bold">↑</span> Peste treaptă</span>
          <span className="flex items-center gap-1"><span className="text-red-500 font-bold">↓</span> Sub treaptă</span>
        </div>
      </div>

      {/* ═══ RECOMANDARE ═══ */}
      <div className={`rounded-xl border p-5 ${
        matchPercent >= 70 ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"
      }`}>
        <h3 className={`text-sm font-bold mb-2 ${matchPercent >= 70 ? "text-emerald-800" : "text-amber-800"}`}>
          {matchPercent >= 70 ? "Structura se potrivește bine" : "Structura necesită ajustări"}
        </h3>
        <p className={`text-xs leading-relaxed ${matchPercent >= 70 ? "text-emerald-700" : "text-amber-700"}`}>
          {matchPercent >= 70
            ? `${matchCount} din ${totalFits} angajați (${matchPercent}%) au salariul actual aliniat cu treapta cea mai apropiată. Impact bugetar: ${budgetDeltaPercent > 0 ? "+" : ""}${budgetDeltaPercent}%. Structura cu ${classCount} clase și ${stepCount} trepte reflectă bine realitatea salarială.`
            : `Doar ${matchCount} din ${totalFits} angajați (${matchPercent}%) sunt aliniați. ${totalFits - matchCount} angajați au diferențe semnificative. Puteți încerca ${classCount > classDetection.suggested ? "mai puține" : "mai multe"} clase sau ${stepCount > 4 ? "mai puține" : "mai multe"} trepte. Impact bugetar la aliniere completă: ${budgetDeltaPercent > 0 ? "+" : ""}${budgetDeltaPercent}% (${budgetDelta > 0 ? "+" : ""}${budgetDelta.toLocaleString("ro-RO")} RON/lună).`
          }
        </p>
      </div>

      {/* ═══ CLASE DETALIATE ═══ */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900">Clase salariale ({classCount})</h3>
        {grades.map((grade, gi) => {
          const gradeEmployees = stepFits.filter(f => f.gradeIndex === gi)
          return (
            <div key={gi} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <button onClick={() => setShowDetails(showDetails === gi ? null : gi)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 text-xs font-bold">{grade.name}</span>
                  <span className="text-xs text-slate-600">
                    {grade.salaryMin.toLocaleString("ro-RO")} — {grade.salaryMax.toLocaleString("ro-RO")} RON
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">{gradeEmployees.length} angajați · {grade.steps.length} trepte</span>
                  <span className="text-slate-400">{showDetails === gi ? "▲" : "▼"}</span>
                </div>
              </button>
              {showDetails === gi && (
                <div className="px-4 pb-4 border-t border-slate-100">
                  <div className="flex gap-2 mt-3 mb-2">
                    {grade.steps.map(step => (
                      <div key={step.stepNumber} className="flex-1 text-center bg-slate-50 rounded-lg p-2">
                        <div className="text-[10px] text-slate-400 font-medium">{step.name}</div>
                        <div className="text-xs font-bold text-slate-700">{step.salary.toLocaleString("ro-RO")}</div>
                      </div>
                    ))}
                  </div>
                  {gradeEmployees.length > 0 && (
                    <div className="space-y-1 mt-2">
                      {gradeEmployees.map((fit, i) => (
                        <div key={i} className="flex items-center justify-between text-xs px-2 py-1 rounded bg-slate-50">
                          <span className="text-slate-700">{fit.employee.name} — {fit.employee.position}</span>
                          <span className={`font-mono font-bold ${fit.isMatch ? "text-emerald-600" : "text-amber-600"}`}>
                            {fit.employee.salary.toLocaleString("ro-RO")} → T{fit.nearestStep} ({fit.differencePercent > 0 ? "+" : ""}{fit.differencePercent}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
