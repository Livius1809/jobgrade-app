"use client"

import { useState, useMemo } from "react"

interface ServiceOption {
  code: string
  name: string
  type: string // REPORT | ASSISTANCE | PROCESS
  unitLabel: string
  hasVariants: boolean
  priceCredits: number | null // null = preț în calibrare
  priceRON: number | null
}

interface ServiceCalculatorProps {
  services: ServiceOption[]
  valuePerCreditRON: number | null
  variantPrices?: Record<string, number> // "serviceCode|VARIANT" → credite
}

interface SelectedService {
  code: string
  quantity: number
  variant: "AUTO" | "HYBRID_AI_MEDIATED" | "HYBRID_HUMAN_MEDIATED"
}

const VARIANT_LABELS: Record<string, string> = {
  AUTO: "Automată (AI)",
  HYBRID_AI_MEDIATED: "Comisie + mediere AI",
  HYBRID_HUMAN_MEDIATED: "Comisie + facilitator uman",
}

export default function ServiceCalculator({
  services,
  valuePerCreditRON,
  variantPrices = {},
}: ServiceCalculatorProps) {
  const [selected, setSelected] = useState<Map<string, SelectedService>>(new Map())

  function toggleService(code: string) {
    setSelected((prev) => {
      const next = new Map(prev)
      if (next.has(code)) {
        next.delete(code)
      } else {
        next.set(code, { code, quantity: 1, variant: "AUTO" })
      }
      return next
    })
  }

  function updateQuantity(code: string, qty: number) {
    setSelected((prev) => {
      const next = new Map(prev)
      const s = next.get(code)
      if (s) next.set(code, { ...s, quantity: Math.max(1, qty) })
      return next
    })
  }

  function updateVariant(code: string, variant: SelectedService["variant"]) {
    setSelected((prev) => {
      const next = new Map(prev)
      const s = next.get(code)
      if (s) next.set(code, { ...s, variant })
      return next
    })
  }

  const totals = useMemo(() => {
    let credits = 0
    let ron = 0
    let allPriced = true
    let count = 0

    for (const [code, sel] of selected) {
      const svc = services.find((s) => s.code === code)
      if (!svc) continue
      count++

      // Lookup preț per variantă selectată (dacă există)
      const variantKey = `${code}|${sel.variant}`
      const variantPrice = variantPrices[variantKey]
      const effectiveCredits = variantPrice ?? svc.priceCredits

      if (effectiveCredits !== null && effectiveCredits !== undefined) {
        credits += effectiveCredits * sel.quantity
        ron += effectiveCredits * (valuePerCreditRON ?? 0) * sel.quantity
      } else {
        allPriced = false
      }
    }

    return { credits, ron, allPriced, count }
  }, [selected, services, variantPrices, valuePerCreditRON])

  // Grupare pe tip
  const grouped = useMemo(() => {
    const groups: Record<string, ServiceOption[]> = {}
    for (const s of services) {
      const key = s.type === "REPORT" ? "Rapoarte" : s.type === "ASSISTANCE" ? "Asistență" : "Procese"
      if (!groups[key]) groups[key] = []
      groups[key].push(s)
    }
    return groups
  }, [services])

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-slate-900">
          Calculator de servicii
        </p>
        {totals.count > 0 && (
          <span className="text-[10px] text-slate-500">
            {totals.count} {totals.count === 1 ? "serviciu" : "servicii"} selectat{totals.count === 1 ? "" : "e"}
          </span>
        )}
      </div>

      <p className="text-[10px] text-slate-500 mb-4 leading-snug">
        Selectați serviciile dorite, ajustați cantitatea și varianta de
        execuție. Prețul total se calculează automat.
      </p>

      <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
        {Object.entries(grouped).map(([groupName, items]) => (
          <div key={groupName}>
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              {groupName}
            </p>
            <div className="space-y-1">
              {items.map((svc) => {
                const isSelected = selected.has(svc.code)
                const sel = selected.get(svc.code)
                return (
                  <div
                    key={svc.code}
                    className={`rounded-lg border px-3 py-2 transition-colors ${
                      isSelected
                        ? "border-indigo-300 bg-indigo-50/40"
                        : "border-slate-100 bg-white/60 hover:border-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <label className="flex items-center gap-2 cursor-pointer min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleService(svc.code)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span
                          className={`text-xs truncate ${
                            isSelected ? "text-slate-800 font-medium" : "text-slate-600"
                          }`}
                        >
                          {svc.name}
                        </span>
                      </label>
                      <span className="text-[10px] text-slate-400 flex-shrink-0">
                        {(() => {
                          const selVariant = selected.get(svc.code)?.variant
                          const vKey = selVariant ? `${svc.code}|${selVariant}` : null
                          const vPrice = vKey ? variantPrices[vKey] : undefined
                          const displayPrice = vPrice ?? svc.priceCredits
                          return displayPrice !== null && displayPrice !== undefined
                            ? `${displayPrice} cr/${svc.unitLabel}`
                            : "în calibrare"
                        })()}
                      </span>
                    </div>

                    {isSelected && sel && (
                      <div className="mt-2 ml-6 flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-500">Cantitate:</span>
                          <input
                            type="number"
                            min={1}
                            max={9999}
                            value={sel.quantity}
                            onChange={(e) =>
                              updateQuantity(svc.code, parseInt(e.target.value) || 1)
                            }
                            className="w-16 px-2 py-0.5 text-xs border border-slate-200 rounded bg-white text-center"
                          />
                          <span className="text-[10px] text-slate-400">
                            {svc.unitLabel}
                          </span>
                        </div>
                        {svc.hasVariants && (
                          <select
                            value={sel.variant}
                            onChange={(e) =>
                              updateVariant(
                                svc.code,
                                e.target.value as SelectedService["variant"]
                              )
                            }
                            className="text-[10px] px-2 py-0.5 border border-slate-200 rounded bg-white text-slate-700"
                          >
                            <option value="AUTO">{VARIANT_LABELS.AUTO}</option>
                            <option value="HYBRID_AI_MEDIATED">
                              {VARIANT_LABELS.HYBRID_AI_MEDIATED}
                            </option>
                            <option value="HYBRID_HUMAN_MEDIATED">
                              {VARIANT_LABELS.HYBRID_HUMAN_MEDIATED}
                            </option>
                          </select>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Total */}
      {totals.count > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-200">
          {totals.allPriced ? (
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] text-slate-500">Total estimat</p>
                <p className="text-lg font-bold text-indigo-700">
                  {totals.credits.toFixed(2)} credite
                </p>
                {valuePerCreditRON && (
                  <p className="text-xs text-slate-500">
                    ~{(totals.ron).toFixed(2)} RON (fără TVA)
                  </p>
                )}
              </div>
              <span className="text-[9px] text-slate-400 italic">
                preț orientativ
              </span>
            </div>
          ) : (
            <p className="text-xs text-amber-700 italic">
              Unele servicii selectate au prețul în calibrare.
              Totalul va fi afișat când toate prețurile sunt disponibile.
            </p>
          )}
        </div>
      )}

      {totals.count === 0 && (
        <div className="mt-4 pt-3 border-t border-slate-200">
          <p className="text-[10px] text-slate-400 italic text-center">
            Bifați serviciile dorite pentru a vedea estimarea de preț.
          </p>
        </div>
      )}
    </div>
  )
}
