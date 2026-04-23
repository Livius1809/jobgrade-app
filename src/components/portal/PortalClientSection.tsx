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
  sessionCount: number
  isValidated: boolean
}

export default function PortalClientSection({ jobCount, purchasedLayer, purchasedPositions, purchasedEmployees, creditBalance, clientStage, companyName, cui, industry, caenName, address, mission, vision, sessionCount, isValidated }: Props) {
  const [selectedLayer, setSelectedLayer] = useState<number | null>(null)
  const [mounted, setMounted] = useState(false)
  const [calculatorForceOpen, setCalculatorForceOpen] = useState(false)
  const sectionRef = useRef<HTMLDivElement>(null)
  const evalSectionRef = useRef<HTMLDivElement>(null)
  const [panelLeft, setPanelLeft] = useState(0)

  // Un singur panou activ la un moment dat: "profile" | "calculator" | "data:posturi" | "data:fise" | etc. | "eval" | "report" | null
  const [activePanel, setActivePanel] = useState<string | null>(null)

  // Helper: deschide panou nou (închide automat pe cel vechi)
  const openPanel = (panel: string) => setActivePanel(prev => prev === panel ? null : panel)

  // Derivate din activePanel
  const profilePanel = activePanel === "profile"
  const evalPanel = activePanel === "eval"
  const reportPanel = activePanel === "report"
  const calculatorActive = activePanel === "calculator"
  const dataPanelActive = activePanel?.startsWith("data:") ?? false

  useEffect(() => { setMounted(true) }, [])

  // Ascultă event-ul "open-calculator" din navbar BuyButton
  useEffect(() => {
    const handler = () => {
      setCalculatorForceOpen(true)
      setActivePanel("calculator")
      document.getElementById("pachete")?.scrollIntoView({ behavior: "smooth" })
    }
    window.addEventListener("open-calculator", handler)
    return () => window.removeEventListener("open-calculator", handler)
  }, [])

  // Verifică ?openCalculator=1 la mount (redirect din alte pagini)
  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("openCalculator") === "1") {
      setCalculatorForceOpen(true)
      setActivePanel("calculator")
      setTimeout(() => {
        document.getElementById("pachete")?.scrollIntoView({ behavior: "smooth" })
      }, 300)
    }
  }, [])

  useEffect(() => {
    if (activePanel && sectionRef.current) {
      const ref = evalPanel ? evalSectionRef.current : sectionRef.current
      if (ref) {
        const rect = ref.getBoundingClientRect()
        setPanelLeft(rect.right + 24)
      }
    }
  }, [activePanel])

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
              {!isDone ? (
                <p className="text-sm text-slate-500">Spune-ne despre organizația ta — completăm automat ce putem din ANAF</p>
              ) : (
                <p className="text-xs text-emerald-600 font-medium">{caenName || industry || "Profil completat"} · CUI: {cui || "–"}</p>
              )}
            </div>
          </div>

          <button
            onClick={() => openPanel("profile")}
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
            <button onClick={() => setActivePanel(null)} className="text-indigo-700 hover:opacity-70 text-xl font-bold leading-none p-1 rounded transition-opacity" title="Închide">✕</button>
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
          <ProfileForm cui={cui} mission={mission} vision={vision} onClose={() => setActivePanel(null)} />
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

          <PackageExplorer
            onLayerChange={setSelectedLayer}
            purchasedLayer={purchasedLayer}
            purchasedPositions={purchasedPositions}
            purchasedEmployees={purchasedEmployees}
            creditBalance={creditBalance}
            forceOpen={calculatorForceOpen}
            forceClose={activePanel !== null && activePanel !== "calculator"}
            onPanelOpen={(open) => {
              if (open) setActivePanel("calculator")
              else if (activePanel === "calculator") setActivePanel(null)
            }}
          />

          {/* ═══ Date intrare client — apare doar după plată ═══ */}
          {purchasedLayer > 0 && (
            <div className="bg-amber-50 rounded-2xl border border-amber-200" style={{ padding: "28px" }}>
              <p className="text-[10px] text-amber-700 font-bold uppercase tracking-wide">Date intrare client</p>
              <div style={{ height: "4px" }} />
              <p className="text-xs text-slate-500">Completați datele pentru a genera rapoartele.</p>
              <div style={{ height: "20px" }} />
              <ClientDataTabs
                jobCount={jobCount}
                selectedLayer={selectedLayer}
                purchasedLayer={purchasedLayer}
                onPanelChange={(open) => {
                  if (open) setActivePanel("data")
                  else if (activePanel === "data") setActivePanel(null)
                }}
                forceClosePanel={activePanel !== null && activePanel !== "data"}
                parentPanelLeft={panelLeft || undefined}
              />
            </div>
          )}

          {/* ═══ Evaluare și ierarhizare ═══ */}
          {purchasedLayer > 0 && (
            <div
              ref={evalSectionRef}
              className={`rounded-2xl border transition-all ${
                isValidated ? "bg-emerald-50 border-emerald-200" :
                sessionCount > 0 ? "bg-indigo-50 border-indigo-200" :
                jobCount >= 3 ? "bg-white border-indigo-200 shadow-md ring-2 ring-indigo-100" :
                "bg-slate-50 border-slate-200 opacity-60"
              }`}
              style={{ padding: "28px" }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 ${
                    isValidated ? "bg-emerald-500 text-white" :
                    sessionCount > 0 ? "bg-indigo-500 text-white" :
                    "bg-slate-200 text-slate-400"
                  }`}>
                    {isValidated ? "✓" : "⚖️"}
                  </div>
                  <div>
                    <h3 className={`text-base font-bold ${jobCount < 3 ? "text-slate-400" : "text-slate-900"}`}>
                      Evaluare și ierarhizare
                    </h3>
                    <div style={{ height: "4px" }} />
                    <p className={`text-sm ${jobCount < 3 ? "text-slate-300" : "text-slate-500"}`}>
                      {isValidated
                        ? "Evaluarea e validată. Raportul e disponibil."
                        : sessionCount > 0
                          ? "Evaluarea e completă. Verifică rezultatele și validează."
                          : jobCount >= 3
                            ? "AI evaluează posturile pe 6 criterii obiective. Rezultat în secunde."
                            : "Mai întâi adaugă cel puțin 3 posturi."}
                    </p>
                  </div>
                </div>

                {jobCount >= 3 && (
                  <button
                    onClick={() => openPanel("eval")}
                    className={`text-xs px-4 py-2 rounded-lg font-medium transition-colors shrink-0 ${
                      isValidated ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" :
                      sessionCount > 0 ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-200" :
                      "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                    }`}
                  >
                    {isValidated ? "Vezi rezultatele →" : sessionCount > 0 ? "Verifică rezultatele →" : "Pornește evaluarea AI →"}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Panou lateral evaluare */}
          {evalPanel && mounted && createPortal(
            <div
              style={{ borderWidth: "3px", top: "100px", left: `${panelLeft}px`, right: "24px", maxHeight: "calc(100vh - 130px)", padding: "28px" }}
              className="fixed rounded-2xl border-indigo-400 bg-indigo-50 overflow-y-auto shadow-xl z-40"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⚖️</span>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Evaluare și ierarhizare</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded inline-block bg-indigo-100 text-indigo-700">
                      {sessionCount > 0 ? "Rezultate" : "Evaluare AI"}
                    </span>
                  </div>
                </div>
                <button onClick={() => setActivePanel(null)} className="text-indigo-700 hover:opacity-70 text-xl font-bold leading-none p-1 rounded transition-opacity" title="Închide">✕</button>
              </div>
              <div style={{ height: "20px" }} />
              <EvaluationPanel onComplete={() => { setActivePanel(null); window.location.reload() }} />
            </div>,
            document.body
          )}

          {/* ═══ Rapoarte ═══ */}
          {purchasedLayer > 0 && (
            <div
              className={`rounded-2xl border transition-all ${
                isValidated ? "bg-white border-indigo-200 shadow-md ring-2 ring-indigo-100" :
                "bg-slate-50 border-slate-200 opacity-60"
              }`}
              style={{ padding: "28px" }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 ${
                    isValidated ? "bg-indigo-500 text-white" : "bg-slate-200 text-slate-400"
                  }`}>
                    📊
                  </div>
                  <div>
                    <h3 className={`text-base font-bold ${isValidated ? "text-slate-900" : "text-slate-400"}`}>Rapoarte</h3>
                    <div style={{ height: "4px" }} />
                    <p className={`text-sm ${isValidated ? "text-slate-500" : "text-slate-300"}`}>
                      {isValidated
                        ? "Raportul de Diagnostic Analitic (RDA) este disponibil."
                        : "Completează evaluarea și validează pentru a genera rapoartele."}
                    </p>
                  </div>
                </div>

                {isValidated && (
                  <button
                    onClick={() => openPanel("report")}
                    className="text-xs px-4 py-2 rounded-lg font-medium transition-colors shrink-0 bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                  >
                    Deschide raportul →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Panou lateral rapoarte */}
          {reportPanel && mounted && createPortal(
            <div
              style={{ borderWidth: "3px", top: "100px", left: `${panelLeft}px`, right: "24px", maxHeight: "calc(100vh - 130px)", padding: "28px" }}
              className="fixed rounded-2xl border-indigo-400 bg-indigo-50 overflow-y-auto shadow-xl z-40"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📊</span>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Raport de Diagnostic Analitic</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded inline-block bg-indigo-100 text-indigo-700">RDA</span>
                  </div>
                </div>
                <button onClick={() => setActivePanel(null)} className="text-indigo-700 hover:opacity-70 text-xl font-bold leading-none p-1 rounded transition-opacity" title="Închide">✕</button>
              </div>
              <div style={{ height: "20px" }} />
              <ReportPanel />
            </div>,
            document.body
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
  const [anafLoading, setAnafLoading] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [mvvSource, setMvvSource] = useState<"website" | "generated" | "manual" | null>(null)
  const [mvvValidated, setMvvValidated] = useState(!!mission && !!vision)
  const formRef = useRef<HTMLFormElement>(null)

  const handleAnafLookup = async () => {
    if (!formRef.current) return
    const cuiVal = (new FormData(formRef.current).get("cui") as string || "").replace(/\D/g, "")
    if (!cuiVal) { setError("Completează CUI-ul mai întâi."); return }
    setAnafLoading(true); setError(null); setSuccess(null)
    try {
      const res = await fetch(`/api/v1/anaf/lookup?cui=${cuiVal}`)
      const json = await res.json()
      if (!res.ok) { setError(json.message || "Nu am găsit firma la ANAF."); return }
      const form = formRef.current!
      if (json.name) (form.querySelector('[name="tenantName"]') as HTMLInputElement).value = json.name
      if (json.address) (form.querySelector('[name="address"]') as HTMLInputElement).value = json.address
      if (json.caen?.name) (form.querySelector('[name="caenName"]') as HTMLInputElement).value = json.caen.name
      setSuccess(`Date preluate: ${json.name}`)
    } catch { setError("Eroare la conectarea cu ANAF.") }
    finally { setAnafLoading(false) }
  }

  const handleExtract = async (fromWebsite: boolean) => {
    if (!formRef.current) return
    const fd = new FormData(formRef.current)
    const website = fd.get("website") as string || ""

    if (fromWebsite && !website) { setError("Completează URL-ul website-ului."); return }

    setExtracting(true); setError(null); setSuccess(null); setMvvValidated(false)
    try {
      const payload: any = {}
      if (fromWebsite && website) payload.website = website
      // Trimitem și datele CAEN pentru generare din obiect de activitate
      payload.companyName = fd.get("tenantName") || undefined
      payload.caenName = fd.get("caenName") || undefined
      payload.cui = fd.get("cui") || undefined

      const res = await fetch("/api/v1/ai/company-extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.message || "Eroare la generare."); return }
      const form = formRef.current!
      if (json.mission) (form.querySelector('[name="mission"]') as HTMLTextAreaElement).value = json.mission
      if (json.vision) (form.querySelector('[name="vision"]') as HTMLTextAreaElement).value = json.vision
      if (json.description) (form.querySelector('[name="description"]') as HTMLTextAreaElement).value = json.description

      const source = json.source === "website" ? "website" : "generated"
      setMvvSource(source)

      if (source === "website") {
        setSuccess("MVV extras din website. Verifică dacă reflectă realitatea și confirmă.")
      } else {
        setSuccess("MVV generat din obiectul de activitate. Acesta este un DRAFT — editează-l pentru a reflecta realitatea companiei tale, apoi confirmă.")
      }
    } catch { setError("Eroare la generare.") }
    finally { setExtracting(false) }
  }

  const handleSave = async () => {
    if (!formRef.current) return
    const fd = new FormData(formRef.current)
    setSaving(true); setError(null)
    try {
      const res = await fetch("/api/v1/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantName: fd.get("tenantName") || undefined,
          cui: fd.get("cui") || undefined,
          mission: fd.get("mission") || undefined,
          vision: fd.get("vision") || undefined,
          description: fd.get("description") || undefined,
          size: fd.get("size") || undefined,
          website: fd.get("website") || undefined,
          address: fd.get("address") || undefined,
          caenName: fd.get("caenName") || undefined,
        }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => { onClose(); window.location.reload() }, 1000)
      } else {
        const data = await res.json()
        setError(data.message || "Eroare la salvare")
      }
    } catch { setError("Eroare de rețea") }
    finally { setSaving(false) }
  }

  return (
    <>
      <form ref={formRef}>
        <div className="bg-amber-50 rounded-xl border border-amber-200" style={{ padding: "16px" }}>
          <p className="text-[10px] text-amber-700 font-bold uppercase tracking-wide">Date intrare client</p>

          <div style={{ height: "12px" }} />
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-xs text-slate-600 font-medium">CUI</label>
              <div style={{ height: "4px" }} />
              <input name="cui" type="text" placeholder="ex: 15790994" defaultValue={cui || ""} className="w-full text-sm border-2 border-amber-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-200 bg-white" />
            </div>
            <button type="button" onClick={handleAnafLookup} disabled={anafLoading} className="px-3 py-2 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 disabled:opacity-50 shrink-0">
              {anafLoading ? "Se caută..." : "Preia din ANAF"}
            </button>
          </div>

          <div style={{ height: "12px" }} />
          <div>
            <label className="text-xs text-slate-600 font-medium">Denumire firmă</label>
            <div style={{ height: "4px" }} />
            <input name="tenantName" type="text" placeholder="Se completează din ANAF" className="w-full text-sm border-2 border-amber-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-200 bg-white" />
          </div>
          <input name="address" type="hidden" />
          <input name="caenName" type="hidden" />

          <div style={{ height: "12px" }} />
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-xs text-slate-600 font-medium">Website</label>
              <div style={{ height: "4px" }} />
              <input name="website" type="text" placeholder="ex: www.firma.ro" className="w-full text-sm border-2 border-amber-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-200 bg-white" />
            </div>
            <button type="button" onClick={() => handleExtract(true)} disabled={extracting} className="px-3 py-2 text-xs font-medium bg-violet-100 text-violet-700 rounded-lg hover:bg-violet-200 disabled:opacity-50 shrink-0">
              {extracting ? "Se extrage..." : "Preia MVV"}
            </button>
          </div>

          {/* Generare MVV din CAEN (fără website) */}
          <div style={{ height: "8px" }} />
          <button type="button" onClick={() => handleExtract(false)} disabled={extracting} className="w-full px-3 py-2 text-xs font-medium bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 disabled:opacity-50 border border-indigo-200">
            {extracting ? "Se generează..." : "Generează draft MVV din obiectul de activitate"}
          </button>

          {mvvSource && (
            <>
              <div style={{ height: "6px" }} />
              <p className={`text-[9px] text-center ${mvvSource === "website" ? "text-emerald-600" : "text-amber-600"}`}>
                {mvvSource === "website" ? "MVV preluat din website — verifică și confirmă" : "Draft generat din CAEN — editează pentru a reflecta realitatea companiei"}
              </p>
            </>
          )}

          <div style={{ height: "12px" }} />
          <div>
            <label className="text-xs text-slate-600 font-medium">Misiune</label>
            <div style={{ height: "4px" }} />
            <textarea name="mission" rows={2} placeholder="Care e misiunea companiei?" defaultValue={mission || ""} className="w-full text-sm border-2 border-amber-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-200 bg-white resize-none" />
          </div>
          <div style={{ height: "12px" }} />
          <div>
            <label className="text-xs text-slate-600 font-medium">Viziune</label>
            <div style={{ height: "4px" }} />
            <textarea name="vision" rows={2} placeholder="Unde vrea compania să ajungă?" defaultValue={vision || ""} className="w-full text-sm border-2 border-amber-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-200 bg-white resize-none" />
          </div>
          <div style={{ height: "12px" }} />
          <div>
            <label className="text-xs text-slate-600 font-medium">Descriere (opțional)</label>
            <div style={{ height: "4px" }} />
            <textarea name="description" rows={2} placeholder="Scurtă descriere a companiei" className="w-full text-sm border-2 border-amber-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-200 bg-white resize-none" />
          </div>
          <div style={{ height: "12px" }} />
          <div>
            <label className="text-xs text-slate-600 font-medium">Nr. angajați (estimativ)</label>
            <div style={{ height: "4px" }} />
            <input name="size" type="text" placeholder="–" className="w-full text-sm border-2 border-amber-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-200 bg-white" />
          </div>
        </div>
      </form>

      <div style={{ height: "16px" }} />

      {success && (
        <>
          <p className="text-[10px] text-emerald-600 font-medium text-center">{success}</p>
          <div style={{ height: "8px" }} />
        </>
      )}
      {error && (
        <>
          <p className="text-[10px] text-red-500 font-medium text-center">{error}</p>
          <div style={{ height: "8px" }} />
        </>
      )}

      <button
        onClick={handleSave}
        disabled={saving || saved}
        className={`w-full py-3 rounded-lg text-sm font-semibold transition-colors shadow-sm ${
          saved ? "bg-emerald-500 text-white" : "bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
        }`}
      >
        {saved ? "✓ Salvat" : saving ? "Se salvează..." : "Salvează profilul"}
      </button>
    </>
  )
}

// ── Panou Evaluare — 4 variante ─────────────────────────────────────────────

type EvalVariant = "auto" | "comisie-ai" | "comisie-consultant" | "hibrid"
type EvalPhase = "choose" | "configure" | "running" | "results" | "error"

interface EvalResult {
  position: string
  department: string
  grade: string
  score: number
}

/**
 * Credite per variantă de evaluare — deduse din costuri reale (DB prod: provider_costs + ai_operation_tiers)
 *
 * A (Auto AI): inclus în pachetul de 60 cr/poz — Haiku, amp 1.20
 * B (Comisie + AI): +1 cr/poz suplimentar — mediation-facilitation Sonnet, amp 1.50
 * C (Comisie + Consultant): +20 cr/poz suplimentar — consultant 150-200 EUR/oră, ~7 min/poz
 * D (Hibrid): +1 cr/poz suplimentar — A complet + B pe ~30% posturi
 *
 * Sursa: docs/pricing-methodology-v2.md secțiunea 7.2
 */
const VARIANTS: Array<{
  id: EvalVariant
  icon: string
  title: string
  description: string
  who: string
  time: string
  /** Credite suplimentare per poziție (peste cele 60 incluse în pachet) */
  extraCreditsPerPosition: number
}> = [
  {
    id: "auto",
    icon: "🤖",
    title: "Evaluare automata AI",
    description: "AI analizeaza fisele de post si evalueaza pe 6 criterii obiective. Dumneavoastra validati si semnati raportul.",
    who: "AI evalueaza, personal acreditat supervizeaza",
    time: "10-30 secunde",
    extraCreditsPerPosition: 0,
  },
  {
    id: "comisie-ai",
    icon: "👥",
    title: "Comisie interna, mediata AI",
    description: "Membrii comisiei dumneavoastra evalueaza individual. AI identifica divergentele si mediaza consensul.",
    who: "Comisia dumneavoastra evalueaza, AI mediaza",
    time: "2-5 zile (depinde de nr. posturi si disponibilitatea comisiei)",
    extraCreditsPerPosition: 1,
  },
  {
    id: "comisie-consultant",
    icon: "🎓",
    title: "Comisie interna, mediata de consultant",
    description: "Membrii comisiei dumneavoastra evalueaza. Un consultant acreditat din echipa noastra faciliteaza consensul.",
    who: "Comisia dumneavoastra evalueaza, consultantul nostru mediaza",
    time: "1-2 saptamani",
    extraCreditsPerPosition: 20,
  },
  {
    id: "hibrid",
    icon: "🔄",
    title: "Hibrid: AI apoi comisie",
    description: "Se ruleaza mai intai evaluarea AI. Raportul generat devine baza de discutie pentru comisie. Comisia ajusteaza de unde are nevoie.",
    who: "AI genereaza prima versiune, comisia valideaza si ajusteaza",
    time: "AI: 30s + comisie: 1-3 zile",
    extraCreditsPerPosition: 1,
  },
]

interface TeamMember {
  id: string
  firstName: string
  lastName: string
  role: string
  email: string
}

function EvaluationPanel({ onComplete }: { onComplete: () => void }) {
  const [variant, setVariant] = useState<EvalVariant | null>(null)
  const [phase, setPhase] = useState<EvalPhase>("choose")
  const [results, setResults] = useState<EvalResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [validating, setValidating] = useState(false)
  const [jobCount, setJobCount] = useState(0)
  // Comisie
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [loadingTeam, setLoadingTeam] = useState(false)

  // Fetch nr posturi pentru calcul credite hibrid
  useEffect(() => {
    fetch("/api/v1/jobs").then(r => r.json()).then(data => {
      const jobs = Array.isArray(data) ? data : data.jobs || []
      setJobCount(jobs.length)
    }).catch(() => {})
  }, [])

  // La mount, verificăm dacă există deja o sesiune cu rezultate
  useEffect(() => {
    fetch("/api/v1/sessions")
      .then(r => r.json())
      .then(data => {
        const sessions = data.sessions || []
        const completed = sessions.find((s: any) => s.status === "COMPLETED" || s.status === "VALIDATED")
        const inProgress = sessions.find((s: any) => !["DRAFT", "COMPLETED", "VALIDATED"].includes(s.status))

        if (completed) {
          setSessionId(completed.id)
          loadResults(completed.id)
        } else if (inProgress) {
          setSessionId(inProgress.id)
          setPhase("running")
          loadResults(inProgress.id)
        }
      })
      .catch(() => {})
  }, [])

  async function loadResults(sid: string) {
    try {
      const res = await fetch(`/api/v1/sessions/${sid}/je-process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getHierarchyForValidation" }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.hierarchy?.length > 0) {
          setResults(data.hierarchy.map((h: any) => ({
            position: h.title || h.jobTitle,
            department: h.department || "—",
            grade: h.grade || h.letterGrade || "—",
            score: h.totalScore || h.score || 0,
          })))
          setPhase("results")
        }
      }
    } catch {}
  }

  async function startAutoEvaluation() {
    setPhase("running")
    setError(null)

    try {
      const [jobsRes, sessionRes] = await Promise.all([
        fetch("/api/v1/jobs").then(r => r.json()),
        fetch("/api/auth/session").then(r => r.json()).catch(() => null),
      ])

      const jobIds = (Array.isArray(jobsRes) ? jobsRes : jobsRes.jobs || []).map((j: any) => j.id)
      if (jobIds.length < 3) throw new Error("Sunt necesare cel putin 3 posturi pentru evaluare.")

      const userId = sessionRes?.user?.id
      if (!userId) throw new Error("Nu s-a putut identifica utilizatorul curent.")

      const variantLabel = variant === "auto" ? "Evaluare AI" : variant === "hibrid" ? "Hibrid AI + Comisie" : "Comisie"

      const createRes = await fetch("/api/v1/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${variantLabel} — ${new Date().toLocaleDateString("ro-RO")}`,
          jobIds,
          participantIds: [userId],
        }),
      })

      if (!createRes.ok) throw new Error((await createRes.json()).message || "Nu s-a putut crea sesiunea.")

      const sid = (await createRes.json()).id
      setSessionId(sid)

      const evalRes = await fetch("/api/v1/sessions/auto-evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid }),
      })

      if (!evalRes.ok) throw new Error((await evalRes.json()).message || "Eroare la evaluarea AI.")

      await loadResults(sid)
    } catch (e: any) {
      setError(e.message)
      setPhase("error")
    }
  }

  async function startCommitteeSession(memberIds?: string[]) {
    setPhase("running")
    setError(null)

    try {
      const jobsRes = await fetch("/api/v1/jobs").then(r => r.json())
      const jobIds = (Array.isArray(jobsRes) ? jobsRes : jobsRes.jobs || []).map((j: any) => j.id)
      if (jobIds.length < 3) throw new Error("Sunt necesare cel putin 3 posturi.")

      const participantIds = memberIds && memberIds.length > 0 ? memberIds : (() => { throw new Error("Selectati membrii comisiei.") })()

      const label = variant === "comisie-consultant" ? "Comisie + Consultant" : "Comisie + AI"

      const createRes = await fetch("/api/v1/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${label} — ${new Date().toLocaleDateString("ro-RO")}`,
          jobIds,
          participantIds,
        }),
      })

      if (!createRes.ok) throw new Error((await createRes.json()).message || "Nu s-a putut crea sesiunea.")

      const sid = (await createRes.json()).id
      setSessionId(sid)

      await fetch(`/api/v1/sessions/${sid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "IN_PROGRESS" }),
      })

      setPhase("running")
    } catch (e: any) {
      setError(e.message)
      setPhase("error")
    }
  }

  function handleStart() {
    if (variant === "auto") startAutoEvaluation()
    else if (variant === "hibrid") startAutoEvaluation() // prima fază e identică cu auto
    else {
      // Comisie (B/C): trebuie configurare comisie mai întâi
      setPhase("configure")
      loadTeamMembers()
    }
  }

  async function loadTeamMembers() {
    setLoadingTeam(true)
    try {
      const res = await fetch("/api/auth/session").then(r => r.json()).catch(() => null)
      const tenantId = res?.user?.tenantId
      if (!tenantId) return

      // Fetch toți utilizatorii tenant-ului
      const usersRes = await fetch("/api/v1/users?tenantId=" + tenantId).catch(() => null)
      if (usersRes?.ok) {
        const data = await usersRes.json()
        const users = (data.users || data || []).map((u: any) => ({
          id: u.id,
          firstName: u.firstName || u.name?.split(" ")[0] || "",
          lastName: u.lastName || u.name?.split(" ").slice(1).join(" ") || "",
          role: u.role || "REPRESENTATIVE",
          email: u.email || "",
        }))
        setTeamMembers(users)
        // Pre-selectăm user-ul curent
        if (res?.user?.id) setSelectedMembers([res.user.id])
      }
    } catch {}
    setLoadingTeam(false)
  }

  function toggleMember(id: string) {
    setSelectedMembers(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    )
  }

  async function launchCommitteeWithMembers() {
    if (selectedMembers.length < 1) { setError("Selectati cel putin un membru."); return }
    startCommitteeSession(selectedMembers)
  }

  async function validateResults() {
    if (!sessionId) return
    setValidating(true)
    try {
      await fetch(`/api/v1/sessions/${sessionId}/je-process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "finalizeSession" }),
      })
      onComplete()
    } catch {
      setError("Eroare la validare.")
    }
    setValidating(false)
  }

  // ── Alegere variantă ──
  if (phase === "choose") {
    return (
      <>
        <p className="text-sm text-slate-600 leading-relaxed">
          Alegeti cum doriti sa se desfasoare evaluarea posturilor. In toate variantele, dumneavoastra validati si semnati raportul final.
        </p>
        <div style={{ height: "16px" }} />

        <div className="space-y-3">
          {VARIANTS.map(v => (
            <button
              key={v.id}
              onClick={() => setVariant(v.id)}
              className={`w-full text-left rounded-xl border-2 transition-all ${
                variant === v.id
                  ? "border-indigo-400 bg-indigo-50 shadow-md"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
              }`}
              style={{ padding: "16px" }}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl mt-0.5">{v.icon}</span>
                <div className="flex-1 min-w-0">
                  <h4 className={`text-sm font-bold ${variant === v.id ? "text-indigo-700" : "text-slate-800"}`}>
                    {v.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{v.description}</p>
                  <div style={{ height: "8px" }} />
                  <div className="flex flex-wrap gap-3 text-[9px]">
                    <span className="text-slate-400"><span className="font-semibold text-slate-500">Cine:</span> {v.who}</span>
                    <span className="text-slate-400"><span className="font-semibold text-slate-500">Timp:</span> {v.time}</span>
                    {jobCount > 0 && v.extraCreditsPerPosition > 0 && (
                      <span className="text-amber-600"><span className="font-semibold">+{jobCount * v.extraCreditsPerPosition} credite</span> suplimentare</span>
                    )}
                    {jobCount > 0 && v.extraCreditsPerPosition === 0 && (
                      <span className="text-emerald-600 font-semibold">Inclus in pachet</span>
                    )}
                  </div>
                </div>
                {variant === v.id && (
                  <span className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs shrink-0">✓</span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Avertizare credite suplimentare */}
        {variant && (() => {
          const selectedVariant = VARIANTS.find(v => v.id === variant)
          if (!selectedVariant || selectedVariant.extraCreditsPerPosition === 0 || jobCount === 0) return null
          const extraCredits = jobCount * selectedVariant.extraCreditsPerPosition
          return (
            <>
              <div style={{ height: "16px" }} />
              <div className="bg-amber-50 rounded-xl border border-amber-200" style={{ padding: "14px" }}>
                <p className="text-xs text-amber-800">
                  Aceasta varianta nu este inclusa integral in pachetul de baza. Pentru derularea procesului mai sunt necesare <span className="font-bold">{extraCredits} credite suplimentare</span>.
                </p>
              </div>
            </>
          )
        })()}

        <div style={{ height: "20px" }} />
        <button
          onClick={handleStart}
          disabled={!variant}
          className="w-full py-3 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-40"
        >
          {!variant ? "Selectati o varianta" :
           variant === "auto" ? "Porneste evaluarea AI" :
           variant === "hibrid" ? "Porneste evaluarea AI (prima faza)" :
           "Creeaza sesiunea de evaluare"}
        </button>

        <div style={{ height: "8px" }} />
        <p className="text-[9px] text-slate-400 text-center">
          6 criterii: Educatie, Comunicare, Rezolvare probleme, Luarea deciziilor, Impact afaceri, Conditii de munca.
        </p>
      </>
    )
  }

  // ── Configurare comisie (B/C) ──
  if (phase === "configure") {
    const selectedVariant = VARIANTS.find(v => v.id === variant)
    const extraCr = selectedVariant ? jobCount * selectedVariant.extraCreditsPerPosition : 0

    return (
      <>
        <p className="text-sm text-slate-600 leading-relaxed">
          Selectati membrii comisiei de evaluare. Fiecare membru va evalua individual toate posturile pe cele 6 criterii.
        </p>

        <div style={{ height: "16px" }} />

        {loadingTeam ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400 mt-3">Se incarca echipa...</p>
          </div>
        ) : teamMembers.length === 0 ? (
          <div className="bg-amber-50 rounded-xl border border-amber-200" style={{ padding: "16px" }}>
            <p className="text-xs text-amber-800">
              Nu s-au gasit utilizatori in cont. Invitati membrii comisiei din Setari → Utilizatori.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Membri comisie</p>
            {teamMembers.map(m => {
              const isSelected = selectedMembers.includes(m.id)
              return (
                <button
                  key={m.id}
                  onClick={() => toggleMember(m.id)}
                  className={`w-full text-left rounded-lg border-2 transition-all ${
                    isSelected ? "border-indigo-400 bg-indigo-50" : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                  style={{ padding: "12px" }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-medium ${isSelected ? "text-indigo-700" : "text-slate-800"}`}>
                        {m.firstName} {m.lastName}
                      </p>
                      <p className="text-[10px] text-slate-400">{m.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-slate-400">{m.role}</span>
                      {isSelected && (
                        <span className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs">✓</span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        <div style={{ height: "16px" }} />
        <p className="text-[10px] text-slate-500">
          {selectedMembers.length} {selectedMembers.length === 1 ? "membru selectat" : "membri selectati"}
          {selectedMembers.length > 0 && ` — fiecare evalueaza ${jobCount} posturi × 6 criterii`}
        </p>

        {/* Cost suplimentar */}
        {extraCr > 0 && (
          <>
            <div style={{ height: "12px" }} />
            <div className="bg-amber-50 rounded-xl border border-amber-200" style={{ padding: "14px" }}>
              <p className="text-xs text-amber-800">
                Aceasta varianta necesita <span className="font-bold">{extraCr} credite suplimentare</span> fata de pachetul de baza.
              </p>
            </div>
          </>
        )}

        <div style={{ height: "20px" }} />
        {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={launchCommitteeWithMembers}
            disabled={selectedMembers.length < 1}
            className="flex-1 py-3 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-40"
          >
            Lanseaza sesiunea ({selectedMembers.length} {selectedMembers.length === 1 ? "membru" : "membri"})
          </button>
          <button
            onClick={() => { setPhase("choose"); setError(null) }}
            className="px-4 py-3 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Inapoi
          </button>
        </div>

        <div style={{ height: "8px" }} />
        <p className="text-[9px] text-slate-400 text-center">
          {variant === "comisie-consultant"
            ? "Consultantul nostru acreditat va fi notificat si va facilita consensul."
            : "AI va identifica divergentele si va media consensul intre membri."}
        </p>
      </>
    )
  }

  // ── Rulare ──
  if (phase === "running") {
    const isAutoOrHibrid = variant === "auto" || variant === "hibrid"
    return (
      <div className="flex flex-col items-center justify-center text-center" style={{ padding: "40px 0" }}>
        {isAutoOrHibrid ? (
          <>
            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            <div style={{ height: "20px" }} />
            <p className="text-sm font-medium text-slate-700">AI evalueaza posturile...</p>
            <p className="text-xs text-slate-400 mt-2">Fiecare post e analizat individual pe 6 criterii.</p>
          </>
        ) : (
          <>
            <span className="text-4xl">👥</span>
            <div style={{ height: "16px" }} />
            <p className="text-sm font-medium text-slate-700">Sesiunea de evaluare a fost creata</p>
            <p className="text-xs text-slate-400 mt-2">
              Membrii comisiei pot accesa sesiunea pentru a evalua individual fiecare post.
              {variant === "comisie-consultant" && " Consultantul nostru va fi notificat pentru facilitare."}
            </p>
            <div style={{ height: "16px" }} />
            {sessionId && (
              <a
                href={`/sessions/${sessionId}`}
                target="_blank"
                rel="noopener"
                className="text-xs text-indigo-600 hover:underline"
              >
                Deschide sesiunea de evaluare →
              </a>
            )}
          </>
        )}
      </div>
    )
  }

  // ── Eroare ──
  if (phase === "error") {
    return (
      <div>
        <div className="bg-red-50 rounded-xl border border-red-200" style={{ padding: "16px" }}>
          <p className="text-sm text-red-700">{error}</p>
        </div>
        <div style={{ height: "16px" }} />
        <button onClick={() => { setPhase("choose"); setError(null) }} className="text-xs text-indigo-600 hover:underline">
          Inapoi la selectie
        </button>
      </div>
    )
  }

  // ── Rezultate ──
  return (
    <>
      <p className="text-sm text-slate-600 leading-relaxed">
        Evaluarea e completa. Verificati ierarhia si validati daca reflecta realitatea organizatiei.
        {variant === "hibrid" && " Puteti trece la faza 2 (comisie) sau valida direct."}
      </p>
      <div style={{ height: "16px" }} />

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left py-2.5 px-3 font-semibold text-slate-500">Post</th>
              <th className="text-left py-2.5 px-3 font-semibold text-slate-500">Departament</th>
              <th className="text-center py-2.5 px-3 font-semibold text-slate-500">Grad</th>
              <th className="text-right py-2.5 px-3 font-semibold text-slate-500">Scor</th>
            </tr>
          </thead>
          <tbody>
            {results.sort((a, b) => b.score - a.score).map((r, i) => (
              <tr key={i} className={`border-b border-slate-50 ${i % 2 === 0 ? "" : "bg-slate-50/50"}`}>
                <td className="py-2 px-3 font-medium text-slate-800">{r.position}</td>
                <td className="py-2 px-3 text-slate-500">{r.department}</td>
                <td className="py-2 px-3 text-center">
                  <span className={`inline-flex w-7 h-7 items-center justify-center rounded-full text-[11px] font-bold ${
                    r.grade === "A" ? "bg-indigo-100 text-indigo-700" :
                    r.grade === "B" ? "bg-blue-100 text-blue-700" :
                    r.grade === "C" ? "bg-cyan-100 text-cyan-700" :
                    r.grade === "D" ? "bg-emerald-100 text-emerald-700" :
                    r.grade === "E" ? "bg-amber-100 text-amber-700" :
                    r.grade === "F" ? "bg-orange-100 text-orange-700" :
                    "bg-slate-100 text-slate-600"
                  }`}>
                    {r.grade}
                  </span>
                </td>
                <td className="py-2 px-3 text-right font-mono text-slate-600">{r.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ height: "20px" }} />
      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={validateResults}
          disabled={validating}
          className="flex-1 py-3 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-40"
        >
          {validating ? "Se valideaza..." : "Deschide raportul pentru validare"}
        </button>
      </div>

      {variant === "hibrid" && (
        <>
          <div style={{ height: "8px" }} />
          <button
            onClick={() => { setVariant("comisie-ai"); setPhase("configure"); loadTeamMembers() }}
            className="w-full py-2 rounded-lg border border-indigo-200 text-indigo-700 text-xs font-medium hover:bg-indigo-50 transition-colors"
          >
            Trece la faza 2: comisia ajusteaza rezultatele
          </button>
        </>
      )}

      <div style={{ height: "8px" }} />
      <p className="text-[9px] text-slate-400 text-center">
        Dupa validare si semnatura, raportul RDA devine oficial.
      </p>
    </>
  )
}
