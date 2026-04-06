"use client"

import { useState } from "react"

interface DecisionOption {
  label: string
  description: string
  risk: "LOW" | "MEDIUM" | "HIGH"
}

export default function DecisionButtons({
  situationId,
  options,
  affectedRoles,
}: {
  situationId: string
  options: DecisionOption[]
  affectedRoles: string[]
}) {
  const [decided, setDecided] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  async function handleDecision(option: DecisionOption) {
    if (loading) return
    setLoading(true)

    try {
      const res = await fetch("/api/v1/owner/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          situationId,
          optionLabel: option.label,
          affectedRoles,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setDecided(option.label)
        setResult(data.actions?.join("; ") || "Decizie aplicată")
      } else {
        setResult(`Eroare: ${data.error}`)
      }
    } catch {
      setResult("Eroare de conexiune")
    } finally {
      setLoading(false)
    }
  }

  if (decided) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
        <p className="text-xs text-emerald-700">
          <span className="font-semibold">Decizie:</span> {decided}
        </p>
        {result && <p className="text-[11px] text-emerald-600 mt-1">{result}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary/60">
        Ce decizi?
      </span>
      {options.map((opt, idx) => (
        <button
          key={idx}
          onClick={() => handleDecision(opt)}
          disabled={loading}
          className="w-full text-left rounded-lg border border-border hover:border-indigo/40 hover:bg-indigo/5 px-3 py-2 transition-all group disabled:opacity-50"
        >
          <div className="flex items-center gap-2">
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                opt.risk === "HIGH"
                  ? "bg-red-400"
                  : opt.risk === "MEDIUM"
                    ? "bg-amber-400"
                    : "bg-emerald-400"
              }`}
            />
            <span className="text-xs font-semibold text-foreground group-hover:text-indigo">
              {opt.label}
            </span>
          </div>
          <p className="text-[11px] text-text-secondary mt-1 ml-3.5 leading-relaxed">
            {opt.description}
          </p>
        </button>
      ))}
    </div>
  )
}
