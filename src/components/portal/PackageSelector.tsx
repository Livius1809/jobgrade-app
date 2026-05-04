"use client"

/**
 * PackageSelector — Calculator unificat prețuri + abonamente
 *
 * 3 abonamente (Essentials/Business/Enterprise) + calculator credite per layer.
 * Preț/credit diferențiat per abonament (nu per volum).
 * Upgrade/downgrade cu conversie diferență în credite.
 *
 * Sincronizat cu /b2b/abonamente (aceleași prețuri, aceeași logică).
 */

import { useState, useMemo } from "react"
import Link from "next/link"

// ═══════════════════════════════════════════════════════════════
// FORMULE CREDITE PER LAYER (identice cu PackageExplorer)
// ═══════════════════════════════════════════════════════════════

function calcLayer0(positions: number, employees: number) {
  return {
    items: [
      { label: "Evaluare posturi (JE AUTO)", credits: positions * 60, detail: `${positions} × 60 cr` },
      { label: "Fișe de post AI", credits: positions * 12, detail: `${positions} × 12 cr` },
      { label: "Structură salarială (clase + trepte)", credits: 20 + employees * 1, detail: `20 + ${employees} × 1 cr` },
    ],
  }
}

function calcLayer1(positions: number, employees: number) {
  return {
    items: [
      { label: "Analiză pay gap pe categorii (Art. 9)", credits: 15 + Math.ceil(employees * 0.5), detail: `15 + ${employees} × 0,5 cr` },
      { label: "Benchmark salarial vs piață", credits: 30 + Math.ceil(positions * 1.5), detail: `30 + ${positions} × 1,5 cr` },
    ],
  }
}

function calcLayer2(positions: number, employees: number) {
  return {
    items: [
      { label: "Pachete salariale (compensații + beneficii)", credits: 25 + positions * 1, detail: `25 + ${positions} × 1 cr` },
      { label: "Evaluarea performanței", credits: employees * 15, detail: `${employees} × 15 cr` },
      { label: "Raport impact bugetar", credits: 40, detail: "40 cr" },
    ],
  }
}

function calcLayer3(positions: number, employees: number) {
  const recruitProjects = Math.max(1, Math.ceil(positions * 0.2))
  const candidates = recruitProjects * 5
  return {
    items: [
      { label: "Plan dezvoltare resurse umane", credits: 40 + employees * 1, detail: `40 + ${employees} × 1 cr` },
      { label: `Proiectare recrutare (${recruitProjects} proiecte)`, credits: recruitProjects * 60, detail: `${recruitProjects} × 60 cr` },
      { label: `Gestionare candidați (${candidates} candidați)`, credits: candidates * 10, detail: `${candidates} × 10 cr` },
      { label: "Documente pre-angajare", credits: candidates * 8, detail: `${candidates} × 8 cr` },
      { label: "Manual angajat", credits: 20 + Math.ceil(positions * 1.5), detail: `20 + ${positions} × 1,5 cr` },
    ],
  }
}

// ═══════════════════════════════════════════════════════════════
// CELE 3 ABONAMENTE (sincronizate cu /b2b/abonamente)
// ═══════════════════════════════════════════════════════════════

interface Tier {
  id: "ESSENTIALS" | "BUSINESS" | "ENTERPRISE"
  name: string
  segment: string
  monthlyPrice: number
  annualPrice: number
  creditPrice: number
  discount: number
  maxPositions: number | null
  operators: string
  chatMinutes: number
  storage: string
  support: string
  accountManager: string
}

const TIERS: Tier[] = [
  {
    id: "ESSENTIALS", name: "Essentials", segment: "1-50 angajați",
    monthlyPrice: 299, annualPrice: 2990, creditPrice: 8.00, discount: 0,
    maxPositions: 30, operators: "1", chatMinutes: 90, storage: "500 MB",
    support: "Standard (48h)", accountManager: "Nu",
  },
  {
    id: "BUSINESS", name: "Business", segment: "51-200 angajați",
    monthlyPrice: 599, annualPrice: 5990, creditPrice: 6.50, discount: 19,
    maxPositions: 100, operators: "3", chatMinutes: 150, storage: "2 GB",
    support: "Prioritar (24h)", accountManager: "Partajat",
  },
  {
    id: "ENTERPRISE", name: "Enterprise", segment: "200+ angajați",
    monthlyPrice: 999, annualPrice: 9990, creditPrice: 5.50, discount: 31,
    maxPositions: null, operators: "5+", chatMinutes: 250, storage: "10 GB",
    support: "Premium (4h)", accountManager: "Dedicat",
  },
]

