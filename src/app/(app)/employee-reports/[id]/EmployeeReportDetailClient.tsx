"use client"

import { useCallback, useState } from "react"
import ContinuousReportLayout from "@/components/employee-reports/ContinuousReportLayout"

interface ReportData {
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
    content: Record<string, unknown>
    order: number
    version: number
    updatedAt: string
  }[]
  createdAt: string
  updatedAt: string
}

export default function EmployeeReportDetailClient({
  report: initialReport,
  mode,
}: {
  report: ReportData
  mode: "employer" | "employee"
}) {
  const updateReport = useCallback(
    async (data: Record<string, unknown>) => {
      await fetch(`/api/v1/employee-reports/${initialReport.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
    },
    [initialReport.id]
  )

  const handleToggleVisibility = useCallback(
    (visible: boolean) => {
      updateReport({ visibleToEmployee: visible })
    },
    [updateReport]
  )

  const handleStatusChange = useCallback(
    (status: "ACTIVE" | "SUSPENDED" | "CLOSED") => {
      updateReport({ status })
    },
    [updateReport]
  )

  const [exporting, setExporting] = useState(false)

  const handleExportPDF = useCallback(async () => {
    setExporting(true)
    try {
      const res = await fetch(`/api/v1/employee-reports/${initialReport.id}/pdf`)
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `raport-${initialReport.employeeName.replace(/\s/g, "_").toLowerCase()}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }, [initialReport.id, initialReport.employeeName])

  return (
    <div>
      {/* Export buttons */}
      <div className="max-w-4xl mx-auto mb-4 flex items-center justify-between">
        <a href="/employee-reports" className="text-sm text-indigo-600 hover:underline">
          ← Inapoi la lista
        </a>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="text-sm border border-gray-300 text-gray-700 px-4 py-1.5 rounded-lg hover:bg-gray-50"
          >
            Tipareste HTML
          </button>
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="text-sm bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {exporting ? "Se genereaza..." : "Descarca PDF"}
          </button>
        </div>
      </div>

      <ContinuousReportLayout
        report={initialReport as Parameters<typeof ContinuousReportLayout>[0]["report"]}
        mode={mode}
        onToggleVisibility={mode === "employer" ? handleToggleVisibility : undefined}
        onStatusChange={mode === "employer" ? handleStatusChange : undefined}
      />
    </div>
  )
}
