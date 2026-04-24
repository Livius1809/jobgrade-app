"use client"

import { useState, useEffect, useCallback } from "react"
import GuideJournalLayout from "@/components/employee-reports/GuideJournalLayout"

interface JournalEntry {
  id: string
  page: string
  question: string
  answer: string
  helpful: boolean | null
  category: string | null
  delegatedTo: string | null
  createdAt: string
}

interface JournalResponse {
  entries: JournalEntry[]
  total: number
  stats: {
    byCategory: { category: string | null; count: number }[]
    byPage: { page: string; count: number }[]
    satisfaction: { helpful: number; notHelpful: number }
  }
}

export default function GuideJournalClient() {
  const [data, setData] = useState<JournalResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/v1/guide-journal?limit=100")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleFeedback = useCallback(async (id: string, helpful: boolean) => {
    await fetch("/api/v1/guide-journal", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, helpful }),
    })
    // Actualizează local
    setData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        entries: prev.entries.map((e) => (e.id === id ? { ...e, helpful } : e)),
        stats: {
          ...prev.stats,
          satisfaction: {
            helpful: prev.stats.satisfaction.helpful + (helpful ? 1 : 0),
            notHelpful: prev.stats.satisfaction.notHelpful + (helpful ? 0 : 1),
          },
        },
      }
    })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    )
  }

  if (!data) {
    return <p className="text-center text-gray-500 py-20">Eroare la incarcarea jurnalului.</p>
  }

  return (
    <GuideJournalLayout
      entries={data.entries}
      stats={data.stats}
      total={data.total}
      onFeedback={handleFeedback}
    />
  )
}
