"use client"

import { useState } from "react"
import Link from "next/link"

interface CostCategory {
  category: string
  estimatedCost: number
  evidence: string
}

interface RoiResult {
  totalAnnualCost: number
  breakdown: CostCategory[]
}

export default function CultureRoiPage() {
  const [averageSalary, setAverageSalary] = useState("")
  const [turnoverRate, setTurnoverRate] = useState("")
  const [absenteeismRate, setAbsenteeismRate] = useState("")
  const [result, setResult] = useState<RoiResult | null>(null)
  const [running, setRunning] = useState(false)

  async function calculateRoi() {
    setRunning(true)
    setResult(null)
    try {
      const payload: Record<string, unknown> = {}
      if (averageSalary) payload.averageSalary = Number(averageSalary)
      if (turnoverRate) payload.turnoverRate = Number(turnoverRate)
      if (absenteeismRate) payload.absenteeismRate = Number(absenteeismRate)

      const res = await fetch("/api/v1/culture/roi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const data = await res.json()
        setResult(data.result || data)
      }
    } catch { /* silent */ }
    setRunning(false)
  }

  function formatCurrency(value: number) {
    return new Intl.NumberFormat("ro-RO", {
      style: "currency",
      currency: "RON",
      maximumFractionDigits: 0,
    }).format(value)
  }

  const CATEGORY_ICONS: Record<string, string> = {
    turnover: "Fluctuatie personal",
    communication: "Comunicare deficitara",
    resistance: "Rezistenta la schimbare",
    silos: "Silozuri organizationale",
    psychological_safety: "Siguranta psihologica",
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            ROI cultura — costul de a NU schimba
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Estimare impact financiar al disfunctiilor culturale
          </p>
        </div>
        <Link
          href="/portal"
          className="text-sm text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          &larr; Portal
        </Link>
      </div>

      {/* Inputs */}
      <div className="rounded-lg border border-border bg-surface p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs text-text-secondary mb-1">
              Salariu mediu brut (RON) — optional
            </label>
            <input
              type="number"
              value={averageSalary}
              onChange={(e) => setAverageSalary(e.target.value)}
              placeholder="ex: 6000"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
            />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">
              Rata fluctuatie (%) — optional
            </label>
            <input
              type="number"
              value={turnoverRate}
              onChange={(e) => setTurnoverRate(e.target.value)}
              placeholder="ex: 15"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
            />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">
              Rata absenteism (%) — optional
            </label>
            <input
              type="number"
              value={absenteeismRate}
              onChange={(e) => setAbsenteeismRate(e.target.value)}
              placeholder="ex: 5"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
            />
          </div>
        </div>

        <button
          onClick={calculateRoi}
          disabled={running}
          className="text-sm font-medium bg-amber-600 text-white px-5 py-2 rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
        >
          {running ? "Se calculeaza..." : "Calculeaza ROI"}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div>
          {/* Total cost */}
          <div className="rounded-lg border-2 border-red-200 bg-red-50 p-6 mb-6 text-center">
            <span className="text-xs uppercase tracking-wide text-red-600">
              Cost anual estimat al inactiunii
            </span>
            <div className="text-4xl font-bold text-red-700 mt-2">
              {formatCurrency(result.totalAnnualCost)}
            </div>
          </div>

          {/* Breakdown */}
          <h2 className="text-sm font-semibold text-foreground mb-3">
            Defalcare pe categorii
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {result.breakdown.map((cat, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-border bg-surface p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">
                    {CATEGORY_ICONS[cat.category] || cat.category}
                  </span>
                  <span className="text-sm font-bold text-red-600">
                    {formatCurrency(cat.estimatedCost)}
                  </span>
                </div>
                <p className="text-xs text-text-secondary">
                  {cat.evidence}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
