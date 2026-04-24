"use client"

import { useState } from "react"
import type { ReportModule } from "@/generated/prisma"

// ── Tipuri ───────────────────────────────────────────────────
interface ReportSection {
  id: string
  module: ReportModule
  title: string
  content: Record<string, unknown>
  order: number
  version: number
  updatedAt: string
}

interface ContinuousReport {
  id: string
  employeeName: string
  employeeEmail?: string | null
  jobTitle?: string | null
  department?: string | null
  visibleToEmployee: boolean
  status: "ACTIVE" | "SUSPENDED" | "CLOSED"
  sections: ReportSection[]
  createdAt: string
  updatedAt: string
}

// ── Module labels & icons ────────────────────────────────────
const MODULE_META: Record<string, { label: string; color: string; icon: string }> = {
  JOB_EVALUATION:      { label: "Evaluare posturi",           color: "bg-indigo-100 text-indigo-800",  icon: "📊" },
  SALARY_TRANSPARENCY: { label: "Transparenta salariala",     color: "bg-emerald-100 text-emerald-800", icon: "💰" },
  PAY_GAP:             { label: "Raport pay gap",             color: "bg-amber-100 text-amber-800",    icon: "📉" },
  JOINT_ASSESSMENT:    { label: "Evaluare comuna Art. 10",    color: "bg-blue-100 text-blue-800",      icon: "🤝" },
  BENCHMARK:           { label: "Benchmark piata",            color: "bg-purple-100 text-purple-800",  icon: "📈" },
  PERSONNEL_EVAL:      { label: "Evaluare personal",          color: "bg-rose-100 text-rose-800",      icon: "👤" },
  ORG_DEVELOPMENT:     { label: "Dezvoltare organizationala", color: "bg-teal-100 text-teal-800",      icon: "🌱" },
  CUSTOM:              { label: "Sectiune personalizata",     color: "bg-gray-100 text-gray-800",      icon: "📝" },
}

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  ACTIVE:    { label: "Activ",     color: "bg-green-100 text-green-800" },
  SUSPENDED: { label: "Suspendat", color: "bg-yellow-100 text-yellow-800" },
  CLOSED:    { label: "Inchis",    color: "bg-red-100 text-red-800" },
}

