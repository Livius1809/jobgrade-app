/**
 * adaptive-parameters.ts — Parametri care evoluează prin feedback loops
 *
 * PRINCIPIU: Niciun parametru critic nu e fix. Fiecare se calibrează
 * pe baza efectului pe care îl produce. Exact ca la compromisul
 * intern/extern — observi efectul, ajustezi, observi din nou.
 *
 * Stocat: SystemConfig key "ADAPTIVE_PARAMS"
 * Update: la fiecare ciclu cron (30 min) — funcția calibrateAll()
 *
 * Mecanismul:
 *   1. Măsoară efectul parametrului curent (din telemetry/task outcomes)
 *   2. Compară cu efectul anterior (trend)
 *   3. Ajustează parametrul în direcția care a produs efect mai bun
 *   4. Salvează + loghează ajustarea
 *
 * Parametri adaptivi:
 *   A. Escalation timeouts (2h→?h per priority)
 *   B. Learning effectiveness thresholds (0.3→? per nivel)
 *   C. Proactive cycle intervals (1/4/12/24h → ?)
 *   D. Batch sizes (take: N → ?)
 *   E. Idea evaluation weights (brainstorm scoring)
 *   F. KB confidence initial values
 */

import { prisma } from "@/lib/prisma"

// ── Tipuri ───────────────────────────────────────────────────

export interface AdaptiveParam {
  current: number
  min: number
  max: number
  lastAdjusted: string
  adjustmentHistory: Array<{
    date: string
    from: number
    to: number
    reason: string
    effectObserved?: string
  }>
}

export interface AdaptiveParameters {
  lastCalibrated: string

  // A. Escalation timeouts (ore)
  escalationTimeout: {
    CRITICAL: AdaptiveParam
    HIGH: AdaptiveParam
    MEDIUM: AdaptiveParam
    LOW: AdaptiveParam
  }

  // B. KB effectiveness threshold
  kbEffectivenessThreshold: AdaptiveParam

  // C. Proactive cycle multiplier (1.0 = normal, <1 = mai rapid, >1 = mai lent)
  cycleSpeedMultiplier: AdaptiveParam

  // D. Batch size base (multiplicat de heartbeat)
  batchSizeBase: AdaptiveParam

  // E. KB initial confidence for new entries
  kbInitialConfidence: AdaptiveParam

  // F. Cross-agent learning discount
  crossAgentDiscount: AdaptiveParam
}

const PARAMS_KEY = "ADAPTIVE_PARAMS"

// ── Persistare ───────────────────────────────────────────────

async function loadParams(): Promise<AdaptiveParameters> {
  const config = await prisma.systemConfig.findUnique({ where: { key: PARAMS_KEY } }).catch(() => null)
  if (config) {
    try { return JSON.parse(config.value) } catch {}
  }
  return createDefaults()
}

async function saveParams(params: AdaptiveParameters): Promise<void> {
  params.lastCalibrated = new Date().toISOString()
  await prisma.systemConfig.upsert({
    where: { key: PARAMS_KEY },
    update: { value: JSON.stringify(params) },
    create: { key: PARAMS_KEY, value: JSON.stringify(params) },
  })
}

function createDefaults(): AdaptiveParameters {
  const param = (current: number, min: number, max: number): AdaptiveParam => ({
    current, min, max, lastAdjusted: new Date().toISOString(), adjustmentHistory: [],
  })

  return {
    lastCalibrated: new Date().toISOString(),
    escalationTimeout: {
      CRITICAL: param(2, 0.5, 6),
      HIGH: param(8, 2, 24),
      MEDIUM: param(24, 8, 72),
      LOW: param(72, 24, 168),
    },
    kbEffectivenessThreshold: param(0.5, 0.2, 0.9),
    cycleSpeedMultiplier: param(1.0, 0.5, 2.0),
    batchSizeBase: param(10, 3, 25),
    kbInitialConfidence: param(0.7, 0.3, 0.95),
    crossAgentDiscount: param(0.7, 0.3, 0.95),
  }
}

// ── Ajustare cu feedback loop ────────────────────────────────

function adjustParam(
  param: AdaptiveParam,
  metric: number,       // valoarea observată (0-100 sau procent)
  target: number,       // valoarea țintă
  stepSize: number,     // cât de mult ajustăm per pas
  reason: string,
): AdaptiveParam {
  const diff = metric - target
  let newValue = param.current

  if (Math.abs(diff) < 5) {
    // Aproape de țintă — nu ajusta
    return param
  }

  if (diff > 0) {
    // Metric prea mare — ajustăm în jos (sau în sus, depinde de context)
    newValue = param.current + stepSize
  } else {
    newValue = param.current - stepSize
  }

  // Clamp
  newValue = Math.round(Math.max(param.min, Math.min(param.max, newValue)) * 100) / 100

  if (newValue === param.current) return param

  param.adjustmentHistory.push({
    date: new Date().toISOString().slice(0, 10),
    from: param.current,
    to: newValue,
    reason,
  })

  // Păstrăm max 20 ajustări
  if (param.adjustmentHistory.length > 20) {
    param.adjustmentHistory = param.adjustmentHistory.slice(-20)
  }

  param.current = newValue
  param.lastAdjusted = new Date().toISOString()
  return param
}

