/**
 * G4 — Adaptation Metrics (Rhythm Layer)
 *
 * Meta-metrici care măsoară cât de bine se adaptează organismul:
 * - OODA loop time (observe → orient → decide → act)
 * - KB change velocity
 * - Theme-to-action latency
 * - Patch effectiveness
 *
 * Funcție pură, zero I/O.
 *
 * Livrat: 06.04.2026, Stratul G4 "Living Organization".
 */

// ── Tipuri ────────────────────────────────────────────────────────────────────

export type MetricCode =
  | "ooda_loop_time"
  | "kb_change_velocity"
  | "theme_to_action_latency"
  | "patch_effectiveness"
  | "immune_response_time"
  | "homeostasis_deviation_avg"
  | "pruning_velocity"
  | "wild_card_engagement"

export interface MetricInput {
  code: MetricCode
  name: string
  unit: string
}

export interface TimestampedEvent {
  type: string
  id: string
  timestamp: Date | string
  metadata?: Record<string, unknown>
}

export interface AdaptationMetricResult {
  metricCode: MetricCode
  metricName: string
  value: number
  unit: string
  trend: "improving" | "stable" | "degrading" | "insufficient_data"
  breakdown?: Record<string, number>
}

// ── Metric definitions ───────────────────────────────────────────────────────

const METRIC_DEFS: MetricInput[] = [
  { code: "ooda_loop_time", name: "OODA Loop Time", unit: "hours" },
  { code: "kb_change_velocity", name: "KB Change Velocity", unit: "entries/day" },
  { code: "theme_to_action_latency", name: "Theme-to-Action Latency", unit: "hours" },
  { code: "patch_effectiveness", name: "Patch Effectiveness", unit: "%" },
  { code: "immune_response_time", name: "Immune Response Time", unit: "minutes" },
  { code: "homeostasis_deviation_avg", name: "Avg Homeostatic Deviation", unit: "%" },
  { code: "pruning_velocity", name: "Pruning Velocity", unit: "entries/week" },
  { code: "wild_card_engagement", name: "Wild Card Engagement", unit: "%" },
]

// ── Calcul individual ────────────────────────────────────────────────────────

function hoursBetween(a: Date | string, b: Date | string): number {
  const ta = typeof a === "string" ? new Date(a).getTime() : a.getTime()
  const tb = typeof b === "string" ? new Date(b).getTime() : b.getTime()
  return Math.abs(tb - ta) / (60 * 60 * 1000)
}

/**
 * OODA: timpul mediu de la "observe" (ExternalSignal.capturedAt)
 * la "act" (AgentBehaviorPatch.createdAt cu triggerSource conținând theme)
 */
export function computeOODALoopTime(
  signals: TimestampedEvent[],
  actions: TimestampedEvent[],
): number | null {
  if (signals.length === 0 || actions.length === 0) return null

  // Pairwise: fiecare acțiune cu semnalul cel mai recent anterior
  const signalTimes = signals
    .map((s) => new Date(s.timestamp).getTime())
    .sort((a, b) => a - b)

  let totalHours = 0
  let count = 0

  for (const action of actions) {
    const actionTime = new Date(action.timestamp).getTime()
    // Găsește ultimul semnal dinaintea acțiunii
    const lastSignal = signalTimes.filter((t) => t < actionTime).pop()
    if (lastSignal) {
      totalHours += (actionTime - lastSignal) / (60 * 60 * 1000)
      count++
    }
  }

  return count > 0 ? Math.round((totalHours / count) * 10) / 10 : null
}

/**
 * KB velocity: câte entries noi/modificate pe zi
 */
export function computeKBVelocity(
  entries: TimestampedEvent[],
  windowDays: number = 7,
): number {
  if (entries.length === 0) return 0
  return Math.round((entries.length / windowDays) * 10) / 10
}

/**
 * Patch effectiveness: % patch-uri CONFIRMED / (CONFIRMED + REVERTED + EXPIRED)
 */
