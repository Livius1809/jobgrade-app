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
  companyName: string
  cui: string | null
  industry: string | null
  caenName: string | null
  address: string | null
  mission: string | null
  vision: string | null
}

export default function PortalClientSection({ jobCount, purchasedLayer, purchasedPositions, purchasedEmployees, creditBalance, clientStage, companyName, cui, industry, caenName, address, mission, vision }: Props) {
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
                <span className="text-[10px] font-bold px-2 py-0.5 rounded inline-block bg-indigo-100 text-indigo-700">Identificare ANAF + MVV</span>
              </div>
            </div>
            <button onClick={() => setProfilePanel(false)} className="text-indigo-700 hover:opacity-70 text-xl font-bold leading-none p-1 rounded transition-opacity" title="Închide">✕</button>
          </div>

          <div style={{ height: "16px" }} />

          {/* Date ANAF — read-only, populate din DB */}
          <div className="bg-slate-50 rounded-xl border border-slate-200" style={{ padding: "16px" }}>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Date ANAF (preluate automat)</p>
            <div style={{ height: "12px" }} />
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400">Denumire</span>
                <p className="font-medium text-slate-900">{companyName || "–"}</p>
              </div>
              <div>
                <span className="text-slate-400">CUI</span>
                <p className="font-medium text-slate-900">{cui || "–"}</p>
              </div>
              <div>
                <span className="text-slate-400">CAEN</span>
                <p className="font-medium text-slate-900">{caenName || industry || "–"}</p>
              </div>
              <div>
                <span className="text-slate-400">Adresă</span>
                <p className="font-medium text-slate-900">{address || "–"}</p>
              </div>
            </div>
          </div>

          <div style={{ height: "16px" }} />

          {/* Date editabile — MVV + alte info */}
          <ProfileForm cui={cui} mission={mission} vision={vision} onClose={() => setProfilePanel(false)} />
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

// ─── Formularul de profil (wired la API) ───────────────────────────────

function ProfileForm({ cui, mission, vision, onClose }: { cui: string | null; mission: string | null; vision: string | null; onClose: () => void }) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const handleSave = async () => {
    if (!formRef.current) return
    const fd = new FormData(formRef.current)
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/v1/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cui: fd.get("cui") || undefined,
          mission: fd.get("mission") || undefined,
          vision: fd.get("vision") || undefined,
          size: fd.get("size") || undefined,
        }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => { onClose(); window.location.reload() }, 1000)
      } else {
        const data = await res.json()
        setError(data.message || "Eroare la salvare")
      }
    } catch (e) {
      setError("Eroare de rețea")
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <form ref={formRef}>
        <div className="bg-amber-50 rounded-xl border border-amber-200" style={{ padding: "16px" }}>
          <p className="text-[10px] text-amber-700 font-bold uppercase tracking-wide">Date intrare client</p>
          <div style={{ height: "12px" }} />
          <div>
            <label className="text-xs text-slate-600 font-medium">CUI (dacă nu e preluat)</label>
            <div style={{ height: "4px" }} />
            <input name="cui" type="text" placeholder="ex: 15790994" defaultValue={cui || ""} className="w-full text-sm border-2 border-amber-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-200 bg-white" />
          </div>
          <div style={{ height: "12px" }} />
          <div>
            <label className="text-xs text-slate-600 font-medium">Misiune</label>
            <div style={{ height: "4px" }} />
            <textarea name="mission" rows={2} placeholder="Care e misiunea companiei? (opțional)" defaultValue={mission || ""} className="w-full text-sm border-2 border-amber-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-200 bg-white resize-none" />
          </div>
          <div style={{ height: "12px" }} />
          <div>
            <label className="text-xs text-slate-600 font-medium">Viziune</label>
            <div style={{ height: "4px" }} />
            <textarea name="vision" rows={2} placeholder="Unde vrea compania să ajungă? (opțional)" defaultValue={vision || ""} className="w-full text-sm border-2 border-amber-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-200 bg-white resize-none" />
          </div>
          <div style={{ height: "12px" }} />
          <div>
            <label className="text-xs text-slate-600 font-medium">Nr. angajați (estimativ)</label>
            <div style={{ height: "4px" }} />
            <input name="size" type="text" placeholder="–" className="w-full text-sm border-2 border-amber-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-200 bg-white" />
          </div>
        </div>
      </form>

      <div style={{ height: "20px" }} />

      <button
        onClick={handleSave}
        disabled={saving || saved}
        className={`w-full py-3 rounded-lg text-sm font-semibold transition-colors shadow-sm ${
          saved ? "bg-emerald-500 text-white" : "bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
        }`}
      >
        {saved ? "✓ Salvat" : saving ? "Se salvează..." : "Salvează profilul"}
      </button>

      {error && (
        <>
          <div style={{ height: "8px" }} />
          <p className="text-[9px] text-red-500 text-center font-medium">{error}</p>
        </>
      )}

      <div style={{ height: "8px" }} />
      <p className="text-[9px] text-slate-400 text-center">Datele ANAF se preiau automat. Misiunea și viziunea sunt opționale.</p>
    </>
  )
}