// ── Layout 3.1b — Raport angajat continuu ────────────────────
export default function ContinuousReportLayout({
  report,
  mode = "employer",
  onToggleVisibility,
  onStatusChange,
}: {
  report: ContinuousReport
  mode?: "employer" | "employee"
  onToggleVisibility?: (visible: boolean) => void
  onStatusChange?: (status: "ACTIVE" | "SUSPENDED" | "CLOSED") => void
}) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const expandAll = () => setExpandedSections(new Set(report.sections.map((s) => s.id)))
  const collapseAll = () => setExpandedSections(new Set())

  // Grupare secțiuni per modul
  const groupedByModule = report.sections.reduce<Record<string, ReportSection[]>>((acc, s) => {
    if (!acc[s.module]) acc[s.module] = []
    acc[s.module].push(s)
    return acc
  }, {})

  const status = STATUS_BADGE[report.status]

  return (
    <div className="max-w-4xl mx-auto">
      {/* ── Header raport ────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{report.employeeName}</h1>
            <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
              {report.jobTitle && <span>{report.jobTitle}</span>}
              {report.department && (
                <>
                  <span className="text-gray-300">|</span>
                  <span>{report.department}</span>
                </>
              )}
            </div>
            {report.employeeEmail && mode === "employer" && (
              <p className="mt-1 text-sm text-gray-400">{report.employeeEmail}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
              {status.label}
            </span>
            {mode === "employer" && onStatusChange && report.status !== "CLOSED" && (
              <select
                value={report.status}
                onChange={(e) => onStatusChange(e.target.value as "ACTIVE" | "SUSPENDED" | "CLOSED")}
                className="text-xs border border-gray-300 rounded px-2 py-1"
              >
                <option value="ACTIVE">Activ</option>
                <option value="SUSPENDED">Suspendat</option>
                <option value="CLOSED">Inchis</option>
              </select>
            )}
          </div>
        </div>

        {/* Vizibilitate angajat (GDPR Art. 15) */}
        {mode === "employer" && onToggleVisibility && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={report.visibleToEmployee}
                onChange={(e) => onToggleVisibility(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
            </label>
            <span className="text-sm text-gray-600">
              Vizibil pentru angajat
              <span className="text-xs text-gray-400 ml-1">(GDPR Art. 15 — drept de acces)</span>
            </span>
          </div>
        )}

        {mode === "employee" && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Acest raport este pus la dispozitie de angajatorul dumneavoastra in temeiul Art. 15 GDPR.
              Continutul reflecta modulele achizitionate si se actualizeaza automat.
            </p>
          </div>
        )}

        {/* Sumar module disponibile */}
        <div className="mt-4 flex flex-wrap gap-2">
          {Object.keys(groupedByModule).map((mod) => {
            const meta = MODULE_META[mod] || MODULE_META.CUSTOM
            return (
              <span key={mod} className={`px-2.5 py-1 rounded-md text-xs font-medium ${meta.color}`}>
                {meta.icon} {meta.label} ({groupedByModule[mod].length})
              </span>
            )
          })}
        </div>
      </div>

      {/* ── Toolbar ──────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {report.sections.length} sectiuni din {Object.keys(groupedByModule).length} module
        </p>
        <div className="flex gap-2">
          <button onClick={expandAll} className="text-xs text-indigo-600 hover:underline">
            Expandeaza tot
          </button>
          <span className="text-gray-300">|</span>
          <button onClick={collapseAll} className="text-xs text-indigo-600 hover:underline">
            Restringe tot
          </button>
        </div>
      </div>

      {/* ── Secțiuni document viu ────────────────────── */}
      {Object.entries(groupedByModule).map(([mod, sections]) => {
        const meta = MODULE_META[mod] || MODULE_META.CUSTOM
        return (
          <div key={mod} className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <span>{meta.icon}</span>
              {meta.label}
            </h2>
            <div className="space-y-2">
              {sections.map((section) => {
                const isExpanded = expandedSections.has(section.id)
                return (
                  <div key={section.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <button
                      onClick={() => toggleSection(section.id)}
                      className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-900">{section.title}</span>
                        <span className="text-xs text-gray-400">v{section.version}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">
                          {new Date(section.updatedAt).toLocaleDateString("ro-RO")}
                        </span>
                        <svg
                          className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-gray-100">
                        <SectionContent content={section.content} module={section.module} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* ── Empty state ──────────────────────────────── */}
      {report.sections.length === 0 && (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-500 text-sm">
            Raportul nu are inca sectiuni. Acestea se vor adauga automat
            pe masura ce modulele platformei sunt utilizate.
          </p>
        </div>
      )}

      {/* ── Footer ───────────────────────────────────── */}
      <div className="mt-8 pt-4 border-t border-gray-100 text-xs text-gray-400 flex items-center justify-between">
        <span>Creat: {new Date(report.createdAt).toLocaleDateString("ro-RO")}</span>
        <span>Ultima actualizare: {new Date(report.updatedAt).toLocaleDateString("ro-RO")}</span>
      </div>
    </div>
  )
}

// ── Renderer conținut secțiune ───────────────────────────────
function SectionContent({ content, module }: { content: Record<string, unknown>; module: string }) {
  // Render generic JSON structurat
  if (!content || typeof content !== "object") {
    return <p className="text-sm text-gray-500 py-2">Continut indisponibil.</p>
  }

  // Dacă are câmp "summary" — afișăm ca paragraf principal
  const summary = content.summary as string | undefined
  const details = content.details as { label?: string; value?: string }[] | undefined
  const metrics = content.metrics as { label?: string; value?: string | number }[] | undefined

  return (
    <div className="py-3 space-y-3">
      {summary && <p className="text-sm text-gray-700">{summary}</p>}

      {details && Array.isArray(details) && (
        <div className="space-y-2">
          {details.map((d, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <span className="text-indigo-400 mt-0.5">•</span>
              <div>
                {d.label && <span className="font-medium text-gray-800">{String(d.label)}: </span>}
                <span className="text-gray-600">{String(d.value || "")}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {metrics && Array.isArray(metrics) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
          {metrics.map((m, i) => (
            <div key={i} className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-lg font-semibold text-indigo-700">{String(m.value)}</p>
              <p className="text-xs text-gray-500">{String(m.label)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Fallback: render JSON keys */}
      {!summary && !details && !metrics && (
        <div className="space-y-1">
          {Object.entries(content).map(([key, val]) => (
            <div key={key} className="flex items-start gap-2 text-sm">
              <span className="font-medium text-gray-700 capitalize">{key.replace(/_/g, " ")}:</span>
              <span className="text-gray-600">{typeof val === "object" ? JSON.stringify(val) : String(val)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Badge modul */}
      <div className="pt-2">
        <span className="text-xs text-gray-400">
          Generat de modulul: {MODULE_META[module]?.label || module}
        </span>
      </div>
    </div>
  )
}
