"use client"

import { useState, useEffect } from "react"

interface Ticket {
  id: string
  subject: string
  status: string
  priority: string
  affectedFlow: string | null
  resolution: string | null
  clientResponse: string | null
  respondedAt: string | null
  clientRating: number | null
  clientFeedback: string | null
  createdAt: string
}

interface SatisfactionRatings {
  rezultat: number
  timpRaspuns: number
  comunicare: number
  comentariu: string
}

type TicketType = "SUPORT" | "FEEDBACK" | "SOLICITARE"
type TabFilter = "TOATE" | "FEEDBACK" | "SOLICITARE" | "SUPORT"

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  NEW: { label: "Trimisa", color: "text-blue-600 bg-blue-50" },
  REFINING: { label: "In clarificare", color: "text-amber-600 bg-amber-50" },
  ROUTED: { label: "In lucru", color: "text-indigo-600 bg-indigo-50" },
  IN_PROGRESS: { label: "In lucru", color: "text-indigo-600 bg-indigo-50" },
  RESOLVED: { label: "Rezolvat", color: "text-emerald-600 bg-emerald-50" },
  RESPONDED: { label: "Raspuns trimis", color: "text-emerald-700 bg-emerald-50" },
  CLOSED: { label: "Inchis", color: "text-slate-500 bg-slate-50" },
  ESCALATED: { label: "Escaladat", color: "text-red-600 bg-red-50" },
}

