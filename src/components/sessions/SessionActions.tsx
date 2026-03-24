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

  async function updateStatus(newStatus: string) {
    setLoading(true)
    try {
      await fetch(`/api/v1/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  async function markComplete() {
    setLoading(true)
    try {
      await fetch(`/api/v1/sessions/${sessionId}/complete`, {
        method: "POST",
      })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
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
          onClick={() => updateStatus("COMPLETED")}
          disabled={loading}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          Finalizează sesiunea
        </button>
      )}
    </div>
  )
}
