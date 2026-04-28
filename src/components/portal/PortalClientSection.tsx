"use client"

import React, { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import Icon from "@/components/icons/Icon"
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
  allowedResources?: string[]
}

export default function PortalClientSection({ jobCount, purchasedLayer, purchasedPositions, purchasedEmployees, creditBalance, clientStage, companyName, cui, industry, caenName, address, mission, vision, sessionCount, isValidated, allowedResources }: Props) {
  // Helper: verifică dacă user-ul are acces la o resursă
  const canAccess = (resource: string) => {
    if (!allowedResources || allowedResources.length === 0) return true // fallback: arată tot (compatibilitate înapoi)
    return allowedResources.includes(resource)
  }
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
              <Icon name="icon-companie" size={24} />
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
          {purchasedLayer > 0 && canAccess("JOBS") && (
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
          {purchasedLayer > 0 && canAccess("SESSIONS") && (
            <div
              ref={evalSectionRef}
              className={`rounded-2xl border transition-all ${
                isValidated ? "bg-emerald-50 border-emerald-200" :
                sessionCount > 0 ? "bg-indigo-50 border-indigo-200" :
                jobCount >= 2 ? "bg-white border-indigo-200 shadow-md ring-2 ring-indigo-100" :
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
                    <h3 className={`text-base font-bold ${jobCount < 2 ? "text-slate-400" : "text-slate-900"}`}>
                      Evaluare și ierarhizare
                    </h3>
                    <div style={{ height: "4px" }} />
                    <p className={`text-sm ${jobCount < 2 ? "text-slate-300" : "text-slate-500"}`}>
                      {isValidated
                        ? "Evaluarea e validată. Raportul e disponibil."
                        : sessionCount > 0
                          ? "Evaluarea e completă. Verifică rezultatele și validează."
                          : jobCount >= 2
                            ? "AI evaluează posturile pe 6 criterii obiective. Rezultat în secunde."
                            : `${jobCount}/2 poziții adăugate — mai ${jobCount === 0 ? "adaugă cel puțin 2 poziții" : `adaugă ${2 - jobCount} ${2 - jobCount === 1 ? "poziție" : "poziții"}`} pentru a debloca evaluarea.`}
                    </p>
                  </div>
                </div>

                {jobCount >= 2 && (
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
                  <Icon name="icon-echitate" size={24} />
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
              <EvaluationPanel onComplete={() => { setActivePanel(null); window.location.reload() }} creditBalance={creditBalance} purchasedLayer={purchasedLayer} />
            </div>,
            document.body
          )}

          {/* ═══ CONFORMITATE (Layer 2) — Pachet 2 ═══ */}
          {purchasedLayer >= 2 && isValidated && canAccess("PAY_GAP_REPORT") && (
            <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white" style={{ padding: "28px" }}>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-violet-500 text-white font-bold shrink-0">
                  <Icon name="icon-echitate" size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Conformitate</h3>
                  <p className="text-xs text-violet-600 font-medium">Pachet 2 · Directiva EU 2023/970</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Pay Gap */}
                <a href="/pay-gap"
                  className="bg-white rounded-xl border border-violet-200 hover:border-violet-400 transition-colors p-4 group">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name="icon-pay-gap" size={18} className="opacity-60" />
                    <span className="text-sm font-bold text-slate-800 group-hover:text-violet-700">Analiză decalaj salarial</span>
                  </div>
                  <p className="text-xs text-slate-500">7 indicatori Art. 9, evaluare comună Art. 10</p>
                </a>

                {/* Clase salariale — Salary Grade Manager */}
                <button onClick={() => openPanel("salary-grades")}
                  className="bg-white rounded-xl border border-violet-200 hover:border-violet-400 transition-colors p-4 group text-left">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name="icon-clase-salariale" size={18} className="opacity-60" />
                    <span className="text-sm font-bold text-slate-800 group-hover:text-violet-700">Clase salariale</span>
                  </div>
                  <p className="text-xs text-slate-500">Alocarea curentă, potriviri, trepte, ajustări</p>
                </button>

                {/* Justificări */}
                <a href="/pay-gap"
                  className="bg-white rounded-xl border border-violet-200 hover:border-violet-400 transition-colors p-4 group">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name="icon-semnatura" size={18} className="opacity-60" />
                    <span className="text-sm font-bold text-slate-800 group-hover:text-violet-700">Justificări diferențe</span>
                  </div>
                  <p className="text-xs text-slate-500">Documentare criterii obiective (Art. 9)</p>
                </a>

                {/* Evaluare comună */}
                <a href="/pay-gap/assessments"
                  className="bg-white rounded-xl border border-violet-200 hover:border-violet-400 transition-colors p-4 group">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name="icon-consens" size={18} className="opacity-60" />
                    <span className="text-sm font-bold text-slate-800 group-hover:text-violet-700">Evaluare comuna</span>
                  </div>
                  <p className="text-xs text-slate-500">Plan corectie daca decalaj depaseste 5% (Art. 10)</p>
                </a>

                {/* Notificare anuala Art. 6 */}
                <button onClick={() => openPanel("annual-notification")}
                  className="bg-white rounded-xl border border-violet-200 hover:border-violet-400 transition-colors p-4 group text-left">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name="icon-notificare" size={18} className="opacity-60" />
                    <span className="text-sm font-bold text-slate-800 group-hover:text-violet-700">Notificare anuala Art. 6</span>
                  </div>
                  <p className="text-xs text-slate-500">Informati angajatii despre dreptul la transparenta salariala</p>
                </button>
              </div>
            </div>
          )}

          {/* ═══ COMPETITIVITATE (Layer 3) — Pachet 3 ═══ */}
          {purchasedLayer >= 3 && isValidated && (
            <div className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white" style={{ padding: "28px" }}>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-teal-500 text-white font-bold shrink-0">
                  <Icon name="icon-benchmark" size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Competitivitate</h3>
                  <p className="text-xs text-teal-600 font-medium">Pachet 3 · Benchmark, echipe, leadership</p>
                </div>
              </div>

              {/* Inputuri preluate automat din C1+C2 */}
              <div className="mb-4 bg-teal-50 rounded-xl border border-teal-100 p-3">
                <p className="text-[10px] font-bold text-teal-700 uppercase tracking-wide mb-2">Preluat automat din evaluarea anterioara</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "Fise post standardizate", ok: jobCount >= 3 },
                    { label: "Grila salariala", ok: purchasedLayer >= 2 },
                    { label: "Structura departamente", ok: purchasedLayer >= 2 },
                    { label: "Stat salarii", ok: purchasedEmployees > 0 },
                    { label: "Analiza pay gap", ok: purchasedLayer >= 2 },
                  ].map(item => (
                    <span key={item.label} className={`text-[10px] px-2 py-1 rounded-full border ${
                      item.ok
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                        : "bg-slate-50 border-slate-200 text-slate-400"
                    }`}>
                      {item.ok ? "\u2713" : "\u25CB"} {item.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Inputuri noi C3 — ordinea conteaza: KPI → Pachete → Evaluare → Sociograma */}
              <p className="text-[10px] font-bold text-teal-700 uppercase tracking-wide mb-2">Configurare (in ordine)</p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {/* 1. KPI per post */}
                <button onClick={() => openPanel("c3-kpi")}
                  className="bg-white rounded-xl border border-teal-200 hover:border-teal-400 transition-colors p-4 group text-left">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded font-bold">1</span>
                    <Icon name="icon-dashboard" size={18} className="opacity-60" />
                    <span className="text-sm font-bold text-slate-800 group-hover:text-teal-700">KPI per post</span>
                  </div>
                  <p className="text-xs text-slate-500">Indicatori de performanta — generati AI sau definiti manual.</p>
                </button>

                {/* 2. Pachete salariale */}
                <button onClick={() => openPanel("c3-pachete-salariale")}
                  className="bg-white rounded-xl border border-teal-200 hover:border-teal-400 transition-colors p-4 group text-left">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded font-bold">2</span>
                    <Icon name="icon-clase-salariale" size={18} className="opacity-60" />
                    <span className="text-sm font-bold text-slate-800 group-hover:text-teal-700">Pachete salariale</span>
                  </div>
                  <p className="text-xs text-slate-500">Fix + variabil per post. Leaga KPI de compensatie.</p>
                </button>

                {/* 3. Baterie psihometrica */}
                <button onClick={() => openPanel("psychometrics")}
                  className="bg-white rounded-xl border border-teal-200 hover:border-teal-400 transition-colors p-4 group text-left">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded font-bold">3</span>
                    <Icon name="icon-profil" size={18} className="opacity-60" />
                    <span className="text-sm font-bold text-slate-800 group-hover:text-teal-700">Evaluare psihometrica</span>
                  </div>
                  <p className="text-xs text-slate-500">Selecteaza departament, persoane, motiv, instrumente.</p>
                </button>

                {/* 4. Sociograma Balint */}
                <button onClick={() => openPanel("sociogram")}
                  className="bg-white rounded-xl border border-teal-200 hover:border-teal-400 transition-colors p-4 group text-left">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded font-bold">4</span>
                    <Icon name="icon-consens" size={18} className="opacity-60" />
                    <span className="text-sm font-bold text-slate-800 group-hover:text-teal-700">Sociograma echipe</span>
                  </div>
                  <p className="text-xs text-slate-500">Scenariu Balint — relatii intr-un departament sau proiect.</p>
                </button>

                {/* 5. Documente interne */}
                <button onClick={() => openPanel("c3-documents")}
                  className="bg-white rounded-xl border border-teal-200 hover:border-teal-400 transition-colors p-4 group text-left">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name="icon-raport" size={18} className="opacity-60" />
                    <span className="text-sm font-bold text-slate-800 group-hover:text-teal-700">Documente interne</span>
                  </div>
                  <p className="text-xs text-slate-500">Proceduri, politici, manual angajator, cod etic.</p>
                </button>

                {/* 6. Obiective business */}
                <button onClick={() => openPanel("c3-objectives")}
                  className="bg-white rounded-xl border border-teal-200 hover:border-teal-400 transition-colors p-4 group text-left">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name="icon-dashboard" size={18} className="opacity-60" />
                    <span className="text-sm font-bold text-slate-800 group-hover:text-teal-700">Obiective business</span>
                  </div>
                  <p className="text-xs text-slate-500">Aproximativ — va ajuta rafinarea.</p>
                </button>
              </div>

              {/* Rapoarte C3 (activate de date) */}
              <p className="text-[10px] font-bold text-teal-700 uppercase tracking-wide mb-2">Rapoarte disponibile</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Benchmark vs piata", icon: "icon-benchmark", href: "/benchmark" },
                  { label: "Profil individual", icon: "icon-profil", panel: "c3-profil-individual" },
                  { label: "Compatibilitate om \u2194 post", icon: "icon-consens", panel: "c3-compatibilitate" },
                  { label: "Sociograma Balint", icon: "icon-echipa", panel: "c3-sociogram-results" },
                  { label: "Raport echipa (manager)", icon: "icon-raport", panel: "c3-raport-echipa-mgr" },
                  { label: "Raport echipa (HR)", icon: "icon-raport", panel: "c3-raport-echipa-hr" },
                  { label: "Manual calitate", icon: "icon-manual", panel: "c3-manual-calitate" },
                  { label: "Cost pozitie vacanta", icon: "icon-compensatie", panel: "c3-cost-vacant" },
                  { label: "KPI per post/echipa", icon: "icon-dashboard", panel: "c3-kpi" },
                  { label: "Pachete salariale", icon: "icon-clase-salariale", panel: "c3-pachete-salariale" },
                ].map(item => (
                  item.href ? (
                    <a key={item.label} href={item.href}
                      className="flex items-center gap-2 text-xs bg-white rounded-lg border border-teal-100 hover:border-teal-300 p-2.5 transition-colors">
                      <Icon name={item.icon} size={14} className="opacity-40" />
                      <span className="text-slate-700">{item.label}</span>
                    </a>
                  ) : (
                    <button key={item.label} onClick={() => openPanel(item.panel!)}
                      className="flex items-center gap-2 text-xs bg-white rounded-lg border border-teal-100 hover:border-teal-300 p-2.5 transition-colors text-left">
                      <Icon name={item.icon} size={14} className="opacity-40" />
                      <span className="text-slate-700">{item.label}</span>
                    </button>
                  )
                ))}
              </div>
            </div>
          )}

          {/* ═══ DEZVOLTARE (Layer 4) — Pachet 4 ═══ */}
          {purchasedLayer >= 4 && isValidated && (
            <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-white" style={{ padding: "28px" }}>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-purple-500 text-white font-bold shrink-0">
                  <Icon name="icon-dashboard" size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Dezvoltare organizationala</h3>
                  <p className="text-xs text-purple-600 font-medium">Pachet 4 · Strategie, cultura, transformare</p>
                </div>
              </div>

              {/* Inputuri preluate din C1+C2+C3 */}
              <div className="mb-4 bg-purple-50 rounded-xl border border-purple-100 p-3">
                <p className="text-[10px] font-bold text-purple-700 uppercase tracking-wide mb-2">Preluat din cardurile anterioare</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "Organigrama completa", ok: jobCount >= 3 },
                    { label: "Grila salariala + clase", ok: purchasedLayer >= 2 },
                    { label: "Pay gap + echitate", ok: purchasedLayer >= 2 },
                    { label: "KPI per post", ok: purchasedLayer >= 3 },
                    { label: "Profil psihometric echipe", ok: purchasedLayer >= 3 },
                    { label: "Sociograma relatii", ok: purchasedLayer >= 3 },
                    { label: "MVV companie", ok: !!mission },
                  ].map(item => (
                    <span key={item.label} className={`text-[10px] px-2 py-1 rounded-full border ${
                      item.ok ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-slate-50 border-slate-200 text-slate-400"
                    }`}>
                      {item.ok ? "\u2713" : "\u25CB"} {item.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Inputuri C4 */}
              <p className="text-[10px] font-bold text-purple-700 uppercase tracking-wide mb-2">Configurare C4</p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button onClick={() => openPanel("c4-climate")}
                  className="bg-white rounded-xl border border-purple-200 hover:border-purple-400 transition-colors p-4 group text-left">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold">1</span>
                    <Icon name="icon-consens" size={18} className="opacity-60" />
                    <span className="text-sm font-bold text-slate-800 group-hover:text-purple-700">Climat organizational</span>
                  </div>
                  <p className="text-xs text-slate-500">Chestionar bottom-up pe 8 dimensiuni. Per niveluri ierarhice.</p>
                </button>

                <button onClick={() => openPanel("c4-strategic-objectives")}
                  className="bg-white rounded-xl border border-purple-200 hover:border-purple-400 transition-colors p-4 group text-left">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold">2</span>
                    <Icon name="icon-benchmark" size={18} className="opacity-60" />
                    <span className="text-sm font-bold text-slate-800 group-hover:text-purple-700">Obiective strategice CA</span>
                  </div>
                  <p className="text-xs text-slate-500">Obiectivele Consiliului de Administratie — cascadate top-down.</p>
                </button>

                <button onClick={() => openPanel("c4-documents")}
                  className="bg-white rounded-xl border border-purple-200 hover:border-purple-400 transition-colors p-4 group text-left">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name="icon-raport" size={18} className="opacity-60" />
                    <span className="text-sm font-bold text-slate-800 group-hover:text-purple-700">Documente strategice</span>
                  </div>
                  <p className="text-xs text-slate-500">Minute CA/AGA, plan strategic existent.</p>
                </button>

                <button onClick={() => openPanel("c4-toggle")}
                  className="bg-white rounded-xl border border-purple-200 hover:border-purple-400 transition-colors p-4 group text-left">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name="icon-echitate" size={18} className="opacity-60" />
                    <span className="text-sm font-bold text-slate-800 group-hover:text-purple-700">Calibrare culturala</span>
                  </div>
                  <p className="text-xs text-slate-500">Toggle ON/OFF — aplica Hofstede pe toate rapoartele.</p>
                </button>
              </div>

              {/* Rapoarte C4 */}
              <p className="text-[10px] font-bold text-purple-700 uppercase tracking-wide mb-2">Rapoarte</p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {[
                  { label: "Profil climat organizational", icon: "icon-consens" },
                  { label: "Calibrare culturala", icon: "icon-echitate" },
                  { label: "Capacitate invatare", icon: "icon-profil" },
                  { label: "Capacitate adaptare", icon: "icon-benchmark" },
                  { label: "Declarat vs practicat", icon: "icon-pay-gap" },
                  { label: "ROI cultura", icon: "icon-compensatie" },
                  { label: "Plan interventie multi-nivel", icon: "icon-raport" },
                  { label: "Metrici performanta strategice", icon: "icon-dashboard" },
                  { label: "Manual cultura", icon: "icon-manual" },
                  { label: "Business plan operational", icon: "icon-raport" },
                ].map(item => (
                  <button key={item.label} onClick={() => openPanel(`c4-report-${item.label.toLowerCase().replace(/\s/g, "-")}`)}
                    className="flex items-center gap-2 text-xs bg-white rounded-lg border border-purple-100 hover:border-purple-300 p-2.5 transition-colors text-left">
                    <Icon name={item.icon} size={14} className="opacity-40" />
                    <span className="text-slate-700">{item.label}</span>
                  </button>
                ))}
              </div>

              {/* Simulari C4 */}
              <p className="text-[10px] font-bold text-purple-700 uppercase tracking-wide mb-2">Simulari</p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {[
                  "Cascada obiective CA → operational",
                  "Schimb structura organizationala",
                  "Investesc in dezvoltare",
                  "Schimb management",
                  "Trec la MIXT (om + AI)",
                  "Scenarii piata",
                  "CLASIC vs TRANSFORMATIONAL",
                  "Calibrare culturala ON/OFF",
                ].map(label => (
                  <button key={label} onClick={() => openPanel(`c4-sim-${label.toLowerCase().replace(/\s/g, "-")}`)}
                    className="flex items-center gap-2 text-xs bg-white rounded-lg border border-purple-100 hover:border-purple-300 p-2.5 transition-colors text-left">
                    <span className="text-purple-400 text-[10px]">WIF</span>
                    <span className="text-slate-700">{label}</span>
                  </button>
                ))}
              </div>

              {/* Monitorizare */}
              <p className="text-[10px] font-bold text-purple-700 uppercase tracking-wide mb-2">Monitorizare continua</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Puls lunar", freq: "lunar" },
                  { label: "Maturitate", freq: "trimestrial" },
                  { label: "Impact", freq: "la 3 luni" },
                  { label: "Re-calibrare", freq: "semestrial" },
                  { label: "Raport CA", freq: "anual" },
                ].map(m => (
                  <span key={m.label} className="text-[10px] px-2.5 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700">
                    {m.label} <span className="text-purple-400">({m.freq})</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ═══ Rapoarte ═══ */}
          {purchasedLayer > 0 && canAccess("AUDIT_TRAIL") && (
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
                  <Icon name="icon-raport" size={24} />
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

          {/* ═══ Panou climat organizational C4 ═══ */}
          {activePanel === "c4-climate" && mounted && createPortal(
            <div
              style={{ borderWidth: "3px", top: "100px", left: `${panelLeft}px`, right: "24px", maxHeight: "calc(100vh - 130px)", padding: "28px" }}
              className="fixed rounded-2xl border-purple-400 bg-purple-50 overflow-y-auto shadow-xl z-40"
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Climat organizational</h3>
                  <p className="text-xs text-purple-600 mt-1">Chestionar bottom-up pe 8 dimensiuni — per niveluri ierarhice</p>
                </div>
                <button onClick={() => setActivePanel(null)} className="text-purple-700 hover:opacity-70 text-xl font-bold leading-none p-1 rounded transition-opacity">✕</button>
              </div>
              <ClimatePanel />
            </div>,
            document.body
          )}

          {/* ═══ Panou obiective strategice CA ═══ */}
          {activePanel === "c4-strategic-objectives" && mounted && createPortal(
            <div
              style={{ borderWidth: "3px", top: "100px", left: `${panelLeft}px`, right: "24px", maxHeight: "calc(100vh - 130px)", padding: "28px" }}
              className="fixed rounded-2xl border-purple-400 bg-purple-50 overflow-y-auto shadow-xl z-40"
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Obiective strategice CA</h3>
                  <p className="text-xs text-purple-600 mt-1">Obiectivele Consiliului de Administratie — se cascadeaza top-down</p>
                </div>
                <button onClick={() => setActivePanel(null)} className="text-purple-700 hover:opacity-70 text-xl font-bold leading-none p-1 rounded transition-opacity">✕</button>
              </div>
              <StrategicObjectivesPanel />
            </div>,
            document.body
          )}

          {/* ═══ Panou documente strategice C4 ═══ */}
          {activePanel === "c4-documents" && mounted && createPortal(
            <div
              style={{ borderWidth: "3px", top: "100px", left: `${panelLeft}px`, right: "24px", maxHeight: "calc(100vh - 130px)", padding: "28px" }}
              className="fixed rounded-2xl border-purple-400 bg-purple-50 overflow-y-auto shadow-xl z-40"
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Documente strategice</h3>
                  <p className="text-xs text-purple-600 mt-1">Minute CA/AGA, plan strategic — context pentru analiza C4</p>
                </div>
                <button onClick={() => setActivePanel(null)} className="text-purple-700 hover:opacity-70 text-xl font-bold leading-none p-1 rounded transition-opacity">✕</button>
              </div>
              <C4DocumentsPanel />
            </div>,
            document.body
          )}

          {/* ═══ Panou calibrare culturala C4 ═══ */}
          {activePanel === "c4-toggle" && mounted && createPortal(
            <div
              style={{ borderWidth: "3px", top: "100px", left: `${panelLeft}px`, right: "24px", maxHeight: "calc(100vh - 130px)", padding: "28px" }}
              className="fixed rounded-2xl border-purple-400 bg-purple-50 overflow-y-auto shadow-xl z-40"
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Calibrare culturala</h3>
                  <p className="text-xs text-purple-600 mt-1">Hofstede / David — aplica pe toate rapoartele C4</p>
                </div>
                <button onClick={() => setActivePanel(null)} className="text-purple-700 hover:opacity-70 text-xl font-bold leading-none p-1 rounded transition-opacity">✕</button>
              </div>
              <CulturalCalibrationPanel />
            </div>,
            document.body
          )}

          {/* ═══ Panou documente interne C3 ═══ */}
          {activePanel === "c3-documents" && mounted && createPortal(
            <div
              style={{ borderWidth: "3px", top: "100px", left: `${panelLeft}px`, right: "24px", maxHeight: "calc(100vh - 130px)", padding: "28px" }}
              className="fixed rounded-2xl border-teal-400 bg-teal-50 overflow-y-auto shadow-xl z-40"
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Documente interne</h3>
                  <p className="text-xs text-teal-600 mt-1">Proceduri, politici, manuale — optional dar recomandat pentru analiza completa</p>
                </div>
                <button onClick={() => setActivePanel(null)} className="text-teal-700 hover:opacity-70 text-xl font-bold leading-none p-1 rounded transition-opacity">✕</button>
              </div>
              <DocumentsPanel />
            </div>,
            document.body
          )}

          {/* ═══ Panou obiective business C3 ═══ */}
          {activePanel === "c3-objectives" && mounted && createPortal(
            <div
              style={{ borderWidth: "3px", top: "100px", left: `${panelLeft}px`, right: "24px", maxHeight: "calc(100vh - 130px)", padding: "28px" }}
              className="fixed rounded-2xl border-teal-400 bg-teal-50 overflow-y-auto shadow-xl z-40"
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Obiective business</h3>
                  <p className="text-xs text-teal-600 mt-1">Aproximativ — va ajuta rafinarea. In C4 se detaliaza.</p>
                </div>
                <button onClick={() => setActivePanel(null)} className="text-teal-700 hover:opacity-70 text-xl font-bold leading-none p-1 rounded transition-opacity">✕</button>
              </div>
              <ObjectivesPanel />
            </div>,
            document.body
          )}

          {/* ═══ Panou KPI per post ═══ */}
          {activePanel === "c3-kpi" && mounted && createPortal(
            <div
              style={{ borderWidth: "3px", top: "100px", left: `${panelLeft}px`, right: "24px", maxHeight: "calc(100vh - 130px)", padding: "28px" }}
              className="fixed rounded-2xl border-teal-400 bg-teal-50 overflow-y-auto shadow-xl z-40"
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">KPI per post</h3>
                  <p className="text-xs text-teal-600 mt-1">Defineste indicatori de performanta — manual sau genereaza cu AI</p>
                </div>
                <button onClick={() => setActivePanel(null)} className="text-teal-700 hover:opacity-70 text-xl font-bold leading-none p-1 rounded transition-opacity">✕</button>
              </div>
              <KpiPanel />
            </div>,
            document.body
          )}

          {/* ═══ Panou pachete salariale ═══ */}
          {activePanel === "c3-pachete-salariale" && mounted && createPortal(
            <div
              style={{ borderWidth: "3px", top: "100px", left: `${panelLeft}px`, right: "24px", maxHeight: "calc(100vh - 130px)", padding: "28px" }}
              className="fixed rounded-2xl border-teal-400 bg-teal-50 overflow-y-auto shadow-xl z-40"
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Pachete salariale</h3>
                  <p className="text-xs text-teal-600 mt-1">Fix + variabil per post. Leaga KPI de compensatie.</p>
                </div>
                <button onClick={() => setActivePanel(null)} className="text-teal-700 hover:opacity-70 text-xl font-bold leading-none p-1 rounded transition-opacity">✕</button>
              </div>
              <CompensationPanel />
            </div>,
            document.body
          )}

          {/* ═══ Panou baterie psihometrica ═══ */}
          {activePanel === "psychometrics" && mounted && createPortal(
            <div
              style={{ borderWidth: "3px", top: "100px", left: `${panelLeft}px`, right: "24px", maxHeight: "calc(100vh - 130px)", padding: "28px" }}
              className="fixed rounded-2xl border-teal-400 bg-teal-50 overflow-y-auto shadow-xl z-40"
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Baterie psihometrica</h3>
                  <p className="text-xs text-teal-600 mt-1">Configureaza instrumentele per post si urmareste completarea</p>
                </div>
                <button onClick={() => setActivePanel(null)} className="text-teal-700 hover:opacity-70 text-xl font-bold leading-none p-1 rounded transition-opacity">✕</button>
              </div>
              <PsychometricsPanel />
            </div>,
            document.body
          )}

          {/* ═══ Panou sociograma Balint ═══ */}
          {activePanel === "sociogram" && mounted && createPortal(
            <div
              style={{ borderWidth: "3px", top: "100px", left: `${panelLeft}px`, right: "24px", maxHeight: "calc(100vh - 130px)", padding: "28px" }}
              className="fixed rounded-2xl border-teal-400 bg-teal-50 overflow-y-auto shadow-xl z-40"
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Sociograma echipe — Balint</h3>
                  <p className="text-xs text-teal-600 mt-1">Defineste grupul, membrii completeaza individual prin scenariu</p>
                </div>
                <button onClick={() => setActivePanel(null)} className="text-teal-700 hover:opacity-70 text-xl font-bold leading-none p-1 rounded transition-opacity">✕</button>
              </div>
              <SociogramPanel />
            </div>,
            document.body
          )}

          {/* Panou notificare anuala Art. 6 */}
          {activePanel === "annual-notification" && mounted && createPortal(
            <div
              style={{ borderWidth: "3px", top: "100px", left: `${panelLeft}px`, right: "24px", maxHeight: "calc(100vh - 130px)", padding: "28px" }}
              className="fixed rounded-2xl border-violet-400 bg-violet-50 overflow-y-auto shadow-xl z-40"
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Notificare anuala — Art. 6</h3>
                  <p className="text-xs text-violet-600 mt-1">Informati angajatii despre dreptul la transparenta salariala</p>
                </div>
                <button onClick={() => setActivePanel(null)} className="text-violet-700 hover:opacity-70 text-xl font-bold leading-none p-1 rounded transition-opacity">✕</button>
              </div>
              <AnnualNotificationPanel companyName={companyName} />
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
  criteria?: Record<string, string> // criterionName -> letterCode
  jobId?: string
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
    icon: "icon-ai-tool",
    title: "Evaluare automata AI",
    description: "AI analizeaza fisele de post si evalueaza pe 6 criterii obiective. Dumneavoastra validati si semnati raportul.",
    who: "AI evalueaza, personal acreditat supervizeaza",
    time: "10-30 secunde",
    extraCreditsPerPosition: 0,
  },
  {
    id: "comisie-ai",
    icon: "icon-comisie",
    title: "Comisie interna, mediata AI",
    description: "Membrii comisiei dumneavoastra evalueaza individual. AI identifica divergentele si mediaza consensul.",
    who: "Comisia dumneavoastra evalueaza, AI mediaza",
    time: "2-5 zile (depinde de nr. posturi si disponibilitatea comisiei)",
    extraCreditsPerPosition: 1,
  },
  {
    id: "comisie-consultant",
    icon: "icon-ghidare",
    title: "Comisie interna, mediata de consultant",
    description: "Membrii comisiei dumneavoastra evalueaza. Un consultant acreditat din echipa noastra faciliteaza consensul.",
    who: "Comisia dumneavoastra evalueaza, consultantul nostru mediaza",
    time: "1-2 saptamani",
    extraCreditsPerPosition: 20,
  },
  {
    id: "hibrid",
    icon: "icon-consens",
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
  jobTitle?: string
  departmentId?: string
  departmentName?: string
  phone?: string
}

interface NewMemberForm {
  firstName: string
  lastName: string
  email: string
  jobTitle: string
  phone: string
}

const LAYER_NAMES: Record<number, { name: string; features: string }> = {
  1: { name: "Baza", features: "Evaluare + Ordine internă" },
  2: { name: "Conformitate", features: "+ Structură salarială + Pay Gap" },
  3: { name: "Competitivitate", features: "+ Benchmark piață" },
  4: { name: "Dezvoltare", features: "+ Dezvoltare organizațională" },
}

function EvaluationPanel({ onComplete, creditBalance = 0, purchasedLayer = 0 }: { onComplete: () => void; creditBalance?: number; purchasedLayer?: number }) {
  const [variant, setVariant] = useState<EvalVariant | null>(null)
  const [phase, setPhase] = useState<EvalPhase>("choose")
  const [results, setResults] = useState<EvalResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [validating, setValidating] = useState(false)
  const [expandedResultIdx, setExpandedResultIdx] = useState<number | null>(null)
  const [jobCount, setJobCount] = useState(0)
  // Comisie
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [loadingTeam, setLoadingTeam] = useState(false)
  const [showAddMember, setShowAddMember] = useState(false)
  const [newMember, setNewMember] = useState<NewMemberForm>({ firstName: "", lastName: "", email: "", jobTitle: "", phone: "" })
  const [addingMember, setAddingMember] = useState(false)
  const [inviteMessage, setInviteMessage] = useState("Sunteți invitat(ă) să participați la procesul de evaluare și ierarhizare a posturilor din cadrul companiei. Veți primi acces la platformă unde puteți evalua individual fișele de post alocate pe cele 6 criterii de scorare.")
  const [showInvitePreview, setShowInvitePreview] = useState(false)
  const [confirmInitiate, setConfirmInitiate] = useState(false)

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
            criteria: h.letters || h.criteria || {},
            jobId: h.jobId || h.id,
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
      if (jobIds.length < 2) throw new Error("Sunt necesare cel puțin 2 poziții pentru ierarhizare.")

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
      if (jobIds.length < 2) throw new Error("Sunt necesare cel puțin 2 poziții.")

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

  async function handleAddNewMember() {
    if (!newMember.firstName || !newMember.lastName || !newMember.email) return
    setAddingMember(true)
    try {
      const res = await fetch("/api/v1/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newMember.email,
          firstName: newMember.firstName,
          lastName: newMember.lastName,
          jobTitle: newMember.jobTitle || undefined,
          role: "REPRESENTATIVE",
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const added: TeamMember = {
          id: data.user?.id || data.id || "",
          firstName: newMember.firstName,
          lastName: newMember.lastName,
          email: newMember.email,
          role: "REPRESENTATIVE",
          jobTitle: newMember.jobTitle,
          phone: newMember.phone,
        }
        setTeamMembers(prev => [...prev, added])
        if (added.id) setSelectedMembers(prev => [...prev, added.id])
        setNewMember({ firstName: "", lastName: "", email: "", jobTitle: "", phone: "" })
        setShowAddMember(false)
      }
    } catch {}
    setAddingMember(false)
  }

  function handleRemoveMember(id: string) {
    setSelectedMembers(prev => prev.filter(m => m !== id))
  }

  async function launchCommitteeWithMembers() {
    if (selectedMembers.length < 1) { setError("Selectați cel puțin un membru."); return }

    // Pre-flight: verificare credite
    const selectedVariant = VARIANTS.find(v => v.id === variant)
    const extraCreditsNeeded = selectedVariant ? jobCount * selectedVariant.extraCreditsPerPosition : 0
    if (extraCreditsNeeded > 0 && creditBalance < extraCreditsNeeded) {
      setError(`Credite insuficiente. Aveți ${creditBalance} credite, dar sunt necesare ${extraCreditsNeeded} credite suplimentare (${jobCount} posturi × ${selectedVariant?.extraCreditsPerPosition} credite/post). Achiziționați credite suplimentare din secțiunea Setări → Facturare.`)
      return
    }

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
    const layerInfo = LAYER_NAMES[purchasedLayer]
    return (
      <>
        {layerInfo && (
          <div className="bg-indigo-50 rounded-lg border border-indigo-200 px-3 py-2.5 flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-indigo-700">Nivel {purchasedLayer}: {layerInfo.name}</span>
              <span className="text-[10px] text-indigo-500">{layerInfo.features}</span>
            </div>
            <span className="text-[10px] text-indigo-400">{creditBalance} credite disponibile</span>
          </div>
        )}
        <p className="text-sm text-slate-600 leading-relaxed">
          Alegeți cum doriți să se desfășoare evaluarea posturilor. În toate variantele, dumneavoastră validați și semnați raportul final.
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
                <Icon name={v.icon} size={22} className="mt-0.5 opacity-70" />
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
          Configurați comisia de evaluare. Definiți membrii, verificați datele de contact și personalizați mesajul de invitație.
        </p>

        <div style={{ height: "16px" }} />

        {loadingTeam ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400 mt-3">Se încarcă echipa...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Header membri */}
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Membri comisie</p>
              <button
                onClick={() => setShowAddMember(!showAddMember)}
                className="text-[10px] text-indigo-600 font-medium hover:text-indigo-800 transition-colors"
              >
                + Invită membru nou
              </button>
            </div>

            {/* Formular adăugare membru nou */}
            {showAddMember && (
              <div className="bg-indigo-50 rounded-xl border border-indigo-200 p-4 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={newMember.firstName}
                    onChange={e => setNewMember(p => ({ ...p, firstName: e.target.value }))}
                    placeholder="Prenume *"
                    className="px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    value={newMember.lastName}
                    onChange={e => setNewMember(p => ({ ...p, lastName: e.target.value }))}
                    placeholder="Nume *"
                    className="px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <input
                  value={newMember.email}
                  onChange={e => setNewMember(p => ({ ...p, email: e.target.value }))}
                  placeholder="Email * (primește invitația)"
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={newMember.jobTitle}
                    onChange={e => setNewMember(p => ({ ...p, jobTitle: e.target.value }))}
                    placeholder="Funcție (ex: Director Producție)"
                    className="px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    value={newMember.phone}
                    onChange={e => setNewMember(p => ({ ...p, phone: e.target.value }))}
                    placeholder="Telefon (opțional)"
                    className="px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddNewMember}
                    disabled={addingMember || !newMember.firstName || !newMember.lastName || !newMember.email}
                    className="px-4 py-2 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {addingMember ? "Se adaugă..." : "Adaugă și invită"}
                  </button>
                  <button
                    onClick={() => setShowAddMember(false)}
                    className="px-3 py-2 text-xs text-slate-500 hover:text-slate-700"
                  >
                    Anulează
                  </button>
                </div>
              </div>
            )}

            {/* Lista membri existenți */}
            {teamMembers.length === 0 && !showAddMember ? (
              <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
                <p className="text-xs text-amber-800">
                  Nu s-au găsit utilizatori. Folosiți butonul &ldquo;Invită membru nou&rdquo; pentru a adăuga membrii comisiei.
                </p>
              </div>
            ) : (
              teamMembers.map(m => {
                const isSelected = selectedMembers.includes(m.id)
                return (
                  <div
                    key={m.id}
                    className={`rounded-lg border-2 transition-all ${
                      isSelected ? "border-indigo-400 bg-indigo-50" : "border-slate-200 bg-white"
                    }`}
                    style={{ padding: "12px" }}
                  >
                    <div className="flex items-center justify-between">
                      <button onClick={() => toggleMember(m.id)} className="flex-1 text-left">
                        <p className={`text-sm font-medium ${isSelected ? "text-indigo-700" : "text-slate-800"}`}>
                          {m.firstName} {m.lastName}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-0.5">
                          {m.jobTitle && <span className="text-[10px] text-slate-500">{m.jobTitle}</span>}
                          {m.departmentName && <span className="text-[10px] text-slate-400">· {m.departmentName}</span>}
                          <span className="text-[10px] text-slate-400">· {m.email}</span>
                        </div>
                      </button>
                      <div className="flex items-center gap-2 shrink-0">
                        {isSelected ? (
                          <>
                            <span className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs">✓</span>
                            <button onClick={() => handleRemoveMember(m.id)} className="text-[10px] text-red-400 hover:text-red-600" title="Elimină">✕</button>
                          </>
                        ) : (
                          <button onClick={() => toggleMember(m.id)} className="text-[10px] text-indigo-500 hover:text-indigo-700">Selectează</button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}

            {/* Summary */}
            <p className="text-[10px] text-slate-500">
              {selectedMembers.length} {selectedMembers.length === 1 ? "membru selectat" : "membri selectați"}
              {selectedMembers.length > 0 && ` — fiecare evaluează ${jobCount} posturi × 6 criterii`}
            </p>
          </div>
        )}

        {/* Cost suplimentar */}
        {extraCr > 0 && (
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-3 mt-3">
            <p className="text-xs text-amber-800">
              Această variantă necesită <span className="font-bold">{extraCr} credite suplimentare</span> față de pachetul de bază.
            </p>
          </div>
        )}

        {/* Mesaj invitație */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Mesaj invitație</p>
            <button
              onClick={() => setShowInvitePreview(!showInvitePreview)}
              className="text-[10px] text-indigo-600 hover:text-indigo-800"
            >
              {showInvitePreview ? "Ascunde preview" : "Preview"}
            </button>
          </div>
          <textarea
            value={inviteMessage}
            onChange={e => setInviteMessage(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50"
            placeholder="Personalizați mesajul de invitație..."
          />
          {showInvitePreview && (
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <p className="text-[10px] text-gray-500 mb-1 font-medium">Preview email:</p>
              <p className="text-xs text-gray-700 leading-relaxed">{inviteMessage}</p>
              <div className="mt-2 text-[9px] text-gray-400 italic">
                + Link de activare cont + instrucțiuni de utilizare
              </div>
            </div>
          )}
        </div>

        {/* Bifă inițiere */}
        <div className="mt-4 bg-blue-50 rounded-xl border border-blue-200 p-4 space-y-2">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmInitiate}
              onChange={e => setConfirmInitiate(e.target.checked)}
              className="mt-1 shrink-0"
            />
            <div>
              <p className="text-xs font-medium text-blue-800">Inițiază sesiunea de evaluare</p>
              <p className="text-[10px] text-blue-600 mt-0.5 leading-relaxed">
                Membrii vor primi email de invitație cu link de activare. Fiecare va evalua individual fișele alocate pe cele 6 criterii.
                După finalizarea pre-scorării, se deschide discuția de grup pentru atingerea consensului.
              </p>
            </div>
          </label>
        </div>

        <div style={{ height: "16px" }} />
        {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={launchCommitteeWithMembers}
            disabled={selectedMembers.length < 1 || !confirmInitiate}
            className="flex-1 py-3 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-40"
          >
            Lansează sesiunea ({selectedMembers.length} {selectedMembers.length === 1 ? "membru" : "membri"})
          </button>
          <button
            onClick={() => { setPhase("choose"); setError(null); setConfirmInitiate(false) }}
            className="px-4 py-3 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Înapoi
          </button>
        </div>

        <div style={{ height: "8px" }} />
        <p className="text-[9px] text-slate-400 text-center">
          {variant === "comisie-consultant"
            ? "Consultantul nostru acreditat va fi notificat și va facilita consensul."
            : "AI va identifica divergențele și va media consensul între membri."}
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
          <CommitteeProgressView
            sessionId={sessionId}
            variant={variant}
            onResultsReady={() => { if (sessionId) loadResults(sessionId) }}
          />
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
            {results.sort((a, b) => b.score - a.score).map((r, i) => {
              const isExpanded = expandedResultIdx === i
              const CRITERION_LABELS: Record<string, string> = {
                Knowledge: "Educație", Communications: "Comunicare",
                ProblemSolving: "Rezolvare probleme", DecisionMaking: "Luarea deciziilor",
                BusinessImpact: "Impact afaceri", WorkingConditions: "Condiții muncă",
              }
              return (
                <React.Fragment key={i}>
                  <tr
                    className={`border-b border-slate-50 cursor-pointer hover:bg-indigo-50/50 transition-colors ${i % 2 === 0 ? "" : "bg-slate-50/50"}`}
                    onClick={() => setExpandedResultIdx(isExpanded ? null : i)}
                  >
                    <td className="py-2 px-3 font-medium text-slate-800">
                      <span className="text-gray-400 mr-1">{isExpanded ? "▼" : "▶"}</span>
                      {r.position}
                    </td>
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
                  {isExpanded && r.criteria && Object.keys(r.criteria).length > 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-2 bg-indigo-50/50">
                        <div className="flex flex-wrap gap-2 pl-5">
                          {Object.entries(r.criteria).map(([key, letter]) => (
                            <div key={key} className="flex items-center gap-1.5 bg-white rounded-lg border border-gray-200 px-2.5 py-1.5">
                              <span className="text-[10px] text-gray-500">{CRITERION_LABELS[key] || key}</span>
                              <span className="text-xs font-bold text-indigo-700">{letter as string}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
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

// ── Panou Rapoarte ──────────────────────────────────────────────────────────

// ─── Progres comisie (vizibil din portal) ─────────────────────────────

function CommitteeProgressView({ sessionId, variant, onResultsReady }: {
  sessionId: string | null
  variant: EvalVariant | null
  onResultsReady: () => void
}) {
  const [progress, setProgress] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!sessionId) return
    const load = () => {
      fetch(`/api/v1/sessions/${sessionId}/admin-progress`)
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) setProgress(data) })
        .catch(() => {})
        .finally(() => setLoading(false))
    }
    load()
    const interval = setInterval(load, 15000)
    return () => clearInterval(interval)
  }, [sessionId])

  // Check if all done → auto-transition to results
  useEffect(() => {
    if (!progress) return
    const allDone = progress.totals.completed === progress.totals.totalMembers && progress.totals.totalMembers > 0
    if (allDone) onResultsReady()
  }, [progress, onResultsReady])

  if (!sessionId) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-slate-500">Sesiunea nu a fost creată.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 text-left">
      <div className="flex items-center gap-3">
        <Icon name="icon-comisie" size={24} />
        <div>
          <p className="text-sm font-medium text-slate-700">Comisia evaluează</p>
          <p className="text-[10px] text-slate-400">
            {variant === "comisie-consultant" ? "Consultantul nostru facilitează consensul." : "AI mediază consensul între membri."}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-4">
          <div className="w-6 h-6 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : progress ? (
        <>
          {/* Overall progress */}
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-700">Progres general</span>
              <span className="text-xs font-bold text-indigo-600">
                {progress.totals.completed}/{progress.totals.totalMembers} finalizat
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${progress.totals.totalMembers > 0 ? (progress.totals.completed / progress.totals.totalMembers) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Per-member status */}
          <div className="space-y-1.5">
            {(progress.members || []).map((m: any) => {
              const pct = m.totalJobs > 0 ? Math.round((m.submittedJobs / m.totalJobs) * 100) : 0
              return (
                <div key={m.userId} className="flex items-center gap-3 bg-white rounded-lg border border-gray-100 px-3 py-2">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${
                    m.status === "completed" || m.status === "ready" ? "bg-green-500" :
                    m.status === "in_progress" ? "bg-yellow-500" :
                    m.status === "started" ? "bg-orange-400" : "bg-gray-300"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-gray-900 truncate">
                      {m.firstName} {m.lastName}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${pct === 100 ? "bg-green-500" : "bg-indigo-400"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-500 w-12 text-right">
                      {m.submittedJobs}/{m.totalJobs}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Deadline warning */}
          {progress.session.daysLeft !== null && progress.session.daysLeft <= 3 && (
            <div className={`rounded-lg p-2.5 text-xs ${
              progress.session.daysLeft <= 0 ? "bg-red-50 text-red-700 border border-red-200" :
              "bg-amber-50 text-amber-700 border border-amber-200"
            }`}>
              {progress.session.daysLeft <= 0 ? "Termen depășit" :
                `${progress.session.daysLeft} ${progress.session.daysLeft === 1 ? "zi" : "zile"} rămase`}
            </div>
          )}
        </>
      ) : null}

      <a
        href={`/sessions/${sessionId}`}
        target="_blank"
        rel="noopener"
        className="block text-center text-xs text-indigo-600 hover:underline"
      >
        Deschide sesiunea de evaluare →
      </a>
    </div>
  )
}

function ReportPanel() {
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState<any[]>([])
  const [exporting, setExporting] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/v1/sessions")
      .then(r => r.json())
      .then(data => {
        setSessions((data.sessions || []).filter((s: any) =>
          s.status === "VALIDATED" || s.status === "COMPLETED" || s.status === "OWNER_VALIDATION"
        ))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function handleExport(sessionId: string, format: string) {
    setExporting(`${sessionId}-${format}`)
    try {
      const res = await fetch(`/api/v1/sessions/${sessionId}/export/${format}`)
      if (!res.ok) {
        alert("Eroare la export. Verificați soldul de credite.")
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const ext = format === "excel" ? "xlsx" : format
      a.download = `raport-${sessionId.slice(0, 8)}.${ext}`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert("Eroare de rețea.")
    } finally {
      setExporting(null)
    }
  }

  if (loading) {
    return (
      <div className="text-center" style={{ padding: "40px 0" }}>
        <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-400 mt-3">Se verifică rapoartele...</p>
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div className="bg-amber-50 rounded-xl border border-amber-200" style={{ padding: "16px" }}>
        <p className="text-xs text-amber-800">
          Niciun raport disponibil. Finalizați evaluarea și validați rezultatele.
        </p>
      </div>
    )
  }

  const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    COMPLETED: { label: "Finalizat", color: "bg-green-100 text-green-700" },
    VALIDATED: { label: "Validat", color: "bg-blue-100 text-blue-700" },
    OWNER_VALIDATION: { label: "Validare Owner", color: "bg-amber-100 text-amber-700" },
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 leading-relaxed">
        Rapoartele de Diagnostic Analitic (RDA) pentru sesiunile finalizate.
      </p>

      {sessions.map((s: any) => {
        const status = STATUS_LABELS[s.status] || { label: s.status, color: "bg-gray-100 text-gray-600" }
        return (
          <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-sm text-gray-900">{s.name}</div>
                <div className="text-xs text-gray-500">
                  {new Date(s.createdAt).toLocaleDateString("ro-RO")}
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${status.color}`}>
                {status.label}
              </span>
            </div>

            {/* Preview link */}
            <div className="flex gap-2">
              <a
                href={`/sessions/${s.id}/results`}
                target="_blank"
                rel="noopener"
                className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold text-center hover:bg-indigo-700 transition-colors"
              >
                Vizualizează ierarhia
              </a>
              {(s.status === "COMPLETED" || s.status === "VALIDATED") && (
                <a
                  href={`/reports/master?session=${s.id}`}
                  target="_blank"
                  rel="noopener"
                  className="flex-1 py-2 rounded-lg bg-purple-600 text-white text-xs font-semibold text-center hover:bg-purple-700 transition-colors"
                >
                  Raport complet
                </a>
              )}
            </div>

            {/* Export buttons */}
            <div className="flex gap-1.5">
              {([
                { fmt: "pdf", cost: 5 },
                { fmt: "excel", cost: 5 },
                { fmt: "json", cost: 5 },
                { fmt: "xml", cost: 5 },
              ]).map(({ fmt, cost }) => (
                <button
                  key={fmt}
                  onClick={() => {
                    if (confirm(`Export ${fmt.toUpperCase()} — se vor deduce ${cost} credite din sold. Continuați?`)) {
                      handleExport(s.id, fmt)
                    }
                  }}
                  disabled={exporting === `${s.id}-${fmt}`}
                  className="flex-1 py-1.5 rounded-md bg-gray-100 text-gray-700 text-[10px] font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors uppercase"
                  title={`${cost} credite`}
                >
                  {exporting === `${s.id}-${fmt}` ? "..." : <>{fmt} <span className="text-gray-400">({cost}cr)</span></>}
                </button>
              ))}
            </div>

            {/* Validation link */}
            {s.status === "OWNER_VALIDATION" && (
              <a
                href={`/sessions/${s.id}/validate`}
                className="block text-center py-2 rounded-lg bg-amber-100 text-amber-700 text-xs font-medium hover:bg-amber-200 transition-colors"
              >
                Validare în curs — verifică
              </a>
            )}

            {/* Pay Gap + Journal links */}
            <div className="flex gap-3 justify-center">
              <a href="/pay-gap" className="text-[10px] text-violet-500 hover:text-violet-700">
                Analiză Pay Gap →
              </a>
              <a href={`/sessions/${s.id}/journal`} target="_blank" rel="noopener"
                className="text-[10px] text-gray-400 hover:text-gray-600">
                Jurnal proces →
              </a>
            </div>
          </div>
        )
      })}

      <p className="text-[9px] text-slate-400 text-center">
        Rapoartele includ: ierarhia posturilor, clase salariale, proces verbal și pagina de validare cu semnătură.
        Exportul consumă credite din sold.
      </p>
    </div>
  )
}

