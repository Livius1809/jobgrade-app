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

export default function PackageExplorer() {
  const [selected, setSelected] = useState<number | null>(null)

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
              className={`rounded-xl border-2 p-4 text-left transition-all ${
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
        <div className={`w-[380px] shrink-0 rounded-2xl border-2 ${colors.border} ${colors.bg} p-6`}>
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

          {/* Preț */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 mb-4">
            <p className="text-xs text-slate-400 uppercase tracking-wide">Preț orientativ</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{selectedPkg.price}</p>
            <p className="text-[10px] text-slate-400 mt-1">{selectedPkg.priceDetail}</p>
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
