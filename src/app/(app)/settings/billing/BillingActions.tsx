"use client"

import { useState } from "react"

interface Props {
  type: "credits" | "subscribe" | "portal"
  packageId?: string
  billing?: "monthly" | "annual"
  label?: string
  variant?: "primary" | "outline"
}

export default function BillingActions({ type, packageId, billing, label, variant = "primary" }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const endpoint = type === "portal"
        ? "/api/v1/billing/portal"
        : "/api/v1/billing/checkout"

      const body = type === "credits"
        ? { type: "credits", packageId }
        : type === "subscribe"
        ? { type: "subscription", billing }
        : {}

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.message || "Eroare la procesare.")
        setLoading(false)
      }
    } catch {
      alert("Eroare de rețea. Încercați din nou.")
      setLoading(false)
    }
  }

  const baseClasses = "px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
  const variantClasses = variant === "outline"
    ? "border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
    : type === "portal"
    ? "bg-slate-600 text-white hover:bg-slate-700"
    : "bg-indigo-600 text-white hover:bg-indigo-700"

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`${baseClasses} ${variantClasses}`}
    >
      {loading ? "Se procesează..." : label || (type === "portal" ? "Gestionează abonamentul" : "Cumpără")}
    </button>
  )
}
