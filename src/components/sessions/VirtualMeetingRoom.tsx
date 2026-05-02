"use client"

/**
 * VirtualMeetingRoom — Sală virtuală Nivel 1
 *
 * Participanții intră într-o experiență unificată:
 * - Jitsi embed cu fundal virtual configurat
 * - Rareș (AI) apare ca participant cu avatar + status
 * - Layout sală de ședințe cu locuri vizuale
 * - Fundal consistent per tip de proces
 *
 * Tipuri de sală:
 * - COMISIE: masă ovală, 3-5 locuri, formal
 * - MEDIERE: masă rotundă, 2-3 locuri + mediator
 * - CONSULTANTA: 2 fotolii, informal
 * - TRAINING: clasă, prezentator + auditoriu
 */

import { useState, useEffect } from "react"

interface VirtualMeetingRoomProps {
  roomId: string
  displayName: string
  roomType: "COMISIE" | "MEDIERE" | "CONSULTANTA" | "TRAINING"
  raresRole: "MEDIATOR" | "CONSULTANT" | "OBSERVER" | "TRAINER"
  participants?: Array<{ name: string; role: string }>
  onClose?: () => void
}

const ROOM_CONFIG = {
  COMISIE: {
    label: "Comisie de evaluare",
    background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)",
    raresAvatar: "/guide/C1_B2B.png",
    maxParticipants: 5,
    description: "Discuție structurată de evaluare posturi",
  },
  MEDIERE: {
    label: "Sesiune de mediere",
    background: "linear-gradient(135deg, #1e3a5f 0%, #1e40af 50%, #1e3a5f 100%)",
    raresAvatar: "/guide/C2_B2B.png",
    maxParticipants: 4,
    description: "Mediere pentru atingerea consensului",
  },
  CONSULTANTA: {
    label: "Consultanță",
    background: "linear-gradient(135deg, #134e4a 0%, #0f766e 50%, #134e4a 100%)",
    raresAvatar: "/guide/C3_B2B.png",
    maxParticipants: 2,
    description: "Sesiune de consultanță organizațională",
  },
  TRAINING: {
    label: "Sesiune de formare",
    background: "linear-gradient(135deg, #3b0764 0%, #6b21a8 50%, #3b0764 100%)",
    raresAvatar: "/guide/C4_B2B.png",
    maxParticipants: 10,
    description: "Formare profesională interactivă",
  },
}

const RARES_ROLES = {
  MEDIATOR: { label: "Mediator", status: "Facilitează discuția" },
  CONSULTANT: { label: "Consultant", status: "Ghidează procesul" },
  OBSERVER: { label: "Observator", status: "Monitorizează calitatea" },
  TRAINER: { label: "Formator", status: "Conduce sesiunea" },
}

