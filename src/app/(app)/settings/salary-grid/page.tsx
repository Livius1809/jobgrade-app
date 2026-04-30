"use client"

import { useEffect, useState, useCallback, useRef } from "react"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SalaryGrade {
  id: string
  name: string
  order: number
  scoreMin: number
  scoreMax: number
  salaryMin: number | null
  salaryMax: number | null
  currency: string
  _count?: { jobResults?: number }
}

interface WizardInput {
  salaryMin: number
  salaryMax: number
  numGrades: number
}

interface PreviewGrade {
  order: number
  name: string
  salaryMin: number
  salaryMax: number
  salaryMid: number
  progression: number | null
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmt(n: number): string {
  return new Intl.NumberFormat("ro-RO", {
    maximumFractionDigits: 0,
  }).format(n)
}

function fmtCurrency(n: number, currency = "RON"): string {
  return `${fmt(n)} ${currency}`
}

/** Generate geometric progression grades from min/max salary */
function generateGeometricGrades(
  salaryMin: number,
  salaryMax: number,
  numGrades: number,
): PreviewGrade[] {
  if (numGrades < 2 || salaryMin >= salaryMax) return []

  // Geometric ratio: salaryMax = salaryMin * r^(n-1) => r = (salaryMax/salaryMin)^(1/(n-1))
  const ratio = Math.pow(salaryMax / salaryMin, 1 / (numGrades - 1))

  const grades: PreviewGrade[] = []
  for (let i = 0; i < numGrades; i++) {
    const gMin = Math.round(salaryMin * Math.pow(ratio, i))
    const gMax = Math.round(
      salaryMin * Math.pow(ratio, i) * (1 + (ratio - 1) * 0.6),
    )
    const gMid = Math.round((gMin + gMax) / 2)

    grades.push({
      order: i + 1,
      name: `Grad ${i + 1}`,
      salaryMin: gMin,
      salaryMax: i === numGrades - 1 ? salaryMax : gMax,
      salaryMid: i === numGrades - 1 ? Math.round((gMin + salaryMax) / 2) : gMid,
      progression: i === 0 ? null : Math.round((gMin / grades[i - 1].salaryMin - 1) * 100),
    })
  }
  return grades
}

/** Row background with indigo gradient based on grade order */
function gradeRowBg(order: number, total: number): string {
  const intensity = Math.round(50 + (order / total) * 150)
  return `rgba(99, 102, 241, ${intensity / 1000})`
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function SalaryGridPage() {
  const [grades, setGrades] = useState<SalaryGrade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Wizard state
  const [wizard, setWizard] = useState<WizardInput>({
    salaryMin: 3700,
    salaryMax: 45000,
    numGrades: 8,
  })
  const [preview, setPreview] = useState<PreviewGrade[] | null>(null)
  const [saving, setSaving] = useState(false)

  // Inline edit
  const [editingCell, setEditingCell] = useState<{
    gradeId: string
    field: "salaryMin" | "salaryMax"
  } | null>(null)
  const [editValue, setEditValue] = useState("")
  const editInputRef = useRef<HTMLInputElement>(null)

  /* ---- Fetch grades ---- */
  const fetchGrades = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/v1/salary-grades")
      if (!res.ok) {
        if (res.status === 404) {
          setGrades([])
          setLoading(false)
          return
        }
        throw new Error(`Eroare ${res.status}`)
      }
      const data = await res.json()
      const list = Array.isArray(data) ? data : data.grades ?? data.data ?? []
      setGrades(list.sort((a: SalaryGrade, b: SalaryGrade) => a.order - b.order))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Eroare la incarcarea datelor"
      setError(msg)
      setGrades([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGrades()
  }, [fetchGrades])

  /* ---- Wizard preview ---- */
  useEffect(() => {
    if (preview !== null) {
      setPreview(
        generateGeometricGrades(wizard.salaryMin, wizard.salaryMax, wizard.numGrades),
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wizard.salaryMin, wizard.salaryMax, wizard.numGrades])

  const handleGeneratePreview = () => {
    setPreview(
      generateGeometricGrades(wizard.salaryMin, wizard.salaryMax, wizard.numGrades),
    )
  }

  /* ---- Save wizard grades ---- */
  const handleSaveGrades = async () => {
    if (!preview || preview.length === 0) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/v1/salary-grades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grades: preview }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Eroare ${res.status}`)
      }
      setPreview(null)
      await fetchGrades()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Eroare la salvare"
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  /* ---- Inline edit ---- */
  const startEdit = (gradeId: string, field: "salaryMin" | "salaryMax", current: number | null) => {
    setEditingCell({ gradeId, field })
    setEditValue(String(current ?? 0))
    setTimeout(() => editInputRef.current?.select(), 50)
  }

  const commitEdit = async () => {
    if (!editingCell) return
    const numVal = parseFloat(editValue)
    if (isNaN(numVal) || numVal < 0) {
      setEditingCell(null)
      return
    }

    // Optimistic update
    setGrades((prev) =>
      prev.map((g) => {
        if (g.id !== editingCell.gradeId) return g
        const updated = { ...g, [editingCell.field]: numVal }
        // Recalculate: if editing min or max, ensure consistency
        if (updated.salaryMin !== null && updated.salaryMax !== null) {
          if (updated.salaryMin > updated.salaryMax) {
            if (editingCell.field === "salaryMin") updated.salaryMax = updated.salaryMin
            else updated.salaryMin = updated.salaryMax
          }
        }
        return updated
      }),
    )
    setEditingCell(null)

    // Persist via PATCH
    try {
      await fetch(`/api/v1/salary-grades/${editingCell.gradeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [editingCell.field]: numVal }),
      })
    } catch {
      // Revert on failure
      await fetchGrades()
    }
  }

  const cancelEdit = () => setEditingCell(null)

  /* ---- Computed stats ---- */
  const activeGrades = grades.filter(
    (g) => g.salaryMin !== null && g.salaryMax !== null,
  )
  const totalMin = activeGrades.length > 0
    ? Math.min(...activeGrades.map((g) => g.salaryMin!))
    : 0
  const totalMax = activeGrades.length > 0
    ? Math.max(...activeGrades.map((g) => g.salaryMax!))
    : 0
  const equityRatio = totalMin > 0 ? (totalMax / totalMin).toFixed(2) : "N/A"
  const totalEmployees = grades.reduce(
    (sum, g) => sum + (g._count?.jobResults ?? 0),
    0,
  )
  const maxSalaryBar = totalMax || 1

  /* ---- Progression helper ---- */
  const getProgression = (grade: SalaryGrade, idx: number): string => {
    if (idx === 0 || !grade.salaryMin) return "-"
    const prev = grades[idx - 1]
    if (!prev.salaryMin) return "-"
    const pct = ((grade.salaryMin - prev.salaryMin) / prev.salaryMin) * 100
    return `+${pct.toFixed(1)}%`
  }

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded" />
        <div className="h-4 w-96 bg-gray-100 rounded" />
        <div className="h-64 bg-gray-50 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-6xl">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Grila salariala
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Clase salariale per grad, progresie geometrica, intervale min-max
        </p>
      </div>

      {/* ── Error ───────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── Summary Stats ───────────────────────────────────────── */}
      {activeGrades.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Grade active"
            value={String(activeGrades.length)}
          />
          <StatCard
            label="Interval salarial"
            value={`${fmt(totalMin)} - ${fmt(totalMax)}`}
            sub={grades[0]?.currency ?? "RON"}
          />
          <StatCard
            label="Raport max/min"
            value={String(equityRatio)}
            sub="echitate"
          />
          <StatCard
            label="Posturi acoperite"
            value={String(totalEmployees)}
          />
        </div>
      )}

      {/* ── No grades → Wizard ──────────────────────────────────── */}
      {grades.length === 0 && !preview && (
        <div className="rounded-xl border border-gray-200 bg-white p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="text-4xl">&#x1f4ca;</div>
            <h2 className="text-lg font-semibold text-gray-900">
              Configureaza grila salariala
            </h2>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Introdu salariul minim (grad 1) si salariul maxim (grad 8).
              Sistemul genereaza automat gradele intermediare cu progresie geometrica.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl mx-auto">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Salariu minim (Grad 1)
              </label>
              <input
                type="number"
                min={1}
                value={wizard.salaryMin}
                onChange={(e) =>
                  setWizard((w) => ({ ...w, salaryMin: Number(e.target.value) }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Salariu maxim (Grad N)
              </label>
              <input
                type="number"
                min={1}
                value={wizard.salaryMax}
                onChange={(e) =>
                  setWizard((w) => ({ ...w, salaryMax: Number(e.target.value) }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Nr. grade
              </label>
              <input
                type="number"
                min={3}
                max={15}
                value={wizard.numGrades}
                onChange={(e) =>
                  setWizard((w) => ({ ...w, numGrades: Number(e.target.value) }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={handleGeneratePreview}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
            >
              Genereaza grila
            </button>
          </div>
        </div>
      )}

      {/* ── Preview table (wizard) ─────────────────────────────── */}
      {preview && preview.length > 0 && (
        <div className="rounded-xl border border-indigo-200 bg-white p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Previzualizare grila
            </h2>
            <div className="flex gap-3">
              <button
                onClick={() => setPreview(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Anuleaza
              </button>
              <button
                onClick={handleSaveGrades}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {saving ? "Se salveaza..." : "Salveaza grila"}
              </button>
            </div>
          </div>

          <GradeTable
            rows={preview.map((p) => ({
              id: `preview-${p.order}`,
              order: p.order,
              name: p.name,
              salaryMin: p.salaryMin,
              salaryMax: p.salaryMax,
              salaryMid: p.salaryMid,
              progression: p.progression !== null ? `+${p.progression}%` : "-",
              postCount: "-",
              currency: "RON",
            }))}
            maxSalary={preview[preview.length - 1]?.salaryMax ?? 1}
            totalRows={preview.length}
            editingCell={null}
            editValue=""
            editInputRef={editInputRef}
            onStartEdit={() => {}}
            onEditChange={() => {}}
            onCommitEdit={() => {}}
            onCancelEdit={() => {}}
            readOnly
          />
        </div>
      )}

      {/* ── Existing grades table ──────────────────────────────── */}
      {grades.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <GradeTable
            rows={grades.map((g, idx) => ({
              id: g.id,
              order: g.order,
              name: g.name,
              salaryMin: g.salaryMin ?? 0,
              salaryMax: g.salaryMax ?? 0,
              salaryMid:
                g.salaryMin !== null && g.salaryMax !== null
                  ? Math.round((g.salaryMin + g.salaryMax) / 2)
                  : 0,
              progression: getProgression(g, idx),
              postCount: String(g._count?.jobResults ?? 0),
              currency: g.currency,
            }))}
            maxSalary={maxSalaryBar}
            totalRows={grades.length}
            editingCell={editingCell}
            editValue={editValue}
            editInputRef={editInputRef}
            onStartEdit={(id, field, val) => startEdit(id, field, val)}
            onEditChange={setEditValue}
            onCommitEdit={commitEdit}
            onCancelEdit={cancelEdit}
            readOnly={false}
          />
        </div>
      )}

      {/* ── Bar chart ──────────────────────────────────────────── */}
      {activeGrades.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">
            Vizualizare benzi salariale
          </h2>
          <div className="space-y-2">
            {grades.map((g) => {
              const min = g.salaryMin ?? 0
              const max = g.salaryMax ?? 0
              const leftPct = (min / maxSalaryBar) * 100
              const widthPct = ((max - min) / maxSalaryBar) * 100
              return (
                <div key={g.id} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-16 text-right shrink-0">
                    Grad {g.order}
                  </span>
                  <div className="flex-1 h-7 bg-gray-50 rounded relative">
                    <div
                      className="absolute h-full rounded"
                      style={{
                        left: `${leftPct}%`,
                        width: `${Math.max(widthPct, 1)}%`,
                        background: `linear-gradient(90deg, rgba(99,102,241,${0.3 + g.order * 0.08}), rgba(99,102,241,${0.5 + g.order * 0.06}))`,
                      }}
                    />
                    <div
                      className="absolute top-0 h-full flex items-center"
                      style={{ left: `${leftPct + widthPct / 2}%`, transform: "translateX(-50%)" }}
                    >
                      <span className="text-[10px] font-medium text-indigo-900 whitespace-nowrap">
                        {fmtCurrency(min)} - {fmtCurrency(max)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Benchmark link ──────────────────────────────────────── */}
      {activeGrades.length > 0 && (
        <div className="text-sm text-gray-500">
          <a
            href="/benchmark"
            className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 hover:underline transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Compara cu piata
          </a>
        </div>
      )}
    </div>
  )
}

/* ================================================================== */
/*  Sub-components                                                     */
/* ================================================================== */

function StatCard({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-semibold text-gray-900 mt-0.5">{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

/* ------------------------------------------------------------------ */

interface GradeRow {
  id: string
  order: number
  name: string
  salaryMin: number
  salaryMax: number
  salaryMid: number
  progression: string
  postCount: string
  currency: string
}

function GradeTable({
  rows,
  maxSalary,
  totalRows,
  editingCell,
  editValue,
  editInputRef,
  onStartEdit,
  onEditChange,
  onCommitEdit,
  onCancelEdit,
  readOnly,
}: {
  rows: GradeRow[]
  maxSalary: number
  totalRows: number
  editingCell: { gradeId: string; field: "salaryMin" | "salaryMax" } | null
  editValue: string
  editInputRef: React.RefObject<HTMLInputElement | null>
  onStartEdit: (id: string, field: "salaryMin" | "salaryMax", val: number) => void
  onEditChange: (val: string) => void
  onCommitEdit: () => void
  onCancelEdit: () => void
  readOnly: boolean
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left">
            <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Grad
            </th>
            <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Denumire
            </th>
            <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">
              Salariu minim
            </th>
            <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">
              Salariu median
            </th>
            <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">
              Salariu maxim
            </th>
            <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">
              Nr. posturi
            </th>
            <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">
              Progresie
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isEditingMin =
              editingCell?.gradeId === row.id && editingCell.field === "salaryMin"
            const isEditingMax =
              editingCell?.gradeId === row.id && editingCell.field === "salaryMax"

            return (
              <tr
                key={row.id}
                className="border-b border-gray-100 transition-colors hover:bg-gray-50"
                style={{ backgroundColor: gradeRowBg(row.order, totalRows) }}
              >
                {/* Grad */}
                <td className="px-4 py-3 font-semibold text-indigo-700">
                  {row.order}
                </td>

                {/* Denumire */}
                <td className="px-4 py-3 text-gray-900">{row.name}</td>

                {/* Salariu minim */}
                <td className="px-4 py-3 text-right">
                  {isEditingMin ? (
                    <input
                      ref={editInputRef}
                      type="number"
                      value={editValue}
                      onChange={(e) => onEditChange(e.target.value)}
                      onBlur={onCommitEdit}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") onCommitEdit()
                        if (e.key === "Escape") onCancelEdit()
                      }}
                      className="w-28 rounded border border-indigo-400 px-2 py-1 text-sm text-right focus:ring-1 focus:ring-indigo-500 outline-none"
                      autoFocus
                    />
                  ) : (
                    <span
                      className={
                        readOnly
                          ? "text-gray-900"
                          : "text-gray-900 cursor-pointer hover:text-indigo-600 hover:underline decoration-dotted"
                      }
                      onClick={() =>
                        !readOnly && onStartEdit(row.id, "salaryMin", row.salaryMin)
                      }
                      title={readOnly ? undefined : "Click pentru editare"}
                    >
                      {fmtCurrency(row.salaryMin, row.currency)}
                    </span>
                  )}
                </td>

                {/* Salariu median */}
                <td className="px-4 py-3 text-right text-gray-600">
                  {fmtCurrency(row.salaryMid, row.currency)}
                </td>

                {/* Salariu maxim */}
                <td className="px-4 py-3 text-right">
                  {isEditingMax ? (
                    <input
                      ref={editInputRef}
                      type="number"
                      value={editValue}
                      onChange={(e) => onEditChange(e.target.value)}
                      onBlur={onCommitEdit}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") onCommitEdit()
                        if (e.key === "Escape") onCancelEdit()
                      }}
                      className="w-28 rounded border border-indigo-400 px-2 py-1 text-sm text-right focus:ring-1 focus:ring-indigo-500 outline-none"
                      autoFocus
                    />
                  ) : (
                    <span
                      className={
                        readOnly
                          ? "text-gray-900"
                          : "text-gray-900 cursor-pointer hover:text-indigo-600 hover:underline decoration-dotted"
                      }
                      onClick={() =>
                        !readOnly && onStartEdit(row.id, "salaryMax", row.salaryMax)
                      }
                      title={readOnly ? undefined : "Click pentru editare"}
                    >
                      {fmtCurrency(row.salaryMax, row.currency)}
                    </span>
                  )}
                </td>

                {/* Nr. posturi */}
                <td className="px-4 py-3 text-center text-gray-600">
                  {row.postCount}
                </td>

                {/* Progresie */}
                <td className="px-4 py-3 text-right">
                  <span
                    className={
                      row.progression === "-"
                        ? "text-gray-400"
                        : "text-emerald-600 font-medium"
                    }
                  >
                    {row.progression}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
