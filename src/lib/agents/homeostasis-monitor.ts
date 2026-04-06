/**
 * Homeostasis Monitor — evaluează reading-uri contra target-uri homeostatice
 * și produce stare + recomandare de corecție.
 *
 * Livrat: 06.04.2026, Increment C1 "Living Organization".
 *
 * Principii:
 *  - FUNCȚIE PURĂ — zero I/O
 *  - Devierea se calculează ca % față de optimalValue (sau centrul benzii)
 *  - Status: OPTIMAL, NORMAL, WARNING, CRITICAL (bazat pe warningPct/criticalPct)
 *  - Recomandare: ce patchType ar trebui propus pentru corecție (dacă autoCorrect=true)
 */

// ── Tipuri ────────────────────────────────────────────────────────────────────

export type HomeostaticStatus = "UNKNOWN" | "OPTIMAL" | "NORMAL" | "WARNING" | "CRITICAL"

export interface HomeostaticTargetInput {
  id: string
  code: string
  name: string
  metricName: string
  metricUnit?: string | null
  targetType: "SERVICE" | "ROLE" | "SYSTEM"
  targetEntityId?: string | null
  minValue: number | null
  maxValue: number | null
  optimalValue: number | null
  warningPct: number
  criticalPct: number
  lastReading: number | null
  lastReadingAt?: string | Date | null
  autoCorrect: boolean
}

export interface HomeostaticEvaluation {
  targetId: string
  targetCode: string
  targetName: string
  metricName: string
  metricUnit: string | null

  reading: number | null
  optimal: number | null
  deviationPct: number | null
  status: HomeostaticStatus
  previousStatus?: HomeostaticStatus

  /** Descriere umană */
  description: string

  /** Dacă autoCorrect=true și status >= WARNING, propune un patch */
  suggestedPatchType: string | null
  suggestedPatchSpec: Record<string, unknown> | null
}

// ── Evaluare ──────────────────────────────────────────────────────────────────

function computeOptimal(target: HomeostaticTargetInput): number | null {
  if (target.optimalValue !== null) return target.optimalValue
  if (target.minValue !== null && target.maxValue !== null) {
    return (target.minValue + target.maxValue) / 2
  }
  if (target.minValue !== null) return target.minValue
  if (target.maxValue !== null) return target.maxValue
  return null
}

function computeDeviationPct(
  reading: number,
  optimal: number,
): number {
  if (optimal === 0) return reading === 0 ? 0 : 100
  return Math.abs(((reading - optimal) / optimal) * 100)
}

function computeStatus(
  deviationPct: number,
  warningPct: number,
  criticalPct: number,
): HomeostaticStatus {
  if (deviationPct <= warningPct * 0.3) return "OPTIMAL"
  if (deviationPct <= warningPct) return "NORMAL"
  if (deviationPct <= criticalPct) return "WARNING"
  return "CRITICAL"
}

function isOutOfBand(
  reading: number,
  target: HomeostaticTargetInput,
): boolean {
  if (target.minValue !== null && reading < target.minValue) return true
  if (target.maxValue !== null && reading > target.maxValue) return true
  return false
}

function suggestCorrection(
  target: HomeostaticTargetInput,
  status: HomeostaticStatus,
): { patchType: string | null; patchSpec: Record<string, unknown> | null } {
  if (!target.autoCorrect) return { patchType: null, patchSpec: null }
  if (status !== "WARNING" && status !== "CRITICAL") {
    return { patchType: null, patchSpec: null }
  }

  if (target.targetType === "ROLE" && target.targetEntityId) {
    return {
      patchType: "ATTENTION_SHIFT",
      patchSpec: {
        targetRole: target.targetEntityId,
        reason: `${target.name}: deviere ${status} (reading=${target.lastReading}, optimal=${target.optimalValue ?? "N/A"})`,
        focusTags: [target.metricName],
      },
    }
  }

  if (target.targetType === "SERVICE" && target.targetEntityId) {
    return {
      patchType: "PRIORITY_SHIFT",
      patchSpec: {
        targetService: target.targetEntityId,
        to: status === "CRITICAL" ? "CRITICAL" : "HIGH",
        reason: `${target.name}: deviere ${status}`,
      },
    }
  }

  return {
    patchType: "ATTENTION_SHIFT",
    patchSpec: {
      reason: `${target.name}: deviere ${status} — necesită investigare`,
      metricName: target.metricName,
    },
  }
}

// ── Export principal ──────────────────────────────────────────────────────────

export function evaluateHomeostasis(
  targets: HomeostaticTargetInput[],
): HomeostaticEvaluation[] {
  return targets.map((t) => {
    if (t.lastReading === null) {
      return {
        targetId: t.id,
        targetCode: t.code,
        targetName: t.name,
        metricName: t.metricName,
        metricUnit: t.metricUnit ?? null,
        reading: null,
        optimal: computeOptimal(t),
        deviationPct: null,
        status: "UNKNOWN" as HomeostaticStatus,
        description: `${t.name}: fără reading — necunoscut`,
        suggestedPatchType: null,
        suggestedPatchSpec: null,
      }
    }

    const optimal = computeOptimal(t)
    const outOfBand = isOutOfBand(t.lastReading, t)

    let deviationPct: number
    let status: HomeostaticStatus

    if (optimal !== null) {
      deviationPct = computeDeviationPct(t.lastReading, optimal)
      status = computeStatus(deviationPct, t.warningPct, t.criticalPct)
      // Override: out-of-band e automat minim WARNING
      if (outOfBand && status === "NORMAL") status = "WARNING"
      if (outOfBand && status === "OPTIMAL") status = "WARNING"
    } else {
      deviationPct = 0
      status = outOfBand ? "WARNING" : "NORMAL"
    }

    const { patchType, patchSpec } = suggestCorrection(t, status)

    const unit = t.metricUnit ? ` ${t.metricUnit}` : ""
    const optStr = optimal !== null ? `${optimal}${unit}` : "N/A"
    const description =
      status === "OPTIMAL"
        ? `${t.name}: ${t.lastReading}${unit} — optimal (deviere ${deviationPct.toFixed(1)}%)`
        : status === "NORMAL"
          ? `${t.name}: ${t.lastReading}${unit} — normal (deviere ${deviationPct.toFixed(1)}% de la ${optStr})`
          : `${t.name}: ${t.lastReading}${unit} — ${status} (deviere ${deviationPct.toFixed(1)}% de la ${optStr})`

    return {
      targetId: t.id,
      targetCode: t.code,
      targetName: t.name,
      metricName: t.metricName,
      metricUnit: t.metricUnit ?? null,
      reading: t.lastReading,
      optimal,
      deviationPct: Math.round(deviationPct * 10) / 10,
      status,
      description,
      suggestedPatchType: patchType,
      suggestedPatchSpec: patchSpec,
    }
  })
}

export function summarizeHomeostasis(evals: HomeostaticEvaluation[]): {
  total: number
  optimal: number
  normal: number
  warning: number
  critical: number
  unknown: number
} {
  return {
    total: evals.length,
    optimal: evals.filter((e) => e.status === "OPTIMAL").length,
    normal: evals.filter((e) => e.status === "NORMAL").length,
    warning: evals.filter((e) => e.status === "WARNING").length,
    critical: evals.filter((e) => e.status === "CRITICAL").length,
    unknown: evals.filter((e) => e.status === "UNKNOWN").length,
  }
}
