"use client"

import { useState, useMemo } from "react"
import Link from "next/link"

/* ── Formule de calcul credite per serviciu ──────────────────────── */

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
  const recruitProjects = Math.max(1, Math.ceil(positions * 0.2)) // ~20% din poziții
  const candidates = recruitProjects * 5
  return {
    items: [
      { label: "Plan dezvoltare resurse umane", credits: 40 + employees * 1, detail: `40 + ${employees} × 1 cr` },
      { label: `Proiectare recrutare (${recruitProjects} proiecte)`, credits: recruitProjects * 60, detail: `${recruitProjects} × 60 cr` },
      { label: `Gestionare candidați (${candidates} candidați)`, credits: candidates * 10, detail: `${candidates} × 10 cr` },
      { label: `Documente pre-angajare`, credits: candidates * 8, detail: `${candidates} × 8 cr` },
      { label: "Manual angajat", credits: 20 + Math.ceil(positions * 1.5), detail: `20 + ${positions} × 1,5 cr` },
    ],
  }
}

/* ── Discount per credit bazat pe volum total ────────────────────── */

function pricePerCredit(totalCredits: number): number {
  if (totalCredits >= 15_000) return 5.50
  if (totalCredits >= 5_000) return 6.00
  if (totalCredits >= 1_500) return 6.50
  if (totalCredits >= 500) return 7.00
  if (totalCredits >= 250) return 7.50
  return 8.00
}

function discountPercent(ppc: number): number {
  return Math.round((1 - ppc / 8) * 100)
}

/* ── Layere ──────────────────────────────────────────────────────── */

interface LayerDef {
  id: number
  name: string
  tagline: string
  icon: string
  color: string
}

const LAYERS: LayerDef[] = [
  { id: 0, name: "Baza — Ordine internă", tagline: "Cine face ce și cât ar trebui să câștige", icon: "🏗️", color: "slate" },
  { id: 1, name: "Conformitate EU 2023/970", tagline: "Dosarul complet pentru aliniere legislativă", icon: "⚖️", color: "indigo" },
  { id: 2, name: "Competitivitate", tagline: "Atragere și retenție a oamenilor performanți", icon: "🎯", color: "emerald" },
  { id: 3, name: "Dezvoltare completă", tagline: "Creștere organizațională sistematică", icon: "🌱", color: "amber" },
]

const colorMap: Record<string, { ring: string; bg: string; text: string; border: string }> = {
  slate:   { ring: "ring-slate-300",   bg: "bg-slate-600",   text: "text-slate-700",   border: "border-slate-200" },
  indigo:  { ring: "ring-indigo-300",  bg: "bg-indigo-600",  text: "text-indigo-700",  border: "border-indigo-200" },
  emerald: { ring: "ring-emerald-300", bg: "bg-emerald-600", text: "text-emerald-700", border: "border-emerald-200" },
  amber:   { ring: "ring-amber-300",   bg: "bg-amber-600",   text: "text-amber-700",   border: "border-amber-200" },
}

/* ── Dimensiune referință (visual) ──────────────────────────────── */

function sizeLabel(pos: number, emp: number): string {
  if (pos <= 10 && emp <= 30) return "S — Mică"
  if (pos <= 30 && emp <= 100) return "M — Medie"
  if (pos <= 60 && emp <= 300) return "L — Mare"
  return "XL — Corporație"
}

/* ── Props ───────────────────────────────────────────────────────── */

interface Props {
  positionCount: number
  employeeCount: number
  creditBalance: number
}

