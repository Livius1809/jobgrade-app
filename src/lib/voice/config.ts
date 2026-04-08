// ── ElevenLabs Voice Configuration ─────────────────────────────────────────

import type { AgentRole } from "@/lib/chat/types"

export const VOICE_CONFIG = {
  /** ElevenLabs Conversational AI agent IDs — configure in ElevenLabs dashboard */
  agentIds: {
    soa: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_SOA || "",
    cssa: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_CSSA || "",
    csa: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_CSA || "",
    profiler: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_PROFILER || "",
    hr_counselor: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_HR_COUNSELOR || "",
  } satisfies Record<AgentRole, string>,

  /** Default conversation language */
  defaultLanguage: "ro" as const,

  /** GDPR — store and process data in EU */
  serverLocation: "eu-residency" as const,

  /** Voice IDs for TTS — configure in ElevenLabs dashboard */
  voices: {
    b2b: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_B2B || "",
    b2c: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_B2C || "",
  },
} as const

/**
 * Returns the ElevenLabs agent ID for a given agent role.
 * Returns empty string if not configured (voice will be disabled).
 */
export function getVoiceAgentId(role: AgentRole): string {
  return VOICE_CONFIG.agentIds[role]
}

/**
 * Checks whether voice is configured for a given agent role.
 */
export function isVoiceEnabled(role: AgentRole): boolean {
  return !!VOICE_CONFIG.agentIds[role]
}
