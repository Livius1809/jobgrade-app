"use client"

/**
 * VideoConference — Jitsi Meet embed pentru discuții comisie JE.
 *
 * Faza 1: Jitsi Meet iframe (gratuit, zero backend)
 * Faza 2: LiveKit + ElevenLabs (AI mediator vocal)
 * Faza 3: Consultanță vocală B2B/B2C
 *
 * Room-ul se creează dinamic din sessionId + sessionJobId (unic per fișă discutată).
 * Participanții intră cu numele lor real (din sesiune NextAuth).
 */

import { useState } from "react"

interface VideoConferenceProps {
  roomId: string
  displayName: string
  onClose?: () => void
}

export default function VideoConference({ roomId, displayName, onClose }: VideoConferenceProps) {
  const [minimized, setMinimized] = useState(false)

  // Jitsi Meet public instance — room unic per sesiune
  // Config: fără lobby, fără watermark, start cu audio on, video off (economie bandă)
  const jitsiUrl = `https://meet.jit.si/${roomId}#userInfo.displayName="${encodeURIComponent(displayName)}"&config.startWithAudioMuted=false&config.startWithVideoMuted=true&config.prejoinPageEnabled=false&config.disableDeepLinking=true&interfaceConfig.SHOW_JITSI_WATERMARK=false&interfaceConfig.SHOW_BRAND_WATERMARK=false&interfaceConfig.TOOLBAR_BUTTONS=["microphone","camera","desktop","chat","raisehand","hangup","settings"]`

  if (minimized) {
    return (
      <div className="bg-indigo-50 rounded-xl border border-indigo-200 p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-medium text-indigo-700">Videoconferință activă</span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setMinimized(false)}
            className="text-xs px-3 py-1 rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200 font-medium">
            Extinde
          </button>
          <button onClick={onClose}
            className="text-xs px-3 py-1 rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 font-medium">
            Închide
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-indigo-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-indigo-50 border-b border-indigo-200">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-indigo-700">Videoconferință</span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setMinimized(true)}
            className="text-xs px-2 py-0.5 rounded bg-indigo-100 text-indigo-600 hover:bg-indigo-200">
            Minimizează
          </button>
          <button onClick={onClose}
            className="text-xs px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-500 hover:bg-slate-50">
            ✕
          </button>
        </div>
      </div>

      {/* Jitsi iframe */}
      <iframe
        src={jitsiUrl}
        allow="camera; microphone; display-capture; autoplay; clipboard-write"
        style={{ width: "100%", height: "400px", border: "none" }}
        title="Videoconferință comisie"
      />

      {/* Footer info */}
      <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[9px] text-slate-400">
          Powered by Jitsi Meet · Serverele 8×8 (EU)
        </span>
        <span className="text-[9px] text-slate-400">
          Room: {roomId}
        </span>
      </div>
    </div>
  )
}
