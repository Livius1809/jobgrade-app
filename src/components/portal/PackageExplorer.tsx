"use client"

import { useState } from "react"
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
}

const PACKAGES: PackageInfo[] = [
  {
    number: 1,
    icon: "🏗️",
    title: "Ordine internă",
    layerLabel: "BAZA",
    description: "Evaluare și ierarhizare posturi pe criterii obiective, neutre din perspectiva genului.",
    includes: [
      "Evaluare AI automată sau prin comisie",
      "Clasament posturi pe 4 criterii (Directiva EU 2023/970, Art. 3)",
      "Simulator interactiv — modifici, vezi impactul live",
      "Raport profesional cu validare oficială",
      "Semnătură electronică și olografă",
    ],
    price: "De la 90 RON/poziție",
    priceDetail: "Plată unică. Include simulări nelimitate înainte de validare.",
    demoHref: "/demo",
    activateHref: "/sessions",
    color: "slate",
    cumulative: ["Evaluare posturi", "Ierarhizare", "Simulator", "Raport", "Validare"],
  },
  {
    number: 2,
    icon: "⚖️",
    title: "Conformitate",
    layerLabel: "LAYER 1",
    description: "Structură salarială transparentă, analiză decalaj salarial, conformitate Directiva EU 2023/970.",
    includes: [
      "Tot ce include BAZA +",
      "Clase salariale cu trepte (metoda Pitariu, progresie geometrică)",
      "Analiză decalaj salarial F/M pe muncă de valoare egală",
      "Justificări documentate pentru diferențe",
      "Plan de corecție dacă decalajul depășește 5%",
      "Evaluare comună (Art. 10) dacă e cazul",
    ],
    price: "De la 150 RON/poziție",
    priceDetail: "Include BAZA + structura salarială + pay gap.",
    demoHref: "/demo",
    activateHref: "/sessions",
    color: "indigo",
    cumulative: ["BAZA", "+ Clase salariale", "+ Pay gap", "+ Conformitate EU"],
  },
  {
    number: 3,
    icon: "🎯",
    title: "Competitivitate",
    layerLabel: "LAYER 2",
    description: "Benchmark salarial vs piață. Știi unde te situezi și ce trebuie ajustat.",
    includes: [
      "Tot ce include BAZA + Conformitate +",
      "Comparație cu piața (P25, P50, P75) per poziție",
      "Compa-ratio per post — sub/peste mediană",
      "Surse: INS, studii salariale, portaluri recrutare",
      "Recomandări de ajustare pentru retenție",
      "Impact bugetar al ajustărilor",
    ],
    price: "De la 180 RON/poziție",
    priceDetail: "Include BAZA + Conformitate + benchmark piață.",
    demoHref: "/demo",
    activateHref: "/sessions",
    color: "violet",
    cumulative: ["BAZA", "L1 Conformitate", "+ Benchmark piață", "+ Impact bugetar"],
  },
  {
    number: 4,
    icon: "🌱",
    title: "Dezvoltare",
    layerLabel: "LAYER 3",
    description: "Dezvoltare organizațională completă — cultură, performanță, echipe.",
    includes: [
      "Tot ce include BAZA + Conformitate + Competitivitate +",
      "Evaluare personal și diagnoză organizațională",
      "Management echipe multigeneraționale",
      "Structuri mixte om-AI",
      "Procese interne și Manual calitate",
      "Cultură organizațională și performanță",
    ],
    price: "De la 200 RON/poziție",
    priceDetail: "Pachetul complet. Include toate straturile.",
    demoHref: "/demo",
    activateHref: "/sessions",
    color: "emerald",
    cumulative: ["BAZA", "L1 Conformitate", "L2 Competitivitate", "+ Dezvoltare completă"],
  },
]

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  slate: { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-700", badge: "bg-slate-100 text-slate-600" },
  indigo: { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700", badge: "bg-indigo-100 text-indigo-700" },
  violet: { bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-700", badge: "bg-violet-100 text-violet-700" },
  emerald: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", badge: "bg-emerald-100 text-emerald-700" },
}

// 1 credit = 8 RON (standard, fără discount)
const CREDIT_VALUE_RON = 8

// Credite per unitate per layer (estimare — de calibrat cu COG)
// BAZA: credite per poziție
// L1: + credite per angajat (pay gap, structură salarială)
// L2: + credite per poziție (benchmark)
// L3: + credite per angajat (dezvoltare)
// Confirmat Owner: BAZA = 60 credite/poziție
// L1-L3: de calibrat cu COG (estimări curente)
const CREDITS_PER_POSITION: Record<number, number> = { 1: 60, 2: 80, 3: 100, 4: 120 }
const CREDITS_PER_EMPLOYEE: Record<number, number> = { 1: 0, 2: 5, 3: 8, 4: 10 }

// Discount automat pe volum total credite
function getDiscountPct(totalCredits: number): { pct: number; label: string } {
  if (totalCredits >= 15000) return { pct: 31, label: "Enterprise -31%" }
  if (totalCredits >= 5000) return { pct: 25, label: "Professional -25%" }
  if (totalCredits >= 1500) return { pct: 19, label: "Business -19%" }
  if (totalCredits >= 500) return { pct: 12, label: "Start -12%" }
  if (totalCredits >= 250) return { pct: 6, label: "Mini -6%" }
  return { pct: 0, label: "Micro" }
}

export default function PackageExplorer() {
  const [selected, setSelected] = useState<number | null>(null)
  const [positions, setPositions] = useState<number>(10)
  const [employees, setEmployees] = useState<number>(30)

  const selectedPkg = selected !== null ? PACKAGES.find(p => p.number === selected) : null
  const colors = selectedPkg ? COLOR_MAP[selectedPkg.color] || COLOR_MAP.slate : null

  return (
    <div className="flex gap-6">
      {/* Carduri — stânga */}
      <div className="flex-1 grid grid-cols-2 gap-3">
        {PACKAGES.map(pkg => {
          const c = COLOR_MAP[pkg.color] || COLOR_MAP.slate
          const isSelected = selected === pkg.number

          return (
            <button
              key={pkg.number}
              onClick={() => setSelected(isSelected ? null : pkg.number)}
              className={`rounded-xl p-4 text-left transition-all border-[3px] ${
                isSelected
                  ? `${c.bg} ${c.border} shadow-lg`
                  : "bg-white border-slate-200 hover:shadow-md hover:border-slate-300"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${c.badge}`}>{pkg.number}</span>
                <span className="text-lg">{pkg.icon}</span>
              </div>
              <h3 className={`text-sm font-bold ${isSelected ? c.text : "text-slate-800"}`}>{pkg.title}</h3>
              <p className={`text-[10px] mt-1 font-medium ${isSelected ? c.text : "text-slate-400"}`}>{pkg.layerLabel}</p>
              <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{pkg.description}</p>
            </button>
          )
        })}
      </div>

      {/* Detalii — dreapta (ca simulatorul) */}
      {selectedPkg && colors && (
        <div className={`w-[380px] shrink-0 rounded-2xl border-[3px] ${colors.border} ${colors.bg} p-6`}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{selectedPkg.icon}</span>
              <div>
                <h3 className="text-lg font-bold text-slate-900">{selectedPkg.title}</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${colors.badge}`}>{selectedPkg.layerLabel}</span>
              </div>
            </div>
            <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 text-xs px-2 py-1 rounded hover:bg-white/50">Minimizează</button>
          </div>

          <p className="text-sm text-slate-600 mb-4">{selectedPkg.description}</p>

          {/* Ce include */}
          <div className="mb-4">
            <h4 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Ce include</h4>
            <ul className="space-y-1.5">
              {selectedPkg.includes.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                  <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Calculator preț */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 mb-4">
            <p className="text-xs text-slate-700 font-bold uppercase tracking-wide mb-3">Calculează prețul exact</p>

            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-500">Poziții distincte</label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={positions}
                  onChange={(e) => setPositions(Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
                  className="w-20 text-center text-sm font-bold border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-200"
                />
              </div>
              {selectedPkg.number >= 2 && (
                <div className="flex items-center justify-between">
                  <label className="text-xs text-slate-500">Nr. salariați</label>
                  <input
                    type="number"
                    min={1}
                    max={5000}
                    value={employees}
                    onChange={(e) => setEmployees(Math.max(1, Math.min(5000, Number(e.target.value) || 1)))}
                    className="w-20 text-center text-sm font-bold border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
              )}
            </div>

            {(() => {
              const credPerPos = CREDITS_PER_POSITION[selectedPkg.number]
              const credPerEmp = CREDITS_PER_EMPLOYEE[selectedPkg.number]
              const totalCredits = positions * credPerPos + (selectedPkg.number >= 2 ? employees * credPerEmp : 0)
              const discount = getDiscountPct(totalCredits)
              const priceRON = Math.round(totalCredits * CREDIT_VALUE_RON * (1 - discount.pct / 100))

              return (
                <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                  {/* Detaliere */}
                  <div className="text-[10px] text-slate-500 space-y-0.5">
                    <p>{positions} poziții × {credPerPos} credite = {positions * credPerPos} credite</p>
                    {selectedPkg.number >= 2 && (
                      <p>{employees} salariați × {credPerEmp} credite = {employees * credPerEmp} credite</p>
                    )}
                    <p className="font-medium text-slate-600">Total: {totalCredits} credite</p>
                    {discount.pct > 0 && (
                      <p className="text-emerald-600 font-medium">Discount volum: {discount.label}</p>
                    )}
                  </div>
                  {/* Preț final */}
                  <div className="text-center pt-2 border-t border-slate-200">
                    <p className="text-3xl font-bold text-slate-900">
                      {priceRON.toLocaleString("ro-RO")} RON
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">fără TVA · + abonament 399 RON/lună</p>
                  </div>
                </div>
              )
            })()}

            {/* Tabel pachete credite */}
            <div className="bg-white rounded-xl p-3 border border-slate-200">
              <p className="text-[9px] text-slate-400 uppercase tracking-wide mb-2">Pachete credite disponibile</p>
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-100">
                    <th className="text-left py-1">Pachet</th>
                    <th className="text-right py-1">Credite</th>
                    <th className="text-right py-1">RON</th>
                    <th className="text-right py-1">Per credit</th>
                    <th className="text-right py-1">Discount</th>
                  </tr>
                </thead>
                <tbody className="text-slate-600">
                  {[
                    { name: "Micro", credits: 100, price: 800, pc: "8.00", disc: "—" },
                    { name: "Mini", credits: 250, price: 1875, pc: "7.50", disc: "6%" },
                    { name: "Start", credits: 500, price: 3500, pc: "7.00", disc: "12%" },
                    { name: "Business", credits: 1500, price: 9750, pc: "6.50", disc: "19%" },
                    { name: "Professional", credits: 5000, price: 30000, pc: "6.00", disc: "25%" },
                    { name: "Enterprise", credits: 15000, price: 82500, pc: "5.50", disc: "31%" },
                  ].map(p => (
                    <tr key={p.name} className="border-t border-slate-50 hover:bg-slate-50">
                      <td className="py-1 font-medium">{p.name}</td>
                      <td className="py-1 text-right font-mono">{p.credits.toLocaleString()}</td>
                      <td className="py-1 text-right font-mono">{p.price.toLocaleString()}</td>
                      <td className="py-1 text-right font-mono">{p.pc}</td>
                      <td className="py-1 text-right text-emerald-600">{p.disc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Ce acumulezi */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 mb-4">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Ce acumulezi</p>
            <div className="space-y-1">
              {selectedPkg.cumulative.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${i < selectedPkg.number ? "bg-emerald-400" : "bg-slate-200"}`} />
                  <span className={`text-xs ${i < selectedPkg.number ? "text-slate-700 font-medium" : "text-slate-400"}`}>{c}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Acțiuni */}
          <div className="flex gap-2">
            <Link
              href={selectedPkg.activateHref}
              className={`flex-1 py-2.5 rounded-lg text-white text-sm font-medium text-center transition-colors ${
                selectedPkg.color === "slate" ? "bg-slate-700 hover:bg-slate-800" :
                selectedPkg.color === "indigo" ? "bg-indigo-600 hover:bg-indigo-700" :
                selectedPkg.color === "violet" ? "bg-violet-600 hover:bg-violet-700" :
                "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              Începe acum
            </Link>
            <Link
              href={selectedPkg.demoHref}
              className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium text-center hover:bg-white/50 transition-colors"
            >
              Vezi demo →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
