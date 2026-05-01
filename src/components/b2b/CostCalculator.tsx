"use client"

import { useState } from "react"
import { detectTier, TIERS, type SubscriptionTier } from "@/lib/pricing"

/**
 * Calculator interactiv "Cât m-ar costa dacă..."
 *
 * Clientul vede ce PRIMEȘTE, nu cum calculăm noi.
 * Servicii incluse (default) + add-ons (bife).
 * Jos: un singur număr "Total de plătit la înregistrare".
 */

// Servicii per card — incluse by default sau add-on
interface Service {
  name: string
  description: string
  creditsPerUnit: number
  unit: "per poziție" | "per angajat" | "per proiect" | "fix"
  included: boolean // true = inclus în preț, false = add-on cu bifă
}

const CARD_SERVICES: Record<number, { name: string; color: string; services: Service[] }> = {
  1: {
    name: "Organizare internă",
    color: "#4F46E5",
    services: [
      { name: "Ierarhizare posturi", description: "Evaluare pe 6 criterii, ranking, clase salariale", creditsPerUnit: 60, unit: "per poziție", included: true },
      { name: "Generare fișe de post AI", description: "Fișă completă cu criterii, responsabilități, cerințe", creditsPerUnit: 12, unit: "per poziție", included: false },
      { name: "Simulare restructurare", description: "Impact adăugare/eliminare posturi — plătiți doar diferența", creditsPerUnit: 3, unit: "per poziție", included: false },
      { name: "Raport interactiv C1", description: "Vizualizare ranking, comparații, export", creditsPerUnit: 5, unit: "fix", included: true },
    ],
  },
  2: {
    name: "Conformitate",
    color: "#7C3AED",
    services: [
      { name: "Structură salarială", description: "Grilă clase + trepte, calibrată pe piață", creditsPerUnit: 1, unit: "per angajat", included: true },
      { name: "Raport pay gap", description: "Analiză decalaj salarial pe gen (Directiva EU 2023/970)", creditsPerUnit: 3, unit: "fix", included: true },
      { name: "Benchmark salarial", description: "Comparație cu piața pe fiecare categorie de posturi", creditsPerUnit: 1.5, unit: "per poziție", included: false },
      { name: "Simulare salariu", description: "Impact modificări salariale pe buget și conformitate", creditsPerUnit: 3, unit: "fix", included: false },
      { name: "Raport interactiv C2", description: "Dashboard conformitate, calendar obligații", creditsPerUnit: 5, unit: "fix", included: true },
    ],
  },
  3: {
    name: "Competitivitate",
    color: "#2563EB",
    services: [
      { name: "Pachete salariale", description: "Compensare totală: bază + variabil + beneficii", creditsPerUnit: 1, unit: "per poziție", included: true },
      { name: "Evaluare performanță", description: "KPI per angajat, măsurare, trend", creditsPerUnit: 15, unit: "per angajat", included: true },
      { name: "Sociogramă echipe", description: "Relații, dinamică grup, preferințe", creditsPerUnit: 40, unit: "fix", included: false },
      { name: "Manual calitate", description: "SOP, RACI, KPI per proces", creditsPerUnit: 40, unit: "fix", included: false },
      { name: "Raport interactiv C3", description: "Competitivitate salarială, impact bugetar", creditsPerUnit: 5, unit: "fix", included: true },
    ],
  },
  4: {
    name: "Dezvoltare",
    color: "#059669",
    services: [
      { name: "Audit cultural", description: "7 dimensiuni, scor organizație, calibrare RO", creditsPerUnit: 1, unit: "per angajat", included: true },
      { name: "Plan intervenție", description: "Strategie pe 12 luni cu obiective concrete", creditsPerUnit: 60, unit: "fix", included: true },
      { name: "Simulator HU-AI", description: "Impact tranziție posturi umane → mixte/AI", creditsPerUnit: 3, unit: "per poziție", included: false },
      { name: "Recrutare AI", description: "Matching candidați B2C cu posturi B2B", creditsPerUnit: 60, unit: "fix", included: false },
      { name: "Raport interactiv C4", description: "Evoluție cultură, monitorizare puls", creditsPerUnit: 5, unit: "fix", included: true },
    ],
  },
}

