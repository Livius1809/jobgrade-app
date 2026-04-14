"use client"

import Link from "next/link"

/*
  Butoane flotante B2C (coral, stânga) — mereu vizibile.
  Oglindă simetrică a butoanelor B2B din dreapta.
*/

export function FloatingB2C() {
  return (
    <div className="fixed left-6 bottom-6 z-40 flex flex-col gap-3">
      {/* Chat B2C */}
      <button
        className="flex items-center gap-2.5 px-4 py-3 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 cursor-pointer"
        style={{ backgroundColor: "var(--coral)", color: "white" }}
        title="Ce pot să aflu despre mine?"
      >
        <svg
          width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <span className="text-sm font-medium">Ce pot să aflu despre mine?</span>
      </button>

      {/* CTA B2C */}
      <Link
        href="/personal"
        className="inline-flex items-center gap-2 font-semibold text-sm px-5 py-3 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
        style={{ backgroundColor: "var(--coral)", color: "white" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
        </svg>
        Spațiul tău personal
      </Link>
    </div>
  )
}
