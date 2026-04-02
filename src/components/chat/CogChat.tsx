"use client"

import { useState, useRef, useEffect } from "react"

interface Message {
  role: "owner" | "cog"
  content: string
  timestamp: string
  calibration?: {
    flags: Array<{ layer: string; severity: string; message: string; suggestion?: string }>
    isAligned: boolean
  }
}

export default function CogChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "cog",
      content: "Bună! Sunt COG — consilierul tău strategic. Întreabă-mă orice despre echipă, evaluare, strategie sau platformă. Cu ce pot începe?",
      timestamp: new Date().toISOString(),
    },
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function sendMessage() {
    if (!input.trim() || loading) return

    const ownerMessage = input.trim()
    setInput("")
    setLoading(true)

    // Adaugă mesajul Owner
    const newMessages: Message[] = [
      ...messages,
      { role: "owner", content: ownerMessage, timestamp: new Date().toISOString() },
    ]
    setMessages(newMessages)

    try {
      // Construiește history pentru context
      const history = newMessages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const response = await fetch("/api/v1/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: ownerMessage, history }),
      })

      if (!response.ok) {
        throw new Error(`${response.status}`)
      }

      const data = await response.json()

      const cogMessage: Message = {
        role: "cog",
        content: data.cogAnswer || data.error || "Nu am putut genera un răspuns.",
        timestamp: new Date().toISOString(),
        calibration: data.ownerCalibration,
      }

      setMessages([...newMessages, cogMessage])
    } catch (err: any) {
      setMessages([
        ...newMessages,
        {
          role: "cog",
          content: "Conexiunea cu echipa nu e disponibilă momentan. Încearcă din nou.",
          timestamp: new Date().toISOString(),
        },
      ])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-surface overflow-hidden" style={{ height: "calc(100vh - 12rem)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-indigo/5">
        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-indigo/10">
          <svg className="w-5 h-5 text-indigo" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Echipa ta JobGrade</h3>
          <p className="text-[11px] text-text-secondary">Dialog cu COG — consilier strategic</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
          <span className="text-[11px] text-text-secondary">Activ</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "owner" ? "flex-row-reverse" : ""}`}>
            {/* Avatar */}
            <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5 ${
              msg.role === "cog" ? "bg-indigo/10" : "bg-coral/10"
            }`}>
              {msg.role === "cog" ? (
                <svg className="w-4 h-4 text-indigo" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                </svg>
              ) : (
                <span className="text-xs font-semibold text-coral">Tu</span>
              )}
            </div>

            {/* Bubble */}
            <div className={`max-w-[80%] ${
              msg.role === "cog"
                ? "bg-indigo/5 rounded-2xl rounded-tl-sm"
                : "bg-coral/5 rounded-2xl rounded-tr-sm"
            } px-4 py-3`}>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {msg.content}
              </p>
              <p className="text-[10px] text-text-secondary/40 mt-2">
                {new Date(msg.timestamp).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
              </p>

              {/* Calibration flags */}
              {msg.calibration && msg.calibration.flags.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/30 space-y-2">
                  <p className="text-[10px] font-semibold text-text-secondary/60 uppercase tracking-wider">
                    Calibrare
                  </p>
                  {msg.calibration.flags.map((flag, fi) => (
                    <div key={fi} className={`text-[11px] leading-relaxed px-2.5 py-1.5 rounded-lg ${
                      flag.severity === "CRITIC" ? "bg-red-50 text-red-700" :
                      flag.severity === "IMPORTANT" ? "bg-orange-50 text-orange-700" :
                      flag.severity === "ATENȚIE" ? "bg-yellow-50 text-yellow-700" :
                      "bg-gray-50 text-gray-600"
                    }`}>
                      <span className="font-medium">[{flag.layer}]</span> {flag.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="flex gap-3">
            <div className="shrink-0 w-8 h-8 rounded-full bg-indigo/10 flex items-center justify-center mt-0.5">
              <svg className="w-4 h-4 text-indigo animate-pulse" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
              </svg>
            </div>
            <div className="bg-indigo/5 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo/30 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-indigo/30 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-indigo/30 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Scrie mesajul tău..."
            disabled={loading}
            className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-text-secondary/50 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-indigo/20 focus:border-indigo/30"
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-coral text-white disabled:opacity-40 hover:bg-coral-dark transition-colors"
            aria-label="Trimite mesaj"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
