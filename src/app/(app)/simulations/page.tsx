"use client"

import { useState } from "react"
import Link from "next/link"

interface CascadeImpact {
  area: string
  description: string
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  affectedEntities: string[]
}

interface SimulationResult {
  id: string
  type: string
  summary: string
  impacts: CascadeImpact[]
  createdAt: string
}

const TABS = [
  { key: "SCHIMB_OM", label: "Schimb om" },
  { key: "POZITIE_VACANTA", label: "Pozitie vacanta" },
  { key: "RESTRUCTURARE", label: "Restructurare" },
  { key: "MODIFIC_KPI", label: "Modific KPI" },
  { key: "PACHET_SALARIAL", label: "Pachet salarial" },
] as const

type SimType = (typeof TABS)[number]["key"]

const SEVERITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  LOW: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Scazut" },
  MEDIUM: { bg: "bg-amber-50", text: "text-amber-700", label: "Mediu" },
  HIGH: { bg: "bg-orange-50", text: "text-orange-700", label: "Ridicat" },
  CRITICAL: { bg: "bg-red-50", text: "text-red-700", label: "Critic" },
}

export default function CascadeSimulationsPage() {
  const [activeTab, setActiveTab] = useState<SimType>("SCHIMB_OM")
  const [result, setResult] = useState<SimulationResult | null>(null)
  const [running, setRunning] = useState(false)

  // Form fields per tab
  const [personName, setPersonName] = useState("")
  const [positionId, setPositionId] = useState("")
  const [departmentId, setDepartmentId] = useState("")
  const [kpiName, setKpiName] = useState("")
  const [kpiNewValue, setKpiNewValue] = useState("")
  const [salaryChange, setSalaryChange] = useState("")
  const [description, setDescription] = useState("")

  async function runSimulation() {
    setRunning(true)
    setResult(null)
    try {
      const payload: Record<string, unknown> = { type: activeTab, description }

      switch (activeTab) {
        case "SCHIMB_OM":
          payload.personName = personName
          payload.positionId = positionId
          break
        case "POZITIE_VACANTA":
          payload.positionId = positionId
          break
        case "RESTRUCTURARE":
          payload.departmentId = departmentId
          break
        case "MODIFIC_KPI":
          payload.kpiName = kpiName
          payload.kpiNewValue = kpiNewValue
          break
        case "PACHET_SALARIAL":
          payload.positionId = positionId
          payload.salaryChange = salaryChange
          break
      }

      const res = await fetch("/api/v1/simulations/cascade", {
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

  function resetForm() {
    setPersonName("")
    setPositionId("")
    setDepartmentId("")
    setKpiName("")
    setKpiNewValue("")
    setSalaryChange("")
    setDescription("")
    setResult(null)
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Simulari impact</h1>
          <p className="text-sm text-text-secondary mt-1">
            Simuleaza impactul in cascada al schimbarilor organizationale
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
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); resetForm() }}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-text-secondary hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Form per tab */}
      <div className="rounded-lg border border-border bg-surface p-5 mb-6">
        {activeTab === "SCHIMB_OM" && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-text-secondary mb-1">
                Persoana curenta
              </label>
              <input
                type="text"
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                placeholder="Numele persoanei"
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">
                ID pozitie
              </label>
              <input
                type="text"
                value={positionId}
                onChange={(e) => setPositionId(e.target.value)}
                placeholder="ID-ul pozitiei"
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
              />
            </div>
          </div>
        )}

        {activeTab === "POZITIE_VACANTA" && (
          <div>
            <label className="block text-xs text-text-secondary mb-1">
              ID pozitie vacanta
            </label>
            <input
              type="text"
              value={positionId}
              onChange={(e) => setPositionId(e.target.value)}
              placeholder="ID-ul pozitiei"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
            />
          </div>
        )}

        {activeTab === "RESTRUCTURARE" && (
          <div>
            <label className="block text-xs text-text-secondary mb-1">
              ID departament
            </label>
            <input
              type="text"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              placeholder="ID-ul departamentului"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
            />
          </div>
        )}

        {activeTab === "MODIFIC_KPI" && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-text-secondary mb-1">
                Numele KPI
              </label>
              <input
                type="text"
                value={kpiName}
                onChange={(e) => setKpiName(e.target.value)}
                placeholder="ex: Rata conversie"
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">
                Noua valoare target
              </label>
              <input
                type="text"
                value={kpiNewValue}
                onChange={(e) => setKpiNewValue(e.target.value)}
                placeholder="ex: 25%"
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
              />
            </div>
          </div>
        )}

        {activeTab === "PACHET_SALARIAL" && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-text-secondary mb-1">
                ID pozitie
              </label>
              <input
                type="text"
                value={positionId}
                onChange={(e) => setPositionId(e.target.value)}
                placeholder="ID-ul pozitiei"
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">
                Modificare salariala (%)
              </label>
              <input
                type="text"
                value={salaryChange}
                onChange={(e) => setSalaryChange(e.target.value)}
                placeholder="ex: +10 sau -5"
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
              />
            </div>
          </div>
        )}

        {/* Common description field */}
        <div className="mt-4">
          <label className="block text-xs text-text-secondary mb-1">
            Descriere/Context (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Context suplimentar pentru simulare..."
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground resize-none"
          />
        </div>

        <button
          onClick={runSimulation}
          disabled={running}
          className="mt-4 text-sm font-medium bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {running ? "Se simuleaza..." : "Ruleaza simularea"}
        </button>
      </div>

      {/* Results */}
      {result && result.impacts && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-2">
            Rezultat simulare
          </h2>
          {result.summary && (
            <p className="text-sm text-text-secondary mb-4">{result.summary}</p>
          )}

          <div className="space-y-3">
            {result.impacts.map((impact, idx) => {
              const sev = SEVERITY_STYLES[impact.severity] || SEVERITY_STYLES.MEDIUM
              return (
                <div
                  key={idx}
                  className={`rounded-lg border p-4 ${sev.bg}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-foreground">
                      {impact.area}
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${sev.bg} ${sev.text} border`}>
                      {sev.label}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary mb-2">
                    {impact.description}
                  </p>
                  {impact.affectedEntities && impact.affectedEntities.length > 0 && (
                    <div>
                      <span className="text-[10px] uppercase tracking-wide text-text-secondary">
                        Entitati afectate
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {impact.affectedEntities.map((entity, i) => (
                          <span
                            key={i}
                            className="text-xs px-2 py-0.5 rounded bg-white/60 text-foreground border border-border/50"
                          >
                            {entity}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
