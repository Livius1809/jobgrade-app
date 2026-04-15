"use client"

import { useMemo } from "react"
import {
  ComposedChart, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceArea, Line, Scatter, Legend, CartesianGrid,
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
  salary: number | null // null dacă normă parțială
  letter: string // prima literă din grad
}

interface Props {
  grades: GradeData[]
  jobs: JobPoint[]
  benchmarkJobs?: Array<{ score: number; benchmarkMedian: number }>
}

// Culori per grad
const GRADE_COLORS = [
  { fill: "rgba(79, 70, 229, 0.08)", stroke: "#4F46E5" },   // indigo — Grad 1
  { fill: "rgba(139, 92, 246, 0.08)", stroke: "#8B5CF6" },   // violet — Grad 2
  { fill: "rgba(217, 70, 239, 0.08)", stroke: "#D946EF" },   // fuchsia — Grad 3
  { fill: "rgba(232, 93, 67, 0.08)", stroke: "#E85D43" },    // coral — Grad 4
  { fill: "rgba(16, 185, 129, 0.08)", stroke: "#10B981" },   // emerald — Grad 5
]

export default function SalaryGradeChart({ grades, jobs, benchmarkJobs }: Props) {
  // Regression lines (min and max)
  const regressionData = useMemo(() => {
    // Calculate linear regression for min and max salary lines
    const points = grades.flatMap(g => [
      { x: g.scoreMin, yMin: g.salaryMin, yMax: g.salaryMax },
      { x: g.scoreMax, yMin: g.salaryMin, yMax: g.salaryMax },
    ])

    if (points.length < 2) return []

    // Simple linear regression for min line
    const n = points.length
    const sumX = points.reduce((s, p) => s + p.x, 0)
    const sumYMin = points.reduce((s, p) => s + p.yMin, 0)
    const sumYMax = points.reduce((s, p) => s + p.yMax, 0)
    const sumXX = points.reduce((s, p) => s + p.x * p.x, 0)
    const sumXYMin = points.reduce((s, p) => s + p.x * p.yMin, 0)
    const sumXYMax = points.reduce((s, p) => s + p.x * p.yMax, 0)

    const slopeMin = (n * sumXYMin - sumX * sumYMin) / (n * sumXX - sumX * sumX)
    const interceptMin = (sumYMin - slopeMin * sumX) / n
    const slopeMax = (n * sumXYMax - sumX * sumYMax) / (n * sumXX - sumX * sumX)
    const interceptMax = (sumYMax - slopeMax * sumX) / n

    // Generate points along the range
    const minScore = Math.min(...grades.map(g => g.scoreMin))
    const maxScore = Math.max(...grades.map(g => g.scoreMax))
    const step = (maxScore - minScore) / 20

    const data = []
    for (let x = minScore; x <= maxScore; x += step) {
      data.push({
        score: Math.round(x),
        regMin: Math.round(interceptMin + slopeMin * x),
        regMax: Math.round(interceptMax + slopeMax * x),
      })
    }
    return data
  }, [grades])

  // Scatter data for actual salaries
  const scatterData = useMemo(() => {
    return jobs.filter(j => j.salary !== null).map(j => ({
      score: j.score,
      salary: j.salary,
      title: j.title,
    }))
  }, [jobs])

  // Decile labels on Y axis
  const allSalaries = [...grades.map(g => g.salaryMin), ...grades.map(g => g.salaryMax)]
  const yMin = Math.min(...allSalaries) * 0.8
  const yMax = Math.max(...allSalaries) * 1.1
  const xMin = Math.min(...grades.map(g => g.scoreMin)) - 20
  const xMax = Math.max(...grades.map(g => g.scoreMax)) + 20

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h3 className="text-sm font-bold text-slate-900 mb-1">
        Corelație punctaj evaluare — clase salariale
      </h3>
      <p className="text-[10px] text-slate-400 mb-6">
        Dreptunghiurile reprezintă clasele salariale. Curbele arată tendința minimă și maximă.
        Punctele sunt salariile reale ale angajaților.
      </p>

      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="score"
            type="number"
            domain={[xMin, xMax]}
            label={{ value: "Punctaj evaluare", position: "bottom", offset: 5, style: { fontSize: 11, fill: "#94a3b8" } }}
            tick={{ fontSize: 10, fill: "#94a3b8" }}
          />
          <YAxis
            type="number"
            domain={[yMin, yMax]}
            label={{ value: "Salariu (RON)", angle: -90, position: "insideLeft", offset: -5, style: { fontSize: 11, fill: "#94a3b8" } }}
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}K` : String(v)}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const data = payload[0]?.payload
              if (data?.title) {
                return (
                  <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs">
                    <p className="font-bold text-slate-900">{data.title}</p>
                    <p className="text-slate-500">Punctaj: {data.score}</p>
                    <p className="text-slate-500">Salariu: {data.salary?.toLocaleString()} RON</p>
                  </div>
                )
              }
              return null
            }}
          />

          {/* Grade rectangles (reference areas) */}
          {grades.map((g, i) => (
            <ReferenceArea
              key={g.name}
              x1={g.scoreMin}
              x2={g.scoreMax}
              y1={g.salaryMin}
              y2={g.salaryMax}
              fill={GRADE_COLORS[i % GRADE_COLORS.length].fill}
              stroke={GRADE_COLORS[i % GRADE_COLORS.length].stroke}
              strokeWidth={1.5}
              strokeDasharray="4 2"
              label={{
                value: g.name.split(" — ")[1] || g.name,
                position: "insideTopLeft",
                style: { fontSize: 9, fill: GRADE_COLORS[i % GRADE_COLORS.length].stroke, fontWeight: 600 },
              }}
            />
          ))}

          {/* Regression lines */}
          <Line
            data={regressionData}
            dataKey="regMin"
            stroke="#E85D43"
            strokeWidth={2}
            dot={false}
            name="Tendință minimă"
            strokeDasharray="6 3"
          />
          <Line
            data={regressionData}
            dataKey="regMax"
            stroke="#4F46E5"
            strokeWidth={2}
            dot={false}
            name="Tendință maximă"
            strokeDasharray="6 3"
          />

          {/* Actual salary points */}
          <Scatter
            data={scatterData}
            dataKey="salary"
            fill="#E85D43"
            stroke="#fff"
            strokeWidth={1.5}
            name="Salariu real"
            shape="circle"
          />

          {/* Benchmark points */}
          {benchmarkJobs && benchmarkJobs.length > 0 && (
            <Scatter
              data={benchmarkJobs.map(b => ({ score: b.score, salary: b.benchmarkMedian }))}
              dataKey="salary"
              fill="#10B981"
              stroke="#fff"
              strokeWidth={1.5}
              name="Benchmark piață"
              shape="diamond"
            />
          )}

          <Legend
            wrapperStyle={{ fontSize: 10, paddingTop: 10 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
