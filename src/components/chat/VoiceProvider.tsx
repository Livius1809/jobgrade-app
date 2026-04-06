"use client"

import { ConversationProvider } from "@elevenlabs/react"
import { VOICE_CONFIG } from "@/lib/voice/config"

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConversationProvider serverLocation={VOICE_CONFIG.serverLocation}>
      {children}
    </ConversationProvider>
  )
}
