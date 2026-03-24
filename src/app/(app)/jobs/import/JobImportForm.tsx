"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"

const TEMPLATE_HEADERS = [
  "Titlu*",
  "Cod",
  "Departament",
  "Scop",
  "Responsabilități",
  "Cerințe",
  "Status (activ/inactiv)",
]

export default function JobImportForm() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<{
    imported: number
    skipped: number
  } | null>(null)
  const [error, setError] = useState("")

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.name.endsWith(".xlsx")) {
      setError("Acceptăm doar fișiere .xlsx")
      return
    }
    setFile(f)
    setError("")
    setResult(null)
  }

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    setError("")
    setResult(null)

    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch("/api/v1/jobs/import", {
        method: "POST",
        body: formData,
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.message || "Eroare la import.")
      } else {
        setResult({ imported: json.imported, skipped: json.skipped })
        setFile(null)
        if (inputRef.current) inputRef.current.value = ""
      }
    } catch {
      setError("Eroare de rețea.")
    } finally {
      setUploading(false)
    }
  }

  function downloadTemplate() {
    // Build a minimal CSV that opens in Excel
    const csvContent =
      "\uFEFF" + // BOM for UTF-8
      TEMPLATE_HEADERS.join(";") +
      "\n" +
      "Manager Vânzări;MV-001;Vânzări;Conduce echipa de vânzări;Gestionează KPI-uri echipă;Experiență 5 ani vânzări;activ\n" +
      "Analist HR;AHR-002;HR;;Recrutare și onboarding;;activ\n"

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "template_import_posturi.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5">
      {/* Format instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-3">
        <h2 className="font-semibold text-blue-900 text-sm">Format fișier Excel</h2>
        <p className="text-sm text-blue-700">
          Prima linie trebuie să conțină antetele coloanelor. Ordinea coloanelor:
        </p>
        <div className="grid grid-cols-7 gap-1">
          {TEMPLATE_HEADERS.map((h, i) => (
            <div
              key={i}
              className="bg-white border border-blue-200 rounded px-2 py-1 text-xs text-center text-blue-800 font-medium"
            >
              {h}
            </div>
          ))}
        </div>
        <ul className="text-xs text-blue-600 space-y-1">
          <li>• <strong>Titlu</strong> este singurul câmp obligatoriu</li>
          <li>• <strong>Departament</strong> trebuie să corespundă exact unui departament existent</li>
          <li>• <strong>Status</strong>: „activ" sau „inactiv" (implicit: activ)</li>
        </ul>
        <button
          onClick={downloadTemplate}
          className="text-xs text-blue-700 underline hover:text-blue-900 font-medium"
        >
          Descarcă template CSV
        </button>
      </div>

      {/* Upload area */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Încarcă fișierul</h2>

        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
            file ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-gray-400"
          }`}
          onClick={() => inputRef.current?.click()}
          style={{ cursor: "pointer" }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx"
            onChange={handleFileChange}
            className="hidden"
          />
          {file ? (
            <div>
              <div className="text-2xl mb-2">📊</div>
              <p className="font-medium text-gray-900 text-sm">{file.name}</p>
              <p className="text-xs text-gray-400 mt-1">
                {(file.size / 1024).toFixed(0)} KB
              </p>
            </div>
          ) : (
            <div>
              <div className="text-3xl mb-2 text-gray-300">📂</div>
              <p className="text-sm text-gray-500">
                Click pentru a selecta fișierul <strong>.xlsx</strong>
              </p>
              <p className="text-xs text-gray-400 mt-1">Maxim 10 MB</p>
            </div>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {result && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-1">
            <p className="font-semibold text-green-800 text-sm">Import finalizat!</p>
            <p className="text-sm text-green-700">
              {result.imported} posturi importate
              {result.skipped > 0 && `, ${result.skipped} rânduri ignorate (fără titlu)`}
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {uploading ? "Se importă..." : "Importă posturile"}
          </button>
          {result && (
            <button
              onClick={() => router.push("/app/jobs")}
              className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              Vezi toate posturile →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
