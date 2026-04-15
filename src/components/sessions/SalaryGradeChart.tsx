"use client"

import { useMemo } from "react"
import {
  ComposedChart, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceArea, Line, Scatter, CartesianGrid, Legend, Label,
} from "recharts"
import {
  type PitariuGrade,
  normalizeScoreX,
  buildRegressionLines,
} from "@/lib/evaluation/pitariu-grades"

interface GradeData {
  name: string
  scoreMin: number
  scoreMax: number
  salaryMin: number
  salaryMax: number
}

interface SalaryPointInput {
  score: number
  salary: number
  label: string
}

interface Props {
  grades: GradeData[]
  salaryPoints: SalaryPointInput[]
  title?: string
}

const GRADE_FILLS = [
  "rgba(79, 70, 229, 0.10)",
  "rgba(139, 92, 246, 0.10)",
  "rgba(217, 70, 239, 0.10)",
  "rgba(232, 93, 67, 0.10)",
  "rgba(16, 185, 129, 0.10)",
]
const GRADE_STROKES = ["#4F46E5", "#8B5CF6", "#D946EF", "#E85D43", "#10B981"]

function formatSalary(val: number): string {
  if (val >= 1000) return (val / 1000).toFixed(1).replace(/\.0$/, "") + "K"
  return String(Math.round(val))
}

