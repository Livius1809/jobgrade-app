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
  const [profilePanel, setProfilePanel] = useState(false)
  const [evalPanel, setEvalPanel] = useState(false)
  const [reportPanel, setReportPanel] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [calculatorForceOpen, setCalculatorForceOpen] = useState(false)
  const sectionRef = useRef<HTMLDivElement>(null)
  const evalSectionRef = useRef<HTMLDivElement>(null)
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
    const ref = evalPanel ? evalSectionRef.current : sectionRef.current
    if ((profilePanel || evalPanel || reportPanel) && ref) {
      const rect = ref.getBoundingClientRect()
      setPanelLeft(rect.right + 24)
    }
  }, [profilePanel, evalPanel, reportPanel])

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
                    onClick={() => { setEvalPanel(!evalPanel); setProfilePanel(false); setReportPanel(false) }}
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
                <button onClick={() => setEvalPanel(false)} className="text-indigo-700 hover:opacity-70 text-xl font-bold leading-none p-1 rounded transition-opacity" title="Închide">✕</button>
              </div>
              <div style={{ height: "20px" }} />
              <EvaluationPanel onComplete={() => { setEvalPanel(false); window.location.reload() }} />
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
                    onClick={() => { setReportPanel(!reportPanel); setProfilePanel(false); setEvalPanel(false) }}
                    className="text-xs px-4 py-2 rounded-lg font-medium transition-colors shrink-0 bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                  >
                    Deschide raportul →
                  </button>
                )}
              </div>
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

// ── Panou Evaluare ───────────────────────────────────────────────────────────

interface EvalResult {
  position: string
  department: string
  grade: string
  score: number
}

function EvaluationPanel({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<"idle" | "creating" | "evaluating" | "done" | "error">("idle")
  const [results, setResults] = useState<EvalResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [validating, setValidating] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)

  // La mount, verificăm dacă există deja o sesiune
  useEffect(() => {
    fetch("/api/v1/sessions")
      .then(r => r.json())
      .then(data => {
        const sessions = data.sessions || []
        const completed = sessions.find((s: any) => s.status === "COMPLETED" || s.status === "VALIDATED")
        const inProgress = sessions.find((s: any) => s.status !== "DRAFT")

        if (completed) {
          setSessionId(completed.id)
          loadResults(completed.id)
        } else if (inProgress) {
          setSessionId(inProgress.id)
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
        if (data.hierarchy && data.hierarchy.length > 0) {
          setResults(data.hierarchy.map((h: any) => ({
            position: h.title || h.jobTitle,
            department: h.department || "—",
            grade: h.grade || h.letterGrade || "—",
            score: h.totalScore || h.score || 0,
          })))
          setPhase("done")
        }
      }
    } catch {}
  }

  async function startEvaluation() {
    setPhase("creating")
    setError(null)

    try {
      // 1. Creăm sesiune cu toate posturile
      const createRes = await fetch("/api/v1/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `Evaluare AI — ${new Date().toLocaleDateString("ro-RO")}`, autoIncludeAllJobs: true }),
      })

      if (!createRes.ok) {
        const err = await createRes.json()
        throw new Error(err.message || "Nu s-a putut crea sesiunea.")
      }

      const { session } = await createRes.json()
      setSessionId(session.id)

      // 2. Rulăm evaluarea automată AI
      setPhase("evaluating")

      const evalRes = await fetch("/api/v1/sessions/auto-evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id }),
      })

      if (!evalRes.ok) {
        const err = await evalRes.json()
        throw new Error(err.message || "Eroare la evaluarea AI.")
      }

      const evalData = await evalRes.json()

      // 3. Încărcăm rezultatele
      await loadResults(session.id)

      if (results.length === 0 && evalData.jobsEvaluated > 0) {
        // Fallback: încărcăm din scores direct
        setResults([{ position: `${evalData.jobsEvaluated} posturi evaluate`, department: "", grade: "—", score: 0 }])
        setPhase("done")
      }
    } catch (e: any) {
      setError(e.message)
      setPhase("error")
    }
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

  // ── Fază: idle — buton de start ──
  if (phase === "idle") {
    return (
      <>
        <p className="text-sm text-slate-600 leading-relaxed">
          AI-ul analizează fiecare fișă de post și evaluează pe 6 criterii obiective:
          Educație, Comunicare, Rezolvare probleme, Luarea deciziilor, Impact afaceri, Condiții de muncă.
        </p>
        <div style={{ height: "12px" }} />
        <div className="bg-white rounded-xl border border-slate-200" style={{ padding: "16px" }}>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-[10px]">1</span>
            <span>AI citește fișele de post</span>
            <span className="text-slate-300">→</span>
            <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-[10px]">2</span>
            <span>Evaluare pe 6 criterii</span>
            <span className="text-slate-300">→</span>
            <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-[10px]">3</span>
            <span>Ierarhie și grade</span>
          </div>
        </div>
        <div style={{ height: "20px" }} />
        <button
          onClick={startEvaluation}
          className="w-full py-3 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
        >
          Pornește evaluarea AI
        </button>
        <div style={{ height: "8px" }} />
        <p className="text-[9px] text-slate-400 text-center">Durează 10-30 secunde, în funcție de numărul de posturi.</p>
      </>
    )
  }

  // ── Fază: creating / evaluating — loading ──
  if (phase === "creating" || phase === "evaluating") {
    return (
      <div className="flex flex-col items-center justify-center text-center" style={{ padding: "40px 0" }}>
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        <div style={{ height: "20px" }} />
        <p className="text-sm font-medium text-slate-700">
          {phase === "creating" ? "Se creează sesiunea de evaluare..." : "AI evaluează posturile..."}
        </p>
        <div style={{ height: "8px" }} />
        <p className="text-xs text-slate-400">
          {phase === "evaluating" && "Fiecare post e analizat individual pe 6 criterii."}
        </p>
      </div>
    )
  }

  // ── Fază: error ──
  if (phase === "error") {
    return (
      <div>
        <div className="bg-red-50 rounded-xl border border-red-200" style={{ padding: "16px" }}>
          <p className="text-sm text-red-700">{error}</p>
        </div>
        <div style={{ height: "16px" }} />
        <button
          onClick={() => setPhase("idle")}
          className="text-xs text-indigo-600 hover:underline"
        >
          Incearca din nou
        </button>
      </div>
    )
  }

  // ── Fază: done — rezultate ──
  return (
    <>
      <p className="text-sm text-slate-600 leading-relaxed">
        Evaluarea e completa. Verificati ierarhia rezultata si validati daca reflecta realitatea organizatiei.
      </p>
      <div style={{ height: "16px" }} />

      {/* Tabel rezultate */}
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

      <button
        onClick={validateResults}
        disabled={validating}
        className="w-full py-3 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-40"
      >
        {validating ? "Se validează..." : "Validez rezultatele"}
      </button>
      <div style={{ height: "8px" }} />
      <p className="text-[9px] text-slate-400 text-center">
        Dupa validare, raportul RDA devine disponibil in sectiunea Rapoarte.
      </p>
    </>
  )
}