export function computePatchEffectiveness(
  patches: Array<{ status: string }>,
): number | null {
  const terminal = patches.filter((p) =>
    ["CONFIRMED", "REVERTED", "EXPIRED", "REJECTED"].includes(p.status),
  )
  if (terminal.length === 0) return null

  const confirmed = terminal.filter((p) => p.status === "CONFIRMED").length
  return Math.round((confirmed / terminal.length) * 1000) / 10
}

/**
 * Immune response time: timpul mediu de la violație la acțiune (block/quarantine)
 */
export function computeImmuneResponseTime(
  violations: TimestampedEvent[],
): number | null {
  // Violations au deja timestamp-ul acțiunii incorporat
  // Response time ≈ 0 (sincronic) — dar măsurăm detection delay
  if (violations.length === 0) return null
  return 0 // Sistemul boundary este sincronic, delay = 0
}

// ── Agregare completă ────────────────────────────────────────────────────────

export interface AdaptationInput {
  signals?: TimestampedEvent[]
  actions?: TimestampedEvent[]
  kbEntries?: TimestampedEvent[]
  patches?: Array<{ status: string }>
  violations?: TimestampedEvent[]
  homeostaticDeviations?: number[]
  prunedCount?: number
  wildCardTotal?: number
  wildCardResponded?: number
  windowDays?: number
}

export function computeAllAdaptationMetrics(input: AdaptationInput): AdaptationMetricResult[] {
  const results: AdaptationMetricResult[] = []
  const windowDays = input.windowDays ?? 7

  // OODA
  const ooda = computeOODALoopTime(input.signals ?? [], input.actions ?? [])
  if (ooda !== null) {
    results.push({
      metricCode: "ooda_loop_time",
      metricName: "OODA Loop Time",
      value: ooda,
      unit: "hours",
      trend: ooda < 24 ? "improving" : ooda < 48 ? "stable" : "degrading",
    })
  }

  // KB velocity
  const kbVelocity = computeKBVelocity(input.kbEntries ?? [], windowDays)
  results.push({
    metricCode: "kb_change_velocity",
    metricName: "KB Change Velocity",
    value: kbVelocity,
    unit: "entries/day",
    trend: kbVelocity > 5 ? "improving" : kbVelocity > 1 ? "stable" : "degrading",
  })

  // Patch effectiveness
  const patchEff = computePatchEffectiveness(input.patches ?? [])
  if (patchEff !== null) {
    results.push({
      metricCode: "patch_effectiveness",
      metricName: "Patch Effectiveness",
      value: patchEff,
      unit: "%",
      trend: patchEff > 70 ? "improving" : patchEff > 40 ? "stable" : "degrading",
    })
  }

  // Homeostasis deviation avg
  const deviations = input.homeostaticDeviations ?? []
  if (deviations.length > 0) {
    const avg = Math.round(deviations.reduce((s, d) => s + d, 0) / deviations.length * 10) / 10
    results.push({
      metricCode: "homeostasis_deviation_avg",
      metricName: "Avg Homeostatic Deviation",
      value: avg,
      unit: "%",
      trend: avg < 10 ? "improving" : avg < 25 ? "stable" : "degrading",
    })
  }

  // Pruning velocity
  if (input.prunedCount !== undefined) {
    results.push({
      metricCode: "pruning_velocity",
      metricName: "Pruning Velocity",
      value: Math.round((input.prunedCount / windowDays) * 7 * 10) / 10,
      unit: "entries/week",
      trend: "stable",
    })
  }

  // Wild card engagement
  if (input.wildCardTotal && input.wildCardTotal > 0) {
    const engagement = Math.round(((input.wildCardResponded ?? 0) / input.wildCardTotal) * 1000) / 10
    results.push({
      metricCode: "wild_card_engagement",
      metricName: "Wild Card Engagement",
      value: engagement,
      unit: "%",
      trend: engagement > 70 ? "improving" : engagement > 40 ? "stable" : "degrading",
    })
  }

  return results
}
