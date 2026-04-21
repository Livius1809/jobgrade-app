"use client"

import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"

interface PackageInfo {
  number: number
  icon: string
  title: string
  layerLabel: string
  description: string
  includes: string[]
  price: string
  priceDetail: string
  demoHref: string
  activateHref: string
  color: string
  cumulative: string[]
  extras?: string[]
  includesNote?: string
}

const PACKAGES: PackageInfo[] = [
  {
    number: 1,
    icon: "🏗️",
    title: "Ordine internă",
    layerLabel: "Baza",
    includesNote: "",
    description: "Evaluare și ierarhizare posturi pe criterii obiective, neutre din perspectiva genului.",
    includes: [
      "Evaluare AI automată sau prin comisie",
      "Clasament posturi pe 4 criterii (Directiva EU 2023/970, Art. 3)",
      "Simulator interactiv — modifici, vezi impactul live",
      "Raport profesional cu validare oficială",
      "Semnătură electronică și olografă",
    ],
    extras: [
      "Fișe de post generate AI (se activează cu descrierea posturilor)",
      "Generare organigramă (se activează cu structura departamentelor)",
    ],
    price: "De la 90 RON/poziție",
    priceDetail: "Plată unică. Include simulări nelimitate înainte de validare.",
    demoHref: "/demo",
    activateHref: "/sessions",
    color: "indigo",
    cumulative: ["Evaluare posturi", "Ierarhizare", "Simulator", "Raport", "Validare"],
  },
  {
    number: 2,
    icon: "⚖️",
    title: "Conformitate",
    layerLabel: "Nivelul 1",
    includesNote: "include 1. Ordine internă – Baza",
    description: "Structură salarială transparentă, analiză decalaj salarial, conformitate Directiva EU 2023/970.",
    includes: [
      "Tot ce include Ordine internă +",
      "Clase salariale cu trepte (metoda Pitariu, progresie geometrică)",
      "Analiză decalaj salarial F/M pe muncă de valoare egală",
      "Justificări documentate pentru diferențe",
      "Plan de corecție dacă decalajul depășește 5%",
      "Evaluare comună (Art. 10) dacă e cazul",
    ],
    extras: [
      "Raport per angajat — clarificare salarială (se activează cu statul de funcții)",
      "Benchmark salarial vs piață (se activează cu datele salariale)",
    ],
    price: "De la 150 RON/poziție",
    priceDetail: "Include Ordine internă + structura salarială + pay gap.",
    demoHref: "/demo",
    activateHref: "/sessions",
    color: "violet",
    cumulative: ["BAZA", "+ Clase salariale", "+ Pay gap", "+ Conformitate EU"],
  },
  {
    number: 3,
    icon: "🎯",
    title: "Competitivitate",
    layerLabel: "Nivelul 2",
    includesNote: "include 1. Ordine internă – Baza, 2. Conformitate – Nivelul 1",
    description: "Benchmark salarial vs piață. Știi unde te situezi și ce trebuie ajustat.",
    includes: [
      "Tot ce include Ordine internă + Conformitate +",
      "Comparație cu piața (P25, P50, P75) per poziție",
      "Compa-ratio per post — sub/peste mediană",
      "Surse: INS, studii salariale, portaluri recrutare",
      "Recomandări de ajustare pentru retenție",
      "Impact bugetar al ajustărilor",
    ],
    extras: [
      "Pachete salariale extinse (se activează cu compensații + beneficii)",
      "Evaluare performanță per angajat (se activează cu KPI-uri per post)",
    ],
    price: "De la 180 RON/poziție",
    priceDetail: "Include Ordine internă + Conformitate + benchmark piață.",
    demoHref: "/demo",
    activateHref: "/sessions",
    color: "fuchsia",
    cumulative: ["BAZA", "L1 Conformitate", "+ Benchmark piață", "+ Impact bugetar"],
  },
  {
    number: 4,
    icon: "🌱",
    title: "Dezvoltare",
    layerLabel: "Nivelul 3",
    includesNote: "include 1. Ordine internă – Baza, 2. Conformitate – Nivelul 1, 3. Competitivitate – Nivelul 2",
    description: "Dezvoltare organizațională completă — cultură, performanță, echipe.",
    includes: [
      "Tot ce include Ordine internă + Conformitate + Competitivitate +",
      "Evaluare personal și diagnoză organizațională",
      "Management echipe multigeneraționale",
      "Structuri mixte om-AI",
      "Procese interne și Manual calitate",
      "Cultură organizațională și performanță",
    ],
    extras: [
      "Proiectare + gestionare recrutare (se activează cu fișe complete)",
      "Manual angajat nou (se activează cu documente interne)",
      "Diagnoză echipe multigeneraționale (se activează cu date demografice)",
    ],
    price: "De la 200 RON/poziție",
    priceDetail: "Pachetul complet. Include toate straturile.",
    demoHref: "/demo",
    activateHref: "/sessions",
    color: "coral",
    cumulative: ["BAZA", "L1 Conformitate", "L2 Competitivitate", "+ Dezvoltare completă"],
  },
]

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; badge: string; btn: string }> = {
  indigo: { bg: "bg-indigo-50", border: "border-indigo-400", text: "text-indigo-700", badge: "bg-indigo-100 text-indigo-700", btn: "bg-indigo-600 hover:bg-indigo-700" },
  violet: { bg: "bg-violet-50", border: "border-violet-400", text: "text-violet-700", badge: "bg-violet-100 text-violet-700", btn: "bg-violet-600 hover:bg-violet-700" },
  fuchsia: { bg: "bg-fuchsia-50", border: "border-fuchsia-400", text: "text-fuchsia-700", badge: "bg-fuchsia-100 text-fuchsia-700", btn: "bg-fuchsia-600 hover:bg-fuchsia-700" },
  coral: { bg: "bg-orange-50", border: "border-orange-400", text: "text-orange-700", badge: "bg-orange-100 text-orange-700", btn: "bg-orange-600 hover:bg-orange-700" },
}

