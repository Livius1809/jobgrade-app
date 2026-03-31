/**
 * metrics-collector.ts — Colectare metrici performanță per agent
 *
 * Surse: CycleLog, KBEntry, KBBuffer, Escalation
 * Output: AgentMetric records cu performanceScore 0-100
 */

import type { PrismaClient } from "@/generated/prisma"

// ── Performance Score Weights ────────────────────────────────────────────────

const WEIGHTS = {
  taskCompletion: 0.30,   // completed / (completed + escalated)
  kbGrowth: 0.20,         // entries added (normalized)
  kbUtilization: 0.15,    // usage count growth
  healthScore: 0.15,      // average health score from cycles
  propagation: 0.10,      // in + out propagations
  responsiveness: 0.10,   // inverse of avg response time
}

// ── Collect metrics for a single agent ───────────────────────────────────────

export async function collectAgentMetrics(
  agentRole: string,
  periodStart: Date,
  periodEnd: Date,
  prisma: PrismaClient
): Promise<any> {
  const p = prisma as any

  // Tasks completed (CycleLog resolved targeting this agent)
  const tasksCompleted = await p.cycleLog.count({
    where: {
      targetRole: agentRole,
      resolved: true,
      createdAt: { gte: periodStart, lte: periodEnd },
    },
  }).catch(() => 0)

  // Tasks escalated (Escalation about this agent)
  const tasksEscalated = await p.escalation.count({
    where: {
      aboutRole: agentRole,
      createdAt: { gte: periodStart, lte: periodEnd },
    },
  }).catch(() => 0)

  // KB entries added
  const kbEntriesAdded = await p.kBEntry.count({
    where: {
      agentRole,
      createdAt: { gte: periodStart, lte: periodEnd },
    },
  }).catch(() => 0)

  // KB entries total usage (sum usageCount)
  const kbUsage = await p.kBEntry.aggregate({
    where: { agentRole, status: "PERMANENT" },
    _sum: { usageCount: true },
  }).catch(() => ({ _sum: { usageCount: 0 } }))
  const kbEntriesUsed = kbUsage._sum?.usageCount || 0

  // Propagations out (entries propagated FROM this agent)
  const propagationsOut = await p.kBEntry.count({
    where: {
      propagatedFrom: agentRole,
      source: "PROPAGATED",
      createdAt: { gte: periodStart, lte: periodEnd },
    },
  }).catch(() => 0)

  // Propagations in (propagated entries received BY this agent)
  const propagationsIn = await p.kBEntry.count({
    where: {
      agentRole,
      source: "PROPAGATED",
      createdAt: { gte: periodStart, lte: periodEnd },
    },
  }).catch(() => 0)

  // Cycle actions (for managers: how many cycles did they run)
  const cycleActions = await p.cycleLog.count({
    where: {
      managerRole: agentRole,
      createdAt: { gte: periodStart, lte: periodEnd },
    },
  }).catch(() => 0)

  // Health score avg — compute from KB count baseline
  const kbTotal = await p.kBEntry.count({
    where: { agentRole, status: "PERMANENT" },
  }).catch(() => 0)

  let healthScoreAvg = 50
  if (kbTotal > 0) healthScoreAvg += 15
  if (kbTotal > 10) healthScoreAvg += 10
  if (kbEntriesAdded > 0) healthScoreAvg += 5
  if (tasksEscalated > 0) healthScoreAvg -= 10 * Math.min(tasksEscalated, 3)
  healthScoreAvg = Math.max(0, Math.min(100, healthScoreAvg))

  // Calculate performance score
  const performanceScore = calculatePerformanceScore({
    tasksCompleted,
    tasksEscalated,
    kbEntriesAdded,
    kbEntriesUsed,
    propagationsOut,
    propagationsIn,
    healthScoreAvg,
    cycleActions,
  })

  return {
    agentRole,
    periodStart,
    periodEnd,
    tasksCompleted,
    tasksEscalated,
    avgResponseTimeMs: null,
    kbEntriesAdded,
    kbEntriesUsed,
    propagationsOut,
    propagationsIn,
    healthScoreAvg,
    cycleActions,
    performanceScore,
  }
}

// ── Performance Score Formula ────────────────────────────────────────────────

function calculatePerformanceScore(m: {
  tasksCompleted: number
  tasksEscalated: number
  kbEntriesAdded: number
  kbEntriesUsed: number
  propagationsOut: number
  propagationsIn: number
  healthScoreAvg: number
  cycleActions: number
}): number {
  // Task completion ratio (0-100)
  const totalTasks = m.tasksCompleted + m.tasksEscalated
  const taskScore = totalTasks > 0 ? (m.tasksCompleted / totalTasks) * 100 : 50

  // KB growth (0-100, normalized: 10+ entries = 100)
  const kbGrowthScore = Math.min(100, (m.kbEntriesAdded / 10) * 100)

  // KB utilization (0-100, normalized: 50+ uses = 100)
  const kbUtilScore = Math.min(100, (m.kbEntriesUsed / 50) * 100)

  // Health score (already 0-100)
  const healthScore = m.healthScoreAvg

  // Propagation activity (0-100, normalized: 5+ total = 100)
  const propScore = Math.min(100, ((m.propagationsOut + m.propagationsIn) / 5) * 100)

  // Responsiveness (inverse of response time — placeholder, use 70 as default)
  const responsivenessScore = 70

  const score =
    taskScore * WEIGHTS.taskCompletion +
    kbGrowthScore * WEIGHTS.kbGrowth +
    kbUtilScore * WEIGHTS.kbUtilization +
    healthScore * WEIGHTS.healthScore +
    propScore * WEIGHTS.propagation +
    responsivenessScore * WEIGHTS.responsiveness

  return Math.round(Math.max(0, Math.min(100, score)))
}

// ── Batch Collection ─────────────────────────────────────────────────────────

export async function runMetricsCollection(
  prisma: PrismaClient,
  period: "daily" | "weekly" | "monthly" = "daily"
): Promise<{ collected: number; agents: string[] }> {
  const p = prisma as any
  const now = new Date()
  let periodStart: Date

  switch (period) {
    case "daily":
      periodStart = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      break
    case "weekly":
      periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case "monthly":
      periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
  }

  // Get all active agents
  const agents = await p.agentDefinition.findMany({
    where: { isActive: true },
    select: { agentRole: true },
  })

  const collectedAgents: string[] = []

  for (const agent of agents) {
    try {
      const metrics = await collectAgentMetrics(
        agent.agentRole,
        periodStart,
        now,
        prisma
      )

      await p.agentMetric.upsert({
        where: {
          agentRole_periodStart_periodEnd: {
            agentRole: agent.agentRole,
            periodStart,
            periodEnd: now,
          },
        },
        update: metrics,
        create: metrics,
      })

      collectedAgents.push(agent.agentRole)
    } catch (e: any) {
      console.warn(`[METRICS] Failed for ${agent.agentRole}: ${e.message}`)
    }
  }

  return { collected: collectedAgents.length, agents: collectedAgents }
}
