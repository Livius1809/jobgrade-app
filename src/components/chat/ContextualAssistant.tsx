"use client"

import { useState, useRef, useEffect } from "react"
import { usePathname } from "next/navigation"

interface Message {
  role: "user" | "assistant"
  content: string
}

export default function ContextualAssistant() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [threadId, setThreadId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const pathname = usePathname()

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function handleSend() {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput("")
    setMessages((prev) => [...prev, { role: "user", content: userMessage }])
    setLoading(true)

    try {
      const res = await fetch("/api/v1/assistant", {
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
        setMessages((prev) => [...prev, { role: "assistant", content: json.response }])
        if (json.threadId) setThreadId(json.threadId)
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Scuze, a apărut o eroare. Încearcă din nou." },
        ])
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Nu pot comunica cu serverul. Verifică conexiunea." },
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleNewConversation() {
    setMessages([])
    setThreadId(null)
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: "fixed",
          bottom: "1.5rem",
          right: "1.5rem",
          height: "2.75rem",
          paddingLeft: "1rem",
          paddingRight: "1rem",
          borderRadius: "1.375rem",
          backgroundColor: "#2563eb",
          color: "white",
          border: "none",
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(37, 99, 235, 0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.4rem",
          fontSize: "0.8125rem",
          fontWeight: 500,
          zIndex: 50,
          transition: "transform 0.2s, box-shadow 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.05)"
          e.currentTarget.style.boxShadow = "0 6px 16px rgba(37, 99, 235, 0.5)"
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)"
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(37, 99, 235, 0.4)"
        }}
        title="Cum găsesc ce mă interesează?"
        aria-label="Deschide conversația"
      >
        Cum găsesc ce mă interesează?
      </button>
    )
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: "1.5rem",
        right: "1.5rem",
        width: "24rem",
        maxHeight: "36rem",
        borderRadius: "1rem",
        backgroundColor: "white",
        border: "1px solid #e5e7eb",
        boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
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
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "#f9fafb",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div
            style={{
              width: "0.5rem",
              height: "0.5rem",
              borderRadius: "50%",
              backgroundColor: "#22c55e",
            }}
          />
          <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111827" }}>
            Asistent JobGrade
          </span>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {messages.length > 0 && (
            <button
              onClick={handleNewConversation}
              style={{
                padding: "0.25rem 0.5rem",
                fontSize: "0.7rem",
                color: "#6b7280",
                background: "none",
                border: "1px solid #e5e7eb",
                borderRadius: "0.375rem",
                cursor: "pointer",
              }}
              title="Conversație nouă"
            >
              Nou
            </button>
          )}
          <button
            onClick={() => setIsOpen(false)}
            style={{
              padding: "0.25rem 0.5rem",
              fontSize: "0.875rem",
              color: "#6b7280",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            x
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "0.75rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          minHeight: "12rem",
          maxHeight: "24rem",
        }}
      >
        {messages.length === 0 && (
          <div style={{ textAlign: "center", padding: "2rem 1rem", color: "#9ca3af" }}>
            <p style={{ fontSize: "0.875rem", marginBottom: "0.5rem" }}>
              Bună! Sunt asistentul tău.
            </p>
            <p style={{ fontSize: "0.75rem" }}>
              Spune-mi cu ce te pot ajuta sau ce vrei să înțelegi mai bine.
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                maxWidth: "85%",
                padding: "0.5rem 0.75rem",
                borderRadius: "0.75rem",
                fontSize: "0.8125rem",
                lineHeight: "1.4",
                backgroundColor: msg.role === "user" ? "#2563eb" : "#f3f4f6",
                color: msg.role === "user" ? "white" : "#111827",
                borderBottomRightRadius: msg.role === "user" ? "0.25rem" : "0.75rem",
                borderBottomLeftRadius: msg.role === "assistant" ? "0.25rem" : "0.75rem",
                whiteSpace: "pre-wrap",
              }}
            >
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
              Se gândește...
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
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Întreabă orice..."
          disabled={loading}
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
          disabled={loading || !input.trim()}
          style={{
            padding: "0.5rem 0.75rem",
            backgroundColor: loading || !input.trim() ? "#d1d5db" : "#2563eb",
            color: "white",
            border: "none",
            borderRadius: "0.5rem",
            fontSize: "0.8125rem",
            cursor: loading || !input.trim() ? "default" : "pointer",
          }}
        >
          Trimite
        </button>
      </div>
    </div>
  )
}
