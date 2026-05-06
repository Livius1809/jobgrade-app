"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"

export const dynamic = "force-dynamic"

// ── Types ────────────────────────────────────────────────────────────────────

interface Community {
  id: string
  card: string
  name: string
  description: string | null
  isActive: boolean
  memberCount: number
  messageCount: number
  myRole: string
  joinedAt: string
}

interface Message {
  id: string
  authorAlias: string
  isMe: boolean
  content: string
  createdAt: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getB2CToken(): string | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(/(?:^|;\s*)b2c-token=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : null
}

function getB2CUserId(): string | null {
  const token = getB2CToken()
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split(".")[1]))
    return payload.sub || null
  } catch {
    return null
  }
}

function headers(): HeadersInit {
  const token = getB2CToken()
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "acum"
  if (mins < 60) return `acum ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `acum ${hours}h`
  return d.toLocaleDateString("ro-RO", { day: "numeric", month: "short" })
}

const CARD_LABELS: Record<string, string> = {
  CARD_1: "Drumul catre mine",
  CARD_2: "Eu si ceilalti",
  CARD_3: "Rol profesional",
  CARD_4: "Succes si valoare",
  CARD_5: "Antreprenoriat",
  CARD_6: "Profiler",
}

// ── Component ────────────────────────────────────────────────────────────────

export default function CommunitiesPage() {
  const userId = getB2CUserId()
  const [communities, setCommunities] = useState<Community[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [communityDetail, setCommunityDetail] = useState<any>(null)
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load communities
  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }
    fetch(`/api/v1/b2c/communities?userId=${userId}`, { headers: headers() })
      .then((r) => r.json())
      .then((data) => {
        if (data.communities) setCommunities(data.communities)
        setLoading(false)
      })
      .catch(() => {
        setError("Nu am putut incarca comunitatile")
        setLoading(false)
      })
  }, [userId])

  // Load messages when community selected
  const loadMessages = useCallback(
    (communityId: string) => {
      if (!userId) return
      fetch(`/api/v1/b2c/communities/${communityId}?userId=${userId}&limit=30`, {
        headers: headers(),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.messages) {
            setMessages(data.messages.reverse()) // cronologic
            setCommunityDetail(data.community)
          }
        })
        .catch(() => setError("Nu am putut incarca mesajele"))
    },
    [userId]
  )

  useEffect(() => {
    if (selectedId) loadMessages(selectedId)
  }, [selectedId, loadMessages])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Send message
  async function handleSend() {
    if (!newMessage.trim() || !selectedId || !userId || sending) return
    setSending(true)
    try {
      const res = await fetch("/api/v1/b2c/communities", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          userId,
          communityId: selectedId,
          content: newMessage.trim(),
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: data.id,
            authorAlias: data.authorAlias,
            isMe: true,
            content: data.content,
            createdAt: data.createdAt,
          },
        ])
        setNewMessage("")
      } else {
        setError(data.error || "Eroare la trimitere")
      }
    } catch {
      setError("Eroare la trimiterea mesajului")
    } finally {
      setSending(false)
    }
  }

  // ── No auth ────────────────────────────────────────────────────────────────

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center space-y-4">
          <h1 className="text-xl font-semibold text-foreground">Comunitati</h1>
          <p className="text-sm text-text-secondary">
            Trebuie sa fii autentificat pentru a accesa comunitatile.
          </p>
          <Link
            href="/personal"
            className="inline-block px-6 py-2.5 rounded-xl bg-coral text-white text-sm font-semibold btn-coral"
          >
            Inapoi
          </Link>
        </div>
      </div>
    )
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-sm text-text-secondary animate-pulse">Se incarca...</div>
      </div>
    )
  }

  // ── Empty state ────────────────────────────────────────────────────────────

  if (communities.length === 0 && !selectedId) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-xl font-semibold text-foreground">Comunitati</h1>
            <Link href="/personal" className="text-sm text-indigo hover:underline">
              Inapoi la carduri
            </Link>
          </div>
          <div className="border border-border rounded-2xl p-12 text-center bg-surface">
            <div className="w-16 h-16 rounded-full bg-indigo/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-indigo/40" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-foreground mb-2">
              Inca nu ai acces la comunități
            </h2>
            <p className="text-sm text-text-secondary leading-relaxed max-w-md mx-auto">
              Comunitatile se deschid pe masura ce avansezi pe fiecare card.
              Continua interactiunile cu agentii AI si accesul se va activa
              cand esti pregatit.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── Main view: list + chat ─────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-indigo/10">
        <div className="flex items-center justify-between px-6 h-14 max-w-5xl mx-auto">
          <h1 className="text-base font-semibold text-foreground">Comunitati</h1>
          <Link href="/personal" className="text-sm text-indigo hover:underline">
            Inapoi la carduri
          </Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto flex flex-col md:flex-row" style={{ minHeight: "calc(100vh - 3.5rem)" }}>
        {/* Sidebar — community list */}
        <aside className="w-full md:w-72 border-r border-border bg-warm-bg/50 p-4 space-y-2 md:min-h-0 md:overflow-y-auto">
          {communities.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`w-full text-left p-3 rounded-xl transition-all ${
                selectedId === c.id
                  ? "bg-indigo/10 border border-indigo/20"
                  : "hover:bg-surface border border-transparent"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-foreground truncate">
                  {CARD_LABELS[c.card] || c.card}
                </span>
                <span className="text-xs text-text-micro ml-2 shrink-0">
                  {c.memberCount} membri
                </span>
              </div>
              <p className="text-xs text-text-secondary truncate">{c.name}</p>
            </button>
          ))}
        </aside>

        {/* Main — chat area */}
        <main className="flex-1 flex flex-col">
          {!selectedId ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <p className="text-sm text-text-secondary">Alege o comunitate din lista</p>
            </div>
          ) : (
            <>
              {/* Community header */}
              {communityDetail && (
                <div className="border-b border-border px-6 py-3 bg-surface/50">
                  <h2 className="text-sm font-semibold text-foreground">{communityDetail.name}</h2>
                  <p className="text-xs text-text-secondary">
                    {communityDetail.memberCount} membri &middot; {communityDetail.messageCount} mesaje
                  </p>
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 && (
                  <p className="text-center text-sm text-text-secondary py-8">
                    Fii primul care scrie in aceasta comunitate.
                  </p>
                )}
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.isMe ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                        m.isMe
                          ? "bg-indigo text-white rounded-br-md"
                          : "bg-surface border border-border rounded-bl-md"
                      }`}
                    >
                      {!m.isMe && (
                        <p className="text-xs font-medium text-coral mb-1">{m.authorAlias}</p>
                      )}
                      <p className={`text-sm leading-relaxed ${m.isMe ? "text-white" : "text-foreground"}`}>
                        {m.content}
                      </p>
                      <p className={`text-[10px] mt-1 ${m.isMe ? "text-white/60" : "text-text-micro"}`}>
                        {formatDate(m.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t border-border p-4 bg-surface/50">
                {error && (
                  <p className="text-xs text-red-500 mb-2">{error}</p>
                )}
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value)
                      setError(null)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleSend()
                      }
                    }}
                    placeholder="Scrie un mesaj..."
                    className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-text-micro focus:outline-none focus:border-indigo/30 transition-colors"
                    disabled={sending}
                  />
                  <button
                    onClick={handleSend}
                    disabled={sending || !newMessage.trim()}
                    className="px-5 py-2.5 rounded-xl bg-coral text-white text-sm font-semibold btn-coral disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sending ? "..." : "Trimite"}
                  </button>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
