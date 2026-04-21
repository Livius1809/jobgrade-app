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
}

const PACKAGES: PackageInfo[] = [
  {
    number: 1,
    icon: "🏗️",
    title: "Ordine internă",
    layerLabel: "Baza",
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

export default function PackageExplorer() {
  const [selected, setSelected] = useState<number | null>(null)
  const [positions, setPositions] = useState<number>(10)
  const [employees, setEmployees] = useState<number>(30)

  const selectedPkg = selected !== null ? PACKAGES.find(p => p.number === selected) : null
  const colors = selectedPkg ? COLOR_MAP[selectedPkg.color] || COLOR_MAP.slate : null

  const [mounted, setMounted] = useState(false)
  const cardsRef = useRef<HTMLDivElement>(null)
  const [panelTop, setPanelTop] = useState(240)

  useEffect(() => { setMounted(true) }, [])

  // Calculează top-ul panoului relativ la carduri
  useEffect(() => {
    if (selectedPkg && cardsRef.current) {
      const rect = cardsRef.current.getBoundingClientRect()
      setPanelTop(rect.top + window.scrollY)
    }
  }, [selectedPkg])

  return (
    <>
      {/* Carduri — în flow-ul normal al paginii (max-w-4xl) */}
      <div ref={cardsRef} className="grid grid-cols-2 gap-3">
        {PACKAGES.map(pkg => {
          const c = COLOR_MAP[pkg.color] || COLOR_MAP.slate
          const isSelected = selected === pkg.number

          return (
            <button
              key={pkg.number}
              onClick={() => setSelected(isSelected ? null : pkg.number)}
              style={isSelected ? { borderWidth: "3px" } : { borderWidth: "2px" }}
              className={`rounded-xl p-4 text-left transition-all ${
                isSelected
                  ? `${c.bg} ${c.border} shadow-lg`
                  : "bg-white border-slate-200 hover:shadow-md hover:border-slate-300"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${c.badge}`}>{pkg.number}</span>
                <span className="text-lg">{pkg.icon}</span>
              </div>
              <h3 className={`text-sm font-bold ${isSelected ? c.text : "text-slate-800"}`}>{pkg.title}</h3>
              <p className={`text-[10px] mt-0.5 font-medium ${isSelected ? c.text : "text-slate-400"}`}>{pkg.layerLabel}</p>
              <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{pkg.description}</p>
            </button>
          )
        })}
      </div>

      {/* Cartuș detalii — Portal la body, ancorat la dreapta ecranului cu padding */}
      {selectedPkg && colors && mounted && createPortal(
        <div
          style={{ borderWidth: "3px", top: `${panelTop}px`, right: "24px", maxHeight: "calc(100vh - 48px)" }}
          className={`absolute w-[420px] rounded-2xl ${colors.border} ${colors.bg} p-6 overflow-y-auto shadow-xl z-40`}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{selectedPkg.icon}</span>
              <div>
                <h3 className="text-lg font-bold text-slate-900">{selectedPkg.title}</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded inline-block ${colors.badge}`}>{selectedPkg.layerLabel}</span>
              </div>
            </div>
            <button onClick={() => setSelected(null)} className={`${colors.text} hover:opacity-70 text-xl font-bold leading-none p-1 rounded transition-opacity`} title="Închide">✕</button>
          </div>

          <p className="text-sm text-slate-600 mb-4 leading-relaxed">{selectedPkg.description}</p>

          {/* Ce include + Servicii adiționale — pe 2 coloane */}
          <div className="grid grid-cols-2 gap-4 mb-4">
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

          {/* Calculator preț + Rezultat — compact */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 mb-4">
            <div className="flex items-center gap-6 mb-3">
              <p className="text-[10px] text-slate-700 font-bold uppercase tracking-wide shrink-0">Calculează prețul</p>
              <div className="flex items-center gap-4 flex-1">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-500">Poziții</label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={positions}
                    onChange={(e) => setPositions(Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
                    className="w-20 text-center text-sm font-bold border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-500">Salariați</label>
                  <input
                    type="number"
                    min={1}
                    max={5000}
                    value={employees}
                    onChange={(e) => setEmployees(Math.max(1, Math.min(5000, Number(e.target.value) || 1)))}
                    className="w-20 text-center text-sm font-bold border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
              </div>
            </div>

            {(() => {
              const calc = calcLayerCredits(selectedPkg.number, positions, employees)
              const ppc = pricePerCredit(calc.total)
              const volumeDiscount = getVolumeDiscount(positions, employees)
              const priceBeforeDiscount = Math.round(calc.total * ppc)
              const priceRON = Math.round(priceBeforeDiscount * (1 - volumeDiscount.pct / 100))

              return (
                <div className={`rounded-lg p-4 ${colors.bg} flex items-center justify-between`}>
                  <div>
                    {volumeDiscount.pct > 0 && (
                      <p className="text-xs text-slate-400 line-through">{priceBeforeDiscount.toLocaleString("ro-RO")} RON</p>
                    )}
                    <p className="text-3xl font-bold text-slate-900">
                      {priceRON.toLocaleString("ro-RO")} RON
                    </p>
                    <p className="text-[9px] text-slate-400 mt-0.5">fără TVA · + abonament 399 RON/lună</p>
                  </div>
                  {volumeDiscount.pct > 0 && (
                    <span className="text-sm text-emerald-600 font-semibold bg-emerald-50 px-3 py-1 rounded-full">
                      {volumeDiscount.label}: -{volumeDiscount.pct}%
                    </span>
                  )}
                </div>
              )
            })()}
          </div>

          {/* Pachete credite — tabel compact */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 mb-4">
            <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Pachete credite</p>
            <p className="text-[10px] text-slate-500 mb-3 leading-relaxed">
              Creditele suplimentare: revalidare, simulări, consultanță HR, rapoarte per angajat.
            </p>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-200">
                  <th className="text-left py-1.5">Pachet</th>
                  <th className="text-right py-1.5">Credite</th>
                  <th className="text-right py-1.5">RON</th>
                  <th className="text-right py-1.5">Discount</th>
                </tr>
              </thead>
              <tbody className="text-slate-600">
                {[
                  { name: "Micro", credits: 100, price: 800, disc: "—" },
                  { name: "Mini", credits: 250, price: 1875, disc: "-6%" },
                  { name: "Start", credits: 500, price: 3500, disc: "-12%" },
                  { name: "Business", credits: 1500, price: 9750, disc: "-19%" },
                  { name: "Professional", credits: 5000, price: 30000, disc: "-25%" },
                  { name: "Enterprise", credits: 15000, price: 82500, disc: "-31%" },
                ].map(p => (
                  <tr key={p.name} className="border-t border-slate-100">
                    <td className="py-1.5 font-medium">{p.name}</td>
                    <td className="py-1.5 text-right font-mono">{p.credits.toLocaleString()}</td>
                    <td className="py-1.5 text-right font-mono">{p.price.toLocaleString()}</td>
                    <td className="py-1.5 text-right text-emerald-600 font-medium">{p.disc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bară pachete incluse — compact */}
          <div className="mb-4">
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

          {/* Acțiuni */}
          <div className="flex gap-3">
            <Link
              href={selectedPkg.activateHref}
              className={`flex-1 py-2.5 rounded-lg text-white text-sm font-semibold text-center transition-colors shadow-sm ${colors.btn}`}
            >
              Cumpără
            </Link>
            <Link
              href={selectedPkg.demoHref}
              className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold text-center hover:bg-white/50 transition-colors"
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