// 1 credit = 8 RON (standard, fără discount)
const CREDIT_VALUE_RON = 8

// Credite per unitate per layer (estimare — de calibrat cu COG)
// BAZA: credite per poziție
// L1: + credite per angajat (pay gap, structură salarială)
// L2: + credite per poziție (benchmark)
// L3: + credite per angajat (dezvoltare)
// Formule din PackageSelector.tsx — sursa de adevăr
function calcLayerCredits(layer: number, positions: number, employees: number) {
  const items: Array<{ label: string; credits: number; detail: string }> = []

  // BAZA (layer 1)
  if (layer >= 1) {
    items.push({ label: "Evaluare posturi (JE AUTO)", credits: positions * 60, detail: `${positions} × 60 cr` })
    items.push({ label: "Fișe de post AI", credits: positions * 12, detail: `${positions} × 12 cr` })
    items.push({ label: "Structură salarială", credits: 20 + employees * 1, detail: `20 + ${employees} × 1 cr` })
  }
  // LAYER 1 — Conformitate
  if (layer >= 2) {
    items.push({ label: "Analiză pay gap (Art. 9)", credits: 15 + Math.ceil(employees * 0.5), detail: `15 + ${employees} × 0,5 cr` })
    items.push({ label: "Benchmark salarial", credits: 30 + Math.ceil(positions * 1.5), detail: `30 + ${positions} × 1,5 cr` })
  }
  // LAYER 2 — Competitivitate
  if (layer >= 3) {
    items.push({ label: "Pachete salariale", credits: 25 + positions * 1, detail: `25 + ${positions} × 1 cr` })
    items.push({ label: "Evaluare performanță", credits: employees * 15, detail: `${employees} × 15 cr` })
    items.push({ label: "Impact bugetar", credits: 40, detail: "40 cr" })
  }
  // LAYER 3 — Dezvoltare
  if (layer >= 4) {
    const recruitProjects = Math.max(1, Math.ceil(positions * 0.2))
    const candidates = recruitProjects * 5
    items.push({ label: "Dezvoltare HR", credits: 40 + employees * 1, detail: `40 + ${employees} × 1 cr` })
    items.push({ label: "Recrutare", credits: recruitProjects * 60, detail: `${recruitProjects} proiecte × 60 cr` })
    items.push({ label: "Manual angajat", credits: 20 + Math.ceil(positions * 1.5), detail: `20 + ${positions} × 1,5 cr` })
  }

  const total = items.reduce((s, i) => s + i.credits, 0)
  return { items, total }
}

// Discount pe volum — bareme din strategie (poziții + salariați)
// Starter: 1-50 poz → 0%, Professional: 51-150 poz → 12%, Enterprise: 150+ poz → 25%
function getVolumeDiscount(positions: number, employees: number): { pct: number; label: string } {
  const maxDim = Math.max(positions, employees)
  if (maxDim > 150) return { pct: 25, label: "Enterprise" }
  if (maxDim > 50) return { pct: 12, label: "Professional" }
  return { pct: 0, label: "Starter" }
}

