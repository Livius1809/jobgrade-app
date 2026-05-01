"use client"

import { useState } from "react"
import Link from "next/link"

interface DimensionScore {
  dimension: string
  score: number
  calibrationNote?: string
}

interface AuditResult {
  dimensions: DimensionScore[]
  overallScore: number
  profileSummary: string
}

export default function CulturalAuditPage() {
  const [calibrateRO, setCalibrateRO] = useState(false)
  const [result, setResult] = useState<AuditResult | null>(null)
  const [running, setRunning] = useState(false)

  async function runAudit() {
    setRunning(true)
    setResult(null)
    try {
      const res = await fetch("/api/v1/culture/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calibrateRO }),
      })
      if (res.ok) {
        const data = await res.json()
        setResult(data.result || data)
      }
    } catch { /* silent */ }
    setRunning(false)
  }

  function scoreColor(score: number) {
    if (score >= 70) return "bg-emerald-500"
    if (score >= 40) return "bg-amber-500"
    return "bg-red-500"
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Audit cultural</h1>
          <p className="text-sm text-text-secondary mt-1">
            Evaluare multidimensionala a culturii organizationale
          </p>
        </div>
        <Link
          href="/portal"
          className="text-sm text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          &larr; Portal
        </Link>
      </div>

      {/* Config + Action */}
      <div className="rounded-lg border border-border bg-surface p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-sm font-medium text-foreground">
              Calibrare cultura romaneasca
            </span>
            <p className="text-xs text-text-secondary mt-0.5">
              Calibrare culturală RO — ajustează dimensiunile la contextul cultural românesc
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={calibrateRO}
            onClick={() => setCalibrateRO(!calibrateRO)}
            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors cursor-pointer ${
              calibrateRO ? "bg-amber-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${
                calibrateRO ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        <button
          onClick={runAudit}
          disabled={running}
          className="text-sm font-medium bg-amber-600 text-white px-5 py-2 rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
        >
          {running ? "Se analizeaza..." : "Porneste audit"}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div>
          {/* Overall score */}
          <div className="rounded-lg border border-border bg-surface p-5 mb-6 text-center">
            <span className="text-xs uppercase tracking-wide text-text-secondary">
              Scor general cultura
            </span>
            <div className="text-4xl font-bold text-amber-600 mt-1">
              {result.overallScore}<span className="text-lg text-text-secondary">/100</span>
            </div>
            {result.profileSummary && (
              <p className="text-sm text-text-secondary mt-3 max-w-xl mx-auto">
                {result.profileSummary}
              </p>
            )}
          </div>

          {/* Dimensions */}
          <h2 className="text-sm font-semibold text-foreground mb-3">
            Dimensiuni culturale
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {result.dimensions.map((dim, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-border bg-surface p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">
                    {dim.dimension}
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    {dim.score}
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${scoreColor(dim.score)}`}
                    style={{ width: `${dim.score}%` }}
                  />
                </div>
                {calibrateRO && dim.calibrationNote && (
                  <p className="text-xs text-amber-700 mt-2 italic">
                    {dim.calibrationNote}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
