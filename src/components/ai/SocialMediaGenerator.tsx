"use client"

import { useState } from "react"

interface Job {
  id: string
  title: string
  department?: { name: string } | null
}

interface SocialMediaGeneratorProps {
  jobs: Job[]
  credits: number
}

const PLATFORMS = [
  { id: "linkedin", label: "LinkedIn", icon: "💼", cost: 2 },
  { id: "facebook", label: "Facebook", icon: "📘", cost: 2 },
  { id: "instagram", label: "Instagram", icon: "📸", cost: 2 },
]

export default function SocialMediaGenerator({
  jobs,
  credits,
}: SocialMediaGeneratorProps) {
  const [selectedJobId, setSelectedJobId] = useState("")
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["linkedin"])
  const [tone, setTone] = useState("professional")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Record<string, string>>({})
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState("linkedin")

  const totalCost = selectedPlatforms.length * 2

  function togglePlatform(id: string) {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  async function generate() {
    if (!selectedJobId) {
      setError("Selectează un job.")
      return
    }
    if (selectedPlatforms.length === 0) {
      setError("Selectează cel puțin o platformă.")
      return
    }
    if (credits < totalCost) {
      setError(`Credite insuficiente. Necesari: ${totalCost}.`)
      return
    }

    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/v1/ai/social-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: selectedJobId,
          platforms: selectedPlatforms,
          tone,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.message || "Eroare la generare.")
        setLoading(false)
        return
      }

      setResults(json.results)
      if (selectedPlatforms.length > 0) {
        setActiveTab(selectedPlatforms[0])
      }
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
              Job *
            </label>
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">— Selectează —</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title}
                  {job.department ? ` · ${job.department.name}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Platforme *
            </label>
            <div className="space-y-2">
              {PLATFORMS.map((p) => (
                <label
                  key={p.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedPlatforms.includes(p.id)
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedPlatforms.includes(p.id)}
                    onChange={() => togglePlatform(p.id)}
                    className="rounded"
                  />
                  <span>{p.icon}</span>
                  <span className="text-sm font-medium text-gray-900">
                    {p.label}
                  </span>
                  <span className="ml-auto text-xs text-gray-400">
                    {p.cost} cr.
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ton
            </label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="professional">Profesional</option>
              <option value="dynamic">Dinamic & energic</option>
              <option value="friendly">Prietenos</option>
            </select>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
              {error}
            </div>
          )}

          <button
            onClick={generate}
            disabled={loading || !selectedJobId || selectedPlatforms.length === 0}
            className="w-full py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            {loading
              ? "Se generează..."
              : `✨ Generează (${totalCost} credite)`}
          </button>
        </div>
      </div>

      <div className="col-span-3">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden h-full min-h-96">
          {Object.keys(results).length > 0 ? (
            <>
              <div className="flex border-b border-gray-200">
                {selectedPlatforms.map((p) => {
                  const platform = PLATFORMS.find((pl) => pl.id === p)
                  return (
                    <button
                      key={p}
                      onClick={() => setActiveTab(p)}
                      className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === p
                          ? "border-blue-600 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {platform?.icon} {platform?.label}
                    </button>
                  )
                })}
              </div>
              <div className="p-5">
                {results[activeTab] && (
                  <div>
                    <div className="flex justify-end mb-3">
                      <button
                        onClick={() =>
                          navigator.clipboard.writeText(results[activeTab])
                        }
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Copiază
                      </button>
                    </div>
                    <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">
                      {results[activeTab]}
                    </pre>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center">
              <div className="text-4xl mb-3">📱</div>
              <p className="text-gray-500 text-sm">
                Selectează un job și platformele, apoi generează posturile
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