// ═══════════════════════════════════════════════════════════════
// PACHETE CREDITE (discount volum — SE CUMULEAZĂ cu discountul abonament)
// ═══════════════════════════════════════════════════════════════

interface CreditPackage {
  id: string
  name: string
  credits: number
  volumeDiscount: number   // % discount pe preț/credit de bază al abonamentului
}

const CREDIT_PACKAGES: CreditPackage[] = [
  { id: "MICRO",        name: "Micro",        credits: 100,    volumeDiscount: 0 },
  { id: "MINI",         name: "Mini",         credits: 250,    volumeDiscount: 6 },
  { id: "START",        name: "Start",        credits: 500,    volumeDiscount: 12 },
  { id: "BUSINESS_CR",  name: "Business",     credits: 1500,   volumeDiscount: 19 },
  { id: "PROFESSIONAL", name: "Professional", credits: 5000,   volumeDiscount: 25 },
  { id: "ENTERPRISE_CR",name: "Enterprise",   credits: 15000,  volumeDiscount: 31 },
]

/** Preț efectiv per credit = preț bază abonament × (1 - discount volum) */
function effectiveCreditPrice(tierCreditPrice: number, volumeDiscount: number): number {
  return Math.round(tierCreditPrice * (1 - volumeDiscount / 100) * 100) / 100
}

/** Găsește pachetul de credite potrivit pentru un nr total de credite */
function suggestPackage(totalCredits: number): CreditPackage {
  for (let i = CREDIT_PACKAGES.length - 1; i >= 0; i--) {
    if (totalCredits >= CREDIT_PACKAGES[i].credits) return CREDIT_PACKAGES[i]
  }
  return CREDIT_PACKAGES[0]
}

// ═══════════════════════════════════════════════════════════════
// LAYERE (servicii per card)
// ═══════════════════════════════════════════════════════════════

const LAYERS = [
  { id: 0, name: "C1 — Ordine internă", tagline: "Cine face ce și cât ar trebui să câștige", icon: "🏗️", color: "slate" },
  { id: 1, name: "C2 — Conformitate", tagline: "Dosarul complet pentru aliniere legislativă", icon: "⚖️", color: "indigo" },
  { id: 2, name: "C3 — Competitivitate", tagline: "Atragere și retenție a oamenilor performanți", icon: "🎯", color: "emerald" },
  { id: 3, name: "C4 — Dezvoltare", tagline: "Creștere organizațională sistematică", icon: "🌱", color: "amber" },
]

const colorMap: Record<string, { ring: string; bg: string; text: string; border: string }> = {
  slate:   { ring: "ring-slate-300",   bg: "bg-slate-600",   text: "text-slate-700",   border: "border-slate-200" },
  indigo:  { ring: "ring-indigo-300",  bg: "bg-indigo-600",  text: "text-indigo-700",  border: "border-indigo-200" },
  emerald: { ring: "ring-emerald-300", bg: "bg-emerald-600", text: "text-emerald-700", border: "border-emerald-200" },
  amber:   { ring: "ring-amber-300",   bg: "bg-amber-600",   text: "text-amber-700",   border: "border-amber-200" },
}

// ═══════════════════════════════════════════════════════════════
// UPGRADE / DOWNGRADE LOGIC
// ═══════════════════════════════════════════════════════════════

interface UpgradeDowngradeResult {
  direction: "UPGRADE" | "DOWNGRADE" | "SAME"
  fromTier: Tier
  toTier: Tier
  /** Diferența lunară de abonament */
  monthlyDiff: number
  /** La upgrade: preț/credit scade — clientul economisește per credit */
  creditPriceDiff: number
  /** La downgrade: diferența de abonament nefolosită se convertește în credite */
  refundCredits: number
  /** Explicație */
  explanation: string
}

