"use client"

import { useEffect, useRef, useState } from "react"

/*
  Apex-ul conului — se activează doar când privitorul ajunge la el.
  Cele două linii convergente se desenează progresiv,
  iar punctul de fuziune apare la final.
  Punctează țelul final al călătoriei.
*/

export function ApexVisual() {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [drawDone, setDrawDone] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          // Punctul apare după ce liniile s-au desenat
          setTimeout(() => setDrawDone(true), 800)
          observer.disconnect()
        }
      },
      { threshold: 0.5 },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Lungimea aproximativă a fiecărei curbe
  const pathLen = 80

  return (
    <div ref={ref} className="flex flex-col items-center pt-4 pb-2" aria-hidden="true">
      <svg width="160" height="50" viewBox="0 0 160 50" fill="none">
        {/* Linia coral — din stânga spre apex */}
        <path
          d="M 30 0 C 30 20, 80 35, 80 45"
          stroke="var(--coral)"
          strokeWidth="1"
          strokeOpacity="0.35"
          strokeLinecap="round"
          strokeDasharray={pathLen}
          strokeDashoffset={isVisible ? 0 : pathLen}
          style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
        />

        {/* Linia indigo — din dreapta spre apex */}
        <path
          d="M 130 0 C 130 20, 80 35, 80 45"
          stroke="var(--indigo)"
          strokeWidth="1"
          strokeOpacity="0.35"
          strokeLinecap="round"
          strokeDasharray={pathLen}
          strokeDashoffset={isVisible ? 0 : pathLen}
          style={{ transition: "stroke-dashoffset 0.8s ease-out 0.15s" }}
        />

        {/* Apex — apare după ce liniile s-au desenat */}
        <circle
          cx="80"
          cy="45"
          r={drawDone ? 2.5 : 0}
          fill="var(--indigo-dark)"
          fillOpacity="0.3"
          style={{ transition: "r 0.4s ease-out" }}
        >
          {drawDone && (
            <>
              <animate attributeName="r" values="2.5;4;2.5" dur="4s" repeatCount="indefinite" />
              <animate attributeName="fill-opacity" values="0.2;0.4;0.2" dur="4s" repeatCount="indefinite" />
            </>
          )}
        </circle>
      </svg>
    </div>
  )
}
