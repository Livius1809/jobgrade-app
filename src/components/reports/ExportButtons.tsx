"use client"

import { useState } from "react"

interface ExportButtonsProps {
  sessionId: string
  sessionName: string
}

export default function ExportButtons({ sessionId, sessionName }: ExportButtonsProps) {
  const [loadingPdf, setLoadingPdf] = useState(false)
  const [loadingExcel, setLoadingExcel] = useState(false)
  const [error, setError] = useState("")

  async function handleExport(format: "pdf" | "excel") {
    const setLoading = format === "pdf" ? setLoadingPdf : setLoadingExcel
    setLoading(true)
    setError("")

    try {
      const res = await fetch(`/api/v1/sessions/${sessionId}/export/${format}`, {
        method: "POST",
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json.message || "Eroare la export.")
        setLoading(false)
        return
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download =
        format === "pdf"
          ? `${sessionName.replace(/[^a-zA-Z0-9]/g, "_")}_raport.pdf`
          : `${sessionName.replace(/[^a-zA-Z0-9]/g, "_")}_rezultate.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      setError("Eroare de rețea.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        <button
          onClick={() => handleExport("pdf")}
          disabled={loadingPdf}
          className="px-3 py-1.5 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
        >
          {loadingPdf ? "Se generează..." : "Export PDF (5 cr.)"}
        </button>
        <button
          onClick={() => handleExport("excel")}
          disabled={loadingExcel}
          className="px-3 py-1.5 text-xs bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
        >
          {loadingExcel ? "Se generează..." : "Export Excel (5 cr.)"}
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
