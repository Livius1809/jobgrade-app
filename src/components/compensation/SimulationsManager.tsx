"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { KpiFrequency } from "@/generated/prisma"

interface Kpi {
  id: string
  name: string
  weight: number
  targetValue: number
  measurementUnit: string
  frequency: KpiFrequency
}

interface Package {
  id: string
  baseSalary: number
  currency: string
  job: {
    id: string
    title: string
    code: string | null
    kpiDefinitions: Kpi[]
  }
}

interface ComponentBreakdown {
  name: string
  type: string
  baseValue: number
  calculatedValue: number
}

interface SimResult {
  baseSalary: number
  currency: string
  performanceFactor: number
  weightedAchievement: number
  componentBreakdown: ComponentBreakdown[]
  variableTotal: number
  totalCompensation: number
}

interface Simulation {
  id: string
  name: string
  createdAt: Date
  job: { title: string; code: string | null }
  package: { baseSalary: number; currency: string }
  calculatedResult: SimResult
}

interface SimulationsManagerProps {
  packages: Package[]
  simulations: Simulation[]
}

// 3 performance levels
const LEVELS = [
  { key: "inferior", label: "Inferior", pct: 80, color: "text-red-600 bg-red-50" },
  { key: "target", label: "Target", pct: 100, color: "text-blue-600 bg-blue-50" },
  { key: "superior", label: "Superior", pct: 120, color: "text-green-600 bg-green-50" },
]

