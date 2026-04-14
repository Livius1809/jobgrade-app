"use client"

import Link from "next/link"

/*
  Buton flotant B2B "Portalul companiei tale" — mereu vizibil, dreapta jos.
*/

export function FloatingCTA() {
  return (
    <div className="fixed bottom-6 right-6 z-40">
      <Link
        href="/login"
        className="inline-flex items-center gap-2 bg-indigo text-white font-semibold text-sm px-5 py-3 rounded-full shadow-lg hover:bg-indigo-dark hover:shadow-xl transition-all duration-200"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
        </svg>
        Portalul companiei tale
      </Link>
    </div>
  )
}
