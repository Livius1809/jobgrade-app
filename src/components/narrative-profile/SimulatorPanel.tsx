"use client"

/**
 * SimulatorPanel — Secțiunea 9: What-if interactiv
 *
 * Slider per dimensiune. În lateral: condiții, orizont, determinare.
 * Compatibilitate globală recalculată live.
 */

import { useCallback, useState } from "react"
import type {
  SimulatorConfig,
  SimulatorDimension,
  SimulatorMilestone,
  NarrativeDocument,
} from "@/lib/cpu/profilers/narrative-profile"

interface SimulatorPanelProps {
  config: SimulatorConfig
  scope: NarrativeDocument["scope"]
}

export function SimulatorPanel({ config, scope }: SimulatorPanelProps) {
  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(config.dimensions.map((d) => [d.dimensionId, d.currentValue]))
  )

  const compatibility = config.calculateCompatibility(values)
  const baseCompatibility = config.overallCompatibility

  const handleSliderChange = useCallback((dimensionId: string, value: number) => {
    setValues((prev) => ({ ...prev, [dimensionId]: value }))
  }, [])

  const resetAll = useCallback(() => {
    setValues(Object.fromEntries(config.dimensions.map((d) => [d.dimensionId, d.currentValue])))
  }, [config.dimensions])

  return (
    <section className="mb-12 mt-16 pt-8 border-t-2 border-dashed">
      <h2 className="text-2xl font-semibold mb-1">Simulatorul</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Mută slider-ele și vezi cum se schimbă compatibilitatea cu scopul tău.
        În lateral apar condițiile reale pentru fiecare schimbare.
      </p>

      {/* ─── Compatibility meter ─── */}
      <div className="mb-8 p-4 rounded-lg bg-muted/30 border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Compatibilitate cu: {scope.description}</span>
          <button onClick={resetAll} className="text-xs text-muted-foreground hover:text-foreground">
            Resetează
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden relative">
            {/* Baseline */}
            <div
              className="absolute h-full bg-gray-300 rounded-full"
              style={{ width: `${baseCompatibility}%` }}
            />
            {/* Current simulated */}
            <div
              className={`absolute h-full rounded-full transition-all duration-300 ${
                compatibility > baseCompatibility ? "bg-emerald-500" : "bg-primary"
              }`}
              style={{ width: `${compatibility}%` }}
            />
          </div>
          <span className="text-lg font-bold font-mono w-16 text-right">
            {Math.round(compatibility)}%
          </span>
        </div>
        {compatibility > baseCompatibility && (
          <p className="text-xs text-emerald-600 mt-1">
            +{Math.round(compatibility - baseCompatibility)}% față de situația curentă
          </p>
        )}
      </div>

      {/* ─── Dimension sliders ─── */}
      <div className="space-y-6">
        {config.dimensions.map((dim) => (
          <DimensionSlider
            key={dim.dimensionId}
            dimension={dim}
            value={values[dim.dimensionId] ?? dim.currentValue}
            onChange={(v) => handleSliderChange(dim.dimensionId, v)}
          />
        ))}
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════
// DIMENSION SLIDER — slider + lateral conditions
// ═══════════════════════════════════════════════════════════════

interface DimensionSliderProps {
  dimension: SimulatorDimension
  value: number
  onChange: (value: number) => void
}

function DimensionSlider({ dimension, value, onChange }: DimensionSliderProps) {
  const hasChanged = value !== dimension.currentValue
  const activeMilestone = findActiveMilestone(dimension.milestones, value, dimension.currentValue)

  return (
    <div className="flex gap-4">
      {/* LEFT: Slider */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium">{dimension.label}</label>
          <span className="text-xs font-mono text-muted-foreground">
            {dimension.currentValue} → {hasChanged ? <strong>{value}</strong> : value}
          </span>
        </div>

        <input
          type="range"
          min={dimension.minRealistic}
          max={dimension.maxRealistic}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-primary"
        />

        <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5">
          <span>T={dimension.minRealistic}</span>
          <span className="text-primary font-medium">actual: T={dimension.currentValue}</span>
          <span>T={dimension.maxRealistic}</span>
        </div>
      </div>

      {/* RIGHT: Conditions (apare doar dacă s-a mutat slider-ul) */}
      <div className="w-64 min-h-[80px]">
        {hasChanged && activeMilestone ? (
          <MilestoneCard milestone={activeMilestone} />
        ) : (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground italic">
            Mută slider-ul →
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// MILESTONE CARD — condițiile din lateral
// ═══════════════════════════════════════════════════════════════

function MilestoneCard({ milestone }: { milestone: SimulatorMilestone }) {
  const determinationColors: Record<string, string> = {
    SCAZUTA: "text-emerald-600",
    MEDIE: "text-yellow-600",
    RIDICATA: "text-orange-600",
    FOARTE_RIDICATA: "text-red-600",
  }

  return (
    <div className="p-3 rounded-md border bg-card text-xs space-y-2 animate-in fade-in duration-200">
      {/* Conditions */}
      <div>
        <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
          Condiții
        </span>
        <ul className="mt-1 space-y-0.5">
          {milestone.conditions.map((c, i) => (
            <li key={i} className="flex items-start gap-1">
              <span className="text-muted-foreground">•</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Time + Determination */}
      <div className="flex items-center justify-between pt-1 border-t">
        <span className="text-muted-foreground">
          ⏱ {milestone.timeHorizon}
        </span>
        <span className={determinationColors[milestone.determination] || ""}>
          {milestone.determination.replace("_", " ")}
        </span>
      </div>

      {/* Effect */}
      <p className="text-muted-foreground italic">{milestone.effect}</p>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function findActiveMilestone(
  milestones: SimulatorMilestone[],
  currentSliderValue: number,
  baseValue: number
): SimulatorMilestone | null {
  if (currentSliderValue <= baseValue) return null

  // Find the milestone closest to (but not exceeding) the slider value
  const applicable = milestones
    .filter((m) => m.targetValue <= currentSliderValue)
    .sort((a, b) => b.targetValue - a.targetValue)

  return applicable[0] || null
}
