"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

interface Department {
  id: string
  name: string
}

interface TeamReport {
  id: string
  departmentId: string
  departmentName: string
  reportType: "MANAGER" | "HR" | "SUPERIOR"
  sections: ReportSection[]
  createdAt: string
}

interface ReportSection {
  title: string
  content: string
}

const REPORT_TYPES = [
  { key: "MANAGER" as const, label: "Raport Manager", color: "bg-indigo-600" },
  { key: "HR" as const, label: "Raport HR", color: "bg-teal-600" },
  { key: "SUPERIOR" as const, label: "Raport Superior", color: "bg-amber-600" },
]

export default function TeamReportsPage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [reports, setReports] = useState<TeamReport[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState<string | null>(null)
  const [selectedDept, setSelectedDept] = useState<string>("")
  const [expandedReport, setExpandedReport] = useState<string | null>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [deptRes, reportsRes] = await Promise.all([
        fetch("/api/v1/departments"),
        fetch("/api/v1/team-reports"),
      ])
      const deptData = await deptRes.json()
      const reportsData = await reportsRes.json()
      setDepartments(deptData.departments || deptData || [])
      setReports(reportsData.reports || reportsData || [])
    } catch { /* silent */ }
    setLoading(false)
  }

  async function generateReport(departmentId: string, reportType: string) {
    const key = `${departmentId}-${reportType}`
    setGenerating(key)
    try {
      const res = await fetch("/api/v1/team-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ departmentId, reportType }),
      })
      if (res.ok) loadData()
    } catch { /* silent */ }
    setGenerating(null)
  }

  const filteredReports = selectedDept
    ? reports.filter((r) => r.departmentId === selectedDept)
    : reports

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Rapoarte echipa</h1>
          <p className="text-sm text-text-secondary mt-1">
            Genereaza rapoarte diferentiate pe rol: Manager, HR, Superior ierarhic
          </p>
        </div>
        <Link
          href="/portal"
          className="text-sm text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          &larr; Portal
        </Link>
      </div>

      {loading && <p className="text-sm text-text-secondary">Se incarca...</p>}

      {!loading && (
        <>
          {/* Department selector + generate buttons */}
          <div className="rounded-lg border border-border bg-surface p-5 mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              Selecteaza departamentul
            </label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground mb-4"
            >
              <option value="">-- Toate departamentele --</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>

            {selectedDept && (
              <div className="flex gap-3">
                {REPORT_TYPES.map((rt) => {
                  const key = `${selectedDept}-${rt.key}`
                  return (
                    <button
                      key={rt.key}
                      onClick={() => generateReport(selectedDept, rt.key)}
                      disabled={generating === key}
                      className={`text-sm font-medium text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${rt.color} hover:opacity-90`}
                    >
                      {generating === key ? "Se genereaza..." : rt.label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Previously generated reports */}
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-3">
              Rapoarte generate ({filteredReports.length})
            </h2>

            {filteredReports.length === 0 && (
              <p className="text-sm text-text-secondary">
                Niciun raport generat{selectedDept ? " pentru acest departament" : ""}.
              </p>
            )}

            <div className="space-y-3">
              {filteredReports.map((report) => {
                const isExpanded = expandedReport === report.id
                const rtStyle = REPORT_TYPES.find((r) => r.key === report.reportType)

                return (
                  <div
                    key={report.id}
                    className="rounded-lg border border-border bg-surface overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedReport(isExpanded ? null : report.id)}
                      className="w-full flex items-center justify-between px-5 py-3 hover:bg-indigo-50/30 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`text-xs text-white px-2 py-0.5 rounded ${rtStyle?.color || "bg-gray-500"}`}
                        >
                          {rtStyle?.label || report.reportType}
                        </span>
                        <span className="text-sm font-medium text-foreground">
                          {report.departmentName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-text-secondary">
                          {new Date(report.createdAt).toLocaleDateString("ro-RO")}
                        </span>
                        <span className="text-text-secondary">
                          {isExpanded ? "\u25B2" : "\u25BC"}
                        </span>
                      </div>
                    </button>

                    {isExpanded && report.sections && (
                      <div className="border-t border-border px-5 py-4 space-y-4">
                        {report.sections.map((section, idx) => (
                          <div key={idx}>
                            <h3 className="text-sm font-semibold text-foreground mb-1">
                              {section.title}
                            </h3>
                            <p className="text-sm text-text-secondary whitespace-pre-wrap">
                              {section.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
