"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

interface ThemeActionsProps {
  themeId: string
  currentStatus: "ACTIVE" | "ARCHIVED"
}

export function ThemeActions({ themeId, currentStatus }: ThemeActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleAction(action: "archive" | "activate" | "delete") {
    setLoading(true)
    try {
      const res = await fetch("/api/v1/owner/strategic-themes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-key": "__browser__",
        },
        body: JSON.stringify({ action, themeId }),
      })
      if (res.ok) {
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex gap-2">
      {currentStatus === "ACTIVE" ? (
        <button
          onClick={() => handleAction("archive")}
          disabled={loading}
          className="text-xs px-2 py-1 border rounded hover:bg-slate-50 text-slate-600 disabled:opacity-50"
        >
          Arhiveaza
        </button>
      ) : (
        <button
          onClick={() => handleAction("activate")}
          disabled={loading}
          className="text-xs px-2 py-1 border rounded hover:bg-emerald-50 text-emerald-600 disabled:opacity-50"
        >
          Reactiveaza
        </button>
      )}
      <button
        onClick={() => {
          if (confirm("Sigur vrei sa stergi aceasta tema?")) {
            handleAction("delete")
          }
        }}
        disabled={loading}
        className="text-xs px-2 py-1 border rounded hover:bg-red-50 text-red-600 disabled:opacity-50"
      >
        Sterge
      </button>
    </div>
  )
}

export function ThemeCreateForm({ objectives }: { objectives: { code: string; title: string; status: string }[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [selectedCodes, setSelectedCodes] = useState<string[]>([])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      const res = await fetch("/api/v1/owner/strategic-themes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-key": "__browser__",
        },
        body: JSON.stringify({
          action: "create",
          name: name.trim(),
          description: description.trim(),
          objectiveCodes: selectedCodes,
        }),
      })
      if (res.ok) {
        setName("")
        setDescription("")
        setSelectedCodes([])
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nume tema</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="ex: Expansiune B2C, Certificare ISO"
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Descriere</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descriere scurta a temei strategice"
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>
      {objectives.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Obiective disponibile (selecteaza multiple cu Ctrl+Click)
          </label>
          <select
            multiple
            value={selectedCodes}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions, (opt) => opt.value)
              setSelectedCodes(selected)
            }}
            className="w-full border rounded-lg px-3 py-2 text-sm h-32"
          >
            {objectives.map((obj) => (
              <option key={obj.code} value={obj.code}>
                [{obj.code}] {obj.title} ({obj.status})
              </option>
            ))}
          </select>
        </div>
      )}
      <button
        type="submit"
        disabled={loading || !name.trim()}
        className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
      >
        {loading ? "Se creeaza..." : "Creeaza tema"}
      </button>
    </form>
  )
}
