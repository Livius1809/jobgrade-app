"use client"

/**
 * PricingCalculator — Componenta UNIFICATĂ de pricing
 *
 * Înlocuiește PackageSelector + PackageExplorer.
 * O singură componentă, sursa de adevăr = pricing.ts.
 *
 * Moduri:
 * - portal: client logat, vede situația curentă, checkout Stripe, upgrade/downgrade
 * - sandbox: vizitator nelogat, explorare, diagnostic gratuit
 * - landing: pagina publică, fără interacțiune, doar afișare
 *
 * Include:
 * - 3 abonamente (Essentials/Business/Enterprise) cu tier auto-detectat
 * - Calculator credite per card (C1-C4)
 * - Câmpuri diferențiate (C1=doar poziții, C2+=ambele)
 * - 4 scenarii upgrade (card/poziții/salariați/redenumire)
 * - Downgrade cu conversie diferență în credite
 * - Billing toggle (lunar/anual) + reînnoire (auto/manual)
 * - Discount dublu (abonament + volum credite, cumulate)
 * - Pachete credite suplimentare
 * - Maturity signals (Company Profiler)
 * - Checkout Stripe (doar portal)
 */

import { useState, useRef, useEffect, useMemo } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import Icon from "@/components/icons/Icon"
import {
  type SubscriptionTier,
  type BillingPeriod,
  type RenewalType,
  TIERS,
  detectTier,
  calcLayerCredits,
  calcDowngradeConversion,
  billingPrice,
  renewalExplanation,
} from "@/lib/pricing"

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

type Mode = "portal" | "sandbox" | "landing"
type UpgradeScenario = "LAYER_UPGRADE" | "ADD_POSITIONS" | "ADD_EMPLOYEES" | "RENAME_POSITION"

interface PricingCalculatorProps {
  mode: Mode
  /** Doar portal — date din DB */
  purchasedLayer?: number
  purchasedPositions?: number
  purchasedEmployees?: number
  creditBalance?: number
  currentTier?: SubscriptionTier
  /** Callbacks */
  onLayerChange?: (layer: number | null) => void
  onPanelOpen?: (open: boolean) => void
  /** UI control */
  forceOpen?: boolean
  forceClose?: boolean
}

// ═══════════════════════════════════════════════════════════════
// CARD DEFINITIONS
// ═══════════════════════════════════════════════════════════════

const PACKAGE_ICONS: Record<number, string> = {
  1: "icon-evaluare",
  2: "icon-echitate",
  3: "icon-benchmark",
  4: "icon-ghidare",
}

interface CardInfo {
  number: number
  icon: string
  title: string
  layerLabel: string
  description: string
  includes: string[]
  extras?: string[]
  includesNote?: string
  color: string
  demoHref: string
}

