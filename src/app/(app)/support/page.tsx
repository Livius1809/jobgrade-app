"use client"

import { useState, useEffect } from "react"

interface Ticket {
  id: string
  subject: string
  status: string
  priority: string
  affectedFlow: string | null
  clientResponse: string | null
  respondedAt: string | null
  clientRating: number | null
  createdAt: string
}

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

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [subject, setSubject] = useState("")
  const [description, setDescription] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState("")
  const [followUp, setFollowUp] = useState<{ ticketId: string; question: string } | null>(null)
  const [followUpAnswer, setFollowUpAnswer] = useState("")

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
        body: JSON.stringify({ subject: subject.trim(), description: description.trim() }),
      })
      const data = await res.json()

      if (data.status === "REFINING" && data.followUpQuestion) {
        setFollowUp({ ticketId: data.ticketId, question: data.followUpQuestion })
        setMessage("")
      } else {
        setMessage(data.message || "Solicitare trimisa")
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

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Solicitari si raspunsuri</h1>
          <p className="text-sm text-text-secondary mt-1">Semnaleaza orice problema sau intrebare. Te ajutam.</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setFollowUp(null); setMessage("") }}
          className="text-sm font-medium bg-coral text-white px-4 py-2 rounded-lg hover:bg-coral-dark transition-colors">
          {showForm ? "Anuleaza" : "Solicitare noua"}
        </button>
      </div>

      {message && (
        <div className="mb-4 p-3 rounded-lg bg-indigo/5 border border-indigo/10 text-sm text-foreground">
          {message}
        </div>
      )}

      {/* Formular solicitare */}
      {showForm && !followUp && (
        <div className="mb-8 rounded-xl border border-border bg-surface p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Subiect</label>
            <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
              placeholder="Descrie pe scurt ce se intampla"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo/20" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Descriere</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Spune-ne ce incercai sa faci, ce s-a intamplat si ce te asteptai sa se intample..."
              rows={5}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo/20 resize-y" />
            <p className="text-xs text-text-secondary/50 mt-1">Nu trebuie sa stii daca e o problema tehnica sau nu. Doar descrie ce s-a intamplat.</p>
          </div>
          <button onClick={submitTicket} disabled={submitting || !subject.trim() || !description.trim()}
            className="bg-indigo text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-dark disabled:opacity-50 transition-colors">
            {submitting ? "Se trimite..." : "Trimite solicitarea"}
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

      {/* Lista tickete */}
      {loading ? (
        <p className="text-sm text-text-secondary">Se incarca...</p>
      ) : tickets.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-lg font-semibold text-foreground/60 mb-2">Nicio solicitare</p>
          <p className="text-sm text-text-secondary/50">Cand ai o intrebare sau o problema, suntem aici.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map(ticket => {
            const statusInfo = STATUS_LABELS[ticket.status] || { label: ticket.status, color: "text-slate-500 bg-slate-50" }
            const hasResponse = !!ticket.clientResponse

            return (
              <div key={ticket.id} className={`rounded-xl border bg-surface p-5 ${hasResponse ? "border-emerald-200" : "border-border"}`}>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-semibold text-foreground">{ticket.subject}</h3>
                  <span className={`text-[10px] font-medium px-2.5 py-1 rounded-full ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                </div>

                <p className="text-xs text-text-secondary mb-2">
                  {new Date(ticket.createdAt).toLocaleDateString("ro-RO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  {ticket.affectedFlow && <span className="ml-2 text-text-secondary/50">· {ticket.affectedFlow}</span>}
                </p>

                {/* Răspuns */}
                {hasResponse && (
                  <div className="mt-3 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                    <p className="text-[10px] text-emerald-600 font-medium mb-1">Raspuns echipa JobGrade:</p>
                    <p className="text-sm text-emerald-800 leading-relaxed">{ticket.clientResponse}</p>
                    {ticket.respondedAt && (
                      <p className="text-[9px] text-emerald-500 mt-2">
                        {new Date(ticket.respondedAt).toLocaleDateString("ro-RO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
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
