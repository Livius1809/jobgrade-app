"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { usePathname } from "next/navigation"
import { getPageGuide } from "@/lib/flying-wheels/page-guide"

interface Message {
  role: "user" | "assistant" | "guide"
  content: string
  timestamp: string
  page?: string
  consumesMinutes: boolean
  delegatedTo?: string // intern — cine a răspuns (pt jurnal)
}

interface VisitEntry {
  page: string
  title: string
  enteredAt: string
  leftAt?: string
}

export default function FlyingWheels({
  freeMinutesTotal = 60,
  freeMinutesUsed = 0,
}: {
  freeMinutesTotal?: number
  freeMinutesUsed?: number
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isEnabled, setIsEnabled] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])
  const [visits, setVisits] = useState<VisitEntry[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [threadId, setThreadId] = useState<string | null>(null)
  const [minutesUsed, setMinutesUsed] = useState(freeMinutesUsed)
  const [showJournal, setShowJournal] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const pathname = usePathname()
  const lastGuidedPage = useRef<string>("")

  const minutesRemaining = Math.max(0, freeMinutesTotal - minutesUsed)

  // Scroll la ultimul mesaj
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Focus input cand se deschide
  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus()
  }, [isOpen])

  // ── Ghidaj automat la navigare ──
  useEffect(() => {
    if (!isEnabled || !pathname || pathname === lastGuidedPage.current) return
    lastGuidedPage.current = pathname

    const guide = getPageGuide(pathname)

    // Inregistreaza vizita
    setVisits((prev) => {
      const updated = [...prev]
      // Marcheaza leftAt pe vizita anterioara
      if (updated.length > 0 && !updated[updated.length - 1].leftAt) {
        updated[updated.length - 1].leftAt = new Date().toISOString()
      }
      updated.push({
        page: pathname,
        title: guide.title,
        enteredAt: new Date().toISOString(),
      })
      return updated
    })

    // Adauga mesaj de ghidaj (GRATUIT)
    setMessages((prev) => [
      ...prev,
      {
        role: "guide",
        content: `**${guide.title}**\n${guide.shortGuide}`,
        timestamp: new Date().toISOString(),
        page: pathname,
        consumesMinutes: false,
      },
    ])
  }, [pathname, isEnabled])

  // ── Trimite intrebare (CONSUMA MINUTE) ──
  const handleSend = useCallback(async () => {
    if (!input.trim() || loading) return
    if (minutesRemaining <= 0) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Minutele gratuite au fost epuizate. Puteti achizitiona minute suplimentare din Setari > Facturare.",
          timestamp: new Date().toISOString(),
          consumesMinutes: false,
        },
      ])
      return
    }

    const userMessage = input.trim()
    setInput("")

    const now = new Date().toISOString()
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: userMessage,
        timestamp: now,
        page: pathname,
        consumesMinutes: true,
      },
    ])
    setLoading(true)

    try {
      const res = await fetch("/api/v1/flying-wheels/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          threadId,
          currentPage: pathname,
        }),
      })

      const json = await res.json()

      if (res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: json.response,
            timestamp: new Date().toISOString(),
            page: pathname,
            consumesMinutes: true,
            delegatedTo: json.delegatedTo,
          },
        ])
        if (json.threadId) setThreadId(json.threadId)
        // Incrementeaza minutele folosite (~1 min per intrebare)
        setMinutesUsed((prev) => prev + 1)
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "A aparut o eroare. Reincercati.",
            timestamp: new Date().toISOString(),
            consumesMinutes: false,
          },
        ])
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Nu pot comunica cu serverul.",
          timestamp: new Date().toISOString(),
          consumesMinutes: false,
        },
      ])
    } finally {
      setLoading(false)
    }
  }, [input, loading, minutesRemaining, pathname, threadId])

  // ── Export jurnal PDF ──
  const handleExportJournal = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/flying-wheels/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, visits }),
      })
      if (!res.ok) {
        alert("Eroare la generare PDF.")
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `jurnal-flying-wheels-${new Date().toISOString().slice(0, 10)}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert("Eroare de retea.")
    }
  }, [messages, visits])

  const fmt = (d: string) =>
    new Date(d).toLocaleString("ro-RO", {
      hour: "2-digit",
      minute: "2-digit",
    })

  // ── Render buton inchis ──
  if (!isOpen) {
    return (
      <div style={{ position: "fixed", bottom: "1.5rem", right: "1.5rem", zIndex: 50, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.5rem" }}>
        {isEnabled && minutesRemaining > 0 && (
          <span style={{ fontSize: "0.625rem", color: "#6b7280", backgroundColor: "white", padding: "0.15rem 0.5rem", borderRadius: "1rem", border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            {minutesRemaining} min gratuite
          </span>
        )}
        <button
          onClick={() => setIsOpen(true)}
          style={{
            height: "3rem",
            paddingLeft: "1rem",
            paddingRight: "1rem",
            borderRadius: "1.5rem",
            backgroundColor: isEnabled ? "#7C3AED" : "#6b7280",
            color: "white",
            border: "none",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(124, 58, 237, 0.4)",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.8125rem",
            fontWeight: 600,
            transition: "transform 0.2s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.05)" }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)" }}
        >
          <span style={{ fontSize: "1.1rem" }}>&#9881;</span>
          Flying Wheels
        </button>
      </div>
    )
  }

  // ── Render panel deschis ──
  return (
    <div
      style={{
        position: "fixed",
        bottom: "1.5rem",
        right: "1.5rem",
        width: "26rem",
        maxHeight: "40rem",
        borderRadius: "1rem",
        backgroundColor: "white",
        border: "1px solid #e5e7eb",
        boxShadow: "0 8px 30px rgba(0,0,0,0.15)",
        display: "flex",
        flexDirection: "column",
        zIndex: 50,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "0.75rem 1rem",
          borderBottom: "1px solid #e5e7eb",
          background: "linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1rem" }}>&#9881;</span>
          <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "white" }}>
            Flying Wheels
          </span>
          <span style={{ fontSize: "0.625rem", color: "rgba(255,255,255,0.7)", marginLeft: "0.25rem" }}>
            {minutesRemaining} min gratuite
          </span>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          {/* Toggle on/off */}
          <button
            onClick={() => setIsEnabled((p) => !p)}
            style={{
              padding: "0.15rem 0.5rem",
              fontSize: "0.625rem",
              color: "white",
              backgroundColor: isEnabled ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: "0.375rem",
              cursor: "pointer",
            }}
          >
            {isEnabled ? "ON" : "OFF"}
          </button>
          {/* Jurnal */}
          <button
            onClick={() => setShowJournal((p) => !p)}
            style={{
              padding: "0.15rem 0.5rem",
              fontSize: "0.625rem",
              color: "white",
              backgroundColor: showJournal ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: "0.375rem",
              cursor: "pointer",
            }}
          >
            Jurnal
          </button>
          {/* Close */}
          <button
            onClick={() => setIsOpen(false)}
            style={{
              padding: "0.15rem 0.4rem",
              fontSize: "0.875rem",
              color: "rgba(255,255,255,0.7)",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            x
          </button>
        </div>
      </div>

      {/* Journal view */}
      {showJournal ? (
        <div style={{ flex: 1, overflowY: "auto", padding: "0.75rem", maxHeight: "30rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#374151" }}>
              Jurnal vizite ({visits.length} pagini)
            </span>
            <button
              onClick={handleExportJournal}
              style={{
                padding: "0.25rem 0.75rem",
                fontSize: "0.6875rem",
                backgroundColor: "#7C3AED",
                color: "white",
                border: "none",
                borderRadius: "0.375rem",
                cursor: "pointer",
              }}
            >
              Export PDF
            </button>
          </div>
          {visits.map((v, i) => (
            <div
              key={i}
              style={{
                padding: "0.5rem",
                marginBottom: "0.375rem",
                borderRadius: "0.5rem",
                backgroundColor: "#f9fafb",
                border: "1px solid #f3f4f6",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.6875rem" }}>
                <span style={{ fontWeight: 600, color: "#111827" }}>{v.title}</span>
                <span style={{ color: "#9ca3af" }}>{fmt(v.enteredAt)}</span>
              </div>
              <div style={{ fontSize: "0.625rem", color: "#6b7280" }}>{v.page}</div>
            </div>
          ))}
          {/* Sumar intrebari */}
          <div style={{ marginTop: "0.75rem", padding: "0.5rem", backgroundColor: "#ede9fe", borderRadius: "0.5rem" }}>
            <span style={{ fontSize: "0.6875rem", color: "#5b21b6" }}>
              {messages.filter((m) => m.role === "user").length} intrebari |{" "}
              {messages.filter((m) => m.role === "assistant").length} raspunsuri |{" "}
              {minutesUsed} min consumate din {freeMinutesTotal}
            </span>
          </div>
        </div>
      ) : (
        <>
          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "0.75rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              minHeight: "14rem",
              maxHeight: "28rem",
            }}
          >
            {messages.length === 0 && (
              <div style={{ textAlign: "center", padding: "2rem 1rem", color: "#9ca3af" }}>
                <p style={{ fontSize: "0.8125rem", marginBottom: "0.5rem" }}>
                  Flying Wheels va ghideaza prin platforma.
                </p>
                <p style={{ fontSize: "0.6875rem" }}>
                  Navigati si veti primi explicatii automate. Intrebati orice — raspunsurile consuma din minutele gratuite.
                </p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent:
                    msg.role === "user"
                      ? "flex-end"
                      : "flex-start",
                }}
              >
                <div
                  style={{
                    maxWidth: "88%",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "0.75rem",
                    fontSize: "0.8125rem",
                    lineHeight: "1.4",
                    backgroundColor:
                      msg.role === "user"
                        ? "#7C3AED"
                        : msg.role === "guide"
                        ? "#ede9fe"
                        : "#f3f4f6",
                    color:
                      msg.role === "user"
                        ? "white"
                        : msg.role === "guide"
                        ? "#5b21b6"
                        : "#111827",
                    borderBottomRightRadius: msg.role === "user" ? "0.25rem" : "0.75rem",
                    borderBottomLeftRadius: msg.role !== "user" ? "0.25rem" : "0.75rem",
                    whiteSpace: "pre-wrap",
                    borderLeft: msg.role === "guide" ? "3px solid #7C3AED" : "none",
                  }}
                >
                  {msg.role === "guide" && (
                    <span style={{ fontSize: "0.5625rem", color: "#7c3aed", display: "block", marginBottom: "0.25rem" }}>
                      GHIDAJ AUTOMAT · {fmt(msg.timestamp)}
                    </span>
                  )}
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div
                  style={{
                    padding: "0.5rem 0.75rem",
                    borderRadius: "0.75rem",
                    backgroundColor: "#f3f4f6",
                    fontSize: "0.8125rem",
                    color: "#9ca3af",
                  }}
                >
                  Se gandeste...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            style={{
              padding: "0.5rem 0.75rem",
              borderTop: "1px solid #e5e7eb",
              display: "flex",
              gap: "0.5rem",
              alignItems: "center",
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder={minutesRemaining > 0 ? "Intrebati orice..." : "Minute epuizate"}
              disabled={loading || minutesRemaining <= 0}
              style={{
                flex: 1,
                padding: "0.5rem 0.75rem",
                border: "1px solid #e5e7eb",
                borderRadius: "0.5rem",
                fontSize: "0.8125rem",
                outline: "none",
              }}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim() || minutesRemaining <= 0}
              style={{
                padding: "0.5rem 0.75rem",
                backgroundColor:
                  loading || !input.trim() || minutesRemaining <= 0 ? "#d1d5db" : "#7C3AED",
                color: "white",
                border: "none",
                borderRadius: "0.5rem",
                fontSize: "0.8125rem",
                cursor:
                  loading || !input.trim() || minutesRemaining <= 0 ? "default" : "pointer",
              }}
            >
              Trimite
            </button>
          </div>

          {/* Escalare la ticket */}
          {messages.length >= 3 && (
            <div style={{ padding: "0.25rem 0.75rem 0.5rem", borderTop: "1px solid #f3f4f6", textAlign: "center" }}>
              <button
                onClick={async () => {
                  const chatSummary = messages
                    .filter(m => m.role !== "guide")
                    .slice(-6)
                    .map(m => `[${m.role}] ${m.content}`)
                    .join("\n")
                  try {
                    const res = await fetch("/api/v1/support/ticket", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        subject: `[Din chat] ${messages.find(m => m.role === "user")?.content?.slice(0, 60) || "Conversatie"}`,
                        description: `Conversatie chat escalata:\n\n${chatSummary}`,
                        ticketType: "SUPORT",
                        source: "CHAT_FW",
                      }),
                    })
                    if (res.ok) {
                      setMessages(prev => [...prev, {
                        role: "assistant" as const,
                        content: "Am creat un ticket de suport din aceasta conversatie. Vei primi raspuns detaliat.",
                        timestamp: new Date().toISOString(),
                        consumesMinutes: false,
                      }])
                    }
                  } catch {}
                }}
                style={{
                  fontSize: "0.6875rem",
                  color: "#7c3aed",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textDecoration: "underline",
                  padding: "0.25rem",
                }}
              >
                Nu ai primit raspunsul dorit? Creeaza un ticket de suport
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
