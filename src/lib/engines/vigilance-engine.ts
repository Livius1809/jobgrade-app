/**
 * vigilance-engine.ts — Atentie focalizata pe domeniu specific (06.05.2026)
 *
 * ARHITECTURA: Complementar contemplation-engine.
 *
 * Contemplation (STRATEGIC/TACTICAL): gandire libera, cauta CONEXIUNI
 *   - "Ce legatura exista intre X si Y?"
 *   - Ruleaza pentru COG, COCSA, manageri N/N-1
 *
 * Vigilance (OPERATIONAL): detectie DEVIATII de la starea asteptata
 *   - "Metrica X a iesit din intervalul normal"
 *   - "Procesul Y dureaza de 3x mai mult ca de obicei"
 *   - Ruleaza pentru agenti operationali
 *   - FARA apel Claude — comparatie pura de date contra baseline-uri
 *
 * Analogie umana: paznicul care supravegheaza un sector.
 * Nu cauta conexiuni filosofice — observa ce NU e normal.
 */

import { prisma } from "@/lib/prisma"

// ── Types ──────────────────────────────────────────────────────────────────

export interface VigilanceAlert {
  agentRole: string
  domain: string
  type: "METRIC_DEVIATION" | "PROCESS_SLOWDOWN" | "QUALITY_DROP" | "VOLUME_SPIKE" | "PATTERN_BREAK"
  description: string
  expected: string
  actual: string
  deviationPercent: number
  severity: "INFO" | "WARNING" | "CRITICAL"
  detectedAt: Date
}

export interface VigilanceResult {
  agentRole: string
  alerts: VigilanceAlert[]
  metricsChecked: number
  durationMs: number
}

// ── Baseline calculation helpers ──────────────────────────────────────────

interface MetricBaseline {
  metricName: string
  average: number
  stdDev: number
  sampleSize: number
}

function calculateMovingAverage(values: number[]): { average: number; stdDev: number } {
  if (values.length === 0) return { average: 0, stdDev: 0 }
  const sum = values.reduce((a, b) => a + b, 0)
  const average = sum / values.length
  const variance = values.reduce((acc, v) => acc + (v - average) ** 2, 0) / values.length
  return { average, stdDev: Math.sqrt(variance) }
}

function classifySeverity(deviationPercent: number): "INFO" | "WARNING" | "CRITICAL" {
  const abs = Math.abs(deviationPercent)
  if (abs >= 50) return "CRITICAL"
  if (abs >= 20) return "WARNING"
  return "INFO"
}

// ── Metric extraction from AgentMetric ────────────────────────────────────

interface MetricDataPoint {
  periodStart: Date
  tasksCompleted: number
  tasksEscalated: number
  avgResponseTimeMs: number | null
  kbEntriesAdded: number
  kbEntriesUsed: number
  healthScoreAvg: number | null
  performanceScore: number | null
}

async function loadAgentMetrics(agentRole: string, days: number = 30): Promise<MetricDataPoint[]> {
  const since = new Date()
  since.setDate(since.getDate() - days)

  const metrics = await prisma.agentMetric.findMany({
    where: {
      agentRole,
      periodStart: { gte: since },
    },
    orderBy: { periodStart: "asc" },
    select: {
      periodStart: true,
      tasksCompleted: true,
      tasksEscalated: true,
      avgResponseTimeMs: true,
      kbEntriesAdded: true,
      kbEntriesUsed: true,
      healthScoreAvg: true,
      performanceScore: true,
    },
  })

  return metrics
}

