"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface Job {
  id: string
  title: string
  code: string | null
  department: { name: string } | null
}

interface Component {
  name: string
  type: "percentage" | "fixed"
  value: number
}

interface Package {
  id: string
  baseSalary: number
  currency: string
  components: Component[]
  benefits: string[]
  job: Job
  _count: { simulations: number }
}

interface PackagesManagerProps {
  packages: Package[]
  jobs: Job[]
}

const emptyForm = {
  jobId: "",
  baseSalary: "",
  currency: "RON",
  components: [] as Component[],
  benefits: [] as string[],
}

export default function PackagesManager({ packages, jobs }: PackagesManagerProps) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [newBenefit, setNewBenefit] = useState("")
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState("")

  function openCreate() {
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(true)
    setError("")
  }

  function openEdit(pkg: Package) {
    setForm({
      jobId: pkg.job.id,
      baseSalary: String(pkg.baseSalary),
      currency: pkg.currency,
      components: pkg.components,
      benefits: pkg.benefits,
    })
    setEditingId(pkg.id)
    setShowForm(true)
    setError("")
  }

  function addComponent() {
    setForm((f) => ({
      ...f,
      components: [...f.components, { name: "", type: "percentage", value: 0 }],
    }))
  }

  function updateComponent(idx: number, field: keyof Component, value: string | number) {
    setForm((f) => {
      const updated = [...f.components]
      updated[idx] = { ...updated[idx], [field]: value } as Component
      return { ...f, components: updated }
    })
  }

  function removeComponent(idx: number) {
    setForm((f) => ({
      ...f,
      components: f.components.filter((_, i) => i !== idx),
    }))
  }

  function addBenefit() {
    if (!newBenefit.trim()) return
    setForm((f) => ({ ...f, benefits: [...f.benefits, newBenefit.trim()] }))
    setNewBenefit("")
  }

  function removeBenefit(idx: number) {
    setForm((f) => ({ ...f, benefits: f.benefits.filter((_, i) => i !== idx) }))
  }

  async function handleSave() {
    if (!form.jobId || !form.baseSalary) {
      setError("Completează jobul și salariul de bază.")
      return
    }
    setSaving(true)
    setError("")

    const payload = {
      jobId: form.jobId,
      baseSalary: parseFloat(form.baseSalary),
      currency: form.currency,
      components: form.components,
      benefits: form.benefits,
    }

    const url = editingId
      ? `/api/v1/packages/${editingId}`
      : "/api/v1/packages"
    const method = editingId ? "PATCH" : "POST"

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.message || "Eroare la salvare.")
      } else {
        setShowForm(false)
        router.refresh()
      }
    } catch {
      setError("Eroare de rețea.")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Ștergi acest pachet? Toate simulările asociate vor fi șterse.")) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/v1/packages/${id}`, { method: "DELETE" })
      if (res.ok) router.refresh()
    } finally {
      setDeleting(null)
    }
  }

  const totalVariableFor = (pkg: Package) => {
    return pkg.components.reduce((sum, c) => {
      if (c.type === "percentage") return sum + (pkg.baseSalary * c.value) / 100
      return sum + c.value
    }, 0)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + Pachet nou
        </button>
      </div>

      {packages.length === 0 && !showForm && (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-16 text-gray-400">
          <p className="text-lg mb-1">Niciun pachet definit</p>
          <p className="text-sm">Creează primul pachet de compensații</p>
        </div>
      )}

      {/* Package list */}
      {packages.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Post</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Salariu bază</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Total estimat</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Componente</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Simulări</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {packages.map((pkg) => {
                const variable = totalVariableFor(pkg)
                return (
                  <tr key={pkg.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 text-sm">{pkg.job.title}</div>
                      <div className="text-xs text-gray-400">
                        {pkg.job.department?.name ?? "—"}
                        {pkg.job.code ? ` · ${pkg.job.code}` : ""}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {pkg.baseSalary.toLocaleString("ro-RO")} {pkg.currency}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-blue-700">
                      {(pkg.baseSalary + variable).toLocaleString("ro-RO")} {pkg.currency}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {pkg.components.length} componente
                      {pkg.benefits.length > 0 && ` · ${pkg.benefits.length} beneficii`}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {pkg._count.simulations}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => openEdit(pkg)}
                          className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                        >
                          Editează
                        </button>
                        <button
                          onClick={() => handleDelete(pkg.id)}
                          disabled={deleting === pkg.id}
                          className="px-3 py-1.5 text-xs border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
                        >
                          {deleting === pkg.id ? "..." : "Șterge"}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <h2 className="font-semibold text-gray-900">
            {editingId ? "Editează pachet" : "Pachet nou"}
          </h2>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Post *</label>
              <select
                value={form.jobId}
                onChange={(e) => setForm((f) => ({ ...f, jobId: e.target.value }))}
                disabled={!!editingId}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
              >
                <option value="">— Selectează —</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title} {j.code ? `(${j.code})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Salariu de bază *</label>
              <input
                type="number"
                value={form.baseSalary}
                onChange={(e) => setForm((f) => ({ ...f, baseSalary: e.target.value }))}
                placeholder="ex: 8000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monedă</label>
              <select
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="RON">RON</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          {/* Components */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Componente variabile</label>
              <button
                onClick={addComponent}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                + Adaugă componentă
              </button>
            </div>
            {form.components.length === 0 && (
              <p className="text-sm text-gray-400 py-2">Nicio componentă variabilă</p>
            )}
            <div className="space-y-2">
              {form.components.map((c, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={c.name}
                    onChange={(e) => updateComponent(idx, "name", e.target.value)}
                    placeholder="Nume componentă"
                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    value={c.type}
                    onChange={(e) => updateComponent(idx, "type", e.target.value)}
                    className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none"
                  >
                    <option value="percentage">% din bază</option>
                    <option value="fixed">Sumă fixă</option>
                  </select>
                  <input
                    type="number"
                    value={c.value}
                    onChange={(e) => updateComponent(idx, "value", parseFloat(e.target.value) || 0)}
                    placeholder={c.type === "percentage" ? "15" : "600"}
                    className="w-24 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none"
                  />
                  <span className="text-xs text-gray-400 w-8">
                    {c.type === "percentage" ? "%" : form.currency}
                  </span>
                  <button
                    onClick={() => removeComponent(idx)}
                    className="text-gray-400 hover:text-red-500 text-sm px-1"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Benefits */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Beneficii</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newBenefit}
                onChange={(e) => setNewBenefit(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addBenefit()}
                placeholder="ex: Mașină de serviciu"
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={addBenefit}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              >
                Adaugă
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.benefits.map((b, idx) => (
                <span
                  key={idx}
                  className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs"
                >
                  {b}
                  <button onClick={() => removeBenefit(idx)} className="hover:text-blue-900">✕</button>
                </span>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Anulează
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Se salvează..." : "Salvează pachetul"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
