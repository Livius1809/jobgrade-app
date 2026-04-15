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

/**
 * Alege metoda de normalizare în funcție de dimensiunea eșantionului:
 * N < 8  → tertile (3)
 * N < 16 → cuartile (4)
 * N < 30 → cvintile (5)
 * N >= 30 → decile (10)
 */
function chooseQuantiles(n: number): { divisions: number; label: string; prefix: string } {
  if (n < 8)  return { divisions: 3, label: "Tertile", prefix: "T" }
  if (n < 16) return { divisions: 4, label: "Cuartile", prefix: "Q" }
  if (n < 30) return { divisions: 5, label: "Cvintile", prefix: "Cv" }
  return { divisions: 10, label: "Decile", prefix: "D" }
}

/**
 * Calculează granițele de cuantile dintr-un array sortat.
 * Returnează `divisions` valori de graniță.
 */
function computeBoundaries(sorted: number[], divisions: number): number[] {
  const boundaries: number[] = []
  for (let q = 1; q <= divisions; q++) {
    const idx = Math.min(Math.floor(sorted.length * q / divisions), sorted.length - 1)
    boundaries.push(sorted[idx])
  }
  return boundaries
}

/**
 * Mapează o valoare pe scară continuă de cuantile (1.0 - divisions).
 */
function toQuantile(value: number, boundaries: number[]): number {
  if (value <= boundaries[0]) return 1
  if (value >= boundaries[boundaries.length - 1]) return boundaries.length

  for (let i = 0; i < boundaries.length - 1; i++) {
    if (value <= boundaries[i + 1]) {
      const low = boundaries[i]
      const high = boundaries[i + 1]
      if (high === low) return i + 1
      return (i + 1) + (value - low) / (high - low)
    }
  }
  return boundaries.length
}

function formatSalary(val: number): string {
  if (val >= 1000) return (val / 1000).toFixed(1).replace(/\.0$/, "") + "K"
  return String(Math.round(val))
}

