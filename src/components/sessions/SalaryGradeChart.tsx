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
  allSalariesFromStat?: number[]
}

const GRADE_FILLS = [
  "rgba(79, 70, 229, 0.12)",
  "rgba(139, 92, 246, 0.12)",
  "rgba(217, 70, 239, 0.12)",
  "rgba(232, 93, 67, 0.12)",
  "rgba(16, 185, 129, 0.12)",
]
const GRADE_STROKES = ["#4F46E5", "#8B5CF6", "#D946EF", "#E85D43", "#10B981"]

/**
 * Interpolează un salariu pe o scară continuă de decile (1.0 - 10.0).
 * Nu se limitează la valori întregi — un salariu între D3 și D4 poate fi 3.4.
 */
function salaryToDecileContinuous(salary: number, boundaries: number[]): number {
  if (salary <= boundaries[0]) return 1
  if (salary >= boundaries[boundaries.length - 1]) return 10

  for (let i = 0; i < boundaries.length - 1; i++) {
    if (salary <= boundaries[i + 1]) {
      const low = boundaries[i]
      const high = boundaries[i + 1]
      if (high === low) return i + 1
      const fraction = (salary - low) / (high - low)
      return (i + 1) + fraction
    }
  }
  return 10
}

function formatSalary(val: number): string {
  return val >= 1000 ? (val / 1000).toFixed(1) + "K" : String(val)
}

export default function SalaryGradeChart({ grades, jobs, allSalariesFromStat }: Props) {
  // Calculează decilele din salariile reale
  const decileData = useMemo(() => {
    const salaries = allSalariesFromStat && allSalariesFromStat.length > 0
      ? [...allSalariesFromStat].sort((a, b) => a - b)
      : [...grades.map(g => g.salaryMin), ...grades.map(g => g.salaryMax)].sort((a, b) => a - b)

    const boundaries: number[] = []
    const labels: { decile: number; value: number }[] = []

    for (let d = 1; d <= 10; d++) {
      const idx = Math.min(Math.floor(salaries.length * d / 10), salaries.length - 1)
      boundaries.push(salaries[idx])
      labels.push({ decile: d, value: salaries[idx] })
    }

    return { boundaries, labels }
  }, [allSalariesFromStat, grades])

  // Clase normalizate pe decile continue
  const normalizedGrades = useMemo(() => {
    return grades.map(g => ({
      ...g,
      decileMin: salaryToDecileContinuous(g.salaryMin, decileData.boundaries),
      decileMax: salaryToDecileContinuous(g.salaryMax, decileData.boundaries),
    }))
  }, [grades, decileData])

  // Regression pe decile continue
  const regressionData = useMemo(() => {
    if (normalizedGrades.length < 2) return []
    const points = normalizedGrades.map(g => ({
      x: (g.scoreMin + g.scoreMax) / 2,
      yMin: g.decileMin,
      yMax: g.decileMax,
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

    const xStart = Math.min(...grades.map(g => g.scoreMin))
    const xEnd = Math.max(...grades.map(g => g.scoreMax))
    const padding = (xEnd - xStart) * 0.05
    return Array.from({ length: 21 }, (_, i) => {
      const x = (xStart - padding) + (xEnd - xStart + 2 * padding) * (i / 20)
      return {
        score: Math.round(x),
        regMin: Math.round((regMin.intercept + regMin.slope * x) * 10) / 10,
        regMax: Math.round((regMax.intercept + regMax.slope * x) * 10) / 10,
      }
    })
  }, [normalizedGrades, grades])

  // Scatter pe decile continue
  const currentData = useMemo(() =>
    jobs.filter(j => j.currentSalary).map(j => ({
      score: j.score,
      decile: Math.round(salaryToDecileContinuous(j.currentSalary!, decileData.boundaries) * 10) / 10,
      salary: j.currentSalary!,
      title: j.title,
    })),
  [jobs, decileData])

  // Axes
  const xMin = Math.min(...grades.map(g => g.scoreMin)) - 20
  const xMax = Math.max(...grades.map(g => g.scoreMax)) + 20

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h3 className="text-sm font-bold text-slate-900 mb-4">
        Corelație evaluare posturi — clase salariale
      </h3>

      <ResponsiveContainer width="100%" height={420}>
        <ComposedChart margin={{ top: 10, right: 15, bottom: 40, left: 25 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />

          <XAxis
            dataKey="score"
            type="number"
            domain={[xMin, xMax]}
            tick={{ fontSize: 9, fill: "#94a3b8" }}
            tickCount={8}
          >
            <Label
              value="Evaluare posturi de lucru"
              position="bottom"
              offset={10}
              style={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }}
            />
          </XAxis>

          <YAxis
            type="number"
            domain={[0.5, 10.5]}
            ticks={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
            tick={{ fontSize: 8, fill: "#94a3b8" }}
            tickFormatter={(v) => {
              const label = decileData.labels.find(l => l.decile === v)
              return label ? `D${v} (${formatSalary(label.value)})` : `D${v}`
            }}
            width={72}
          >
            <Label
              value="Evaluare salarii (decile)"
              angle={-90}
              position="insideLeft"
              offset={-12}
              style={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }}
            />
          </YAxis>

          {/* Clase salariale — dreptunghiuri pe decile continue */}
          {normalizedGrades.map((g, i) => (
            <ReferenceArea
              key={g.name}
              x1={g.scoreMin}
              x2={g.scoreMax}
              y1={g.decileMin}
              y2={g.decileMax}
              fill={GRADE_FILLS[i % GRADE_FILLS.length]}
              stroke={GRADE_STROKES[i % GRADE_STROKES.length]}
              strokeWidth={1.5}
              strokeOpacity={0.7}
              label={{
                value: g.name.replace("Clasă ", "C").replace("Grad ", "C").split(" — ")[0],
                position: "insideTop",
                style: { fontSize: 9, fill: GRADE_STROKES[i % GRADE_STROKES.length], fontWeight: 700 },
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

          {/* Salarii curente */}
          {currentData.length > 0 && (
            <Scatter
              data={currentData}
              dataKey="decile"
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
                    <p className="text-slate-500">Punctaj: {d.score} | Decila: {d.decile?.toFixed?.(1) ?? d.decile}</p>
                    <p className="text-slate-600">Salariu: {d.salary?.toLocaleString()} RON</p>
                  </div>
                )
              }
              return (
                <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2 text-[10px]">
                  <p className="text-slate-500">Punctaj: {d.score}</p>
                  {d.regMin != null && <p className="text-red-500">Tendință min: D{d.regMin}</p>}
                  {d.regMax != null && <p className="text-indigo-600">Tendință max: D{d.regMax}</p>}
                </div>
              )
            }}
          />

          <Legend
            wrapperStyle={{ fontSize: 9, paddingTop: 10 }}
            iconType="line"
            iconSize={10}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