function buildBaselines(metrics: MetricDataPoint[]): MetricBaseline[] {
  if (metrics.length < 3) return [] // Not enough data for baselines

  const baselines: MetricBaseline[] = []

  // Tasks completed per period
  const completedValues = metrics.map((m) => m.tasksCompleted)
  const completedStats = calculateMovingAverage(completedValues)
  baselines.push({
    metricName: "tasksCompleted",
    average: completedStats.average,
    stdDev: completedStats.stdDev,
    sampleSize: completedValues.length,
  })

  // Tasks escalated per period
  const escalatedValues = metrics.map((m) => m.tasksEscalated)
  const escalatedStats = calculateMovingAverage(escalatedValues)
  baselines.push({
    metricName: "tasksEscalated",
    average: escalatedStats.average,
    stdDev: escalatedStats.stdDev,
    sampleSize: escalatedValues.length,
  })

  // Response time (if available)
  const responseValues = metrics
    .map((m) => m.avgResponseTimeMs)
    .filter((v): v is number => v !== null)
  if (responseValues.length >= 3) {
    const responseStats = calculateMovingAverage(responseValues)
    baselines.push({
      metricName: "avgResponseTimeMs",
      average: responseStats.average,
      stdDev: responseStats.stdDev,
      sampleSize: responseValues.length,
    })
  }

  // KB hit rate (kbEntriesUsed / tasksCompleted)
  const kbHitValues = metrics
    .filter((m) => m.tasksCompleted > 0)
    .map((m) => m.kbEntriesUsed / m.tasksCompleted)
  if (kbHitValues.length >= 3) {
    const kbHitStats = calculateMovingAverage(kbHitValues)
    baselines.push({
      metricName: "kbHitRate",
      average: kbHitStats.average,
      stdDev: kbHitStats.stdDev,
      sampleSize: kbHitValues.length,
    })
  }

  // Health score (if available)
  const healthValues = metrics
    .map((m) => m.healthScoreAvg)
    .filter((v): v is number => v !== null)
  if (healthValues.length >= 3) {
    const healthStats = calculateMovingAverage(healthValues)
    baselines.push({
      metricName: "healthScoreAvg",
      average: healthStats.average,
      stdDev: healthStats.stdDev,
      sampleSize: healthValues.length,
    })
  }

  // Performance score (if available)
  const perfValues = metrics
    .map((m) => m.performanceScore)
    .filter((v): v is number => v !== null)
  if (perfValues.length >= 3) {
    const perfStats = calculateMovingAverage(perfValues)
    baselines.push({
      metricName: "performanceScore",
      average: perfStats.average,
      stdDev: perfStats.stdDev,
      sampleSize: perfValues.length,
    })
  }

  return baselines
}

// ── Deviation detection ───────────────────────────────────────────────────

function detectMetricDeviations(
  agentRole: string,
  latest: MetricDataPoint,
  baselines: MetricBaseline[],
): VigilanceAlert[] {
  const alerts: VigilanceAlert[] = []
  const now = new Date()

  for (const baseline of baselines) {
    if (baseline.average === 0 && baseline.stdDev === 0) continue

    let currentValue: number | null = null
    let alertType: VigilanceAlert["type"] = "METRIC_DEVIATION"

    switch (baseline.metricName) {
      case "tasksCompleted": {
        currentValue = latest.tasksCompleted
        // Fewer tasks than expected could mean slowdown
        if (currentValue < baseline.average) alertType = "PROCESS_SLOWDOWN"
        break
      }
      case "tasksEscalated": {
        currentValue = latest.tasksEscalated
        // More escalations than expected = quality issue
        if (currentValue > baseline.average) alertType = "QUALITY_DROP"
        break
      }
      case "avgResponseTimeMs": {
        currentValue = latest.avgResponseTimeMs
        if (currentValue !== null && currentValue > baseline.average) {
          alertType = "PROCESS_SLOWDOWN"
        }
        break
      }
      case "kbHitRate": {
        if (latest.tasksCompleted > 0) {
          currentValue = latest.kbEntriesUsed / latest.tasksCompleted
        }
        if (currentValue !== null && currentValue < baseline.average) {
          alertType = "QUALITY_DROP"
        }
        break
      }
      case "healthScoreAvg": {
        currentValue = latest.healthScoreAvg
        break
      }
      case "performanceScore": {
        currentValue = latest.performanceScore
        if (currentValue !== null && currentValue < baseline.average) {
          alertType = "QUALITY_DROP"
        }
        break
      }
    }

    if (currentValue === null) continue

    // Calculate deviation
    const deviationPercent =
      baseline.average !== 0
        ? ((currentValue - baseline.average) / baseline.average) * 100
        : currentValue !== 0
          ? 100
          : 0

    const severity = classifySeverity(deviationPercent)

    // Only report WARNING and CRITICAL (skip INFO unless pattern break)
    if (severity === "INFO") continue

    alerts.push({
      agentRole,
      domain: baseline.metricName,
      type: alertType,
      description: `${baseline.metricName}: valoarea curenta (${currentValue.toFixed(2)}) deviaza ${Math.abs(deviationPercent).toFixed(1)}% fata de media (${baseline.average.toFixed(2)})`,
      expected: `${baseline.average.toFixed(2)} +/- ${baseline.stdDev.toFixed(2)} (din ${baseline.sampleSize} perioade)`,
      actual: currentValue.toFixed(2),
      deviationPercent: Math.round(deviationPercent * 10) / 10,
      severity,
      detectedAt: now,
    })
  }

  return alerts
}

