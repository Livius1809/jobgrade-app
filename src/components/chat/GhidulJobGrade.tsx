"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { usePathname } from "next/navigation"
import { getPageGuide } from "@/lib/flying-wheels/page-guide"

/**
 * Ghidul JobGrade — asistent contextual care insoteste clientul
 * pe toate paginile platformei.
 *
 * Design: professional, prietenos, violet gradient consistent cu brand-ul.
 * Functionalitati:
 *  - Ghidaj automat la navigare (gratuit)
 *  - Chat cu intrebari (consuma minute gratuite)
 *  - Jurnal vizite + export PDF
 *  - Toggle ON/OFF
 *  - Indicator minute ramase
 *  - Router inteligent catre agenti specializati (invizibil)
 */

interface Message {
  role: "user" | "assistant" | "guide"
  content: string
  timestamp: string
  page?: string
  consumesMinutes: boolean
  delegatedTo?: string
}

interface VisitEntry {
  page: string
  title: string
  enteredAt: string
  leftAt?: string
}

interface Props {
  freeMinutesTotal?: number
  freeMinutesUsed?: number
}

export default function GhidulJobGrade({
  freeMinutesTotal = 60,
  freeMinutesUsed = 0,
}: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [isEnabled, setIsEnabled] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])
  const [visits, setVisits] = useState<VisitEntry[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [threadId, setThreadId] = useState<string | null>(null)
  const [minutesUsed, setMinutesUsed] = useState(freeMinutesUsed)
  const [view, setView] = useState<"chat" | "journal">("chat")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const pathname = usePathname()
  const lastGuidedPage = useRef("")

  const minutesRemaining = Math.max(0, freeMinutesTotal - minutesUsed)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus()
  }, [isOpen])

  // ── Ghidaj automat la navigare (GRATUIT) ──
  useEffect(() => {
    if (!isEnabled || !pathname || pathname === lastGuidedPage.current) return
    lastGuidedPage.current = pathname

    const guide = getPageGuide(pathname)

    setVisits((prev) => {
      const updated = [...prev]
      if (updated.length > 0 && !updated[updated.length - 1].leftAt) {
        updated[updated.length - 1].leftAt = new Date().toISOString()
      }
      updated.push({ page: pathname, title: guide.title, enteredAt: new Date().toISOString() })
      return updated
    })

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
          content: "Minutele gratuite au fost consumate. Puteti achizitiona minute suplimentare din Setari.",
          timestamp: new Date().toISOString(),
          consumesMinutes: false,
        },
      ])
      return
    }

    const userMessage = input.trim()
    setInput("")
    setMessages((prev) => [
      ...prev,
      { role: "user", content: userMessage, timestamp: new Date().toISOString(), page: pathname, consumesMinutes: true },
    ])
    setLoading(true)

    try {
      const res = await fetch("/api/v1/flying-wheels/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, threadId, currentPage: pathname }),
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
        setMinutesUsed((prev) => prev + 1)
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "A aparut o eroare. Reincercati.", timestamp: new Date().toISOString(), consumesMinutes: false },
        ])
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Nu pot comunica cu serverul.", timestamp: new Date().toISOString(), consumesMinutes: false },
      ])
    } finally {
      setLoading(false)
    }
  }, [input, loading, minutesRemaining, pathname, threadId])

  const handleExportJournal = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/flying-wheels/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, visits }),
      })
      if (!res.ok) { alert("Eroare la generare PDF."); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `ghid-jobgrade-${new Date().toISOString().slice(0, 10)}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch { alert("Eroare de retea.") }
  }, [messages, visits])

  const fmtTime = (d: string) => new Date(d).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })

  // ══════════════════════════════════════════════════════════════
  // BUTON INCHIS
  // ══════════════════════════════════════════════════════════════

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {isEnabled && minutesRemaining > 0 && (
          <span className="text-[10px] text-gray-500 bg-white px-2.5 py-1 rounded-full border border-gray-200 shadow-sm">
            {minutesRemaining} min gratuite
          </span>
        )}
        <button
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2.5 h-12 px-5 rounded-full text-white text-sm font-semibold shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl"
          style={{
            background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 50%, #4C1D95 100%)",
            boxShadow: "0 4px 20px rgba(124, 58, 237, 0.35)",
          }}
        >
          {/* Spirala brand */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="transition-transform duration-500 group-hover:rotate-180">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" fill="rgba(255,255,255,0.3)" />
            <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" fill="rgba(255,255,255,0.5)" />
            <circle cx="12" cy="12" r="2" fill="white" />
          </svg>
          Ghidul JobGrade
        </button>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════
  // PANEL DESCHIS
  // ══════════════════════════════════════════════════════════════

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex flex-col overflow-hidden"
      style={{
        width: "26rem",
        maxHeight: "42rem",
        borderRadius: "1.25rem",
        backgroundColor: "white",
        border: "1px solid #e5e7eb",
        boxShadow: "0 12px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(124,58,237,0.05)",
      }}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)" }}
      >
        <div className="flex items-center gap-2.5">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" fill="rgba(255,255,255,0.3)" />
            <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" fill="rgba(255,255,255,0.5)" />
            <circle cx="12" cy="12" r="2" fill="white" />
          </svg>
          <div>
            <span className="text-sm font-semibold text-white">Ghidul JobGrade</span>
            <span className="text-[10px] text-white/60 ml-2">{minutesRemaining} min</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsEnabled((p) => !p)}
            className="px-2 py-0.5 text-[10px] rounded-full transition-colors"
            style={{
              backgroundColor: isEnabled ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)",
              color: isEnabled ? "white" : "rgba(255,255,255,0.5)",
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            {isEnabled ? "Activ" : "Pauza"}
          </button>
          <button
            onClick={() => setView(view === "chat" ? "journal" : "chat")}
            className="px-2 py-0.5 text-[10px] text-white/70 rounded-full hover:text-white hover:bg-white/10 transition-colors"
          >
            {view === "chat" ? "Jurnal" : "Chat"}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="w-6 h-6 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors text-sm"
          >
            x
          </button>
        </div>
      </div>

      {/* ── Jurnal view ── */}
      {view === "journal" ? (
        <div className="flex-1 overflow-y-auto p-4" style={{ maxHeight: "34rem" }}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-gray-700">{visits.length} pagini vizitate</span>
            <button
              onClick={handleExportJournal}
              className="px-3 py-1 text-[11px] font-medium text-white rounded-lg transition-colors"
              style={{ background: "linear-gradient(135deg, #7C3AED, #5B21B6)" }}
            >
              Descarca PDF
            </button>
          </div>
          <div className="space-y-1.5">
            {visits.map((v, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                <div>
                  <span className="text-xs font-medium text-gray-800">{v.title}</span>
                  <span className="text-[10px] text-gray-400 ml-2">{v.page}</span>
                </div>
                <span className="text-[10px] text-gray-400">{fmtTime(v.enteredAt)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: "#F5F3FF" }}>
            <span className="text-[11px] text-violet-700">
              {messages.filter((m) => m.role === "user").length} intrebari |{" "}
              {messages.filter((m) => m.role === "assistant").length} raspunsuri |{" "}
              {minutesUsed} min consumate din {freeMinutesTotal}
            </span>
          </div>
        </div>
      ) : (
        <>
          {/* ── Mesaje ── */}
          <div
            className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5"
            style={{ minHeight: "16rem", maxHeight: "30rem" }}
          >
            {messages.length === 0 && (
              <div className="text-center py-8 px-4">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" className="mx-auto mb-3 opacity-30">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" fill="#7C3AED" />
                  <circle cx="12" cy="12" r="3" fill="#7C3AED" />
                </svg>
                <p className="text-sm text-gray-500 mb-1">Ghidul JobGrade</p>
                <p className="text-xs text-gray-400">
                  Navigati prin platforma si veti primi explicatii automate. Intrebati orice dorit.
                </p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className="max-w-[88%] px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap"
                  style={{
                    borderRadius: msg.role === "user" ? "1rem 1rem 0.25rem 1rem" : "1rem 1rem 1rem 0.25rem",
                    backgroundColor:
                      msg.role === "user" ? "#7C3AED"
                      : msg.role === "guide" ? "#F5F3FF"
                      : "#F9FAFB",
                    color:
                      msg.role === "user" ? "white"
                      : msg.role === "guide" ? "#5B21B6"
                      : "#1F2937",
                    borderLeft: msg.role === "guide" ? "3px solid #7C3AED" : "none",
                  }}
                >
                  {msg.role === "guide" && (
                    <span className="text-[9px] text-violet-400 font-medium block mb-1">
                      GHIDAJ · {fmtTime(msg.timestamp)}
                    </span>
                  )}
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="px-3.5 py-2.5 bg-gray-50 rounded-2xl rounded-bl-sm">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* ── Input ── */}
          <div className="px-3 py-2.5 border-t border-gray-100 flex gap-2 items-center">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder={minutesRemaining > 0 ? "Intrebati orice..." : "Minute epuizate"}
              disabled={loading || minutesRemaining <= 0}
              className="flex-1 px-3.5 py-2 text-[13px] border border-gray-200 rounded-xl outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 transition-colors disabled:bg-gray-50 disabled:text-gray-400"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim() || minutesRemaining <= 0}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-white transition-all disabled:opacity-30"
              style={{
                background: loading || !input.trim() || minutesRemaining <= 0
                  ? "#D1D5DB"
                  : "linear-gradient(135deg, #7C3AED, #5B21B6)",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" fill="white" />
              </svg>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
