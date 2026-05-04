"use client"

/**
 * SubjectRenderer — Ce vede subiectul evaluat
 *
 * Afișează explicația accesibilă a unei inferențe:
 * - Descriere scală (fără jargon)
 * - Poziția individului (vizual pe continuum)
 * - Ce înseamnă limitele (norma)
 * - Ce înseamnă pentru el personal
 */

import type { InferenceBlock } from "@/lib/cpu/profilers/narrative-profile"

interface SubjectRendererProps {
  inference: InferenceBlock
}

export function SubjectRenderer({ inference }: SubjectRendererProps) {
  const { subjectExplanation, sources } = inference

  return (
    <div className="mt-2 p-3 rounded-md bg-muted/50 border border-muted text-sm space-y-3">
      {/* Descrierea scalei */}
      <p className="text-muted-foreground">
        {subjectExplanation.scaleDescription}
      </p>

      {/* Vizualizare poziție pe scală */}
      <ScaleVisual sources={sources} />

      {/* Poziția exprimată verbal */}
      <p className="font-medium">{subjectExplanation.position}</p>

      {/* Norma explicată */}
      <p className="text-muted-foreground text-xs">
        {subjectExplanation.normExplanation}
      </p>

      {/* Ce înseamnă personal */}
      <p className="text-foreground">
        {subjectExplanation.personalMeaning}
      </p>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// SCALE VISUAL — bară cu poziție marcată
// ═══════════════════════════════════════════════════════════════

interface ScaleVisualProps {
  sources: InferenceBlock["sources"]
}

function ScaleVisual({ sources }: ScaleVisualProps) {
  // Afișăm maxim 2 scale principale (cele mai relevante)
  const displaySources = sources.slice(0, 2)

  return (
    <div className="space-y-2">
      {displaySources.map((source) => {
        // Calculăm poziția pe bara 0-100 (T-score: 20-80 mapped to 0-100%)
        const position = Math.max(0, Math.min(100, ((source.normalizedT - 20) / 60) * 100))
        // Zona mediană (45-55 T-score)
        const medianStart = ((45 - 20) / 60) * 100
        const medianEnd = ((55 - 20) / 60) * 100

        return (
          <div key={`${source.instrumentId}-${source.scaleName}`} className="space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{source.scaleName}</span>
              <span className="font-mono">{source.normalizedT}</span>
            </div>
            <div className="relative h-3 bg-gradient-to-r from-red-100 via-gray-100 to-emerald-100 rounded-full overflow-hidden">
              {/* Zona mediană */}
              <div
                className="absolute top-0 h-full bg-gray-200/60"
                style={{ left: `${medianStart}%`, width: `${medianEnd - medianStart}%` }}
              />
              {/* Marker poziție */}
              <div
                className="absolute top-0 h-full w-1 bg-primary rounded-full shadow-sm"
                style={{ left: `${position}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-muted-foreground">
              <span>Scăzut</span>
              <span>Mediu</span>
              <span>Ridicat</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
