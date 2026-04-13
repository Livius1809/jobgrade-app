"use client"

import { useState } from "react"

export default function PilotToggle({
  tenantId,
  tenantName,
  initialValue,
}: {
  tenantId: string
  tenantName: string
  initialValue: boolean
}) {
  const [isPilot, setIsPilot] = useState(initialValue)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    try {
      const res = await fetch("/api/v1/admin/pilot-toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, isPilot: !isPilot }),
      })
      if (res.ok) {
        setIsPilot(!isPilot)
      }
    } catch {
      // silent fail — UI reverts
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3">
      <div>
        <p className="text-sm font-medium text-foreground">{tenantName}</p>
        <p className="text-xs text-text-secondary">
          {isPilot
            ? "Cont pilot — acces gratuit complet, date colectate pentru îmbunătățire"
            : "Cont standard — facturare normală"}
        </p>
      </div>
      <button
        onClick={toggle}
        disabled={loading}
        className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
          isPilot ? "bg-emerald-500" : "bg-slate-300"
        } ${loading ? "opacity-50" : "cursor-pointer"}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
            isPilot ? "translate-x-6" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  )
}