// ── Task completion rate check ────────────────────────────────────────────

async function checkTaskCompletionRate(agentRole: string): Promise<VigilanceAlert[]> {
  const alerts: VigilanceAlert[] = []
  const now = new Date()

  // Check ratio of COMPLETED vs BLOCKED/FAILED in last 7 days
  const since = new Date()
  since.setDate(since.getDate() - 7)

  const [completed, blocked, total] = await Promise.all([
    prisma.agentTask.count({
      where: { assignedTo: agentRole, status: "COMPLETED", completedAt: { gte: since } },
    }),
    prisma.agentTask.count({
      where: { assignedTo: agentRole, status: "BLOCKED", blockedAt: { gte: since } },
    }),
    prisma.agentTask.count({
      where: {
        assignedTo: agentRole,
        OR: [
          { completedAt: { gte: since } },
          { blockedAt: { gte: since } },
        ],
      },
    }),
  ])

  if (total < 3) return alerts // Not enough data

  const completionRate = completed / total
  const blockRate = blocked / total

  if (completionRate < 0.5) {
    alerts.push({
      agentRole,
      domain: "taskCompletionRate",
      type: "QUALITY_DROP",
      description: `Rata de completare task-uri scazuta: ${(completionRate * 100).toFixed(0)}% (${completed}/${total}) in ultimele 7 zile`,
      expected: "> 50%",
      actual: `${(completionRate * 100).toFixed(1)}%`,
      deviationPercent: -((1 - completionRate / 0.7) * 100),
      severity: completionRate < 0.3 ? "CRITICAL" : "WARNING",
      detectedAt: now,
    })
  }

  if (blockRate > 0.4) {
    alerts.push({
      agentRole,
      domain: "taskBlockRate",
      type: "PATTERN_BREAK",
      description: `Rata mare de task-uri blocate: ${(blockRate * 100).toFixed(0)}% (${blocked}/${total}) in ultimele 7 zile`,
      expected: "< 40%",
      actual: `${(blockRate * 100).toFixed(1)}%`,
      deviationPercent: ((blockRate - 0.2) / 0.2) * 100,
      severity: blockRate > 0.6 ? "CRITICAL" : "WARNING",
      detectedAt: now,
    })
  }

  return alerts
}

// ── Volume spike detection ────────────────────────────────────────────────

async function checkVolumeSpikes(agentRole: string): Promise<VigilanceAlert[]> {
  const alerts: VigilanceAlert[] = []
  const now = new Date()

  // Compare tasks assigned in last 24h vs average per day over last 14 days
  const last24h = new Date()
  last24h.setHours(last24h.getHours() - 24)
  const last14d = new Date()
  last14d.setDate(last14d.getDate() - 14)

  const [recentCount, totalCount] = await Promise.all([
    prisma.agentTask.count({
      where: { assignedTo: agentRole, createdAt: { gte: last24h } },
    }),
    prisma.agentTask.count({
      where: { assignedTo: agentRole, createdAt: { gte: last14d } },
    }),
  ])

  const avgPerDay = totalCount / 14
  if (avgPerDay < 1) return alerts // Not enough volume

  const deviationPercent = ((recentCount - avgPerDay) / avgPerDay) * 100
  if (deviationPercent > 100) {
    alerts.push({
      agentRole,
      domain: "taskVolume",
      type: "VOLUME_SPIKE",
      description: `Volum neobisnuit de task-uri: ${recentCount} in ultimele 24h vs media ${avgPerDay.toFixed(1)}/zi`,
      expected: `~${avgPerDay.toFixed(1)} task-uri/zi`,
      actual: `${recentCount} task-uri/24h`,
      deviationPercent: Math.round(deviationPercent),
      severity: deviationPercent > 200 ? "CRITICAL" : "WARNING",
      detectedAt: now,
    })
  }

  return alerts
}

