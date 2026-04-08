"use client"

import { useCallback, useEffect, useState } from "react"

/*
  CON 3D — versiunea finală cu generatoare netede și întrerupte.

  GENERATOARELE: curbe netede (taper lin de la lat la îngust).
  Se întrerup acolo unde e text — vizibile DOAR în benzile albe dintre secțiuni.
  Fiecare segment apare progresiv pe scroll.

  SEPARATOARELE: linii curbe bicolore (coral↔indigo) în benzile albe.
  Se activează odată cu segmentele de generatoare.

  IDEEA: conul se îngustează = evoluție, convergență, focalizare.
*/

const MAX_WIDTH = 94
const MIN_WIDTH = 16
const CURVE_FACTOR = 5

interface SectionRect {
  top: number
  bottom: number
}

interface Gap {
  from: number   // bottom-ul secțiunii de sus
  to: number     // top-ul secțiunii de jos
  midY: number   // mijlocul benzii albe
  index: number  // care bandă albă (0-based)
}

// Calculează X-ul generatoarei la o anumită înălțime Y
function coneX(y: number, totalH: number, side: "left" | "right"): number {
  const t = Math.max(0, Math.min(1, y / totalH))
  const width = MAX_WIDTH - (MAX_WIDTH - MIN_WIDTH) * t
  return side === "left" ? (100 - width) / 2 : (100 + width) / 2
}

// Curbura separatorului la o anumită înălțime
function curveAt(y: number, totalH: number): number {
  const t = y / totalH
  return CURVE_FACTOR * (1 - t * 0.7)
}

