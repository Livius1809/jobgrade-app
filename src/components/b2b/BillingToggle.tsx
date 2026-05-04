"use client"

/**
 * BillingToggle — Selector lunar/anual + reînnoire automată/manuală
 *
 * Sincronizat cu pricing.ts (sursa de adevăr).
 */

import { useState } from "react"
import type { BillingPeriod, RenewalType } from "@/lib/pricing"
import { renewalExplanation } from "@/lib/pricing"

interface BillingToggleProps {
  children: (config: { period: BillingPeriod; renewal: RenewalType; isAnnual: boolean }) => React.ReactNode
  defaultPeriod?: BillingPeriod
  defaultRenewal?: RenewalType
  showRenewalToggle?: boolean
}

export function BillingToggle({
  children,
  defaultPeriod = "MONTHLY",
  defaultRenewal = "AUTO",
  showRenewalToggle = true,
}: BillingToggleProps) {
  const [period, setPeriod] = useState<BillingPeriod>(defaultPeriod)
  const [renewal, setRenewal] = useState<RenewalType>(defaultRenewal)

  const isAnnual = period === "ANNUAL"
  const explanation = renewalExplanation({ period, renewal, annualDiscount: 17 })

  return (
    <div>
      <div className="flex items-center justify-center gap-6 mb-6">
        {/* Lunar / Anual toggle */}
        <div className="flex items-center gap-3">
          <span className={`text-sm font-medium ${!isAnnual ? "text-slate-900" : "text-slate-400"}`}>
            Lunar
          </span>
          <button
            onClick={() => setPeriod(isAnnual ? "MONTHLY" : "ANNUAL")}
            className={`relative w-14 h-7 rounded-full transition-colors duration-200 cursor-pointer ${
              isAnnual ? "bg-indigo-600" : "bg-slate-300"
            }`}
            aria-label="Comută între lunar și anual"
          >
            <span
              className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-200 ${
                isAnnual ? "translate-x-7" : ""
              }`}
            />
          </button>
          <span className={`text-sm font-medium ${isAnnual ? "text-slate-900" : "text-slate-400"}`}>
            Anual
          </span>
          {isAnnual && (
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
              -17%
            </span>
          )}
        </div>

        {/* Auto / Manual renewal toggle */}
        {showRenewalToggle && (
          <div className="flex items-center gap-2 border-l border-slate-200 pl-6">
            <span className="text-xs text-slate-500">Reînnoire:</span>
            <div className="flex bg-slate-100 rounded-lg p-0.5">
              <button
                onClick={() => setRenewal("AUTO")}
                className={`px-3 py-1 text-[11px] rounded-md transition-colors ${
                  renewal === "AUTO"
                    ? "bg-white shadow-sm font-semibold text-slate-800"
                    : "text-slate-500"
                }`}
              >
                Automată
              </button>
              <button
                onClick={() => setRenewal("MANUAL")}
                className={`px-3 py-1 text-[11px] rounded-md transition-colors ${
                  renewal === "MANUAL"
                    ? "bg-white shadow-sm font-semibold text-slate-800"
                    : "text-slate-500"
                }`}
              >
                Manuală
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Explicație reînnoire */}
      <p className="text-[10px] text-slate-400 text-center mb-8 max-w-lg mx-auto">
        {explanation}
      </p>

      {children({ period, renewal, isAnnual })}
    </div>
  )
}
