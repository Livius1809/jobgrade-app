"use client"

import { useState } from "react"
import Link from "next/link"

interface DimensionGap {
  dimension: string
  declared: number
  actual: number
  gap: number
}

interface ThreeCResult {
  dimensions: DimensionGap[]
  consecventa: number
  coerenta: number
  congruenta: number
  overallCoherence: number
}

export default function ThreeCReportPage() {
  const [result, setResult] = useState<ThreeCResult | null>(null)
  const [running, setRunning] = useState(false)

  async function generateReport() {
    setRunning(true)
    setResult(null)
    try {
      const res = await fetch("/api/v1/culture/3c-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      if (res.ok) {
        const data = await res.json()
        setResult(data.result || data)
      }
    } catch { /* silent */ }
    setRunning(false)
  }

  function gapColor(gap: number) {
    const abs = Math.abs(gap)
    if (abs <= 10) return "bg-emerald-500"
    if (abs <= 25) return "bg-amber-500"
    return "bg-red-500"
  }

  function indicatorColor(score: number) {
    if (score >= 70) return "text-emerald-600"
    if (score >= 40) return "text-amber-600"
    return "text-red-600"
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Raport 3C — Consecventa · Coerenta · Congruenta
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Analiza decalajului intre cultura declarata si cultura actuala
          </p>
        </div>
        <Link
          href="/portal"
          className="text-sm text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          &larr; Portal
        </Link>
      </div>

      {/* Action */}
      <div className="rounded-lg border border-border bg-surface p-5 mb-6">
        <button
          onClick={generateReport}
          disabled={running}
          className="text-sm font-medium bg-amber-600 text-white px-5 py-2 rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
        >
          {running ? "Se genereaza..." : "Genereaza raport 3C"}
        </button>
      </div>

      {result && (
        <div>
          {/* Overall coherence */}
          <div className="rounded-lg border border-border bg-surface p-5 mb-6 text-center">
            <span className="text-xs uppercase tracking-wide text-text-secondary">
              Scor coerenta generala
            </span>
            <div className={`text-4xl font-bold mt-1 ${indicatorColor(result.overallCoherence)}`}>
              {result.overallCoherence}<span className="text-lg text-text-secondary">/100</span>
            </div>
          </div>

          {/* 3 Indicators */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {([
              { label: "Consecventa", value: result.consecventa },
              { label: "Coerenta", value: result.coerenta },
              { label: "Congruenta", value: result.congruenta },
            ] as const).map((ind) => (
              <div key={ind.label} className="rounded-lg border border-border bg-surface p-4 text-center">
                <span className="text-xs text-text-secondary">{ind.label}</span>
                <div className={`text-2xl font-bold mt-1 ${indicatorColor(ind.value)}`}>
                  {ind.value}
                </div>
              </div>
            ))}
          </div>

          {/* Declared vs Actual */}
          <h2 className="text-sm font-semibold text-foreground mb-3">
            F3(D) Declarat vs F3(A) Actual
          </h2>
          <div className="space-y-3">
            {result.dimensions.map((dim, idx) => (
              <div key={idx} className="rounded-lg border border-border bg-surface p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">
                    {dim.dimension}
                  </span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                    Math.abs(dim.gap) <= 10
                      ? "bg-emerald-50 text-emerald-700"
                      : Math.abs(dim.gap) <= 25
                        ? "bg-amber-50 text-amber-700"
                        : "bg-red-50 text-red-700"
                  }`}>
                    Gap: {dim.gap > 0 ? "+" : ""}{dim.gap}
                  </span>
                </div>

                {/* Two-column bars */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] uppercase tracking-wide text-text-secondary">
                      Declarat
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-indigo-500"
                          style={{ width: `${dim.declared}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-foreground w-8 text-right">
                        {dim.declared}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wide text-text-secondary">
                      Actual
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${gapColor(dim.gap)}`}
                          style={{ width: `${dim.actual}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-foreground w-8 text-right">
                        {dim.actual}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
