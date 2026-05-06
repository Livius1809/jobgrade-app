"use client"

/**
 * JitsiMeet — Componenta de video conferinta embed (iframe Jitsi Meet)
 *
 * Zero dependinte externe — Jitsi e gratuit si bazat pe iframe.
 * Overlay full screen cu buton de inchidere.
 */

import { useCallback, useEffect, useRef } from "react"

interface JitsiMeetProps {
  roomName: string
  displayName: string
  onClose?: () => void
}

export default function JitsiMeet({ roomName, displayName, onClose }: JitsiMeetProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  // Encode display name for URL
  const encodedName = encodeURIComponent(displayName)
  const jitsiUrl = `https://meet.jit.si/${encodeURIComponent(roomName)}#userInfo.displayName="${encodedName}"&config.prejoinPageEnabled=false`

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && onClose) {
        onClose()
      }
    },
    [onClose]
  )

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    // Prevent body scroll while overlay is open
    document.body.style.overflow = "hidden"

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = ""
    }
  }, [handleKeyDown])

  return (
    <div
      ref={overlayRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 9999,
        backgroundColor: "#000",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header bar with close button */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 16px",
          backgroundColor: "#1a1a2e",
          color: "#fff",
          fontSize: "14px",
          flexShrink: 0,
        }}
      >
        <span>
          Video conferinta — <strong>{roomName}</strong>
        </span>
        <button
          onClick={onClose}
          aria-label="Inchide video conferinta"
          style={{
            background: "none",
            border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: "6px",
            color: "#fff",
            padding: "6px 16px",
            cursor: "pointer",
            fontSize: "14px",
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) => {
            ;(e.target as HTMLButtonElement).style.background = "rgba(255,255,255,0.1)"
          }}
          onMouseLeave={(e) => {
            ;(e.target as HTMLButtonElement).style.background = "none"
          }}
        >
          Inchide (Esc)
        </button>
      </div>

      {/* Jitsi iframe */}
      <iframe
        src={jitsiUrl}
        allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
        style={{
          flex: 1,
          width: "100%",
          border: "none",
        }}
        title="Jitsi Meet Video Conference"
      />
    </div>
  )
}
