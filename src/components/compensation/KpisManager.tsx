"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { KpiFrequency } from "@/generated/prisma"

interface Job {
  id: string
  title: string
  code: string | null
  department: { name: string } | null
}

interface Kpi {
  id: string
  jobId: string
  name: string
  weight: number
  targetValue: number
  measurementUnit: string
  frequency: KpiFrequency
}

interface KpisManagerProps {
  jobs: Job[]
  kpisByJob: Record<string, Kpi[]>
}

const FREQ_LABELS: Record<KpiFrequency, string> = {
  MONTHLY: "Lunar",
  QUARTERLY: "Trimestrial",
  ANNUALLY: "Anual",
}

const emptyKpi = {
  name: "",
  weight: 20,
  targetValue: "",
  measurementUnit: "",
  frequency: KpiFrequency.MONTHLY as KpiFrequency,
}

export default function KpisManager({ jobs, kpisByJob }: KpisManagerProps) {
  const router = useRouter()
  const [selectedJobId, setSelectedJobId] = useState(jobs[0]?.id ?? "")
  const [newKpis, setNewKpis] = useState([{ ...emptyKpi }])
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const currentKpis = kpisByJob[selectedJobId] ?? []
  const totalWeight = currentKpis.reduce((s, k) => s + k.weight, 0)
  const newWeight = newKpis.reduce((s, k) => s + (Number(k.weight) || 0), 0)

  function addRow() {
    setNewKpis((prev) => [...prev, { ...emptyKpi }])
  }

  function removeRow(idx: number) {
    setNewKpis((prev) => prev.filter((_, i) => i !== idx))
  }

  function updateRow(idx: number, field: string, value: string | number) {
    setNewKpis((prev) => {
      const updated = [...prev]
      updated[idx] = { ...updated[idx], [field]: value }
      return updated
    })
  }

  async function handleSave() {
    if (!selectedJobId) return
    const valid = newKpis.every((k) => k.name.trim() && k.measurementUnit.trim())
    if (!valid) {
      setError("Completează numele și unitatea de măsură pentru toate KPI-urile.")
      return
    }

    setSaving(true)
    setError("")
    setSuccess("")

    try {
      const res = await fetch("/api/v1/kpis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: selectedJobId,
          kpis: newKpis.map((k) => ({
            name: k.name,
            weight: Number(k.weight),
            targetValue: String(k.targetValue),
            measurementUnit: k.measurementUnit,
            frequency: k.frequency,
          })),
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.message || "Eroare la salvare.")
      } else {
        setNewKpis([{ ...emptyKpi }])
        setSuccess("KPI-urile au fost salvate.")
        router.refresh()
        setTimeout(() => setSuccess(""), 3000)
      }
    } catch {
      setError("Eroare de rețea.")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      const res = await fetch(`/api/v1/kpis/${id}`, { method: "DELETE" })
      if (res.ok) router.refresh()
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="grid grid-cols-4 gap-6">
      {/* Job selector */}
      <div className="col-span-1">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700">Posturi</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {jobs.map((job) => {
              const count = (kpisByJob[job.id] ?? []).length
              return (
                <button
                  key={job.id}
                  onClick={() => {
                    setSelectedJobId(job.id)
                    setNewKpis([{ ...emptyKpi }])
                    setError("")
                    setSuccess("")
                  }}
                  className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                    selectedJobId === job.id
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <div className="font-medium truncate">{job.title}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {count} KPI{count !== 1 ? "-uri" : ""}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* KPI panel */}
      <div className="col-span-3 space-y-4">
        {/* Existing KPIs */}
        {currentKpis.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 text-sm">
                KPI-uri existente
              </h3>
              <span
                className={`text-xs font-medium px-2 py-1 rounded-full ${
                  totalWeight === 100
                    ? "bg-green-100 text-green-700"
                    : "bg-orange-100 text-orange-700"
                }`}
              >
                Total pondere: {totalWeight}%
              </span>
            </div>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-5 py-2 text-xs text-gray-500 font-medium uppercase">Nume</th>
                  <th className="text-left px-5 py-2 text-xs text-gray-500 font-medium uppercase">Pondere</th>
                  <th className="text-left px-5 py-2 text-xs text-gray-500 font-medium uppercase">Target</th>
                  <th className="text-left px-5 py-2 text-xs text-gray-500 font-medium uppercase">Unitate</th>
                  <th className="text-left px-5 py-2 text-xs text-gray-500 font-medium uppercase">Frecvență</th>
                  <th className="px-5 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {currentKpis.map((kpi) => (
                  <tr key={kpi.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-sm font-medium text-gray-900">{kpi.name}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{kpi.weight}%</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{kpi.targetValue}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{kpi.measurementUnit}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">
                      {FREQ_LABELS[kpi.frequency]}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => handleDelete(kpi.id)}
                        disabled={deleting === kpi.id}
                        className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                      >
                        {deleting === kpi.id ? "..." : "Șterge"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add new KPIs */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-sm">Adaugă KPI-uri noi</h3>
            <span className="text-xs text-gray-400">
              Pondere nouă: {newWeight}%
            </span>
          </div>

          <div className="space-y-2">
            {newKpis.map((kpi, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                <input
                  type="text"
                  value={kpi.name}
                  onChange={(e) => updateRow(idx, "name", e.target.value)}
                  placeholder="Nume KPI"
                  className="col-span-4 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  value={kpi.weight}
                  onChange={(e) => updateRow(idx, "weight", e.target.value)}
                  placeholder="Pondere %"
                  className="col-span-1 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none text-center"
                />
                <input
                  type="text"
                  value={kpi.targetValue}
                  onChange={(e) => updateRow(idx, "targetValue", e.target.value)}
                  placeholder="Target"
                  className="col-span-2 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none"
                />
                <input
                  type="text"
                  value={kpi.measurementUnit}
                  onChange={(e) => updateRow(idx, "measurementUnit", e.target.value)}
                  placeholder="Unitate"
                  className="col-span-2 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none"
                />
                <select
                  value={kpi.frequency}
                  onChange={(e) => updateRow(idx, "frequency", e.target.value)}
                  className="col-span-2 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none"
                >
                  {Object.entries(FREQ_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
                <button
                  onClick={() => removeRow(idx)}
                  disabled={newKpis.length === 1}
                  className="col-span-1 text-gray-400 hover:text-red-500 text-sm disabled:opacity-30 text-center"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={addRow}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              + Adaugă rând
            </button>

            <div className="flex items-center gap-3">
              {error && <p className="text-sm text-red-600">{error}</p>}
              {success && <p className="text-sm text-green-600">{success}</p>}
              <button
                onClick={handleSave}
                disabled={saving || !selectedJobId}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Se salvează..." : "Salvează KPI-urile"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
