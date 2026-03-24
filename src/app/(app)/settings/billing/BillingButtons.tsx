"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface BillingButtonsProps {
  packageId: string | null
  isPortal: boolean
}

export default function BillingButtons({ packageId, isPortal }: BillingButtonsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleClick() {
    setLoading(true)
    setError("")

    try {
      if (isPortal) {
        const res = await fetch("/api/v1/billing/portal", { method: "POST" })
        const json = await res.json()
        if (!res.ok) {
          setError(json.message || "Eroare.")
          return
        }
        window.location.href = json.url
      } else {
        const res = await fetch("/api/v1/billing/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ packageId }),
        })
        const json = await res.json()
        if (!res.ok) {
          setError(json.message || "Eroare.")
          return
        }
        window.location.href = json.url
      }
    } catch {
      setError("Eroare de rețea.")
    } finally {
      setLoading(false)
    }
  }

  if (isPortal) {
    return (
      <button
        onClick={handleClick}
        disabled={loading}
        className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        {loading ? "..." : "Portal facturare"}
      </button>
    )
  }

  return (
    <div className="space-y-1">
      <button
        onClick={handleClick}
        disabled={loading}
        className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {loading ? "Se procesează..." : "Cumpără"}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