export default function SimulationsManager({
  packages,
  simulations,
}: SimulationsManagerProps) {
  const router = useRouter()
  const [selectedPackageId, setSelectedPackageId] = useState("")
  const [kpiAchievements, setKpiAchievements] = useState<Record<string, number>>({})
  const [previewResults, setPreviewResults] = useState<Record<string, SimResult | null>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const selectedPkg = packages.find((p) => p.id === selectedPackageId) ?? null
  const kpis = selectedPkg?.job.kpiDefinitions ?? []

  function handlePackageSelect(pkgId: string) {
    setSelectedPackageId(pkgId)
    setKpiAchievements({})
    setPreviewResults({})
    setError("")
  }

  function setKpiLevel(kpiId: string, pct: number) {
    setKpiAchievements((prev) => ({ ...prev, [kpiId]: pct }))
  }

  function applyLevel(pct: number) {
    if (!kpis.length) return
    const all: Record<string, number> = {}
    kpis.forEach((k) => { all[k.id] = pct })
    setKpiAchievements(all)
  }

  // Local calculation (mirrors server logic)
  function calculateLocal(achievements: Record<string, number>): SimResult | null {
    if (!selectedPkg) return null
    const pkg = selectedPkg
    const totalWeight = kpis.reduce((s, k) => s + k.weight, 0)
    let weightedAchievement = 0
    for (const kpi of kpis) {
      const achieved = achievements[kpi.id] ?? 100
      const nw = totalWeight > 0 ? kpi.weight / totalWeight : 0
      weightedAchievement += achieved * nw
    }
    const performanceFactor = weightedAchievement / 100
    const components = (pkg as unknown as { components: ComponentBreakdown[] }).components ?? []
    let variableTotal = 0
    const componentBreakdown = components.map((c) => {
      let calculatedValue = 0
      if (c.type === "percentage") {
        calculatedValue = (pkg.baseSalary * c.baseValue) / 100 * performanceFactor
      } else {
        calculatedValue = c.baseValue
      }
      variableTotal += calculatedValue
      return { ...c, calculatedValue: Math.round(calculatedValue) }
    })
    return {
      baseSalary: pkg.baseSalary,
      currency: pkg.currency,
      performanceFactor: Math.round(performanceFactor * 100) / 100,
      weightedAchievement: Math.round(weightedAchievement * 10) / 10,
      componentBreakdown,
      variableTotal: Math.round(variableTotal),
      totalCompensation: Math.round(pkg.baseSalary + variableTotal),
    }
  }

  function computePreviews() {
    const results: Record<string, SimResult | null> = {}
    for (const lvl of LEVELS) {
      const achievements: Record<string, number> = {}
      kpis.forEach((k) => { achievements[k.id] = kpiAchievements[k.id] ?? lvl.pct })
      results[lvl.key] = calculateLocal(achievements)
    }
    setPreviewResults(results)
  }

  async function saveScenario(levelKey: string, levelLabel: string, levelPct: number) {
    if (!selectedPkg) return
    setSaving(true)
    setError("")
    const achievements: Record<string, number> = {}
    kpis.forEach((k) => { achievements[k.id] = kpiAchievements[k.id] ?? levelPct })

    try {
      const res = await fetch("/api/v1/simulations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: selectedPkg.job.id,
          packageId: selectedPkg.id,
          name: `${selectedPkg.job.title} — ${levelLabel}`,
          kpiAchievements: achievements,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.message || "Eroare la salvare.")
      } else {
        router.refresh()
      }
    } catch {
      setError("Eroare de rețea.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Config panel */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
        <h2 className="font-semibold text-gray-900">Configurare simulare</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pachet compensații
          </label>
          <select
            value={selectedPackageId}
            onChange={(e) => handlePackageSelect(e.target.value)}
            className="w-full max-w-sm px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">— Selectează pachetul —</option>
            {packages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.job.title} — {p.baseSalary.toLocaleString("ro-RO")} {p.currency}
              </option>
            ))}
          </select>
        </div>

        {selectedPkg && kpis.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Realizare KPI-uri (%)
              </span>
              <div className="flex gap-2">
                {LEVELS.map((lvl) => (
                  <button
                    key={lvl.key}
                    onClick={() => applyLevel(lvl.pct)}
                    className={`px-2 py-1 rounded-md text-xs font-medium ${lvl.color}`}
                  >
                    Setează {lvl.label} ({lvl.pct}%)
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {kpis.map((kpi) => (
                <div key={kpi.id} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 flex-1 min-w-0 truncate">
                    {kpi.name}
                    <span className="text-xs text-gray-400 ml-1">({kpi.weight}%)</span>
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={200}
                    value={kpiAchievements[kpi.id] ?? 100}
                    onChange={(e) =>
                      setKpiLevel(kpi.id, parseFloat(e.target.value) || 0)
                    }
                    className="w-20 px-2 py-1 border border-gray-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-xs text-gray-400">%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedPkg && kpis.length === 0 && (
          <p className="text-sm text-gray-400">
            Acest post nu are KPI-uri definite. Mergi la{" "}
            <a href="/app/compensation/kpis" className="text-blue-600 hover:underline">
              KPI-uri
            </a>{" "}
            pentru a le adăuga.
          </p>
        )}

        {selectedPkg && (
          <button
            onClick={computePreviews}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
          >
            Calculează simulările
          </button>
        )}

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>

      {/* Results — 3 columns */}
      {Object.keys(previewResults).length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {LEVELS.map((lvl) => {
            const result = previewResults[lvl.key]
            if (!result) return null
            return (
              <div
                key={lvl.key}
                className="bg-white rounded-xl border border-gray-200 p-5 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${lvl.color}`}
                  >
                    {lvl.label}
                  </span>
                  <span className="text-xs text-gray-400">
                    {result.weightedAchievement}% realizat
                  </span>
                </div>

                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {result.totalCompensation.toLocaleString("ro-RO")}
                  </div>
                  <div className="text-sm text-gray-400">{result.currency} / lună</div>
                </div>

                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Salariu de bază</span>
                    <span>{result.baseSalary.toLocaleString("ro-RO")}</span>
                  </div>
                  {result.componentBreakdown.map((c, i) => (
                    <div key={i} className="flex justify-between text-gray-500">
                      <span>{c.name}</span>
                      <span>{c.calculatedValue.toLocaleString("ro-RO")}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-medium text-gray-900 pt-1 border-t border-gray-100">
                    <span>Total</span>
                    <span>{result.totalCompensation.toLocaleString("ro-RO")}</span>
                  </div>
                </div>

                <button
                  onClick={() => saveScenario(lvl.key, lvl.label, lvl.pct)}
                  disabled={saving}
                  className="w-full py-1.5 text-xs border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {saving ? "Se salvează..." : "Salvează scenariul"}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Saved simulations */}
      {simulations.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Scenarii salvate</h2>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Scenariu</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Post</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Total compensație</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Salariu bază</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Performanță</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {simulations.map((sim) => {
                const result = sim.calculatedResult as SimResult
                return (
                  <tr key={sim.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">
                      {sim.name}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">
                      {sim.job.title}
                    </td>
                    <td className="px-6 py-3 text-sm font-medium text-blue-700">
                      {result.totalCompensation?.toLocaleString("ro-RO")} {result.currency}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">
                      {sim.package.baseSalary.toLocaleString("ro-RO")} {sim.package.currency}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500">
                      {result.weightedAchievement}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
