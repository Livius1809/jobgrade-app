"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

interface SalaryGrade {
  id: string
  name: string
  level: number
  minSalary: number
  maxSalary: number
}

interface VariableComponent {
  id: string
  salaryGradeId: string
  type: "BONUS" | "COMMISSION" | "BENEFIT"
  targetPct: number
  frequency: "MONTHLY" | "QUARTERLY" | "ANNUAL"
  criteria: string
}

type CompType = "BONUS" | "COMMISSION" | "BENEFIT"
type Frequency = "MONTHLY" | "QUARTERLY" | "ANNUAL"

const COMP_LABELS: Record<CompType, string> = {
  BONUS: "Bonus",
  COMMISSION: "Comision",
  BENEFIT: "Beneficiu",
}

const FREQ_LABELS: Record<Frequency, string> = {
  MONTHLY: "Lunar",
  QUARTERLY: "Trimestrial",
  ANNUAL: "Anual",
}

export default function VariableCompensationPage() {
  const [grades, setGrades] = useState<SalaryGrade[]>([])
  const [components, setComponents] = useState<VariableComponent[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [expandedGrade, setExpandedGrade] = useState<string | null>(null)

  // Form state per grade
  const [formType, setFormType] = useState<CompType>("BONUS")
  const [formTargetPct, setFormTargetPct] = useState("")
  const [formFrequency, setFormFrequency] = useState<Frequency>("ANNUAL")
  const [formCriteria, setFormCriteria] = useState("")

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [gradesRes, compRes] = await Promise.all([
        fetch("/api/v1/salary-grades"),
        fetch("/api/v1/compensation/variable"),
      ])
      const gradesData = await gradesRes.json()
      const compData = await compRes.json()
      setGrades(gradesData.grades || gradesData || [])
      setComponents(compData.components || compData || [])
    } catch { /* silent */ }
    setLoading(false)
  }

  async function addComponent(salaryGradeId: string) {
    if (!formTargetPct || !formCriteria) return
    setSubmitting(true)
    try {
      await fetch("/api/v1/compensation/variable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salaryGradeId,
          type: formType,
          targetPct: parseFloat(formTargetPct),
          frequency: formFrequency,
          criteria: formCriteria,
        }),
      })
      setFormType("BONUS")
      setFormTargetPct("")
      setFormFrequency("ANNUAL")
      setFormCriteria("")
      loadData()
    } catch { /* silent */ }
    setSubmitting(false)
  }

  function gradeComponents(gradeId: string) {
    return components.filter((c) => c.salaryGradeId === gradeId)
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Pachete salariale &mdash; fix + variabil
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Definește componente variabile (bonus, comision, beneficii) pe fiecare grad salarial
          </p>
        </div>
        <Link
          href="/compensation"
          className="text-sm text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          &larr; Compensații
        </Link>
      </div>

      {loading && <p className="text-sm text-text-secondary">Se incarca...</p>}

      {!loading && grades.length === 0 && (
        <div className="rounded-lg border border-border bg-surface p-6 text-center text-text-secondary text-sm">
          Nu exista grade salariale. Defineste mai intai gradele in sectiunea Compensatii.
        </div>
      )}

      {!loading && grades.length > 0 && (
        <div className="space-y-4">
          {grades.map((grade) => {
            const gc = gradeComponents(grade.id)
            const isExpanded = expandedGrade === grade.id

            return (
              <div
                key={grade.id}
                className="rounded-lg border border-border bg-surface overflow-hidden"
              >
                {/* Grade header */}
                <button
                  onClick={() => setExpandedGrade(isExpanded ? null : grade.id)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-indigo-50/30 transition-colors text-left"
                >
                  <div>
                    <span className="font-semibold text-foreground">
                      {grade.name}
                    </span>
                    <span className="ml-2 text-xs text-text-secondary">
                      Nivel {grade.level}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-text-secondary">
                      {gc.length} componente variabile
                    </span>
                    <span className="text-text-secondary">
                      {isExpanded ? "\u25B2" : "\u25BC"}
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-border px-5 py-4 space-y-4">
                    {/* Existing components */}
                    {gc.length > 0 && (
                      <div className="space-y-2">
                        {gc.map((comp) => (
                          <div
                            key={comp.id}
                            className="flex items-center justify-between rounded-md bg-indigo-50/50 px-4 py-2 text-sm"
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-medium text-indigo-700">
                                {COMP_LABELS[comp.type]}
                              </span>
                              <span className="text-text-secondary">
                                {comp.targetPct}% target
                              </span>
                              <span className="text-text-secondary">
                                {FREQ_LABELS[comp.frequency]}
                              </span>
                            </div>
                            <span className="text-xs text-text-secondary max-w-xs truncate">
                              {comp.criteria}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add form */}
                    <div className="border-t border-border/50 pt-4">
                      <p className="text-xs font-medium text-text-secondary mb-3">
                        Adauga componenta variabila
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-text-secondary mb-1">
                            Tip
                          </label>
                          <select
                            value={formType}
                            onChange={(e) => setFormType(e.target.value as CompType)}
                            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
                          >
                            <option value="BONUS">Bonus</option>
                            <option value="COMMISSION">Comision</option>
                            <option value="BENEFIT">Beneficiu</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-text-secondary mb-1">
                            Target (%)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={formTargetPct}
                            onChange={(e) => setFormTargetPct(e.target.value)}
                            placeholder="ex: 15"
                            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-text-secondary mb-1">
                            Frecventa
                          </label>
                          <select
                            value={formFrequency}
                            onChange={(e) => setFormFrequency(e.target.value as Frequency)}
                            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
                          >
                            <option value="MONTHLY">Lunar</option>
                            <option value="QUARTERLY">Trimestrial</option>
                            <option value="ANNUAL">Anual</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-text-secondary mb-1">
                            Criterii
                          </label>
                          <input
                            type="text"
                            value={formCriteria}
                            onChange={(e) => setFormCriteria(e.target.value)}
                            placeholder="ex: Depasire target vanzari cu 10%"
                            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => addComponent(grade.id)}
                        disabled={submitting || !formTargetPct || !formCriteria}
                        className="mt-3 text-sm font-medium bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                      >
                        {submitting ? "Se salveaza..." : "Adauga"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
