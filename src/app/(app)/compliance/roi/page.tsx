"use client"

import { useState, useEffect, useRef } from "react"

interface ChecklistItem {
  id: string
  article: string
  requirement: string
  category: string
  found: boolean
  aiComment: string | null
  manualCheck: boolean | null
}

export default function ROIPage() {
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [analyzed, setAnalyzed] = useState(false)
  const [criticalIssue, setCriticalIssue] = useState<string | null>(null)
  const [overallScore, setOverallScore] = useState<number>(0)
  const [fileName, setFileName] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadAnalysis() }, [])

  async function loadAnalysis() {
    setLoading(true)
    try {
      const res = await fetch("/api/v1/compliance/roi")
      const data = await res.json()
      setChecklist(data.checklist || [])
      setAnalyzed(data.analyzed || false)
      setCriticalIssue(data.criticalIssue || null)
      setOverallScore(data.overallScore || 0)
      setFileName(data.fileName || null)
    } catch {}
    setLoading(false)
  }

  async function handleUpload(file: File) {
    setUploading(true)
    const formData = new FormData()
    formData.append("file", file)
    try {
      const res = await fetch("/api/v1/compliance/roi", { method: "POST", body: formData })
      const data = await res.json()
      setChecklist(data.checklist || [])
      setAnalyzed(data.analyzed || false)
      setCriticalIssue(data.criticalIssue || null)
      setOverallScore(data.overallScore || 0)
      setFileName(data.fileName || file.name)
    } catch {}
    setUploading(false)
  }

  async function handleManualOnly() {
    setUploading(true)
    try {
      const res = await fetch("/api/v1/compliance/roi", { method: "POST", body: new FormData() })
      const data = await res.json()
      setChecklist(data.checklist || [])
      setAnalyzed(false)
    } catch {}
    setUploading(false)
  }

  const foundCount = checklist.filter(c => c.found).length
  const criticalItems = checklist.filter(c => c.category === "CRITIC")
  const obligatoriiItems = checklist.filter(c => c.category === "OBLIGATORIU")
  const recomandatItems = checklist.filter(c => c.category === "RECOMANDAT")

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-xl font-bold text-foreground mb-1">Verificare ROI</h1>
      <p className="text-sm text-text-secondary mb-6">Regulament de Ordine Interioara — conformitate cu Codul Muncii Art.241-246 + Directiva EU 2023/970</p>

      {/* Upload sau completare manuala */}
      {!analyzed && checklist.length === 0 && !loading && (
        <div className="mb-8 rounded-xl border border-indigo-200 bg-indigo-50 p-6">
          <p className="text-sm text-indigo-800 font-medium mb-3">Cum doresti sa verifici ROI-ul?</p>
          <div className="flex gap-3">
            <button onClick={() => fileRef.current?.click()}
              className="flex-1 py-3 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors">
              Incarca ROI-ul (PDF/DOCX) — analiza AI
            </button>
            <button onClick={handleManualOnly}
              className="px-4 py-3 rounded-lg border border-indigo-300 text-indigo-700 text-sm font-medium hover:bg-indigo-100 transition-colors">
              Completez manual
            </button>
          </div>
          <input ref={fileRef} type="file" accept=".pdf,.docx,.doc" className="hidden"
            onChange={e => { if (e.target.files?.[0]) handleUpload(e.target.files[0]) }} />
        </div>
      )}

      {uploading && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <p className="text-sm text-amber-700 animate-pulse">Se analizeaza documentul...</p>
        </div>
      )}

      {loading && <p className="text-sm text-text-secondary">Se incarca...</p>}

      {/* Rezultat analiza */}
      {!loading && checklist.length > 0 && (
        <>
          {/* Scor + status */}
          <div className="mb-6 flex gap-3">
            {analyzed && (
              <div className={`flex-1 rounded-xl p-4 border ${
                overallScore >= 80 ? "bg-emerald-50 border-emerald-200" :
                overallScore >= 50 ? "bg-amber-50 border-amber-200" :
                "bg-red-50 border-red-200"
              }`}>
                <div className="text-2xl font-bold">{overallScore}%</div>
                <div className="text-xs text-slate-500">Scor conformitate</div>
              </div>
            )}
            <div className="flex-1 rounded-xl p-4 border bg-slate-50 border-slate-200">
              <div className="text-2xl font-bold">{foundCount}/{checklist.length}</div>
              <div className="text-xs text-slate-500">Elemente gasite</div>
            </div>
            {fileName && (
              <div className="flex-1 rounded-xl p-4 border bg-slate-50 border-slate-200">
                <div className="text-sm font-medium text-slate-700 truncate">{fileName}</div>
                <div className="text-xs text-slate-500">Document analizat</div>
                <button onClick={() => fileRef.current?.click()}
                  className="text-[10px] text-indigo-600 hover:underline mt-1">Re-analizeaza</button>
                <input ref={fileRef} type="file" accept=".pdf,.docx,.doc" className="hidden"
                  onChange={e => { if (e.target.files?.[0]) handleUpload(e.target.files[0]) }} />
              </div>
            )}
          </div>

          {/* Alerta critica */}
          {criticalIssue && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-300">
              <p className="text-xs font-bold text-red-700 uppercase tracking-wide mb-1">Problema critica</p>
              <p className="text-sm text-red-800">{criticalIssue}</p>
            </div>
          )}

          {/* Checklist per categorie */}
          {[
            { label: "CRITIC — de rezolvat imediat", items: criticalItems, color: "border-red-200" },
            { label: "OBLIGATORIU — Codul Muncii", items: obligatoriiItems, color: "border-amber-200" },
            { label: "RECOMANDAT — bune practici", items: recomandatItems, color: "border-slate-200" },
          ].map(section => (
            <div key={section.label} className="mb-5">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">{section.label}</h2>
              <div className="space-y-2">
                {section.items.map(item => (
                  <div key={item.id} className={`rounded-lg border p-3 ${section.color} ${
                    item.found ? "bg-emerald-50/50" : "bg-white"
                  }`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold ${
                        item.found ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-400"
                      }`}>
                        {item.found ? "\u2713" : ""}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-slate-400 font-mono">{item.article}</span>
                        </div>
                        <p className="text-sm text-foreground">{item.requirement}</p>
                        {item.aiComment && (
                          <p className={`text-xs mt-1 ${item.found ? "text-emerald-600" : "text-red-600"}`}>
                            {item.aiComment}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Toggle TRANSFORMATIONAL hint */}
          <div className="mt-6 p-3 rounded-lg bg-amber-50 border border-amber-100">
            <p className="text-[10px] text-amber-700">
              <strong>Perspectiva transformationala:</strong> Un ROI nu e doar un document de conformitate — e o declaratie despre cum trateaza organizatia oamenii. Fiecare articol absent spune ceva despre cultura reala.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
