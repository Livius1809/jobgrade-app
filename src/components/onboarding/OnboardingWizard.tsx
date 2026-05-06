"use client"

import { useState, useCallback, type ChangeEvent, type DragEvent } from "react"

// ── Tipuri ──────────────────────────────────────────────────────────────────

interface CompanyData {
  tenantName: string
  industry: string
  size: string
  cui: string
}

interface Department {
  id?: string
  name: string
  status: "pending" | "saved" | "error"
}

type Step = 1 | 2 | 3 | 4

// ── Componenta principală ───────────────────────────────────────────────────

export default function OnboardingWizard() {
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1 — Company profile
  const [company, setCompany] = useState<CompanyData>({
    tenantName: "",
    industry: "",
    size: "",
    cui: "",
  })

  // Step 2 — Upload stat funcții
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "done" | "error">("idle")
  const [dragging, setDragging] = useState(false)

  // Step 3 — Departamente
  const [departments, setDepartments] = useState<Department[]>([])
  const [deptInput, setDeptInput] = useState("")

  // Step 4 — Summary (no extra state needed)

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleCompanyChange = useCallback(
    (field: keyof CompanyData) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setCompany((prev) => ({ ...prev, [field]: e.target.value }))
    },
    []
  )

  const saveCompanyProfile = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/v1/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(company),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message || `Eroare ${res.status}`)
      }
      setStep(2)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la salvarea profilului.")
    } finally {
      setLoading(false)
    }
  }, [company])

  // Drag & drop
  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }, [])
  const handleDragLeave = useCallback(() => setDragging(false), [])
  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) setUploadFile(file)
  }, [])
  const handleFileSelect = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setUploadFile(file)
  }, [])

  const uploadStatFunctii = useCallback(async () => {
    if (!uploadFile) {
      setStep(3)
      return
    }
    setUploadStatus("uploading")
    setError(null)
    try {
      const formData = new FormData()
      formData.append("file", uploadFile)
      const res = await fetch("/api/v1/upload", {
        method: "POST",
        body: formData,
      })
      if (!res.ok) {
        throw new Error(`Eroare upload: ${res.status}`)
      }
      setUploadStatus("done")
      setStep(3)
    } catch (err) {
      setUploadStatus("error")
      setError(err instanceof Error ? err.message : "Eroare la upload.")
    }
  }, [uploadFile])

  const addDepartment = useCallback(() => {
    const name = deptInput.trim()
    if (!name) return
    if (departments.some((d) => d.name.toLowerCase() === name.toLowerCase())) return
    setDepartments((prev) => [...prev, { name, status: "pending" }])
    setDeptInput("")
  }, [deptInput, departments])

  const removeDepartment = useCallback((index: number) => {
    setDepartments((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const saveDepartments = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const updated = [...departments]
      for (let i = 0; i < updated.length; i++) {
        if (updated[i].status === "saved") continue
        const res = await fetch("/api/v1/departments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: updated[i].name }),
        })
        if (res.ok) {
          const body = await res.json()
          updated[i] = { ...updated[i], id: body.id, status: "saved" }
        } else {
          updated[i] = { ...updated[i], status: "error" }
        }
      }
      setDepartments(updated)
      setStep(4)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la salvarea departamentelor.")
    } finally {
      setLoading(false)
    }
  }, [departments])

  const handleFinish = useCallback(() => {
    // Redirecționare către dashboard-ul principal
    window.location.href = "/dashboard"
  }, [])

  // ── Render helpers ──────────────────────────────────────────────────────

  const stepTitles = [
    "Profil companie",
    "Stat de funcții",
    "Departamente",
    "Rezumat",
  ]

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="mb-2 flex justify-between text-sm text-gray-500">
          {stepTitles.map((title, i) => (
            <span
              key={title}
              className={i + 1 === step ? "font-semibold text-blue-600" : ""}
            >
              {i + 1}. {title}
            </span>
          ))}
        </div>
        <div className="h-2 w-full rounded-full bg-gray-200">
          <div
            className="h-2 rounded-full bg-blue-600 transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── Step 1: Company profile ──────────────────────────────────────── */}
      {step === 1 && (
        <div>
          <h2 className="mb-1 text-xl font-semibold text-gray-900">Profil companie</h2>
          <p className="mb-6 text-sm text-gray-500">
            Completează datele de bază ale companiei. Poți reveni oricând să le actualizezi.
          </p>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Denumire companie *
              </label>
              <input
                type="text"
                value={company.tenantName}
                onChange={handleCompanyChange("tenantName")}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="SC Exemplu SRL"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Industrie
              </label>
              <input
                type="text"
                value={company.industry}
                onChange={handleCompanyChange("industry")}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="ex. IT, Producție, Retail"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Dimensiune
              </label>
              <select
                value={company.size}
                onChange={handleCompanyChange("size")}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Selectează</option>
                <option value="1-10">1-10 angajați</option>
                <option value="11-50">11-50 angajați</option>
                <option value="51-200">51-200 angajați</option>
                <option value="201-500">201-500 angajați</option>
                <option value="500+">500+ angajați</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                CUI
              </label>
              <input
                type="text"
                value={company.cui}
                onChange={handleCompanyChange("cui")}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="RO12345678"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={saveCompanyProfile}
              disabled={loading || !company.tenantName.trim()}
              className="rounded bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Se salvează..." : "Următorul pas"}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Upload stat funcții ──────────────────────────────────── */}
      {step === 2 && (
        <div>
          <h2 className="mb-1 text-xl font-semibold text-gray-900">Stat de funcții</h2>
          <p className="mb-6 text-sm text-gray-500">
            Încarcă statul de funcții al companiei. Acceptăm fișiere Excel, CSV sau PDF.
          </p>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex min-h-[200px] flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
              dragging
                ? "border-blue-500 bg-blue-50"
                : uploadFile
                  ? "border-green-400 bg-green-50"
                  : "border-gray-300 bg-gray-50"
            }`}
          >
            {uploadFile ? (
              <div className="text-center">
                <p className="text-sm font-medium text-gray-900">{uploadFile.name}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {(uploadFile.size / 1024).toFixed(1)} KB
                </p>
                {uploadStatus === "done" && (
                  <p className="mt-2 text-sm text-green-600">Fișier încărcat cu succes.</p>
                )}
                <button
                  onClick={() => {
                    setUploadFile(null)
                    setUploadStatus("idle")
                  }}
                  className="mt-2 text-xs text-red-500 hover:underline"
                >
                  Șterge fișierul
                </button>
              </div>
            ) : (
              <div className="text-center">
                <svg
                  className="mx-auto mb-3 h-10 w-10 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p className="text-sm text-gray-600">
                  Trage fișierul aici sau{" "}
                  <label className="cursor-pointer font-medium text-blue-600 hover:underline">
                    alege de pe disc
                    <input
                      type="file"
                      className="hidden"
                      accept=".xlsx,.xls,.csv,.pdf"
                      onChange={handleFileSelect}
                    />
                  </label>
                </p>
                <p className="mt-1 text-xs text-gray-400">.xlsx, .xls, .csv, .pdf</p>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="rounded border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Înapoi
            </button>
            <button
              onClick={uploadStatFunctii}
              disabled={uploadStatus === "uploading"}
              className="rounded bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploadStatus === "uploading"
                ? "Se încarcă..."
                : uploadFile
                  ? "Încarcă și continuă"
                  : "Sari peste"}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Departamente ─────────────────────────────────────────── */}
      {step === 3 && (
        <div>
          <h2 className="mb-1 text-xl font-semibold text-gray-900">Departamente</h2>
          <p className="mb-6 text-sm text-gray-500">
            Adaugă departamentele companiei. Le poți completa și ulterior.
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              value={deptInput}
              onChange={(e) => setDeptInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  addDepartment()
                }
              }}
              className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Numele departamentului"
            />
            <button
              onClick={addDepartment}
              disabled={!deptInput.trim()}
              className="rounded bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Adaugă
            </button>
          </div>

          {departments.length > 0 && (
            <ul className="mt-4 divide-y divide-gray-100 rounded border border-gray-200">
              {departments.map((dept, i) => (
                <li key={`${dept.name}-${i}`} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-gray-800">{dept.name}</span>
                  <div className="flex items-center gap-3">
                    {dept.status === "saved" && (
                      <span className="text-xs text-green-600">Salvat</span>
                    )}
                    {dept.status === "error" && (
                      <span className="text-xs text-red-500">Eroare</span>
                    )}
                    <button
                      onClick={() => removeDepartment(i)}
                      className="text-xs text-red-400 hover:text-red-600"
                    >
                      Șterge
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {departments.length === 0 && (
            <p className="mt-4 text-center text-sm text-gray-400">
              Niciun departament adăugat. Poți continua și adăuga ulterior.
            </p>
          )}

          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setStep(2)}
              className="rounded border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Înapoi
            </button>
            <button
              onClick={saveDepartments}
              disabled={loading}
              className="rounded bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Se salvează..."
                : departments.length > 0
                  ? "Salvează și continuă"
                  : "Continuă fără departamente"}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: Summary ──────────────────────────────────────────────── */}
      {step === 4 && (
        <div>
          <h2 className="mb-1 text-xl font-semibold text-gray-900">Rezumat</h2>
          <p className="mb-6 text-sm text-gray-500">
            Verifică datele introduse. Poți reveni la orice pas pentru corecturi.
          </p>

          <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-6">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Companie
              </h3>
              <p className="mt-1 text-sm text-gray-800">
                {company.tenantName || "—"}
                {company.cui && <span className="ml-2 text-gray-400">({company.cui})</span>}
              </p>
              <p className="text-sm text-gray-500">
                {[company.industry, company.size].filter(Boolean).join(" · ") || "—"}
              </p>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Stat de funcții
              </h3>
              <p className="mt-1 text-sm text-gray-800">
                {uploadFile ? uploadFile.name : "Niciun fișier încărcat"}
              </p>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Departamente ({departments.length})
              </h3>
              {departments.length > 0 ? (
                <ul className="mt-1 space-y-1">
                  {departments.map((d) => (
                    <li key={d.name} className="text-sm text-gray-800">
                      {d.name}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-sm text-gray-500">Niciun departament</p>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setStep(3)}
              className="rounded border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Înapoi
            </button>
            <button
              onClick={handleFinish}
              className="rounded bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Pornește evaluarea
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