// ── Main vigilance function ───────────────────────────────────────────────

/**
 * Vigilance: focused attention on a specific domain.
 * Unlike contemplation (what connections do I see?),
 * vigilance asks: what CHANGED in my area that I didn't expect?
 *
 * No Claude call — pure data comparison against baselines.
 */
export async function runVigilance(agentRole: string): Promise<VigilanceAlert[]> {
  const allAlerts: VigilanceAlert[] = []

  // 1. Load agent's domain metrics (last 30 days)
  const metrics = await loadAgentMetrics(agentRole, 30)

  // 2. Calculate baselines (moving average)
  const baselines = buildBaselines(metrics)

  // 3. Compare latest values against baselines
  if (metrics.length > 0 && baselines.length > 0) {
    const latest = metrics[metrics.length - 1]
    const deviationAlerts = detectMetricDeviations(agentRole, latest, baselines)
    allAlerts.push(...deviationAlerts)
  }

  // 4. Check task completion rate
  const completionAlerts = await checkTaskCompletionRate(agentRole)
  allAlerts.push(...completionAlerts)

  // 5. Check volume spikes
  const volumeAlerts = await checkVolumeSpikes(agentRole)
  allAlerts.push(...volumeAlerts)

  return allAlerts
}

/**
 * Run vigilance for ALL operational agents and return aggregated alerts.
 */
export async function runVigilanceForAll(): Promise<VigilanceResult[]> {
  const startMs = Date.now()

  // Get all active operational agents
  const operationalAgents = await prisma.agentDefinition.findMany({
    where: { level: "OPERATIONAL", isActive: true },
    select: { agentRole: true },
  })

  const results: VigilanceResult[] = []

  for (const agent of operationalAgents) {
    const agentStart = Date.now()
    try {
      const alerts = await runVigilance(agent.agentRole)
      results.push({
        agentRole: agent.agentRole,
        alerts,
        metricsChecked: 6, // tasksCompleted, escalated, responseTime, kbHitRate, health, performance
        durationMs: Date.now() - agentStart,
      })
    } catch (err) {
      console.error(`[VIGILANCE] Error for ${agent.agentRole}:`, err)
      results.push({
        agentRole: agent.agentRole,
        alerts: [],
        metricsChecked: 0,
        durationMs: Date.now() - agentStart,
      })
    }
  }

  return results
}

/**
 * Returns recent alerts stored in SystemConfig (last run).
 */
export async function getRecentVigilanceAlerts(): Promise<VigilanceAlert[]> {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: "VIGILANCE_LAST_ALERTS" },
    })
    if (!config?.value) return []
    return JSON.parse(config.value) as VigilanceAlert[]
  } catch {
    return []
  }
}

/**
 * Save alerts to SystemConfig for API access between runs.
 */
export async function saveVigilanceAlerts(alerts: VigilanceAlert[]): Promise<void> {
  if (alerts.length === 0) return
  try {
    await prisma.systemConfig.upsert({
      where: { key: "VIGILANCE_LAST_ALERTS" },
      create: {
        key: "VIGILANCE_LAST_ALERTS",
        value: JSON.stringify(alerts.slice(0, 100)),
        label: "Vigilance Engine last alerts (max 100)",
      },
      update: {
        value: JSON.stringify(alerts.slice(0, 100)),
      },
    })
  } catch (err) {
    console.error("[VIGILANCE] Failed to save alerts:", err)
  }
}
