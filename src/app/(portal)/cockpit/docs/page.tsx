"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

interface DocEntry {
  title: string
  agents: string[]
  agentCount: number
  chunks: number
  createdAt: string
  tags: string[]
}

export default function DocsPage() {
  const [documents, setDocuments] = useState<DocEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [tags, setTags] = useState("")
  const [targetAgents, setTargetAgents] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => { loadDocs() }, [])

  async function loadDocs() {
    setLoading(true)
    try {
      const res = await fetch("/api/v1/docs")
      const data = await res.json()
      setDocuments(data.documents || [])
    } catch { setDocuments([]) }
    setLoading(false)
  }

  async function submitDoc() {
    if (!title.trim() || !content.trim()) {
      setMessage("❌ Titlu și conținut sunt obligatorii")
      return
    }
    setSubmitting(true)
    setMessage("Se procesează...")

    try {
      const body: any = { title: title.trim(), content: content.trim() }
      if (tags.trim()) body.tags = tags.split(",").map((t: string) => t.trim()).filter(Boolean)
      if (targetAgents.trim()) body.targetAgents = targetAgents.split(",").map((t: string) => t.trim()).filter(Boolean)

      const res = await fetch("/api/v1/docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (data.success) {
        let msg = `✅ "${data.title}" — ${data.totalEntries} entries create pe ${data.agents} agenți`
        if (data.ownerCalibration?.flags?.length > 0) {
          msg += `\n\n⚠ Calibrare L1-L3: ${data.ownerCalibration.flags.map((f: any) => `[${f.layer}] ${f.message}`).join(" | ")}`
        }
        setMessage(msg)
        setTitle("")
        setContent("")
        setTags("")
        setTargetAgents("")
        setShowForm(false)
        loadDocs()
      } else {
        let errorMsg = `❌ ${data.error}`
        if (data.ownerCalibration?.flags?.length > 0) {
          errorMsg += `\n\n${data.ownerCalibration.flags.map((f: any) => `[${f.layer}/${f.severity}] ${f.message}`).join("\n")}`
        }
        setMessage(errorMsg)
      }
    } catch (e: any) {
      setMessage(`❌ ${e.message}`)
    }
    setSubmitting(false)
  }

  async function deleteDoc(docTitle: string) {
    if (!confirm(`Ștergi "${docTitle}" din biblioteca echipei?`)) return

    try {
      const res = await fetch("/api/v1/docs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: docTitle }),
      })
      const data = await res.json()
      setMessage(`Șters: ${data.deleted} entries`)
      loadDocs()
    } catch (e: any) {
      setMessage(`❌ ${e.message}`)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Biblioteca echipei</h1>
          <p className="text-sm text-text-secondary mt-1">
            Documente partajate cu agenții. Fiecare document devine cunoaștere accesibilă automat.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-sm font-medium bg-coral text-white px-4 py-2 rounded-lg hover:bg-coral-dark transition-colors"
        >
          {showForm ? "Anulează" : "+ Document nou"}
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className="mb-4 p-3 rounded-lg bg-indigo/5 border border-indigo/10 text-sm text-foreground">
          {message}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="mb-8 rounded-xl border border-border bg-surface p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Titlu document</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Procedura de evaluare posturi"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Conținut</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Lipește conținutul documentului aici..."
              rows={10}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo/20 resize-y"
            />
            <p className="text-xs text-text-secondary/50 mt-1">
              Conținutul va fi împărțit automat în secțiuni de max 2000 caractere per agent.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Tags (opțional)</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="evaluare, procedura, HR"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo/20"
              />
              <p className="text-xs text-text-secondary/50 mt-1">Separate prin virgulă</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Agenți destinatari (opțional)</label>
              <input
                type="text"
                value={targetAgents}
                onChange={(e) => setTargetAgents(e.target.value)}
                placeholder="COG, CJA, HR_COUNSELOR"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo/20"
              />
              <p className="text-xs text-text-secondary/50 mt-1">Gol = toți agenții activi</p>
            </div>
          </div>

          <button
            onClick={submitDoc}
            disabled={submitting || !title.trim() || !content.trim()}
            className="bg-indigo text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-dark disabled:opacity-50 transition-colors"
          >
            {submitting ? "Se procesează..." : "Adaugă în bibliotecă"}
          </button>
        </div>
      )}

      {/* Document list */}
      {loading ? (
        <p className="text-sm text-text-secondary">Se încarcă...</p>
      ) : documents.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-indigo/5 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-indigo/30" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-foreground/60 mb-2">Biblioteca e goală</h3>
          <p className="text-sm text-text-secondary/50">Adaugă primul document — echipa îl va accesa automat.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <div key={doc.title} className="rounded-xl border border-border bg-surface p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-indigo/10 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-indigo" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground">{doc.title}</h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  {doc.chunks} secțiuni · {doc.agentCount} agenți · {new Date(doc.createdAt).toLocaleDateString("ro-RO")}
                </p>
                {doc.tags.length > 0 && (
                  <div className="flex gap-1 mt-1.5">
                    {doc.tags.slice(0, 4).map((tag) => (
                      <span key={tag} className="text-[10px] bg-indigo/5 text-indigo/70 px-2 py-0.5 rounded">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => deleteDoc(doc.title)}
                className="text-xs text-text-secondary/40 hover:text-coral transition-colors"
              >
                Șterge
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Back link */}
      <div className="mt-8">
        <Link href="/cockpit" className="text-sm text-indigo hover:text-indigo-dark transition-colors">
          ← Înapoi la Owner Dashboard
        </Link>
      </div>
    </div>
  )
}