// Pachete disponibile (ordonate descrescător pe discount)
const PACKAGES = [
  { name: "Enterprise", credits: 15000, price: 82500, perCredit: 5.50 },
  { name: "Professional", credits: 5000, price: 30000, perCredit: 6.00 },
  { name: "Business", credits: 1500, price: 9750, perCredit: 6.50 },
  { name: "Start", credits: 500, price: 3500, perCredit: 7.00 },
  { name: "Mini", credits: 250, price: 1875, perCredit: 7.50 },
  { name: "Micro", credits: 100, price: 800, perCredit: 8.00 },
]

interface PackageRecommendation {
  packages: Array<{ name: string; credits: number; price: number; perCredit: number }>
  totalCredits: number
  totalPrice: number
  surplus: number // credite rămase disponibile
  savingsVsUnitary: number // economie vs preț unitar 8 RON
}

/**
 * Găsește combinația optimă de pachete care ACOPERĂ COMPLET creditele necesare
 * la cel mai mic preț total. Greedy: pachete mari întâi (discount mai mare).
 * Garantie: totalCredits >= neededCredits (mereu acoperitor).
 */
function recommendPackages(neededCredits: number): PackageRecommendation {
  if (neededCredits <= 0) {
    return { packages: [], totalCredits: 0, totalPrice: 0, surplus: 0, savingsVsUnitary: 0 }
  }

  // Strategie: pentru fiecare pachet de start posibil, calculăm costul total
  // și alegem varianta cea mai ieftină care acoperă integral necesarul
  let bestCombo: PackageRecommendation["packages"] = []
  let bestPrice = Infinity

  // Încercăm combinații greedy pornind de la fiecare nivel de pachet
  for (let startIdx = 0; startIdx < PACKAGES.length; startIdx++) {
    const combo: PackageRecommendation["packages"] = []
    let remaining = neededCredits

    for (let i = startIdx; i < PACKAGES.length; i++) {
      const pkg = PACKAGES[i]
      // Câte pachete de acest tip încap
      const count = Math.floor(remaining / pkg.credits)
      for (let c = 0; c < count; c++) {
        combo.push(pkg)
        remaining -= pkg.credits
      }
    }

    // Dacă mai rămân credite neacoperite, adaugă cel mai mic pachet care acoperă
    if (remaining > 0) {
      // Caută cel mai mic pachet care acoperă restul
      for (let i = PACKAGES.length - 1; i >= 0; i--) {
        if (PACKAGES[i].credits >= remaining) {
          combo.push(PACKAGES[i])
          remaining -= PACKAGES[i].credits
          break
        }
      }
      // Dacă nimic nu acoperă (nu ar trebui), adaugă Micro-uri
      while (remaining > 0) {
        const micro = PACKAGES[PACKAGES.length - 1]
        combo.push(micro)
        remaining -= micro.credits
      }
    }

    const comboPrice = combo.reduce((s, p) => s + p.price, 0)
    if (comboPrice < bestPrice) {
      bestPrice = comboPrice
      bestCombo = combo
    }
  }

  const totalCredits = bestCombo.reduce((s, p) => s + p.credits, 0)
  const totalPrice = bestCombo.reduce((s, p) => s + p.price, 0)
  const surplus = totalCredits - neededCredits
  const unitaryPrice = neededCredits * 8
  const savingsVsUnitary = Math.max(0, unitaryPrice - totalPrice)

  // Grupăm pachetele identice (ex: 2× Mini)
  const grouped: PackageRecommendation["packages"] = []
  for (const pkg of bestCombo) {
    const existing = grouped.find(g => g.name === pkg.name)
    if (existing) {
      existing.credits += pkg.credits
      existing.price += pkg.price
    } else {
      grouped.push({ ...pkg })
    }
  }

  return { packages: grouped, totalCredits, totalPrice, surplus, savingsVsUnitary }
}

