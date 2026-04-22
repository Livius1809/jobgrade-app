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

export default function OwnerInbox() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/v1/owner/notifications")
      .then(r => r.json())
      .then(data => {
        setNotifications(data.notifications || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function markRead(id: string) {
    await fetch("/api/v1/owner/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  async function dismiss(id: string) {
    await fetch("/api/v1/owner/notifications", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {})
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  async function respond(id: string, response: "confirmed" | "clarification") {
    await fetch("/api/v1/owner/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, response }),
    }).catch(() => {})
    if (response === "confirmed") {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }
  }

  const unread = notifications.filter(n => !n.read)

  // Filtrare: exclude mesaje tehnice care ar trebui gestionate de COG
  const COG_PATTERNS = /no_activity|dormant|reactivare|sincronizare|activare agent|diagnostic inactivitate/i
  const ownerMessages = notifications.filter(n => !COG_PATTERNS.test(n.title))
  const cogFiltered = notifications.length - ownerMessages.length

  if (loading) return null
  if (ownerMessages.length === 0 && cogFiltered > 0) {
    return (
      <div className="bg-slate-50 rounded-2xl border border-slate-200" style={{ padding: "16px" }}>
        <p className="text-xs text-slate-400 text-center">
          {cogFiltered} mesaje tehnice gestionate autonom de COG
        </p>
      </div>
    )
  }
  if (ownerMessages.length === 0) return null

  return (
    <div className="bg-white rounded-2xl border border-slate-200" style={{ padding: "28px" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-[10px] text-amber-700 font-bold uppercase tracking-wide">Mesaje de la structură</p>
          {unread.length > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-[9px] font-bold">
              {unread.length}
            </span>
          )}
        </div>
        {cogFiltered > 0 && (
          <p className="text-[9px] text-slate-400">{cogFiltered} tehnice gestionate de COG</p>
        )}
      </div>

      <div style={{ height: "16px" }} />

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {ownerMessages.slice(0, 10).map(n => (
          <div
            key={n.id}
            className={`rounded-xl border transition-colors ${
              n.read ? "border-slate-100 bg-slate-50/50" : "border-amber-200 bg-amber-50"
            }`}
            style={{ padding: "16px" }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 cursor-pointer" onClick={() => {
                setExpanded(expanded === n.id ? null : n.id)
                if (!n.read) markRead(n.id)
              }}>
                <div className="flex items-center gap-2">
                  {!n.read && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />}
                  <p className={`text-sm font-medium ${n.read ? "text-slate-400" : "text-slate-900"}`}>
                    {n.title}
                  </p>
                </div>
                {expanded === n.id && (
                  <>
                    <div style={{ height: "8px" }} />
                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{n.body}</p>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[9px] text-slate-300">
                  {new Date(n.createdAt).toLocaleDateString("ro-RO", { day: "2-digit", month: "short" })}
                </span>
                <button onClick={() => dismiss(n.id)} className="text-slate-300 hover:text-red-400 transition-colors text-sm" title="Șterge">✕</button>
              </div>
            </div>

            {/* Butoane răspuns — doar pe mesaje necitite sau expandate */}
            {(expanded === n.id || !n.read) && (
              <>
                <div style={{ height: "12px" }} />
                <div className="flex gap-2">
                  <button
                    onClick={() => respond(n.id, "confirmed")}
                    className="text-[10px] font-medium bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-200 transition-colors"
                  >
                    ✓ Am luat act
                  </button>
                  <button
                    onClick={() => respond(n.id, "clarification")}
                    className="text-[10px] font-medium bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg hover:bg-amber-200 transition-colors"
                  >
                    Necesit lămuriri
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