// Preț per credit (discount pe volum credite) — din PackageSelector
function pricePerCredit(totalCredits: number): number {
  if (totalCredits >= 15000) return 5.50
  if (totalCredits >= 5000) return 6.00
  if (totalCredits >= 1500) return 6.50
  if (totalCredits >= 500) return 7.00
  if (totalCredits >= 250) return 7.50
  return 8.00
}

const PURCHASED_FILLS: Record<string, string> = {
  indigo: "rgba(99,102,241,0.2)",
  violet: "rgba(139,92,246,0.2)",
  fuchsia: "rgba(217,70,239,0.2)",
  coral: "rgba(249,115,22,0.2)",
}

export default function PackageExplorer({ onLayerChange, purchasedLayer = 0, creditBalance = 0, forceOpen = false }: { onLayerChange?: (layer: number | null) => void; purchasedLayer?: number; creditBalance?: number; forceOpen?: boolean } = {}) {
  const [selected, setSelected] = useState<number | null>(null)
  const [purchasing, setPurchasing] = useState(false)

  // Dacă forceOpen, selectăm automat pachetul curent sau primul
  useEffect(() => {
    if (forceOpen && selected === null) {
      const autoSelect = purchasedLayer > 0 ? purchasedLayer : 1
      setSelected(autoSelect)
      onLayerChange?.(autoSelect)
    }
  }, [forceOpen])

  const handleSelect = (pkg: number | null) => {
    setSelected(pkg)
    onLayerChange?.(pkg)
  }
  const [positions, setPositions] = useState<string>("")
  const [employees, setEmployees] = useState<string>("")
  const [annual, setAnnual] = useState(false)
  const [selectedCredits, setSelectedCredits] = useState<string | null>(null)

  const CREDIT_PKGS = [
    { id: "credits_micro", name: "Micro", credits: 100, price: 800 },
    { id: "credits_mini", name: "Mini", credits: 250, price: 1875 },
    { id: "credits_start", name: "Start", credits: 500, price: 3500 },
    { id: "credits_business", name: "Business", credits: 1500, price: 9750 },
    { id: "credits_professional", name: "Professional", credits: 5000, price: 30000 },
    { id: "credits_enterprise", name: "Enterprise", credits: 15000, price: 82500 },
  ]

  const selectedCreditPkg = CREDIT_PKGS.find(p => p.id === selectedCredits)

  const handlePurchase = async () => {
    const pos = Number(positions) || 0
    const emp = Number(employees) || 0
    if (!selectedPkg || pos === 0 || emp === 0) return
    setPurchasing(true)
    try {
      const res = await fetch("/api/v1/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "service",
          layer: selectedPkg.number,
          positions: pos,
          employees: emp,
          annual,
          creditPackageId: selectedCredits || undefined,
        }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (e) {
      console.error("Checkout error:", e)
    } finally {
      setPurchasing(false)
    }
  }

  const selectedPkg = selected !== null ? PACKAGES.find(p => p.number === selected) : null
  const colors = selectedPkg ? COLOR_MAP[selectedPkg.color] || COLOR_MAP.slate : null

  const [mounted, setMounted] = useState(false)
  const cardsRef = useRef<HTMLDivElement>(null)
  const [panelLeft, setPanelLeft] = useState(0)

  useEffect(() => { setMounted(true) }, [])

  // Calculează left-ul panoului = marginea dreaptă a cardurilor + gap
  useEffect(() => {
    if (selectedPkg && cardsRef.current) {
      const rect = cardsRef.current.getBoundingClientRect()
      setPanelLeft(rect.right + 24)
    }
  }, [selectedPkg])

  return (
    <>
      {/* Carduri — în flow-ul normal al paginii (max-w-4xl) */}
      <div ref={cardsRef} className="grid grid-cols-2 gap-3">
        {PACKAGES.map(pkg => {
          const c = COLOR_MAP[pkg.color] || COLOR_MAP.slate
          const isSelected = selected === pkg.number

          const isPurchased = pkg.number <= purchasedLayer

          return (
            <button
              key={pkg.number}
              onClick={() => handleSelect(isSelected ? null : pkg.number)}
              style={{
                borderWidth: isSelected ? "3px" : "2px",
                ...(isPurchased && !isSelected ? { backgroundColor: PURCHASED_FILLS[pkg.color] } : {}),
              }}
              className={`rounded-xl p-4 text-left transition-all ${
                isSelected
                  ? `${c.bg} ${c.border} shadow-lg`
                  : isPurchased
                    ? `${c.border} shadow-sm`
                    : "bg-white border-slate-200 hover:shadow-md hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${c.badge}`}>
                    {isPurchased ? "✓" : pkg.number}
                  </span>
                  <div>
                    <h3 className={`text-sm font-bold ${isSelected || isPurchased ? c.text : "text-slate-800"}`}>
                      {pkg.title} <span className="font-normal">–</span> <span className="font-medium">{pkg.layerLabel}</span>
                    </h3>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {isPurchased && <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">ACTIV</span>}
                  <span className="text-lg">{pkg.icon}</span>
                </div>
              </div>
              {pkg.includesNote && (
                <p className={`text-[9px] ml-10 ${isSelected || isPurchased ? c.text : "text-slate-400"}`} style={{ opacity: 0.7 }}>
                  ({pkg.includesNote})
                </p>
              )}
              <p className="text-[10px] text-slate-400 mt-2 line-clamp-2">{pkg.description}</p>
            </button>
          )
        })}
      </div>

      {/* Cartuș detalii — Portal la body, ancorat la dreapta ecranului cu padding */}
      {selectedPkg && colors && mounted && createPortal(
        <div
          style={{ borderWidth: "3px", top: "100px", left: `${panelLeft}px`, right: "24px", maxHeight: "calc(100vh - 130px)", padding: "28px" }}
          className={`fixed rounded-2xl ${colors.border} ${colors.bg} overflow-y-auto shadow-xl z-40`}
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{selectedPkg.icon}</span>
              <div>
                <h3 className="text-lg font-bold text-slate-900">{selectedPkg.title}</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded inline-block ${colors.badge}`}>{selectedPkg.layerLabel}</span>
              </div>
            </div>
            <button onClick={() => handleSelect(null)} className={`${colors.text} hover:opacity-70 text-xl font-bold leading-none p-1 rounded transition-opacity`} title="Închide">✕</button>
          </div>

          <div style={{ height: "16px" }} />

          <p className="text-sm text-slate-600 leading-relaxed">{selectedPkg.description}</p>

          {/* Situație curentă — apare doar dacă are deja ceva activ */}
          {(purchasedLayer > 0 || creditBalance > 0) && (
            <>
              <div style={{ height: "16px" }} />
              <div className="bg-slate-50 rounded-lg border border-slate-200" style={{ padding: "12px" }}>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Situație curentă</p>
                <div style={{ height: "8px" }} />
                {purchasedLayer > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">Pachet activ</span>
                    <span className="text-xs font-bold text-slate-900">
                      {PACKAGES.find(p => p.number === purchasedLayer)?.title || "—"} ({PACKAGES.find(p => p.number === purchasedLayer)?.layerLabel || "—"})
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between" style={{ marginTop: purchasedLayer > 0 ? "4px" : "0" }}>
                  <span className="text-xs text-slate-600">Credite disponibile</span>
                  <span className="text-xs font-bold text-slate-900">{creditBalance.toLocaleString("ro-RO")} credite</span>
                </div>
                {purchasedLayer > 0 && selectedPkg.number > purchasedLayer && (
                  <>
                    <div style={{ height: "8px" }} />
                    <p className="text-[10px] text-indigo-600 font-medium">Upgrade de la {PACKAGES.find(p => p.number === purchasedLayer)?.title} → {selectedPkg.title}</p>
                  </>
                )}
              </div>
            </>
          )}

          <div style={{ height: "20px" }} />

          {/* Ce include + Servicii adiționale — pe 2 coloane */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-[10px] font-bold text-slate-700 mb-2 uppercase tracking-wide">Ce include</h4>
              <ul className="space-y-1.5">
                {selectedPkg.includes.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed">
                    <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            {selectedPkg.extras && selectedPkg.extras.length > 0 && (
              <div>
                <h4 className="text-[10px] font-bold text-slate-700 mb-2 uppercase tracking-wide">Servicii adiționale (cu credite)</h4>
                <ul className="space-y-1.5">
                  {selectedPkg.extras!.map((extra: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-500 italic leading-relaxed">
                      <span className="text-indigo-400 mt-0.5 shrink-0">+</span>
                      {extra}
                    </li>
                  ))}
                </ul>
                <p className="text-[9px] text-slate-400 mt-2">Se activează automat cu datele necesare. Consumă credite.</p>
              </div>
            )}
          </div>

          <div style={{ height: "20px" }} />

          {/* Calculator preț — Date intrare client */}
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
            <p className="text-[10px] text-amber-700 font-bold uppercase tracking-wide mb-3">Date intrare client</p>
            <div className="flex items-center gap-4 mb-3">
              <div className="flex items-center gap-2 flex-1">
                <label className="text-xs text-slate-600">Poziții distincte</label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={positions}
                  placeholder="–"
                  onChange={(e) => setPositions(e.target.value)}
                  className="w-20 text-center text-sm font-bold border-2 border-amber-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-amber-200 bg-white"
                />
              </div>
              <div className="flex items-center gap-2 flex-1">
                <label className="text-xs text-slate-600">Nr. salariați</label>
                <input
                  type="number"
                  min={1}
                  max={5000}
                  value={employees}
                  placeholder="–"
                  onChange={(e) => setEmployees(e.target.value)}
                  className="w-20 text-center text-sm font-bold border-2 border-amber-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-amber-200 bg-white"
                />
              </div>
            </div>

            {(() => {
              const pos = Number(positions) || 0
              const emp = Number(employees) || 0
              if (pos === 0 && emp === 0) {
                return (
                  <div className={`rounded-lg p-4 ${colors.bg} text-center`}>
                    <p className="text-sm text-slate-400">Introduceți datele pentru a calcula prețul</p>
                  </div>
                )
              }
              const calc = calcLayerCredits(selectedPkg.number, Math.max(1, pos), Math.max(1, emp))
              const ppc = pricePerCredit(calc.total)
              const volumeDiscount = getVolumeDiscount(Math.max(1, pos), Math.max(1, emp))
              const priceBeforeDiscount = Math.round(calc.total * ppc)
              const serviciiRON = Math.round(priceBeforeDiscount * (1 - volumeDiscount.pct / 100))
              const abonamentLunar = 399
              const abonamentAnual = 3990
              const abonamentRON = annual ? abonamentAnual : abonamentLunar
              const crediteRON = selectedCreditPkg?.price || 0
              const totalRON = serviciiRON + abonamentRON + crediteRON

              return (
                <div className={`rounded-lg p-4 ${colors.bg}`}>
                  {/* Servicii */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">Servicii</span>
                    <div className="text-right">
                      {volumeDiscount.pct > 0 && (
                        <span className="text-[10px] text-slate-400 line-through mr-2">{priceBeforeDiscount.toLocaleString("ro-RO")}</span>
                      )}
                      <span className="text-sm font-bold text-slate-900">{serviciiRON.toLocaleString("ro-RO")} RON</span>
                      {volumeDiscount.pct > 0 && (
                        <span className="text-[10px] text-emerald-600 font-medium ml-1">-{volumeDiscount.pct}%</span>
                      )}
                    </div>
                  </div>

                  <div style={{ height: "12px" }} />

                  {/* Abonament cu toggle */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-600">Abonament</span>
                      <button
                        onClick={() => setAnnual(!annual)}
                        className="flex items-center bg-white rounded-full border border-slate-200 text-[10px] overflow-hidden"
                      >
                        <span className={`px-2 py-0.5 transition-colors ${!annual ? "bg-indigo-600 text-white" : "text-slate-400"}`}>lunar</span>
                        <span className={`px-2 py-0.5 transition-colors ${annual ? "bg-indigo-600 text-white" : "text-slate-400"}`}>anual</span>
                      </button>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-slate-900">{abonamentRON.toLocaleString("ro-RO")} RON</span>
                      <span className="text-[10px] text-slate-400 ml-1">{annual ? "/an" : "/lună"}</span>
                      {annual && <span className="text-[10px] text-emerald-600 font-medium ml-1">-17%</span>}
                    </div>
                  </div>

                  {/* Credite (dacă e selectat un pachet) */}
                  {selectedCreditPkg && (
                    <>
                      <div style={{ height: "12px" }} />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-600">Credite ({selectedCreditPkg.name})</span>
                        <span className="text-sm font-bold text-slate-900">{crediteRON.toLocaleString("ro-RO")} RON</span>
                      </div>
                    </>
                  )}

                  <div style={{ height: "12px", borderBottom: "1px solid rgba(0,0,0,0.1)" }} />
                  <div style={{ height: "12px" }} />

                  {/* Total */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900">Total</span>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-slate-900">{totalRON.toLocaleString("ro-RO")} RON</span>
                    </div>
                  </div>
                  <p className="text-[9px] text-slate-400 text-right" style={{ marginTop: "4px" }}>fără TVA</p>
                </div>
              )
            })()}
          </div>

          <div style={{ height: "20px" }} />

          {/* Pachete credite — selector radio */}
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">Credite suplimentare (opțional)</p>
              {selectedCredits && (
                <button onClick={() => setSelectedCredits(null)} className="text-[10px] text-slate-400 hover:text-slate-600">Anulează</button>
              )}
            </div>
            <div style={{ height: "4px" }} />
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Revalidare, simulări adiționale, consultanță HR, rapoarte per angajat.
            </p>
            <div style={{ height: "12px" }} />
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-200">
                  <th className="text-left py-1.5" style={{ width: "20px" }}></th>
                  <th className="text-left py-1.5">Pachet</th>
                  <th className="text-right py-1.5">Credite</th>
                  <th className="text-right py-1.5">RON</th>
                  <th className="text-right py-1.5">Reducere</th>
                </tr>
              </thead>
              <tbody className="text-slate-600">
                {CREDIT_PKGS.map(p => {
                  const isSelected = selectedCredits === p.id
                  return (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedCredits(isSelected ? null : p.id)}
                    className={`border-t border-slate-100 cursor-pointer transition-colors ${isSelected ? "bg-indigo-50" : "hover:bg-slate-50"}`}
                  >
                    <td className="py-1.5">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isSelected ? "border-indigo-500" : "border-slate-300"}`}>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
                      </div>
                    </td>
                    <td className="py-1.5 font-medium">{p.name}</td>
                    <td className="py-1.5 text-right font-mono">{p.credits.toLocaleString()}</td>
                    <td className="py-1.5 text-right font-mono">{p.price.toLocaleString()}</td>
                    <td className="py-1.5 text-right text-emerald-600 font-medium">{p.id === "credits_micro" ? "—" : `-${Math.round((1 - p.price / (p.credits * 8)) * 100)}%`}</td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Separator tabel → bară */}
          <div style={{ height: "32px" }} />

          {/* Bară pachete incluse */}
          <div>
            <div className="flex mb-1">
              {PACKAGES.map(p => {
                const included = p.number <= selectedPkg.number
                const textColor: Record<string, string> = {
                  indigo: "text-indigo-600",
                  violet: "text-violet-600",
                  fuchsia: "text-fuchsia-600",
                  coral: "text-orange-600",
                }
                return (
                  <div key={p.number} className="flex-1 text-center">
                    <span className={`text-[9px] font-bold ${included ? textColor[p.color] || "text-indigo-600" : "text-slate-300"}`}>
                      {p.icon} {p.layerLabel}
                    </span>
                  </div>
                )
              })}
            </div>
            <div className="flex rounded-full overflow-hidden h-2">
              {PACKAGES.map(p => {
                const included = p.number <= selectedPkg.number
                const barColor: Record<string, string> = {
                  indigo: "bg-indigo-500",
                  violet: "bg-violet-500",
                  fuchsia: "bg-fuchsia-500",
                  coral: "bg-orange-500",
                }
                return (
                  <div
                    key={p.number}
                    className={`flex-1 ${included ? barColor[p.color] || "bg-indigo-500" : "bg-slate-200"} ${p.number < 4 ? "border-r border-white" : ""}`}
                  />
                )
              })}
            </div>
          </div>

          {/* Separator bară → butoane */}
          <div style={{ height: "32px" }} />

          {/* Acțiuni */}
          <div className="flex gap-3">
            {selectedPkg.number <= purchasedLayer ? (
              <div className="flex-1 py-2.5 rounded-lg bg-emerald-100 text-emerald-700 text-sm font-semibold text-center">
                ✓ Activ
              </div>
            ) : (
              <button
                onClick={handlePurchase}
                disabled={purchasing || !Number(positions) || !Number(employees)}
                className={`flex-1 py-3 rounded-lg text-white text-sm font-semibold text-center transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${colors.btn}`}
              >
                {purchasing ? "Se procesează..." : "Plătește"}
              </button>
            )}
            <Link
              href={selectedPkg.demoHref}
              className="flex-1 py-3 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold text-center hover:bg-white/50 transition-colors"
            >
              Vezi demo →
            </Link>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
