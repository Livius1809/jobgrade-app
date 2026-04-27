"use client"

import { useState, useEffect, useRef } from "react"

interface DocType {
  id: string
  label: string
  description: string
  card: string
  required: boolean
  uploaded: boolean
  document: { fileName: string; fileSize: number; uploadedAt: string } | null
}

export default function DocumentsPage() {
  const [types, setTypes] = useState<DocType[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<string | null>(null)
  const [activeCard, setActiveCard] = useState<string>("C2")
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const res = await fetch("/api/v1/compliance/documents")
      const data = await res.json()
      setTypes(data.types || [])
      setStats(data.stats || null)
    } catch {}
    setLoading(false)
  }

  async function handleUpload(typeId: string, file: File) {
    setUploading(typeId)
    const formData = new FormData()
    formData.append("typeId", typeId)
    formData.append("file", file)
    try {
      await fetch("/api/v1/compliance/documents", { method: "POST", body: formData })
      loadData()
    } catch {}
    setUploading(null)
  }

  async function handleConfirmManual(typeId: string) {
    setUploading(typeId)
    const formData = new FormData()
    formData.append("typeId", typeId)
    try {
      await fetch("/api/v1/compliance/documents", { method: "POST", body: formData })
      loadData()
    } catch {}
    setUploading(null)
  }

  async function handleDelete(typeId: string) {
    await fetch(`/api/v1/compliance/documents?typeId=${typeId}`, { method: "DELETE" })
    loadData()
  }

  const filtered = types.filter(t => t.card === activeCard)

  function formatSize(bytes: number): string {
    if (bytes === 0) return ""
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-xl font-bold text-foreground mb-1">Documente interne</h1>
      <p className="text-sm text-text-secondary mb-6">Bifeaza documentele pe care le ai si incarca-le pentru analiza</p>

      {/* Stats */}
      {stats && (
        <div className="flex gap-3 mb-6">
          <div className="flex-1 rounded-lg px-3 py-2 text-center bg-slate-50">
            <div className="text-lg font-bold text-slate-700">{stats.uploaded}/{stats.total}</div>
            <div className="text-[10px] text-slate-500">Documente incarcate</div>
          </div>
          <div className="flex-1 rounded-lg px-3 py-2 text-center bg-violet-50">
            <div className="text-lg font-bold text-violet-700">{stats.c2Uploaded}</div>
            <div className="text-[10px] text-violet-600">C2 Conformitate</div>
          </div>
          <div className="flex-1 rounded-lg px-3 py-2 text-center bg-emerald-50">
            <div className="text-lg font-bold text-emerald-700">{stats.c3Uploaded}</div>
            <div className="text-[10px] text-emerald-600">C3 Competitivitate</div>
          </div>
        </div>
      )}

      {/* Tab-uri card */}
      <div className="flex gap-1 mb-4 border-b border-border">
        {[
          { key: "C2", label: "Conformitate" },
          { key: "C3", label: "Competitivitate" },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveCard(tab.key)}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeCard === tab.key
                ? "border-indigo text-indigo"
                : "border-transparent text-text-secondary hover:text-foreground"
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-text-secondary">Se incarca...</p>}

      {!loading && (
        <div className="space-y-3">
          {filtered.map(dt => (
            <div key={dt.id} className={`rounded-xl border p-4 ${
              dt.uploaded ? "border-emerald-200 bg-emerald-50/30" : dt.required ? "border-amber-200 bg-amber-50/20" : "border-slate-200 bg-white"
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold ${
                    dt.uploaded ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-400"
                  }`}>
                    {dt.uploaded ? "\u2713" : ""}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">{dt.label}</h3>
                      {dt.required && !dt.uploaded && (
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-600">OBLIGATORIU</span>
                      )}
                    </div>
                    <p className="text-xs text-text-secondary mt-0.5">{dt.description}</p>

                    {/* Info fisier uploadat */}
                    {dt.document && (
                      <div className="mt-2 flex items-center gap-2 text-[10px] text-emerald-600">
                        <span>{dt.document.fileName}</span>
                        {dt.document.fileSize > 0 && <span>({formatSize(dt.document.fileSize)})</span>}
                        <span>· {new Date(dt.document.uploadedAt).toLocaleDateString("ro-RO", { day: "2-digit", month: "short" })}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actiuni */}
                <div className="flex gap-1 shrink-0 ml-3">
                  {!dt.uploaded ? (
                    <>
                      <button onClick={() => fileRefs.current[dt.id]?.click()}
                        disabled={uploading === dt.id}
                        className="text-[10px] px-2.5 py-1.5 rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors disabled:opacity-40">
                        {uploading === dt.id ? "..." : "Incarca"}
                      </button>
                      <button onClick={() => handleConfirmManual(dt.id)}
                        className="text-[10px] px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">
                        Am, dar nu il incarc
                      </button>
                      <input ref={el => { fileRefs.current[dt.id] = el }} type="file"
                        accept=".pdf,.docx,.doc,.xlsx,.xls"
                        className="hidden"
                        onChange={e => { if (e.target.files?.[0]) handleUpload(dt.id, e.target.files[0]) }} />
                    </>
                  ) : (
                    <>
                      <button onClick={() => fileRefs.current[dt.id]?.click()}
                        className="text-[10px] px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">
                        Reincarc
                      </button>
                      <button onClick={() => handleDelete(dt.id)}
                        className="text-[10px] px-2.5 py-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors">
                        Sterge
                      </button>
                      <input ref={el => { fileRefs.current[dt.id] = el }} type="file"
                        accept=".pdf,.docx,.doc,.xlsx,.xls"
                        className="hidden"
                        onChange={e => { if (e.target.files?.[0]) handleUpload(dt.id, e.target.files[0]) }} />
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
