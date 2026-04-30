"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

interface SOPStep {
  step: number
  action: string
  responsible: string
  details: string
}

interface KPIRow {
  name: string
  target: string
  unit: string
  frequency: string
}

interface RACIEntry {
  activity: string
  responsible: string
  accountable: string
  consulted: string
  informed: string
}

interface ManualSection {
  processName: string
  description: string
  sopSteps: SOPStep[]
  kpis: KPIRow[]
  raci: RACIEntry[]
}

interface QualityManual {
  id: string
  sections: ManualSection[]
  createdAt: string
}

export default function QualityManualPage() {
  const [manual, setManual] = useState<QualityManual | null>(null)
  const [hasProcessMap, setHasProcessMap] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set())

  useEffect(() => { checkProcessMap() }, [])

  async function checkProcessMap() {
    setLoading(true)
    try {
      const res = await fetch("/api/v1/processes/map")
      if (res.ok) {
        const data = await res.json()
        const nodes = data.processMap?.nodes || data.nodes || []
        setHasProcessMap(nodes.length > 0)
      } else {
        setHasProcessMap(false)
      }
      // Also try to load existing manual
      const manualRes = await fetch("/api/v1/processes/quality-manual")
      if (manualRes.ok) {
        const manualData = await manualRes.json()
        if (manualData && (manualData.sections || manualData.manual)) {
          setManual(manualData.manual || manualData)
        }
      }
    } catch { /* silent */ }
    setLoading(false)
  }

  async function generateManual() {
    setGenerating(true)
    try {
      const res = await fetch("/api/v1/processes/quality-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      if (res.ok) {
        const data = await res.json()
        setManual(data.manual || data)
      }
    } catch { /* silent */ }
    setGenerating(false)
  }

  function toggleSection(idx: number) {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Manual calitate</h1>
          <p className="text-sm text-text-secondary mt-1">
            Proceduri standard, indicatori si matrice RACI per proces
          </p>
        </div>
        <Link
          href="/processes"
          className="text-sm text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          &larr; Harta procese
        </Link>
      </div>

      {loading && <p className="text-sm text-text-secondary">Se incarca...</p>}

      {!loading && hasProcessMap === false && (
        <div className="rounded-lg border border-border bg-surface p-6 text-center">
          <p className="text-sm text-text-secondary mb-3">
            Genereaza mai intai harta proceselor pentru a putea crea manualul de calitate.
          </p>
          <Link
            href="/processes"
            className="text-sm font-medium bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors inline-block"
          >
            Mergi la Harta procese
          </Link>
        </div>
      )}

      {!loading && hasProcessMap && !manual && (
        <div className="rounded-lg border border-border bg-surface p-6 text-center">
          <p className="text-sm text-text-secondary mb-3">
            Harta proceselor exista. Genereaza manualul de calitate.
          </p>
          <button
            onClick={generateManual}
            disabled={generating}
            className="text-sm font-medium bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {generating ? "Se genereaza manualul..." : "Genereaza manual"}
          </button>
        </div>
      )}

      {!loading && manual && manual.sections && (
        <div className="space-y-4">
          {manual.sections.map((section, idx) => {
            const isExpanded = expandedSections.has(idx)
            return (
              <div
                key={idx}
                className="rounded-lg border border-border bg-surface overflow-hidden"
              >
                {/* Section header */}
                <button
                  onClick={() => toggleSection(idx)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-indigo-50/30 transition-colors text-left"
                >
                  <div>
                    <span className="font-semibold text-foreground">
                      {section.processName}
                    </span>
                    {section.description && (
                      <span className="ml-2 text-xs text-text-secondary">
                        {section.description}
                      </span>
                    )}
                  </div>
                  <span className="text-text-secondary">
                    {isExpanded ? "\u25B2" : "\u25BC"}
                  </span>
                </button>

                {isExpanded && (
                  <div className="border-t border-border px-5 py-4 space-y-6">
                    {/* SOP Steps */}
                    {section.sopSteps && section.sopSteps.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-foreground mb-2">
                          Procedura standard (SOP)
                        </h3>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm border-collapse">
                            <thead>
                              <tr className="bg-indigo-50/50">
                                <th className="text-left px-3 py-2 text-xs text-text-secondary font-medium border-b border-border">
                                  Pas
                                </th>
                                <th className="text-left px-3 py-2 text-xs text-text-secondary font-medium border-b border-border">
                                  Actiune
                                </th>
                                <th className="text-left px-3 py-2 text-xs text-text-secondary font-medium border-b border-border">
                                  Responsabil
                                </th>
                                <th className="text-left px-3 py-2 text-xs text-text-secondary font-medium border-b border-border">
                                  Detalii
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {section.sopSteps.map((step) => (
                                <tr key={step.step} className="border-b border-border/50">
                                  <td className="px-3 py-2 text-indigo-600 font-medium">
                                    {step.step}
                                  </td>
                                  <td className="px-3 py-2 text-foreground">
                                    {step.action}
                                  </td>
                                  <td className="px-3 py-2 text-text-secondary">
                                    {step.responsible}
                                  </td>
                                  <td className="px-3 py-2 text-text-secondary">
                                    {step.details}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* KPI Table */}
                    {section.kpis && section.kpis.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-foreground mb-2">
                          Indicatori de performanta (KPI)
                        </h3>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm border-collapse">
                            <thead>
                              <tr className="bg-teal-50/50">
                                <th className="text-left px-3 py-2 text-xs text-text-secondary font-medium border-b border-border">
                                  Indicator
                                </th>
                                <th className="text-left px-3 py-2 text-xs text-text-secondary font-medium border-b border-border">
                                  Target
                                </th>
                                <th className="text-left px-3 py-2 text-xs text-text-secondary font-medium border-b border-border">
                                  Unitate
                                </th>
                                <th className="text-left px-3 py-2 text-xs text-text-secondary font-medium border-b border-border">
                                  Frecventa
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {section.kpis.map((kpi, i) => (
                                <tr key={i} className="border-b border-border/50">
                                  <td className="px-3 py-2 text-foreground font-medium">
                                    {kpi.name}
                                  </td>
                                  <td className="px-3 py-2 text-teal-600">
                                    {kpi.target}
                                  </td>
                                  <td className="px-3 py-2 text-text-secondary">
                                    {kpi.unit}
                                  </td>
                                  <td className="px-3 py-2 text-text-secondary">
                                    {kpi.frequency}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* RACI Matrix */}
                    {section.raci && section.raci.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-foreground mb-2">
                          Matrice RACI
                        </h3>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm border-collapse">
                            <thead>
                              <tr className="bg-amber-50/50">
                                <th className="text-left px-3 py-2 text-xs text-text-secondary font-medium border-b border-border">
                                  Activitate
                                </th>
                                <th className="text-left px-3 py-2 text-xs text-text-secondary font-medium border-b border-border">
                                  R (Responsible)
                                </th>
                                <th className="text-left px-3 py-2 text-xs text-text-secondary font-medium border-b border-border">
                                  A (Accountable)
                                </th>
                                <th className="text-left px-3 py-2 text-xs text-text-secondary font-medium border-b border-border">
                                  C (Consulted)
                                </th>
                                <th className="text-left px-3 py-2 text-xs text-text-secondary font-medium border-b border-border">
                                  I (Informed)
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {section.raci.map((entry, i) => (
                                <tr key={i} className="border-b border-border/50">
                                  <td className="px-3 py-2 text-foreground font-medium">
                                    {entry.activity}
                                  </td>
                                  <td className="px-3 py-2 text-indigo-600">
                                    {entry.responsible}
                                  </td>
                                  <td className="px-3 py-2 text-amber-600">
                                    {entry.accountable}
                                  </td>
                                  <td className="px-3 py-2 text-text-secondary">
                                    {entry.consulted}
                                  </td>
                                  <td className="px-3 py-2 text-text-secondary">
                                    {entry.informed}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
