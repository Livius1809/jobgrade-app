/**
 * C2 — Self-Regulation (Homeostasis Layer)
 *
 * Funcție pură care generează acțiuni ușoare de corecție pentru targets
 * homeostatice în deviere. Refolosește AgentBehaviorPatch (B1).
 *
 * Acțiuni: slow-down, redistribute, throttle. Reversibile, limitate.
 *
 * Livrat: 06.04.2026, Stratul C2 "Living Organization".
 */

import type { HomeostaticEvaluation } from "./homeostasis-monitor"

// ── Tipuri ────────────────────────────────────────────────────────────────────

export interface SelfRegulationAction {
  targetId: string
  targetCode: string
  targetName: string
  patchType: string
  patchSpec: Record<string, unknown>
  triggeredBy: string
  triggerSourceId: string
  rationale: string
  severity: "WARNING" | "CRITICAL"
  autoExpireHours: number
}

export interface SelfRegulationConfig {
  warningExpireHours: number    // default 12
  criticalExpireHours: number   // default 24
  maxActionsPerRun: number      // default 5
}

const DEFAULT_CONFIG: SelfRegulationConfig = {
  warningExpireHours: 12,
  criticalExpireHours: 24,
  maxActionsPerRun: 5,
}

// ── Reguli de corecție ───────────────────────────────────────────────────────

function generateCorrectionAction(
  eval_: HomeostaticEvaluation,
  config: SelfRegulationConfig,
): SelfRegulationAction | null {
  if (eval_.status !== "WARNING" && eval_.status !== "CRITICAL") return null
  if (!eval_.suggestedPatchType) return null

  const severity = eval_.status as "WARNING" | "CRITICAL"
  const expireHours = severity === "CRITICAL"
    ? config.criticalExpireHours
    : config.warningExpireHours

  // Construiește acțiune bazată pe tipul de target
  const patchSpec: Record<string, unknown> = eval_.suggestedPatchSpec
    ? { ...eval_.suggestedPatchSpec }
    : {}

  // Adaugă metadata de self-regulation
  patchSpec._selfRegulation = true
  patchSpec._severity = severity
  patchSpec._deviationPct = eval_.deviationPct
  patchSpec._reading = eval_.reading
  patchSpec._optimal = eval_.optimal

  return {
    targetId: eval_.targetId,
    targetCode: eval_.targetCode,
    targetName: eval_.targetName,
    patchType: eval_.suggestedPatchType,
    patchSpec,
    triggeredBy: "Homeostasis",
    triggerSourceId: eval_.targetId,
    rationale: eval_.description,
    severity,
    autoExpireHours: expireHours,
  }
}

// ── Export principal ──────────────────────────────────────────────────────────

export function generateSelfRegulationActions(
  evaluations: HomeostaticEvaluation[],
  config: Partial<SelfRegulationConfig> = {},
): SelfRegulationAction[] {
  const cfg = { ...DEFAULT_CONFIG, ...config }

  const actions: SelfRegulationAction[] = []

  // Prioritizează CRITICAL > WARNING
  const sorted = [...evaluations].sort((a, b) => {
    const order = { CRITICAL: 0, WARNING: 1, NORMAL: 2, OPTIMAL: 3, UNKNOWN: 4 }
    return (order[a.status] ?? 4) - (order[b.status] ?? 4)
  })

  for (const ev of sorted) {
    if (actions.length >= cfg.maxActionsPerRun) break
    const action = generateCorrectionAction(ev, cfg)
    if (action) actions.push(action)
  }

  return actions
}

export function summarizeSelfRegulation(actions: SelfRegulationAction[]): {
  total: number
  critical: number
  warning: number
  targetCodes: string[]
} {
  return {
    total: actions.length,
    critical: actions.filter((a) => a.severity === "CRITICAL").length,
    warning: actions.filter((a) => a.severity === "WARNING").length,
    targetCodes: actions.map((a) => a.targetCode),
  }
}
