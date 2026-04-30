"use client"

import { useState } from "react"
import Link from "next/link"

interface RoiResult {
  violationFound: boolean
  clause: string | null
  suggestedReplacement: string | null
  details: string | null
  checklist?: Array<{
    article: string
    requirement: string
    found: boolean
    aiComment: string | null
  }>
}

export default function ROICheckPage() {
  const [roiText, setRoiText] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<RoiResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleCheck() {
    if (!roiText.trim()) return
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const res = await fetch("/api/v1/compliance/roi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roiText: roiText.trim() }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setError(err.error || `Eroare ${res.status}`)
      } else {
        const data = await res.json()
        setResult(data)
      }
    } catch {
      setError("Eroare de conexiune. Incercati din nou.")
    }
    setLoading(false)
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-foreground">Verificare ROI — Regulament Ordine Interna</h1>
        <Link href="/compliance" className="text-xs text-indigo-600 hover:underline">
          &larr; Portal conformitate
        </Link>
      </div>
      <p className="text-sm text-text-secondary mb-6">
        Lipiti textul ROI si verificati conformitatea cu legislatia muncii si Directiva EU 2023/970
      </p>

      {/* Input area */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-foreground mb-1">
          Textul Regulamentului de Ordine Interna
        </label>
        <textarea
          value={roiText}
          onChange={e => setRoiText(e.target.value)}
          rows={10}
          placeholder="Lipiti aici textul complet sau partial al ROI-ului pentru verificare..."
          className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-y"
        />
        <p className="text-[10px] text-text-secondary mt-1">
          Minim 50 de caractere pentru o analiza relevanta
        </p>
      </div>

      <button
        onClick={handleCheck}
        disabled={loading || roiText.trim().length < 10}
        className="px-5 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        {loading ? "Se verifica..." : "Verifica conformitate"}
      </button>

      {/* Error */}
      {error && (
        <div className="mt-6 p-4 rounded-xl border border-red-200 bg-red-50">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="mt-6 space-y-4">
          {/* Overall status */}
          <div className={`p-4 rounded-xl border ${
            result.violationFound
              ? "border-red-200 bg-red-50"
              : "border-emerald-200 bg-emerald-50"
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-lg font-bold ${
                result.violationFound ? "text-red-700" : "text-emerald-700"
              }`}>
                {result.violationFound ? "Neconformitati identificate" : "Conform"}
              </span>
            </div>
            <p className={`text-sm ${
              result.violationFound ? "text-red-600" : "text-emerald-600"
            }`}>
              {result.violationFound
                ? "ROI-ul contine clauze care necesita corectare"
                : "ROI-ul respecta cerintele legale verificate"
              }
            </p>
          </div>

          {/* Clause details */}
          {result.clause && (
            <div className="p-4 rounded-xl border border-border bg-surface">
              <h3 className="text-sm font-semibold text-foreground mb-2">Clauza problematica</h3>
              <p className="text-sm text-red-700 bg-red-50 p-3 rounded-lg border border-red-200">
                {result.clause}
              </p>
            </div>
          )}

          {/* Suggested replacement */}
          {result.suggestedReplacement && (
            <div className="p-4 rounded-xl border border-border bg-surface">
              <h3 className="text-sm font-semibold text-foreground mb-2">Reformulare sugerata</h3>
              <p className="text-sm text-emerald-700 bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                {result.suggestedReplacement}
              </p>
            </div>
          )}

          {/* Details */}
          {result.details && (
            <div className="p-4 rounded-xl border border-border bg-surface">
              <h3 className="text-sm font-semibold text-foreground mb-2">Detalii analiza</h3>
              <p className="text-sm text-text-secondary whitespace-pre-wrap">{result.details}</p>
            </div>
          )}

          {/* Checklist if returned */}
          {result.checklist && result.checklist.length > 0 && (
            <div className="p-4 rounded-xl border border-border bg-surface">
              <h3 className="text-sm font-semibold text-foreground mb-3">Lista de verificare</h3>
              <div className="space-y-2">
                {result.checklist.map((item, idx) => (
                  <div key={idx} className={`p-3 rounded-lg border ${
                    item.found ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"
                  }`}>
                    <div className="flex items-start gap-2">
                      <span className={`text-xs font-bold mt-0.5 ${
                        item.found ? "text-emerald-600" : "text-red-600"
                      }`}>
                        {item.found ? "OK" : "LIPSA"}
                      </span>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-foreground">{item.article} — {item.requirement}</p>
                        {item.aiComment && (
                          <p className="text-[10px] text-text-secondary mt-1">{item.aiComment}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* EU Directive reference */}
          <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50">
            <h3 className="text-sm font-semibold text-indigo-700 mb-1">Referinta legislativa</h3>
            <p className="text-xs text-indigo-600">
              <strong>Directiva EU 2023/970, Art.7</strong> — Transparenta salariala: angajatorii trebuie sa asigure
              accesul lucratorilor la informatii privind nivelurile salariale individuale si medii, defalcate pe sex,
              pentru categorii de lucratori care efectueaza aceeasi munca sau o munca de valoare egala. ROI-ul nu trebuie
              sa contina clauze de confidentialitate care impiedica aceasta transparenta.
            </p>
            <a
              href="https://eur-lex.europa.eu/legal-content/RO/TXT/?uri=CELEX:32023L0970"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 text-[10px] text-indigo-600 underline hover:text-indigo-800"
            >
              Vezi textul complet al Directivei EU 2023/970
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