export function SpiralPath() {
  const [containerHeight, setContainerHeight] = useState(0)
  const [sections, setSections] = useState<SectionRect[]>([])
  const [gaps, setGaps] = useState<Gap[]>([])
  const [drawProgress, setDrawProgress] = useState(0)

  const measure = useCallback(() => {
    const container = document.getElementById("spiral-zone")
    if (!container) return

    const containerTop = container.getBoundingClientRect().top + window.scrollY
    const h = container.offsetHeight
    setContainerHeight(h)

    const elements = container.querySelectorAll<HTMLElement>("[data-cone-section]")
    if (elements.length === 0) return

    // Măsoară pozițiile reale ale secțiunilor
    const rects: SectionRect[] = []
    for (let i = 0; i < elements.length; i++) {
      const rect = elements[i].getBoundingClientRect()
      rects.push({
        top: rect.top + window.scrollY - containerTop,
        bottom: rect.bottom + window.scrollY - containerTop,
      })
    }
    setSections(rects)

    // Calculează benzile albe (gaps) dintre secțiuni
    const g: Gap[] = []

    // Gap înainte de prima secțiune (dacă există spațiu)
    if (rects[0].top > 5) {
      g.push({ from: 0, to: rects[0].top, midY: rects[0].top / 2, index: 0 })
    }

    // Gaps între secțiuni
    for (let i = 0; i < rects.length - 1; i++) {
      const from = rects[i].bottom
      const to = rects[i + 1].top
      if (to - from > 2) {
        g.push({ from, to, midY: (from + to) / 2, index: g.length })
      }
    }

    // Gap după ultima secțiune
    if (rects.length > 0) {
      const lastBottom = rects[rects.length - 1].bottom
      if (h - lastBottom > 5) {
        g.push({ from: lastBottom, to: h, midY: (lastBottom + h) / 2, index: g.length })
      }
    }

    setGaps(g)
  }, [])

  useEffect(() => {
    const timer = setTimeout(measure, 300)
    const ro = new ResizeObserver(() => setTimeout(measure, 150))
    const container = document.getElementById("spiral-zone")
    if (container) ro.observe(container)
    return () => { clearTimeout(timer); ro.disconnect() }
  }, [measure])

  useEffect(() => {
    function onScroll() {
      const el = document.getElementById("spiral-zone")
      if (!el) return
      const rect = el.getBoundingClientRect()
      const totalScroll = el.offsetHeight + window.innerHeight
      const scrolled = window.innerHeight - rect.top
      setDrawProgress(Math.max(0, Math.min(1, scrolled / totalScroll)))
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  if (containerHeight === 0 || gaps.length === 0) return null

  const drawnY = drawProgress * containerHeight
  const totalGaps = gaps.length

  return (
    <div
      className="absolute inset-0 pointer-events-none hidden md:block"
      aria-hidden="true"
    >
      <svg
        viewBox={`0 0 100 ${containerHeight}`}
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full"
        style={{ overflow: "visible" }}
      >
        <defs>
          <linearGradient id="cone-fill" x1="0" y1="0" x2="100" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="var(--coral)" stopOpacity="0.03" />
            <stop offset="40%" stopColor="var(--coral)" stopOpacity="0.01" />
            <stop offset="50%" stopColor="var(--background)" stopOpacity="0" />
            <stop offset="60%" stopColor="var(--indigo)" stopOpacity="0.01" />
            <stop offset="100%" stopColor="var(--indigo)" stopOpacity="0.03" />
          </linearGradient>

          <linearGradient id="sep-grad" x1="0" y1="0" x2="100" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="var(--coral)" stopOpacity="0.35" />
            <stop offset="45%" stopColor="var(--border)" stopOpacity="0.1" />
            <stop offset="55%" stopColor="var(--border)" stopOpacity="0.1" />
            <stop offset="100%" stopColor="var(--indigo)" stopOpacity="0.35" />
          </linearGradient>
        </defs>

        {/* ── Fill subtil per secțiune ────────────────────────── */}
        {sections.map((sec, i) => {
          const t1 = sec.top / containerHeight
          const t2 = sec.bottom / containerHeight
          const w1 = MAX_WIDTH - (MAX_WIDTH - MIN_WIDTH) * t1
          const w2 = MAX_WIDTH - (MAX_WIDTH - MIN_WIDTH) * t2
          const l1 = (100 - w1) / 2
          const l2 = (100 - w2) / 2
          const isActive = drawnY >= sec.top - 80

          return (
            <path
              key={`fill-${i}`}
              d={`M ${l1} ${sec.top} L ${l1 + w1} ${sec.top} L ${l2 + w2} ${sec.bottom} L ${l2} ${sec.bottom} Z`}
              fill="url(#cone-fill)"
              style={{ opacity: isActive ? 1 : 0, transition: "opacity 0.6s ease-out" }}
            />
          )
        })}

        {/* ── Generatoare + Separatoare — doar în benzile albe ── */}
        {gaps.map((gap) => {
          const isActive = drawnY >= gap.from - 60
          const curve = curveAt(gap.midY, containerHeight)

          // Coordonate generatoare în acest gap
          const lTop = coneX(gap.from, containerHeight, "left")
          const lBot = coneX(gap.to, containerHeight, "left")
          const rTop = coneX(gap.from, containerHeight, "right")
          const rBot = coneX(gap.to, containerHeight, "right")

          // Separator curbat la mijlocul benzii albe
          const sepLx = coneX(gap.midY, containerHeight, "left")
          const sepRx = coneX(gap.midY, containerHeight, "right")
          const sepPath = `M ${sepLx} ${gap.midY - curve} Q 50 ${gap.midY + curve * 0.4} ${sepRx} ${gap.midY - curve}`

          return (
            <g
              key={`gap-${gap.index}`}
              style={{ opacity: isActive ? 1 : 0, transition: "opacity 0.5s ease-out" }}
            >
              {/* Segment generator stânga — coral */}
              <line
                x1={lTop} y1={gap.from}
                x2={lBot} y2={gap.to}
                stroke="var(--coral)"
                strokeWidth="0.15"
                strokeOpacity="0.4"
                strokeLinecap="round"
              />
              {/* Glow stânga */}
              <line
                x1={lTop} y1={gap.from}
                x2={lBot} y2={gap.to}
                stroke="var(--coral)"
                strokeWidth="0.8"
                strokeOpacity="0.05"
                strokeLinecap="round"
                style={{ filter: "blur(3px)" }}
              />

              {/* Segment generator dreapta — indigo */}
              <line
                x1={rTop} y1={gap.from}
                x2={rBot} y2={gap.to}
                stroke="var(--indigo)"
                strokeWidth="0.15"
                strokeOpacity="0.4"
                strokeLinecap="round"
              />
              {/* Glow dreapta */}
              <line
                x1={rTop} y1={gap.from}
                x2={rBot} y2={gap.to}
                stroke="var(--indigo)"
                strokeWidth="0.8"
                strokeOpacity="0.05"
                strokeLinecap="round"
                style={{ filter: "blur(3px)" }}
              />

              {/* Separator curbat bicolor */}
              <path
                d={sepPath}
                fill="none"
                stroke="url(#sep-grad)"
                strokeWidth="0.15"
                strokeLinecap="round"
              />
            </g>
          )
        })}

        {/* ── Apex ───────────────────────────────────────────── */}
        {drawProgress > 0.88 && (() => {
          const apexY = containerHeight
          const opacity = Math.min(1, (drawProgress - 0.88) * 8) * 0.35
          return (
            <circle cx="50" cy={apexY} r="0.8" fill="var(--indigo-dark)" fillOpacity={opacity}>
              <animate attributeName="r" values="0.8;2;0.8" dur="3s" repeatCount="indefinite" />
            </circle>
          )
        })()}
      </svg>
    </div>
  )
}