const TYPE_CONFIG: Record<TicketType, { label: string; placeholder: string; description: string; color: string }> = {
  FEEDBACK: {
    label: "Feedback",
    placeholder: "Ce ti-a placut, ce ai imbunatati, cum a fost experienta...",
    description: "Spune-ne cum a fost experienta ta. Apreciem orice observatie.",
    color: "bg-teal-50 border-teal-200 text-teal-700",
  },
  SOLICITARE: {
    label: "Solicitare",
    placeholder: "Ce functionalitate ai nevoie, ce ai vrea sa poata face platforma...",
    description: "Ai o idee sau o nevoie? Descrie cat mai concret ce te-ar ajuta.",
    color: "bg-violet-50 border-violet-200 text-violet-700",
  },
  SUPORT: {
    label: "Suport",
    placeholder: "Ce incercai sa faci, ce s-a intamplat, ce te asteptai sa se intample...",
    description: "Nu trebuie sa stii daca e o problema tehnica. Doar descrie ce s-a intamplat.",
    color: "bg-blue-50 border-blue-200 text-blue-700",
  },
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [ticketType, setTicketType] = useState<TicketType>("SUPORT")
  const [subject, setSubject] = useState("")
  const [description, setDescription] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState("")
  const [followUp, setFollowUp] = useState<{ ticketId: string; question: string } | null>(null)
  const [followUpAnswer, setFollowUpAnswer] = useState("")
  const [activeTab, setActiveTab] = useState<TabFilter>("TOATE")
  const [ratingTicketId, setRatingTicketId] = useState<string | null>(null)
  const [ratings, setRatings] = useState<SatisfactionRatings>({ rezultat: 0, timpRaspuns: 0, comunicare: 0, comentariu: "" })

  useEffect(() => { loadTickets() }, [])

  async function loadTickets() {
    setLoading(true)
    try {
      const res = await fetch("/api/v1/support/ticket")
      const data = await res.json()
      setTickets(data.tickets || [])
    } catch {}
    setLoading(false)
  }

  async function submitTicket() {
    if (!subject.trim() || !description.trim()) return
    setSubmitting(true)
    setMessage("")
    try {
      const res = await fetch("/api/v1/support/ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          description: description.trim(),
          ticketType,
          source: "DIRECT",
        }),
      })
      const data = await res.json()

      if (data.status === "REFINING" && data.followUpQuestion) {
        setFollowUp({ ticketId: data.ticketId, question: data.followUpQuestion })
        setMessage("")
      } else {
        setMessage(data.message || "Trimis")
        setSubject("")
        setDescription("")
        setShowForm(false)
        setFollowUp(null)
        loadTickets()
      }
    } catch (e: any) { setMessage(`Eroare: ${e.message}`) }
    setSubmitting(false)
  }

  async function submitFollowUp() {
    if (!followUp || !followUpAnswer.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/v1/support/ticket", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: followUp.ticketId, additionalInfo: followUpAnswer.trim() }),
      })
      const data = await res.json()
      setMessage(data.message || "Multumesc")
      setFollowUp(null)
      setFollowUpAnswer("")
      setSubject("")
      setDescription("")
      setShowForm(false)
      loadTickets()
    } catch (e: any) { setMessage(`Eroare: ${e.message}`) }
    setSubmitting(false)
  }

  async function submitRating() {
    if (!ratingTicketId || !ratings.rezultat || !ratings.timpRaspuns || !ratings.comunicare) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/v1/support/ticket", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: ratingTicketId, ratings }),
      })
      const data = await res.json()
      setMessage(data.message || "Multumim")
      setRatingTicketId(null)
      setRatings({ rezultat: 0, timpRaspuns: 0, comunicare: 0, comentariu: "" })
      loadTickets()
    } catch (e: any) { setMessage(`Eroare: ${e.message}`) }
    setSubmitting(false)
  }

  // Filtrare tickete dupa tab
  const filteredTickets = tickets.filter(t => {
    if (activeTab === "TOATE") return true
    if (activeTab === "FEEDBACK") return t.subject.startsWith("[Feedback]") || t.affectedFlow === "feedback"
    if (activeTab === "SOLICITARE") return t.subject.startsWith("[Solicitare]") || t.affectedFlow === "solicitare"
    return !t.subject.startsWith("[Feedback]") && !t.subject.startsWith("[Solicitare]")
  })

  const feedbackCount = tickets.filter(t => t.subject.startsWith("[Feedback]") || t.affectedFlow === "feedback").length
  const solicitareCount = tickets.filter(t => t.subject.startsWith("[Solicitare]") || t.affectedFlow === "solicitare").length
  const suportCount = tickets.length - feedbackCount - solicitareCount

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Feedback si solicitari</h1>
          <p className="text-sm text-text-secondary mt-1">Feedback, cereri noi sau suport tehnic. Suntem aici.</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setFollowUp(null); setMessage("") }}
          className="text-sm font-medium bg-coral text-white px-4 py-2 rounded-lg hover:bg-coral-dark transition-colors">
          {showForm ? "Anuleaza" : "Mesaj nou"}
        </button>
      </div>

      {message && (
        <div className="mb-4 p-3 rounded-lg bg-indigo/5 border border-indigo/10 text-sm text-foreground">
          {message}
        </div>
      )}

      {/* Formular nou cu selector tip */}
      {showForm && !followUp && (
        <div className="mb-8 rounded-xl border border-border bg-surface p-6 space-y-4">
          {/* Selector tip */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Ce tip de mesaj?</label>
            <div className="flex gap-2">
              {(Object.keys(TYPE_CONFIG) as TicketType[]).map(type => (
                <button key={type} onClick={() => setTicketType(type)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    ticketType === type
                      ? TYPE_CONFIG[type].color
                      : "bg-white border-border text-text-secondary hover:bg-slate-50"
                  }`}>
                  {TYPE_CONFIG[type].label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Subiect</label>
            <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
              placeholder="Descrie pe scurt"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo/20" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Descriere</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder={TYPE_CONFIG[ticketType].placeholder}
              rows={5}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo/20 resize-y" />
            <p className="text-xs text-text-secondary/50 mt-1">{TYPE_CONFIG[ticketType].description}</p>
          </div>
          <button onClick={submitTicket} disabled={submitting || !subject.trim() || !description.trim()}
            className="bg-indigo text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-dark disabled:opacity-50 transition-colors">
            {submitting ? "Se trimite..." : "Trimite"}
          </button>
        </div>
      )}

      {/* Follow-up question */}
      {followUp && (
        <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-6 space-y-4">
          <p className="text-sm font-medium text-amber-800">Am nevoie de o clarificare:</p>
          <p className="text-sm text-amber-700">{followUp.question}</p>
          <textarea value={followUpAnswer} onChange={e => setFollowUpAnswer(e.target.value)}
            placeholder="Raspunsul tau..."
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-amber-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 resize-y" />
          <button onClick={submitFollowUp} disabled={submitting || !followUpAnswer.trim()}
            className="bg-amber-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors">
            {submitting ? "Se trimite..." : "Trimite raspunsul"}
          </button>
        </div>
      )}

      {/* Tab-uri filtrare */}
      <div className="flex gap-1 mb-4 border-b border-border">
        {([
          { key: "TOATE" as TabFilter, label: "Toate", count: tickets.length },
          { key: "FEEDBACK" as TabFilter, label: "Feedback", count: feedbackCount },
          { key: "SOLICITARE" as TabFilter, label: "Solicitari", count: solicitareCount },
          { key: "SUPORT" as TabFilter, label: "Suport", count: suportCount },
        ]).map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-indigo text-indigo"
                : "border-transparent text-text-secondary hover:text-foreground"
            }`}>
            {tab.label} {tab.count > 0 && <span className="ml-1 text-[10px] opacity-60">({tab.count})</span>}
          </button>
        ))}
      </div>

      {/* Lista tickete filtrate */}
      {loading ? (
        <p className="text-sm text-text-secondary">Se incarca...</p>
      ) : filteredTickets.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-lg font-semibold text-foreground/60 mb-2">
            {activeTab === "TOATE" ? "Niciun mesaj" : `Niciun ${activeTab.toLowerCase()}`}
          </p>
          <p className="text-sm text-text-secondary/50">
            {activeTab === "FEEDBACK" ? "Experienta ta conteaza. Spune-ne cum a fost."
              : activeTab === "SOLICITARE" ? "Ai o idee? Descrie ce te-ar ajuta."
              : "Cand ai o intrebare sau o problema, suntem aici."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTickets.map(ticket => {
            const statusInfo = STATUS_LABELS[ticket.status] || { label: ticket.status, color: "text-slate-500 bg-slate-50" }
            const hasResponse = !!ticket.clientResponse
            const isFeedback = ticket.subject.startsWith("[Feedback]") || ticket.affectedFlow === "feedback"
            const isSolicitare = ticket.subject.startsWith("[Solicitare]") || ticket.affectedFlow === "solicitare"

            return (
              <div key={ticket.id} className={`rounded-xl border bg-surface p-5 ${
                hasResponse ? "border-emerald-200" : isFeedback ? "border-teal-100" : isSolicitare ? "border-violet-100" : "border-border"
              }`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {isFeedback && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-teal-50 text-teal-600">FEEDBACK</span>}
                    {isSolicitare && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-violet-50 text-violet-600">SOLICITARE</span>}
                    <h3 className="text-sm font-semibold text-foreground">
                      {ticket.subject.replace(/^\[(Feedback|Solicitare)\]\s*/, "")}
                    </h3>
                  </div>
                  <span className={`text-[10px] font-medium px-2.5 py-1 rounded-full shrink-0 ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                </div>

                <p className="text-xs text-text-secondary mb-2">
                  {new Date(ticket.createdAt).toLocaleDateString("ro-RO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  {ticket.affectedFlow && <span className="ml-2 text-text-secondary/50">· {ticket.affectedFlow}</span>}
                </p>

                {/* Rezolutie in curs */}
                {!hasResponse && ["ROUTED", "IN_PROGRESS"].includes(ticket.status) && ticket.resolution && (
                  <div className="mt-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                    <p className="text-[10px] text-indigo-600 font-medium mb-1">Status rezolvare:</p>
                    <p className="text-sm text-indigo-800 leading-relaxed">{ticket.resolution}</p>
                  </div>
                )}

                {/* Raspuns final */}
                {hasResponse && (
                  <div className="mt-3 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                    <p className="text-[10px] text-emerald-600 font-medium mb-1">Raspuns echipa JobGrade:</p>
                    <p className="text-sm text-emerald-800 leading-relaxed">{ticket.clientResponse}</p>
                    {ticket.respondedAt && (
                      <p className="text-[9px] text-emerald-500 mt-2">
                        {new Date(ticket.respondedAt).toLocaleDateString("ro-RO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}

                    {/* Buton evaluare satisfactie — doar daca nu a evaluat deja */}
                    {!ticket.clientRating && ["RESPONDED", "RESOLVED"].includes(ticket.status) && (
                      <button onClick={() => { setRatingTicketId(ticket.id); setRatings({ rezultat: 0, timpRaspuns: 0, comunicare: 0, comentariu: "" }) }}
                        className="mt-3 text-xs font-medium text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-lg hover:bg-emerald-200 transition-colors">
                        Evalueaza raspunsul
                      </button>
                    )}

                    {/* Rating deja dat */}
                    {ticket.clientRating && (
                      <div className="mt-2 flex items-center gap-1">
                        <span className="text-[10px] text-emerald-600">Evaluarea ta:</span>
                        {[1, 2, 3, 4, 5].map(i => (
                          <span key={i} className={`text-sm ${i <= ticket.clientRating! ? "text-amber-400" : "text-slate-200"}`}>&#9733;</span>
                        ))}
                        {ticket.clientFeedback && (
                          <span className="text-[9px] text-slate-400 ml-2">{ticket.clientFeedback}</span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Formular satisfactie inline */}
                {ratingTicketId === ticket.id && (
                  <div className="mt-3 p-4 bg-amber-50 rounded-lg border border-amber-200 space-y-3">
                    <p className="text-sm font-medium text-amber-800">Cat de multumit esti?</p>
                    {([
                      { key: "rezultat" as const, label: "Rezultatul e ce aveam nevoie" },
                      { key: "timpRaspuns" as const, label: "Timp de raspuns" },
                      { key: "comunicare" as const, label: "Calitatea comunicarii" },
                    ]).map(criterion => (
                      <div key={criterion.key} className="flex items-center justify-between">
                        <span className="text-xs text-amber-700">{criterion.label}</span>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map(i => (
                            <button key={i}
                              onClick={() => setRatings(r => ({ ...r, [criterion.key]: i }))}
                              className={`w-7 h-7 rounded text-sm transition-colors ${
                                i <= ratings[criterion.key]
                                  ? "bg-amber-400 text-white"
                                  : "bg-white border border-amber-200 text-amber-300 hover:bg-amber-100"
                              }`}>
                              &#9733;
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    <div>
                      <textarea value={ratings.comentariu} onChange={e => setRatings(r => ({ ...r, comentariu: e.target.value }))}
                        placeholder="Comentariu (optional)"
                        rows={2}
                        className="w-full px-3 py-2 rounded-lg border border-amber-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 resize-y" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={submitRating}
                        disabled={submitting || !ratings.rezultat || !ratings.timpRaspuns || !ratings.comunicare}
                        className="bg-amber-600 text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors">
                        {submitting ? "Se trimite..." : "Trimite evaluarea"}
                      </button>
                      <button onClick={() => setRatingTicketId(null)}
                        className="text-xs text-amber-600 px-3 py-2 hover:underline">
                        Renunta
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
