"use client"

import { useState } from "react"
import Link from "next/link"

interface ReportSummary {
  id: string
  employeeName: string
  employeeEmail: string | null
  jobTitle: string | null
  department: string | null
  visibleToEmployee: boolean
  status: "ACTIVE" | "SUSPENDED" | "CLOSED"
  sections: {
    id: string
    module: string
    title: string
    version: number
    updatedAt: string
  }[]
  createdAt: string
  updatedAt: string
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  SUSPENDED: "bg-yellow-100 text-yellow-800",
  CLOSED: "bg-red-100 text-red-800",
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Activ",
  SUSPENDED: "Suspendat",
  CLOSED: "Inchis",
}

export default function EmployeeReportsClient({
  initialReports,
  canCreate,
}: {
  initialReports: ReportSummary[]
  canCreate: boolean
}) {
  const [reports, setReports] = useState(initialReports)
  const [showCreate, setShowCreate] = useState(false)
  const [filter, setFilter] = useState<"all" | "ACTIVE" | "SUSPENDED" | "CLOSED">("all")
  const [search, setSearch] = useState("")
  const [creating, setCreating] = useState(false)

  // Form
  const [form, setForm] = useState({
    employeeName: "",
    employeeEmail: "",
    jobTitle: "",
    department: "",
  })

  const filtered = reports.filter((r) => {
    if (filter !== "all" && r.status !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        r.employeeName.toLowerCase().includes(q) ||
        r.jobTitle?.toLowerCase().includes(q) ||
        r.department?.toLowerCase().includes(q) ||
        r.employeeEmail?.toLowerCase().includes(q)
      )
    }
    return true
  })

  const handleCreate = async () => {
    if (!form.employeeName.trim()) return
    setCreating(true)
    try {
      const res = await fetch("/api/v1/employee-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeName: form.employeeName.trim(),
          employeeEmail: form.employeeEmail.trim() || undefined,
          jobTitle: form.jobTitle.trim() || undefined,
          department: form.department.trim() || undefined,
        }),
      })
      if (res.ok) {
        const newReport = await res.json()
        setReports((prev) => [{ ...newReport, sections: [] }, ...prev])
        setShowCreate(false)
        setForm({ employeeName: "", employeeEmail: "", jobTitle: "", department: "" })
      }
    } finally {
      setCreating(false)
    }
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Cauta angajat..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2"
        >
          <option value="all">Toate ({reports.length})</option>
          <option value="ACTIVE">Active ({reports.filter((r) => r.status === "ACTIVE").length})</option>
          <option value="SUSPENDED">Suspendate ({reports.filter((r) => r.status === "SUSPENDED").length})</option>
          <option value="CLOSED">Inchise ({reports.filter((r) => r.status === "CLOSED").length})</option>
        </select>
        {canCreate && (
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            + Raport nou
          </button>
        )}
      </div>

      {/* Form creare */}
      {showCreate && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Raport continuu nou</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">Nume angajat *</label>
              <input
                type="text"
                value={form.employeeName}
                onChange={(e) => setForm((f) => ({ ...f, employeeName: e.target.value }))}
                className="w-full text-sm border border-gray-300 rounded px-3 py-1.5 mt-0.5"
                placeholder="Ion Popescu"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Email</label>
              <input
                type="email"
                value={form.employeeEmail}
                onChange={(e) => setForm((f) => ({ ...f, employeeEmail: e.target.value }))}
                className="w-full text-sm border border-gray-300 rounded px-3 py-1.5 mt-0.5"
                placeholder="ion@company.ro"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Post</label>
              <input
                type="text"
                value={form.jobTitle}
                onChange={(e) => setForm((f) => ({ ...f, jobTitle: e.target.value }))}
                className="w-full text-sm border border-gray-300 rounded px-3 py-1.5 mt-0.5"
                placeholder="Inginer software"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Departament</label>
              <input
                type="text"
                value={form.department}
                onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                className="w-full text-sm border border-gray-300 rounded px-3 py-1.5 mt-0.5"
                placeholder="IT"
              />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleCreate}
              disabled={creating || !form.employeeName.trim()}
              className="bg-indigo-600 text-white text-sm px-4 py-1.5 rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              {creating ? "Se creeaza..." : "Creeaza raport"}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="text-sm text-gray-600 px-4 py-1.5 hover:text-gray-800"
            >
              Anuleaza
            </button>
          </div>
        </div>
      )}

      {/* Lista rapoarte */}
      <div className="space-y-3">
        {filtered.map((report) => (
          <Link
            key={report.id}
            href={`/employee-reports/${report.id}`}
            className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-indigo-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-900">{report.employeeName}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[report.status]}`}>
                    {STATUS_LABELS[report.status]}
                  </span>
                  {report.visibleToEmployee && (
                    <span className="text-xs text-emerald-600">Vizibil angajat</span>
                  )}
                </div>
                <div className="mt-1 text-sm text-gray-500 flex items-center gap-2">
                  {report.jobTitle && <span>{report.jobTitle}</span>}
                  {report.department && (
                    <>
                      <span className="text-gray-300">|</span>
                      <span>{report.department}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-indigo-700">{report.sections.length}</p>
                <p className="text-xs text-gray-500">sectiuni</p>
              </div>
            </div>
            {report.sections.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {[...new Set(report.sections.map((s) => s.module))].map((mod) => (
                  <span key={mod} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                    {mod.replace(/_/g, " ").toLowerCase()}
                  </span>
                ))}
              </div>
            )}
          </Link>
        ))}
        {filtered.length === 0 && (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
            <p className="text-gray-500 text-sm">
              {search || filter !== "all"
                ? "Nu exista rapoarte cu filtrele selectate."
                : "Nu exista rapoarte continue. Creati primul raport pentru un angajat."}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