const CARDS: CardInfo[] = [
  {
    number: 1, icon: "🏗️", title: "Ordine internă", layerLabel: "C1", color: "indigo",
    description: "Evaluare și ierarhizare posturi pe criterii obiective, neutre din perspectiva genului.",
    includes: [
      "Evaluare AI automată sau prin comisie",
      "Clasament posturi pe 4 criterii (Directiva EU 2023/970, Art. 3)",
      "Simulator interactiv — modifici, vezi impactul live",
      "Raport profesional cu validare oficială",
      "Semnătură electronică și olografă",
    ],
    extras: ["Fișe de post generate AI", "Generare organigramă"],
    demoHref: "/demo",
  },
  {
    number: 2, icon: "⚖️", title: "Conformitate", layerLabel: "C2", color: "violet",
    includesNote: "include C1 — Ordine internă",
    description: "Structură salarială transparentă, analiză decalaj salarial, conformitate Directiva EU 2023/970.",
    includes: [
      "Tot ce include C1 +",
      "Clase salariale cu trepte",
      "Analiză decalaj salarial F/M",
      "Justificări documentate pentru diferențe",
      "Plan de corecție dacă decalajul > 5%",
    ],
    extras: ["Raport per angajat", "Benchmark salarial vs piață"],
    demoHref: "/demo",
  },
  {
    number: 3, icon: "🎯", title: "Competitivitate", layerLabel: "C3", color: "fuchsia",
    includesNote: "include C1 + C2",
    description: "Benchmark salarial vs piață. Știi unde te situezi și ce trebuie ajustat.",
    includes: [
      "Tot ce include C1 + C2 +",
      "Comparație cu piața (P25, P50, P75) per poziție",
      "Compa-ratio per post",
      "Recomandări de ajustare pentru retenție",
      "Impact bugetar al ajustărilor",
    ],
    extras: ["Pachete salariale extinse", "Evaluare performanță per angajat"],
    demoHref: "/demo",
  },
  {
    number: 4, icon: "🌱", title: "Dezvoltare", layerLabel: "C4", color: "coral",
    includesNote: "include C1 + C2 + C3",
    description: "Dezvoltare organizațională completă — cultură, performanță, echipe.",
    includes: [
      "Tot ce include C1 + C2 + C3 +",
      "Evaluare personal și diagnoză organizațională",
      "Management echipe multigeneraționale",
      "Procese interne și Manual calitate",
      "Cultură organizațională și performanță",
    ],
    extras: ["Proiectare recrutare", "Manual angajat nou"],
    demoHref: "/demo",
  },
]

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; badge: string; btn: string }> = {
  indigo: { bg: "bg-indigo-50", border: "border-indigo-400", text: "text-indigo-700", badge: "bg-indigo-100 text-indigo-700", btn: "bg-indigo-600 hover:bg-indigo-700" },
  violet: { bg: "bg-violet-50", border: "border-violet-400", text: "text-violet-700", badge: "bg-violet-100 text-violet-700", btn: "bg-violet-600 hover:bg-violet-700" },
  fuchsia: { bg: "bg-fuchsia-50", border: "border-fuchsia-400", text: "text-fuchsia-700", badge: "bg-fuchsia-100 text-fuchsia-700", btn: "bg-fuchsia-600 hover:bg-fuchsia-700" },
  coral: { bg: "bg-orange-50", border: "border-orange-400", text: "text-orange-700", badge: "bg-orange-100 text-orange-700", btn: "bg-orange-600 hover:bg-orange-700" },
}

