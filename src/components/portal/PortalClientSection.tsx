"use client"

import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import PackageExplorer from "./PackageExplorer"
import ClientDataTabs from "./ClientDataTabs"

interface Props {
  jobCount: number
  purchasedLayer: number
  purchasedPositions: number
  purchasedEmployees: number
  creditBalance: number
  clientStage: string
  cui: string | null
  industry: string | null
}

export default function PortalClientSection({ jobCount, purchasedLayer, purchasedPositions, purchasedEmployees, creditBalance, clientStage, cui, industry }: Props) {
  const [selectedLayer, setSelectedLayer] = useState<number | null>(null)
  const [profilePanel, setProfilePanel] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [calculatorForceOpen, setCalculatorForceOpen] = useState(false)
  const sectionRef = useRef<HTMLDivElement>(null)
  const [panelLeft, setPanelLeft] = useState(0)

  useEffect(() => { setMounted(true) }, [])

  // Ascultă event-ul "open-calculator" din navbar BuyButton
  useEffect(() => {
    const handler = () => {
      setCalculatorForceOpen(true)
      document.getElementById("pachete")?.scrollIntoView({ behavior: "smooth" })
    }
    window.addEventListener("open-calculator", handler)
    return () => window.removeEventListener("open-calculator", handler)
  }, [])

  // Verifică ?openCalculator=1 la mount (redirect din alte pagini)
  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("openCalculator") === "1") {
      setCalculatorForceOpen(true)
      setTimeout(() => {
        document.getElementById("pachete")?.scrollIntoView({ behavior: "smooth" })
      }, 300)
    }
  }, [])

  useEffect(() => {
    if (profilePanel && sectionRef.current) {
      const rect = sectionRef.current.getBoundingClientRect()
      setPanelLeft(rect.right + 24)
    }
  }, [profilePanel])

  const isDone = clientStage !== "NEW"

  return (
    <>
      {/* ═══ Compania ta ═══ */}
      <div
        ref={sectionRef}
        className={`rounded-2xl border transition-all ${
          isDone ? "bg-emerald-50 border-emerald-200" : "bg-white border-indigo-200 shadow-md ring-2 ring-indigo-100"
        }`}
        style={{ padding: "28px" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 ${
              isDone ? "bg-emerald-500 text-white" : "bg-indigo-500 text-white"
            }`}>
              {isDone ? "✓" : "1"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Compania ta</h3>
                <span className="text-[9px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">GRATUIT</span>
              </div>
              <div style={{ height: "4px" }} />
              <p className="text-sm text-slate-500">Spune-ne despre organizația ta — completăm automat ce putem din ANAF</p>
              {cui && (
                <>
                  <div style={{ height: "8px" }} />
                  <p className="text-xs text-emerald-600 font-medium">{industry || "Profil completat"} · CUI: {cui}</p>
                </>
              )}
            </div>
          </div>

          <button
            onClick={() => setProfilePanel(!profilePanel)}
            className={`text-xs px-4 py-2 rounded-lg font-medium transition-colors shrink-0 ${
              isDone ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
            }`}
          >
            {isDone ? "Editează profilul →" : "Completează profilul →"}
          </button>
        </div>
      </div>

      {/* Panou lateral profil */}
      {profilePanel && mounted && createPortal(
        <div
          style={{ borderWidth: "3px", top: "100px", left: `${panelLeft}px`, right: "24px", maxHeight: "calc(100vh - 130px)", padding: "28px" }}
          className="fixed rounded-2xl border-indigo-400 bg-indigo-50 overflow-y-auto shadow-xl z-40"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏢</span>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Profil companie</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded inline-block bg-indigo-100 text-indigo-700">Identificare ANAF</span>
              </div>
            </div>
            <button onClick={() => setProfilePanel(false)} className="text-indigo-700 hover:opacity-70 text-xl font-bold leading-none p-1 rounded transition-opacity" title="Închide">✕</button>
          </div>

          <div style={{ height: "20px" }} />

          <p className="text-sm text-slate-600 leading-relaxed">
            Introduceți CUI-ul companiei. Completăm automat denumirea, adresa și domeniul de activitate din ANAF.
          </p>

          <div style={{ height: "20px" }} />

          <div className="bg-amber-50 rounded-xl border border-amber-200" style={{ padding: "16px" }}>
            <p className="text-[10px] text-amber-700 font-bold uppercase tracking-wide">Date intrare client</p>
            <div style={{ height: "12px" }} />
            <div>
              <label className="text-xs text-slate-600 font-medium">CUI (Cod Unic de Identificare)</label>
              <div style={{ height: "4px" }} />
              <input
                type="text"
                placeholder="ex: 15790994"
                defaultValue={cui || ""}
                className="w-full text-sm border-2 border-amber-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-200 bg-white"
              />
            </div>
            <div style={{ height: "12px" }} />
            <div>
              <label className="text-xs text-slate-600 font-medium">Denumire companie</label>
              <div style={{ height: "4px" }} />
              <input
                type="text"
                placeholder="Se completează automat din ANAF"
                className="w-full text-sm border-2 border-amber-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-200 bg-white text-slate-400"
                disabled
              />
            </div>
            <div style={{ height: "12px" }} />
            <div>
              <label className="text-xs text-slate-600 font-medium">Domeniu de activitate (CAEN)</label>
              <div style={{ height: "4px" }} />
              <input
                type="text"
                placeholder="Se completează automat din ANAF"
                defaultValue={industry || ""}
                className="w-full text-sm border-2 border-amber-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-200 bg-white text-slate-400"
                disabled
              />
            </div>
            <div style={{ height: "12px" }} />
            <div>
              <label className="text-xs text-slate-600 font-medium">Nr. angajați (estimativ)</label>
              <div style={{ height: "4px" }} />
              <input
                type="number"
                placeholder="–"
                className="w-full text-sm border-2 border-amber-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-200 bg-white"
              />
            </div>
          </div>

          <div style={{ height: "20px" }} />

          <button className="w-full py-3 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm">
            Salvează profilul
          </button>

          <div style={{ height: "8px" }} />
          <p className="text-[9px] text-slate-400 text-center">Datele se preiau automat din ANAF pe baza CUI-ului.</p>
        </div>,
        document.body
      )}

      {/* ═══ Ce vrei să rezolvi? ═══ */}
      {clientStage !== "NEW" && (
        <>
          <div id="pachete" className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl border border-indigo-100" style={{ padding: "28px" }}>
            <h2 className="text-lg font-bold text-slate-900">Ce vrei să rezolvi?</h2>
            <div style={{ height: "4px" }} />
            <p className="text-sm text-slate-500">Alege ce te interesează — vezi detalii, preț, ce primești.</p>
          </div>

          <PackageExplorer onLayerChange={setSelectedLayer} purchasedLayer={purchasedLayer} purchasedPositions={purchasedPositions} purchasedEmployees={purchasedEmployees} creditBalance={creditBalance} forceOpen={calculatorForceOpen} />

          {/* ═══ Date intrare client — apare doar după plată ═══ */}
          {purchasedLayer > 0 && (
            <div className="bg-amber-50 rounded-2xl border border-amber-200" style={{ padding: "28px" }}>
              <p className="text-[10px] text-amber-700 font-bold uppercase tracking-wide">Date intrare client</p>
              <div style={{ height: "4px" }} />
              <p className="text-xs text-slate-500">Completați datele pentru a genera rapoartele.</p>
              <div style={{ height: "20px" }} />
              <ClientDataTabs jobCount={jobCount} selectedLayer={selectedLayer} purchasedLayer={purchasedLayer} />
            </div>
          )}
        </>
      )}
    </>
  )
}
