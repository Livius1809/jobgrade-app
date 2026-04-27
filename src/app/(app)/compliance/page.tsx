"use client"

import { useState, useEffect } from "react"

interface Obligation {
  id: string
  title: string
  description: string
  legalBasis: string
  category: string
  dueDate: string
  recurrence: string | null
  responsibleRole: string
  status: string
  completedAt: string | null
  notes: string | null
}

interface Stats {
  total: number
  pending: number
  inProgress: number
  completed: number
  overdue: number
}

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  OVERDUE: { label: "Depasit", color: "text-red-700", bg: "bg-red-50 border-red-200" },
  PENDING: { label: "In asteptare", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  IN_PROGRESS: { label: "In lucru", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  COMPLETED: { label: "Indeplinit", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
}

const CATEGORY_LABELS: Record<string, string> = {
  PAY_TRANSPARENCY: "Transparenta salariala",
  GDPR: "GDPR",
  LABOR_LAW: "Legislatia muncii",
  AI_ACT: "AI Act",
  FISCAL: "Fiscal",
  OTHER: "Altele",
}

const RECURRENCE_LABELS: Record<string, string> = {
  ONCE: "O singura data",
  ANNUAL: "Anual",
  SEMI_ANNUAL: "Semestrial",
  QUARTERLY: "Trimestrial",
  MONTHLY: "Lunar",
}

export default function CompliancePage() {
  const [obligations, setObligations] = useState<Obligation[]>([])
  const [alerts, setAlerts] = useState<Obligation[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>("ALL")
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [newBasis, setNewBasis] = useState("")
  const [newCategory, setNewCategory] = useState("OTHER")
  const [newDate, setNewDate] = useState("")
  const [newRecurrence, setNewRecurrence] = useState("")
  const [newResponsible, setNewResponsible] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const res = await fetch("/api/v1/compliance")
      const data = await res.json()
      setObligations(data.obligations || [])
      setAlerts(data.alerts || [])
      setStats(data.stats || null)
    } catch {}
    setLoading(false)
  }

  async function updateStatus(id: string, status: string) {
    await fetch("/api/v1/compliance", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    })
    loadData()
  }

  async function addObligation() {
    if (!newTitle || !newDate) return
    setSubmitting(true)
    await fetch("/api/v1/compliance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTitle, description: newDesc, legalBasis: newBasis,
        category: newCategory, dueDate: newDate, recurrence: newRecurrence || null,
        responsibleRole: newResponsible,
      }),
    })
    setNewTitle(""); setNewDesc(""); setNewBasis(""); setNewDate("")
    setNewRecurrence(""); setNewResponsible(""); setNewCategory("OTHER")
    setShowAdd(false)
    setSubmitting(false)
    loadData()
  }

  const filtered = obligations.filter(o => filter === "ALL" || o.status === filter)

  function daysUntil(date: string): number {
    return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Calendar conformitate</h1>
          <p className="text-sm text-text-secondary mt-1">Obligatii legale, termene si alerte automate</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)}
          className="text-sm font-medium bg-coral text-white px-4 py-2 rounded-lg hover:bg-coral-dark transition-colors">
          {showAdd ? "Anuleaza" : "Adauga obligatie"}
        </button>
      </div>

      {/* Alerte */}
      {alerts.length > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200">
          <p className="text-xs font-bold text-red-700 uppercase tracking-wide mb-2">
            Atentie — {alerts.length} obligatii necesita actiune
          </p>
          {alerts.slice(0, 5).map(a => {
            const days = daysUntil(a.dueDate)
            return (
              <div key={a.id} className="flex items-center justify-between py-1.5 border-t border-red-100 first:border-t-0">
                <span className="text-xs text-red-800">{a.title}</span>
                <span className={`text-[10px] font-bold ${days < 0 ? "text-red-600" : days <= 7 ? "text-amber-600" : "text-slate-500"}`}>
                  {days < 0 ? `Depasit cu ${Math.abs(days)} zile` : days === 0 ? "Azi" : `${days} zile ramase`}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total", value: stats.total, color: "text-slate-700 bg-slate-50" },
            { label: "In asteptare", value: stats.pending, color: "text-amber-700 bg-amber-50" },
            { label: "Indeplinite", value: stats.completed, color: "text-emerald-700 bg-emerald-50" },
            { label: "Depasite", value: stats.overdue, color: "text-red-700 bg-red-50" },
          ].map(s => (
            <div key={s.label} className={`rounded-lg px-3 py-2 text-center ${s.color}`}>
              <div className="text-lg font-bold">{s.value}</div>
              <div className="text-[10px]">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Formular adaugare */}
      {showAdd && (
        <div className="mb-6 rounded-xl border border-border bg-surface p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Titlu *</label>
              <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)}
                placeholder="Denumire obligatie"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Termen *</label>
              <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Descriere</label>
            <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={2}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm resize-y" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Baza legala</label>
              <input type="text" value={newBasis} onChange={e => setNewBasis(e.target.value)}
                placeholder="ex: GDPR Art.30"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Categorie</label>
              <select value={newCategory} onChange={e => setNewCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm">
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Recurenta</label>
              <select value={newRecurrence} onChange={e => setNewRecurrence(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm">
                <option value="">Fara</option>
                {Object.entries(RECURRENCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Responsabil</label>
            <input type="text" value={newResponsible} onChange={e => setNewResponsible(e.target.value)}
              placeholder="ex: HR Director"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" />
          </div>
          <button onClick={addObligation} disabled={submitting || !newTitle || !newDate}
            className="bg-indigo text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-dark disabled:opacity-50 transition-colors">
            {submitting ? "Se salveaza..." : "Adauga"}
          </button>
        </div>
      )}

      {/* Filtre */}
      <div className="flex gap-1 mb-4 border-b border-border">
        {[
          { key: "ALL", label: "Toate" },
          { key: "OVERDUE", label: "Depasite" },
          { key: "PENDING", label: "In asteptare" },
          { key: "IN_PROGRESS", label: "In lucru" },
          { key: "COMPLETED", label: "Indeplinite" },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              filter === f.key ? "border-indigo text-indigo" : "border-transparent text-text-secondary hover:text-foreground"
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista obligatii */}
      {loading ? (
        <p className="text-sm text-text-secondary">Se incarca...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-text-secondary">Nicio obligatie {filter !== "ALL" ? "cu acest status" : ""}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(o => {
            const st = STATUS_STYLES[o.status] || STATUS_STYLES.PENDING
            const days = daysUntil(o.dueDate)
            const isUrgent = o.status !== "COMPLETED" && days <= 30

            return (
              <div key={o.id} className={`rounded-xl border p-4 ${st.bg}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${st.color} bg-white/60`}>
                        {st.label}
                      </span>
                      <span className="text-[9px] text-slate-400">{CATEGORY_LABELS[o.category] || o.category}</span>
                      {o.recurrence && (
                        <span className="text-[9px] text-slate-400">{RECURRENCE_LABELS[o.recurrence] || o.recurrence}</span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">{o.title}</h3>
                    {o.description && <p className="text-xs text-text-secondary mt-1 line-clamp-2">{o.description}</p>}
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <div className={`text-xs font-bold ${isUrgent ? "text-red-600" : "text-slate-500"}`}>
                      {new Date(o.dueDate).toLocaleDateString("ro-RO", { day: "2-digit", month: "short", year: "numeric" })}
                    </div>
                    {o.status !== "COMPLETED" && (
                      <div className={`text-[10px] ${days < 0 ? "text-red-500" : days <= 7 ? "text-amber-500" : "text-slate-400"}`}>
                        {days < 0 ? `Depasit cu ${Math.abs(days)}z` : days === 0 ? "Expira azi" : `${days}z ramase`}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-black/5">
                  <div className="text-[10px] text-slate-500">
                    {o.legalBasis && <span>{o.legalBasis}</span>}
                    {o.responsibleRole && <span className="ml-2">· {o.responsibleRole}</span>}
                  </div>
                  {o.status !== "COMPLETED" && (
                    <div className="flex gap-1">
                      {o.status === "PENDING" && (
                        <button onClick={() => updateStatus(o.id, "IN_PROGRESS")}
                          className="text-[10px] px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors">
                          Incep
                        </button>
                      )}
                      <button onClick={() => updateStatus(o.id, "COMPLETED")}
                        className="text-[10px] px-2 py-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors">
                        Indeplinit
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
