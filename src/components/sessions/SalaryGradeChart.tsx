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

interface SalaryPoint {
  score: number
  salary: number
  label: string
}

interface Props {
  grades: GradeData[]
  salaryPoints: SalaryPoint[]
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

/**
 * Mapează un scor pe X normalizat: fiecare clasă = 1 unitate.
 */
function scoreToNormX(score: number, grades: GradeData[]): number {
  for (let i = 0; i < grades.length; i++) {
    if (score >= grades[i].scoreMin && score <= grades[i].scoreMax) {
      const range = grades[i].scoreMax - grades[i].scoreMin
      return i + (range > 0 ? (score - grades[i].scoreMin) / range : 0.5)
    }
  }
  if (score < grades[0].scoreMin) {
    const range = grades[0].scoreMax - grades[0].scoreMin
    return range > 0 ? (score - grades[0].scoreMin) / range : 0
  }
  const last = grades[grades.length - 1]
  const range = last.scoreMax - last.scoreMin
  return grades.length - 1 + (range > 0 ? (score - last.scoreMin) / range : 1)
}

export default function SalaryGradeChart({ grades, salaryPoints }: Props) {
  const nGrades = grades.length

  // Y: salariu real (RON) — exact ca Pitariu
  const allSalaryValues = [
    ...grades.map(g => g.salaryMin),
    ...grades.map(g => g.salaryMax),
    ...salaryPoints.map(p => p.salary),
  ]
  const yMinRaw = Math.min(...allSalaryValues)
  const yMaxRaw = Math.max(...allSalaryValues)
  const yPadding = (yMaxRaw - yMinRaw) * 0.1 || 500
  const yMin = Math.floor((yMinRaw - yPadding) / 100) * 100
  const yMax = Math.ceil((yMaxRaw + yPadding) / 100) * 100

  // Y ticks
  const yTicks = useMemo(() => {
    const range = yMax - yMin
    const step = range <= 2000 ? 200 : range <= 5000 ? 500 : 1000
    const ticks: number[] = []
    for (let v = Math.ceil(yMin / step) * step; v <= yMax; v += step) ticks.push(v)
    return ticks
  }, [yMin, yMax])

  // Granițe salariale — bold pe Y
  const salaryBreakpoints = useMemo(() =>
    [...new Set(grades.flatMap(g => [g.salaryMin, g.salaryMax]))].sort((a, b) => a - b),
  [grades])

  // X ticks: granițele claselor cu valorile de punctaj
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

  // Puncte normalizate pe X, salariu real pe Y
  const normalizedPoints = useMemo(() =>
    salaryPoints.map(p => ({
      ...p,
      normX: scoreToNormX(p.score, grades),
    })),
  [salaryPoints, grades])

  // Regression pe clase normalizate X, salariu real Y
  const regressionData = useMemo(() => {
    if (nGrades < 2) return []
    const points = grades.map((g, i) => ({
      x: i + 0.5,
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

    // Intersecție min ↔ max → tăiem spre origine
    const slopeDiff = regMax.slope - regMin.slope
    const intX = Math.abs(slopeDiff) > 0.0001
      ? (regMin.intercept - regMax.intercept) / slopeDiff
      : -Infinity

    return Array.from({ length: 31 }, (_, i) => {
      const x = -0.3 + (nGrades + 0.6) * (i / 30)
      const rMinVal = regMin.intercept + regMin.slope * x
      const rMaxVal = regMax.intercept + regMax.slope * x
      const rAvgVal = regAvg.intercept + regAvg.slope * x
      const visible = x >= intX
      return {
        normX: Math.round(x * 100) / 100,
        regMin: visible ? Math.round(Math.min(rMinVal, rMaxVal)) : null,
        regMax: visible ? Math.round(Math.max(rMinVal, rMaxVal)) : null,
        regAvg: visible ? Math.round(rAvgVal) : null,
      }
    })
  }, [grades, nGrades])

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h3 className="text-sm font-bold text-slate-900 mb-4">
        Corelație evaluare posturi — clase salariale
      </h3>

      <ResponsiveContainer width="100%" height={440}>
        <ComposedChart margin={{ top: 10, right: 15, bottom: 50, left: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />

          {/* X: clase normalizate (egale), etichete = punctaje reale */}
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
              offset={20}
              style={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }}
            />
          </XAxis>

          {/* Y: salariu real (RON), granițe clase bold */}
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

          {/* Clase salariale — aceeași lățime pe X, înălțime variabilă pe Y, suprapuse */}
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
                value: g.name.replace("Clasă ", "C").replace("Grad ", "C").split(" — ")[0],
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
