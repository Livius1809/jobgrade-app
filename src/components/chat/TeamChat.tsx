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
  agentName?: string
  isCC?: boolean
}

type FilterMode = "all" | "strategic" | "tactical" | "operational" | "support"
type ChatMode = "single" | "group"

// ── Component ────────────────────────────────────────────────────────────────

export default function TeamChat({ agents }: { agents: AgentInfo[] }) {
  const [chatMode, setChatMode] = useState<ChatMode>("single")
  const [selectedAgent, setSelectedAgent] = useState<AgentInfo | null>(null)
  const [toAgents, setToAgents] = useState<AgentInfo[]>([])
  const [ccAgents, setCcAgents] = useState<AgentInfo[]>([])
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
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      if (!a.displayName.toLowerCase().includes(term) &&
          !a.agentRole.toLowerCase().includes(term) &&
          !a.description.toLowerCase().includes(term)) return false
    }
    if (filterMode === "strategic") return a.level === "STRATEGIC"
    if (filterMode === "tactical") return a.level === "TACTICAL"
    if (filterMode === "operational") return a.level === "OPERATIONAL"
    if (filterMode === "support") return !a.isManager && a.level === "OPERATIONAL"
    return true
  })

  const managers = filteredAgents.filter(a => a.isManager)
  const operationals = filteredAgents.filter(a => !a.isManager)

  // ── Selectare agent (single mode) ──────────────────────────────────────

  function selectAgent(agent: AgentInfo) {
    if (chatMode === "single") {
      setSelectedAgent(agent)
      setToAgents([])
      setCcAgents([])
      setMessages([{
        role: "agent",
        content: `Sunt ${agent.displayName}. ${agent.description.substring(0, 120)}. Cu ce te pot ajuta?`,
        timestamp: new Date().toISOString(),
        agentRole: agent.agentRole,
        agentName: agent.displayName,
      }])
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  // ── Toggle TO/CC (group mode) ──────────────────────────────────────────

  function toggleTO(agent: AgentInfo) {
    // Dacă e deja în CC, scoate-l
    setCcAgents(prev => prev.filter(a => a.agentRole !== agent.agentRole))
    setToAgents(prev => {
      if (prev.some(a => a.agentRole === agent.agentRole)) {
        return prev.filter(a => a.agentRole !== agent.agentRole)
      }
      return [...prev, agent]
    })
  }

  function toggleCC(agent: AgentInfo) {
    // Dacă e deja în TO, scoate-l
    setToAgents(prev => prev.filter(a => a.agentRole !== agent.agentRole))
    setCcAgents(prev => {
      if (prev.some(a => a.agentRole === agent.agentRole)) {
        return prev.filter(a => a.agentRole !== agent.agentRole)
      }
      return [...prev, agent]
    })
  }

  function getAgentStatus(agent: AgentInfo): "to" | "cc" | "none" {
    if (toAgents.some(a => a.agentRole === agent.agentRole)) return "to"
    if (ccAgents.some(a => a.agentRole === agent.agentRole)) return "cc"
    return "none"
  }

  // ── Trimitere mesaj ──────────────────────────────────────────────────────

  async function sendMessage() {
    if (!input.trim() || loading) return

    const isSingle = chatMode === "single"
    if (isSingle && !selectedAgent) return
    if (!isSingle && toAgents.length === 0) return

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

      if (isSingle) {
        // Mod single — un singur agent
        const response = await fetch("/api/v1/team-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: ownerMessage, targetAgent: selectedAgent!.agentRole, history }),
        })
        if (!response.ok) throw new Error(`${response.status}`)
        const data = await response.json()
        setMessages(prev => [...prev, {
          role: "agent",
          content: data.answer || "Nu am putut genera un răspuns.",
          timestamp: new Date().toISOString(),
          agentRole: selectedAgent!.agentRole,
          agentName: selectedAgent!.displayName,
        }])
      } else {
        // Mod grup — TO + CC primesc același mesaj
        const allTargets = [
          ...toAgents.map(a => ({ ...a, isCC: false })),
          ...ccAgents.map(a => ({ ...a, isCC: true })),
        ]

        const responses = await Promise.all(
          allTargets.map(async (target) => {
            try {
              const res = await fetch("/api/v1/team-chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  message: ownerMessage,
                  targetAgent: target.agentRole,
                  history,
                  context: target.isCC
                    ? `Ești în CC pe acest mesaj. TO: ${toAgents.map(a => a.displayName).join(", ")}. Monitorizezi și te asiguri că cerința Owner-ului va fi îndeplinită. Nu executa tu — urmărește execuția.`
                    : `Ești destinatarul principal (TO). ${ccAgents.length > 0 ? `În CC: ${ccAgents.map(a => a.displayName).join(", ")} — ei monitorizează îndeplinirea.` : ""} Răspunde la cerința Owner-ului.`,
                }),
              })
              if (!res.ok) return { agent: target, answer: "Eroare conexiune.", isCC: target.isCC }
              const data = await res.json()
              return { agent: target, answer: data.answer || "Fără răspuns.", isCC: target.isCC }
            } catch {
              return { agent: target, answer: "Nu am putut contacta agentul.", isCC: target.isCC }
            }
          })
        )

        // Adaugăm răspunsurile — TO primele, CC după
        const toResponses = responses.filter(r => !r.isCC)
        const ccResponses = responses.filter(r => r.isCC)

        for (const r of [...toResponses, ...ccResponses]) {
          setMessages(prev => [...prev, {
            role: "agent",
            content: r.answer,
            timestamp: new Date().toISOString(),
            agentRole: r.agent.agentRole,
            agentName: r.agent.displayName,
            isCC: r.isCC,
          }])
        }
      }
    } catch {
      setMessages(prev => [...prev, {
        role: "agent",
        content: "Conexiunea nu e disponibilă momentan.",
        timestamp: new Date().toISOString(),
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const hasRecipients = chatMode === "single" ? !!selectedAgent : toAgents.length > 0

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex gap-6" style={{ height: "calc(100vh - 14rem)" }}>

      {/* ════════ LEFT: Agent selector ════════ */}
      <div className="w-[280px] shrink-0 flex flex-col rounded-2xl border border-border bg-surface overflow-hidden">

        {/* Header */}
        <div className="px-4 py-3 border-b border-border bg-indigo/5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-foreground">Discută cu echipa</h3>
            <div className="flex gap-1 bg-background rounded-lg p-0.5">
              <button
                onClick={() => { setChatMode("single"); setToAgents([]); setCcAgents([]) }}
                className={`text-[9px] px-2 py-1 rounded-md transition-colors ${chatMode === "single" ? "bg-indigo text-white" : "text-text-secondary"}`}
              >
                1:1
              </button>
              <button
                onClick={() => { setChatMode("group"); setSelectedAgent(null); setMessages([]) }}
                className={`text-[9px] px-2 py-1 rounded-md transition-colors ${chatMode === "group" ? "bg-indigo text-white" : "text-text-secondary"}`}
              >
                Grup
              </button>
            </div>
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Caută agent..."
            className="w-full text-xs px-3 py-1.5 rounded-lg border border-border bg-background placeholder:text-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-indigo/20"
          />
        </div>

        {/* TO/CC summary (group mode) */}
        {chatMode === "group" && (toAgents.length > 0 || ccAgents.length > 0) && (
          <div className="px-3 py-2 border-b border-border/50 bg-indigo/5 space-y-1">
            {toAgents.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[9px] font-bold text-indigo bg-indigo/10 px-1.5 py-0.5 rounded">TO</span>
                {toAgents.map(a => (
                  <span key={a.agentRole} className="text-[9px] text-indigo bg-indigo/10 px-1.5 py-0.5 rounded-full">
                    {a.agentRole}
                    <button onClick={() => toggleTO(a)} className="ml-1 text-indigo/50 hover:text-red-500">×</button>
                  </span>
                ))}
              </div>
            )}
            {ccAgents.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">CC</span>
                {ccAgents.map(a => (
                  <span key={a.agentRole} className="text-[9px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
                    {a.agentRole}
                    <button onClick={() => toggleCC(a)} className="ml-1 text-amber-500/50 hover:text-red-500">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

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
                filterMode === key ? "bg-indigo text-white" : "text-text-secondary hover:bg-indigo/5"
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
                  status={chatMode === "group" ? getAgentStatus(agent) : selectedAgent?.agentRole === agent.agentRole ? "to" : "none"}
                  mode={chatMode}
                  onClick={() => chatMode === "single" ? selectAgent(agent) : toggleTO(agent)}
                  onCCClick={chatMode === "group" ? () => toggleCC(agent) : undefined}
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
                  status={chatMode === "group" ? getAgentStatus(agent) : selectedAgent?.agentRole === agent.agentRole ? "to" : "none"}
                  mode={chatMode}
                  onClick={() => chatMode === "single" ? selectAgent(agent) : toggleTO(agent)}
                  onCCClick={chatMode === "group" ? () => toggleCC(agent) : undefined}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ════════ RIGHT: Chat area ════════ */}
      <div className="flex-1 flex flex-col rounded-2xl border border-border bg-surface overflow-hidden">
        {hasRecipients ? (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-indigo/5">
              {chatMode === "single" && selectedAgent && (
                <>
                  <div className="w-8 h-8 rounded-full bg-indigo/10 flex items-center justify-center">
                    <span className="text-xs font-bold text-indigo">{selectedAgent.agentRole.substring(0, 2)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-foreground truncate">{selectedAgent.displayName}</h4>
                    <p className="text-[10px] text-text-secondary truncate">{selectedAgent.agentRole} · {selectedAgent.level}</p>
                  </div>
                </>
              )}
              {chatMode === "group" && (
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-foreground">
                    Conversație grup
                    <span className="ml-2 text-xs font-normal text-text-secondary">
                      TO: {toAgents.map(a => a.agentRole).join(", ")}
                      {ccAgents.length > 0 && ` · CC: ${ccAgents.map(a => a.agentRole).join(", ")}`}
                    </span>
                  </h4>
                </div>
              )}
              <button
                onClick={() => { setSelectedAgent(null); setToAgents([]); setCcAgents([]); setMessages([]) }}
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
                    msg.role === "agent"
                      ? msg.isCC ? "bg-amber-100" : "bg-indigo/10"
                      : "bg-coral/10"
                  }`}>
                    {msg.role === "agent" ? (
                      <span className={`text-[9px] font-bold ${msg.isCC ? "text-amber-700" : "text-indigo"}`}>
                        {(msg.agentRole || "?").substring(0, 2)}
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold text-coral">Tu</span>
                    )}
                  </div>
                  <div className={`max-w-[80%] ${
                    msg.role === "agent"
                      ? msg.isCC
                        ? "bg-amber-50 rounded-2xl rounded-tl-sm"
                        : "bg-indigo/5 rounded-2xl rounded-tl-sm"
                      : "bg-coral/5 rounded-2xl rounded-tr-sm"
                  } px-4 py-3 text-sm leading-relaxed text-foreground`}>
                    {msg.role === "agent" && chatMode === "group" && (
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-[10px] font-bold text-foreground/80">{msg.agentName || msg.agentRole}</span>
                        {msg.isCC && <span className="text-[8px] text-amber-600 bg-amber-100 px-1 py-0.5 rounded">CC</span>}
                      </div>
                    )}
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-indigo/10 flex items-center justify-center">
                    <span className="text-[9px] font-bold text-indigo animate-pulse">...</span>
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
                  placeholder={
                    chatMode === "single"
                      ? `Scrie catre ${selectedAgent?.displayName}...`
                      : `Scrie catre ${toAgents.map(a => a.agentRole).join(", ")}${ccAgents.length > 0 ? ` (CC: ${ccAgents.map(a => a.agentRole).join(", ")})` : ""}...`
                  }
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
                <ReportRequestButton
                  targetRole={chatMode === "single" ? selectedAgent?.agentRole : toAgents[0]?.agentRole}
                  targetName={chatMode === "single" ? selectedAgent?.displayName : toAgents[0]?.displayName}
                />
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
              <h3 className="text-lg font-semibold text-foreground/60 mb-2">
                {chatMode === "single" ? "Selectează un agent" : "Alege destinatari"}
              </h3>
              <p className="text-sm text-text-secondary/50 max-w-xs">
                {chatMode === "single"
                  ? "Alege din lista din stânga cu cine vrei să discuți."
                  : "Click pe un agent pentru TO (destinatar), click pe CC pentru monitorizare. Toți văd același mesaj."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Agent list item ─────────────────────────────────────────────────────────

function AgentItem({
  agent, selected, status, mode, onClick, onCCClick,
}: {
  agent: AgentInfo
  selected: boolean
  status: "to" | "cc" | "none"
  mode: ChatMode
  onClick: () => void
  onCCClick?: () => void
}) {
  const levelColors: Record<string, string> = {
    STRATEGIC: "bg-indigo/10 text-indigo",
    TACTICAL: "bg-coral/10 text-coral",
    OPERATIONAL: "bg-green-100 text-green-700",
  }

  return (
    <div
      className={`w-full text-left px-3 py-2.5 rounded-lg mb-1 transition-all flex items-center gap-2 ${
        status === "to"
          ? "bg-indigo/10 border border-indigo/20"
          : status === "cc"
            ? "bg-amber-50 border border-amber-200"
            : selected
              ? "bg-indigo/10 border border-indigo/20"
              : "hover:bg-background border border-transparent"
      }`}
    >
      <button onClick={onClick} className="flex-1 flex items-center gap-2 text-left min-w-0">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
          status === "to" ? "bg-indigo/20" : status === "cc" ? "bg-amber-200" : "bg-indigo/10"
        }`}>
          <span className={`text-[8px] font-bold ${status === "cc" ? "text-amber-700" : "text-indigo"}`}>
            {agent.agentRole.substring(0, 2)}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground truncate">{agent.displayName}</p>
          <p className="text-[9px] text-text-secondary/60 truncate">{agent.agentRole}</p>
        </div>
        <span className={`text-[8px] px-1 py-0.5 rounded ${levelColors[agent.level] || "bg-gray-100 text-gray-600"}`}>
          {agent.level?.substring(0, 3)}
        </span>
      </button>
      {mode === "group" && (
        <button
          onClick={(e) => { e.stopPropagation(); onCCClick?.() }}
          className={`text-[8px] font-bold px-1.5 py-0.5 rounded transition-colors shrink-0 ${
            status === "cc"
              ? "bg-amber-200 text-amber-800"
              : "bg-gray-100 text-gray-500 hover:bg-amber-100 hover:text-amber-700"
          }`}
          title="Adaugă în CC (monitorizare)"
        >
          CC
        </button>
      )}
    </div>
  )
}

// ── Buton "Cere raport" inline ──────────────────────────────────────────────

function ReportRequestButton({ targetRole, targetName }: { targetRole?: string; targetName?: string }) {
  const [open, setOpen] = useState(false)
  const [subject, setSubject] = useState("")
  const [sending, setSending] = useState(false)
  const [msg, setMsg] = useState("")

  if (!targetRole) return null

  async function send() {
    if (!subject.trim()) return
    setSending(true)
    try {
      const res = await fetch("/api/v1/owner/request-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetRole, subject: subject.trim() }),
      })
      const data = await res.json()
      if (data.ok) {
        setMsg("Cerere trimisa")
        setSubject("")
        setOpen(false)
        setTimeout(() => setMsg(""), 3000)
      } else {
        setMsg(data.error || "Eroare")
      }
    } catch { setMsg("Eroare conexiune") }
    setSending(false)
  }

  if (msg && !open) {
    return <span className="text-[9px] text-teal-600 shrink-0">{msg}</span>
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="shrink-0 text-[9px] font-medium text-teal-600 bg-teal-50 border border-teal-200 px-2.5 py-2 rounded-xl hover:bg-teal-100 transition-colors"
        title={`Cere raport scris de la ${targetName || targetRole}`}>
        Cere raport
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
        placeholder="Subiectul raportului..."
        onKeyDown={e => { if (e.key === "Enter") send(); if (e.key === "Escape") setOpen(false) }}
        autoFocus
        className="w-48 px-2.5 py-2 rounded-xl border border-teal-200 bg-teal-50 text-xs focus:outline-none focus:ring-2 focus:ring-teal-300" />
      <button onClick={send} disabled={sending || !subject.trim()}
        className="shrink-0 text-[9px] font-medium bg-teal-600 text-white px-2.5 py-2 rounded-xl hover:bg-teal-700 disabled:opacity-40 transition-colors">
        {sending ? "..." : "Trimite"}
      </button>
      <button onClick={() => setOpen(false)}
        className="shrink-0 text-[9px] text-slate-400 hover:text-slate-600 px-1">
        x
      </button>
    </div>
  )
}
