"use client"

import { useMemo } from "react"
import {
  ComposedChart, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceArea, ReferenceLine, Line, Scatter, CartesianGrid, Legend, Label,
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
  currentSalary: number | null     // a) salariu curent din stat
  adjustedSalary?: number | null   // c) salariu după ajustare
  benchmarkSalary?: number | null  // d) benchmark piață
}

interface Props {
  grades: GradeData[]
  jobs: JobPoint[]
}

const GRADE_FILLS = [
  "rgba(79, 70, 229, 0.10)",
  "rgba(139, 92, 246, 0.10)",
  "rgba(217, 70, 239, 0.10)",
  "rgba(232, 93, 67, 0.10)",
  "rgba(16, 185, 129, 0.10)",
]
const GRADE_STROKES = ["#4F46E5", "#8B5CF6", "#D946EF", "#E85D43", "#10B981"]

export default function SalaryGradeChart({ grades, jobs }: Props) {
  // Regression lines
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

    const calc = (values: number[]) => {
      const sumY = values.reduce((s, v) => s + v, 0)
      const sumXY = points.reduce((s, p, i) => s + p.x * values[i], 0)
      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
      const intercept = (sumY - slope * sumX) / n
      return { slope, intercept }
    }
    const regMin = calc(points.map(p => p.yMin))
    const regMax = calc(points.map(p => p.yMax))

    const xStart = Math.min(...grades.map(g => g.scoreMin)) - 10
    const xEnd = Math.max(...grades.map(g => g.scoreMax)) + 10
    return Array.from({ length: 31 }, (_, i) => {
      const x = xStart + (xEnd - xStart) * (i / 30)
      return {
        score: Math.round(x),
        regMin: Math.round(regMin.intercept + regMin.slope * x),
        regMax: Math.round(regMax.intercept + regMax.slope * x),
      }
    })
  }, [grades])

  // Scatter datasets
  const currentData = useMemo(() =>
    jobs.filter(j => j.currentSalary).map(j => ({ score: j.score, salary: j.currentSalary!, title: j.title })),
  [jobs])

  const adjustedData = useMemo(() =>
    jobs.filter(j => j.adjustedSalary && j.adjustedSalary !== j.currentSalary).map(j => ({ score: j.score, salary: j.adjustedSalary!, title: j.title })),
  [jobs])

  const benchmarkData = useMemo(() =>
    jobs.filter(j => j.benchmarkSalary).map(j => ({ score: j.score, salary: j.benchmarkSalary!, title: j.title })),
  [jobs])

  // Axes
  const allSalaries = [...grades.map(g => g.salaryMin), ...grades.map(g => g.salaryMax),
    ...currentData.map(d => d.salary), ...benchmarkData.map(d => d.salary)]
  const yMin = Math.min(...allSalaries) * 0.7
  const yMax = Math.max(...allSalaries) * 1.15
  const xMin = Math.min(...grades.map(g => g.scoreMin)) - 20
  const xMax = Math.max(...grades.map(g => g.scoreMax)) + 20

  // Decile ticks on Y
  const yRange = yMax - yMin
  const decileTicks = Array.from({ length: 11 }, (_, i) => Math.round(yMin + yRange * (i / 10)))

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h3 className="text-sm font-bold text-slate-900 mb-4">
        Corelație evaluare posturi — clase salariale
      </h3>

      <ResponsiveContainer width="100%" height={450}>
        <ComposedChart margin={{ top: 15, right: 25, bottom: 35, left: 25 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />

          <XAxis
            dataKey="score"
            type="number"
            domain={[xMin, xMax]}
            tick={{ fontSize: 10, fill: "#94a3b8" }}
          >
            <Label value="Evaluare posturi de lucru" position="bottom" offset={15} style={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }} />
          </XAxis>

          <YAxis
            type="number"
            domain={[yMin, yMax]}
            ticks={decileTicks}
            tick={{ fontSize: 9, fill: "#94a3b8" }}
            tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}K` : String(v)}
          >
            <Label value="Evaluare salarii" angle={-90} position="insideLeft" offset={-10} style={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }} />
          </YAxis>

          {/* Grade rectangles */}
          {grades.map((g, i) => (
            <ReferenceArea
              key={g.name}
              x1={g.scoreMin}
              x2={g.scoreMax}
              y1={g.salaryMin}
              y2={g.salaryMax}
              fill={GRADE_FILLS[i % GRADE_FILLS.length]}
              stroke={GRADE_STROKES[i % GRADE_STROKES.length]}
              strokeWidth={2}
              strokeOpacity={0.6}
              label={{
                value: g.name.replace("Grad ", "C").split(" — ")[0],
                position: "insideTop",
                style: { fontSize: 10, fill: GRADE_STROKES[i % GRADE_STROKES.length], fontWeight: 700 },
              }}
            />
          ))}

          {/* Boundary lines */}
          {grades.map((g, i) => (
            <ReferenceLine
              key={`b-${i}`}
              x={g.scoreMax}
              stroke="#cbd5e1"
              strokeWidth={1}
              strokeDasharray="4 4"
              label={i < grades.length - 1 ? {
                value: String(g.scoreMax),
                position: "bottom",
                style: { fontSize: 8, fill: "#94a3b8" },
              } : undefined}
            />
          ))}
          <ReferenceLine x={grades[0]?.scoreMin} stroke="#cbd5e1" strokeWidth={1} strokeDasharray="4 4"
            label={{ value: String(grades[0]?.scoreMin), position: "bottom", style: { fontSize: 8, fill: "#94a3b8" } }}
          />

          {/* Regression MIN — with label on curve */}
          <Line data={regressionData} dataKey="regMin" stroke="#E85D43" strokeWidth={2.5} dot={false} name="Tendință sal. min." connectNulls />

          {/* Regression MAX — with label on curve */}
          <Line data={regressionData} dataKey="regMax" stroke="#4F46E5" strokeWidth={2.5} dot={false} name="Tendință sal. max." connectNulls />

          {/* a) Salarii curente — cercuri coral */}
          {currentData.length > 0 && (
            <Scatter data={currentData} dataKey="salary" fill="#E85D43" stroke="#fff" strokeWidth={1.5} name="Salariu curent" shape="circle" />
          )}

          {/* c) Salarii ajustate — cercuri verzi */}
          {adjustedData.length > 0 && (
            <Scatter data={adjustedData} dataKey="salary" fill="#10B981" stroke="#fff" strokeWidth={1.5} name="Salariu ajustat" shape="circle" />
          )}

          {/* d) Benchmark — diamante gri */}
          {benchmarkData.length > 0 && (
            <Scatter data={benchmarkData} dataKey="salary" fill="#6366F1" stroke="#fff" strokeWidth={1.5} name="Benchmark piață" shape="diamond" />
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
                  <p className="text-slate-500">Punctaj: {d.score}</p>
                  {d.regMin != null && <p className="text-red-500">Min: {d.regMin.toLocaleString()} RON</p>}
                  {d.regMax != null && <p className="text-indigo-600">Max: {d.regMax.toLocaleString()} RON</p>}
                </div>
              )
            }}
          />

          <Legend
            wrapperStyle={{ fontSize: 10, paddingTop: 10 }}
            iconType="circle"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
