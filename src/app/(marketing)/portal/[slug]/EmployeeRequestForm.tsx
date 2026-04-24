"use client"

import { useState } from "react"

interface Props {
  tenantSlug: string
  salaryGrades: { id: string; name: string }[]
}

// Categorii de informatii pe care angajatul le poate solicita
// Mapate pe datele disponibile in platforma (stat functii + salary records)
const REQUEST_CATEGORIES = [
  {
    id: "nivel_salarial",
    label: "Nivelul meu salarial actual",
    description: "Salariul de baza brut lunar aferent pozitiei dvs.",
    article: "Art. 7.1(a)",
  },
  {
    id: "medie_categorie",
    label: "Media salariala pe categoria mea, defalcata pe gen",
    description:
      "Media si mediana remuneratiei pentru colegii din aceeasi categorie de munca, separate pe gen (M/F). Datele sunt agregate si anonimizate (minim 5 persoane per grup).",
    article: "Art. 7.1(b)",
  },
  {
    id: "clasa_salariala",
    label: "Clasa salariala si intervalul salarial",
    description:
      "Clasa salariala in care este incadrata pozitia dvs., cu intervalul minim-maxim aplicabil.",
    article: "Art. 6.1",
  },
  {
    id: "criterii_progresie",
    label: "Criteriile de progresie salariala",
    description:
      "Criteriile obiective folosite pentru stabilirea si progresia salariului: complexitate, responsabilitati, competente, conditii de munca.",
    article: "Art. 6.1",
  },
  {
    id: "pachet_beneficii",
    label: "Pachetul de beneficii aferent pozitiei",
    description:
      "Compensatia variabila si beneficiile suplimentare atasate categoriei dvs. de post.",
    article: "Art. 7.1(a)",
  },
  {
    id: "pozitie_quartila",
    label: "Pozitia mea in distributia salariala",
    description:
      "In ce quartila salariala va situati raportat la colegii din aceeasi categorie.",
    article: "Art. 9.1(f)",
  },
]

export default function EmployeeRequestForm({ tenantSlug, salaryGrades }: Props) {
  const [form, setForm] = useState({
    requestedBy: "",
    requestEmail: "",
    salaryGradeId: "",
    additionalDetails: "",
  })
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [requestId, setRequestId] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [error, setError] = useState("")

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  const selectAll = () => {
    setSelectedCategories(REQUEST_CATEGORIES.map((c) => c.id))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedCategories.length === 0) {
      setError("Selectati cel putin o categorie de informatii.")
      return
    }
    setError("")
    setLoading(true)
    try {
      // Construim requestDetails din categoriile selectate
      const categoriesText = selectedCategories
        .map((id) => {
          const cat = REQUEST_CATEGORIES.find((c) => c.id === id)
          return cat ? `[${cat.article}] ${cat.label}` : id
        })
        .join("\n")

      const requestDetails =
        `CATEGORII SOLICITATE:\n${categoriesText}` +
        (form.additionalDetails
          ? `\n\nDETALII SUPLIMENTARE:\n${form.additionalDetails}`
          : "")

      const res = await fetch("/api/v1/employee-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestedBy: form.requestedBy,
          requestEmail: form.requestEmail,
          salaryGradeId: form.salaryGradeId || undefined,
          requestDetails,
          requestedCategories: selectedCategories,
          tenantSlug,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message ?? "Eroare. Reincercati.")
      } else {
        setRequestId(data.requestId)
        setDueDate(new Date(data.dueDate).toLocaleDateString("ro-RO"))
        setSubmitted(true)
      }
    } catch {
      setError("Eroare de retea. Reincercati.")
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
        <div className="text-5xl mb-4">&#10003;</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Cerere inregistrata</h2>
        <p className="text-gray-600 mb-4">
          Cererea dvs. a fost transmisa angajatorului. Veti primi un raspuns la adresa de email
          indicata in termen de cel mult{" "}
          <strong className="text-gray-800">2 luni (pana la {dueDate})</strong>.
        </p>
        <div className="bg-gray-50 rounded-lg p-4 text-sm text-left mb-4">
          <p className="text-gray-500 mb-2">Informatii solicitate:</p>
          <ul className="space-y-1">
            {selectedCategories.map((id) => {
              const cat = REQUEST_CATEGORIES.find((c) => c.id === id)
              return (
                <li key={id} className="text-gray-700 flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">&#10003;</span>
                  <span>{cat?.label ?? id}</span>
                </li>
              )
            })}
          </ul>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-500">
          Numar cerere: <strong className="text-gray-700 font-mono text-xs">{requestId}</strong>
        </div>
        <p className="text-xs text-gray-400 mt-4">
          Daca nu primiti raspuns in termen, puteti contacta Inspectia Muncii sau autoritatea
          nationala de egalitate.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
      {/* Identificare */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Nume si prenume <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.requestedBy}
            onChange={(e) => setForm((p) => ({ ...p, requestedBy: e.target.value }))}
            required
            placeholder="ex: Ion Popescu"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Adresa email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={form.requestEmail}
            onChange={(e) => setForm((p) => ({ ...p, requestEmail: e.target.value }))}
            required
            placeholder="email@domeniu.ro"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
      </div>

      {salaryGrades.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Categoria de post (optional)
          </label>
          <select
            value={form.salaryGradeId}
            onChange={(e) => setForm((p) => ({ ...p, salaryGradeId: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          >
            <option value="">— Selectati —</option>
            {salaryGrades.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Categorii de informatii — checkboxes */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-gray-700">
            Ce informatii solicitati? <span className="text-red-500">*</span>
          </label>
          <button
            type="button"
            onClick={selectAll}
            className="text-xs text-violet-600 hover:text-violet-800"
          >
            Selecteaza tot
          </button>
        </div>
        <div className="space-y-2">
          {REQUEST_CATEGORIES.map((cat) => (
            <label
              key={cat.id}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedCategories.includes(cat.id)
                  ? "border-violet-300 bg-violet-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input
                type="checkbox"
                checked={selectedCategories.includes(cat.id)}
                onChange={() => toggleCategory(cat.id)}
                className="mt-0.5 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">{cat.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{cat.description}</div>
                <div className="text-[10px] text-violet-600 mt-1">{cat.article}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Detalii suplimentare */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Detalii suplimentare (optional)
        </label>
        <textarea
          value={form.additionalDetails}
          onChange={(e) => setForm((p) => ({ ...p, additionalDetails: e.target.value }))}
          rows={3}
          maxLength={2000}
          placeholder="Orice informatii suplimentare pe care doriti sa le comunicati..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 resize-y"
        />
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
          {error}
        </div>
      )}

      <div className="pt-2">
        <button
          type="submit"
          disabled={loading || selectedCategories.length === 0}
          className="w-full py-3 bg-violet-600 text-white font-semibold rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Se trimite cererea..." : `Trimite cererea (${selectedCategories.length} categorii)`}
        </button>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Datele dvs. sunt prelucrate conform GDPR si Directivei EU 2023/970. Cererea va fi
        transmisa exclusiv departamentului HR al companiei.
      </p>
    </form>
  )
}
