"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"

const B2B_SERVICES = [
  { name: "Evaluarea posturilor", active: true, href: "/b2b/je" },
  { name: "Structuri salariale echitabile", active: true, href: "/b2b/je" },
  { name: "Conformitate și transparență salarială", active: true, href: "/b2b/je" },
  { name: "Evaluarea personalului și armonizarea echipelor", active: false },
  { name: "Diagnoză organizațională", active: false },
  { name: "Managementul structurilor și echipelor mixte om-AI", active: false },
  { name: "Procese interne și Manualul calității", active: false },
  { name: "Cultură organizațională și performanță", active: false },
]

const B2C_SERVICES = [
  { name: "Profilul tău profesional", active: true },
  { name: "Drumul către mine", active: false },
  { name: "Eu și ceilalți", active: false },
  { name: "Oameni de succes / Oameni de valoare", active: false },
  { name: "Antreprenoriat transformațional", active: false },
  { name: "Spune-mi despre mine", active: false },
]

export function ServicesDropdown() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  function handleEnter() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setOpen(true)
  }

  function handleLeave() {
    timeoutRef.current = setTimeout(() => setOpen(false), 200)
  }

  // Close on click outside
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("click", onClick)
    return () => document.removeEventListener("click", onClick)
  }, [])

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <button
        className="text-sm font-medium text-text-warm hover:text-indigo transition-colors duration-200 flex items-center gap-1 cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        Servicii
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute top-full right-0 mt-3 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden"
          style={{ width: "520px" }}
        >
          <div className="grid grid-cols-2 gap-0">
            {/* B2B */}
            <div className="p-5 border-r border-gray-100">
              <p className="text-[10px] font-bold uppercase tracking-widest text-indigo mb-3">
                Pentru companii
              </p>
              <ul className="space-y-2">
                {B2B_SERVICES.map((s) => (
                  <li key={s.name}>
                    {s.active && s.href ? (
                      <Link
                        href={s.href}
                        className="flex items-center gap-2 text-[13px] text-text-warm hover:text-indigo transition-colors"
                        onClick={() => setOpen(false)}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo flex-shrink-0" />
                        {s.name}
                      </Link>
                    ) : (
                      <span className="flex items-center gap-2 text-[13px] text-text-warm/40">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
                        {s.name}
                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-indigo/5 text-indigo/40 ml-auto flex-shrink-0">
                          în curând
                        </span>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* B2C */}
            <div className="p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-coral mb-3">
                Pentru tine
              </p>
              <ul className="space-y-2">
                {B2C_SERVICES.map((s) => (
                  <li key={s.name}>
                    {s.active ? (
                      <span className="flex items-center gap-2 text-[13px] text-text-warm">
                        <span className="w-1.5 h-1.5 rounded-full bg-coral flex-shrink-0" />
                        {s.name}
                      </span>
                    ) : (
                      <span className="flex items-center gap-2 text-[13px] text-text-warm/40">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
                        {s.name}
                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-coral/5 text-coral/40 ml-auto flex-shrink-0">
                          în curând
                        </span>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
