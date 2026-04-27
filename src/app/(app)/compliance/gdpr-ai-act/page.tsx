"use client"

import { useState, useEffect } from "react"

interface AuditItem {
  id: string
  section: string
  article: string
  requirement: string
  description: string
  status: string
  notes: string | null
}

const STATUS_OPTIONS = [
  { value: "NOT_CHECKED", label: "Neverificat", color: "bg-slate-100 text-slate-500" },
  { value: "COMPLIANT", label: "Conform", color: "bg-emerald-100 text-emerald-700" },
  { value: "NON_COMPLIANT", label: "Neconform", color: "bg-red-100 text-red-700" },
  { value: "IN_PROGRESS", label: "In lucru", color: "bg-blue-100 text-blue-700" },
  { value: "NOT_APPLICABLE", label: "Nu se aplica", color: "bg-slate-50 text-slate-400" },
]

export default function GdprAiActPage() {
  const [checklist, setChecklist] = useState<AuditItem[]>([])
  const [orgType, setOrgType] = useState("UMAN")
  const [aiActEnabled, setAiActEnabled] = useState(false)
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const res = await fetch("/api/v1/compliance/gdpr-ai-act")
      const data = await res.json()
      setChecklist(data.checklist || [])
      setOrgType(data.orgStructureType || "UMAN")
      setAiActEnabled(data.aiActEnabled || false)
      setStats(data.stats || null)
    } catch {}
    setLoading(false)
  }

  async function updateItem(id: string, status: string, notes?: string) {
    await fetch("/api/v1/compliance/gdpr-ai-act", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status, ...(notes !== undefined ? { notes } : {}) }),
    })
    loadData()
  }

  const gdprItems = checklist.filter(i => i.section === "GDPR")
  const aiActItems = checklist.filter(i => i.section === "AI_ACT")

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-xl font-bold text-foreground mb-1">Audit GDPR si AI Act</h1>
      <p className="text-sm text-text-secondary mb-2">Conformitate protectia datelor + inteligenta artificiala in HR</p>

      {/* Indicator tip organizatie */}
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6 ${
        orgType === "UMAN" ? "bg-sky-50 text-sky-700" :
        orgType === "MIXT" ? "bg-emerald-50 text-emerald-700" :
        "bg-purple-50 text-purple-700"
      }`}>
        Structura organizatie: {orgType}
        {!aiActEnabled && <span className="text-slate-400 ml-1">(sectiunea AI Act dezactivata)</span>}
      </div>

      {loading && <p className="text-sm text-text-secondary">Se incarca...</p>}

      {!loading && stats && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            <div className="rounded-lg px-3 py-2 text-center bg-slate-50">
              <div className="text-lg font-bold text-slate-700">{stats.score}%</div>
              <div className="text-[10px] text-slate-500">Scor</div>
            </div>
            <div className="rounded-lg px-3 py-2 text-center bg-emerald-50">
              <div className="text-lg font-bold text-emerald-700">{stats.compliant}</div>
              <div className="text-[10px] text-emerald-600">Conforme</div>
            </div>
            <div className="rounded-lg px-3 py-2 text-center bg-red-50">
              <div className="text-lg font-bold text-red-700">{stats.nonCompliant}</div>
              <div className="text-[10px] text-red-600">Neconforme</div>
            </div>
            <div className="rounded-lg px-3 py-2 text-center bg-amber-50">
              <div className="text-lg font-bold text-amber-700">{stats.notChecked}</div>
              <div className="text-[10px] text-amber-600">Neverificate</div>
            </div>
          </div>

          {/* GDPR Section */}
          <div className="mb-6">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              GDPR — Protectia datelor personale ({gdprItems.length} cerinte)
            </h2>
            <div className="space-y-2">
              {gdprItems.map(item => (
                <AuditCard key={item.id} item={item} expanded={expandedId === item.id}
                  onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  onUpdate={updateItem} />
              ))}
            </div>
          </div>

          {/* AI Act Section */}
          {aiActEnabled && aiActItems.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                AI Act — Inteligenta artificiala in HR ({aiActItems.length} cerinte)
              </h2>
              <div className="space-y-2">
                {aiActItems.map(item => (
                  <AuditCard key={item.id} item={item} expanded={expandedId === item.id}
                    onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    onUpdate={updateItem} />
                ))}
              </div>
            </div>
          )}

          {!aiActEnabled && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-xs text-slate-500">
                Sectiunea AI Act este dezactivata deoarece organizatia este marcata ca <strong>exclusiv umana</strong>.
                Daca folositi sisteme AI in HR (recrutare, evaluare, promovare), actualizati tipul organizatiei din profilul companiei.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function AuditCard({ item, expanded, onToggle, onUpdate }: {
  item: AuditItem; expanded: boolean;
  onToggle: () => void;
  onUpdate: (id: string, status: string, notes?: string) => void;
}) {
  const [notes, setNotes] = useState(item.notes || "")
  const statusOpt = STATUS_OPTIONS.find(s => s.value === item.status) || STATUS_OPTIONS[0]

  return (
    <div className={`rounded-xl border p-4 transition-all ${
      item.status === "COMPLIANT" ? "border-emerald-200 bg-emerald-50/50" :
      item.status === "NON_COMPLIANT" ? "border-red-200 bg-red-50/50" :
      "border-slate-200 bg-white"
    }`}>
      <div className="flex items-start justify-between cursor-pointer" onClick={onToggle}>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[9px] font-mono text-slate-400">{item.article}</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${statusOpt.color}`}>{statusOpt.label}</span>
          </div>
          <p className="text-sm font-medium text-foreground">{item.requirement}</p>
        </div>
        <span className="text-slate-400 text-xs ml-2">{expanded ? "\u25B2" : "\u25BC"}</span>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-black/5 space-y-3">
          <p className="text-xs text-text-secondary">{item.description}</p>

          <div className="flex gap-1 flex-wrap">
            {STATUS_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => onUpdate(item.id, opt.value)}
                className={`text-[10px] px-2.5 py-1 rounded-full border transition-colors ${
                  item.status === opt.value
                    ? `${opt.color} border-current font-bold`
                    : "border-slate-200 text-slate-400 hover:border-slate-300"
                }`}>
                {opt.label}
              </button>
            ))}
          </div>

          <div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Note (optional)"
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs resize-y" />
            {notes !== (item.notes || "") && (
              <button onClick={() => onUpdate(item.id, item.status, notes)}
                className="mt-1 text-[10px] px-2 py-1 rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors">
                Salveaza nota
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
