"use client"

import { useState } from "react"
import { calcCardCredits, detectTier, TIERS, CARD_DESCRIPTIONS, type SubscriptionTier } from "@/lib/pricing"

/**
 * Calculator interactiv "Cât m-ar costa dacă aș alege să fac..."
 *
 * Per card: C1 cere doar poziții, C2 cere doar angajați.
 * Tier-ul se detectează automat. Prețurile sunt REALE.
 */

const CARDS = [
  { id: 1, name: "Organizare internă", desc: "Evaluare posturi, fișe de post AI, ierarhizare", color: "#4F46E5" },
  { id: 2, name: "Conformitate", desc: "Grilă salarială, pay gap, benchmark, obligații legale", color: "#7C3AED" },
  { id: 3, name: "Competitivitate", desc: "Pachete salariale, evaluare performanță, impact bugetar", color: "#2563EB" },
  { id: 4, name: "Dezvoltare", desc: "Dezvoltare HR, recrutare, manual angajat", color: "#059669" },
]

export function CostCalculator() {
  const [positions, setPositions] = useState(10)
  const [employees, setEmployees] = useState(30)
  const [selectedCards, setSelectedCards] = useState<number[]>([1])

  // Poziții nu pot depăși angajații
  const handlePositions = (val: number) => {
    const capped = Math.min(val, employees)
    setPositions(capped)
  }
  const handleEmployees = (val: number) => {
    setEmployees(val)
    if (positions > val) setPositions(val)
  }

  const tier = detectTier(positions, employees)
  const tierConfig = TIERS[tier]

  const toggleCard = (cardId: number) => {
    setSelectedCards(prev => {
      if (prev.includes(cardId)) {
        return prev.filter(c => c !== cardId)
      }
      // Cardurile sunt cumulative — selectarea C3 include C1+C2
      const all = []
      for (let i = 1; i <= cardId; i++) all.push(i)
      return all
    })
  }

  // Calculăm costul total
  let totalCredits = 0
  const breakdown: Array<{ card: number; name: string; credits: number; items: any[] }> = []

  for (const cardId of selectedCards) {
    const cardPositions = cardId === 2 ? 0 : positions // C2 nu adaugă credite per poziție (sunt din C1)
    const cardEmployees = cardId === 1 ? 0 : employees // C1 nu cere angajați
    const calc = calcCardCredits(cardId, cardId === 1 ? positions : positions, cardId <= 1 ? 0 : employees)
    breakdown.push({ card: cardId, name: CARDS[cardId - 1].name, credits: calc.total, items: calc.items })
    totalCredits += calc.total
  }

  const totalRON = Math.round(totalCredits * tierConfig.creditPrice)
  const subscriptionRON = tierConfig.monthlyPrice

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

        {/* Inputuri */}
        <div className="p-6 border-b border-slate-100">
          <div className="grid sm:grid-cols-2 gap-6">
            {/* Poziții (C1) */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Câte posturi distincte aveți?
              </label>
              <input
                type="range"
                min={1}
                max={Math.min(200, employees)}
                value={positions}
                onChange={(e) => handlePositions(parseInt(e.target.value))}
                className="w-full accent-indigo-600"
              />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-slate-400">1</span>
                <span className="text-lg font-bold text-indigo-600">{positions} posturi</span>
                <span className="text-xs text-slate-400">200</span>
              </div>
            </div>

            {/* Angajați (C2+) */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Câți angajați aveți?
              </label>
              <input
                type="range"
                min={1}
                max={500}
                value={employees}
                onChange={(e) => handleEmployees(parseInt(e.target.value))}
                className="w-full accent-violet-600"
              />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-slate-400">1</span>
                <span className="text-lg font-bold text-violet-600">{employees} angajați</span>
                <span className="text-xs text-slate-400">500</span>
              </div>
            </div>
          </div>

          {/* Tier detectat automat */}
          <div className="mt-4 flex items-center justify-center gap-2 bg-indigo-50 rounded-lg py-2 px-4">
            <span className="text-xs text-slate-500">Abonament recomandat:</span>
            <span className="text-sm font-bold text-indigo-600">{tierConfig.label}</span>
            <span className="text-xs text-slate-400">({tierConfig.monthlyPrice} RON/lună, {tierConfig.creditPrice.toFixed(2)} RON/credit)</span>
          </div>
        </div>

        {/* Selectare carduri */}
        <div className="p-6 border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-700 mb-3">Ce servicii doriți?</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {CARDS.map((card) => {
              const isSelected = selectedCards.includes(card.id)
              return (
                <button
                  key={card.id}
                  onClick={() => toggleCard(card.id)}
                  className={`text-left rounded-lg border-2 p-3 transition-all ${
                    isSelected
                      ? "border-indigo-400 bg-indigo-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center text-xs ${
                      isSelected ? "border-indigo-500 bg-indigo-500 text-white" : "border-slate-300"
                    }`}>
                      {isSelected && "✓"}
                    </div>
                    <span className="text-sm font-semibold" style={{ color: isSelected ? card.color : "#64748B" }}>
                      C{card.id} — {card.name}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 ml-7">{card.desc}</p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Rezultat */}
        <div className="p-6 bg-slate-50">
          {/* Breakdown */}
          {breakdown.length > 0 && (
            <div className="space-y-3 mb-5">
              {breakdown.map((b) => (
                <div key={b.card}>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-700">C{b.card} — {b.name}</span>
                    <span className="text-sm font-semibold text-slate-800">{b.credits} credite</span>
                  </div>
                  <div className="ml-4 mt-1 space-y-0.5">
                    {b.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-[11px] text-slate-500">
                        <span>{item.label}</span>
                        <span>{item.detail}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Total */}
          <div className="border-t border-slate-200 pt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-slate-600">Total credite servicii</span>
              <span className="text-lg font-bold text-slate-800">{totalCredits.toLocaleString("ro-RO")} credite</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-slate-600">Cost servicii ({tierConfig.creditPrice.toFixed(2)} RON/credit)</span>
              <span className="text-lg font-bold text-slate-800">{totalRON.toLocaleString("ro-RO")} RON</span>
            </div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-slate-600">Abonament {tierConfig.label} (lunar)</span>
              <span className="text-lg font-bold text-indigo-600">+{subscriptionRON} RON/lună</span>
            </div>

            <div className="bg-indigo-600 text-white rounded-xl p-4 text-center">
              <p className="text-xs opacity-80 mb-1">Cost total estimat</p>
              <p className="text-2xl font-extrabold">
                {(totalRON + subscriptionRON).toLocaleString("ro-RO")} RON
              </p>
              <p className="text-xs opacity-70 mt-1">
                {subscriptionRON} RON abonament + {totalRON.toLocaleString("ro-RO")} RON servicii (o singură dată)
              </p>
            </div>

            <p className="text-center text-[10px] text-emerald-600 mt-3 font-medium">
              Prețurile afișate sunt reale și se aplică la activarea contului
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
