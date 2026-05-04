"use client"

/**
 * OrgSimulatorPanel — Simulator organizațional interactiv
 *
 * Ca SimulatorPanel individual dar la nivel ORG:
 * - Slider-e pe INTERVENȚII (nu pe trăsături personale)
 * - Investiție RON (nu T-score)
 * - Impact pe dimensiuni org (climat, cultură, 3C)
 * - ROI estimat + timeline
 * - Condiții + orizont în lateral
 */

import { useCallback, useState } from "react"
import type {
  OrgSimulatorConfig,
  OrgSimulatorIntervention,
  OrgSimulatorMilestone,
  OrgSimulatorResult,
} from "@/lib/cpu/profilers/organizational-narrative"

interface OrgSimulatorPanelProps {
  config: OrgSimulatorConfig
  organizationName: string
}

export function OrgSimulatorPanel({ config, organizationName }: OrgSimulatorPanelProps) {
  const [investments, setInvestments] = useState<Record<string, number>>(() =>
    Object.fromEntries(config.interventions.map((i) => [i.id, i.currentInvestment]))
  )

  const result = config.calculateImpact(investments)
  const totalInvestment = Object.values(investments).reduce((sum, v) => sum + v, 0)
  const baseInvestment = config.interventions.reduce((sum, i) => sum + i.currentInvestment, 0)
  const additionalInvestment = totalInvestment - baseInvestment

  const handleChange = useCallback((id: string, value: number) => {
    setInvestments((prev) => ({ ...prev, [id]: value }))
  }, [])

  const resetAll = useCallback(() => {
    setInvestments(Object.fromEntries(config.interventions.map((i) => [i.id, i.currentInvestment])))
  }, [config.interventions])

  // Group interventions by category
  const categories = groupByCategory(config.interventions)

  return (
    <section className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold mb-1">Simulator organizațional</h2>
        <p className="text-sm text-muted-foreground">
          Mută slider-ele pentru a simula impactul investițiilor în {organizationName}.
        </p>
      </div>

      {/* ─── Impact overview ─── */}
      <div className="grid grid-cols-4 gap-3">
        <MetricCard
          label="Sănătate org"
          value={result.healthScore}
          max={10}
          baseline={config.currentHealth}
          unit="/10"
        />
        <MetricCard
          label="Gap 3C"
          value={result.gap3C}
          max={100}
          baseline={config.current3CGap}
          unit="%"
          inverse
        />
        <MetricCard
          label="Investiție adițională"
          value={additionalInvestment}
          max={undefined}
          baseline={0}
          unit=" RON"
          format="currency"
        />
        <MetricCard
          label="ROI estimat"
          value={result.estimatedROI}
          max={undefined}
          baseline={100}
          unit="%"
        />
      </div>

      {/* ─── Timeline ─── */}
      {additionalInvestment > 0 && (
        <div className="p-3 rounded-md bg-muted/30 border text-sm">
          Timp estimat până la impact: <strong>{result.timeToImpact}</strong>
          <button onClick={resetAll} className="ml-4 text-xs text-muted-foreground hover:text-foreground">
            Resetează
          </button>
        </div>
      )}

      {/* ─── Intervention sliders per category ─── */}
      {Object.entries(categories).map(([category, interventions]) => (
        <div key={category} className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground border-b pb-1">
            {categoryLabels[category] || category}
          </h3>
          {interventions.map((intervention) => (
            <InterventionSlider
              key={intervention.id}
              intervention={intervention}
              value={investments[intervention.id] ?? intervention.currentInvestment}
              onChange={(v) => handleChange(intervention.id, v)}
            />
          ))}
        </div>
      ))}

      {/* ─── Dimension changes ─── */}
      {result.dimensionChanges.length > 0 && additionalInvestment > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">Impact pe dimensiuni</h3>
          <div className="space-y-2">
            {result.dimensionChanges
              .filter((d) => d.change !== 0)
              .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
              .map((dim) => (
                <div key={dim.dimension} className="flex items-center gap-3 text-xs">
                  <span className="w-40 truncate">{dim.dimension}</span>
                  <span className="font-mono text-muted-foreground w-12">{dim.from.toFixed(1)}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className={`font-mono font-medium w-12 ${
                    dim.change > 0 ? "text-emerald-600" : "text-red-600"
                  }`}>
                    {dim.to.toFixed(1)}
                  </span>
                  <span className={`text-[10px] ${
                    dim.change > 0 ? "text-emerald-500" : "text-red-500"
                  }`}>
                    ({dim.change > 0 ? "+" : ""}{dim.change.toFixed(2)})
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════
// INTERVENTION SLIDER
// ═══════════════════════════════════════════════════════════════

function InterventionSlider({
  intervention,
  value,
  onChange,
}: {
  intervention: OrgSimulatorIntervention
  value: number
  onChange: (v: number) => void
}) {
  const hasChanged = value !== intervention.currentInvestment
  const activeMilestone = findActiveMilestone(intervention.milestones, value)

  return (
    <div className="flex gap-4">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm">{intervention.label}</label>
          <span className="text-xs font-mono text-muted-foreground">
            {value.toLocaleString("ro-RO")} RON
            {hasChanged && (
              <span className="text-emerald-600 ml-1">
                (+{(value - intervention.currentInvestment).toLocaleString("ro-RO")})
              </span>
            )}
          </span>
        </div>
        <input
          type="range"
          min={intervention.investmentMin}
          max={intervention.investmentMax}
          step={Math.round((intervention.investmentMax - intervention.investmentMin) / 20)}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-primary"
        />
        <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5">
          <span>{intervention.investmentMin.toLocaleString("ro-RO")} RON</span>
          <span>{intervention.investmentMax.toLocaleString("ro-RO")} RON</span>
        </div>
      </div>

      {/* Milestone card */}
      <div className="w-64 min-h-[80px]">
        {hasChanged && activeMilestone ? (
          <OrgMilestoneCard milestone={activeMilestone} />
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
// MILESTONE CARD
// ═══════════════════════════════════════════════════════════════

function OrgMilestoneCard({ milestone }: { milestone: OrgSimulatorMilestone }) {
  return (
    <div className="p-3 rounded-md border bg-card text-xs space-y-2 animate-in fade-in duration-200">
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
      <div className="flex items-center justify-between pt-1 border-t">
        <span className="text-muted-foreground">⏱ {milestone.timeHorizon}</span>
        <span className="text-emerald-600 font-medium">{milestone.roi}</span>
      </div>
      <p className="text-muted-foreground italic">{milestone.expectedOutcome}</p>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// METRIC CARD
// ═══════════════════════════════════════════════════════════════

function MetricCard({
  label,
  value,
  max,
  baseline,
  unit,
  inverse = false,
  format,
}: {
  label: string
  value: number
  max?: number
  baseline: number
  unit: string
  inverse?: boolean
  format?: "currency"
}) {
  const improved = inverse ? value < baseline : value > baseline
  const displayValue = format === "currency"
    ? value.toLocaleString("ro-RO")
    : value.toFixed(1)

  return (
    <div className="p-3 rounded-md border bg-card">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="mt-1 flex items-baseline gap-1">
        <span className={`text-lg font-bold ${
          improved ? "text-emerald-600" : value === baseline ? "" : "text-red-600"
        }`}>
          {displayValue}
        </span>
        <span className="text-xs text-muted-foreground">{unit}</span>
      </div>
      {value !== baseline && (
        <span className={`text-[10px] ${improved ? "text-emerald-500" : "text-red-500"}`}>
          {improved ? "↑" : "↓"} vs. actual ({baseline}{unit})
        </span>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

const categoryLabels: Record<string, string> = {
  PEOPLE: "Investiții în oameni",
  PROCESS: "Optimizare procese",
  CULTURE: "Cultură organizațională",
  STRUCTURE: "Restructurare",
  COMPENSATION: "Compensații & beneficii",
}

function groupByCategory(interventions: OrgSimulatorIntervention[]) {
  const groups: Record<string, OrgSimulatorIntervention[]> = {}
  for (const i of interventions) {
    if (!groups[i.category]) groups[i.category] = []
    groups[i.category].push(i)
  }
  return groups
}

function findActiveMilestone(
  milestones: OrgSimulatorMilestone[],
  currentValue: number
): OrgSimulatorMilestone | null {
  const applicable = milestones
    .filter((m) => m.investmentLevel <= currentValue)
    .sort((a, b) => b.investmentLevel - a.investmentLevel)
  return applicable[0] || null
}
