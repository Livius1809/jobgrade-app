"use client"

import { useState } from "react"

interface Job {
  id: string
  title: string
  responsibilities?: string | null
  department?: { name: string } | null
}

interface KpiItem {
  name: string
  description: string
  targetValue: string
  measurementUnit: string
  frequency: "MONTHLY" | "QUARTERLY" | "ANNUALLY"
  weight: number
}

interface KpiSheetGeneratorProps {
  jobs: Job[]
  credits: number
}

const FREQUENCY_LABELS = {
  MONTHLY: "Lunar",
  QUARTERLY: "Trimestrial",
  ANNUALLY: "Anual",
}

export default function KpiSheetGenerator({ jobs, credits }: KpiSheetGeneratorProps) {
  const [selectedJobId, setSelectedJobId] = useState("")
  const [loading, setLoading] = useState(false)
  const [kpis, setKpis] = useState<KpiItem[]>([])
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function generate() {
    if (!selectedJobId) {
      setError("Selectează un job.")
      return
    }
    if (credits < 3) {
      setError("Credite insuficiente. Necesari: 3 credite.")
      return
    }

    setLoading(true)
    setError("")
    setKpis([])
    setSaved(false)

    try {
      const res = await fetch("/api/v1/ai/kpi-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: selectedJobId }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.message || "Eroare la generare.")
        setLoading(false)
        return
      }

      setKpis(json.kpis)
    } catch {
      setError("Eroare de rețea.")
    } finally {
      setLoading(false)
    }
  }

  async function saveKpis() {
    if (kpis.length === 0) return
    setSaving(true)

    try {
      await fetch("/api/v1/kpis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: selectedJobId, kpis }),
      })
      setSaved(true)
    } catch {
      setError("Eroare la salvare.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid grid-cols-5 gap-6">
      <div className="col-span-2 space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Configurare</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fișă de post *
            </label>
            <select
              value={selectedJobId}
              onChange={(e) => { setSelectedJobId(e.target.value); setKpis([]) }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">— Selectează jobul —</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title}
                  {job.department ? ` · ${job.department.name}` : ""}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
              {error}
            </div>
          )}

          <button
            onClick={generate}
            disabled={loading || !selectedJobId}
            className="w-full py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Se generează..." : "✨ Generează KPI-uri (3 credite)"}
          </button>
        </div>
      </div>

      <div className="col-span-3">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden min-h-96">
          {kpis.length > 0 ? (
            <>
              <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">
                  KPI-uri generate ({kpis.length})
                </h2>
                <button
                  onClick={saveKpis}
                  disabled={saving || saved}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {saved ? "✓ Salvat" : saving ? "Se salvează..." : "Salvează KPI-urile"}
                </button>
              </div>
              <div className="divide-y divide-gray-100">
                {kpis.map((kpi, i) => (
                  <div key={i} className="px-5 py-4">
                    <div className="flex items-start justify-between mb-1">
                      <div className="font-medium text-gray-900 text-sm">
                        {kpi.name}
                      </div>
                      <div className="flex gap-2 shrink-0 ml-3">
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                          {FREQUENCY_LABELS[kpi.frequency]}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full">
                          Pondere: {kpi.weight}%
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{kpi.description}</p>
                    <div className="text-xs text-gray-500">
                      Target: <span className="font-medium text-gray-700">
                        {kpi.targetValue} {kpi.measurementUnit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center">
              <div className="text-4xl mb-3">📊</div>
              <p className="text-gray-500 text-sm">
                Selectează un job pentru a genera KPI-uri personalizate
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
