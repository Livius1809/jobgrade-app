"use client"

import { useState } from "react"
import Link from "next/link"

interface Impact {
  area: string
  description: string
  severity: "LOW" | "MEDIUM" | "HIGH"
}

interface Projection {
  label: string
  cost: number
  benefit: number
}

interface Risk {
  risk: string
  probability: string
  mitigation: string
}

interface SimulationResult {
  impacts: Impact[]
  projections: Projection[]
  risks: Risk[]
}

interface CompareResult {
  classic: SimulationResult
  transformational: SimulationResult
}

const SCENARIO_TABS = [
  { key: "SCHIMB_STRUCTURA", label: "Schimb structura" },
  { key: "SCHIMB_MANAGEMENT", label: "Schimb management" },
  { key: "INVESTESC", label: "Investesc" },
  { key: "TRANZITIE_HU_AI", label: "Tranzitie HU-AI" },
  { key: "SCENARII_PIATA", label: "Scenarii piata" },
  { key: "GREENFIELD", label: "Greenfield" },
] as const

type ScenarioType = (typeof SCENARIO_TABS)[number]["key"]

const SEVERITY_STYLES: Record<string, { bg: string; text: string }> = {
  LOW: { bg: "bg-emerald-50", text: "text-emerald-700" },
  MEDIUM: { bg: "bg-amber-50", text: "text-amber-700" },
  HIGH: { bg: "bg-red-50", text: "text-red-700" },
}

export default function StrategicSimulatorPage() {
  const [activeTab, setActiveTab] = useState<ScenarioType>("SCHIMB_STRUCTURA")
  const [description, setDescription] = useState("")
  const [params, setParams] = useState("")
  const [compareMode, setCompareMode] = useState(false)
  const [result, setResult] = useState<SimulationResult | null>(null)
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null)
  const [running, setRunning] = useState(false)

  async function runSimulation() {
    setRunning(true)
    setResult(null)
    setCompareResult(null)
    try {
      const res = await fetch("/api/v1/culture/simulator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario: activeTab,
          description,
          params,
          compare: compareMode,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        if (compareMode && data.compare) {
          setCompareResult(data.compare)
        } else {
          setResult(data.result || data)
        }
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

  function renderSimResult(sim: SimulationResult, label?: string) {
    return (
      <div>
        {label && (
          <h3 className="text-sm font-bold text-foreground mb-3">{label}</h3>
        )}

        {/* Impacts */}
        {sim.impacts && sim.impacts.length > 0 && (
          <div className="mb-4">
            <span className="text-xs uppercase tracking-wide text-text-secondary">Impacturi</span>
            <div className="space-y-2 mt-2">
              {sim.impacts.map((imp, idx) => {
                const sev = SEVERITY_STYLES[imp.severity] || SEVERITY_STYLES.MEDIUM
                return (
                  <div key={idx} className={`rounded-lg border p-3 ${sev.bg}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground">{imp.area}</span>
                      <span className={`text-xs font-medium ${sev.text}`}>{imp.severity}</span>
                    </div>
                    <p className="text-xs text-text-secondary">{imp.description}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Projections */}
        {sim.projections && sim.projections.length > 0 && (
          <div className="mb-4">
            <span className="text-xs uppercase tracking-wide text-text-secondary">Proiectie cost/beneficiu</span>
            <div className="space-y-2 mt-2">
              {sim.projections.map((proj, idx) => (
                <div key={idx} className="rounded-lg border border-border bg-surface p-3">
                  <span className="text-sm font-medium text-foreground">{proj.label}</span>
                  <div className="flex gap-4 mt-1">
                    <span className="text-xs text-red-600">Cost: {formatCurrency(proj.cost)}</span>
                    <span className="text-xs text-emerald-600">Beneficiu: {formatCurrency(proj.benefit)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Risks */}
        {sim.risks && sim.risks.length > 0 && (
          <div>
            <span className="text-xs uppercase tracking-wide text-text-secondary">Riscuri</span>
            <div className="space-y-2 mt-2">
              {sim.risks.map((risk, idx) => (
                <div key={idx} className="rounded-lg border border-border bg-surface p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-foreground">{risk.risk}</span>
                    <span className="text-xs text-text-secondary">P: {risk.probability}</span>
                  </div>
                  <p className="text-xs text-text-secondary">{risk.mitigation}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Simulator strategic</h1>
          <p className="text-sm text-text-secondary mt-1">
            Simuleaza impactul deciziilor strategice asupra culturii organizationale
          </p>
        </div>
        <Link
          href="/portal"
          className="text-sm text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          &larr; Portal
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-6 overflow-x-auto">
        {SCENARIO_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setResult(null); setCompareResult(null) }}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-amber-600 text-amber-600"
                : "border-transparent text-text-secondary hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Form */}
      <div className="rounded-lg border border-border bg-surface p-5 mb-6">
        <div className="mb-4">
          <label className="block text-xs text-text-secondary mb-1">
            Descriere scenariu
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Descrieti scenariul pe care doriti sa-l simulati..."
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground resize-none"
          />
        </div>

        <div className="mb-4">
          <label className="block text-xs text-text-secondary mb-1">
            Parametri suplimentari (optional)
          </label>
          <input
            type="text"
            value={params}
            onChange={(e) => setParams(e.target.value)}
            placeholder="ex: buget=500000, termen=12luni"
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
          />
        </div>

        {/* Compare toggle */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-sm font-medium text-foreground">
              Compara Clasic vs Transformational
            </span>
            <p className="text-xs text-text-secondary mt-0.5">
              Analizeaza ambele abordari in paralel
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={compareMode}
            onClick={() => setCompareMode(!compareMode)}
            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors cursor-pointer ${
              compareMode ? "bg-amber-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${
                compareMode ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        <button
          onClick={runSimulation}
          disabled={running}
          className="text-sm font-medium bg-amber-600 text-white px-5 py-2 rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
        >
          {running ? "Se simuleaza..." : "Ruleaza simularea"}
        </button>
      </div>

      {/* Results — single mode */}
      {result && !compareMode && renderSimResult(result)}

      {/* Results — compare mode */}
      {compareResult && compareMode && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-lg border border-border bg-surface p-4">
            {renderSimResult(compareResult.classic, "Clasic")}
          </div>
          <div className="rounded-lg border-2 border-amber-300 bg-amber-50/30 p-4">
            {renderSimResult(compareResult.transformational, "Transformational")}
          </div>
        </div>
      )}
    </div>
  )
}
