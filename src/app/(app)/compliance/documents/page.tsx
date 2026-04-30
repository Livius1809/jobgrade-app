"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

interface ComplianceDocument {
  id: string
  title: string
  type: string
  content: string | null
  validFrom: string | null
  validTo: string | null
  createdAt: string
}

const TYPE_LABELS: Record<string, string> = {
  POLICY: "Politici",
  CERTIFICATION: "Certificari",
  CCM: "Contract Colectiv de Munca",
  ROI: "Regulament Ordine Interna",
}

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  POLICY: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
  CERTIFICATION: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  CCM: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  ROI: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<ComplianceDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Form state
  const [title, setTitle] = useState("")
  const [type, setType] = useState("POLICY")
  const [content, setContent] = useState("")
  const [validFrom, setValidFrom] = useState("")
  const [validTo, setValidTo] = useState("")

  useEffect(() => { loadDocuments() }, [])

  async function loadDocuments() {
    setLoading(true)
    try {
      const res = await fetch("/api/v1/compliance/documents")
      const data = await res.json()
      setDocuments(data.types || data.documents || data || [])
    } catch {}
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/v1/compliance/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          type,
          content: content.trim() || null,
          validFrom: validFrom || null,
          validTo: validTo || null,
        }),
      })
      if (res.ok) {
        setTitle("")
        setContent("")
        setValidFrom("")
        setValidTo("")
        setShowForm(false)
        loadDocuments()
      }
    } catch {}
    setSubmitting(false)
  }

  async function handleDelete(id: string) {
    if (!confirm("Stergeti acest document?")) return
    setDeleting(id)
    try {
      await fetch("/api/v1/compliance/documents", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      loadDocuments()
    } catch {}
    setDeleting(null)
  }

  // Group documents by type
  const grouped = documents.reduce<Record<string, ComplianceDocument[]>>((acc, doc) => {
    const key = doc.type || "OTHER"
    if (!acc[key]) acc[key] = []
    acc[key].push(doc)
    return acc
  }, {})

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-foreground">Documente conformitate</h1>
        <Link href="/compliance" className="text-xs text-indigo-600 hover:underline">
          &larr; Portal conformitate
        </Link>
      </div>
      <p className="text-sm text-text-secondary mb-6">
        Politici, certificari, CCM si ROI incarcate pentru verificare conformitate
      </p>

      {/* Add document button */}
      <button
        onClick={() => setShowForm(!showForm)}
        className="mb-6 px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
      >
        {showForm ? "Anuleaza" : "+ Adauga document"}
      </button>

      {/* Upload form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-8 p-5 rounded-xl border border-border bg-surface space-y-4">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Titlu document</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="ex. Politica egalitate salariale 2026"
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-400"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Tip document</label>
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {Object.entries(TYPE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Continut</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={5}
              placeholder="Textul complet al documentului sau un rezumat..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-y"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Valabil de la</label>
              <input
                type="date"
                value={validFrom}
                onChange={e => setValidFrom(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Valabil pana la</label>
              <input
                type="date"
                value={validTo}
                onChange={e => setValidTo(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting || !title.trim()}
            className="px-5 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? "Se salveaza..." : "Salveaza document"}
          </button>
        </form>
      )}

      {/* Loading */}
      {loading && <p className="text-sm text-text-secondary">Se incarca...</p>}

      {/* Empty state */}
      {!loading && documents.length === 0 && (
        <div className="text-center py-12 rounded-xl border border-border bg-surface">
          <p className="text-sm text-text-secondary">Nu exista documente incarcate.</p>
          <p className="text-xs text-text-secondary mt-2">Adaugati politici, certificari sau regulamente pentru verificare conformitate.</p>
        </div>
      )}

      {/* Documents grouped by type */}
      {!loading && Object.keys(grouped).length > 0 && (
        <div className="space-y-6">
          {Object.entries(TYPE_LABELS).map(([typeKey, typeLabel]) => {
            const docs = grouped[typeKey]
            if (!docs || docs.length === 0) return null
            const colors = TYPE_COLORS[typeKey] || TYPE_COLORS.POLICY

            return (
              <div key={typeKey}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${colors.bg} ${colors.text} ${colors.border} border`}>
                    {typeLabel}
                  </span>
                  <span className="text-xs text-text-secondary">{docs.length} {docs.length === 1 ? "document" : "documente"}</span>
                </div>
                <div className="space-y-2">
                  {docs.map(doc => (
                    <div key={doc.id} className="p-4 rounded-xl border border-border bg-surface">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-foreground">{doc.title}</h3>
                          {doc.content && (
                            <p className="text-xs text-text-secondary mt-1 line-clamp-2">{doc.content}</p>
                          )}
                          <div className="flex gap-3 mt-2 text-[10px] text-text-secondary">
                            {doc.validFrom && <span>De la: {new Date(doc.validFrom).toLocaleDateString("ro-RO")}</span>}
                            {doc.validTo && <span>Pana la: {new Date(doc.validTo).toLocaleDateString("ro-RO")}</span>}
                            <span>Incarcat: {new Date(doc.createdAt).toLocaleDateString("ro-RO")}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDelete(doc.id)}
                          disabled={deleting === doc.id}
                          className="ml-3 px-2 py-1 text-[10px] font-medium rounded bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 disabled:opacity-50 transition-colors"
                        >
                          {deleting === doc.id ? "..." : "Sterge"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {/* Documents with unknown types */}
          {grouped["OTHER"] && grouped["OTHER"].length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-50 text-slate-700 border border-slate-200">
                  Altele
                </span>
                <span className="text-xs text-text-secondary">{grouped["OTHER"].length} documente</span>
              </div>
              <div className="space-y-2">
                {grouped["OTHER"].map(doc => (
                  <div key={doc.id} className="p-4 rounded-xl border border-border bg-surface">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{doc.title}</h3>
                        {doc.content && <p className="text-xs text-text-secondary mt-1 line-clamp-2">{doc.content}</p>}
                      </div>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        disabled={deleting === doc.id}
                        className="ml-3 px-2 py-1 text-[10px] font-medium rounded bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 disabled:opacity-50 transition-colors"
                      >
                        {deleting === doc.id ? "..." : "Sterge"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