export default function SalaryGradeChart({ grades, jobs }: Props) {
  // Normalizare adaptată la eșantion
  const normalization = useMemo(() => {
    const nJobs = jobs.length
    const scoreQuant = chooseQuantiles(nJobs)
    const salaryQuant = chooseQuantiles(nJobs)

    // Scoruri sortate (din joburi evaluate)
    const scores = [...jobs.map(j => j.score)].sort((a, b) => a - b)
    const scoreBoundaries = scores.length >= 2
      ? computeBoundaries(scores, scoreQuant.divisions)
      : grades.flatMap(g => [g.scoreMin, g.scoreMax]).sort((a, b) => a - b)
        .filter((v, i, a) => i === 0 || v !== a[i - 1])
        .length >= 2
        ? computeBoundaries(
            grades.flatMap(g => [g.scoreMin, g.scoreMax]).sort((a, b) => a - b),
            scoreQuant.divisions
          )
        : [0]

    // Salarii sortate (din clase + salarii curente reale)
    const salaryValues = [
      ...grades.map(g => g.salaryMin),
      ...grades.map(g => g.salaryMax),
      ...jobs.filter(j => j.currentSalary && j.currentSalary > 0).map(j => j.currentSalary!),
    ].sort((a, b) => a - b)
    const salaryBoundaries = salaryValues.length >= 2
      ? computeBoundaries(salaryValues, salaryQuant.divisions)
      : [0]

    return {
      score: { ...scoreQuant, boundaries: scoreBoundaries },
      salary: { ...salaryQuant, boundaries: salaryBoundaries },
    }
  }, [jobs, grades])

  const scoreDivs = normalization.score.divisions
  const salaryDivs = normalization.salary.divisions

  // Clase normalizate pe ambele axe
  const normalizedGrades = useMemo(() => {
    return grades.map(g => ({
      ...g,
      qScoreMin: toQuantile(g.scoreMin, normalization.score.boundaries),
      qScoreMax: toQuantile(g.scoreMax, normalization.score.boundaries),
      qSalaryMin: toQuantile(g.salaryMin, normalization.salary.boundaries),
      qSalaryMax: toQuantile(g.salaryMax, normalization.salary.boundaries),
    }))
  }, [grades, normalization])

  // Regression pe coordonate normalizate
  const { regressionData } = useMemo(() => {
    if (normalizedGrades.length < 2) return { regressionData: [] }

    const points = normalizedGrades.map(g => ({
      x: (g.qScoreMin + g.qScoreMax) / 2,
      yMin: g.qSalaryMin,
      yMax: g.qSalaryMax,
      yAvg: (g.qSalaryMin + g.qSalaryMax) / 2,
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

    const data = Array.from({ length: 31 }, (_, i) => {
      const x = 0.5 + scoreDivs * (i / 30)
      const rMinVal = regMin.intercept + regMin.slope * x
      const rMaxVal = regMax.intercept + regMax.slope * x
      const rAvgVal = regAvg.intercept + regAvg.slope * x
      const visible = x >= intX
      return {
        qScore: Math.round(x * 100) / 100,
        regMin: visible ? Math.round(Math.min(rMinVal, rMaxVal) * 10) / 10 : null,
        regMax: visible ? Math.round(Math.max(rMinVal, rMaxVal) * 10) / 10 : null,
        regAvg: visible ? Math.round(rAvgVal * 10) / 10 : null,
      }
    })

    return { regressionData: data }
  }, [normalizedGrades, scoreDivs])

  // Scatter normalizat
  const currentData = useMemo(() =>
    jobs.filter(j => j.currentSalary && j.currentSalary > 0).map(j => ({
      qScore: toQuantile(j.score, normalization.score.boundaries),
      qSalary: toQuantile(j.currentSalary!, normalization.salary.boundaries),
      salary: j.currentSalary!,
      score: j.score,
      title: j.title,
    })),
  [jobs, normalization])

  // Ticks pe axe
  const xTicks = Array.from({ length: scoreDivs }, (_, i) => i + 1)
  const yTicks = Array.from({ length: salaryDivs }, (_, i) => i + 1)

  // Etichete valoare pe Y
  const salaryLabels = normalization.salary.boundaries

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h3 className="text-sm font-bold text-slate-900 mb-4">
        Corelație evaluare posturi — clase salariale
      </h3>

      <ResponsiveContainer width="100%" height={420}>
        <ComposedChart margin={{ top: 10, right: 15, bottom: 50, left: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />

          <XAxis
            dataKey="qScore"
            type="number"
            domain={[0.5, scoreDivs + 0.5]}
            ticks={xTicks}
            tick={{ fontSize: 9, fill: "#94a3b8" }}
            tickFormatter={(v) => `${normalization.score.prefix}${v}`}
          >
            <Label
              value={`Evaluare posturi (${normalization.score.label.toLowerCase()})`}
              position="bottom"
              offset={8}
              style={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }}
            />
          </XAxis>

          <YAxis
            type="number"
            domain={[0.5, salaryDivs + 0.5]}
            ticks={yTicks}
            tick={{ fontSize: 8, fill: "#94a3b8" }}
            tickFormatter={(v) => {
              const idx = v - 1
              const val = salaryLabels[idx]
              return val != null ? `${normalization.salary.prefix}${v} (${formatSalary(val)})` : `${normalization.salary.prefix}${v}`
            }}
            width={72}
          >
            <Label
              value={`Evaluare salarii (${normalization.salary.label.toLowerCase()})`}
              angle={-90}
              position="insideLeft"
              offset={-15}
              style={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }}
            />
          </YAxis>

          {/* Clase salariale — aceeași lățime pe X, variabilă pe Y */}
          {normalizedGrades.map((g, i) => (
            <ReferenceArea
              key={g.name}
              x1={g.qScoreMin}
              x2={g.qScoreMax}
              y1={g.qSalaryMin}
              y2={g.qSalaryMax}
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
              dataKey="qSalary"
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
                  {d.regMin != null && <p className="text-red-500">Tendință min: {normalization.salary.prefix}{d.regMin}</p>}
                  {d.regAvg != null && <p className="text-emerald-600">Tendință mediu: {normalization.salary.prefix}{d.regAvg}</p>}
                  {d.regMax != null && <p className="text-indigo-600">Tendință max: {normalization.salary.prefix}{d.regMax}</p>}
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
