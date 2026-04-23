"use client"

/**
 * Icon component — servește SVG-uri din Illustrator.
 *
 * Workflow:
 *   1. Design în Illustrator
 *   2. Export SVG optimizat (File → Export → Export As → SVG → Presentation Attributes, inline style)
 *   3. Salvează în public/icons/{name}.svg
 *   4. Folosește: <Icon name="evaluation" size={24} className="text-indigo-600" />
 *
 * SVG-urile trebuie să aibă fill="currentColor" pentru a fi CSS-styleable.
 */

interface IconProps {
  name: string
  size?: number
  className?: string
  title?: string
}

export default function Icon({ name, size = 24, className = "", title }: IconProps) {
  return (
    <img
      src={`/icons/${name}.svg`}
      alt={title || name}
      width={size}
      height={size}
      className={className}
      role={title ? "img" : "presentation"}
      aria-label={title}
      loading="lazy"
    />
  )
}

/**
 * Inline SVG component — pentru icon-uri care trebuie CSS-styleable (fill: currentColor).
 * Folosește dangerouslySetInnerHTML cu SVG sanitizat.
 *
 * Preferă Icon (img) pentru performanță. Folosește InlineIcon doar când ai nevoie de culoare din CSS.
 */
export function InlineIcon({ svg, size = 24, className = "" }: { svg: string; size?: number; className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
