"use client"

import { useMemo } from "react"
import {
  ComposedChart, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceArea, Line, Scatter, CartesianGrid, Legend, Label,
} from "recharts"

interface GradeData {
  name: string
  scoreMin: number
  scoreMax: number
  salaryMin: number
  salaryMax: number
}

interface JobPoint {
  title: string
  score: number
  currentSalary: number | null
}

interface Props {
  grades: GradeData[]
  jobs: JobPoint[]
}

const GRADE_FILLS = [
  "rgba(79, 70, 229, 0.12)",
  "rgba(139, 92, 246, 0.12)",
  "rgba(217, 70, 239, 0.12)",
  "rgba(232, 93, 67, 0.12)",
  "rgba(16, 185, 129, 0.12)",
]
const GRADE_STROKES = ["#4F46E5", "#8B5CF6", "#D946EF", "#E85D43", "#10B981"]

function formatSalary(val: number): string {
  if (val >= 1000) return (val / 1000).toFixed(1).replace(/\.0$/, "") + "K"
  return String(Math.round(val))
}

export default function SalaryGradeChart({ grades, jobs }: Props) {
  const nGrades = grades.length

  // Fiecare clasă ocupă exact 1 unitate pe X (1, 2, 3...)
  // Y = salariu direct (RON) — clasele se suprapun pe verticală

  // Regression: 3 linii (min, max, mediu) pe clase indexate
  const { regressionData, intersectionX } = useMemo(() => {
    if (nGrades < 2) return { regressionData: [], intersectionX: -Infinity }

    const points = grades.map((g, i) => ({
      x: i + 1, // clasă indexată 1..N
      yMin: g.salaryMin,
      yMax: g.salaryMax,
      yAvg: (g.salaryMin + g.salaryMax) / 2,
    }))
    const n = points.length
    const sumX = points.reduce((s, p) => s + p.x, 0)
    const sumXX = points.reduce((s, p) => s + p.x * p.x, 0)

    const calc = (values: number[]) => {
      const sumY = values.reduce((s, v) => s + v, 0)
      const sumXY = points.reduce((s, p, i) => s + p.x * values[i], 0)
      const denom = n * sumXX - sumX * sumX
      if (Math.abs(denom) < 0.001) return { slope: 0, intercept: sumY / n }
      const slope = (n * sumXY - sumX * sumY) / denom
      const intercept = (sumY - slope * sumX) / n
      return { slope, intercept }
    }
    const regMin = calc(points.map(p => p.yMin))
    const regMax = calc(points.map(p => p.yMax))
    const regAvg = calc(points.map(p => p.yAvg))

    // Punct de intersecție min ↔ max
    const slopeDiff = regMax.slope - regMin.slope
    const intX = Math.abs(slopeDiff) > 0.0001
      ? (regMin.intercept - regMax.intercept) / slopeDiff
      : -Infinity

    // Generăm puncte de la 0.5 la N+0.5
    const data = Array.from({ length: 31 }, (_, i) => {
      const x = 0.5 + (nGrades) * (i / 30)
      const rMinVal = regMin.intercept + regMin.slope * x
      const rMaxVal = regMax.intercept + regMax.slope * x
      const rAvgVal = regAvg.intercept + regAvg.slope * x
      const visible = x >= intX
      return {
        classIdx: Math.round(x * 10) / 10,
        regMin: visible ? Math.round(Math.min(rMinVal, rMaxVal)) : null,
        regMax: visible ? Math.round(Math.max(rMinVal, rMaxVal)) : null,
        regAvg: visible ? Math.round(rAvgVal) : null,
      }
    })

    return { regressionData: data, intersectionX: intX }
  }, [grades, nGrades])

  // Scatter: mapează fiecare job la clasa sa (index pe X)
  const currentData = useMemo(() =>
    jobs.filter(j => j.currentSalary && j.currentSalary > 0).map(j => {
      // Găsim clasa în care se încadrează scorul
      const gradeIdx = grades.findIndex(g => j.score >= g.scoreMin && j.score <= g.scoreMax)
      const classX = gradeIdx >= 0 ? gradeIdx + 1 : null
      return classX ? {
        classIdx: classX + (Math.random() * 0.4 - 0.2), // ușor jitter pentru lizibilitate
        salary: j.currentSalary!,
        title: j.title,
        score: j.score,
      } : null
    }).filter(Boolean) as { classIdx: number; salary: number; title: string; score: number }[],
  [jobs, grades])

  // Y domain
  const allSalaryValues = [
    ...grades.map(g => g.salaryMin),
    ...grades.map(g => g.salaryMax),
    ...currentData.map(d => d.salary),
  ]
  const yMin = Math.floor(Math.min(...allSalaryValues) * 0.85 / 100) * 100
  const yMax = Math.ceil(Math.max(...allSalaryValues) * 1.1 / 100) * 100

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h3 className="text-sm font-bold text-slate-900 mb-4">
        Corelație evaluare posturi — clase salariale
      </h3>

      <ResponsiveContainer width="100%" height={420}>
        <ComposedChart margin={{ top: 10, right: 15, bottom: 50, left: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />

          <XAxis
            dataKey="classIdx"
            type="number"
            domain={[0.5, nGrades + 0.5]}
            ticks={grades.map((_, i) => i + 1)}
            tick={{ fontSize: 9, fill: "#94a3b8" }}
            tickFormatter={(v) => {
              const g = grades[v - 1]
              return g ? g.name.replace("Clasă ", "C").replace("Grad ", "C").split(" — ")[0] : ""
            }}
          >
            <Label
              value="Clase salariale (evaluare posturi)"
              position="bottom"
              offset={8}
              style={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }}
            />
          </XAxis>

          <YAxis
            type="number"
            domain={[yMin, yMax]}
            tick={{ fontSize: 9, fill: "#94a3b8" }}
            tickFormatter={(v) => formatSalary(v)}
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

          {/* Clase salariale — dreptunghiuri egale pe X, variabile pe Y */}
          {grades.map((g, i) => (
            <ReferenceArea
              key={g.name}
              x1={i + 0.6}
              x2={i + 1.4}
              y1={g.salaryMin}
              y2={g.salaryMax}
              fill={GRADE_FILLS[i % GRADE_FILLS.length]}
              stroke={GRADE_STROKES[i % GRADE_STROKES.length]}
              strokeWidth={1.5}
              strokeOpacity={0.7}
              label={{
                value: `${g.scoreMin}–${g.scoreMax} pct`,
                position: "insideBottom",
                style: { fontSize: 8, fill: GRADE_STROKES[i % GRADE_STROKES.length], fontWeight: 500 },
              }}
            />
          ))}

          {/* Tendință salariu minim */}
          <Line
            data={regressionData}
            dataKey="regMin"
            stroke="#E85D43"
            strokeWidth={2}
            dot={false}
            name="Tendință sal. min."
            connectNulls
          />

          {/* Tendință salariu maxim */}
          <Line
            data={regressionData}
            dataKey="regMax"
            stroke="#4F46E5"
            strokeWidth={2}
            dot={false}
            name="Tendință sal. max."
            connectNulls
          />

          {/* Tendință salariu mediu (punctat) */}
          <Line
            data={regressionData}
            dataKey="regAvg"
            stroke="#10B981"
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={false}
            name="Tendință sal. mediu"
            connectNulls
          />

          {/* Salarii curente */}
          {currentData.length > 0 && (
            <Scatter
              data={currentData}
              dataKey="salary"
              fill="#E85D43"
              stroke="#fff"
              strokeWidth={1.5}
              name="Salariu curent"
              shape="circle"
            />
          )}

          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0]?.payload
              if (!d) return null
              if (d.title) {
                return (
                  <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-[10px]">
                    <p className="font-bold text-slate-900 mb-1">{d.title}</p>
                    <p className="text-slate-500">Punctaj: {d.score}</p>
                    <p className="text-slate-600">Salariu: {d.salary?.toLocaleString()} RON</p>
                  </div>
                )
              }
              return (
                <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2 text-[10px]">
                  {d.regMin != null && <p className="text-red-500">Tendință min: {d.regMin.toLocaleString()} RON</p>}
                  {d.regAvg != null && <p className="text-emerald-600">Tendință mediu: {d.regAvg.toLocaleString()} RON</p>}
                  {d.regMax != null && <p className="text-indigo-600">Tendință max: {d.regMax.toLocaleString()} RON</p>}
                </div>
              )
            }}
          />

          <Legend
            wrapperStyle={{ fontSize: 9, paddingTop: 18 }}
            iconType="line"
            iconSize={10}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