export default function SalaryGradeChart({ grades, salaryPoints, title }: Props) {
  const nGrades = grades.length
  if (nGrades === 0) return null

  // Y: salariu real (RON)
  const allSalaryValues = [
    ...grades.map(g => g.salaryMin),
    ...grades.map(g => g.salaryMax),
    ...salaryPoints.map(p => p.salary).filter(s => s > 0),
  ]
  const yMinRaw = Math.min(...allSalaryValues)
  const yMaxRaw = Math.max(...allSalaryValues)
  const yPadding = (yMaxRaw - yMinRaw) * 0.1 || 500
  const yMin = Math.floor((yMinRaw - yPadding) / 100) * 100
  const yMax = Math.ceil((yMaxRaw + yPadding) / 100) * 100

  const yTicks = useMemo(() => {
    const range = yMax - yMin
    const step = range <= 2000 ? 200 : range <= 5000 ? 500 : 1000
    const ticks: number[] = []
    for (let v = Math.ceil(yMin / step) * step; v <= yMax; v += step) ticks.push(v)
    return ticks
  }, [yMin, yMax])

  const salaryBreakpoints = useMemo(() =>
    [...new Set(grades.flatMap(g => [g.salaryMin, g.salaryMax]))].sort((a, b) => a - b),
  [grades])

  const xTickValues = useMemo(() => {
    const ticks: { pos: number; label: string }[] = []
    for (let i = 0; i < nGrades; i++) {
      if (i === 0 || grades[i].scoreMin !== grades[i - 1].scoreMax) {
        ticks.push({ pos: i, label: String(grades[i].scoreMin) })
      }
      ticks.push({ pos: i + 1, label: String(grades[i].scoreMax) })
    }
    return ticks
  }, [grades, nGrades])

  // Puncte normalizate pe X
  const normalizedPoints = useMemo(() => {
    const gradesForNorm: PitariuGrade[] = grades.map((g, i) => ({
      ...g,
      order: i + 1,
      scoreMid: (g.scoreMin + g.scoreMax) / 2,
      salaryMid: (g.salaryMin + g.salaryMax) / 2,
    }))
    return salaryPoints
      .filter(p => p.salary > 0)
      .map(p => ({
        ...p,
        normX: normalizeScoreX(p.score, gradesForNorm),
      }))
  }, [salaryPoints, grades])

  // Linii de regresie Pitariu
  const regressionData = useMemo(() => {
    const gradesForReg: PitariuGrade[] = grades.map((g, i) => ({
      ...g,
      order: i + 1,
      scoreMid: (g.scoreMin + g.scoreMax) / 2,
      salaryMid: (g.salaryMin + g.salaryMax) / 2,
    }))
    return buildRegressionLines(gradesForReg)
  }, [grades])

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h3 className="text-xs font-bold text-slate-900 mb-4">
        {title ?? "Situația actuală — corelația dintre scorurile de la evaluarea posturilor de lucru și salariile din statul de salarii"}
      </h3>

      <ResponsiveContainer width="100%" height={440}>
        <ComposedChart margin={{ top: 10, right: 15, bottom: 65, left: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />

          <XAxis
            dataKey="normX"
            type="number"
            domain={[-0.3, nGrades + 0.3]}
            ticks={xTickValues.map(t => t.pos)}
            tick={({ x, y, payload }: any) => {
              const tickInfo = xTickValues.find(t => t.pos === payload.value)
              return (
                <text x={x} y={y + 14} textAnchor="middle"
                  fontSize={9} fontWeight={700} fill="#4F46E5"
                >
                  {tickInfo?.label ?? ""}
                </text>
              )
            }}
          >
            <Label
              value="Punctaj evaluare posturi"
              position="bottom"
              offset={18}
              style={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }}
            />
          </XAxis>

          <YAxis
            type="number"
            domain={[yMin, yMax]}
            ticks={yTicks}
            tick={({ x, y, payload }: any) => {
              const isBreakpoint = salaryBreakpoints.includes(payload.value)
              return (
                <text x={x - 4} y={y + 3} textAnchor="end"
                  fontSize={isBreakpoint ? 9 : 8}
                  fontWeight={isBreakpoint ? 700 : 400}
                  fill={isBreakpoint ? "#4F46E5" : "#94a3b8"}
                >
                  {formatSalary(payload.value)}
                </text>
              )
            }}
            width={50}
          >
            <Label
              value="Salariu (RON)"
              angle={-90}
              position="insideLeft"
              offset={-15}
              style={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }}
            />
          </YAxis>

          {/* Clase salariale */}
          {grades.map((g, i) => (
            <ReferenceArea
              key={g.name}
              x1={i}
              x2={i + 1}
              y1={g.salaryMin}
              y2={g.salaryMax}
              fill={GRADE_FILLS[i % GRADE_FILLS.length]}
              stroke={GRADE_STROKES[i % GRADE_STROKES.length]}
              strokeWidth={1.5}
              strokeOpacity={0.7}
              label={{
                value: g.name.replace("Clasă ", "C"),
                position: "insideTop",
                style: { fontSize: 9, fill: GRADE_STROKES[i % GRADE_STROKES.length], fontWeight: 700 },
              }}
            />
          ))}

          {/* Salarii individuale */}
          {normalizedPoints.length > 0 && (
            <Scatter
              data={normalizedPoints}
              dataKey="salary"
              fill="#334155"
              stroke="#fff"
              strokeWidth={1}
              name="Salarii individuale"
              shape="circle"
              r={3}
            />
          )}

          <Line data={regressionData} dataKey="regMin" stroke="#E85D43" strokeWidth={2} dot={false} name="Evaluare min." connectNulls />
          <Line data={regressionData} dataKey="regMax" stroke="#4F46E5" strokeWidth={2} dot={false} name="Evaluare max." connectNulls />
          <Line data={regressionData} dataKey="regMid" stroke="#10B981" strokeWidth={2} strokeDasharray="6 4" dot={false} name="Punct de mijloc" connectNulls />

          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0]?.payload
              if (!d) return null
              if (d.label) {
                return (
                  <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-[10px]">
                    <p className="font-bold text-slate-900 mb-1">{d.label}</p>
                    <p className="text-slate-500">Punctaj: {d.score}</p>
                    <p className="text-slate-600">Salariu: {d.salary?.toLocaleString()} RON</p>
                  </div>
                )
              }
              return (
                <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2 text-[10px]">
                  {d.regMin != null && <p className="text-red-500">Evaluare min.: {d.regMin.toLocaleString()} RON</p>}
                  {d.regMid != null && <p className="text-emerald-600">Punct de mijloc: {d.regMid.toLocaleString()} RON</p>}
                  {d.regMax != null && <p className="text-indigo-600">Evaluare max.: {d.regMax.toLocaleString()} RON</p>}
                </div>
              )
            }}
          />

          <Legend wrapperStyle={{ fontSize: 9, paddingTop: 35 }} iconType="line" iconSize={10} />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legendă situații angajați */}
      <SituationLegend points={normalizedPoints} grades={grades} />
    </div>
  )
}

// --- Legendă situații sub/peste clasă ---

