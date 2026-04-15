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

  const unread = notifications.filter(n => !n.read)

  if (loading) return null
  if (notifications.length === 0) return null

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-sm font-bold text-indigo-dark">
          Mesaje de la structură
        </h2>
        {unread.length > 0 && (
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-coral text-white text-[10px] font-bold">
            {unread.length}
          </span>
        )}
      </div>
      <div className="space-y-2">
        {notifications.slice(0, 10).map(n => (
          <div
            key={n.id}
            className={`rounded-lg border p-4 cursor-pointer transition-colors ${
              n.read
                ? "border-border/50 bg-surface/50"
                : "border-indigo/30 bg-indigo/5"
            }`}
            onClick={() => {
              setExpanded(expanded === n.id ? null : n.id)
              if (!n.read) markRead(n.id)
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {!n.read && <span className="w-2 h-2 rounded-full bg-coral flex-shrink-0" />}
                  <p className={`text-sm font-medium truncate ${n.read ? "text-text-secondary" : "text-indigo-dark"}`}>
                    {n.title}
                  </p>
                </div>
                {expanded === n.id && (
                  <p className="text-sm text-text-warm mt-3 leading-relaxed whitespace-pre-wrap">
                    {n.body}
                  </p>
                )}
              </div>
              <span className="text-[10px] text-text-secondary/50 flex-shrink-0">
                {new Date(n.createdAt).toLocaleDateString("ro-RO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
