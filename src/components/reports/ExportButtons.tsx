"use client"

import { useState } from "react"

interface ExportButtonsProps {
  sessionId: string
  sessionName: string
}

type ExportFormat = "pdf" | "excel" | "json" | "xml"

const FORMAT_CONFIG: Record<
  ExportFormat,
  { label: string; loadingLabel: string; ext: string; color: string }
> = {
  pdf: {
    label: "PDF (5 cr.)",
    loadingLabel: "Se generează...",
    ext: "_raport.pdf",
    color: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
  },
  excel: {
    label: "Excel (5 cr.)",
    loadingLabel: "Se generează...",
    ext: "_rezultate.xlsx",
    color: "bg-green-50 text-green-700 border-green-200 hover:bg-green-100",
  },
  json: {
    label: "JSON EU (5 cr.)",
    loadingLabel: "Se exportă...",
    ext: "_EU2023970.json",
    color: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
  },
  xml: {
    label: "XML EU (5 cr.)",
    loadingLabel: "Se exportă...",
    ext: "_EU2023970.xml",
    color: "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100",
  },
}

export default function ExportButtons({ sessionId, sessionName }: ExportButtonsProps) {
  const [loading, setLoading] = useState<ExportFormat | null>(null)
  const [error, setError] = useState("")

  async function handleExport(format: ExportFormat) {
    setLoading(format)
    setError("")

    try {
      const res = await fetch(`/api/v1/sessions/${sessionId}/export/${format}`, {
        method: "POST",
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json.message || "Eroare la export.")
        return
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${sessionName.replace(/[^a-zA-Z0-9]/g, "_")}${FORMAT_CONFIG[format].ext}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      setError("Eroare de rețea.")
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-2">
        {(["pdf", "excel", "json", "xml"] as ExportFormat[]).map((fmt) => {
          const cfg = FORMAT_CONFIG[fmt]
          return (
            <button
              key={fmt}
              onClick={() => handleExport(fmt)}
              disabled={loading !== null}
              className={`px-3 py-1.5 text-xs border rounded-lg transition-colors disabled:opacity-50 ${cfg.color}`}
            >
              {loading === fmt ? cfg.loadingLabel : cfg.label}
            </button>
          )
        })}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
