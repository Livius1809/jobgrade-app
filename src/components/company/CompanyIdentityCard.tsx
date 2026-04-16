"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface CompanyIdentityCardProps {
  initial: {
    name: string | null
    cui: string | null
    industry: string | null
    caenName: string | null
    isVATPayer: boolean | null
    address: string | null
    county: string | null
    anafSyncedAt: Date | null
  }
}

export default function CompanyIdentityCard({ initial }: CompanyIdentityCardProps) {
  const router = useRouter()
  const [cui, setCui] = useState(initial.cui ?? "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [synced, setSynced] = useState({
    name: initial.name,
    industry: initial.industry,
    caenName: initial.caenName,
    isVATPayer: initial.isVATPayer,
    address: initial.address,
    county: initial.county,
    syncedAt: initial.anafSyncedAt,
  })

  const isComplete =
    !!synced.name &&
    !!synced.industry &&
    synced.isVATPayer !== null &&
    !!cui

  async function handleAnafLookup() {
    if (!cui.trim()) {
      setError("Completează CUI-ul.")
      return
    }
    setLoading(true)
    setError("")

    try {
      const cleanCui = cui.replace(/\D/g, "")
      const res = await fetch(`/api/v1/anaf/lookup?cui=${cleanCui}`)
      const json = await res.json()

      if (!res.ok) {
        setError(json.message || "Nu am găsit firma la ANAF.")
        setLoading(false)
        return
      }

      // Salvare automată în profil
      const saveRes = await fetch("/api/v1/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantName: json.name,
          cui: json.cui,
          regCom: json.registrationNumber || undefined,
          address: json.address || undefined,
          county: json.county || undefined,
          industry: json.caen?.industry || undefined,
          caenCode: json.caen?.code || undefined,
          caenName: json.caen?.name || undefined,
          isVATPayer: json.isVATPayer,
          anafSyncedAt: new Date().toISOString(),
        }),
      })

      if (!saveRes.ok) {
        const e = await saveRes.json()
        setError(e.message || "Eroare la salvare.")
        setLoading(false)
        return
      }

      setSynced({
        name: json.name,
        industry: json.caen?.industry ?? null,
        caenName: json.caen?.name ?? null,
        isVATPayer: json.isVATPayer,
        address: json.address ?? null,
        county: json.county ?? null,
        syncedAt: new Date(),
      })

      // Refresh server component → recalculează serviciile activate
      router.refresh()
    } catch {
      setError("Eroare la conectarea cu ANAF.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-slate-900">Identitate firmă</p>
        <span className="text-xs text-slate-400">
          {isComplete
            ? "Sincronizat"
            : synced.name
              ? "Parțial"
              : "Necompletat"}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isComplete
              ? "bg-emerald-500"
              : synced.name
                ? "bg-amber-400"
                : "bg-slate-200"
          }`}
          style={{ width: isComplete ? "100%" : synced.name ? "60%" : "0%" }}
        />
      </div>

      {/* CUI input + buton ANAF */}
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={cui}
          onChange={(e) => setCui(e.target.value)}
          placeholder="CUI (ex: 12345678 sau RO12345678)"
          className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button
          type="button"
          onClick={handleAnafLookup}
          disabled={loading || !cui.trim()}
          className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-medium hover:bg-emerald-100 transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          {loading ? (
            "Se caută..."
          ) : (
            <>
              <span>🇷🇴</span>
              <span>ANAF</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <p className="text-[10px] text-coral mb-2">{error}</p>
      )}

      {/* Sumar dupa sync */}
      {synced.name && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 mt-2">
          <p className="text-xs font-semibold text-emerald-900 mb-1">
            {synced.name}
          </p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-emerald-800">
            {synced.caenName && (
              <div>
                <span className="text-emerald-600">Activitate:</span>{" "}
                <span className="font-medium">{synced.caenName}</span>
              </div>
            )}
            {synced.industry && (
              <div>
                <span className="text-emerald-600">Industrie:</span>{" "}
                <span className="font-medium">{synced.industry}</span>
              </div>
            )}
            {synced.isVATPayer !== null && (
              <div>
                <span className="text-emerald-600">TVA:</span>{" "}
                <span className="font-medium">
                  {synced.isVATPayer ? "plătitor" : "neplătitor"}
                </span>
              </div>
            )}
            {synced.county && (
              <div>
                <span className="text-emerald-600">Județ:</span>{" "}
                <span className="font-medium">{synced.county}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {!synced.name && (
        <p className="text-[10px] text-slate-400 mt-1">
          Apasă <strong>ANAF</strong> pentru completare automată: denumire,
          activitate, COD CAEN, statut TVA, adresă.
        </p>
      )}

      {synced.name && (
        <div className="mt-2 text-right">
          <Link
            href="/company"
            className="text-[10px] text-indigo-500 hover:underline"
          >
            Detalii avansate (misiune, viziune) →
          </Link>
        </div>
      )}
    </div>
  )
}
