"use client"

import { useState } from "react"

export default function AccountMenu() {
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState<"data" | "account" | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAction = async (action: "data" | "account") => {
    if (confirming !== action) {
      setConfirming(action)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/v1/account/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        if (action === "account") {
          window.location.href = "/login"
        } else {
          // Force hard reload fără cache
          window.location.href = "/portal?reset=" + Date.now()
        }
      } else {
        setError(data.message || `Eroare ${res.status}`)
      }
    } catch (e) {
      setError("Eroare de rețea")
      console.error("Account action error:", e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen(!open); setConfirming(null); setError(null) }}
        className="text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors"
      >
        Cont Pilot
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setConfirming(null); setError(null) }} />
          <div className="absolute right-0 top-8 z-50 bg-white rounded-xl border border-slate-200 shadow-lg w-56" style={{ padding: "8px" }}>
            <button
              onClick={() => handleAction("data")}
              disabled={loading}
              className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-amber-50 text-amber-700 transition-colors disabled:opacity-50"
            >
              {confirming === "data" ? (loading ? "Se șterge..." : "Confirmă ștergerea datelor") : "Șterge datele de test"}
            </button>
            <button
              onClick={() => handleAction("account")}
              disabled={loading}
              className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-red-50 text-red-600 transition-colors disabled:opacity-50"
            >
              {confirming === "account" ? (loading ? "Se șterge..." : "Confirmă ștergerea contului") : "Șterge contul"}
            </button>
            {confirming && !error && (
              <p className="text-[9px] text-slate-400 px-3 py-1">
                Apasă din nou pentru a confirma. Acțiunea este ireversibilă.
              </p>
            )}
            {error && (
              <p className="text-[9px] text-red-500 px-3 py-1 font-medium">
                {error}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
