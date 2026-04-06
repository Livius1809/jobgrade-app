// ── Voice-specific types ───────────────────────────────────────────────────

import type { AgentRole } from "@/lib/chat/types"

/** Voice mode state within the chat widget */
export type VoiceMode = "idle" | "connecting" | "listening" | "speaking"

/** A transcript entry from a voice conversation */
export interface VoiceTranscript {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  agentRole?: AgentRole
  /** Whether this message came from voice (vs text) */
  isVoice: true
}

/** Status labels shown in UI (Romanian) */
export const VOICE_STATUS_LABELS: Record<VoiceMode, string> = {
  idle: "",
  connecting: "Se conectează...",
  listening: "Ascult...",
  speaking: "Vorbește...",
} as const

/** OpenAI-compatible chat completion request (from ElevenLabs) */
export interface OpenAIChatCompletionRequest {
  model: string
  messages: Array<{
    role: "system" | "user" | "assistant"
    content: string
  }>
  stream?: boolean
  temperature?: number
  max_tokens?: number
}

/** Single SSE chunk in OpenAI format */
export interface OpenAIChatCompletionChunk {
  id: string
  object: "chat.completion.chunk"
  created: number
  model: string
  choices: Array<{
    index: number
    delta: {
      role?: "assistant"
      content?: string
    }
    finish_reason: string | null
  }>
}
