"use client"

import { useState, useEffect } from "react"

interface Notification {
  id: string
  type: string
  title: string
  body: string
  read: boolean
  createdAt: string
}

/** Traduce mesajele tehnice în limbaj Owner */
function translateForOwner(n: Notification): { category: string; summary: string; whatYouCanDo: string } {
  const combined = `${n.title} ${n.body}`.toLowerCase()

  // Cereri de decizie strategică
  if (/decizie.*conducere|necesită decizia|strategic|aprobare|validare/i.test(combined)) {
    const agent = extractAgent(n.title)
    return {
      category: "Decizie necesara",
      summary: extractBusinessMeaning(n.body),
      whatYouCanDo: `${agent} are nevoie de o directivă de la dumneavoastră pentru a continua.`,
    }
  }

  // Pay gap
  if (n.type === "PAY_GAP_THRESHOLD_EXCEEDED" || /pay.?gap|decalaj salarial|art\.\s*10/i.test(combined)) {
    return {
      category: "Conformitate",
      summary: n.body,
      whatYouCanDo: "Legea obligă inițierea unei evaluări comune. Puteți vedea detaliile în secțiunea Pay Gap.",
    }
  }

  // Cereri angajați
  if (n.type === "EMPLOYEE_REQUEST_RECEIVED" || /cerere.*art\.\s*7|transparență salarială/i.test(combined)) {
    return {
      category: "Cerere angajat",
      summary: n.body,
      whatYouCanDo: "Aveți termen legal de răspuns. Verificați detaliile în secțiunea Cereri angajați.",
    }
  }

  // Buget / financiar
  if (/buget|cost|credit|financiar|cheltuial/i.test(combined)) {
    return {
      category: "Financiar",
      summary: extractBusinessMeaning(n.body),
      whatYouCanDo: "Verificați dacă alocarea actuală corespunde priorităților strategice.",
    }
  }

  // Raport generat
  if (n.type === "REPORT_GENERATED" || /raport.*generat|raport.*finalizat/i.test(combined)) {
    return {
      category: "Raport disponibil",
      summary: n.body,
      whatYouCanDo: "Raportul este disponibil pentru consultare și descărcare.",
    }
  }

  // Credite
  if (n.type === "CREDITS_LOW" || /credite.*scăzut|credite.*insuficiente/i.test(combined)) {
    return {
      category: "Credite",
      summary: "Soldul de credite s-a redus semnificativ.",
      whatYouCanDo: "Verificați consumul și achiziționați credite suplimentare dacă este necesar.",
    }
  }

  // Default: mesaj de la structură tradus
  return {
    category: "Informare",
    summary: extractBusinessMeaning(n.body),
    whatYouCanDo: "Luați la cunoștință sau solicitați detalii suplimentare.",
  }
}

/** Elimină jargonul tehnic din body */
function extractBusinessMeaning(body: string): string {
  if (!body) return "Fără detalii suplimentare."
  let text = body
  // Elimină referințe tehnice
  text = text.replace(/FLUX-\d+[a-z]?\s*/gi, "")
  text = text.replace(/\b(route\.ts|\.tsx?|\.mjs?|prisma|API|DB|cron|webhook|endpoint)\b/gi, "")
  text = text.replace(/Task:\s*/i, "")
  text = text.replace(/Motiv:\s*/i, "Motivul: ")
  text = text.replace(/\s+/g, " ").trim()
  return text || "Fără detalii suplimentare."
}

/** Extrage agentul din titlu */
function extractAgent(title: string): string {
  const m = title.match(/\[([A-Z_]{2,15})\]/) || title.match(/^([A-Z_]{2,10}):/)
  if (m) {
    const roleNames: Record<string, string> = {
      COG: "Directorul General (COG)",
      COA: "Directorul Operațional (COA)",
      DOA: "Administratorul Operațional (DOA)",
      COCSA: "Strategul Comercial (COCSA)",
      PMA: "Managerul de Produs (PMA)",
      CJA: "Juristul (CJA)",
      MKA: "Managerul de Marketing (MKA)",
      SOA: "Agentul de Vânzări (SOA)",
      HR_COUNSELOR: "Consilierul HR",
    }
    return roleNames[m[1]] || m[1]
  }
  return "Echipa"
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Decizie necesara": { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  "Conformitate": { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  "Cerere angajat": { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  "Financiar": { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  "Raport disponibil": { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  "Credite": { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  "Informare": { bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200" },
}