// ── Calibrare completă (apelat la fiecare ciclu cron) ────────

export async function calibrateAll(): Promise<{
  adjustments: string[]
  params: AdaptiveParameters
}> {
  const params = await loadParams()
  const adjustments: string[] = []
  const h24 = new Date(Date.now() - 24 * 3600000)
  const h7d = new Date(Date.now() - 7 * 24 * 3600000)

  // ═══ A. ESCALATION TIMEOUTS ═══
  // Metric: % taskuri escalate care au fost rezolvate la timp
  // Dacă rata de rezolvare e > 80% → timeouts pot crește (mai mult timp)
  // Dacă rata e < 50% → timeouts trebuie să scadă (escalare mai rapidă)
  const escalated = await prisma.agentTask.count({
    where: { tags: { hasSome: ["escalation"] }, updatedAt: { gte: h7d } },
  })
  const resolvedInTime = await prisma.agentTask.count({
    where: {
      tags: { hasSome: ["escalation"] },
      status: "COMPLETED",
      completedAt: { gte: h7d },
    },
  })
  const escalationResolutionRate = escalated > 0 ? Math.round((resolvedInTime / escalated) * 100) : 50

  for (const priority of ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const) {
    const step = priority === "CRITICAL" ? 0.5 : priority === "HIGH" ? 1 : 4
    const prevTimeout = params.escalationTimeout[priority].current

    if (escalationResolutionRate > 80) {
      params.escalationTimeout[priority] = adjustParam(
        params.escalationTimeout[priority], escalationResolutionRate, 70,
        step, `Resolution rate ${escalationResolutionRate}% > 80% — mai mult timp`
      )
    } else if (escalationResolutionRate < 50) {
      params.escalationTimeout[priority] = adjustParam(
        params.escalationTimeout[priority], escalationResolutionRate, 70,
        -step, `Resolution rate ${escalationResolutionRate}% < 50% — escalare mai rapidă`
      )
    }

    if (params.escalationTimeout[priority].current !== prevTimeout) {
      adjustments.push(`Escalation ${priority}: ${prevTimeout}h → ${params.escalationTimeout[priority].current}h`)
    }
  }

  // ═══ B. KB EFFECTIVENESS THRESHOLD ═══
  // Metric: KB-hit rate în ultimele 24h
  // Dacă KB-hit rate e < 10% → pragul e prea strict, coboară-l
  // Dacă KB-hit rate e > 40% dar calitatea scade → pragul e prea lax
  const [totalExec, kbHits] = await Promise.all([
    prisma.executionTelemetry.count({ where: { createdAt: { gte: h24 } } }),
    prisma.executionTelemetry.count({ where: { createdAt: { gte: h24 }, kbHit: true } }),
  ])
  const kbHitRate = totalExec > 0 ? Math.round((kbHits / totalExec) * 100) : 0

  const prevKBThreshold = params.kbEffectivenessThreshold.current
  if (kbHitRate < 10 && totalExec > 5) {
    params.kbEffectivenessThreshold = adjustParam(
      params.kbEffectivenessThreshold, kbHitRate, 20, -0.05,
      `KB-hit rate ${kbHitRate}% < 10% — cobor pragul`
    )
  } else if (kbHitRate > 40) {
    // Verificăm calitatea: taskuri KB-resolved care au fost apoi re-executate?
    const kbReExecuted = await prisma.agentTask.count({
      where: {
        kbHit: true, status: "FAILED",
        failedAt: { gte: h7d },
      },
    })
    if (kbReExecuted > 3) {
      params.kbEffectivenessThreshold = adjustParam(
        params.kbEffectivenessThreshold, kbHitRate, 25, 0.05,
        `KB-hit rate ${kbHitRate}% dar ${kbReExecuted} re-executări — cresc pragul`
      )
    }
  }

  if (params.kbEffectivenessThreshold.current !== prevKBThreshold) {
    adjustments.push(`KB threshold: ${prevKBThreshold} → ${params.kbEffectivenessThreshold.current}`)
  }

  // ═══ C. CYCLE SPEED ═══
  // Metric: coada ASSIGNED
  // Dacă > 50 taskuri ASSIGNED → accelerează ciclurile
  // Dacă < 10 → încetinește (economie)
  const assignedCount = await prisma.agentTask.count({ where: { status: "ASSIGNED" } })
  const prevSpeed = params.cycleSpeedMultiplier.current

  if (assignedCount > 50) {
    params.cycleSpeedMultiplier = adjustParam(
      params.cycleSpeedMultiplier, assignedCount, 30, -0.1,
      `Coadă mare (${assignedCount}) — accelerare cicluri`
    )
  } else if (assignedCount < 10) {
    params.cycleSpeedMultiplier = adjustParam(
      params.cycleSpeedMultiplier, assignedCount, 30, 0.1,
      `Coadă mică (${assignedCount}) — economie`
    )
  }

  if (params.cycleSpeedMultiplier.current !== prevSpeed) {
    adjustments.push(`Cycle speed: ${prevSpeed}x → ${params.cycleSpeedMultiplier.current}x`)
  }

  // ═══ D. BATCH SIZE ═══
  // Metric: eficiența per batch (taskuri utile / total procesate)
  const [completed24h, processed24h] = await Promise.all([
    prisma.agentTask.count({ where: { status: "COMPLETED", completedAt: { gte: h24 }, kbHit: false } }),
    prisma.executionTelemetry.count({ where: { createdAt: { gte: h24 } } }),
  ])
  const batchEfficiency = processed24h > 0 ? Math.round((completed24h / processed24h) * 100) : 50
  const prevBatch = params.batchSizeBase.current

  if (batchEfficiency > 80 && assignedCount > 20) {
    params.batchSizeBase = adjustParam(
      params.batchSizeBase, batchEfficiency, 70, 2,
      `Eficiență ${batchEfficiency}% + coadă ${assignedCount} — batch mai mare`
    )
  } else if (batchEfficiency < 40) {
    params.batchSizeBase = adjustParam(
      params.batchSizeBase, batchEfficiency, 70, -2,
      `Eficiență ${batchEfficiency}% — batch mai mic, mai focusat`
    )
  }

  if (params.batchSizeBase.current !== prevBatch) {
    adjustments.push(`Batch size: ${prevBatch} → ${params.batchSizeBase.current}`)
  }

  // ═══ E. KB INITIAL CONFIDENCE ═══
  // Metric: KB entries noi care au fost validate vs respinse
  const [kbValidated, kbRejected] = await Promise.all([
    prisma.kBEntry.count({ where: { status: "PERMANENT", createdAt: { gte: h7d } } }),
    prisma.kBEntry.count({ where: { status: "ARCHIVED", createdAt: { gte: h7d } } }),
  ])
  const kbValidationRate = kbValidated + kbRejected > 0
    ? Math.round((kbValidated / (kbValidated + kbRejected)) * 100) : 70
  const prevKBConf = params.kbInitialConfidence.current

  if (kbValidationRate > 90) {
    params.kbInitialConfidence = adjustParam(
      params.kbInitialConfidence, kbValidationRate, 80, 0.05,
      `${kbValidationRate}% KB validate — cresc confidence inițial`
    )
  } else if (kbValidationRate < 60) {
    params.kbInitialConfidence = adjustParam(
      params.kbInitialConfidence, kbValidationRate, 80, -0.05,
      `${kbValidationRate}% KB validate — scad confidence inițial`
    )
  }

  if (params.kbInitialConfidence.current !== prevKBConf) {
    adjustments.push(`KB initial confidence: ${prevKBConf} → ${params.kbInitialConfidence.current}`)
  }

  // ═══ F. CROSS-AGENT DISCOUNT ═══
  // Metric: cross-agent KB-hits care au fost utile
  const crossHits = await prisma.executionTelemetry.count({
    where: { createdAt: { gte: h7d }, kbHit: true },
  })
  // Simplificat: dacă KB-hit general crește, cross-agent discount se relaxează
  if (kbHitRate > 15) {
    const prevCross = params.crossAgentDiscount.current
    params.crossAgentDiscount = adjustParam(
      params.crossAgentDiscount, kbHitRate, 15, 0.05,
      `KB-hit rate ${kbHitRate}% — cross-agent mai permisiv`
    )
    if (params.crossAgentDiscount.current !== prevCross) {
      adjustments.push(`Cross-agent discount: ${prevCross} → ${params.crossAgentDiscount.current}`)
    }
  }

  // Salvare
  await saveParams(params)

  return { adjustments, params }
}

// ── Getter pentru consumatori ────────────────────────────────

export async function getAdaptiveParam(
  category: keyof Omit<AdaptiveParameters, "lastCalibrated">,
  subKey?: string
): Promise<number> {
  const params = await loadParams()
  const cat = params[category]
  if (subKey && typeof cat === "object" && !("current" in cat)) {
    return (cat as any)[subKey]?.current ?? 0
  }
  return (cat as AdaptiveParam).current
}
