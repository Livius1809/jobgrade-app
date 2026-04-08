"use client"

import { useEffect, useState } from "react"

export function PersistentLabels() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    function onScroll() {
      const spiralZone = document.getElementById("spiral-zone")
      const convergence = document.getElementById("convergence")
      if (!spiralZone || !convergence) return

      const spiralTop = spiralZone.getBoundingClientRect().top
      const convergenceTop = convergence.getBoundingClientRect().top
      const show = spiralTop < window.innerHeight * 0.5 && convergenceTop > 100
      setVisible(show)
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  if (!visible) return null

  return (
    <>
      {/* Left — B2C */}
      <div
        className="fixed left-4 top-1/2 -translate-y-1/2 z-40 hidden lg:block transition-opacity duration-500"
        style={{ opacity: visible ? 0.5 : 0 }}
      >
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.2em] text-coral"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          Pentru tine
        </p>
      </div>

      {/* Right — B2B */}
      <div
        className="fixed right-4 top-1/2 -translate-y-1/2 z-40 hidden lg:block transition-opacity duration-500"
        style={{ opacity: visible ? 0.5 : 0 }}
      >
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo"
          style={{ writingMode: "vertical-rl" }}
        >
          Pentru companii
        </p>
      </div>
    </>
  )
}