export default function OwnerInbox() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [replyMode, setReplyMode] = useState<string | null>(null)
  const [replyText, setReplyText] = useState("")
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetch("/api/v1/owner/notifications")
      .then(r => r.json())
      .then(data => {
        setNotifications(data.notifications || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function handleAction(id: string, response: "confirmed" | "reply" | "clarification", text?: string) {
    setSending(true)
    await fetch("/api/v1/owner/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, response, responseText: text }),
    }).catch(() => {})
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setReplyMode(null)
    setReplyText("")
    setExpanded(null)
    setSending(false)
  }

  // Filtrare tehnice gestionate de COG
  const COG_PATTERNS = /no_activity|dormant|reactivare|sincronizare|activare agent|diagnostic inactivitate/i
  const ownerMessages = notifications.filter(n => !COG_PATTERNS.test(n.title))
  const cogFiltered = notifications.length - ownerMessages.length
  const unread = ownerMessages.filter(n => !n.read)

  if (loading) return null
  if (ownerMessages.length === 0 && cogFiltered === 0) return null

  return (
    <div className="bg-white rounded-2xl border border-slate-200" style={{ padding: "28px" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-[10px] text-amber-700 font-bold uppercase tracking-wide">Mesaje de la structura</p>
          {unread.length > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-[9px] font-bold">
              {unread.length}
            </span>
          )}
        </div>
        {cogFiltered > 0 && (
          <p className="text-[9px] text-slate-400">{cogFiltered} tehnice gestionate autonom</p>
        )}
      </div>

      <div style={{ height: "16px" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {ownerMessages.slice(0, 10).map(n => {
          const translated = translateForOwner(n)
          const colors = CATEGORY_COLORS[translated.category] || CATEGORY_COLORS["Informare"]

          return (
            <div
              key={n.id}
              className={`rounded-xl border transition-colors ${
                n.read ? "border-slate-100 bg-slate-50/30" : `${colors.border} ${colors.bg}`
              }`}
              style={{ padding: "16px" }}
            >
              {/* Header: categorie + data */}
              <div
                className="flex items-start justify-between gap-3 cursor-pointer"
                onClick={() => {
                  setExpanded(expanded === n.id ? null : n.id)
                  setReplyMode(null)
                  setReplyText("")
                }}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {!n.read && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />}
                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${n.read ? "bg-slate-100 text-slate-400" : `${colors.bg} ${colors.text}`}`}>
                      {translated.category}
                    </span>
                  </div>
                  <div style={{ height: "6px" }} />
                  <p className={`text-sm ${n.read ? "text-slate-400" : "text-slate-800"}`}>
                    {translated.summary}
                  </p>
                </div>
                <span className="text-[9px] text-slate-300 shrink-0">
                  {new Date(n.createdAt).toLocaleDateString("ro-RO", { day: "2-digit", month: "short" })}
                </span>
              </div>

              {/* Expanded: detalii + acțiuni */}
              {expanded === n.id && (
                <>
                  <div style={{ height: "10px" }} />
                  <p className="text-[11px] text-slate-500 italic">{translated.whatYouCanDo}</p>

                  <div style={{ height: "12px" }} />

                  {replyMode === n.id ? (
                    <div>
                      <textarea
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        placeholder="Scrieti directiva sau informatia solicitata..."
                        className="w-full border border-slate-200 rounded-lg p-3 text-xs text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        rows={3}
                        autoFocus
                      />
                      <div style={{ height: "8px" }} />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAction(n.id, "reply", replyText)}
                          disabled={sending || replyText.trim().length < 5}
                          className="text-[10px] font-medium bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-40"
                        >
                          {sending ? "Se trimite..." : "Trimite directiva"}
                        </button>
                        <button
                          onClick={() => { setReplyMode(null); setReplyText("") }}
                          className="text-[10px] font-medium text-slate-500 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          Renunta
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 flex-wrap">
                      {translated.category === "Decizie necesara" && (
                        <button
                          onClick={() => setReplyMode(n.id)}
                          className="text-[10px] font-medium bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                          Dau directiva
                        </button>
                      )}
                      {translated.category !== "Decizie necesara" && (
                        <button
                          onClick={() => setReplyMode(n.id)}
                          className="text-[10px] font-medium bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-200 transition-colors"
                        >
                          Raspunde
                        </button>
                      )}
                      <button
                        onClick={() => handleAction(n.id, "confirmed")}
                        className="text-[10px] font-medium bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-200 transition-colors"
                      >
                        Am luat act
                      </button>
                      <button
                        onClick={() => {
                          setReplyMode(n.id)
                          setReplyText("Va rog sa detaliati in termeni de business ce anume necesitati si care e impactul.")
                        }}
                        className="text-[10px] font-medium bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg hover:bg-amber-200 transition-colors"
                      >
                        Detaliati
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
