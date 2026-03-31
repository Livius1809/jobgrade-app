"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { PayGapIndicators } from "@/lib/pay-gap"

interface Props {
  year: number
  availableYears: number[]
  indicators: PayGapIndicators | null
  employeeCount: number
  reportStatus: string | null
  reportId: string | null
}

function GapBadge({ value }: { value: number | null }) {
  if (value === null) {
    return (
      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
        Date insuficiente (k&lt;5)
      </span>
    )
  }
  const abs = Math.abs(value)
  const color =
    abs < 2
      ? "bg-green-100 text-green-700"
      : abs < 5
      ? "bg-yellow-100 text-yellow-700"
      : "bg-red-100 text-red-700"
  const sign = value > 0 ? "+" : ""
  return (
    <span className={`text-sm font-semibold px-2 py-0.5 rounded-full ${color}`}>
      {sign}
      {value}%
    </span>
  )
}

export default function PayGapDashboardClient({
  year,
  availableYears,
  indicators,
  employeeCount,
  reportStatus,
  reportId,
}: Props) {
  const router = useRouter()
  const [generating, setGenerating] = useState(false)
  const [publish, setPublish] = useState(false)

  const handleYearChange = (y: string) => {
    router.push(`/pay-gap?year=${y}`)
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const res = await fetch("/api/v1/pay-gap/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, publish }),
      })
      if (res.ok) router.refresh()
    } finally {
      setGenerating(false)
    }
  }

  if (employeeCount === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <div className="text-5xl mb-4">📊</div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Nu există date salariale pentru {year}
        </h3>
        <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
          Importați înregistrările salariale ale angajaților pentru a genera indicatorii Art. 9.
          Datele sunt procesate cu k-anonymity ≥ 5 (grupuri cu mai puțin de 5 angajați sunt
          suprimate automat).
        </p>
        <a
          href="/pay-gap/employees"
          className="inline-flex px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Import date angajați →
        </a>
      </div>
    )
  }

  const ind = indicators!

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">An raportare:</label>
          <select
            value={year}
            onChange={(e) => handleYearChange(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
            {!availableYears.includes(year) && <option value={year}>{year}</option>}
          </select>
          <span className="text-sm text-gray-500">{employeeCount} angajați</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={publish}
              onChange={(e) => setPublish(e.target.checked)}
              className="rounded"
            />
            Publică raportul
          </label>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {generating
              ? "Se generează..."
              : reportId
              ? "Regenerează raport"
              : "Generează raport"}
          </button>
          {reportStatus && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                reportStatus === "PUBLISHED"
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {reportStatus === "PUBLISHED" ? "Publicat" : "Draft"}
            </span>
          )}
        </div>
      </div>

      {/* Key indicators — 4 cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 uppercase font-medium mb-1">
            (a) Diferență medie salar. bază
          </p>
          <GapBadge value={ind.a_mean_base_gap} />
          <p className="text-xs text-gray-400 mt-2">
            M: {ind.mean_base_male.toLocaleString("ro-RO")} RON | F:{" "}
            {ind.mean_base_female.toLocaleString("ro-RO")} RON
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 uppercase font-medium mb-1">
            (b) Diferență medie comp. variabilă
          </p>
          <GapBadge value={ind.b_mean_variable_gap} />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 uppercase font-medium mb-1">
            (c) Diferență mediană salar. bază
          </p>
          <GapBadge value={ind.c_median_base_gap} />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 uppercase font-medium mb-1">
            (d) Diferență mediană comp. variabilă
          </p>
          <GapBadge value={ind.d_median_variable_gap} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* (e) Proportion receiving variable pay */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">
            (e) Proporție beneficiari comp. variabilă
          </h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Bărbați ({ind.total_male})</span>
                <span className="font-medium">
                  {ind.e_variable_proportion.male !== null
                    ? `${ind.e_variable_proportion.male}%`
                    : "N/A"}
                </span>
              </div>
              {ind.e_variable_proportion.male !== null && (
                <div className="h-2 bg-gray-100 rounded-full">
                  <div
                    className="h-2 bg-blue-500 rounded-full"
                    style={{ width: `${ind.e_variable_proportion.male}%` }}
                  />
                </div>
              )}
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Femei ({ind.total_female})</span>
                <span className="font-medium">
                  {ind.e_variable_proportion.female !== null
                    ? `${ind.e_variable_proportion.female}%`
                    : "N/A"}
                </span>
              </div>
              {ind.e_variable_proportion.female !== null && (
                <div className="h-2 bg-gray-100 rounded-full">
                  <div
                    className="h-2 bg-pink-400 rounded-full"
                    style={{ width: `${ind.e_variable_proportion.female}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* (f) Quartile distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">
            (f) Distribuție pe cuartile salariale
          </h3>
          <div className="space-y-2">
            {(["q1", "q2", "q3", "q4"] as const).map((q) => {
              const qData = ind.f_quartile_distribution[q]
              return (
                <div key={q} className="flex items-center gap-3 text-sm">
                  <span className="w-16 text-gray-500 font-medium">
                    {q === "q1"
                      ? "Q1 (jos)"
                      : q === "q2"
                      ? "Q2"
                      : q === "q3"
                      ? "Q3"
                      : "Q4 (sus)"}
                  </span>
                  <div className="flex-1 flex gap-1">
                    <div
                      className="h-5 bg-blue-200 rounded text-xs flex items-center justify-center text-blue-800"
                      style={{ width: `${qData.male ?? 50}%`, minWidth: "2rem" }}
                    >
                      {qData.male !== null ? `${qData.male}% M` : "N/A"}
                    </div>
                    <div
                      className="h-5 bg-pink-200 rounded text-xs flex items-center justify-center text-pink-800"
                      style={{ width: `${qData.female ?? 50}%`, minWidth: "2rem" }}
                    >
                      {qData.female !== null ? `${qData.female}% F` : "N/A"}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* (g) By salary grade */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800">
            (g) Diferență salarială pe grupă / categorie de post
          </h3>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                Grupă / Categorie
              </th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                Bărbați
              </th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                Femei
              </th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                Diferență (%)
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {ind.g_by_grade.map((g) => (
              <tr key={g.grade} className="hover:bg-gray-50">
                <td className="px-6 py-3 text-sm font-medium text-gray-900 max-w-[200px] truncate">
                  {g.grade}
                </td>
                <td className="px-4 py-3 text-sm text-center text-gray-700">{g.count_male}</td>
                <td className="px-4 py-3 text-sm text-center text-gray-700">{g.count_female}</td>
                <td className="px-4 py-3 text-center">
                  <GapBadge value={g.mean_base_gap} />
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">
                  {g.suppressed ? "Suprimate (k<5)" : "✓ Date disponibile"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Methodology note */}
      <div className="bg-blue-50 rounded-xl p-4 text-xs text-blue-700 space-y-1">
        <p className="font-semibold">Metodologie & conformitate</p>
        <p>
          Indicatorii sunt calculați conform Art. 9 al Directivei EU 2023/970. Grupurile cu mai
          puțin de 5 persoane per gen sunt suprimate automat (k-anonymity ≥ 5) pentru a preveni
          identificarea indirectă a angajaților.
        </p>
        <p>
          Dacă diferența medie ≥ 5%, sistemul creează automat o evaluare comună Art. 10 și
          notifică administratorii.
        </p>
      </div>
    </div>
  )
}
