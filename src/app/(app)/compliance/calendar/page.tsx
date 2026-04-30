"use client"

import { useState, useEffect, useCallback } from "react"

// ─── Tipuri ───

type EventCategory = "EU_DIRECTIVE" | "GDPR" | "AI_ACT" | "LABOR_LAW"
type EventStatus = "COMPLETED" | "UPCOMING" | "OVERDUE" | "NOT_APPLICABLE"
type EventUrgency = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"

interface CalendarEvent {
  id: string
  title: string
  description: string
  category: EventCategory
  dueDate: string | null
  status: EventStatus
  urgency: EventUrgency
  completedAt?: string
  actionUrl?: string
}

// ─── Constante UI ───

const CATEGORY_LABELS: Record<EventCategory, string> = {
  EU_DIRECTIVE: "EU Directiva 2023/970",
  GDPR: "GDPR",
  AI_ACT: "AI Act",
  LABOR_LAW: "Legislatia muncii",
}

const CATEGORY_ORDER: EventCategory[] = ["EU_DIRECTIVE", "GDPR", "AI_ACT", "LABOR_LAW"]

const STATUS_CONFIG: Record<EventStatus, { label: string; dotClass: string; badgeClass: string }> = {
  COMPLETED: {
    label: "Indeplinit",
    dotClass: "bg-emerald-500",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  UPCOMING: {
    label: "In asteptare",
    dotClass: "bg-amber-500",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
  },
  OVERDUE: {
    label: "Depasit",
    dotClass: "bg-red-500",
    badgeClass: "bg-red-50 text-red-700 border-red-200",
  },
  NOT_APPLICABLE: {
    label: "Nu se aplica",
    dotClass: "bg-slate-300",
    badgeClass: "bg-slate-50 text-slate-500 border-slate-200",
  },
}

const URGENCY_CONFIG: Record<EventUrgency, { label: string; class: string }> = {
  CRITICAL: { label: "Critic", class: "text-red-600 font-bold" },
  HIGH: { label: "Ridicat", class: "text-orange-600 font-semibold" },
  MEDIUM: { label: "Mediu", class: "text-amber-600" },
  LOW: { label: "Scazut", class: "text-slate-400" },
}

// ─── Componente auxiliare ───

function StatusBadge({ status }: { status: EventStatus }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full border ${cfg.badgeClass}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotClass}`} />
      {cfg.label}
    </span>
  )
}

function DueDateDisplay({ dueDate, status }: { dueDate: string | null; status: EventStatus }) {
  if (!dueDate) return <span className="text-xs text-slate-400">Fara termen fix</span>

  const days = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  const formatted = new Date(dueDate).toLocaleDateString("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })

  if (status === "COMPLETED" || status === "NOT_APPLICABLE") {
    return <span className="text-xs text-slate-400">{formatted}</span>
  }

  // Codare culoare pe zile ramase
  const colorClass = days < 0
    ? "text-red-600 font-bold"
    : days <= 30
      ? "text-amber-600 font-semibold"
      : "text-slate-500"

  const relativeText = days < 0
    ? `Depasit cu ${Math.abs(days)}z`
    : days === 0
      ? "Expira azi"
      : `${days}z ramase`

  return (
    <div className="text-right">
      <div className={`text-xs ${colorClass}`}>{formatted}</div>
      <div className={`text-[10px] ${colorClass}`}>{relativeText}</div>
    </div>
  )
}

// ─── Card eveniment ───

function EventCard({
  event,
  onComplete,
  completing,
}: {
  event: CalendarEvent
  onComplete: (id: string) => void
  completing: string | null
}) {
  // Culoare fundal card pe baza statusului
  const bgClass =
    event.status === "OVERDUE"
      ? "bg-red-50/50 border-red-200"
      : event.status === "COMPLETED"
        ? "bg-emerald-50/30 border-emerald-200"
        : event.status === "NOT_APPLICABLE"
          ? "bg-slate-50/50 border-slate-200"
          : event.urgency === "HIGH" || event.urgency === "CRITICAL"
            ? "bg-amber-50/30 border-amber-200"
            : "bg-surface border-border"

  return (
    <div className={`rounded-xl border p-4 transition-colors ${bgClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Header: status + urgenta */}
          <div className="flex items-center gap-2 mb-1.5">
            <StatusBadge status={event.status} />
            {event.status !== "COMPLETED" && event.status !== "NOT_APPLICABLE" && (
              <span className={`text-[10px] ${URGENCY_CONFIG[event.urgency].class}`}>
                {URGENCY_CONFIG[event.urgency].label}
              </span>
            )}
          </div>

          {/* Titlu */}
          <h3 className="text-sm font-semibold text-foreground leading-tight">{event.title}</h3>

          {/* Descriere */}
          <p className="text-xs text-text-secondary mt-1 line-clamp-2">{event.description}</p>

          {/* Completat la */}
          {event.completedAt && (
            <p className="text-[10px] text-emerald-600 mt-1">
              Indeplinit: {new Date(event.completedAt).toLocaleDateString("ro-RO", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </p>
          )}
        </div>

        {/* Data scadenta */}
        <div className="shrink-0">
          <DueDateDisplay dueDate={event.dueDate} status={event.status} />
        </div>
      </div>

      {/* Footer: actiuni */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-black/5">
        <div className="flex items-center gap-2">
          {event.actionUrl && (
            <a
              href={event.actionUrl}
              className="text-[10px] px-2.5 py-1 rounded-lg bg-indigo/10 text-indigo hover:bg-indigo/20 transition-colors font-medium"
            >
              Deschide
            </a>
          )}
        </div>

        {event.status !== "COMPLETED" && event.status !== "NOT_APPLICABLE" && (
          <button
            onClick={() => onComplete(event.id)}
            disabled={completing === event.id}
            className="text-[10px] px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-50 transition-colors font-medium"
          >
            {completing === event.id ? "Se salveaza..." : "Marcheaza indeplinit"}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Pagina principala ───

export default function ComplianceCalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [completing, setCompleting] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<EventStatus | "ALL">("ALL")

  const loadEvents = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/v1/compliance/calendar")
      if (!res.ok) throw new Error("Eroare la incarcarea calendarului")
      const data = await res.json()
      setEvents(data.events || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare necunoscuta")
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadEvents() }, [loadEvents])

  async function handleComplete(eventId: string) {
    setCompleting(eventId)
    try {
      const res = await fetch("/api/v1/compliance/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      })
      if (!res.ok) throw new Error("Eroare la salvare")
      await loadEvents()
    } catch {
      // Reincarcam oricum pentru consistenta
      await loadEvents()
    }
    setCompleting(null)
  }

  // Filtrare
  const filtered = filterStatus === "ALL"
    ? events
    : events.filter(e => e.status === filterStatus)

  // Grupare pe categorii
  const grouped = CATEGORY_ORDER.reduce<Record<EventCategory, CalendarEvent[]>>((acc, cat) => {
    acc[cat] = filtered.filter(e => e.category === cat)
    return acc
  }, {} as Record<EventCategory, CalendarEvent[]>)

  // Statistici rapide
  const stats = {
    total: events.length,
    overdue: events.filter(e => e.status === "OVERDUE").length,
    upcoming: events.filter(e => e.status === "UPCOMING").length,
    completed: events.filter(e => e.status === "COMPLETED").length,
    notApplicable: events.filter(e => e.status === "NOT_APPLICABLE").length,
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Calendar conformitate</h1>
        <p className="text-sm text-text-secondary mt-1">
          Obligatii legale, termene si alerte automate — EU Directiva 2023/970, GDPR, AI Act, legislatie RO
        </p>
      </div>

      {/* Statistici */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {[
            { label: "Total", value: stats.total, color: "text-slate-700 bg-slate-50 border-slate-200" },
            { label: "Depasite", value: stats.overdue, color: "text-red-700 bg-red-50 border-red-200" },
            { label: "In asteptare", value: stats.upcoming, color: "text-amber-700 bg-amber-50 border-amber-200" },
            { label: "Indeplinite", value: stats.completed, color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
            { label: "Nu se aplica", value: stats.notApplicable, color: "text-slate-500 bg-slate-50 border-slate-200" },
          ].map(s => (
            <div key={s.label} className={`rounded-lg border px-3 py-2 text-center ${s.color}`}>
              <div className="text-lg font-bold">{s.value}</div>
              <div className="text-[10px]">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Alerta: obligatii OVERDUE */}
      {stats.overdue > 0 && !loading && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200">
          <p className="text-xs font-bold text-red-700 uppercase tracking-wide">
            Atentie — {stats.overdue} {stats.overdue === 1 ? "obligatie depasita" : "obligatii depasite"}
          </p>
          <p className="text-xs text-red-600 mt-1">
            Verificati termenele si luati masuri imediate.
          </p>
        </div>
      )}

      {/* Filtre status */}
      <div className="flex gap-1 mb-6 border-b border-border overflow-x-auto">
        {[
          { key: "ALL" as const, label: "Toate" },
          { key: "OVERDUE" as const, label: "Depasite" },
          { key: "UPCOMING" as const, label: "In asteptare" },
          { key: "COMPLETED" as const, label: "Indeplinite" },
          { key: "NOT_APPLICABLE" as const, label: "Nu se aplica" },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilterStatus(f.key)}
            className={`px-3 py-2 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
              filterStatus === f.key
                ? "border-indigo text-indigo"
                : "border-transparent text-text-secondary hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Continut principal */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-6 h-6 border-2 border-indigo/30 border-t-indigo rounded-full animate-spin" />
          <p className="text-sm text-text-secondary mt-3">Se incarca calendarul...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={loadEvents}
            className="mt-3 text-sm text-indigo hover:underline"
          >
            Reincearca
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-text-secondary">
            {filterStatus !== "ALL"
              ? "Nicio obligatie cu acest status"
              : "Nicio obligatie in calendar"}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {CATEGORY_ORDER.map(category => {
            const categoryEvents = grouped[category]
            if (categoryEvents.length === 0) return null

            return (
              <section key={category}>
                <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    category === "EU_DIRECTIVE" ? "bg-blue-500"
                    : category === "GDPR" ? "bg-purple-500"
                    : category === "AI_ACT" ? "bg-cyan-500"
                    : "bg-orange-500"
                  }`} />
                  {CATEGORY_LABELS[category]}
                  <span className="text-[10px] font-normal text-text-secondary">
                    ({categoryEvents.length})
                  </span>
                </h2>

                <div className="space-y-3">
                  {categoryEvents.map(event => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onComplete={handleComplete}
                      completing={completing}
                    />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