function SituationLegend({ points, grades }: { points: Array<{ score: number; salary: number; label: string; normX: number }>; grades: GradeData[] }) {
  const analysis = useMemo(() => {
    if (grades.length === 0 || points.length === 0) return null
    const below: string[] = []
    const above: string[] = []
    const overAll: string[] = []
    const underAll: string[] = []
    const lastGrade = grades[grades.length - 1]
    const firstGrade = grades[0]

    for (const p of points) {
      if (p.salary <= 0) continue
      const gradeIdx = grades.findIndex((g, i) =>
        p.score >= g.scoreMin && (i === grades.length - 1 || p.score < grades[i + 1].scoreMin)
      )
      const grade = gradeIdx >= 0 ? grades[gradeIdx] : null
      if (p.salary > lastGrade.salaryMax) overAll.push(p.label)
      else if (p.salary < firstGrade.salaryMin) underAll.push(p.label)
      else if (grade) {
        if (p.salary < grade.salaryMin) below.push(p.label)
        else if (p.salary > grade.salaryMax) above.push(p.label)
      }
    }
    const hasIssues = below.length > 0 || above.length > 0 || overAll.length > 0 || underAll.length > 0
    return { below, above, overAll, underAll, hasIssues }
  }, [points, grades])

  if (!analysis?.hasIssues) return null

  return (
    <div className="mt-4 border-t border-slate-100 pt-4 space-y-3">
      <h4 className="text-[11px] font-bold text-slate-700">Interpretare situație curentă</h4>
      {analysis.underAll.length > 0 && (
        <div className="flex gap-2 items-start">
          <span className="shrink-0 w-2 h-2 rounded-full bg-red-500 mt-1" />
          <div className="text-[10px] text-slate-600">
            <span className="font-semibold text-red-600">Sub toate clasele salariale</span>
            <span className="text-slate-400"> ({analysis.underAll.length})</span>
            <p className="text-slate-500 mt-0.5">Salariul este sub minimul primei clase. Se recomanda o creștere salarială pentru alinierea la structura de salarizare.</p>
          </div>
        </div>
      )}
      {analysis.below.length > 0 && (
        <div className="flex gap-2 items-start">
          <span className="shrink-0 w-2 h-2 rounded-full bg-amber-500 mt-1" />
          <div className="text-[10px] text-slate-600">
            <span className="font-semibold text-amber-600">Sub minimul clasei proprii</span>
            <span className="text-slate-400"> ({analysis.below.length})</span>
            <p className="text-slate-500 mt-0.5">Angajatul este evaluat conform clasei sale, dar salariul actual este sub limita inferioară. Se recomandă o creștere salarială treptată pentru aducerea în interiorul clasei corespunzătoare.</p>
          </div>
        </div>
      )}
      {analysis.above.length > 0 && (
        <div className="flex gap-2 items-start">
          <span className="shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-1" />
          <div className="text-[10px] text-slate-600">
            <span className="font-semibold text-blue-600">Peste maximul clasei proprii</span>
            <span className="text-slate-400"> ({analysis.above.length})</span>
            <p className="text-slate-500 mt-0.5">Salariul depășește limita clasei de evaluare. Conform Pitariu, acest lucru poate indica: un angajat cu experiență valoroasă care a avansat salarial dar nu și ca nivel de responsabilitate, sau o oportunitate de promovare pe o poziție de complexitate superioară.</p>
          </div>
        </div>
      )}
      {analysis.overAll.length > 0 && (
        <div className="flex gap-2 items-start">
          <span className="shrink-0 w-2 h-2 rounded-full bg-purple-500 mt-1" />
          <div className="text-[10px] text-slate-600">
            <span className="font-semibold text-purple-600">Peste toate clasele salariale</span>
            <span className="text-slate-400"> ({analysis.overAll.length})</span>
            <p className="text-slate-500 mt-0.5">Salariul depășește structura salarială a organizației. Se recomandă evaluarea oportunității de redefinire a poziției (fișă de post actualizată, responsabilități suplimentare) sau revizuirea structurii salariale la nivelul claselor superioare.</p>
          </div>
        </div>
      )}
      <p className="text-[9px] text-slate-400 italic pt-1 border-t border-slate-50">
        Suprapunerea între clase este normală: un angajat experimentat dintr-o clasă inferioară
        poate avea un salariu mai mare decât un angajat debutant dintr-o clasă superioară.
      </p>
    </div>
  )
}
