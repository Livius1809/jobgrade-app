"use client"

import { useState } from "react"

interface Session {
  id: string
  name: string
  status: string
  _count: { sessionJobs: number; participants: number }
}

interface SessionAnalysisGeneratorProps {
  sessions: Session[]
  credits: number
}

export default function SessionAnalysisGenerator({
  sessions,
  credits,
}: SessionAnalysisGeneratorProps) {
  const [selectedSessionId, setSelectedSessionId] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState("")
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)

  async function generate() {
    if (!selectedSessionId) {
      setError("Selectează o sesiune.")
      return
    }
    if (credits < 4) {
      setError("Credite insuficiente. Necesari: 4 credite.")
      return
    }

    setLoading(true)
    setError("")
    setResult("")

    try {
      const res = await fetch("/api/v1/ai/session-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: selectedSessionId }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.message || "Eroare la generare.")
        setLoading(false)
        return
      }

      setResult(json.analysis)
    } catch {
      setError("Eroare de rețea.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-5 gap-6">
      <div className="col-span-2 space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Configurare</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sesiune *
            </label>
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">— Selectează sesiunea —</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s._count.sessionJobs} joburi)
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
              {error}
            </div>
          )}

          <button
            onClick={generate}
            disabled={loading || !selectedSessionId}
            className="w-full py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Se analizează..." : "✨ Analizează sesiunea (4 credite)"}
          </button>
        </div>
      </div>

      <div className="col-span-3">
        <div className="bg-white rounded-xl border border-gray-200 p-5 h-full min-h-96">
          {result ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Analiza AI</h2>
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(result)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  }}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  {copied ? "✓ Copiat!" : "Copiază"}
                </button>
              </div>
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">
                {result}
              </pre>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-gray-500 text-sm">
                Selectează o sesiune pentru a obține analiza AI a rezultatelor
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
