// ── Chat Widget Types ───────────────────────────────────────────────────────

/** Agent roles for client-facing chat */
export type AgentRole = "soa" | "cssa" | "csa" | "profiler" | "hr_counselor"

/** Agent display metadata */
export interface AgentMeta {
  role: AgentRole
  label: string
  description: string
}

/** A single message in the conversation */
export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  agentRole?: AgentRole
}

/** Actions that the agent can trigger via [ACTION:...] tags */
export type ChatAction =
  | { type: "navigate"; path: string }
  | { type: "highlight"; elementId: string }
  | { type: "open-modal"; modalName: string }
  | { type: "scroll-to"; elementId: string }

/** Result of parsing actions from agent text */
export interface ParsedResponse {
  cleanText: string
  actions: ChatAction[]
}

/** Request body sent to agent chat endpoints */
export interface ChatRequest {
  message: string
  threadId?: string
  companyId?: string
}

/** Response from agent chat endpoints */
export interface ChatResponse {
  reply: string
  threadId: string
  agentRole: string
  error?: string
}

/** Widget visual state */
export type WidgetState = "collapsed" | "expanded"
