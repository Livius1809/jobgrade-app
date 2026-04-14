"use client"

import { useState } from "react"

interface BillingToggleProps {
  children: (isAnnual: boolean) => React.ReactNode
}

export function BillingToggle({ children }: BillingToggleProps) {
  const [isAnnual, setIsAnnual] = useState(false)

  return (
    <div>
      {/* Toggle */}
      <div className="flex items-center justify-center gap-4 mb-16">
        <span className={`text-sm font-medium ${!isAnnual ? "text-slate-900" : "text-slate-400"}`}>
          Lunar
        </span>
        <button
          onClick={() => setIsAnnual(!isAnnual)}
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
            Economisești 20%
          </span>
        )}
      </div>

      {children(isAnnual)}
    </div>
  )
}