// ─── Panou Climat Organizational C4 ──────────────────────────────────

const CLIMATE_DIMENSIONS = [
  { id: "sarcina", label: "Orientare spre sarcina", description: "Claritate roluri, obiective, standarde" },
  { id: "structura", label: "Structura organizationala", description: "Ierarhie, reguli, proceduri, birocratizare" },
  { id: "relatii", label: "Relatii interpersonale", description: "Colaborare, incredere, comunicare intre colegi" },
  { id: "motivatie", label: "Motivatie si angajament", description: "Satisfactie, loialitate, implicare" },
  { id: "suport", label: "Suport organizational", description: "Resurse, training, feedback constructiv" },
  { id: "conducere", label: "Conducere si leadership", description: "Stil managerial, viziune, decizie" },
  { id: "schimbare", label: "Deschidere la schimbare", description: "Inovare, adaptabilitate, rezistenta" },
  { id: "performanta", label: "Orientare spre performanta", description: "Excelenta, competitie sanatoasa, rezultate" },
]

function ClimatePanel() {
  const [levels, setLevels] = useState<string[]>(["management", "middle", "operational"])
  const [selectedLevel, setSelectedLevel] = useState("management")
  const [status, setStatus] = useState<Record<string, { sent: number; completed: number }>>({})
  const [saving, setSaving] = useState(false)
  const [newLevel, setNewLevel] = useState("")

  useEffect(() => {
    fetch("/api/v1/card-inputs?card=C4_CLIMATE").then(r => r.json()).then(d => {
      if (d.data) {
        if (d.data.levels?.length) setLevels(d.data.levels)
        if (d.data.status) setStatus(d.data.status)
      }
    }).catch(() => {})
  }, [])

  const saveClimate = async (newLevels?: string[]) => {
    const lvls = newLevels || levels
    await fetch("/api/v1/card-inputs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ card: "C4_CLIMATE", data: { levels: lvls, status } }),
    }).catch(() => {})
  }

  const addLevel = () => {
    if (newLevel && !levels.includes(newLevel)) {
      const updated = [...levels, newLevel]
      setLevels(updated)
      setNewLevel("")
      saveClimate(updated)
    }
  }

  const LEVEL_LABELS: Record<string, string> = {
    management: "Management (directori, C-level)",
    middle: "Middle management (sefi departament, team leaderi)",
    operational: "Operational (specialisti, executanti)",
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-purple-100 p-3">
        <p className="text-xs text-slate-600">
          Chestionarul masoara 8 dimensiuni ale climatului organizational.
          Se administreaza <strong>bottom-up pe niveluri ierarhice</strong> — fiecare nivel
          raspunde separat, apoi se compara perceptiile.
        </p>
      </div>

      {/* Dimensiuni */}
      <div className="bg-white rounded-xl border border-purple-200 p-4">
        <h4 className="text-sm font-bold text-slate-800 mb-3">8 dimensiuni evaluate</h4>
        <div className="grid grid-cols-2 gap-2">
          {CLIMATE_DIMENSIONS.map(dim => (
            <div key={dim.id} className="bg-purple-50 rounded-lg border border-purple-100 p-2.5">
              <span className="text-xs font-medium text-purple-800">{dim.label}</span>
              <p className="text-[10px] text-slate-500 mt-0.5">{dim.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Niveluri ierarhice */}
      <div className="bg-white rounded-xl border border-purple-200 p-4">
        <h4 className="text-sm font-bold text-slate-800 mb-3">Niveluri ierarhice (cine completeaza)</h4>
        <div className="space-y-2 mb-3">
          {levels.map(level => (
            <div key={level} className="flex items-center justify-between bg-purple-50 rounded-lg border border-purple-100 p-2.5">
              <span className="text-xs font-medium text-slate-800">{LEVEL_LABELS[level] || level}</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400">{status[level]?.completed || 0}/{status[level]?.sent || 0} completat</span>
                <button className="text-[10px] px-2 py-0.5 rounded bg-purple-600 text-white hover:bg-purple-700">
                  Trimite chestionar
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input type="text" value={newLevel} onChange={e => setNewLevel(e.target.value)}
            placeholder="Alt nivel (ex: board, consultanti)" className="flex-1 px-2 py-1.5 rounded border border-purple-200 text-xs" />
          <button onClick={addLevel} disabled={!newLevel} className="px-3 py-1.5 rounded bg-purple-600 text-white text-xs disabled:opacity-40">+</button>
        </div>
      </div>

      <p className="text-[9px] text-slate-400">
        Rezultatele se compara intre niveluri: ce vede managementul vs ce simte operationalul.
        Diferentele mari indica probleme de comunicare sau perceptie.
      </p>
    </div>
  )
}

// ─── Panou Obiective Strategice CA ───────────────────────────────────

function StrategicObjectivesPanel() {
  const [objectives, setObjectives] = useState<Array<{
    text: string; owner: string; cascadeTo: string; kpi: string; deadline: string
  }>>([
    { text: "", owner: "", cascadeTo: "", kpi: "", deadline: "" },
  ])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch("/api/v1/card-inputs?card=C4_STRATEGIC_OBJ").then(r => r.json()).then(d => {
      if (d.data?.objectives?.length) setObjectives(d.data.objectives)
    }).catch(() => {})
  }, [])

  const addObj = () => setObjectives(prev => [...prev, { text: "", owner: "", cascadeTo: "", kpi: "", deadline: "" }])
  const updateObj = (idx: number, field: string, value: string) =>
    setObjectives(prev => prev.map((o, i) => i === idx ? { ...o, [field]: value } : o))
  const removeObj = (idx: number) => objectives.length > 1 && setObjectives(prev => prev.filter((_, i) => i !== idx))

  const handleSave = async () => {
    setSaving(true)
    await fetch("/api/v1/card-inputs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ card: "C4_STRATEGIC_OBJ", data: { objectives } }),
    })
    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 3000)
  }

  const filledCount = objectives.filter(o => o.text.trim().length > 10).length

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-purple-100 p-3">
        <p className="text-xs text-slate-600">
          Obiectivele CA se <strong>cascadeaza top-down</strong>: CA → Director → Manager → Echipa → Individual.
          Fiecare nivel traduce obiectivul in actiuni concrete la nivelul sau.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-purple-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold text-slate-800">Obiective CA ({filledCount})</h4>
          <button onClick={addObj} className="text-[10px] text-purple-600 hover:text-purple-800">+ Adauga</button>
        </div>

        <div className="space-y-3">
          {objectives.map((obj, idx) => (
            <div key={idx} className="bg-slate-50 rounded-lg border border-slate-200 p-3">
              <div className="flex items-start gap-2">
                <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded mt-1">{idx + 1}</span>
                <div className="flex-1 space-y-2">
                  <textarea value={obj.text} onChange={e => updateObj(idx, "text", e.target.value)} rows={2}
                    placeholder="ex: Cresterea cotei de piata cu 15% in segmentul enterprise pana la Q4 2027"
                    className="w-full px-2 py-1.5 rounded border border-slate-200 text-xs resize-y" />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" value={obj.owner} onChange={e => updateObj(idx, "owner", e.target.value)}
                      placeholder="Responsabil (Director HR, DG...)" className="px-2 py-1.5 rounded border border-slate-200 text-xs" />
                    <input type="text" value={obj.cascadeTo} onChange={e => updateObj(idx, "cascadeTo", e.target.value)}
                      placeholder="Se cascadeaza la (dept, echipa)" className="px-2 py-1.5 rounded border border-slate-200 text-xs" />
                    <input type="text" value={obj.kpi} onChange={e => updateObj(idx, "kpi", e.target.value)}
                      placeholder="KPI masurabil (15% cota piata)" className="px-2 py-1.5 rounded border border-slate-200 text-xs" />
                    <input type="date" value={obj.deadline} onChange={e => updateObj(idx, "deadline", e.target.value)}
                      className="px-2 py-1.5 rounded border border-slate-200 text-xs" />
                  </div>
                </div>
                {objectives.length > 1 && (
                  <button onClick={() => removeObj(idx)} className="text-red-400 hover:text-red-600 mt-1">✕</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button onClick={handleSave} disabled={saving || filledCount === 0}
        className="text-xs px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40">
        {saving ? "Se salveaza..." : saved ? "Salvat" : `Salveaza ${filledCount} obiectiv${filledCount !== 1 ? "e" : ""}`}
      </button>

      <p className="text-[9px] text-slate-400">
        Simularea "Cascada obiective" va traduce automat fiecare obiectiv CA in
        sub-obiective departamentale si apoi in KPI-uri individuale.
      </p>
    </div>
  )
}

// ─── Panou Documente Strategice C4 ───────────────────────────────────

const C4_DOCUMENT_TYPES = [
  { id: "minute_ca", label: "Minute CA", description: "Procesele verbale ale Consiliului de Administratie" },
  { id: "minute_aga", label: "Minute AGA", description: "Procesele verbale ale Adunarii Generale a Actionarilor" },
  { id: "plan_strategic", label: "Plan strategic existent", description: "Documentul strategic curent (daca exista)" },
  { id: "raport_anual", label: "Raport anual", description: "Raportul anual de activitate" },
  { id: "buget_aprobat", label: "Buget aprobat", description: "Bugetul aprobat de CA pentru exercitiul curent" },
  { id: "altul", label: "Alt document strategic", description: "Orice document relevant pentru analiza strategica" },
]

function C4DocumentsPanel() {
  const [docs, setDocs] = useState<Record<string, { checked: boolean; notes: string }>>(() => {
    const init: Record<string, { checked: boolean; notes: string }> = {}
    for (const dt of C4_DOCUMENT_TYPES) init[dt.id] = { checked: false, notes: "" }
    return init
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const init: Record<string, { checked: boolean; notes: string }> = {}
    for (const dt of C4_DOCUMENT_TYPES) init[dt.id] = { checked: false, notes: "" }
    fetch("/api/v1/card-inputs?card=C4_DOCUMENTS").then(r => r.json()).then(d => {
      if (d.data) setDocs({ ...init, ...d.data })
    }).catch(() => {})
  }, [])

  const toggleDoc = (id: string) => setDocs(prev => ({ ...prev, [id]: { ...prev[id], checked: !prev[id]?.checked } }))
  const updateNotes = (id: string, notes: string) => setDocs(prev => ({ ...prev, [id]: { ...prev[id], notes } }))

  const handleSave = async () => {
    setSaving(true)
    await fetch("/api/v1/card-inputs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ card: "C4_DOCUMENTS", data: docs }),
    })
    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 3000)
  }

  const checkedCount = Object.values(docs).filter(d => d.checked).length

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-purple-100 p-3">
        <p className="text-xs text-slate-600">
          Documentele strategice ajuta la intelegerea <strong>istoricului decizional</strong> al companiei.
          Cu cat avem mai mult context, cu atat analiza C4 e mai relevanta.
        </p>
      </div>

      <div className="flex gap-3 text-center">
        <div className="bg-white rounded-lg border border-purple-200 p-3 flex-1">
          <p className="text-lg font-bold text-purple-700">{checkedCount}</p>
          <p className="text-[9px] text-slate-500 uppercase">Disponibile</p>
        </div>
        <div className="bg-white rounded-lg border border-purple-200 p-3 flex-1">
          <p className="text-lg font-bold text-slate-400">{C4_DOCUMENT_TYPES.length - checkedCount}</p>
          <p className="text-[9px] text-slate-500 uppercase">Lipsa</p>
        </div>
      </div>

      <div className="space-y-1.5">
        {C4_DOCUMENT_TYPES.map(dt => (
          <div key={dt.id} className={`rounded-lg border p-3 transition-colors ${
            docs[dt.id]?.checked ? "bg-purple-50 border-purple-200" : "bg-white border-slate-200"
          }`}>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={docs[dt.id]?.checked || false} onChange={() => toggleDoc(dt.id)} className="mt-0.5" />
              <div className="flex-1">
                <span className="text-sm font-medium text-slate-800">{dt.label}</span>
                <p className="text-[10px] text-slate-400">{dt.description}</p>
              </div>
            </label>
            {docs[dt.id]?.checked && (
              <input type="text" value={docs[dt.id]?.notes || ""} onChange={e => updateNotes(dt.id, e.target.value)}
                placeholder="Note: ex. ultima sedinta 15.03.2026, acoperire..."
                className="w-full mt-2 ml-6 px-2 py-1.5 rounded border border-purple-200 bg-white text-xs" />
            )}
          </div>
        ))}
      </div>

      <button onClick={handleSave} disabled={saving}
        className="text-xs px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40">
        {saving ? "Se salveaza..." : saved ? "Salvat" : "Salveaza"}
      </button>
    </div>
  )
}

// ─── Panou Calibrare Culturala C4 ────────────────────────────────────

function CulturalCalibrationPanel() {
  const [enabled, setEnabled] = useState(false)
  const [hofstedeValues, setHofstedeValues] = useState({
    powerDistance: 90,
    individualism: 30,
    masculinity: 42,
    uncertaintyAvoidance: 90,
    longTermOrientation: 52,
    indulgence: 20,
  })

  useEffect(() => {
    fetch("/api/v1/card-inputs?card=C4_CALIBRATION").then(r => r.json()).then(d => {
      if (d.data) {
        if (d.data.enabled !== undefined) setEnabled(d.data.enabled)
        if (d.data.hofstede) setHofstedeValues(prev => ({ ...prev, ...d.data.hofstede }))
      }
    }).catch(() => {})
  }, [])

  // Auto-save la fiecare schimbare toggle/slider
  const saveCalibration = (newEnabled?: boolean, newValues?: typeof hofstedeValues) => {
    fetch("/api/v1/card-inputs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        card: "C4_CALIBRATION",
        data: { enabled: newEnabled ?? enabled, hofstede: newValues ?? hofstedeValues },
      }),
    }).catch(() => {})
  }

  const dimensions = [
    { key: "powerDistance", label: "Distanta fata de putere", desc: "Cat de mult se accepta inegalitatea. RO: mare (90)", low: "Egalitar", high: "Ierarhic" },
    { key: "individualism", label: "Individualism vs Colectivism", desc: "Individ vs grup. RO: colectivist (30)", low: "Colectivist", high: "Individualist" },
    { key: "masculinity", label: "Masculinitate vs Feminitate", desc: "Competitie vs cooperare. RO: moderat (42)", low: "Cooperare", high: "Competitie" },
    { key: "uncertaintyAvoidance", label: "Evitarea incertitudinii", desc: "Toleranta la ambiguitate. RO: mare (90)", low: "Flexibil", high: "Rigid" },
    { key: "longTermOrientation", label: "Orientare pe termen lung", desc: "Traditie vs pragmatism. RO: moderat (52)", low: "Traditie", high: "Pragmatism" },
    { key: "indulgence", label: "Indulgenta vs Restrictie", desc: "Libertate exprimare vs norma. RO: restrictiv (20)", low: "Restrictiv", high: "Indulgent" },
  ]

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-purple-100 p-3">
        <p className="text-xs text-slate-600">
          Calibrarea culturala aplica modelul <strong>Hofstede</strong> pe toate rapoartele C4.
          Valorile pre-populare sunt pentru Romania. Ajusteaza daca compania opereaza in alt context cultural.
        </p>
      </div>

      {/* Toggle master */}
      <div className="bg-white rounded-xl border border-purple-200 p-4">
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <span className="text-sm font-bold text-slate-800">Calibrare culturala</span>
            <p className="text-[10px] text-slate-500 mt-0.5">Aplica Hofstede pe rapoartele Declarat vs Practicat, ROI Cultura, Plan interventie</p>
          </div>
          <div className={`relative w-12 h-6 rounded-full transition-colors ${enabled ? "bg-purple-500" : "bg-slate-300"}`}
            onClick={() => { const v = !enabled; setEnabled(v); saveCalibration(v) }}>
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? "translate-x-6" : "translate-x-0.5"}`} />
          </div>
        </label>
      </div>

      {/* Dimensiuni Hofstede */}
      {enabled && (
        <div className="bg-white rounded-xl border border-purple-200 p-4 space-y-4">
          <h4 className="text-sm font-bold text-slate-800">6 dimensiuni Hofstede</h4>
          {dimensions.map(dim => {
            const val = hofstedeValues[dim.key as keyof typeof hofstedeValues]
            return (
              <div key={dim.key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-slate-800">{dim.label}</span>
                  <span className="text-xs font-mono text-purple-700">{val}</span>
                </div>
                <p className="text-[9px] text-slate-400 mb-1.5">{dim.desc}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-slate-400 w-16">{dim.low}</span>
                  <input type="range" min={0} max={100} value={val}
                    onChange={e => {
                      const updated = { ...hofstedeValues, [dim.key]: Number(e.target.value) }
                      setHofstedeValues(updated)
                    }}
                    onMouseUp={() => saveCalibration(undefined, hofstedeValues)}
                    className="flex-1 accent-purple-500" />
                  <span className="text-[9px] text-slate-400 w-16 text-right">{dim.high}</span>
                </div>
              </div>
            )
          })}
          <p className="text-[9px] text-slate-400">
            Sursa: Hofstede Insights — Romania. Ajusteaza valorile daca compania are cultura
            distincta de media nationala (multinationala, startup, etc).
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Panou Documente Interne C3 ──────────────────────────────────────

const C3_DOCUMENT_TYPES = [
  { id: "proceduri_lucru", label: "Proceduri de lucru", description: "Proceduri operationale per departament/post", category: "Operationale" },
  { id: "politica_recrutare", label: "Politica de recrutare", description: "Criterii selectie, etape interviu, grile evaluare", category: "HR" },
  { id: "politica_formare", label: "Politica de formare profesionala", description: "Plan de training, buget, evaluare eficacitate", category: "HR" },
  { id: "politica_salariala", label: "Politica salariala", description: "Filozofie compensatii, criterii promovare, bonus", category: "HR" },
  { id: "regulament_dept", label: "Regulamente departamentale", description: "Reguli specifice per departament", category: "Operationale" },
  { id: "manual_angajator", label: "Manual angajator", description: "Ghidul companiei pentru manageri", category: "Manuale" },
  { id: "manual_angajat", label: "Manual angajat", description: "Ghidul noului angajat (onboarding)", category: "Manuale" },
  { id: "cod_etic", label: "Cod etic / Cod de conduita", description: "Valori, principii, comportament asteptat", category: "Guvernanta" },
  { id: "regulament_intern", label: "Regulament intern", description: "ROI — Regulamentul de Ordine Interioara", category: "Guvernanta" },
  { id: "altul", label: "Alt document", description: "Orice document relevant care nu se incadreaza in categoriile de mai sus", category: "Altele" },
]

function DocumentsPanel() {
  const [docs, setDocs] = useState<Record<string, { checked: boolean; fileName: string | null; notes: string }>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const init: Record<string, { checked: boolean; fileName: string | null; notes: string }> = {}
    for (const dt of C3_DOCUMENT_TYPES) init[dt.id] = { checked: false, fileName: null, notes: "" }
    fetch("/api/v1/card-inputs?card=C3_DOCUMENTS").then(r => r.json()).then(d => {
      if (d.data) setDocs({ ...init, ...d.data })
      else setDocs(init)
    }).catch(() => setDocs(init))
  }, [])

  const toggleDoc = (id: string) => {
    setDocs(prev => ({ ...prev, [id]: { ...prev[id], checked: !prev[id]?.checked } }))
  }

  const updateNotes = (id: string, notes: string) => {
    setDocs(prev => ({ ...prev, [id]: { ...prev[id], notes } }))
  }

  const handleSave = async () => {
    setSaving(true)
    await fetch("/api/v1/card-inputs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ card: "C3_DOCUMENTS", data: docs }),
    })
    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 3000)
  }

  const checkedCount = Object.values(docs).filter(d => d.checked).length
  const categories = [...new Set(C3_DOCUMENT_TYPES.map(d => d.category))]

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-teal-100 p-3">
        <p className="text-xs text-slate-600">
          Bifati documentele pe care le aveti disponibile si adaugati note despre stadiul lor.
          Nu sunt obligatorii, dar imbunatatesc semnificativ calitatea rapoartelor C3.
        </p>
      </div>

      <div className="flex gap-3 text-center">
        <div className="bg-white rounded-lg border border-teal-200 p-3 flex-1">
          <p className="text-lg font-bold text-teal-700">{checkedCount}</p>
          <p className="text-[9px] text-slate-500 uppercase">Disponibile</p>
        </div>
        <div className="bg-white rounded-lg border border-teal-200 p-3 flex-1">
          <p className="text-lg font-bold text-slate-400">{C3_DOCUMENT_TYPES.length - checkedCount}</p>
          <p className="text-[9px] text-slate-500 uppercase">Lipsa</p>
        </div>
      </div>

      {categories.map(cat => (
        <div key={cat}>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">{cat}</p>
          <div className="space-y-1.5">
            {C3_DOCUMENT_TYPES.filter(d => d.category === cat).map(dt => (
              <div key={dt.id} className={`rounded-lg border p-3 transition-colors ${
                docs[dt.id]?.checked ? "bg-teal-50 border-teal-200" : "bg-white border-slate-200"
              }`}>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={docs[dt.id]?.checked || false} onChange={() => toggleDoc(dt.id)} className="mt-0.5" />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-slate-800">{dt.label}</span>
                    <p className="text-[10px] text-slate-400">{dt.description}</p>
                  </div>
                </label>
                {docs[dt.id]?.checked && (
                  <input type="text" value={docs[dt.id]?.notes || ""} onChange={e => updateNotes(dt.id, e.target.value)}
                    placeholder="Note: ex. actualizat in 2025, acoperire partiala..."
                    className="w-full mt-2 ml-6 px-2 py-1.5 rounded border border-teal-200 bg-white text-xs" />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <button onClick={handleSave} disabled={saving}
        className="text-xs px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-40">
        {saving ? "Se salveaza..." : saved ? "Salvat" : "Salveaza configuratia"}
      </button>
    </div>
  )
}

// ─── Panou Obiective Business C3 ─────────────────────────────────────

function ObjectivesPanel() {
  const [objectives, setObjectives] = useState<Array<{ text: string; timeframe: string; priority: string }>>([
    { text: "", timeframe: "12_MONTHS", priority: "MEDIUM" },
  ])
  const [context, setContext] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch("/api/v1/card-inputs?card=C3_OBJECTIVES").then(r => r.json()).then(d => {
      if (d.data) {
        if (d.data.objectives?.length) setObjectives(d.data.objectives)
        if (d.data.context) setContext(d.data.context)
      }
    }).catch(() => {})
  }, [])

  const addObjective = () => {
    setObjectives(prev => [...prev, { text: "", timeframe: "12_MONTHS", priority: "MEDIUM" }])
  }

  const updateObj = (idx: number, field: string, value: string) => {
    setObjectives(prev => prev.map((o, i) => i === idx ? { ...o, [field]: value } : o))
  }

  const removeObj = (idx: number) => {
    if (objectives.length <= 1) return
    setObjectives(prev => prev.filter((_, i) => i !== idx))
  }

  const handleSave = async () => {
    setSaving(true)
    await fetch("/api/v1/card-inputs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ card: "C3_OBJECTIVES", data: { objectives, context } }),
    })
    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 3000)
  }

  const filledCount = objectives.filter(o => o.text.trim().length > 10).length

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-teal-100 p-3">
        <p className="text-xs text-slate-600 mb-2">
          Nu cerem formulare complexe. Descrieti in cuvintele voastre ce vreti sa obtineti.
          In C4 vom rafina impreuna.
        </p>
        <div className="flex gap-2 text-[10px] text-teal-600">
          <span className="bg-teal-50 px-2 py-0.5 rounded">Unde vreti sa ajungeti?</span>
          <span className="bg-teal-50 px-2 py-0.5 rounded">Ce va ingrijoreaza?</span>
          <span className="bg-teal-50 px-2 py-0.5 rounded">Ce nu functioneaza?</span>
        </div>
      </div>

      {/* Context general */}
      <div className="bg-white rounded-xl border border-teal-200 p-4">
        <label className="block text-xs font-medium mb-1">Contextul companiei (optional)</label>
        <textarea value={context} onChange={e => setContext(e.target.value)} rows={2}
          placeholder="ex: Suntem in crestere rapida, am angajat 30 oameni in 6 luni, procesele nu tin pasul..."
          className="w-full px-3 py-2 rounded-lg border border-teal-200 bg-white text-sm resize-y" />
      </div>

      {/* Obiective */}
      <div className="bg-white rounded-xl border border-teal-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold text-slate-800">Obiective ({filledCount} completate)</h4>
          <button onClick={addObjective} className="text-[10px] text-teal-600 hover:text-teal-800">+ Adauga obiectiv</button>
        </div>

        <div className="space-y-3">
          {objectives.map((obj, idx) => (
            <div key={idx} className="bg-slate-50 rounded-lg border border-slate-200 p-3">
              <div className="flex items-start gap-2">
                <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded mt-1">{idx + 1}</span>
                <div className="flex-1">
                  <textarea value={obj.text} onChange={e => updateObj(idx, "text", e.target.value)} rows={2}
                    placeholder="ex: Reducem fluctuatia de personal sub 10% in departamentul productie"
                    className="w-full px-2 py-1.5 rounded border border-slate-200 text-xs resize-y mb-2" />
                  <div className="flex gap-2">
                    <select value={obj.timeframe} onChange={e => updateObj(idx, "timeframe", e.target.value)}
                      className="px-2 py-1 rounded border border-slate-200 text-[10px]">
                      <option value="3_MONTHS">3 luni</option>
                      <option value="6_MONTHS">6 luni</option>
                      <option value="12_MONTHS">12 luni</option>
                      <option value="24_MONTHS">2 ani</option>
                      <option value="ONGOING">Continuu</option>
                    </select>
                    <select value={obj.priority} onChange={e => updateObj(idx, "priority", e.target.value)}
                      className="px-2 py-1 rounded border border-slate-200 text-[10px]">
                      <option value="LOW">Importanta scazuta</option>
                      <option value="MEDIUM">Importanta medie</option>
                      <option value="HIGH">Importanta ridicata</option>
                      <option value="CRITICAL">Critica</option>
                    </select>
                  </div>
                </div>
                {objectives.length > 1 && (
                  <button onClick={() => removeObj(idx)} className="text-red-400 hover:text-red-600 mt-1">✕</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button onClick={handleSave} disabled={saving || filledCount === 0}
        className="text-xs px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-40">
        {saving ? "Se salveaza..." : saved ? "Salvat" : `Salveaza ${filledCount} obiectiv${filledCount !== 1 ? "e" : ""}`}
      </button>

      <p className="text-[9px] text-slate-400">
        Obiectivele aproximative sunt suficiente acum. In Card 4 (Dezvoltare) vom lucra impreuna
        la rafinarea lor in obiective SMART cu indicatori masurabili.
      </p>
    </div>
  )
}

// ─── Panou KPI per post ──────────────────────────────────────────────

function KpiPanel() {
  const [jobs, setJobs] = useState<Array<{ id: string; title: string }>>([])
  const [selectedJob, setSelectedJob] = useState("")
  const [kpis, setKpis] = useState<any[]>([])
  const [allKpis, setAllKpis] = useState<Record<string, any[]>>({})
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch("/api/v1/jobs").then(r => r.json()),
      fetch("/api/v1/compensation-packages").then(r => r.json()),
    ]).then(([jobData, compData]) => {
      setJobs(Array.isArray(jobData) ? jobData : (jobData.jobs || []))
      // Group KPIs per job from compensation endpoint
      const kpiMap: Record<string, any[]> = {}
      for (const pkg of (compData.packages || [])) {
        if (pkg.kpis?.length) kpiMap[pkg.jobId] = pkg.kpis
      }
      setAllKpis(kpiMap)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const handleGenerate = async () => {
    if (!selectedJob) return
    setGenerating(true)
    try {
      const res = await fetch("/api/v1/ai/kpi-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: selectedJob }),
      })
      if (res.ok) {
        const data = await res.json()
        setKpis(data.kpis || [])
      }
    } catch {}
    setGenerating(false)
  }

  const handleSave = async () => {
    if (!selectedJob || kpis.length === 0) return
    setSaving(true)
    await fetch("/api/v1/kpis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: selectedJob, kpis }),
    })
    setAllKpis(prev => ({ ...prev, [selectedJob]: kpis }))
    setKpis([])
    setSelectedJob("")
    setSaving(false)
  }

  const addManualKpi = () => {
    setKpis(prev => [...prev, { name: "", description: "", targetValue: "", measurementUnit: "", frequency: "MONTHLY", weight: 0 }])
  }

  const updateKpi = (idx: number, field: string, value: any) => {
    setKpis(prev => prev.map((k, i) => i === idx ? { ...k, [field]: value } : k))
  }

  const removeKpi = (idx: number) => setKpis(prev => prev.filter((_, i) => i !== idx))

  if (loading) return <p className="text-xs text-slate-400">Se incarca...</p>

  const jobsWithKpi = Object.keys(allKpis).length
  const totalKpis = Object.values(allKpis).reduce((s, arr) => s + arr.length, 0)

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-lg border border-teal-200 p-3 text-center">
          <p className="text-lg font-bold text-teal-700">{jobsWithKpi}</p>
          <p className="text-[9px] text-slate-500 uppercase">Posturi cu KPI</p>
        </div>
        <div className="bg-white rounded-lg border border-teal-200 p-3 text-center">
          <p className="text-lg font-bold text-teal-700">{totalKpis}</p>
          <p className="text-[9px] text-slate-500 uppercase">KPI-uri totale</p>
        </div>
        <div className="bg-white rounded-lg border border-teal-200 p-3 text-center">
          <p className="text-lg font-bold text-teal-700">{jobs.length - jobsWithKpi}</p>
          <p className="text-[9px] text-slate-500 uppercase">Posturi fara KPI</p>
        </div>
      </div>

      {/* Configurare per post */}
      <div className="bg-white rounded-xl border border-teal-200 p-4">
        <h4 className="text-sm font-bold text-slate-800 mb-3">Defineste KPI pentru un post</h4>
        <select value={selectedJob} onChange={e => { setSelectedJob(e.target.value); setKpis([]) }}
          className="w-full px-3 py-2 rounded-lg border border-teal-200 bg-white text-sm mb-3">
          <option value="">Selecteaza postul...</option>
          {jobs.map(j => (
            <option key={j.id} value={j.id}>
              {j.title} {allKpis[j.id] ? `(${allKpis[j.id].length} KPI)` : ""}
            </option>
          ))}
        </select>

        {selectedJob && kpis.length === 0 && (
          <div className="flex gap-2 mb-3">
            <button onClick={handleGenerate} disabled={generating}
              className="text-xs px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40">
              {generating ? "AI genereaza..." : "Genereaza cu AI (3 credite)"}
            </button>
            <button onClick={addManualKpi}
              className="text-xs px-4 py-2 rounded-lg border border-teal-200 text-teal-700 hover:bg-teal-50">
              Adauga manual
            </button>
          </div>
        )}

        {/* Editor KPI */}
        {kpis.length > 0 && (
          <div className="space-y-2 mb-3">
            {kpis.map((kpi, idx) => (
              <div key={idx} className="bg-slate-50 rounded-lg border border-slate-200 p-3">
                <div className="flex items-start gap-2">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <input type="text" value={kpi.name} onChange={e => updateKpi(idx, "name", e.target.value)}
                      placeholder="Numele KPI" className="px-2 py-1.5 rounded border border-slate-200 text-xs" />
                    <input type="text" value={kpi.targetValue} onChange={e => updateKpi(idx, "targetValue", e.target.value)}
                      placeholder="Valoare tinta" className="px-2 py-1.5 rounded border border-slate-200 text-xs" />
                    <input type="text" value={kpi.measurementUnit} onChange={e => updateKpi(idx, "measurementUnit", e.target.value)}
                      placeholder="Unitate (%, RON, nr)" className="px-2 py-1.5 rounded border border-slate-200 text-xs" />
                    <div className="flex gap-1">
                      <select value={kpi.frequency} onChange={e => updateKpi(idx, "frequency", e.target.value)}
                        className="flex-1 px-2 py-1.5 rounded border border-slate-200 text-xs">
                        <option value="MONTHLY">Lunar</option>
                        <option value="QUARTERLY">Trimestrial</option>
                        <option value="ANNUALLY">Anual</option>
                      </select>
                      <input type="number" value={kpi.weight} onChange={e => updateKpi(idx, "weight", Number(e.target.value))}
                        placeholder="%" className="w-16 px-2 py-1.5 rounded border border-slate-200 text-xs" />
                    </div>
                  </div>
                  <button onClick={() => removeKpi(idx)} className="text-red-400 hover:text-red-600 mt-1">✕</button>
                </div>
                {kpi.description && <p className="text-[10px] text-slate-400 mt-1">{kpi.description}</p>}
              </div>
            ))}
            <div className="flex gap-2">
              <button onClick={addManualKpi} className="text-xs px-3 py-1.5 rounded border border-teal-200 text-teal-700">+ Adauga</button>
              <button onClick={handleSave} disabled={saving || kpis.some(k => !k.name)}
                className="text-xs px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-40">
                {saving ? "Se salveaza..." : `Salveaza ${kpis.length} KPI-uri`}
              </button>
            </div>
            <p className="text-[9px] text-slate-400">Suma ponderilor trebuie sa fie 100%. Acum: {kpis.reduce((s, k) => s + (k.weight || 0), 0)}%</p>
          </div>
        )}
      </div>

      {/* Posturi cu KPI deja configurate */}
      {jobsWithKpi > 0 && (
        <div>
          <h4 className="text-sm font-bold text-slate-800 mb-2">Posturi cu KPI configurate</h4>
          <div className="space-y-2">
            {Object.entries(allKpis).map(([jobId, jobKpis]) => {
              const job = jobs.find(j => j.id === jobId)
              return (
                <div key={jobId} className="bg-white rounded-lg border border-slate-200 p-3">
                  <span className="text-sm font-medium text-slate-800">{job?.title || jobId}</span>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {jobKpis.map((k: any, i: number) => (
                      <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-700">
                        {k.name} ({k.weight}%)
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Panou Pachete Salariale ─────────────────────────────────────────

function CompensationPanel() {
  const [jobs, setJobs] = useState<Array<{ id: string; title: string }>>([])
  const [packages, setPackages] = useState<any[]>([])
  const [selectedJob, setSelectedJob] = useState("")
  const [baseSalary, setBaseSalary] = useState("")
  const [components, setComponents] = useState<Array<{ name: string; type: string; value: string; linkedKpi: string }>>([])
  const [benefits, setBenefits] = useState<Array<{ name: string; value: string }>>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadData = () => {
    Promise.all([
      fetch("/api/v1/jobs").then(r => r.json()),
      fetch("/api/v1/compensation-packages").then(r => r.json()),
    ]).then(([jobData, compData]) => {
      setJobs(Array.isArray(jobData) ? jobData : (jobData.jobs || []))
      setPackages(compData.packages || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  const addComponent = () => setComponents(prev => [...prev, { name: "", type: "BONUS", value: "", linkedKpi: "" }])
  const addBenefit = () => setBenefits(prev => [...prev, { name: "", value: "" }])

  const handleSave = async () => {
    if (!selectedJob || !baseSalary) return
    setSaving(true)
    await fetch("/api/v1/compensation-packages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobId: selectedJob,
        baseSalary: Number(baseSalary),
        components: {
          variable: components.filter(c => c.name),
        },
        benefits: benefits.filter(b => b.name).length > 0 ? { items: benefits.filter(b => b.name) } : null,
      }),
    })
    setSelectedJob("")
    setBaseSalary("")
    setComponents([])
    setBenefits([])
    loadData()
    setSaving(false)
  }

  if (loading) return <p className="text-xs text-slate-400">Se incarca...</p>

  // KPI-uri per job (din packages)
  const selectedPkg = packages.find(p => p.jobId === selectedJob)
  const selectedKpis = selectedPkg?.kpis || []

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-lg border border-teal-200 p-3 text-center">
          <p className="text-lg font-bold text-teal-700">{packages.length}</p>
          <p className="text-[9px] text-slate-500 uppercase">Pachete configurate</p>
        </div>
        <div className="bg-white rounded-lg border border-teal-200 p-3 text-center">
          <p className="text-lg font-bold text-teal-700">{packages.filter(p => (p.components?.variable || []).length > 0).length}</p>
          <p className="text-[9px] text-slate-500 uppercase">Cu parte variabila</p>
        </div>
        <div className="bg-white rounded-lg border border-teal-200 p-3 text-center">
          <p className="text-lg font-bold text-teal-700">{jobs.length - packages.length}</p>
          <p className="text-[9px] text-slate-500 uppercase">Posturi fara pachet</p>
        </div>
      </div>

      {/* Configurare */}
      <div className="bg-white rounded-xl border border-teal-200 p-4">
        <h4 className="text-sm font-bold text-slate-800 mb-3">Configureaza pachet salarial</h4>
        <select value={selectedJob} onChange={e => { setSelectedJob(e.target.value); setComponents([]); setBenefits([]) }}
          className="w-full px-3 py-2 rounded-lg border border-teal-200 bg-white text-sm mb-3">
          <option value="">Selecteaza postul...</option>
          {jobs.map(j => {
            const pkg = packages.find(p => p.jobId === j.id)
            return <option key={j.id} value={j.id}>{j.title} {pkg ? `(${pkg.baseSalary.toLocaleString("ro-RO")} RON)` : ""}</option>
          })}
        </select>

        {selectedJob && (
          <>
            {/* Salariu fix */}
            <div className="mb-4">
              <label className="block text-xs font-medium mb-1">Salariu brut fix (RON)</label>
              <input type="number" value={baseSalary} onChange={e => setBaseSalary(e.target.value)}
                placeholder={selectedPkg ? String(selectedPkg.baseSalary) : "ex: 5000"}
                className="w-full px-3 py-2 rounded-lg border border-teal-200 bg-white text-sm" />
            </div>

            {/* Parte variabila */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium">Componente variabile</label>
                <button onClick={addComponent} className="text-[10px] text-teal-600 hover:text-teal-800">+ Adauga componenta</button>
              </div>
              {components.length === 0 && (
                <p className="text-[10px] text-slate-400 bg-slate-50 rounded-lg p-2">Nicio componenta variabila. Adauga bonus, comision, prima.</p>
              )}
              {components.map((comp, idx) => (
                <div key={idx} className="flex gap-2 mb-1.5">
                  <input type="text" value={comp.name} onChange={e => setComponents(prev => prev.map((c, i) => i === idx ? { ...c, name: e.target.value } : c))}
                    placeholder="Nume (Bonus Q)" className="flex-1 px-2 py-1.5 rounded border border-slate-200 text-xs" />
                  <select value={comp.type} onChange={e => setComponents(prev => prev.map((c, i) => i === idx ? { ...c, type: e.target.value } : c))}
                    className="px-2 py-1.5 rounded border border-slate-200 text-xs">
                    <option value="BONUS">Bonus</option>
                    <option value="COMMISSION">Comision</option>
                    <option value="PRIMA">Prima</option>
                    <option value="OTHER">Altul</option>
                  </select>
                  <input type="text" value={comp.value} onChange={e => setComponents(prev => prev.map((c, i) => i === idx ? { ...c, value: e.target.value } : c))}
                    placeholder="Valoare/%" className="w-24 px-2 py-1.5 rounded border border-slate-200 text-xs" />
                  {selectedKpis.length > 0 && (
                    <select value={comp.linkedKpi} onChange={e => setComponents(prev => prev.map((c, i) => i === idx ? { ...c, linkedKpi: e.target.value } : c))}
                      className="px-2 py-1.5 rounded border border-slate-200 text-xs">
                      <option value="">Legat de KPI...</option>
                      {selectedKpis.map((k: any) => (
                        <option key={k.id || k.name} value={k.name}>{k.name} ({k.weight}%)</option>
                      ))}
                    </select>
                  )}
                  <button onClick={() => setComponents(prev => prev.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600">✕</button>
                </div>
              ))}
            </div>

            {/* Beneficii */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium">Beneficii non-salariale</label>
                <button onClick={addBenefit} className="text-[10px] text-teal-600 hover:text-teal-800">+ Adauga beneficiu</button>
              </div>
              {benefits.map((ben, idx) => (
                <div key={idx} className="flex gap-2 mb-1.5">
                  <input type="text" value={ben.name} onChange={e => setBenefits(prev => prev.map((b, i) => i === idx ? { ...b, name: e.target.value } : b))}
                    placeholder="Tichete masa, asigurare..." className="flex-1 px-2 py-1.5 rounded border border-slate-200 text-xs" />
                  <input type="text" value={ben.value} onChange={e => setBenefits(prev => prev.map((b, i) => i === idx ? { ...b, value: e.target.value } : b))}
                    placeholder="Valoare/luna" className="w-28 px-2 py-1.5 rounded border border-slate-200 text-xs" />
                  <button onClick={() => setBenefits(prev => prev.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600">✕</button>
                </div>
              ))}
            </div>

            <button onClick={handleSave} disabled={saving || !baseSalary}
              className="text-xs px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-40">
              {saving ? "Se salveaza..." : "Salveaza pachetul"}
            </button>
          </>
        )}
      </div>

      {/* Pachete existente */}
      {packages.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-slate-800 mb-2">Pachete configurate</h4>
          <div className="space-y-2">
            {packages.map((pkg: any) => (
              <div key={pkg.id} className="bg-white rounded-lg border border-slate-200 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-800">{pkg.jobTitle}</span>
                  <span className="text-sm font-bold text-teal-700">{pkg.baseSalary.toLocaleString("ro-RO")} RON</span>
                </div>
                {pkg.department && <p className="text-[10px] text-slate-400 mb-1">{pkg.department}</p>}
                <div className="flex flex-wrap gap-1">
                  {(pkg.components?.variable || []).map((v: any, i: number) => (
                    <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700">
                      {v.name}: {v.value} {v.linkedKpi ? `→ ${v.linkedKpi}` : ""}
                    </span>
                  ))}
                  {pkg.kpis?.length > 0 && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-700">
                      {pkg.kpis.length} KPI
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Panou Baterie Psihometrica ──────────────────────────────────────

function PsychometricsPanel() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [step, setStep] = useState<"dept" | "people" | "reason" | "instruments" | "done">("dept")
  const [selectedDept, setSelectedDept] = useState("")
  const [selectedPeople, setSelectedPeople] = useState<string[]>([])
  const [newPerson, setNewPerson] = useState({ code: "", name: "", post: "" })
  const [addedPeople, setAddedPeople] = useState<Array<{ code: string; name: string; post: string }>>([])
  const [reason, setReason] = useState("")
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const loadData = () => {
    fetch("/api/v1/psychometrics").then(r => r.json()).then(d => {
      setData(d)
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  if (loading) return <p className="text-xs text-slate-400">Se incarca...</p>
  if (!data) return <p className="text-xs text-red-500">Eroare la incarcare.</p>

  const instruments: any[] = data.instruments || []
  const batteries: any[] = data.batteries || []
  const stats = data.stats || {}
  const orgByDept: Record<string, any[]> = data.orgByDept || {}
  const deptNames = Object.keys(orgByDept).sort()
  const deptPeople = selectedDept ? (orgByDept[selectedDept] || []) : []

  // Toate persoanele selectate (din stat + adaugate manual)
  const allSelected = [
    ...deptPeople.filter((p: any) => selectedPeople.includes(p.code)),
    ...addedPeople,
  ]

  const handleAddPerson = () => {
    if (!newPerson.code || !newPerson.name) return
    setAddedPeople(prev => [...prev, { ...newPerson }])
    setNewPerson({ code: "", name: "", post: "" })
  }

  const handleSave = async () => {
    setSaving(true)
    // Configureaza bateria per colectiv
    await fetch("/api/v1/psychometrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "configure-battery",
        jobId: `eval_${selectedDept}_${Date.now()}`,
        jobTitle: `Evaluare ${selectedDept} — ${allSelected.length} persoane`,
        instruments: selectedInstruments,
        evaluationContext: {
          department: selectedDept,
          reason,
          people: allSelected.map((p: any) => ({ code: p.code, name: p.name, post: p.post })),
          addedManually: addedPeople.length,
        },
      }),
    })
    // Asigneaza fiecare persoana
    for (const person of allSelected) {
      await fetch("/api/v1/psychometrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "assign-employee",
          employeeCode: person.code,
          employeeName: person.name,
          jobId: `eval_${selectedDept}_${Date.now()}`,
        }),
      })
    }
    loadData()
    setStep("done")
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      {/* Stats compacte */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Evaluari active", value: stats.batteriesConfigured || 0 },
          { label: "Persoane asignate", value: stats.totalAssignments || 0 },
          { label: "Completate", value: stats.completed || 0 },
          { label: "Completare", value: `${stats.completionPct || 0}%` },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-lg border border-teal-200 p-3 text-center">
            <p className="text-lg font-bold text-teal-700">{s.value}</p>
            <p className="text-[9px] text-slate-500 uppercase">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Progres pasi */}
      <div className="flex gap-1">
        {[
          { id: "dept", label: "1. Departament" },
          { id: "people", label: "2. Persoane" },
          { id: "reason", label: "3. Motiv" },
          { id: "instruments", label: "4. Instrumente" },
        ].map(s => (
          <div key={s.id} className={`flex-1 text-center text-[10px] py-1.5 rounded-lg font-medium ${
            step === s.id ? "bg-teal-500 text-white" :
            ["dept", "people", "reason", "instruments"].indexOf(step) > ["dept", "people", "reason", "instruments"].indexOf(s.id)
              ? "bg-teal-100 text-teal-700" : "bg-slate-100 text-slate-400"
          }`}>{s.label}</div>
        ))}
      </div>

      {/* PAS 1: Selecteaza departament */}
      {step === "dept" && (
        <div className="bg-white rounded-xl border border-teal-200 p-4">
          <h4 className="text-sm font-bold text-slate-800 mb-3">Selecteaza departamentul</h4>
          {deptNames.length > 0 ? (
            <>
              <select value={selectedDept} onChange={e => { setSelectedDept(e.target.value); setSelectedPeople([]) }}
                className="w-full px-3 py-2 rounded-lg border border-teal-200 bg-white text-sm mb-3">
                <option value="">Alege departamentul...</option>
                {deptNames.map(d => (
                  <option key={d} value={d}>{d} ({orgByDept[d]?.length || 0} persoane)</option>
                ))}
              </select>
              {selectedDept && (
                <button onClick={() => setStep("people")}
                  className="text-xs px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700">
                  Continua — vezi persoanele
                </button>
              )}
            </>
          ) : (
            <p className="text-xs text-slate-500">Nu exista departamente. Importa mai intai statul de functii si statul de salarii.</p>
          )}
        </div>
      )}

      {/* PAS 2: Selecteaza persoanele */}
      {step === "people" && (
        <div className="bg-white rounded-xl border border-teal-200 p-4">
          <h4 className="text-sm font-bold text-slate-800 mb-1">Persoane din {selectedDept}</h4>
          <p className="text-[10px] text-slate-500 mb-3">Bifeaza pe cine doresti sa evaluezi. Informatiile vin din organigrama.</p>

          {deptPeople.length > 0 ? (
            <div className="space-y-1.5 mb-4 max-h-64 overflow-y-auto">
              {deptPeople.map((p: any) => (
                <label key={p.code} className={`flex items-center gap-3 text-xs p-2.5 rounded-lg border cursor-pointer transition-colors ${
                  selectedPeople.includes(p.code) ? "bg-teal-50 border-teal-300" : "bg-white border-slate-200 hover:border-teal-200"
                }`}>
                  <input type="checkbox"
                    checked={selectedPeople.includes(p.code)}
                    onChange={e => {
                      if (e.target.checked) setSelectedPeople(prev => [...prev, p.code])
                      else setSelectedPeople(prev => prev.filter(c => c !== p.code))
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-slate-800">{p.code}</span>
                    <span className="text-slate-500 mx-1">·</span>
                    <span className="text-slate-600">{p.post}</span>
                  </div>
                  <div className="flex gap-2 text-[10px] text-slate-400 shrink-0">
                    {p.grade && <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">{p.grade}</span>}
                    <span>{p.salary?.toLocaleString("ro-RO")} RON</span>
                    {p.variable > 0 && <span className="text-amber-600">+{p.variable?.toLocaleString("ro-RO")} var</span>}
                  </div>
                </label>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 mb-4">Nu exista angajati in acest departament. Importa statul de salarii.</p>
          )}

          {/* Adaugare persoane noi */}
          <div className="border-t border-slate-100 pt-3 mb-3">
            <p className="text-[10px] font-bold text-slate-600 uppercase mb-2">Persoana noua (nu e in stat)</p>
            <div className="flex gap-2">
              <input type="text" value={newPerson.code} onChange={e => setNewPerson(p => ({ ...p, code: e.target.value }))}
                placeholder="Cod/marca" className="flex-1 px-2 py-1.5 rounded border border-slate-200 text-xs" />
              <input type="text" value={newPerson.name} onChange={e => setNewPerson(p => ({ ...p, name: e.target.value }))}
                placeholder="Nume complet" className="flex-1 px-2 py-1.5 rounded border border-slate-200 text-xs" />
              <input type="text" value={newPerson.post} onChange={e => setNewPerson(p => ({ ...p, post: e.target.value }))}
                placeholder="Post" className="flex-1 px-2 py-1.5 rounded border border-slate-200 text-xs" />
              <button onClick={handleAddPerson} disabled={!newPerson.code || !newPerson.name}
                className="px-3 py-1.5 rounded bg-teal-600 text-white text-xs disabled:opacity-40">+</button>
            </div>
            {addedPeople.length > 0 && (
              <div className="mt-2 space-y-1">
                {addedPeople.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs bg-amber-50 border border-amber-200 rounded-lg p-2">
                    <span className="text-amber-700 font-medium">{p.code}</span>
                    <span className="text-slate-600">{p.name}</span>
                    <span className="text-slate-400">{p.post}</span>
                    <span className="text-[9px] bg-amber-100 text-amber-600 px-1 rounded ml-auto">nou</span>
                    <button onClick={() => setAddedPeople(prev => prev.filter((_, j) => j !== i))}
                      className="text-red-400 hover:text-red-600">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={() => setStep("dept")} className="text-xs px-3 py-2 rounded-lg border border-slate-200 text-slate-600">Inapoi</button>
            <button onClick={() => setStep("reason")} disabled={allSelected.length === 0}
              className="text-xs px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-40">
              Continua — {allSelected.length} selectat{allSelected.length !== 1 ? "e" : ""}
            </button>
          </div>
        </div>
      )}

      {/* PAS 3: Motivul evaluarii */}
      {step === "reason" && (
        <div className="bg-white rounded-xl border border-teal-200 p-4">
          <h4 className="text-sm font-bold text-slate-800 mb-1">De ce doriti aceasta evaluare?</h4>
          <p className="text-[10px] text-slate-500 mb-3">Motivul ajuta la interpretarea rezultatelor si la formularea recomandarilor.</p>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
            placeholder="ex: Restructurare departament IT — dorim sa intelegem compatibilitatea echipei existente cu noile roluri"
            className="w-full px-3 py-2 rounded-lg border border-teal-200 bg-white text-sm resize-y mb-3" />
          <div className="flex gap-2">
            <button onClick={() => setStep("people")} className="text-xs px-3 py-2 rounded-lg border border-slate-200 text-slate-600">Inapoi</button>
            <button onClick={() => setStep("instruments")} disabled={!reason.trim()}
              className="text-xs px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-40">
              Continua — instrumente
            </button>
          </div>
        </div>
      )}

      {/* PAS 4: Configurare instrumente */}
      {step === "instruments" && (
        <div className="bg-white rounded-xl border border-teal-200 p-4">
          <h4 className="text-sm font-bold text-slate-800 mb-1">Instrumente psihometrice</h4>
          <p className="text-[10px] text-slate-500 mb-3">
            {allSelected.length} persoane din {selectedDept}. Motiv: {reason.slice(0, 80)}{reason.length > 80 ? "..." : ""}
          </p>
          <div className="space-y-1.5 mb-4">
            {instruments.map((inst: any) => (
              <label key={inst.id} className={`flex items-start gap-2 text-xs p-2.5 rounded-lg border ${
                inst.required ? "bg-teal-50 border-teal-200" : "bg-white border-slate-200"
              }`}>
                <input type="checkbox"
                  checked={inst.required || selectedInstruments.includes(inst.id)}
                  disabled={inst.required}
                  onChange={e => {
                    if (e.target.checked) setSelectedInstruments(prev => [...prev, inst.id])
                    else setSelectedInstruments(prev => prev.filter(i => i !== inst.id))
                  }}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <span className="font-medium text-slate-800">{inst.name}</span>
                  {inst.required && <span className="text-teal-600 ml-1">(obligatoriu)</span>}
                  {inst.type === "EXTERNAL" && <span className="text-amber-600 ml-1">(upload PDF)</span>}
                  {inst.costPerAdmin && <span className="text-violet-600 ml-1">({inst.costPerAdmin} credite/pers)</span>}
                  <p className="text-[10px] text-slate-400 mt-0.5">{inst.description}</p>
                </div>
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setStep("reason")} className="text-xs px-3 py-2 rounded-lg border border-slate-200 text-slate-600">Inapoi</button>
            <button onClick={handleSave} disabled={saving}
              className="text-xs px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-40">
              {saving ? "Se configureaza..." : `Lanseaza evaluarea (${allSelected.length} persoane)`}
            </button>
          </div>
        </div>
      )}

      {/* PAS 5: Confirmare */}
      {step === "done" && (
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 text-center">
          <p className="text-sm font-bold text-emerald-700 mb-1">Evaluare configurata</p>
          <p className="text-xs text-emerald-600">{allSelected.length} persoane din {selectedDept} au fost asignate.</p>
          <button onClick={() => { setStep("dept"); setSelectedDept(""); setSelectedPeople([]); setAddedPeople([]); setReason(""); setSelectedInstruments([]) }}
            className="text-xs px-4 py-2 mt-3 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">
            Configureaza alta evaluare
          </button>
        </div>
      )}

      {/* Evaluari existente */}
      {batteries.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-slate-800 mb-2">Evaluari configurate</h4>
          <div className="space-y-2">
            {batteries.map((b: any) => (
              <div key={b.jobId} className="bg-white rounded-lg border border-slate-200 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-800">{b.jobTitle}</span>
                  <span className="text-[10px] text-slate-400">{b.instruments.length} instrumente</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {b.instruments.map((instrId: string) => {
                    const inst = instruments.find((i: any) => i.id === instrId)
                    return (
                      <span key={instrId} className="text-[9px] px-1.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-700">
                        {inst?.name || instrId}
                      </span>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Panou Sociograma Balint ─────────────────────────────────────────

function SociogramPanel() {
  const [loading, setLoading] = useState(true)
  const [groups, setGroups] = useState<any[]>([])
  const [creating, setCreating] = useState(false)
  const [newGroup, setNewGroup] = useState({ name: "", type: "DEPARTMENT", members: "" })

  const loadGroups = () => {
    fetch("/api/v1/sociogram").then(r => r.json()).then(d => {
      setGroups(d.groups || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { loadGroups() }, [])

  const handleCreate = async () => {
    if (!newGroup.name || !newGroup.members.trim()) return
    setCreating(true)
    const members = newGroup.members.split("\n").filter(Boolean).map(line => {
      const [code, ...nameParts] = line.split(",").map(s => s.trim())
      return { code: code || line.trim(), name: nameParts.join(" ") || code || line.trim() }
    })

    await fetch("/api/v1/sociogram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create-group",
        name: newGroup.name,
        type: newGroup.type,
        members,
      }),
    })
    setNewGroup({ name: "", type: "DEPARTMENT", members: "" })
    loadGroups()
    setCreating(false)
  }

  const handleComplete = async (groupId: string) => {
    await fetch("/api/v1/sociogram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete", groupId }),
    })
    loadGroups()
  }

  if (loading) return <p className="text-xs text-slate-400">Se incarca...</p>

  return (
    <div className="space-y-6">
      {/* Scenariu explicativ */}
      <div className="bg-white rounded-xl border border-teal-200 p-4">
        <h4 className="text-sm font-bold text-slate-800 mb-2">Cum functioneaza sociograma Balint</h4>
        <div className="text-xs text-slate-600 space-y-1.5">
          <p>1. Definesti un <strong>grup</strong> care lucreaza impreuna (departament sau echipa de proiect)</p>
          <p>2. Fiecare membru citeste un <strong>scenariu</strong> (o poveste care indeparteaza criteriile rationale)</p>
          <p>3. Fiecare membru <strong>ordoneaza</strong> colegii de la N la 1 (N = cel mai preferat)</p>
          <p>4. Poate marca cu <strong>asterisc (*)</strong> colegii pe care i-ar respinge in scenariul dat</p>
          <p>5. Platforma calculeaza automat: <strong>scoruri, clasament, relatii reciproce, izolati</strong></p>
        </div>
      </div>

      {/* Creaza grup nou */}
      <div className="bg-white rounded-xl border border-teal-200 p-4">
        <h4 className="text-sm font-bold text-slate-800 mb-3">Grup nou</h4>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium mb-1">Numele grupului</label>
            <input type="text" value={newGroup.name} onChange={e => setNewGroup(p => ({ ...p, name: e.target.value }))}
              placeholder="ex: Departament IT" className="w-full px-3 py-2 rounded-lg border border-teal-200 bg-white text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Tip</label>
            <select value={newGroup.type} onChange={e => setNewGroup(p => ({ ...p, type: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-teal-200 bg-white text-sm">
              <option value="DEPARTMENT">Departament (permanent)</option>
              <option value="PROJECT_TEAM">Echipa proiect (temporar)</option>
            </select>
          </div>
        </div>
        <div className="mb-3">
          <label className="block text-xs font-medium mb-1">Membri (cod, nume — cate un membru pe linie)</label>
          <textarea value={newGroup.members} onChange={e => setNewGroup(p => ({ ...p, members: e.target.value }))}
            rows={4} placeholder={"EMP001, Popescu Ion\nEMP002, Ionescu Maria\nEMP003, Georgescu Ana"}
            className="w-full px-3 py-2 rounded-lg border border-teal-200 bg-white text-sm resize-y font-mono" />
        </div>
        <button onClick={handleCreate} disabled={creating || !newGroup.name || !newGroup.members.trim()}
          className="text-xs px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-40">
          {creating ? "Se creeaza..." : "Creeaza grupul"}
        </button>
      </div>

      {/* Grupuri existente */}
      {groups.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-slate-800 mb-2">Grupuri existente</h4>
          <div className="space-y-2">
            {groups.map((g: any) => (
              <div key={g.id} className="bg-white rounded-lg border border-slate-200 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-sm font-medium text-slate-800">{g.name}</span>
                    <span className="text-[10px] text-slate-400 ml-2">{g.type === "DEPARTMENT" ? "Departament" : "Echipa proiect"}</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    g.status === "COMPLETED" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                  }`}>
                    {g.status === "COMPLETED" ? "Finalizat" : "In colectare"}
                  </span>
                </div>

                {/* Membri */}
                <div className="flex flex-wrap gap-1 mb-2">
                  {(g.members || []).map((m: any) => {
                    const hasResponse = (g.responses || []).some((r: any) => r.fromCode === m.code && r.completedAt)
                    return (
                      <span key={m.code} className={`text-[9px] px-1.5 py-0.5 rounded-full border ${
                        hasResponse ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-slate-50 border-slate-200 text-slate-500"
                      }`}>
                        {hasResponse ? "\u2713" : "\u25CB"} {m.name || m.code}
                      </span>
                    )
                  })}
                </div>

                {/* Progres */}
                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                  <span>{(g.responses || []).filter((r: any) => r.completedAt).length}/{(g.members || []).length} completat</span>
                  {g.status === "COLLECTING" && (g.responses || []).filter((r: any) => r.completedAt).length === (g.members || []).length && (
                    <button onClick={() => handleComplete(g.id)}
                      className="px-2 py-0.5 rounded bg-teal-600 text-white text-[10px] hover:bg-teal-700">
                      Finalizeaza si calculeaza
                    </button>
                  )}
                </div>

                {/* Rezultate */}
                {g.results && g.results.length > 0 && (
                  <div className="mt-3 border-t border-slate-100 pt-2">
                    <p className="text-[10px] font-bold text-slate-600 mb-1">Clasament</p>
                    <div className="space-y-1">
                      {g.results.sort((a: any, b: any) => a.rank - b.rank).map((r: any) => (
                        <div key={r.memberCode} className="flex items-center gap-2 text-xs">
                          <span className="font-mono text-slate-400 w-5">#{r.rank}</span>
                          <span className={`font-medium ${r.isIsolated ? "text-red-600" : r.isControversial ? "text-amber-600" : "text-slate-800"}`}>
                            {r.memberName}
                          </span>
                          <span className="text-slate-400">scor {r.totalScore}</span>
                          <span className="text-emerald-600">{r.preferenceCount} pref</span>
                          {r.rejectionCount > 0 && <span className="text-red-500">{r.rejectionCount} resp</span>}
                          {r.isIsolated && <span className="text-[9px] bg-red-100 text-red-600 px-1 rounded">izolat</span>}
                          {r.isControversial && <span className="text-[9px] bg-amber-100 text-amber-600 px-1 rounded">controversat</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Panou Notificare Anuala Art. 6 ──────────────────────────────────

function AnnualNotificationPanel({ companyName }: { companyName: string }) {
  const [adminEmail, setAdminEmail] = useState("")
  const [customMessage, setCustomMessage] = useState("")
  const [gdprConfirmed, setGdprConfirmed] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSend = async () => {
    if (!adminEmail.trim() || !gdprConfirmed) return
    setSending(true)
    try {
      const res = await fetch("/api/v1/pay-gap/annual-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          adminEmail: adminEmail.trim(),
          customMessage: customMessage.trim() || undefined,
          gdprConfirmed,
        }),
      })
      if (res.ok) setSent(true)
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-3">&#10003;</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Template trimis</h3>
        <p className="text-sm text-gray-600">
          Verificati email-ul ({adminEmail}). Copiati continutul si trimiteti-l
          tuturor angajatilor din organizatie.
        </p>
        <p className="text-xs text-gray-400 mt-4">
          Actiunea a fost inregistrata in jurnalul de conformitate.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-violet-200 p-4">
        <h4 className="text-sm font-semibold text-violet-800 mb-2">Ce face aceasta functiune?</h4>
        <p className="text-xs text-gray-600 leading-relaxed">
          Conform Art. 6 Directiva EU 2023/970, angajatorul trebuie sa informeze anual
          toti angajatii despre dreptul lor de a solicita informatii salariale (Art. 7).
          Platforma genereaza un template de email pe care il trimiteti la adresa dvs.,
          iar dvs. il distribuiti angajatilor prin email-ul organizatiei (forward/mail merge).
        </p>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-700">
          Email-ul dvs. (primiti template-ul aici)
        </label>
        <input
          type="email"
          value={adminEmail}
          onChange={(e) => setAdminEmail(e.target.value)}
          placeholder="hr@companie.ro"
          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-gray-700">
          Mesaj suplimentar (optional — apare in email)
        </label>
        <textarea
          value={customMessage}
          onChange={(e) => setCustomMessage(e.target.value)}
          placeholder="ex: Pentru intrebari suplimentare, contactati departamentul HR..."
          rows={3}
          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 resize-y"
        />
      </div>

      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={gdprConfirmed}
          onChange={(e) => setGdprConfirmed(e.target.checked)}
          className="mt-0.5 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
        />
        <span className="text-xs text-gray-600">
          Confirm ca am baza legala (obligatie legala Art. 6 EU 2023/970) pentru
          a transmite aceasta notificare angajatilor si ca adresele de email
          sunt gestionate de organizatia noastra, nu de platforma JobGrade.
        </span>
      </label>

      <button
        onClick={handleSend}
        disabled={sending || !adminEmail.trim() || !gdprConfirmed}
        className="w-full py-2.5 text-sm font-semibold text-white rounded-xl disabled:opacity-50 transition-colors"
        style={{ background: "linear-gradient(135deg, #7C3AED, #5B21B6)" }}
      >
        {sending ? "Se trimite..." : "Genereaza si trimite template"}
      </button>
    </div>
  )
}
