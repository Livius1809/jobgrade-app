"use client"

import { useState } from "react"

interface Job {
  id: string
  title: string
  code?: string | null
  purpose?: string | null
  responsibilities?: string | null
  requirements?: string | null
  department?: { name: string } | null
}

interface JobAdGeneratorProps {
  jobs: Job[]
  credits: number
}

const TONE_OPTIONS = [
  { value: "professional", label: "Profesional" },
  { value: "dynamic", label: "Dinamic & energic" },
  { value: "friendly", label: "Prietenos & casual" },
  { value: "corporate", label: "Corporate & formal" },
]

const PLATFORM_OPTIONS = [
  { value: "ejobs", label: "eJobs" },
  { value: "bestjobs", label: "BestJobs" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "hipo", label: "Hipo.ro" },
  { value: "generic", label: "Generic (orice platformă)" },
]

export default function JobAdGenerator({ jobs, credits }: JobAdGeneratorProps) {
  const [selectedJobId, setSelectedJobId] = useState("")
  const [tone, setTone] = useState("professional")
  const [platform, setPlatform] = useState("generic")
  const [additionalInfo, setAdditionalInfo] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState("")
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)

  const selectedJob = jobs.find((j) => j.id === selectedJobId)

  async function generate() {
    if (!selectedJobId) {
      setError("Selectează o fișă de post.")
      return
    }
    if (credits < 4) {
      setError("Credite insuficiente. Minimum 4 credite necesare.")
      return
    }

    setLoading(true)
    setError("")
    setResult("")

    try {
      const res = await fetch("/api/v1/ai/job-ad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: selectedJobId,
          tone,
          platform,
          additionalInfo,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.message || "Eroare la generare.")
        setLoading(false)
        return
      }

      setResult(json.content)
    } catch {
      setError("Eroare de rețea.")
    } finally {
      setLoading(false)
    }
  }

  async function copyToClipboard() {
    await navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="grid grid-cols-5 gap-6">
      {/* Config panel */}
      <div className="col-span-2 space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Configurare</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fișă de post *
            </label>
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">— Selectează jobul —</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title}
                  {job.department ? ` · ${job.department.name}` : ""}
                </option>
              ))}
            </select>
          </div>

          {selectedJob && (
            <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-600 space-y-1">
              {selectedJob.department && (
                <div>Dept: {selectedJob.department.name}</div>
              )}
              {selectedJob.purpose && (
                <div className="line-clamp-2">Scop: {selectedJob.purpose}</div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ton
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TONE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTone(opt.value)}
                  className={`px-3 py-2 text-xs rounded-lg border transition-colors ${
                    tone === opt.value
                      ? "border-blue-500 bg-blue-50 text-blue-700 font-medium"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Platformă
            </label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {PLATFORM_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Informații suplimentare
            </label>
            <textarea
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              rows={3}
              placeholder="ex: salariu competitiv, remote partial, beneficii speciale..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
              {error}
            </div>
          )}

          <button
            onClick={generate}
            disabled={loading || !selectedJobId}
            className="w-full py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              "Se generează..."
            ) : (
              <>
                <span>✨</span>
                <span>Generează anunțul (4 credite)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Result panel */}
      <div className="col-span-3">
        <div className="bg-white rounded-xl border border-gray-200 p-5 h-full min-h-96">
          {result ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Anunțul generat</h2>
                <button
                  onClick={copyToClipboard}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {copied ? "✓ Copiat!" : "Copiază"}
                </button>
              </div>
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">
                  {result}
                </pre>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center">
              <div className="text-4xl mb-3">✨</div>
              <p className="text-gray-500 text-sm">
                Selectează o fișă de post și configurează preferințele, apoi
                apasă &ldquo;Generează&rdquo;
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
