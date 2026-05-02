"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { usePathname } from "next/navigation"
import { getPageGuide } from "@/lib/flying-wheels/page-guide"

/**
 * GhidulPublic — versiune publică a GhidulJobGrade
 *
 * Funcționează pe paginile B2B publice (fără auth).
 * Ghidaj automat la navigare (gratuit).
 * Chat prin FW endpoint (mod public — userId="system").
 * Design identic cu GhidulJobGrade din portal.
 */

interface Message {
  role: "user" | "assistant" | "guide"
  content: string
  timestamp: string
}

export default function GhidulPublic() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [threadId, setThreadId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const pathname = usePathname()
  const lastGuidedPage = useRef("")

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus()
  }, [isOpen])

  // Ghidaj automat la navigare
  useEffect(() => {
    if (!pathname || pathname === lastGuidedPage.current) return
    lastGuidedPage.current = pathname

    const guide = getPageGuide(pathname)
    setMessages(prev => [
      ...prev,
      {
        role: "guide",
        content: `**${guide.title}**\n${guide.shortGuide}`,
        timestamp: new Date().toISOString(),
      },
    ])
  }, [pathname])

  // Chat — folosește FW endpoint fără auth (KB-first)
  const handleSend = useCallback(async () => {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput("")
    setMessages(prev => [
      ...prev,
      { role: "user", content: userMessage, timestamp: new Date().toISOString() },
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
        setThreadId(json.threadId)
        setMessages(prev => [
          ...prev,
          { role: "assistant", content: json.response, timestamp: new Date().toISOString() },
        ])
      } else {
        // Fallback — ghidaj static
        const guide = getPageGuide(pathname || "/")
        setMessages(prev => [
          ...prev,
          { role: "assistant", content: guide.detailedGuide, timestamp: new Date().toISOString() },
        ])
      }
    } catch {
      const guide = getPageGuide(pathname || "/")
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: guide.detailedGuide, timestamp: new Date().toISOString() },
      ])
    }

    setLoading(false)
  }, [input, loading, threadId, pathname])

  return (
    <>
      {/* Buton float — avatar Rareș */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg overflow-hidden transition-transform hover:scale-110 ring-2 ring-white"
          title="Rareș — Ghidul JobGrade"
        >
          <img src="/guide/C2_B2B.png" alt="Rareș" className="w-full h-full object-cover" />
        </button>
      )}

      {/* Panel chat */}
      {isOpen && (
        <div
          className="fixed bottom-6 right-6 z-50 flex flex-col overflow-hidden rounded-xl shadow-2xl border border-gray-200"
          style={{ width: 360, height: 480 }}
        >
          {/* Header — Rareș */}
          <div className="flex items-center justify-between px-3 py-2.5" style={{ background: "var(--indigo)" }}>
            <div className="flex items-center gap-2.5">
              <img src="/guide/C2_B2B.png" alt="Rareș" className="w-9 h-9 rounded-full object-cover ring-2 ring-white/30" />
              <div>
                <p className="text-white text-sm font-semibold">Rareș</p>
                <p className="text-indigo-200 text-[10px]">Ghidul JobGrade</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/70 hover:text-white text-lg leading-none"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto bg-white p-3 space-y-2.5">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} gap-1.5`}>
                {msg.role !== "user" && (
                  <img src="/guide/C2_B2B.png" alt="Rareș" className="w-6 h-6 rounded-full object-cover flex-shrink-0 mt-1" />
                )}
                <div className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "text-gray-800"
                    : msg.role === "guide"
                    ? "bg-indigo-50 text-indigo-800 border border-indigo-100"
                    : "bg-gray-50 text-gray-700"
                }`} style={msg.role === "user" ? { background: "#EEF2FF" } : {}}>
                  {msg.content.split("\n").map((line, j) => {
                    if (line.startsWith("**") && line.endsWith("**")) {
                      return <p key={j} className="font-semibold text-xs mb-0.5">{line.replace(/\*\*/g, "")}</p>
                    }
                    return <p key={j} className="my-0.5 text-xs">{line}</p>
                  })}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-50 rounded-2xl px-4 py-2">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="bg-white border-t border-gray-100 p-2.5">
            <form onSubmit={(e) => { e.preventDefault(); handleSend() }} className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Întrebați orice despre servicii..."
                className="flex-1 px-3 py-2 rounded-full border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-200"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="px-3 py-2 rounded-full text-white text-xs font-medium transition-opacity disabled:opacity-40"
                style={{ background: "var(--indigo)" }}
              >
                ➤
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
