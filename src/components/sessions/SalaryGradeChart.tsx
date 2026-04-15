"use client"

import { useMemo } from "react"
import {
  ComposedChart, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceArea, Line, Scatter, CartesianGrid, Legend, Label,
} from "recharts"
import {
  type ScorePoint,
  type PitariuGrade,
  buildPitariuGrades,
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
  /** Nr. clase forțat (opțional — altfel auto-detect din nr. posturi) */
  numClasses?: number
  /** Dacă true, folosește gradele primite din DB fără recalculare Pitariu */
  useDbGrades?: boolean
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

export default function SalaryGradeChart({ grades: dbGrades, salaryPoints, numClasses, useDbGrades }: Props) {
  // --- Algoritm Pitariu: formează clasele normalizate din date reale ---
  const pitariuGrades = useMemo(() => {
    if (useDbGrades || salaryPoints.length < 2) return null

    const scorePoints: ScorePoint[] = salaryPoints.map(p => ({
      score: p.score,
      salary: p.salary,
      label: p.label,
    }))

    const computed = buildPitariuGrades(scorePoints, numClasses)
    return computed.length > 0 ? computed : null
  }, [salaryPoints, numClasses, useDbGrades])

  // Folosește clasele Pitariu dacă disponibile, altfel DB
  const activeGrades: GradeData[] = useMemo(() => {
    if (pitariuGrades) {
      return pitariuGrades.map(g => ({
        name: g.name,
        scoreMin: g.scoreMin,
        scoreMax: g.scoreMax,
        salaryMin: g.salaryMin,
        salaryMax: g.salaryMax,
      }))
    }
    return dbGrades
  }, [pitariuGrades, dbGrades])

  const nGrades = activeGrades.length
  if (nGrades === 0) return null

  // --- Y: salariu real (RON) — exact ca Pitariu Fig. 2.6 ---
  const allSalaryValues = [
    ...activeGrades.map(g => g.salaryMin),
    ...activeGrades.map(g => g.salaryMax),
    ...salaryPoints.map(p => p.salary).filter(s => s > 0),
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
    [...new Set(activeGrades.flatMap(g => [g.salaryMin, g.salaryMax]))].sort((a, b) => a - b),
  [activeGrades])

  // X ticks: granițele claselor cu valorile de punctaj reale
  const xTickValues = useMemo(() => {
    const ticks: { pos: number; label: string }[] = []
    for (let i = 0; i < nGrades; i++) {
      if (i === 0 || activeGrades[i].scoreMin !== activeGrades[i - 1].scoreMax) {
        ticks.push({ pos: i, label: String(activeGrades[i].scoreMin) })
      }
      ticks.push({ pos: i + 1, label: String(activeGrades[i].scoreMax) })
    }
    return ticks
  }, [activeGrades, nGrades])

  // Puncte normalizate pe X (Pitariu: fiecare clasă = 1 unitate vizuală)
  const normalizedPoints = useMemo(() => {
    const gradesForNorm: PitariuGrade[] = activeGrades.map((g, i) => ({
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
  }, [salaryPoints, activeGrades])

  // Linii de regresie Pitariu (min, max, punct de mijloc)
  const regressionData = useMemo(() => {
    const gradesForReg: PitariuGrade[] = activeGrades.map((g, i) => ({
      ...g,
      order: i + 1,
      scoreMid: (g.scoreMin + g.scoreMax) / 2,
      salaryMid: (g.salaryMin + g.salaryMax) / 2,
    }))
    return buildRegressionLines(gradesForReg)
  }, [activeGrades])

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h3 className="text-sm font-bold text-slate-900 mb-1">
        Corelație evaluare posturi — clase salariale
      </h3>
      <p className="text-[10px] text-slate-400 mb-4">
        Clase formate prin progresie geometrică (Pitariu, Fig. 2.6)
        {pitariuGrades && ` — ${nGrades} clase, raport 1.15`}
      </p>

      <ResponsiveContainer width="100%" height={440}>
        <ComposedChart margin={{ top: 10, right: 15, bottom: 50, left: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />

          {/* X: clase normalizate (egale vizual), etichete = punctaje reale */}
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

          {/* Clase salariale — lățime egală pe X, înălțime variabilă pe Y, suprapuse */}
          {activeGrades.map((g, i) => (
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

          {/* Salarii individuale — scatter */}
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

          {/* Tendință salariu minim (Evaluare minimă — Pitariu) */}
          <Line
            data={regressionData}
            dataKey="regMin"
            stroke="#E85D43"
            strokeWidth={2}
            dot={false}
            name="Evaluare min."
            connectNulls
          />

          {/* Tendință salariu maxim (Evaluare maximă — Pitariu) */}
          <Line
            data={regressionData}
            dataKey="regMax"
            stroke="#4F46E5"
            strokeWidth={2}
            dot={false}
            name="Evaluare max."
            connectNulls
          />

          {/* Punct de mijloc (media — Pitariu) */}
          <Line
            data={regressionData}
            dataKey="regMid"
            stroke="#10B981"
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={false}
            name="Punct de mijloc"
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
                  {d.regMin != null && <p className="text-red-500">Evaluare min.: {d.regMin.toLocaleString()} RON</p>}
                  {d.regMid != null && <p className="text-emerald-600">Punct de mijloc: {d.regMid.toLocaleString()} RON</p>}
                  {d.regMax != null && <p className="text-indigo-600">Evaluare max.: {d.regMax.toLocaleString()} RON</p>}
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
