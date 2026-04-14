"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

/*
  Buton flotant "Intră în platformă" — vizibil pe parcursul scroll-ului.
  Apare după Hero, dispare la convergență (unde sunt butoanele finale).
  Permite clientului să intre în platformă oricând, fără să scrolleze înapoi.
*/

export function FloatingCTA() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    function onScroll() {
      const spiralZone = document.getElementById("poveste")
      const convergence = document.getElementById("convergence")
      if (!spiralZone || !convergence) return

      const spiralTop = spiralZone.getBoundingClientRect().top
      const convergenceTop = convergence.getBoundingClientRect().top

      // Vizibil: după ce intri în zona spiralei, până ajungi la convergență
      // Dispare mai devreme — nu coexistă cu butoanele din convergență
      const show = spiralTop < window.innerHeight * 0.7 && convergenceTop > window.innerHeight * 1.2
      setVisible(show)
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <div
      className={`fixed bottom-6 right-6 z-40 transition-all duration-500 ${
        visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      <Link
        href="/login"
        className="inline-flex items-center gap-2 bg-indigo text-white font-semibold text-sm px-5 py-3 rounded-full shadow-lg hover:bg-indigo-dark hover:shadow-xl transition-all duration-200"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
        </svg>
        Intră în platformă
      </Link>
    </div>
  )
}
