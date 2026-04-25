"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"

interface ImportBatch {
  id: string
  fileName: string
  totalRows: number
  validRows: number
  invalidRows: number
  status: string
  createdAt: string
  errors: { row: number; field: string; message: string }[]
}

interface UploadResult {
  batchId: string
  totalRows: number
  validRows: number
  invalidRows: number
  errors: { row: number; field: string; message: string }[]
}

export default function PayrollImportPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState("")
  const [batches, setBatches] = useState<ImportBatch[]>([])
  const [loadingBatches, setLoadingBatches] = useState(true)

  // Fetch previous imports
  const fetchBatches = async () => {
    try {
      const res = await fetch("/api/v1/payroll/import")
      if (res.ok) {
        const data = await res.json()
        setBatches(data.batches ?? [])
      }
    } catch {
      // silent
    } finally {
      setLoadingBatches(false)
    }
  }

  useEffect(() => {
    fetchBatches()
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    setError("")
    setResult(null)
  }

  const handleUpload = async () => {
    if (!file) {
      setError("Selectați un fișier Excel.")
      return
    }

    setUploading(true)
    setError("")
    setResult(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/v1/payroll/import", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message ?? "Eroare la import.")
      } else {
        setResult(data)
        setFile(null)
        if (fileRef.current) fileRef.current.value = ""
        // Refresh batch list
        fetchBatches()
      }
    } catch {
      setError("Eroare de rețea. Verificați conexiunea.")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* ── Header ────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Import Payroll
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Încarcă fișierul Excel cu datele salariale conform template-ului cu 21 de coloane.
          </p>
        </div>
        <Link
          href="/owner"
          className="text-sm text-indigo bg-indigo/5 border border-indigo/10 rounded-lg px-4 py-2 hover:bg-indigo/10 hover:border-indigo/20 transition-all"
        >
          Înapoi la Dashboard
        </Link>
      </div>

      {/* ── Upload Section ────────────────────────────── */}
      <div className="rounded-xl border border-border bg-surface p-6 space-y-5">
        <h2 className="text-sm font-semibold text-foreground">Încarcă fișier Excel</h2>

        <div className="space-y-3">
          <label className="block text-xs font-medium text-text-secondary">
            Fișier (.xlsx, .xls) - Template cu 21 coloane (A-U)
          </label>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            onChange={handleFileChange}
            className="block w-full text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-coral/10 file:text-coral hover:file:bg-coral/20 file:cursor-pointer file:transition-colors"
          />
          {file && (
            <p className="text-xs text-text-secondary">
              Selectat: <span className="font-medium text-foreground">{file.name}</span> ({(file.size / 1024).toFixed(1)} KB)
            </p>
          )}
        </div>

        {/* Column reference */}
        <details className="text-xs text-text-secondary">
          <summary className="cursor-pointer hover:text-foreground transition-colors font-medium">
            Structura coloanelor (A-U)
          </summary>
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 pl-4">
            <span>A: Cod post</span>
            <span>B: Titlu post</span>
            <span>C: Departament</span>
            <span>D: Nivel ierarhic</span>
            <span>E: Familie de joburi</span>
            <span>F: Grad existent</span>
            <span>G: Salar bază</span>
            <span>H: Sporuri fixe</span>
            <span>I: Bonusuri anuale</span>
            <span>J: Comisioane anuale</span>
            <span>K: Beneficii în natură</span>
            <span>L: Tichete de masă</span>
            <span>M: Gen (F/M)</span>
            <span>N: Program (2h/4h/6h/8h)</span>
            <span>O: Tip contract</span>
            <span>P: Vechime org.</span>
            <span>Q: Vechime rol</span>
            <span>R: Locație (Sediu/Remote/Hibrid)</span>
            <span>S: Oraș</span>
            <span>T: Educație</span>
            <span>U: Certificări</span>
          </div>
        </details>

        <button
          onClick={handleUpload}
          disabled={uploading || !file}
          className="px-5 py-2.5 bg-coral text-white text-sm font-medium rounded-lg hover:bg-coral/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {uploading ? "Se procesează..." : "Importă fișier"}
        </button>

        {/* Error message */}
        {error && (
          <div className="text-sm text-coral bg-coral/5 border border-coral/20 rounded-lg p-4">
            {error}
          </div>
        )}

        {/* Success result */}
        {result && (
          <div className="rounded-lg border border-indigo/20 bg-indigo/5 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Import finalizat</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{result.totalRows}</p>
                <p className="text-xs text-text-secondary">Total rânduri</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-indigo">{result.validRows}</p>
                <p className="text-xs text-text-secondary">Valide</p>
              </div>
              <div className="text-center">
                <p className={`text-2xl font-bold ${result.invalidRows > 0 ? "text-coral" : "text-foreground"}`}>
                  {result.invalidRows}
                </p>
                <p className="text-xs text-text-secondary">Invalide</p>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-coral mb-2">
                  Erori ({result.errors.length}):
                </p>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {result.errors.map((err, i) => (
                    <p key={i} className="text-xs text-text-secondary">
                      <span className="font-mono text-coral">Rând {err.row}</span>{" "}
                      <span className="font-medium">[{err.field}]</span>: {err.message}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Previous Imports ──────────────────────────── */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">
            Importuri anterioare
          </h2>
        </div>

        {loadingBatches ? (
          <div className="text-center py-10 text-text-secondary text-sm">
            Se încarcă...
          </div>
        ) : batches.length === 0 ? (
          <div className="text-center py-10 text-text-secondary/60 text-sm">
            Niciun import realizat.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-background/50">
                <tr>
                  <th className="text-left px-4 py-3 text-[11px] font-medium text-text-secondary uppercase tracking-wider">
                    Data
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-medium text-text-secondary uppercase tracking-wider">
                    Fișier
                  </th>
                  <th className="text-right px-4 py-3 text-[11px] font-medium text-text-secondary uppercase tracking-wider">
                    Total
                  </th>
                  <th className="text-right px-4 py-3 text-[11px] font-medium text-text-secondary uppercase tracking-wider">
                    Valide
                  </th>
                  <th className="text-right px-4 py-3 text-[11px] font-medium text-text-secondary uppercase tracking-wider">
                    Invalide
                  </th>
                  <th className="text-center px-4 py-3 text-[11px] font-medium text-text-secondary uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {batches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-background/30 transition-colors">
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {new Date(batch.createdAt).toLocaleDateString("ro-RO", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground">
                      {batch.fileName}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-foreground">
                      {batch.totalRows}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-indigo font-medium">
                      {batch.validRows}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <span className={batch.invalidRows > 0 ? "text-coral font-medium" : "text-text-secondary"}>
                        {batch.invalidRows}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          batch.status === "COMPLETED"
                            ? "bg-indigo/10 text-indigo"
                            : "bg-coral/10 text-coral"
                        }`}
                      >
                        {batch.status === "COMPLETED" ? "Complet" : "Eșuat"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
