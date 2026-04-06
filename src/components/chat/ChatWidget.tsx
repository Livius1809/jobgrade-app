"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { usePathname, useRouter } from "next/navigation"
import { getAgentForPath, getAgentEndpoint, getAgentMeta } from "@/lib/chat/agent-router"
import { parseActions, executeActions } from "@/lib/chat/action-handler"
import { useConversation } from "@elevenlabs/react"
import { VoiceProvider } from "@/components/chat/VoiceProvider"
import { getVoiceAgentId, isVoiceEnabled, VOICE_CONFIG } from "@/lib/voice/config"
import type { ChatMessage, AgentRole, WidgetState } from "@/lib/chat/types"
import type { VoiceMode } from "@/lib/voice/types"
import { VOICE_STATUS_LABELS } from "@/lib/voice/types"

// ── Helpers ─────────────────────────────────────────────────────────────────

let messageCounter = 0
function generateId(): string {
  return `msg_${Date.now()}_${++messageCounter}`
}

// ── Wrapper — provides ConversationProvider context ─────────────────────────

export default function ChatWidget() {
  return (
    <VoiceProvider>
      <ChatWidgetInner />
    </VoiceProvider>
  )
}

// ── Inner Component ─────────────────────────────────────────────────────────

function ChatWidgetInner() {
  const pathname = usePathname()
  const router = useRouter()

  const [widgetState, setWidgetState] = useState<WidgetState>("collapsed")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [threadId, setThreadId] = useState<string | null>(null)
  const [currentAgent, setCurrentAgent] = useState<AgentRole>(() =>
    getAgentForPath(pathname)
  )

  // ── Voice state ─────────────────────────────────────────────────────────
  const [voiceMode, setVoiceMode] = useState<VoiceMode>("idle")
  const voiceEnabledForAgent = isVoiceEnabled(currentAgent)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // ── ElevenLabs conversation hook ────────────────────────────────────────
  const conversation = useConversation({
    onConnect: () => {
      setVoiceMode("listening")
    },
    onDisconnect: () => {
      setVoiceMode("idle")
    },
    onError: (message) => {
      console.error("[voice] Error:", message)
      setVoiceMode("idle")
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "assistant",
          content: "A apărut o eroare cu conexiunea vocală. Vă rog să reîncercați.",
          timestamp: new Date(),
          agentRole: currentAgent,
        },
      ])
    },
    onMessage: (props) => {
      const { message, role } = props
      if (!message.trim()) return

      const msgRole = role === "user" ? "user" : "assistant"

      if (msgRole === "assistant") {
        // Parse actions from voice response
        const { cleanText, actions } = parseActions(message)

        if (cleanText.trim()) {
          setMessages((prev) => [
            ...prev,
            {
              id: generateId(),
              role: "assistant",
              content: cleanText,
              timestamp: new Date(),
              agentRole: currentAgent,
            },
          ])
        }

        // Execute actions (e.g., navigation)
        if (actions.length > 0) {
          executeActions(actions, router)
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: generateId(),
            role: "user",
            content: message,
            timestamp: new Date(),
          },
        ])
      }
    },
    onModeChange: (props) => {
      if (props.mode === "speaking") {
        setVoiceMode("speaking")
      } else {
        setVoiceMode("listening")
      }
    },
  })

  // ── Start voice session ─────────────────────────────────────────────────
  const handleStartVoice = useCallback(async () => {
    const agentId = getVoiceAgentId(currentAgent)
    if (!agentId) {
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "assistant",
          content: "Modul vocal nu este configurat pentru acest agent. Contactați administratorul.",
          timestamp: new Date(),
          agentRole: currentAgent,
        },
      ])
      return
    }

    setVoiceMode("connecting")

    try {
      await conversation.startSession({
        agentId,
        overrides: {
          agent: {
            language: VOICE_CONFIG.defaultLanguage,
          },
        },
      })
    } catch (err) {
      console.error("[voice] Failed to start session:", err)
      setVoiceMode("idle")
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "assistant",
          content: "Nu s-a putut porni sesiunea vocală. Verificați microfonul și reîncercați.",
          timestamp: new Date(),
          agentRole: currentAgent,
        },
      ])
    }
  }, [currentAgent, conversation])

  // ── Stop voice session ──────────────────────────────────────────────────
  const handleStopVoice = useCallback(async () => {
    try {
      await conversation.endSession()
    } catch {
      // Already disconnected
    }
    setVoiceMode("idle")
  }, [conversation])

  // ── Update agent when path changes (only if no active conversation) ─────
  useEffect(() => {
    if (messages.length === 0) {
      setCurrentAgent(getAgentForPath(pathname))
    }
  }, [pathname, messages.length])

  // ── Auto-scroll to latest message ───────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // ── Focus input when expanded ───────────────────────────────────────────
  useEffect(() => {
    if (widgetState === "expanded" && inputRef.current && voiceMode === "idle") {
      inputRef.current.focus()
    }
  }, [widgetState, voiceMode])

  // ── Clean up voice on unmount or collapse ───────────────────────────────
  useEffect(() => {
    if (widgetState === "collapsed" && voiceMode !== "idle") {
      handleStopVoice()
    }
  }, [widgetState, voiceMode, handleStopVoice])

  // ── Send message (text mode) ────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput("")

    const userMsg: ChatMessage = {
      id: generateId(),
      role: "user",
      content: userMessage,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMsg])
    setLoading(true)

    try {
      const endpoint = getAgentEndpoint(currentAgent)
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          threadId: threadId ?? undefined,
        }),
      })

      const json = await res.json()

      if (res.ok && json.reply) {
        // Parse actions from the response
        const { cleanText, actions } = parseActions(json.reply)

        const assistantMsg: ChatMessage = {
          id: generateId(),
          role: "assistant",
          content: cleanText,
          timestamp: new Date(),
          agentRole: currentAgent,
        }
        setMessages((prev) => [...prev, assistantMsg])

        if (json.threadId) {
          setThreadId(json.threadId)
        }

        // Execute actions silently
        if (actions.length > 0) {
          executeActions(actions, router)
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: generateId(),
            role: "assistant",
            content: json.error || "Scuze, a apărut o eroare. Vă rog să reîncercați.",
            timestamp: new Date(),
            agentRole: currentAgent,
          },
        ])
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "assistant",
          content: "Nu pot comunica cu serverul. Verificați conexiunea.",
          timestamp: new Date(),
          agentRole: currentAgent,
        },
      ])
    } finally {
      setLoading(false)
    }
  }, [input, loading, currentAgent, threadId, router])

  // ── New conversation ────────────────────────────────────────────────────
  const handleNewConversation = useCallback(async () => {
    if (voiceMode !== "idle") {
      await handleStopVoice()
    }
    setMessages([])
    setThreadId(null)
    setCurrentAgent(getAgentForPath(pathname))
  }, [pathname, voiceMode, handleStopVoice])

  // ── Agent info ──────────────────────────────────────────────────────────
  const agentMeta = getAgentMeta(currentAgent)
  const isVoiceActive = voiceMode !== "idle"

  // ═══════════════════════════════════════════════════════════════════════════
  // COLLAPSED STATE — small floating bubble
  // ═══════════════════════════════════════════════════════════════════════════

  if (widgetState === "collapsed") {
    return (
      <button
        onClick={() => setWidgetState("expanded")}
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-12 h-12 rounded-full bg-indigo-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 cursor-pointer"
        title="Cum vă putem ajuta?"
        aria-label="Deschide conversația cu asistentul"
      >
        {/* Chat bubble icon */}
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPANDED STATE — chat panel
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div
      className={[
        "fixed z-50 flex flex-col bg-white border border-gray-200 shadow-2xl overflow-hidden",
        // Mobile: full width, bottom-anchored
        "bottom-0 right-0 w-full h-[85vh] rounded-t-2xl",
        // Desktop: bottom-right corner, fixed size
        "sm:bottom-6 sm:right-6 sm:w-[400px] sm:h-[500px] sm:rounded-2xl",
      ].join(" ")}
      role="dialog"
      aria-label="Chat cu asistentul JobGrade"
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={[
              "w-2 h-2 rounded-full shrink-0",
              isVoiceActive ? "bg-red-500 animate-pulse" : "bg-green-500",
            ].join(" ")}
          />
          <span className="text-sm font-semibold text-gray-900 truncate">
            Asistent JobGrade
          </span>
          <span className="text-[0.65rem] text-gray-400 truncate">
            {isVoiceActive ? VOICE_STATUS_LABELS[voiceMode] : agentMeta.label}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {messages.length > 0 && (
            <button
              onClick={handleNewConversation}
              className="px-2 py-1 text-[0.65rem] text-gray-500 border border-gray-200 rounded hover:bg-gray-100 transition-colors cursor-pointer"
              title="Conversație nouă"
            >
              Nou
            </button>
          )}
          <button
            onClick={() => setWidgetState("collapsed")}
            className="px-2 py-1 text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
            aria-label="Minimizează"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Messages ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        {messages.length === 0 && (
          <div className="text-center py-10 px-4 text-gray-400">
            <p className="text-sm mb-1">
              Cum vă putem ajuta?
            </p>
            <p className="text-xs">
              {agentMeta.description}
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={[
                "max-w-[85%] px-3 py-2 text-[0.8125rem] leading-relaxed whitespace-pre-wrap",
                msg.role === "user"
                  ? "bg-indigo-600 text-white rounded-2xl rounded-br-sm"
                  : "bg-gray-100 text-gray-900 rounded-2xl rounded-bl-sm",
              ].join(" ")}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="px-3 py-2 rounded-2xl rounded-bl-sm bg-gray-100 text-gray-400 text-[0.8125rem]">
              <span className="inline-flex gap-1">
                <span className="animate-pulse">.</span>
                <span className="animate-pulse" style={{ animationDelay: "150ms" }}>.</span>
                <span className="animate-pulse" style={{ animationDelay: "300ms" }}>.</span>
              </span>
            </div>
          </div>
        )}

        {/* Voice mode indicator in message area */}
        {isVoiceActive && (
          <div className="flex justify-center">
            <div className="px-4 py-2 rounded-full bg-indigo-50 text-indigo-600 text-[0.75rem] font-medium flex items-center gap-2">
              {voiceMode === "connecting" && (
                <>
                  <span className="inline-block w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                  Se conectează...
                </>
              )}
              {voiceMode === "listening" && (
                <>
                  <span className="inline-flex gap-0.5">
                    <span className="w-1 h-3 bg-indigo-500 rounded-full animate-pulse" />
                    <span className="w-1 h-4 bg-indigo-500 rounded-full animate-pulse" style={{ animationDelay: "100ms" }} />
                    <span className="w-1 h-2 bg-indigo-500 rounded-full animate-pulse" style={{ animationDelay: "200ms" }} />
                    <span className="w-1 h-4 bg-indigo-500 rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
                    <span className="w-1 h-3 bg-indigo-500 rounded-full animate-pulse" style={{ animationDelay: "400ms" }} />
                  </span>
                  Ascult...
                </>
              )}
              {voiceMode === "speaking" && (
                <>
                  <span className="inline-flex gap-0.5">
                    <span className="w-1 h-4 bg-green-500 rounded-full animate-pulse" />
                    <span className="w-1 h-2 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
                    <span className="w-1 h-5 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
                    <span className="w-1 h-3 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
                    <span className="w-1 h-4 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
                  </span>
                  Vorbește...
                </>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input ──────────────────────────────────────────────────────── */}
      <div className="shrink-0 px-3 py-2 border-t border-gray-200 flex gap-2">
        {isVoiceActive ? (
          /* Voice mode: show stop button */
          <button
            onClick={handleStopVoice}
            className="flex-1 px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-[0.8125rem] hover:bg-red-100 transition-colors cursor-pointer flex items-center justify-center gap-2"
            aria-label="Oprește modul vocal"
          >
            {/* Stop icon */}
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
            Oprește conversația vocală
          </button>
        ) : (
          /* Text mode: normal input + mic button */
          <>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder="Scrieți un mesaj..."
              disabled={loading}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-[0.8125rem] outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-colors disabled:opacity-50"
            />
            {/* Mic button */}
            {voiceEnabledForAgent && (
              <button
                onClick={handleStartVoice}
                disabled={loading}
                className="px-3 py-2 bg-gray-50 text-gray-600 border border-gray-200 rounded-lg text-[0.8125rem] hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors disabled:opacity-50 disabled:cursor-default cursor-pointer"
                aria-label="Pornește modul vocal"
                title="Conversație vocală"
              >
                {/* Microphone icon */}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              </button>
            )}
            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-[0.8125rem] hover:bg-indigo-700 transition-colors disabled:bg-gray-300 disabled:cursor-default cursor-pointer"
              aria-label="Trimite mesajul"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  )
}