// Credit packages
const CREDIT_PKGS = [
  { id: "credits_micro", name: "Micro", credits: 100, basePrice: 800, discount: 0 },
  { id: "credits_mini", name: "Mini", credits: 250, basePrice: 1875, discount: 6 },
  { id: "credits_start", name: "Start", credits: 500, basePrice: 3500, discount: 12 },
  { id: "credits_business", name: "Business", credits: 1500, basePrice: 9750, discount: 19 },
  { id: "credits_professional", name: "Professional", credits: 5000, basePrice: 30000, discount: 25 },
  { id: "credits_enterprise", name: "Enterprise", credits: 15000, basePrice: 82500, discount: 31 },
]

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function PricingCalculator({
  mode = "sandbox",
  purchasedLayer = 0,
  purchasedPositions = 0,
  purchasedEmployees = 0,
  creditBalance = 0,
  currentTier,
  onLayerChange,
  onPanelOpen,
  forceOpen = false,
  forceClose = false,
}: PricingCalculatorProps) {
  // ─── State ───
  const [selectedCard, setSelectedCard] = useState<number | null>(null)
  const [positions, setPositions] = useState<string>(purchasedPositions > 0 ? String(purchasedPositions) : "")
  const [employees, setEmployees] = useState<string>(purchasedEmployees > 0 ? String(purchasedEmployees) : "")
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("MONTHLY")
  const [renewalType, setRenewalType] = useState<RenewalType>("AUTO")
  const [selectedCredits, setSelectedCredits] = useState<string | null>(null)
  const [upgradeScenario, setUpgradeScenario] = useState<UpgradeScenario>("LAYER_UPGRADE")
  const [purchasing, setPurchasing] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [maturity, setMaturity] = useState<any>(null)
  const cardsRef = useRef<HTMLDivElement>(null)
  const [panelLeft, setPanelLeft] = useState(0)

  useEffect(() => { setMounted(true) }, [])

  // Fetch maturity (portal only)
  useEffect(() => {
    if (mode === "portal") {
      fetch("/api/v1/company/maturity").then(r => r.json()).then(d => { if (d.level) setMaturity(d) }).catch(() => {})
    }
  }, [mode])

  // Force open/close
  useEffect(() => {
    if (forceOpen && selectedCard === null) {
      const auto = purchasedLayer > 0 ? purchasedLayer : 1
      setSelectedCard(auto)
      onLayerChange?.(auto)
      onPanelOpen?.(true)
    }
  }, [forceOpen])

  useEffect(() => {
    if (forceClose && selectedCard !== null) {
      setSelectedCard(null)
      onLayerChange?.(null)
    }
  }, [forceClose])

  // Panel position
  useEffect(() => {
    if (selectedCard && cardsRef.current) {
      const rect = cardsRef.current.getBoundingClientRect()
      setPanelLeft(rect.right + 24)
    }
  }, [selectedCard])

  // ─── Derived values ───
  const pos = Number(positions) || 0
  const emp = Number(employees) || 0
  const detectedTier = currentTier || (pos > 0 || emp > 0 ? detectTier(pos, emp) : "ESSENTIALS")
  const tierConfig = TIERS[detectedTier]
  const selectedCardInfo = selectedCard ? CARDS.find(c => c.number === selectedCard) : null
  const colors = selectedCardInfo ? COLOR_MAP[selectedCardInfo.color] : null

  const isPurchased = selectedCardInfo ? selectedCardInfo.number <= purchasedLayer : false
  const isUpgrade = selectedCardInfo ? selectedCardInfo.number > purchasedLayer && purchasedLayer > 0 : false
  const isCreditsOnly = isPurchased && !!selectedCredits

  const billing = billingPrice(detectedTier, { period: billingPeriod, renewal: renewalType, annualDiscount: 17 })
  const renewalText = renewalExplanation({ period: billingPeriod, renewal: renewalType, annualDiscount: 17 })

  // Credits calculation
  const creditCalc = useMemo(() => {
    if (!selectedCard || pos === 0) return null
    const effectiveEmp = selectedCard === 1 ? pos : Math.max(1, emp) // C1: emp intern = pos
    return calcLayerCredits(selectedCard, Math.max(1, pos), effectiveEmp)
  }, [selectedCard, pos, emp])

  const totalRON = creditCalc ? Math.round(creditCalc.total * tierConfig.creditPrice) : 0

  // ─── Handlers ───
  const handleCardSelect = (card: number | null) => {
    setSelectedCard(card)
    onLayerChange?.(card)
    onPanelOpen?.(card !== null)
  }

  const handlePurchase = async () => {
    if (!selectedCardInfo) return
    setPurchasing(true)
    try {
      const body = isCreditsOnly
        ? { type: "credits", packageId: selectedCredits }
        : {
            type: "service",
            layer: selectedCardInfo.number,
            positions: pos,
            employees: emp,
            annual: billingPeriod === "ANNUAL",
            renewal: renewalType,
            tier: detectedTier,
            creditPackageId: selectedCredits || undefined,
            upgradeScenario: isUpgrade ? upgradeScenario : undefined,
          }
      const res = await fetch("/api/v1/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch (e) { console.error("Checkout error:", e) }
    finally { setPurchasing(false) }
  }

  return (
    <>
      {/* ── ABONAMENTE (3 tier-uri) ── */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Abonament</h3>
          <div className="flex items-center gap-4">
            {/* Billing toggle */}
            <div className="flex bg-slate-100 rounded-lg p-0.5">
              <button
                onClick={() => setBillingPeriod("MONTHLY")}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${billingPeriod === "MONTHLY" ? "bg-white shadow-sm font-medium" : "text-slate-500"}`}
              >Lunar</button>
              <button
                onClick={() => setBillingPeriod("ANNUAL")}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${billingPeriod === "ANNUAL" ? "bg-white shadow-sm font-medium" : "text-slate-500"}`}
              >Anual <span className="text-emerald-600 text-[9px]">-17%</span></button>
            </div>
            {/* Renewal toggle */}
            <div className="flex items-center gap-1.5 border-l border-slate-200 pl-4">
              <span className="text-[10px] text-slate-400">Reînnoire:</span>
              <div className="flex bg-slate-100 rounded-lg p-0.5">
                <button
                  onClick={() => setRenewalType("AUTO")}
                  className={`px-2 py-0.5 text-[10px] rounded-md transition-colors ${renewalType === "AUTO" ? "bg-white shadow-sm font-semibold" : "text-slate-500"}`}
                >Auto</button>
                <button
                  onClick={() => setRenewalType("MANUAL")}
                  className={`px-2 py-0.5 text-[10px] rounded-md transition-colors ${renewalType === "MANUAL" ? "bg-white shadow-sm font-semibold" : "text-slate-500"}`}
                >Manuală</button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {(Object.values(TIERS) as typeof TIERS[SubscriptionTier][]).map((tier) => {
            const isActive = detectedTier === tier.id
            const isCurrent = currentTier === tier.id
            // Fiecare tier arată PROPRIUL preț
            const tierBilling = billingPrice(tier.id, { period: billingPeriod, renewal: renewalType, annualDiscount: 17 })
            return (
              <div
                key={tier.id}
                className={`relative p-4 rounded-xl border-2 transition-all ${
                  isActive ? "border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-200" : "border-slate-200"
                }`}
              >
                {tier.id === "BUSINESS" && (
                  <span className="absolute -top-2 right-3 px-2 py-0.5 bg-indigo-600 text-white text-[8px] font-bold uppercase rounded-full">Recomandat</span>
                )}
                {isCurrent && (
                  <span className="absolute -top-2 left-3 px-2 py-0.5 bg-emerald-600 text-white text-[8px] font-bold uppercase rounded-full">Activ</span>
                )}
                {isActive && !isCurrent && pos > 0 && (
                  <span className="absolute -top-2 left-3 px-2 py-0.5 bg-indigo-500 text-white text-[8px] font-bold uppercase rounded-full">Recomandat pentru dvs.</span>
                )}
                <h4 className="font-bold text-sm">{tier.label}</h4>
                <p className="text-[10px] text-slate-500 mb-2">{tier.employeeRange}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold">{tierBilling.perMonth}</span>
                  <span className="text-xs text-slate-400">RON/lună</span>
                </div>
                {tierBilling.savings > 0 && (
                  <p className="text-[10px] text-emerald-600">Economisiți {tierBilling.savings} RON/an</p>
                )}
                <p className="text-[10px] text-slate-500 mt-1">
                  {tier.id === "ESSENTIALS" ? (
                    // Essentials: preț nominal
                    <><strong>{tier.creditPrice.toFixed(2)} RON</strong>/credit</>
                  ) : (
                    // Business/Enterprise: doar discountul
                    <>Credit: <span className="text-emerald-600 font-semibold">-{tier.creditDiscount}</span> față de prețul standard</>
                  )}
                </p>
                <p className="text-[10px] text-slate-500">{tier.maxOperators} operator{tier.maxOperators > 1 ? "i" : ""} · {tier.freeChat} min chat/lună</p>
              </div>
            )
          })}
        </div>
        <p className="mt-2 text-[10px] text-slate-400 text-center">{renewalText}</p>

        {/* Downgrade info */}
        {currentTier && detectedTier !== currentTier && (
          <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs">
            {(() => {
              const conv = calcDowngradeConversion(currentTier, detectedTier, billingPeriod === "ANNUAL")
              if (conv.creditsConverted > 0) {
                return <p className="text-amber-700">{conv.explanation}</p>
              }
              return <p className="text-indigo-700">Upgrade de la {TIERS[currentTier].label} la {TIERS[detectedTier].label}. Prețul per credit scade la {tierConfig.creditPrice} RON.</p>
            })()}
          </div>
        )}
      </div>

      {/* ── CARDURI C1-C4 ── */}
      <div ref={cardsRef} className="grid grid-cols-2 gap-3">
        {CARDS.map(card => {
          const c = COLOR_MAP[card.color]
          const isSelected = selectedCard === card.number
          const cardPurchased = card.number <= purchasedLayer

          return (
            <button
              key={card.number}
              onClick={() => handleCardSelect(isSelected ? null : card.number)}
              className={`rounded-xl p-4 text-left transition-all border-2 ${
                isSelected ? `${c.bg} ${c.border} shadow-lg` : cardPurchased ? `${c.border} shadow-sm` : "bg-white border-slate-200 hover:shadow-md"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${c.badge}`}>
                    {cardPurchased ? "✓" : card.number}
                  </span>
                  <div>
                    <h3 className={`text-sm font-bold ${isSelected || cardPurchased ? c.text : "text-slate-800"}`}>
                      {card.title} — <span className="font-medium">{card.layerLabel}</span>
                    </h3>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {cardPurchased && <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">ACTIV</span>}
                  {!cardPurchased && maturity?.layerReadiness?.[card.number]?.ready && (
                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded animate-pulse">PREGĂTIT</span>
                  )}
                  <Icon name={PACKAGE_ICONS[card.number] || "icon-evaluare"} size={20} />
                </div>
              </div>
              {card.includesNote && <p className={`text-[9px] ml-10 ${c.text} opacity-70`}>({card.includesNote})</p>}
              <p className="text-[10px] text-slate-400 mt-2 line-clamp-2">{card.description}</p>
            </button>
          )
        })}
      </div>

      {/* ── PANOU DETALII (portal pe card selectat) ── */}
      {selectedCardInfo && colors && mounted && createPortal(
        <div
          style={{ borderWidth: "3px", top: "100px", left: `${panelLeft}px`, right: "24px", maxHeight: "calc(100vh - 130px)", padding: "28px" }}
          className={`fixed rounded-2xl ${colors.border} ${colors.bg} overflow-y-auto shadow-xl z-40`}
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Icon name={PACKAGE_ICONS[selectedCardInfo.number] || "icon-evaluare"} size={28} />
              <div>
                <h3 className="text-lg font-bold text-slate-900">{selectedCardInfo.title}</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${colors.badge}`}>{selectedCardInfo.layerLabel}</span>
              </div>
            </div>
            <button onClick={() => handleCardSelect(null)} className={`${colors.text} hover:opacity-70 text-xl font-bold p-1 rounded`}>✕</button>
          </div>

          <div className="h-4" />
          <p className="text-sm text-slate-600">{selectedCardInfo.description}</p>

          {/* Situație curentă (portal) */}
          {mode === "portal" && (purchasedLayer > 0 || creditBalance > 0) && (
            <div className="mt-4 bg-slate-50 rounded-lg border border-slate-200 p-3">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Situație curentă</p>
              {purchasedLayer > 0 && (
                <div className="flex justify-between mt-2"><span className="text-xs text-slate-600">Card activ</span><span className="text-xs font-bold">{CARDS.find(c => c.number === purchasedLayer)?.title} ({CARDS.find(c => c.number === purchasedLayer)?.layerLabel})</span></div>
              )}
              <div className="flex justify-between mt-1"><span className="text-xs text-slate-600">Credite disponibile</span><span className="text-xs font-bold">{creditBalance.toLocaleString("ro-RO")}</span></div>
            </div>
          )}

          <div className="h-5" />

          {/* Ce include + Extras */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-[10px] font-bold text-slate-700 mb-2 uppercase tracking-wide">Ce include</h4>
              <ul className="space-y-1.5">
                {selectedCardInfo.includes.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-600"><span className="text-emerald-500 mt-0.5">✓</span>{item}</li>
                ))}
              </ul>
            </div>
            {selectedCardInfo.extras && (
              <div>
                <h4 className="text-[10px] font-bold text-slate-700 mb-2 uppercase tracking-wide">Servicii adiționale (credite)</h4>
                <ul className="space-y-1.5">
                  {selectedCardInfo.extras.map((e, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-500 italic"><span className="text-indigo-400 mt-0.5">+</span>{e}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="h-5" />

          {/* Calculator — câmpuri per card */}
          {!isPurchased && (
            <div className={isUpgrade ? `rounded-xl p-4 ${colors.bg} border ${colors.border}` : "bg-amber-50 rounded-xl p-4 border border-amber-200"} style={{ borderWidth: "1px" }}>
              <p className={`text-[10px] font-bold uppercase tracking-wide mb-3 ${isUpgrade ? colors.text : "text-amber-700"}`}>
                {isUpgrade ? `Upgrade → ${selectedCardInfo.title}` : "Dimensiunea organizației"}
              </p>

              <div className="flex items-center gap-4 mb-3">
                <div className="flex items-center gap-2 flex-1">
                  <label className="text-xs text-slate-600">Poziții distincte</label>
                  <input
                    type="number" min={1} max={500} value={positions} placeholder="–"
                    onChange={(e) => setPositions(e.target.value)}
                    className="w-20 text-center text-sm font-bold border-2 rounded-lg px-2 py-1.5 border-amber-300 bg-white focus:ring-2 focus:ring-amber-200"
                  />
                  {isUpgrade && purchasedPositions > 0 && <span className="text-[9px] text-slate-400">era: {purchasedPositions}</span>}
                </div>
                {selectedCardInfo.number >= 2 ? (
                  <div className="flex items-center gap-2 flex-1">
                    <label className="text-xs text-slate-600">Nr. salariați</label>
                    <input
                      type="number" min={1} max={5000} value={employees} placeholder="–"
                      onChange={(e) => setEmployees(e.target.value)}
                      className="w-20 text-center text-sm font-bold border-2 rounded-lg px-2 py-1.5 border-amber-300 bg-white focus:ring-2 focus:ring-amber-200"
                    />
                    {isUpgrade && purchasedEmployees > 0 && <span className="text-[9px] text-slate-400">era: {purchasedEmployees}</span>}
                  </div>
                ) : (
                  <p className="text-[9px] text-slate-400 flex-1 italic">Nr. salariați devine relevant la C2</p>
                )}
              </div>

              {/* Scenarii upgrade */}
              {isUpgrade && (
                <div className="mb-3 space-y-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Tip modificare</p>
                  <div className="flex flex-wrap gap-2">
                    <ScenarioBtn active={upgradeScenario === "LAYER_UPGRADE"} label="Upgrade card" detail="Card superior" onClick={() => setUpgradeScenario("LAYER_UPGRADE")} />
                    <ScenarioBtn active={upgradeScenario === "ADD_POSITIONS"} label="Adaug poziții" detail="Mai multe posturi" onClick={() => setUpgradeScenario("ADD_POSITIONS")} />
                    {selectedCardInfo.number >= 2 && <ScenarioBtn active={upgradeScenario === "ADD_EMPLOYEES"} label="Adaug salariați" detail="Mai mulți angajați" onClick={() => setUpgradeScenario("ADD_EMPLOYEES")} />}
                    <ScenarioBtn active={upgradeScenario === "RENAME_POSITION"} label="Redenumesc poziție" detail="Fără cost suplimentar" onClick={() => setUpgradeScenario("RENAME_POSITION")} />
                  </div>
                  {upgradeScenario === "RENAME_POSITION" && <p className="text-[9px] text-emerald-600">Schimbarea denumirii nu implică cost suplimentar. Reevaluarea consumă credite din sold.</p>}
                </div>
              )}

              {/* Rezultat calcul */}
              {creditCalc && pos > 0 && (
                <div className={`rounded-lg p-4 ${colors.bg}`}>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-600">Servicii</span>
                    <span className="text-sm font-bold">{totalRON.toLocaleString("ro-RO")} RON</span>
                  </div>
                  <p className="text-[9px] text-slate-400">{creditCalc.total.toLocaleString("ro-RO")} credite × {tierConfig.creditPrice} RON ({tierConfig.label})</p>

                  {!isUpgrade && (
                    <div className="flex justify-between mt-3">
                      <span className="text-xs text-slate-600">Abonament {tierConfig.label}</span>
                      <span className="text-sm font-bold">{billing.perMonth} RON<span className="text-[10px] text-slate-400 ml-1">/{billing.periodLabel}</span></span>
                    </div>
                  )}

                  <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between">
                    <span className="text-sm font-bold">{isUpgrade ? "Rest de plată" : "Total"}</span>
                    <span className="text-2xl font-bold">{(totalRON + (isUpgrade ? 0 : billing.perMonth)).toLocaleString("ro-RO")} RON</span>
                  </div>
                  <p className="text-[9px] text-slate-400 text-right">fără TVA</p>
                </div>
              )}
            </div>
          )}

          {/* Pachete credite */}
          {isPurchased && (
            <div className={`rounded-xl p-4 ${colors.bg} border ${colors.border}`} style={{ borderWidth: "1px" }}>
              <p className="text-[10px] font-bold uppercase text-slate-500">Pachet activ — cumpără credite suplimentare</p>
            </div>
          )}

          <div className="h-5" />

          {/* Tabel credite */}
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <div className="flex justify-between">
              <p className="text-[10px] text-slate-400 uppercase">Credite suplimentare (opțional)</p>
              {selectedCredits && <button onClick={() => setSelectedCredits(null)} className="text-[10px] text-slate-400 hover:text-slate-600">Anulează</button>}
            </div>
            <table className="w-full text-xs mt-3">
              <thead>
                <tr className="text-slate-400 border-b"><th className="text-left py-1.5 w-5"></th><th className="text-left py-1.5">Pachet</th><th className="text-right py-1.5">Credite</th><th className="text-right py-1.5">RON</th><th className="text-right py-1.5">Reducere</th></tr>
              </thead>
              <tbody className="text-slate-600">
                {CREDIT_PKGS.map(p => {
                  const isSelected = selectedCredits === p.id
                  // Preț efectiv: baza tier × (1 - discount volum)
                  const effPrice = Math.round(p.credits * tierConfig.creditPrice * (1 - p.discount / 100))
                  const totalDiscount = Math.round((1 - effPrice / (p.credits * 8)) * 100)
                  return (
                    <tr key={p.id} onClick={() => setSelectedCredits(isSelected ? null : p.id)} className={`border-t border-slate-100 cursor-pointer ${isSelected ? "bg-indigo-50" : "hover:bg-slate-50"}`}>
                      <td className="py-1.5"><div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isSelected ? "border-indigo-500" : "border-slate-300"}`}>{isSelected && <div className="w-2 h-2 rounded-full bg-indigo-500" />}</div></td>
                      <td className="py-1.5 font-medium">{p.name}</td>
                      <td className="py-1.5 text-right font-mono">{p.credits.toLocaleString()}</td>
                      <td className="py-1.5 text-right font-mono">{effPrice.toLocaleString()}</td>
                      <td className="py-1.5 text-right text-emerald-600 font-medium">{totalDiscount > 0 ? `-${totalDiscount}%` : "—"}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="h-8" />

          {/* CTA */}
          <div className="flex gap-3">
            {mode === "portal" ? (
              <button
                onClick={handlePurchase}
                disabled={purchasing || (!isCreditsOnly && !pos) || (selectedCardInfo.number >= 2 && !isPurchased && !emp)}
                className={`flex-1 py-3 rounded-lg text-white text-sm font-semibold text-center transition-colors shadow-sm disabled:opacity-50 ${colors.btn}`}
              >
                {purchasing ? "Se procesează..." : upgradeScenario === "RENAME_POSITION" ? "Aplică redenumirea" : isPurchased && !isCreditsOnly ? "✓ Activ" : "Plătește"}
              </button>
            ) : (
              <Link href="/register" className={`flex-1 py-3 rounded-lg text-white text-sm font-semibold text-center ${colors.btn}`}>
                Începe gratuit →
              </Link>
            )}
            <Link href={selectedCardInfo.demoHref} className="flex-1 py-3 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold text-center hover:bg-white/50">
              Vezi demo →
            </Link>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

function ScenarioBtn({ active, label, detail, onClick }: { active: boolean; label: string; detail: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`px-3 py-1.5 rounded-lg text-left transition-all ${active ? "bg-indigo-100 border-2 border-indigo-400 text-indigo-700" : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"}`}>
      <span className="text-[10px] font-semibold block">{label}</span>
      <span className="text-[9px] text-slate-400 block">{detail}</span>
    </button>
  )
}
