"use client"

import { useState } from "react"
import PackageExplorer from "./PackageExplorer"
import ClientDataTabs from "./ClientDataTabs"

interface Props {
  jobCount: number
  purchasedLayer: number
}

export default function PortalClientSection({ jobCount, purchasedLayer }: Props) {
  const [selectedLayer, setSelectedLayer] = useState<number | null>(null)

  return (
    <>
      {/* ═══ Ce vrei să rezolvi? ═══ */}
      <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl border border-indigo-100" style={{ padding: "28px" }}>
        <h2 className="text-lg font-bold text-slate-900">Ce vrei să rezolvi?</h2>
        <div style={{ height: "4px" }} />
        <p className="text-sm text-slate-500">Alege ce te interesează — vezi detalii, preț, ce primești.</p>
      </div>

      <PackageExplorer onLayerChange={setSelectedLayer} purchasedLayer={purchasedLayer} />

      {/* ═══ Date intrare client ═══ */}
      <div className="bg-amber-50 rounded-2xl border border-amber-200" style={{ padding: "28px" }}>
        <p className="text-[10px] text-amber-700 font-bold uppercase tracking-wide">Date intrare client</p>
        <div style={{ height: "4px" }} />
        <p className="text-xs text-slate-500">
          {purchasedLayer > 0
            ? "Completați datele pentru a genera rapoartele."
            : "Cumpărați un pachet pentru a activa introducerea datelor."}
        </p>
        <div style={{ height: "20px" }} />
        <ClientDataTabs jobCount={jobCount} selectedLayer={selectedLayer} purchasedLayer={purchasedLayer} />
      </div>
    </>
  )
}
