"use client"

import { useState } from "react"
import Link from "next/link"

/* ── Pachete concentrice (layer 0-3, dimensiuni S-XL) ───────────── */

interface LayerDef {
  id: number
  name: string
  tagline: string
  icon: string
  color: string
  services: string[]
  /** Servicii cumulative (include layerele inferioare) */
  cumulativeServices: string[]
}

const LAYERS: LayerDef[] = [
  {
    id: 0,
    name: "Baza — Ordine internă",
    tagline: "Cine face ce și cât ar trebui să câștige",
    icon: "🏗️",
    color: "slate",
    services: [
      "Evaluarea și ierarhizarea posturilor (JE AUTO)",
      "Fișe de post generate AI (toate pozițiile)",
      "Structură salarială — clase și trepte",
    ],
    cumulativeServices: [],
  },
  {
    id: 1,
    name: "Conformitate EU 2023/970",
    tagline: "Dosarul complet pentru aliniere legislativă",
    icon: "⚖️",
    color: "indigo",
    services: [
      "Analiză pay gap pe categorii (Art. 9)",
      "Justificări documentate decalaje semnificative",
      "Benchmark salarial vs piață",
    ],
    cumulativeServices: [
      "Evaluarea și ierarhizarea posturilor",
      "Fișe de post AI",
      "Structură salarială",
    ],
  },
  {
    id: 2,
    name: "Competitivitate",
    tagline: "Atragere și retenție a oamenilor performanți",
    icon: "🎯",
    color: "emerald",
    services: [
      "Pachete salariale (compensații + beneficii)",
      "Evaluarea performanței (per angajat)",
      "Raport impact bugetar",
    ],
    cumulativeServices: [
      "Tot din Conformitate EU +",
      "JE + fișe post + structură + pay gap + benchmark",
    ],
  },
  {
    id: 3,
    name: "Dezvoltare completă",
    tagline: "Creștere organizațională sistematică",
    icon: "🌱",
    color: "amber",
    services: [
      "Plan dezvoltare resurse umane",
      "Proiectare și gestionare recrutare",
      "Documente pre-angajare + manual angajat",
    ],
    cumulativeServices: [
      "Tot din Competitivitate +",
      "JE + pay gap + benchmark + pachete + performanță + impact",
    ],
  },
]

type Dimension = "S" | "M" | "L" | "XL"

interface DimensionDef {
  id: Dimension
  label: string
  positions: string
  employees: string
}

const DIMENSIONS: DimensionDef[] = [
  { id: "S", label: "Mică", positions: "1-10", employees: "până la 30" },
  { id: "M", label: "Medie", positions: "11-30", employees: "până la 100" },
  { id: "L", label: "Mare", positions: "31-60", employees: "până la 300" },
  { id: "XL", label: "Corporație", positions: "61-150", employees: "până la 1.000" },
]

// Credite per layer per dimensiune
const CREDITS: Record<Dimension, number[]> = {
  S:  [770, 845, 1_370, 1_817],
  M:  [2_280, 2_420, 4_015, 4_670],
  L:  [4_640, 4_925, 9_590, 10_940],
  XL: [11_820, 12_590, 27_925, 31_010],
}

// Prețuri RON per layer per dimensiune (cu discount progresiv)
const PRICES: Record<Dimension, number[]> = {
  S:  [5_390, 5_915, 9_590, 12_719],
  M:  [14_820, 15_730, 26_098, 30_355],
  L:  [27_840, 29_550, 57_540, 65_640],
  XL: [65_010, 69_245, 153_588, 170_555],
}

// Echivalent consultanță tradițională (range)
const TRADITIONAL: Record<Dimension, string> = {
  S: "17.000 — 44.000 RON",
  M: "49.500 — 126.000 RON",
  L: "164.000 — 386.000 RON",
  XL: "401.000 — 997.000 RON",
}

const colorMap: Record<string, { ring: string; bg: string; text: string; light: string; border: string; badge: string }> = {
  slate:   { ring: "ring-slate-300",   bg: "bg-slate-600",   text: "text-slate-700",   light: "bg-slate-50",   border: "border-slate-200",   badge: "bg-slate-100 text-slate-800" },
  indigo:  { ring: "ring-indigo-300",  bg: "bg-indigo-600",  text: "text-indigo-700",  light: "bg-indigo-50",  border: "border-indigo-200",  badge: "bg-indigo-100 text-indigo-800" },
  emerald: { ring: "ring-emerald-300", bg: "bg-emerald-600", text: "text-emerald-700", light: "bg-emerald-50", border: "border-emerald-200", badge: "bg-emerald-100 text-emerald-800" },
  amber:   { ring: "ring-amber-300",   bg: "bg-amber-600",   text: "text-amber-700",   light: "bg-amber-50",   border: "border-amber-200",   badge: "bg-amber-100 text-amber-800" },
}

interface Props {
  positionCount: number
  employeeCount: number
  creditBalance: number
}