export default function VirtualMeetingRoom({
  roomId, displayName, roomType, raresRole, participants = [], onClose,
}: VirtualMeetingRoomProps) {
  const [minimized, setMinimized] = useState(false)
  const [raresActive, setRaresActive] = useState(true)
  const [raresMessage, setRaresMessage] = useState("")
  const config = ROOM_CONFIG[roomType]
  const raresRoleConfig = RARES_ROLES[raresRole]

  // Rareș salută la intrare
  useEffect(() => {
    const timer = setTimeout(() => {
      setRaresMessage(
        roomType === "COMISIE"
          ? "Bine ați venit în comisia de evaluare. Vom analiza fiecare fișă de post pe cele 4 criterii."
          : roomType === "MEDIERE"
          ? "Sunt aici să facilităm atingerea consensului. Fiecare opinie contează."
          : roomType === "CONSULTANTA"
          ? "Să vedem împreună cum putem îmbunătăți structura organizațională."
          : "Sesiunea de formare începe. Parcurgem materialul pas cu pas."
      )
    }, 2000)
    return () => clearTimeout(timer)
  }, [roomType])

  const jitsiUrl = `https://meet.jit.si/${roomId}#userInfo.displayName="${encodeURIComponent(displayName)}"&config.startWithAudioMuted=false&config.startWithVideoMuted=false&config.prejoinPageEnabled=false&config.disableDeepLinking=true&interfaceConfig.SHOW_JITSI_WATERMARK=false&interfaceConfig.SHOW_BRAND_WATERMARK=false&interfaceConfig.DEFAULT_BACKGROUND="#1e1b4b"&interfaceConfig.TOOLBAR_BUTTONS=["microphone","camera","desktop","chat","raisehand","hangup","settings","tileview"]`

  if (minimized) {
    return (
      <div className="bg-indigo-50 rounded-xl border border-indigo-200 p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={config.raresAvatar} alt="Rareș" className="w-8 h-8 rounded-full object-cover" />
          <div>
            <span className="text-xs font-medium text-indigo-700">{config.label}</span>
            <span className="text-[10px] text-indigo-400 ml-2">în desfășurare</span>
          </div>
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
    <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
      {/* Header sală virtuală */}
      <div className="flex items-center justify-between px-4 py-2.5" style={{ background: config.background }}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-white text-sm font-semibold">{config.label}</span>
          <span className="text-white/50 text-xs">| {config.description}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setMinimized(true)}
            className="text-xs px-2 py-0.5 rounded bg-white/10 text-white/70 hover:bg-white/20">
            Minimizează
          </button>
          <button onClick={onClose}
            className="text-xs px-2 py-0.5 rounded bg-white/10 text-white/70 hover:bg-white/20">
            ✕
          </button>
        </div>
      </div>

      {/* Layout principal: video + Rareș sidebar */}
      <div className="flex">
        {/* Video Jitsi */}
        <div className="flex-1">
          <iframe
            src={jitsiUrl}
            allow="camera; microphone; display-capture; autoplay; clipboard-write"
            style={{ width: "100%", height: "420px", border: "none" }}
            title={config.label}
          />
        </div>

        {/* Rareș sidebar */}
        <div className="w-48 bg-slate-800 border-l border-slate-700 flex flex-col">
          {/* Avatar Rareș */}
          <div className="p-3 text-center border-b border-slate-700">
            <div className="relative inline-block">
              <img
                src={config.raresAvatar}
                alt="Rareș"
                className="w-16 h-16 rounded-full object-cover ring-2 ring-indigo-500 mx-auto"
              />
              <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-800" />
            </div>
            <p className="text-white text-xs font-semibold mt-2">Rareș (AI)</p>
            <p className="text-indigo-300 text-[10px]">{raresRoleConfig.label}</p>
            <p className="text-slate-400 text-[9px] mt-0.5">{raresRoleConfig.status}</p>
          </div>

          {/* Mesaj Rareș */}
          {raresMessage && (
            <div className="p-2.5 border-b border-slate-700">
              <div className="bg-indigo-900/50 rounded-lg p-2 text-[10px] text-indigo-200 leading-relaxed">
                {raresMessage}
              </div>
            </div>
          )}

          {/* Participanți */}
          <div className="flex-1 p-2.5 overflow-y-auto">
            <p className="text-[9px] text-slate-500 uppercase tracking-wide mb-2">Participanți</p>
            <div className="space-y-1.5">
              {/* Rareș */}
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                  <img src={config.raresAvatar} alt="Rareș" className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-[10px] text-white font-medium">Rareș (AI)</p>
                  <p className="text-[8px] text-emerald-400">{raresRoleConfig.label}</p>
                </div>
              </div>

              {/* Utilizator curent */}
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-[9px] text-white font-bold flex-shrink-0">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-[10px] text-white font-medium">{displayName}</p>
                  <p className="text-[8px] text-slate-400">Tu</p>
                </div>
              </div>

              {/* Alți participanți */}
              {participants.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center text-[9px] text-white font-bold flex-shrink-0">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-[10px] text-white font-medium">{p.name}</p>
                    <p className="text-[8px] text-slate-400">{p.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Control Rareș */}
          <div className="p-2 border-t border-slate-700">
            <button
              onClick={() => setRaresActive(!raresActive)}
              className={`w-full text-[10px] py-1.5 rounded-lg font-medium transition-colors ${
                raresActive
                  ? "bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30"
                  : "bg-slate-700 text-slate-400 hover:bg-slate-600"
              }`}
            >
              {raresActive ? "Rareș activ" : "Rareș în pauză"}
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-1.5 bg-slate-800 border-t border-slate-700 flex items-center justify-between">
        <span className="text-[9px] text-slate-500">
          Sală virtuală JobGrade · Conferință securizată
        </span>
        <span className="text-[9px] text-slate-500">
          {config.label} · Room: {roomId.slice(0, 12)}...
        </span>
      </div>
    </div>
  )
}
