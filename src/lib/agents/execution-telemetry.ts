/**
 * execution-telemetry.ts — Componenta F: Telemetry internă organism
 *
 * Principiul P5: COG vede consumul per agent, per tip operație.
 * Calibrează nevoia de cunoaștere la ritmul real.
 *
 * Folosit de task-executor după fiecare execuție + de dashboard COG.
 */

import { prisma } from "@/lib/prisma"

export interface TelemetryInput {
  taskId?: string
  agentRole: string
  taskType?: string
  modelUsed: string
  tokensInput: number
  tokensOutput: number
  estimatedCostUSD: number
  kbHit: boolean
  kbSimilarityScore?: number
  alignmentResult?: string // ALIGNED | UNCERTAIN | MISALIGNED | SKIPPED
  alignmentLevel?: number // 1-5
  thresholdPassed: boolean
  durationMs: number
  webSearchCount?: number
  learningCreated?: boolean
  isInternal?: boolean
}

/**
 * Înregistrează o execuție în telemetry.
 */
export async function logExecutionTelemetry(input: TelemetryInput): Promise<string> {
  const record = await prisma.executionTelemetry.create({
    data: {
      taskId: input.taskId ?? null,
      agentRole: input.agentRole,
      taskType: input.taskType ?? null,
      modelUsed: input.modelUsed,
      tokensInput: input.tokensInput,
      tokensOutput: input.tokensOutput,
      estimatedCostUSD: input.estimatedCostUSD,
      kbHit: input.kbHit,
      kbSimilarityScore: input.kbSimilarityScore ?? null,
      alignmentResult: input.alignmentResult ?? "SKIPPED",
      alignmentLevel: input.alignmentLevel ?? null,
      thresholdPassed: input.thresholdPassed,
      durationMs: input.durationMs,
      webSearchCount: input.webSearchCount ?? 0,
      learningCreated: input.learningCreated ?? false,
      isInternal: input.isInternal ?? true,
    },
    select: { id: true },
  })
  return record.id
}

/**
 * Actualizează budget-ul agentului după execuție.
 */
export async function updateAgentBudget(
  agentRole: string,
  tokensUsed: number
): Promise<{ withinBudget: boolean; usagePercent: number }> {
  const budget = await prisma.agentBudget.findUnique({
    where: { agentRole },
  })

  if (!budget) {
    // Fără budget definit = fără limită. COG decide bugetele, nu codul.
    return { withinBudget: true, usagePercent: 0 }
  }

  // Reset zilnic dacă a trecut o zi
  const now = new Date()
  const daysSinceReset = (now.getTime() - budget.lastResetDaily.getTime()) / 86400000
  const monthsSinceReset = (now.getTime() - budget.lastResetMonthly.getTime()) / (30 * 86400000)

  const updates: Record<string, unknown> = {}
  let currentDaily = budget.currentDailyUsed
  let currentMonthly = budget.currentMonthlyUsed

  if (daysSinceReset >= 1) {
    updates.currentDailyUsed = tokensUsed
    updates.lastResetDaily = now
    currentDaily = tokensUsed
  } else {
    updates.currentDailyUsed = { increment: tokensUsed }
    currentDaily += tokensUsed
  }

  if (monthsSinceReset >= 1) {
    updates.currentMonthlyUsed = tokensUsed
    updates.lastResetMonthly = now
    currentMonthly = tokensUsed
  } else {
    updates.currentMonthlyUsed = { increment: tokensUsed }
    currentMonthly += tokensUsed
  }

  await prisma.agentBudget.update({
    where: { agentRole },
    data: updates as any,
  })

  const dailyPercent = currentDaily / budget.dailyLimitTokens
  const monthlyPercent = currentMonthly / budget.monthlyLimitTokens
  const usagePercent = Math.max(dailyPercent, monthlyPercent)

  return {
    withinBudget: usagePercent < 1.0,
    usagePercent: Math.round(usagePercent * 100),
  }
}

/**
 * Verifică dacă agentul are budget disponibil ÎNAINTE de execuție.
 */
export async function checkBudgetAvailable(
  agentRole: string,
  estimatedTokens: number
): Promise<{ allowed: boolean; reason?: string }> {
  const budget = await prisma.agentBudget.findUnique({
    where: { agentRole },
  })

  if (!budget) return { allowed: true }

  const dailyRemaining = budget.dailyLimitTokens - budget.currentDailyUsed
  const monthlyRemaining = budget.monthlyLimitTokens - budget.currentMonthlyUsed

  if (estimatedTokens > dailyRemaining) {
    return {
      allowed: false,
      reason: `Budget zilnic depășit: ${budget.currentDailyUsed}/${budget.dailyLimitTokens} tokens (estimat: +${estimatedTokens})`,
    }
  }

  if (estimatedTokens > monthlyRemaining) {
    return {
      allowed: false,
      reason: `Budget lunar depășit: ${budget.currentMonthlyUsed}/${budget.monthlyLimitTokens} tokens`,
    }
  }

  // Alert la 80%
  const dailyPercent = (budget.currentDailyUsed + estimatedTokens) / budget.dailyLimitTokens
  if (dailyPercent >= budget.alertThreshold) {
    console.warn(`[BUDGET ALERT] ${agentRole}: ${Math.round(dailyPercent * 100)}% din limita zilnică`)
  }

  return { allowed: true }
}

/**
 * Agregări pentru dashboard COG.
 */
export async function getOrganismTelemetryOverview(hoursBack: number = 24) {
  const since = new Date(Date.now() - hoursBack * 3600000)

  const records = await prisma.executionTelemetry.findMany({
    where: { createdAt: { gte: since }, isInternal: true },
    select: {
      agentRole: true,
      tokensInput: true,
      tokensOutput: true,
      estimatedCostUSD: true,
      kbHit: true,
      alignmentResult: true,
      alignmentLevel: true,
      thresholdPassed: true,
      learningCreated: true,
    },
  })

  // Agregare per agent
  const byAgent = new Map<string, {
    tasks: number
    costUSD: number
    kbHits: number
    alignmentBlocks: number
    learningCreated: number
  }>()

  let totalCost = 0
  let totalKBHits = 0
  let totalTasks = records.length
  let thresholdSkips = 0
  let learningTotal = 0

  for (const r of records) {
    totalCost += r.estimatedCostUSD
    if (r.kbHit) totalKBHits++
    if (!r.thresholdPassed) thresholdSkips++
    if (r.learningCreated) learningTotal++

    const agent = byAgent.get(r.agentRole) ?? {
      tasks: 0, costUSD: 0, kbHits: 0, alignmentBlocks: 0, learningCreated: 0,
    }
    agent.tasks++
    agent.costUSD += r.estimatedCostUSD
    if (r.kbHit) agent.kbHits++
    if (r.alignmentResult === "MISALIGNED") agent.alignmentBlocks++
    if (r.learningCreated) agent.learningCreated++
    byAgent.set(r.agentRole, agent)
  }

  return {
    period: `${hoursBack}h`,
    totalTasks,
    totalCostUSD: Math.round(totalCost * 1000) / 1000,
    kbHitRate: totalTasks > 0 ? Math.round((totalKBHits / totalTasks) * 100) : 0,
    thresholdEfficiency: totalTasks > 0
      ? Math.round(((totalTasks - thresholdSkips) / totalTasks) * 100)
      : 100,
    learningArtifactsCreated: learningTotal,
    byAgent: Object.fromEntries(byAgent),
  }
}