export function CostCalculator() {
  const [positions, setPositions] = useState(10)
  const [employees, setEmployees] = useState(30)
  const [selectedCards, setSelectedCards] = useState<number[]>([1])
  const [addons, setAddons] = useState<Record<string, boolean>>({})

  const handlePositions = (val: number) => setPositions(Math.min(val, employees))
  const handleEmployees = (val: number) => {
    setEmployees(val)
    if (positions > val) setPositions(val)
  }

  const tier = detectTier(positions, employees)
  const tierConfig = TIERS[tier]

  const toggleCard = (cardId: number) => {
    setSelectedCards(prev => {
      if (prev.includes(cardId)) return prev.filter(c => c !== cardId)
      const all = []
      for (let i = 1; i <= cardId; i++) all.push(i)
      return all
    })
  }

  const toggleAddon = (key: string) => {
    setAddons(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Calcul total
  const calcServiceCost = (s: Service): number => {
    switch (s.unit) {
      case "per poziție": return Math.round(s.creditsPerUnit * positions)
      case "per angajat": return Math.round(s.creditsPerUnit * employees)
      case "per proiect": return Math.round(s.creditsPerUnit)
      case "fix": return Math.round(s.creditsPerUnit)
    }
  }

  let totalCredits = 0
  for (const cardId of selectedCards) {
    const card = CARD_SERVICES[cardId]
    for (const service of card.services) {
      const key = `${cardId}-${service.name}`
      if (service.included || addons[key]) {
        totalCredits += calcServiceCost(service)
      }
    }
  }

  const totalServiciiRON = Math.round(totalCredits * tierConfig.creditPrice)

  // Recomandare pachete optimale
  const recommendation = recommendPackages(totalCredits)

  const totalInregistrare = recommendation.totalPrice + tierConfig.monthlyPrice

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

        {/* Slidere */}
        <div className="p-6 border-b border-slate-100">
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Câte posturi distincte aveți?</label>
              <input type="range" min={1} max={Math.min(200, employees)} value={positions}
                onChange={(e) => handlePositions(parseInt(e.target.value))} className="w-full accent-indigo-600" />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-slate-400">1</span>
                <span className="text-lg font-bold text-indigo-600">{positions} posturi</span>
                <span className="text-xs text-slate-400">{Math.min(200, employees)}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Câți angajați aveți?</label>
              <input type="range" min={1} max={500} value={employees}
                onChange={(e) => handleEmployees(parseInt(e.target.value))} className="w-full accent-violet-600" />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-slate-400">1</span>
                <span className="text-lg font-bold text-violet-600">{employees} angajați</span>
                <span className="text-xs text-slate-400">500</span>
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-center gap-2 bg-indigo-50 rounded-lg py-2 px-4">
            <span className="text-xs text-slate-500">Abonament recomandat:</span>
            <span className="text-sm font-bold text-indigo-600">{tierConfig.label}</span>
            <span className="text-xs text-slate-400">({tierConfig.monthlyPrice} RON/lună)</span>
          </div>
        </div>

        {/* Carduri cu servicii */}
        <div className="p-6 space-y-4">
          {[1, 2, 3, 4].map(cardId => {
            const card = CARD_SERVICES[cardId]
            const isActive = selectedCards.includes(cardId)

            return (
              <div key={cardId} className={`rounded-xl border-2 overflow-hidden transition-all ${
                isActive ? "border-slate-300" : "border-dashed border-slate-200 opacity-60"
              }`}>
                {/* Card header — toggle */}
                <button
                  onClick={() => toggleCard(cardId)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left"
                  style={{ background: isActive ? `${card.color}10` : "transparent" }}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center text-xs ${
                      isActive ? "text-white" : "border-slate-300"
                    }`} style={isActive ? { background: card.color, borderColor: card.color } : {}}>
                      {isActive && "✓"}
                    </div>
                    <span className="text-sm font-semibold" style={{ color: isActive ? card.color : "#94A3B8" }}>
                      C{cardId} — {card.name}
                    </span>
                  </div>
                  {isActive && (
                    <span className="text-xs text-slate-500">
                      {card.services.filter(s => s.included || addons[`${cardId}-${s.name}`]).reduce((sum, s) => sum + calcServiceCost(s), 0)} credite
                    </span>
                  )}
                </button>

                {/* Servicii — vizibile doar dacă cardul e activ */}
                {isActive && (
                  <div className="px-4 pb-3 space-y-1.5">
                    {card.services.map(service => {
                      const key = `${cardId}-${service.name}`
                      const isOn = service.included || addons[key]
                      const cost = calcServiceCost(service)

                      return (
                        <div key={key} className="flex items-start gap-2 py-1">
                          {service.included ? (
                            <div className="w-4 h-4 mt-0.5 rounded bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px] flex-shrink-0">✓</div>
                          ) : (
                            <button
                              onClick={() => toggleAddon(key)}
                              className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center text-[10px] flex-shrink-0 transition-colors ${
                                addons[key] ? "bg-indigo-500 border-indigo-500 text-white" : "border-slate-300"
                              }`}
                            >
                              {addons[key] && "✓"}
                            </button>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className={`text-xs font-medium ${isOn ? "text-slate-700" : "text-slate-400"}`}>
                                {service.name}
                                {service.included && <span className="text-[9px] text-emerald-600 ml-1">inclus</span>}
                              </span>
                              <span className={`text-xs ${isOn ? "text-slate-600" : "text-slate-300"}`}>
                                {cost} cr ({Math.round(cost * tierConfig.creditPrice)} RON)
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 leading-tight">{service.description}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Recomandare pachete optimale */}
        {totalCredits > 0 && recommendation.packages.length > 0 && (
          <div className="px-6 pb-4">
            <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4">
              <p className="text-xs font-semibold text-emerald-800 mb-2">
                Varianta cea mai avantajoasă pentru {totalCredits.toLocaleString("ro-RO")} credite necesare:
              </p>
              <div className="space-y-1.5">
                {recommendation.packages.map((pkg, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-emerald-700">
                      Pachet <span className="font-semibold">{pkg.name}</span> ({pkg.credits.toLocaleString("ro-RO")} credite)
                    </span>
                    <span className="font-semibold text-emerald-800">{pkg.price.toLocaleString("ro-RO")} RON</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 pt-2 border-t border-emerald-200 flex items-center justify-between text-xs">
                <span className="text-emerald-700">
                  Total: {recommendation.totalCredits.toLocaleString("ro-RO")} credite
                  {recommendation.surplus > 0 && (
                    <span className="text-emerald-500"> ({recommendation.surplus} credite rămân disponibile)</span>
                  )}
                </span>
                <span className="font-bold text-emerald-800">{recommendation.totalPrice.toLocaleString("ro-RO")} RON</span>
              </div>
              {recommendation.savingsVsUnitary > 0 && (
                <p className="mt-1.5 text-[10px] text-emerald-600">
                  Economisiți {recommendation.savingsVsUnitary.toLocaleString("ro-RO")} RON față de achiziția la preț unitar
                </p>
              )}
            </div>
          </div>
        )}

        {/* Total — banda albastră */}
        <div className="bg-indigo-600 text-white p-5 text-center">
          <p className="text-xs opacity-80 mb-1">Total de plătit la înregistrare</p>
          <p className="text-3xl font-extrabold">
            {totalInregistrare.toLocaleString("ro-RO")} RON
          </p>
          <p className="text-xs opacity-70 mt-1.5">
            {tierConfig.monthlyPrice} RON abonament {tierConfig.label} + {recommendation.totalPrice.toLocaleString("ro-RO")} RON credite
          </p>
          <p className="text-[10px] opacity-60 mt-2">
            Prețurile sunt reale. La modificări ulterioare plătiți doar diferența.
          </p>
        </div>
      </div>
    </div>
  )
}
