/**
 * SmartReportsDashboard — Rapoarte activate de date
 *
 * Concept:
 * - ACTIVE (verde) = date suficiente, click pentru generare
 * - INACTIVE (gri) = click pentru a vedea ce date lipsesc
 * - Ghidare naturala: utilizatorul vede ce trebuie completat
 * - Upsell organic: cardurile superioare deblocheaza rapoarte suplimentare
 */

"use client"

import { useState, useEffect } from "react"

interface ReportPrerequisite {
  key: string
  label: string
  available: boolean
  hint?: string
}

interface ReportReadiness {
  reportId: string
  name: string
  description: string
  status: "ACTIVE" | "INACTIVE"
  minCard: "C1" | "C2" | "C3" | "C4"
  readinessPercent: number
  prerequisites: ReportPrerequisite[]
  endpoint: string
}

export default function SmartReportsDashboard() {
  const [reports, setReports] = useState<ReportReadiness[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedReport, setExpandedReport] = useState<string | null>(null)
  const [generating, setGenerating] = useState<string | null>(null)

  useEffect(() => {
    fetchReports()
  }, [])

  async function fetchReports() {
    try {
      const res = await fetch("/api/v1/reports/readiness")
      if (res.ok) {
        const data = await res.json()
        setReports(data.reports ?? [])
      }
    } catch (err) {
      console.error("Eroare la incarcarea rapoartelor:", err)
    } finally {
      setLoading(false)
    }
  }

  async function generateReport(report: ReportReadiness) {
    if (report.status !== "ACTIVE") return
    setGenerating(report.reportId)
    try {
      const res = await fetch(report.endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) })
      if (res.ok) {
        const data = await res.json()
        // Could open in modal or redirect — for now show alert
        alert(`Raportul "${report.name}" a fost generat cu succes.`)
        console.log("Report data:", data)
      } else {
        const err = await res.json().catch(() => ({}))
        alert(`Eroare: ${err.message ?? "Nu s-a putut genera raportul."}`)
      }
    } catch {
      alert("Eroare de retea la generarea raportului.")
    } finally {
      setGenerating(null)
    }
  }

  function toggleExpand(reportId: string) {
    setExpandedReport(prev => (prev === reportId ? null : reportId))
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-gray-100 rounded-lg" />
        ))}
      </div>
    )
  }

  if (reports.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>Nu exista rapoarte configurate.</p>
      </div>
    )
  }

  // Group by card
  const grouped = reports.reduce(
    (acc, r) => {
      if (!acc[r.minCard]) acc[r.minCard] = []
      acc[r.minCard].push(r)
      return acc
    },
    {} as Record<string, ReportReadiness[]>
  )

  const cardLabels: Record<string, string> = {
    C1: "Card 1 — Organizare",
    C2: "Card 2 — Conformitate",
    C3: "Card 3 — Competitivitate",
    C4: "Card 4 — Dezvoltare",
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Rapoarte inteligente</h2>
        <p className="text-sm text-gray-500 mt-1">
          Rapoartele se activeaza automat pe masura ce completati datele organizatiei.
        </p>
      </div>

      {(["C1", "C2", "C3", "C4"] as const).map(card => {
        const cardReports = grouped[card]
        if (!cardReports || cardReports.length === 0) return null

        return (
          <section key={card}>
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
              {cardLabels[card]}
            </h3>
            <div className="grid gap-3">
              {cardReports.map(report => {
                const isExpanded = expandedReport === report.reportId
                const isActive = report.status === "ACTIVE"
                const isGenerating = generating === report.reportId

                return (
                  <div
                    key={report.reportId}
                    className={`border rounded-lg p-4 transition-all cursor-pointer ${
                      isActive
                        ? "border-green-200 bg-green-50 hover:border-green-300"
                        : "border-gray-200 bg-gray-50 hover:border-gray-300"
                    }`}
                    onClick={() => toggleExpand(report.reportId)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* Status indicator */}
                        <div
                          className={`w-3 h-3 rounded-full ${
                            isActive ? "bg-green-500" : "bg-gray-300"
                          }`}
                        />
                        <div>
                          <h4 className="font-medium text-gray-900">{report.name}</h4>
                          <p className="text-sm text-gray-500">{report.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {/* Readiness bar */}
                        {!isActive && (
                          <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-amber-400 rounded-full transition-all"
                              style={{ width: `${report.readinessPercent}%` }}
                            />
                          </div>
                        )}
                        {isActive && (
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              generateReport(report)
                            }}
                            disabled={isGenerating}
                            className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isGenerating ? "Se genereaza..." : "Genereaza"}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expanded: show prerequisites */}
                    {isExpanded && !isActive && (
                      <div className="mt-4 pl-6 border-t border-gray-100 pt-3">
                        <p className="text-xs font-medium text-gray-500 mb-2">
                          Date necesare pentru activare:
                        </p>
                        <ul className="space-y-1.5">
                          {report.prerequisites.map(p => (
                            <li key={p.key} className="flex items-center gap-2 text-sm">
                              {p.available ? (
                                <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
                                </svg>
                              )}
                              <span className={p.available ? "text-gray-600" : "text-gray-900"}>
                                {p.label}
                              </span>
                              {p.hint && (
                                <span className="text-xs text-amber-600 ml-1">
                                  — {p.hint}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