export default function PackageSelector({ positionCount, employeeCount, creditBalance }: Props) {
  // Auto-detect dimensiune din datele clientului
  const autoDetect = (): Dimension => {
    if (positionCount <= 10 && employeeCount <= 30) return "S"
    if (positionCount <= 30 && employeeCount <= 100) return "M"
    if (positionCount <= 60 && employeeCount <= 300) return "L"
    return "XL"
  }

  const [dimension, setDimension] = useState<Dimension>(
    positionCount > 0 || employeeCount > 0 ? autoDetect() : "S"
  )
  const [selectedLayer, setSelectedLayer] = useState<number | null>(null)

  const prices = PRICES[dimension]
  const credits = CREDITS[dimension]
  const dimDef = DIMENSIONS.find(d => d.id === dimension)!

  return (
    <div className="space-y-6">
      {/* Selector dimensiune */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Dimensiune companie:</span>
        <div className="flex gap-2">
          {DIMENSIONS.map(d => (
            <button
              key={d.id}
              onClick={() => setDimension(d.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                dimension === d.id
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-600 hover:border-indigo-300"
              }`}
            >
              {d.id} — {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Info dimensiune detectată */}
      {(positionCount > 0 || employeeCount > 0) && (
        <div className="flex items-center gap-2 text-xs text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg">
          <span className="font-medium">Detectat automat:</span>
          {positionCount} poziții, {employeeCount} angajați → Varianta {dimension}
        </div>
      )}

      {/* Layere concentrice */}
      <div className="space-y-3">
        {LAYERS.map((layer, idx) => {
          const c = colorMap[layer.color]
          const price = prices[idx]
          const cr = credits[idx]
          const isSelected = selectedLayer === idx
          const incrementCredits = idx > 0 ? cr - credits[idx - 1] : cr
          const incrementPrice = idx > 0 ? price - prices[idx - 1] : price
          const canAfford = creditBalance >= cr

          return (
            <div
              key={layer.id}
              onClick={() => setSelectedLayer(isSelected ? null : idx)}
              className={`relative rounded-2xl border-2 transition-all cursor-pointer ${
                isSelected ? `${c.ring} ring-2 ${c.border}` : `border-slate-200 hover:${c.border}`
              } ${idx === 1 ? "ring-1 ring-indigo-200" : ""}`}
            >
              {/* Badge "recomandat" pe Layer 1 */}
              {idx === 1 && (
                <div className="absolute -top-2.5 left-6 px-2.5 py-0.5 bg-indigo-600 text-white text-[9px] font-bold uppercase tracking-wider rounded-full">
                  Cel mai solicitat
                </div>
              )}

              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  {/* Info layer */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{layer.icon}</span>
                      <h3 className="font-bold text-slate-900 text-sm">{layer.name}</h3>
                    </div>
                    <p className="text-xs text-slate-500 mb-3">{layer.tagline}</p>

                    {/* Servicii incluse */}
                    <div className="space-y-1">
                      {idx > 0 && (
                        <p className="text-[10px] text-slate-400 italic mb-1">
                          Include tot din {LAYERS[idx - 1].name.split(" —")[0]}, plus:
                        </p>
                      )}
                      {layer.services.map((s, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-xs text-slate-700">
                          <span className={`mt-0.5 ${c.text}`}>✓</span>
                          {s}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Preț */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-xl font-extrabold text-slate-900">
                      {price.toLocaleString("ro-RO")} <span className="text-sm font-normal text-slate-400">RON</span>
                    </p>
                    <p className="text-[10px] text-slate-400">{cr.toLocaleString("ro-RO")} credite</p>
                    {idx > 0 && (
                      <p className="text-[10px] text-emerald-600 mt-1">
                        +{incrementPrice.toLocaleString("ro-RO")} RON față de {LAYERS[idx - 1].name.split(" —")[0]}
                      </p>
                    )}
                  </div>
                </div>

                {/* Detalii expandate */}
                {isSelected && (
                  <div className={`mt-4 pt-4 border-t ${c.border} space-y-3`}>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                      <MiniStat label="Credite totale" value={`${cr.toLocaleString("ro-RO")}`} />
                      <MiniStat label="Poziții acoperite" value={dimDef.positions} />
                      <MiniStat label="Angajați" value={dimDef.employees} />
                      <MiniStat label="Preț/credit" value={`${(price / cr).toFixed(1)} RON`} />
                    </div>

                    <div className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-2.5">
                      <div>
                        <p className="text-[10px] text-slate-400">Consultanță tradițională echivalentă</p>
                        <p className="text-xs text-slate-500 line-through">{TRADITIONAL[dimension]}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-emerald-600 font-medium">
                          Economie {Math.round((1 - price / (parseInt(TRADITIONAL[dimension].split(" — ")[0].replace(/\./g, "")) || price)) * 100)}%+
                        </p>
                      </div>
                    </div>

                    {canAfford ? (
                      <div className="flex items-center gap-3">
                        <button className={`flex-1 py-2.5 ${c.bg} text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity`}>
                          Activează pachetul
                        </button>
                        <p className="text-[10px] text-emerald-600">
                          Sold: {creditBalance.toLocaleString("ro-RO")} credite — suficient
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <Link
                          href="/settings/billing"
                          className={`flex-1 py-2.5 ${c.bg} text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity text-center`}
                        >
                          Cumpără {cr.toLocaleString("ro-RO")} credite — {price.toLocaleString("ro-RO")} RON
                        </Link>
                        <p className="text-[10px] text-amber-600">
                          Sold curent: {creditBalance.toLocaleString("ro-RO")} credite
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
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
