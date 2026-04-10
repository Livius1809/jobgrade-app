"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface SessionActionsProps {
  sessionId: string
  status: string
  isParticipant: boolean
  myCompletedAt: Date | null
}

export default function SessionActions({
  sessionId,
  status,
  isParticipant,
  myCompletedAt,
}: SessionActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function updateStatus(newStatus: string) {
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/v1/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.message || "Eroare la actualizare.")
        return
      }
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  async function markComplete() {
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/v1/sessions/${sessionId}/complete`, {
        method: "POST",
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.message || "Eroare la marcare.")
        return
      }
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  async function finalizeSession() {
    if (!confirm(
      "Finalizezi sesiunea? Rezultatele finale vor fi calculate și sesiunea nu mai poate fi modificată."
    )) return
    setLoading(true)
    setError("")
    try {
      // Apelează engine-ul real je-process.finalizeSession care populează JobResult
      // și setează status COMPLETED + completedAt
      const res = await fetch(`/api/v1/sessions/${sessionId}/je-process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "finalizeSession" }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.message || "Eroare la finalizare sesiune.")
        return
      }
      router.refresh()
      // Redirect la pagina results după finalizare reușită
      router.push(`/sessions/${sessionId}/results`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {error && (
        <div className="p-2 bg-red-50 border border-red-200 text-red-700 rounded text-xs">
          {error}
        </div>
      )}
      <div className="flex gap-2">
        {status === "DRAFT" && (
          <button
            onClick={() => updateStatus("IN_PROGRESS")}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            Pornește sesiunea
          </button>
        )}

        {status === "IN_PROGRESS" && isParticipant && !myCompletedAt && (
          <button
            onClick={markComplete}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            Marchează ca finalizat
          </button>
        )}

        {status === "IN_PROGRESS" && (
          <button
            onClick={finalizeSession}
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Se finalizează..." : "Finalizează și calculează rezultatele"}
          </button>
        )}
      </div>
    </div>
  )
}
