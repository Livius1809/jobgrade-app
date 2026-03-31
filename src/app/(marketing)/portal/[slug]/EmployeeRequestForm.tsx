"use client"

import { useState } from "react"

interface Props {
  tenantSlug: string
  salaryGrades: { id: string; name: string }[]
}

export default function EmployeeRequestForm({ tenantSlug, salaryGrades }: Props) {
  const [form, setForm] = useState({
    requestedBy: "",
    requestEmail: "",
    salaryGradeId: "",
    requestDetails: "",
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [requestId, setRequestId] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/v1/employee-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, tenantSlug }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message ?? "Eroare. Vă rugăm reîncercați.")
      } else {
        setRequestId(data.requestId)
        setDueDate(new Date(data.dueDate).toLocaleDateString("ro-RO"))
        setSubmitted(true)
      }
    } catch {
      setError("Eroare de rețea. Vă rugăm reîncercați.")
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Cerere înregistrată</h2>
        <p className="text-gray-600 mb-4">
          Cererea dvs. a fost transmisă angajatorului. Veți primi un răspuns la adresa de email
          indicată în termen de cel mult{" "}
          <strong className="text-gray-800">2 luni (până la {dueDate})</strong>.
        </p>
        <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-500">
          Număr cerere: <strong className="text-gray-700 font-mono text-xs">{requestId}</strong>
        </div>
        <p className="text-xs text-gray-400 mt-4">
          Dacă nu primiți răspuns în termen, puteți contacta Inspecția Muncii sau autoritatea
          națională de egalitate.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Nume și prenume <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={form.requestedBy}
          onChange={(e) => setForm((p) => ({ ...p, requestedBy: e.target.value }))}
          required
          placeholder="ex: Ion Popescu"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Adresă email <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          value={form.requestEmail}
          onChange={(e) => setForm((p) => ({ ...p, requestEmail: e.target.value }))}
          required
          placeholder="email@domeniu.ro"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-400 mt-1">Răspunsul va fi trimis la această adresă.</p>
      </div>

      {salaryGrades.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Categoria de post pentru care solicitați informații
          </label>
          <select
            value={form.salaryGradeId}
            onChange={(e) => setForm((p) => ({ ...p, salaryGradeId: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">— Selectați (opțional) —</option>
            {salaryGrades.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Detalii cerere <span className="text-red-500">*</span>
        </label>
        <textarea
          value={form.requestDetails}
          onChange={(e) => setForm((p) => ({ ...p, requestDetails: e.target.value }))}
          required
          minLength={10}
          rows={4}
          placeholder="Descrieți ce informații salariale solicitați (ex: media salariului de bază pentru categoria mea de post, defalcată pe gen)..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 resize-y"
        />
        <p className="text-xs text-gray-400 mt-1">{form.requestDetails.length}/2000 caractere</p>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
          {error}
        </div>
      )}

      <div className="pt-2">
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Se trimite cererea..." : "Trimite cererea →"}
        </button>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Datele dvs. sunt prelucrate conform GDPR și Directivei EU 2023/970. Cererea va fi
        transmisă exclusiv departamentului HR al companiei.
      </p>
    </form>
  )
}