export default function PackageSelector({ positionCount, employeeCount, creditBalance }: Props) {
  const [positions, setPositions] = useState(positionCount || 10)
  const [employees, setEmployees] = useState(employeeCount || 30)
  const [expandedLayer, setExpandedLayer] = useState<number | null>(null)

  // Calculează credite per layer (cumulativ)
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

  return (
    <div className="space-y-6">
      {/* Calculator dinamic */}
      <div className="bg-slate-50 rounded-xl p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Dimensiunea companiei tale</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Poziții distincte</label>
            <input
              type="number"
              min={1}
              max={500}
              value={positions}
              onChange={e => setPositions(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Angajați total</label>
            <input
              type="number"
              min={1}
              max={5000}
              value={employees}
              onChange={e => setEmployees(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300"
            />
          </div>
        </div>
        <p className="mt-2 text-[10px] text-slate-400">
          Referință: {sizeLabel(positions, employees)} &middot; Prețurile se calculează exact pe datele tale
        </p>
      </div>

      {/* Layere concentrice */}
      <div className="space-y-3">
        {LAYERS.map((layer, idx) => {
          const c = colorMap[layer.color]
          const data = layerData[idx]
          const ppc = pricePerCredit(data.totalCredits)
          const totalRON = Math.round(data.totalCredits * ppc)
          const isExpanded = expandedLayer === idx
          const canAfford = creditBalance >= data.totalCredits
          const disc = discountPercent(ppc)

          return (
            <div
              key={layer.id}
              className={`relative rounded-2xl border-2 transition-all ${
                isExpanded ? `${c.ring} ring-2 ${c.border}` : "border-slate-200 hover:border-slate-300"
              } ${idx === 1 ? "ring-1 ring-indigo-200" : ""}`}
            >
              {idx === 1 && (
                <div className="absolute -top-2.5 left-6 px-2.5 py-0.5 bg-indigo-600 text-white text-[9px] font-bold uppercase tracking-wider rounded-full">
                  Cel mai solicitat
                </div>
              )}

              {/* Header — always visible */}
              <button
                onClick={() => setExpandedLayer(isExpanded ? null : idx)}
                className="w-full p-5 text-left"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{layer.icon}</span>
                      <h3 className="font-bold text-slate-900 text-sm">{layer.name}</h3>
                    </div>
                    <p className="text-xs text-slate-500">{layer.tagline}</p>
                    {idx > 0 && (
                      <p className="text-[10px] text-slate-400 mt-1 italic">
                        Include tot din {LAYERS[idx - 1].name.split(" —")[0]}, plus {data.items.length} servicii
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xl font-extrabold text-slate-900">
                      {totalRON.toLocaleString("ro-RO")} <span className="text-sm font-normal text-slate-400">RON</span>
                    </p>
                    <p className="text-[10px] text-slate-400">{data.totalCredits.toLocaleString("ro-RO")} credite</p>
                    {disc > 0 && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[9px] font-bold mt-0.5">
                        -{disc}% discount volum
                      </span>
                    )}
                  </div>
                </div>
              </button>

              {/* Detalii — expandate */}
              {isExpanded && (
                <div className={`px-5 pb-5 pt-0 border-t ${c.border} space-y-4`}>
                  {/* Servicii din layerele anterioare (cumulate) */}
                  {idx > 0 && (
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1.5">
                        Inclus din {LAYERS[idx - 1].name.split(" —")[0]}
                      </p>
                      {Array.from({ length: idx }).flatMap((_, prevIdx) =>
                        layerData[prevIdx].items.map((item, i) => (
                          <div key={`prev-${prevIdx}-${i}`} className="flex items-center justify-between text-xs text-slate-500 py-0.5">
                            <span className="flex items-center gap-1.5">
                              <span className="text-slate-300">✓</span> {item.label}
                            </span>
                            <span className="text-slate-400">{item.credits} cr</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Servicii specifice acestui layer */}
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1.5">
                      {idx === 0 ? "Servicii incluse" : "Adăugat în acest pachet"}
                    </p>
                    {data.items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-xs text-slate-700 py-1 border-b border-slate-50 last:border-0">
                        <span className="flex items-center gap-1.5">
                          <span className={c.text}>✓</span> {item.label}
                        </span>
                        <span className="text-slate-400 text-[10px]">{item.detail}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800 pt-2 mt-1 border-t border-slate-200">
                      <span>Total acest layer</span>
                      <span>{data.incrementCredits} credite = {(data.incrementCredits * ppc).toLocaleString("ro-RO")} RON</span>
                    </div>
                  </div>

                  {/* Sumar + CTA */}
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="grid grid-cols-3 gap-3 text-center mb-3">
                      <MiniStat label="Credite totale" value={data.totalCredits.toLocaleString("ro-RO")} />
                      <MiniStat label="Preț/credit" value={`${ppc.toFixed(2)} RON`} />
                      <MiniStat label="Preț total" value={`${totalRON.toLocaleString("ro-RO")} RON`} />
                    </div>
                  </div>

                  {canAfford ? (
                    <div className="flex items-center gap-3">
                      <button className={`flex-1 py-2.5 ${c.bg} text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity`}>
                        Activează pachetul
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
                      Cumpără {data.totalCredits.toLocaleString("ro-RO")} credite — {totalRON.toLocaleString("ro-RO")} RON
                    </Link>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Link demo */}
      <div className="text-center">
        <Link href="/demo" className="text-xs text-indigo-500 hover:text-indigo-700 hover:underline">
          Vedeți cum arată dosarul complet de conformitate EU →
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
