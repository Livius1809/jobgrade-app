"use client"

import { useMemo } from "react"
import {
  ComposedChart, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceArea, ReferenceLine, Line, CartesianGrid, Legend,
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
  salary: number | null
  letter: string
}

interface Props {
  grades: GradeData[]
  jobs: JobPoint[]
}

const GRADE_FILLS = [
  "rgba(79, 70, 229, 0.12)",    // indigo
  "rgba(139, 92, 246, 0.12)",   // violet
  "rgba(217, 70, 239, 0.12)",   // fuchsia
  "rgba(232, 93, 67, 0.12)",    // coral
  "rgba(16, 185, 129, 0.12)",   // emerald
]

const GRADE_STROKES = [
  "#4F46E5", "#8B5CF6", "#D946EF", "#E85D43", "#10B981",
]

export default function SalaryGradeChart({ grades, jobs }: Props) {
  // Grades: X axis = punctaj fix per clasă (fără overlap pe orizontală)
  // Y axis = salarii cu suprapunere între clase adiacente
  const overlappedGrades = useMemo(() => {
    return grades.map(g => ({
      ...g,
      displayMin: g.scoreMin,
      displayMax: g.scoreMax,
    }))
  }, [grades])

  // Linear regression for min and max salary curves
  const regressionData = useMemo(() => {
    if (grades.length < 2) return []

    const points = grades.map(g => ({
      x: (g.scoreMin + g.scoreMax) / 2,
      yMin: g.salaryMin,
      yMax: g.salaryMax,
    }))

    const n = points.length
    const sumX = points.reduce((s, p) => s + p.x, 0)
    const sumXX = points.reduce((s, p) => s + p.x * p.x, 0)

    const calcRegression = (values: number[]) => {
      const sumY = values.reduce((s, v) => s + v, 0)
      const sumXY = points.reduce((s, p, i) => s + p.x * values[i], 0)
      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
      const intercept = (sumY - slope * sumX) / n
      return { slope, intercept }
    }

    const regMin = calcRegression(points.map(p => p.yMin))
    const regMax = calcRegression(points.map(p => p.yMax))

    const xStart = Math.min(...grades.map(g => g.scoreMin)) - 10
    const xEnd = Math.max(...grades.map(g => g.scoreMax)) + 10
    const steps = 30

    return Array.from({ length: steps + 1 }, (_, i) => {
      const x = xStart + (xEnd - xStart) * (i / steps)
      return {
        score: Math.round(x),
        regMin: Math.round(regMin.intercept + regMin.slope * x),
        regMax: Math.round(regMax.intercept + regMax.slope * x),
      }
    })
  }, [grades])

  const allSalaries = [...grades.map(g => g.salaryMin), ...grades.map(g => g.salaryMax)]
  const yMin = Math.min(...allSalaries) * 0.7
  const yMax = Math.max(...allSalaries) * 1.15
  const xMin = Math.min(...grades.map(g => g.scoreMin)) - 30
  const xMax = Math.max(...grades.map(g => g.scoreMax)) + 30

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h3 className="text-sm font-bold text-slate-900 mb-1">
        Corelație punctaj evaluare — clase salariale
      </h3>
      <p className="text-[10px] text-slate-400 mb-6">
        Fiecare clasă salarială are un interval de punctaj fix. Intervalele salariale se pot suprapune între clase adiacente.
        Curbele arată tendința salariului minim și maxim în funcție de punctaj.
      </p>

      <ResponsiveContainer width="100%" height={420}>
        <ComposedChart margin={{ top: 10, right: 20, bottom: 30, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="score"
            type="number"
            domain={[xMin, xMax]}
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            label={{ value: "Punctaj evaluare", position: "bottom", offset: 10, style: { fontSize: 11, fill: "#64748b" } }}
          />
          <YAxis
            type="number"
            domain={[yMin, yMax]}
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}K` : String(v)}
            label={{ value: "Salariu (RON)", angle: -90, position: "insideLeft", offset: -5, style: { fontSize: 11, fill: "#64748b" } }}
          />

          {/* Grade rectangles with overlap */}
          {overlappedGrades.map((g, i) => (
            <ReferenceArea
              key={g.name}
              x1={g.displayMin}
              x2={g.displayMax}
              y1={g.salaryMin}
              y2={g.salaryMax}
              fill={GRADE_FILLS[i % GRADE_FILLS.length]}
              stroke={GRADE_STROKES[i % GRADE_STROKES.length]}
              strokeWidth={2}
              strokeOpacity={0.6}
              label={{
                value: g.name,
                position: "insideTop",
                style: {
                  fontSize: 9,
                  fill: GRADE_STROKES[i % GRADE_STROKES.length],
                  fontWeight: 700,
                },
              }}
            />
          ))}

          {/* Grade boundary lines on X axis */}
          {grades.map((g, i) => (
            <ReferenceLine
              key={`boundary-${i}`}
              x={g.scoreMax}
              stroke="#94a3b8"
              strokeWidth={1}
              strokeDasharray="4 4"
              label={i < grades.length - 1 ? {
                value: String(g.scoreMax),
                position: "bottom",
                style: { fontSize: 9, fill: "#94a3b8", fontWeight: 600 },
              } : undefined}
            />
          ))}
          {/* First boundary (start of class 1) */}
          <ReferenceLine
            x={grades[0]?.scoreMin}
            stroke="#94a3b8"
            strokeWidth={1}
            strokeDasharray="4 4"
            label={{
              value: String(grades[0]?.scoreMin),
              position: "bottom",
              style: { fontSize: 9, fill: "#94a3b8", fontWeight: 600 },
            }}
          />

          {/* Regression line MIN */}
          <Line
            data={regressionData}
            dataKey="regMin"
            stroke="#E85D43"
            strokeWidth={2.5}
            dot={false}
            name="Tendință minim"
            connectNulls
          />

          {/* Regression line MAX */}
          <Line
            data={regressionData}
            dataKey="regMax"
            stroke="#4F46E5"
            strokeWidth={2.5}
            dot={false}
            name="Tendință maxim"
            connectNulls
          />

          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0]?.payload
              if (!d) return null
              return (
                <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-[10px]">
                  <p className="text-slate-500">Punctaj: {d.score}</p>
                  {d.regMin != null && <p className="text-red-500">Minim: {d.regMin.toLocaleString()} RON</p>}
                  {d.regMax != null && <p className="text-indigo-600">Maxim: {d.regMax.toLocaleString()} RON</p>}
                </div>
              )
            }}
          />

          <Legend
            wrapperStyle={{ fontSize: 10, paddingTop: 15 }}
            iconType="line"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
