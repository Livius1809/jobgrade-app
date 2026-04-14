"use client"

import { useEffect, useState } from "react"

import Link from "next/link"

/*
  Butoane flotante B2C (coral, stânga) — oglindă a CTA + Chat din dreapta.
  Active — "Profilul tău profesional" este disponibil.
*/

export function FloatingB2C() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    function onScroll() {
      const spiralZone = document.getElementById("poveste")
      const convergence = document.getElementById("convergence")
      if (!spiralZone || !convergence) return

      const spiralTop = spiralZone.getBoundingClientRect().top
      const convergenceTop = convergence.getBoundingClientRect().top

      const show = spiralTop < window.innerHeight * 0.7 && convergenceTop > window.innerHeight * 1.2
      setVisible(show)
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <div
      className={`fixed left-6 bottom-6 z-40 flex flex-col gap-3 transition-all duration-500 ${
        visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      {/* Chat B2C — activ */}
      <button
        className="flex items-center gap-2.5 px-4 py-3 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 cursor-pointer"
        style={{ backgroundColor: "var(--coral)", color: "white" }}
        title="Descoperă-te pe tine"
      >
        <svg
          width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <span className="text-sm font-medium">Descoperă-te pe tine</span>
      </button>

      {/* CTA B2C — activ */}
      <Link
        href="/personal"
        className="inline-flex items-center gap-2 font-semibold text-sm px-5 py-3 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
        style={{ backgroundColor: "var(--coral)", color: "white" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
        </svg>
        Află despre tine
      </Link>
    </div>
  )
}