function calculateUpgradeDowngrade(
  fromTierId: string,
  toTierId: string,
  daysRemainingInMonth: number
): UpgradeDowngradeResult {
  const fromTier = TIERS.find(t => t.id === fromTierId) || TIERS[0]
  const toTier = TIERS.find(t => t.id === toTierId) || TIERS[0]

  const monthlyDiff = toTier.monthlyPrice - fromTier.monthlyPrice
  const creditPriceDiff = fromTier.creditPrice - toTier.creditPrice
  const direction = monthlyDiff > 0 ? "UPGRADE" : monthlyDiff < 0 ? "DOWNGRADE" : "SAME"

  let refundCredits = 0
  let explanation = ""

  if (direction === "UPGRADE") {
    // Upgrade: plătește diferența pro-rata + beneficiază imediat de preț/credit mai mic
    const proRata = Math.round((monthlyDiff * daysRemainingInMonth) / 30)
    explanation = `Upgrade de la ${fromTier.name} la ${toTier.name}. Plătiți ${proRata} RON pro-rata pentru restul lunii. Prețul per credit scade de la ${fromTier.creditPrice} la ${toTier.creditPrice} RON (-${toTier.discount}%).`
  } else if (direction === "DOWNGRADE") {
    // Downgrade: diferența nefolosită din luna curentă se convertește în credite
    const unusedAmount = Math.round((Math.abs(monthlyDiff) * daysRemainingInMonth) / 30)
    refundCredits = Math.floor(unusedAmount / toTier.creditPrice)
    explanation = `Downgrade de la ${fromTier.name} la ${toTier.name}. Diferența nefolosită (${unusedAmount} RON) se convertește în ${refundCredits} credite la prețul ${toTier.name} (${toTier.creditPrice} RON/credit). Prețul per credit crește de la ${fromTier.creditPrice} la ${toTier.creditPrice} RON.`
  } else {
    explanation = "Același abonament — nicio modificare."
  }

  return { direction, fromTier, toTier, monthlyDiff, creditPriceDiff, refundCredits, explanation }
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

interface Props {
  positionCount: number
  employeeCount: number
  creditBalance: number
  currentTierId?: string
  billingPeriod?: "monthly" | "annual"
}

export default function PackageSelector({
  positionCount,
  employeeCount,
  creditBalance,
  currentTierId,
  billingPeriod = "monthly",
}: Props) {
  const [positions, setPositions] = useState(positionCount || 10)
  const [employees, setEmployees] = useState(employeeCount || 30)
  const [selectedTier, setSelectedTier] = useState<string>(currentTierId || "ESSENTIALS")
  const [expandedLayer, setExpandedLayer] = useState<number | null>(null)
  const [billing, setBilling] = useState<"monthly" | "annual">(billingPeriod)
  const [showUpgradeModal, setShowUpgradeModal] = useState<UpgradeDowngradeResult | null>(null)

  const activeTier = TIERS.find(t => t.id === selectedTier) || TIERS[0]

  // Calculează credite per layer (cumulativ) + pachet sugerat + preț efectiv
  const layerData = useMemo(() => {
    const l0 = calcLayer0(positions, employees)
    const l1 = calcLayer1(positions, employees)
    const l2 = calcLayer2(positions, employees)
    const l3 = calcLayer3(positions, employees)

    const cr0 = l0.items.reduce((s, i) => s + i.credits, 0)
    const cr1 = cr0 + l1.items.reduce((s, i) => s + i.credits, 0)
    const cr2 = cr1 + l2.items.reduce((s, i) => s + i.credits, 0)
    const cr3 = cr2 + l3.items.reduce((s, i) => s + i.credits, 0)

    return [
      { ...l0, totalCredits: cr0, incrementCredits: cr0 },
      { ...l1, totalCredits: cr1, incrementCredits: cr1 - cr0 },
      { ...l2, totalCredits: cr2, incrementCredits: cr2 - cr1 },
      { ...l3, totalCredits: cr3, incrementCredits: cr3 - cr2 },
    ]
  }, [positions, employees])

  const handleTierChange = (newTierId: string) => {
    if (currentTierId && currentTierId !== newTierId) {
      const result = calculateUpgradeDowngrade(currentTierId, newTierId, 15) // 15 zile rămase default
      setShowUpgradeModal(result)
    }
    setSelectedTier(newTierId)
  }

  return (
    <div className="space-y-8">
      {/* ── CELE 3 ABONAMENTE ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Abonament</h3>
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => setBilling("monthly")}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${billing === "monthly" ? "bg-white shadow-sm font-medium" : "text-slate-500"}`}
            >
              Lunar
            </button>
            <button
              onClick={() => setBilling("annual")}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${billing === "annual" ? "bg-white shadow-sm font-medium" : "text-slate-500"}`}
            >
              Anual <span className="text-emerald-600 text-[9px]">-17%</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {TIERS.map((tier) => {
            const isActive = selectedTier === tier.id
            const isCurrent = currentTierId === tier.id
            const price = billing === "annual"
              ? Math.round(tier.annualPrice / 12)
              : tier.monthlyPrice

            return (
              <button
                key={tier.id}
                onClick={() => handleTierChange(tier.id)}
                className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                  isActive
                    ? "border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-200"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                {tier.id === "BUSINESS" && (
                  <span className="absolute -top-2 right-3 px-2 py-0.5 bg-indigo-600 text-white text-[8px] font-bold uppercase tracking-wider rounded-full">
                    Recomandat
                  </span>
                )}
                {isCurrent && (
                  <span className="absolute -top-2 left-3 px-2 py-0.5 bg-emerald-600 text-white text-[8px] font-bold uppercase tracking-wider rounded-full">
                    Activ
                  </span>
                )}

                <h4 className="font-bold text-sm text-slate-900">{tier.name}</h4>
                <p className="text-[10px] text-slate-500 mb-2">{tier.segment}</p>

                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold text-slate-900">{price}</span>
                  <span className="text-xs text-slate-400">RON/lună</span>
                </div>

                <div className="mt-2 space-y-0.5">
                  <p className="text-[10px] text-slate-500">
                    Credit: <strong>{tier.creditPrice.toFixed(2)} RON</strong>
                    {tier.discount > 0 && <span className="text-emerald-600 ml-1">(-{tier.discount}%)</span>}
                  </p>
                  <p className="text-[10px] text-slate-500">{tier.operators} operator{tier.operators !== "1" ? "i" : ""}</p>
                  <p className="text-[10px] text-slate-500">{tier.chatMinutes} min consultanță/lună</p>
                  <p className="text-[10px] text-slate-500">{tier.maxPositions ? `Max ${tier.maxPositions} posturi` : "Posturi nelimitate"}</p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Explicație transparentă */}
        <p className="mt-3 text-[10px] text-slate-400 text-center">
          Preț per credit mai mic cu abonamentul mai mare. Creditele nu expiră. Puteți schimba oricând.
        </p>
      </div>

      {/* ── CALCULATOR DIMENSIUNE ── */}
      <div className="bg-slate-50 rounded-xl p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Dimensiunea organizației</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Poziții distincte</label>
            <input
              type="number" min={1} max={500} value={positions}
              onChange={e => setPositions(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Angajați total</label>
            <input
              type="number" min={1} max={5000} value={employees}
              onChange={e => setEmployees(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
        </div>
      </div>

      {/* ── LAYERE CONCENTRICE ── */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Servicii per card</h3>

        {LAYERS.map((layer, idx) => {
          const c = colorMap[layer.color]
          const data = layerData[idx]
          const suggestedPkg = suggestPackage(data.totalCredits)
          const effPrice = effectiveCreditPrice(activeTier.creditPrice, suggestedPkg.volumeDiscount)
          const totalRON = Math.round(data.totalCredits * effPrice)
          const incrementRON = Math.round(data.incrementCredits * effPrice)
          const totalDiscount = Math.round((1 - effPrice / 8) * 100) // discount total vs preț standard 8 RON
          const isExpanded = expandedLayer === idx

          return (
            <div
              key={layer.id}
              className={`rounded-2xl border-2 transition-all ${
                isExpanded ? `${c.ring} ring-2 ${c.border}` : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <button onClick={() => setExpandedLayer(isExpanded ? null : idx)} className="w-full p-4 text-left">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-lg">{layer.icon}</span>
                      <h3 className="font-bold text-slate-900 text-sm">{layer.name}</h3>
                    </div>
                    <p className="text-xs text-slate-500">{layer.tagline}</p>
                    {idx > 0 && (
                      <p className="text-[10px] text-slate-400 mt-0.5 italic">
                        Include tot din {LAYERS[idx - 1].name}, plus {data.items.length} servicii
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xl font-extrabold text-slate-900">
                      {totalRON.toLocaleString("ro-RO")} <span className="text-sm font-normal text-slate-400">RON</span>
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {data.totalCredits.toLocaleString("ro-RO")} cr × {effPrice.toFixed(2)} RON
                    </p>
                    {totalDiscount > 0 && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[9px] font-bold mt-0.5">
                        -{totalDiscount}% ({activeTier.name} + pachet {suggestedPkg.name})
                      </span>
                    )}
                    {idx > 0 && (
                      <p className="text-[10px] text-emerald-600 mt-0.5">
                        +{incrementRON.toLocaleString("ro-RO")} RON față de {LAYERS[idx-1].name.split(" —")[0]}
                      </p>
                    )}
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className={`px-4 pb-4 border-t ${c.border} space-y-3`}>
                  {idx > 0 && (
                    <div className="bg-slate-50 rounded-lg p-3 mt-3">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1">
                        Inclus din cardurile anterioare
                      </p>
                      {Array.from({ length: idx }).flatMap((_, prevIdx) =>
                        layerData[prevIdx].items.map((item, i) => (
                          <div key={`prev-${prevIdx}-${i}`} className="flex justify-between text-xs text-slate-500 py-0.5">
                            <span>✓ {item.label}</span>
                            <span className="text-slate-400">{item.credits} cr</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1">
                      {idx === 0 ? "Servicii incluse" : "Adăugat în acest card"}
                    </p>
                    {data.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-xs text-slate-700 py-1 border-b border-slate-50 last:border-0">
                        <span><span className={c.text}>✓</span> {item.label}</span>
                        <span className="text-slate-400 text-[10px]">{item.detail}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-xs font-bold text-slate-800 pt-2 mt-1 border-t border-slate-200">
                      <span>Total acest card</span>
                      <span>{data.incrementCredits} cr = {incrementRON.toLocaleString("ro-RO")} RON</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-3 grid grid-cols-4 gap-2 text-center">
                    <MiniStat label="Credite" value={data.totalCredits.toLocaleString("ro-RO")} />
                    <MiniStat label={`Bază (${activeTier.name})`} value={`${activeTier.creditPrice.toFixed(2)} RON`} />
                    <MiniStat label={`Efectiv (${suggestedPkg.name})`} value={`${effPrice.toFixed(2)} RON`} />
                    <MiniStat label="Total" value={`${totalRON.toLocaleString("ro-RO")} RON`} />
                  </div>
                  {suggestedPkg.volumeDiscount > 0 && (
                    <p className="text-[10px] text-slate-400 text-center">
                      Discount abonament {activeTier.name}: -{activeTier.discount}% | Discount volum {suggestedPkg.name}: -{suggestedPkg.volumeDiscount}% | Total: -{totalDiscount}%
                    </p>
                  )}

                  {creditBalance >= data.totalCredits ? (
                    <div className="flex items-center gap-3">
                      <button className={`flex-1 py-2.5 ${c.bg} text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity`}>
                        Activează cardul
                      </button>
                      <p className="text-[10px] text-emerald-600 flex-shrink-0">
                        Sold: {creditBalance.toLocaleString("ro-RO")} cr — suficient
                      </p>
                    </div>
                  ) : (
                    <Link
                      href="/settings/billing"
                      className={`block w-full py-2.5 ${c.bg} text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity text-center`}
                    >
                      Achiziționează {data.totalCredits.toLocaleString("ro-RO")} credite — {totalRON.toLocaleString("ro-RO")} RON
                    </Link>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── UPGRADE/DOWNGRADE MODAL ── */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowUpgradeModal(null)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900">
              {showUpgradeModal.direction === "UPGRADE" ? "Upgrade abonament" : "Downgrade abonament"}
            </h3>

            <div className="flex items-center justify-center gap-4 py-3">
              <div className="text-center">
                <p className="text-sm font-semibold">{showUpgradeModal.fromTier.name}</p>
                <p className="text-xs text-slate-500">{showUpgradeModal.fromTier.monthlyPrice} RON/lună</p>
              </div>
              <span className="text-xl">→</span>
              <div className="text-center">
                <p className="text-sm font-semibold">{showUpgradeModal.toTier.name}</p>
                <p className="text-xs text-slate-500">{showUpgradeModal.toTier.monthlyPrice} RON/lună</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">{showUpgradeModal.explanation}</p>

            {showUpgradeModal.direction === "DOWNGRADE" && showUpgradeModal.refundCredits > 0 && (
              <div className="bg-emerald-50 rounded-lg p-3 text-xs text-emerald-700">
                Primiți <strong>{showUpgradeModal.refundCredits} credite</strong> din diferența nefolosită.
              </div>
            )}

            {showUpgradeModal.direction === "UPGRADE" && (
              <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
                Prețul per credit scade cu <strong>{showUpgradeModal.creditPriceDiff.toFixed(2)} RON</strong> per credit.
                Toate creditele viitoare se achiziționează la noul preț.
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowUpgradeModal(null)}
                className="flex-1 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50"
              >
                Anulează
              </button>
              <button
                onClick={() => {
                  // TODO: apel API Stripe pentru schimbare abonament
                  setShowUpgradeModal(null)
                }}
                className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700"
              >
                Confirmă {showUpgradeModal.direction === "UPGRADE" ? "upgrade" : "downgrade"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="text-center">
        <Link href="/b2b/abonamente" className="text-xs text-indigo-500 hover:text-indigo-700 hover:underline">
          Detalii complete despre abonamente →
        </Link>
      </div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg px-2 py-2 border border-slate-100">
      <p className="text-xs font-bold text-slate-800">{value}</p>
      <p className="text-[9px] text-slate-400 uppercase tracking-wider">{label}</p>
    </div>
  )
}
