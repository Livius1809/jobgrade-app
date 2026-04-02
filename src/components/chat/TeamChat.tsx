"use client"

import { useState, useRef, useEffect } from "react"

// ── Types ────────────────────────────────────────────────────────────────────

interface AgentInfo {
  agentRole: string
  displayName: string
  description: string
  level: string
  isManager: boolean
  parentRole?: string
}

interface Message {
  role: "owner" | "agent"
  content: string
  timestamp: string
  agentRole?: string
}

type FilterMode = "all" | "strategic" | "tactical" | "operational" | "support"

// ── Component ────────────────────────────────────────────────────────────────

export default function TeamChat({ agents }: { agents: AgentInfo[] }) {
  const [selectedAgent, setSelectedAgent] = useState<AgentInfo | null>(null)
  const [filterMode, setFilterMode] = useState<FilterMode>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // ── Filtrare agenți ──────────────────────────────────────────────────────

  const filteredAgents = agents.filter((a) => {
    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      if (!a.displayName.toLowerCase().includes(term) &&
          !a.agentRole.toLowerCase().includes(term) &&
          !a.description.toLowerCase().includes(term)) return false
    }
    // Filter by level
    if (filterMode === "strategic") return a.level === "STRATEGIC"
    if (filterMode === "tactical") return a.level === "TACTICAL"
    if (filterMode === "operational") return a.level === "OPERATIONAL"
    if (filterMode === "support") return !a.isManager && a.level === "OPERATIONAL"
    return true
  })

  // Grupare pe categorii
  const managers = filteredAgents.filter(a => a.isManager)
  const operationals = filteredAgents.filter(a => !a.isManager)

  // ── Selectare agent ──────────────────────────────────────────────────────

  function selectAgent(agent: AgentInfo) {
    setSelectedAgent(agent)
    setMessages([{
      role: "agent",
      content: `Bună! Sunt ${agent.displayName}. ${agent.description.substring(0, 120)}. Cu ce te pot ajuta?`,
      timestamp: new Date().toISOString(),
      agentRole: agent.agentRole,
    }])
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  // ── Trimitere mesaj ──────────────────────────────────────────────────────

  async function sendMessage() {
    if (!input.trim() || loading || !selectedAgent) return

    const ownerMessage = input.trim()
    setInput("")
    setLoading(true)

    const newMessages: Message[] = [
      ...messages,
      { role: "owner", content: ownerMessage, timestamp: new Date().toISOString() },
    ]
    setMessages(newMessages)

    try {
      const history = newMessages.slice(-10).map(m => ({
        role: m.role === "owner" ? "owner" : "cog",
        content: m.content,
      }))

      const response = await fetch("/api/v1/team-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: ownerMessage,
          targetAgent: selectedAgent.agentRole,
          history,
        }),
      })

      if (!response.ok) throw new Error(`${response.status}`)
      const data = await response.json()

      setMessages([...newMessages, {
        role: "agent",
        content: data.answer || data.cogAnswer || "Nu am putut genera un răspuns.",
        timestamp: new Date().toISOString(),
        agentRole: selectedAgent.agentRole,
      }])
    } catch {
      setMessages([...newMessages, {
        role: "agent",
        content: "Conexiunea nu e disponibilă momentan. Încearcă din nou.",
        timestamp: new Date().toISOString(),
        agentRole: selectedAgent.agentRole,
      }])
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

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex gap-6" style={{ height: "calc(100vh - 14rem)" }}>

      {/* ════════ LEFT: Agent selector ════════ */}
      <div className="w-[280px] shrink-0 flex flex-col rounded-2xl border border-border bg-surface overflow-hidden">

        {/* Header */}
        <div className="px-4 py-3 border-b border-border bg-indigo/5">
          <h3 className="text-sm font-semibold text-foreground mb-2">Discută cu echipa</h3>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Caută agent..."
            className="w-full text-xs px-3 py-1.5 rounded-lg border border-border bg-background placeholder:text-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-indigo/20"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-border/50">
          {([
            ["all", "Toți"],
            ["strategic", "Strategie"],
            ["tactical", "Tactic"],
            ["operational", "Operațional"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilterMode(key)}
              className={`text-[10px] font-medium px-2 py-1 rounded-md transition-colors ${
                filterMode === key
                  ? "bg-indigo text-white"
                  : "text-text-secondary hover:bg-indigo/5"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Agent list */}
        <div className="flex-1 overflow-y-auto">
          {managers.length > 0 && (
            <div className="px-3 pt-3">
              <p className="text-[9px] font-bold uppercase tracking-widest text-text-secondary/50 mb-2">Manageri</p>
              {managers.map((agent) => (
                <AgentItem
                  key={agent.agentRole}
                  agent={agent}
                  selected={selectedAgent?.agentRole === agent.agentRole}
                  onClick={() => selectAgent(agent)}
                />
              ))}
            </div>
          )}
          {operationals.length > 0 && (
            <div className="px-3 pt-3 pb-3">
              <p className="text-[9px] font-bold uppercase tracking-widest text-text-secondary/50 mb-2">Agenți</p>
              {operationals.map((agent) => (
                <AgentItem
                  key={agent.agentRole}
                  agent={agent}
                  selected={selectedAgent?.agentRole === agent.agentRole}
                  onClick={() => selectAgent(agent)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ════════ RIGHT: Chat area ════════ */}
      <div className="flex-1 flex flex-col rounded-2xl border border-border bg-surface overflow-hidden">
        {selectedAgent ? (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-indigo/5">
              <div className="w-8 h-8 rounded-full bg-indigo/10 flex items-center justify-center">
                <span className="text-xs font-bold text-indigo">{selectedAgent.agentRole.substring(0, 2)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-foreground truncate">{selectedAgent.displayName}</h4>
                <p className="text-[10px] text-text-secondary truncate">{selectedAgent.agentRole} · {selectedAgent.level}</p>
              </div>
              <button
                onClick={() => { setSelectedAgent(null); setMessages([]) }}
                className="text-xs text-text-secondary/50 hover:text-coral transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === "owner" ? "flex-row-reverse" : ""}`}>
                  <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5 ${
                    msg.role === "agent" ? "bg-indigo/10" : "bg-coral/10"
                  }`}>
                    {msg.role === "agent" ? (
                      <span className="text-[9px] font-bold text-indigo">{selectedAgent.agentRole.substring(0, 2)}</span>
                    ) : (
                      <span className="text-[9px] font-bold text-coral">Tu</span>
                    )}
                  </div>
                  <div className={`max-w-[80%] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "agent"
                      ? "bg-indigo/5 rounded-2xl rounded-tl-sm text-foreground"
                      : "bg-coral/5 rounded-2xl rounded-tr-sm text-foreground"
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-indigo/10 flex items-center justify-center">
                    <span className="text-[9px] font-bold text-indigo animate-pulse">{selectedAgent.agentRole.substring(0, 2)}</span>
                  </div>
                  <div className="bg-indigo/5 rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo/30 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo/30 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo/30 animate-bounce" style={{ animationDelay: "300ms" }} />
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
                  placeholder={`Scrie către ${selectedAgent.displayName}...`}
                  disabled={loading}
                  className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm placeholder:text-text-secondary/50 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-indigo/20"
                />
                <button
                  onClick={sendMessage}
                  disabled={loading || !input.trim()}
                  className="shrink-0 w-10 h-10 rounded-xl bg-coral text-white disabled:opacity-40 hover:bg-coral-dark transition-colors flex items-center justify-center"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                  </svg>
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex-1 flex items-center justify-center text-center px-8">
            <div>
              <div className="w-16 h-16 rounded-full bg-indigo/5 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-indigo/30" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-foreground/60 mb-2">Selectează un agent</h3>
              <p className="text-sm text-text-secondary/50 max-w-xs">
                Alege din lista din stânga cu cine vrei să discuți. Poți filtra pe nivel ierarhic sau căuta după nume.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Agent list item ─────────────────────────────────────────────────────────

function AgentItem({ agent, selected, onClick }: { agent: AgentInfo; selected: boolean; onClick: () => void }) {
  const levelColors: Record<string, string> = {
    STRATEGIC: "bg-indigo/10 text-indigo",
    TACTICAL: "bg-coral/10 text-coral",
    OPERATIONAL: "bg-green-100 text-green-700",
  }

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 rounded-lg mb-1 transition-all ${
        selected
          ? "bg-indigo/10 border border-indigo/20"
          : "hover:bg-background border border-transparent"
      }`}
    >
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-indigo/10 flex items-center justify-center shrink-0">
          <span className="text-[8px] font-bold text-indigo">{agent.agentRole.substring(0, 2)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground truncate">{agent.displayName}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`text-[8px] font-medium px-1.5 py-0.5 rounded ${levelColors[agent.level] || "bg-gray-100 text-gray-600"}`}>
              {agent.level}
            </span>
            {agent.isManager && (
              <span className="text-[8px] text-text-secondary/50">mgr</span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}
