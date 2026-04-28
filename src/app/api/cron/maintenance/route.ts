/**
 * /api/cron/maintenance
 *
 * Cron SEPARAT — learning + signals + retry + operational engine.
 * Ruleaza la 1h. Max 120s.
 * Executor-ul ramane DOAR cu task execution + cognitive layers.
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const maxDuration = 120

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const internalKey = request.headers.get("x-internal-key")
  const isAuthorized = authHeader === `Bearer ${process.env.CRON_SECRET}` ||
    internalKey === process.env.INTERNAL_API_KEY
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const start = Date.now()
  const results: Record<string, any> = {}

  // 1. LEARNING ORCHESTRATOR
  try {
    const { runLearningOrchestrator } = await import("@/lib/agents/learning-orchestrator")
    const lr = await runLearningOrchestrator()
    results.learning = { phase: lr.phase, propagated: lr.propagated, errors: lr.errors.length, durationMs: lr.durationMs }
    if (lr.phase === "CYCLE_AND_DAILY") {
      console.log(`[maintenance] Learning DAILY: consolidated=${lr.consolidated}, distilled=${lr.distilled}, maturity=${lr.maturityUpdated}`)
    }
  } catch (e: any) {
    results.learning = { error: e.message?.slice(0, 80) }
  }

  // 2. SIGNALS PROCESSING
  try {
    const pending = await prisma.externalSignal.findMany({
      where: { processedAt: null },
      take: 10,
      orderBy: { capturedAt: "asc" },
    })
    let processed = 0
    const catRoleMap: Record<string, string> = { MARKET_HR: "MKA", TECH_AI: "COA", CULTURAL_SOCIAL: "COCSA", COMPETITOR: "CIA", MACRO_ECONOMIC: "CFO" }
    for (const signal of pending) {
      await prisma.externalSignal.update({ where: { id: signal.id }, data: { processedAt: new Date() } })
      const assignTo = catRoleMap[signal.category] || "COG"
      await prisma.agentTask.create({
        data: {
          title: `REACT ${signal.category}: ${(signal.title || "Signal").slice(0, 100)}`,
          description: `Semnal extern: ${signal.category}. Sursa: ${signal.source || "?"}. Analizeaza impactul.`,
          assignedTo: assignTo,
          assignedBy: "COSO",
          status: "ASSIGNED",
          priority: "URGENT",
          taskType: "INVESTIGATION",
          businessId: "biz_jobgrade",
          tags: ["signal-reactive", `signal:${signal.id}`, `category:${signal.category}`],
        },
      }).catch(() => {})
      processed++
    }
    results.signals = { processed }
  } catch (e: any) {
    results.signals = { error: e.message?.slice(0, 80) }
  }

  // 3. RETRY STUCK TASKS
  try {
    const stuck = await prisma.agentTask.findMany({
      where: { status: { in: ["BLOCKED", "FAILED"] }, updatedAt: { lt: new Date(Date.now() - 24 * 3600000) } },
      select: { id: true, tags: true },
      take: 10,
    })
    let retried = 0
    for (const task of stuck) {
      const retryCount = (task.tags || []).filter((t: string) => t.startsWith("retry:")).length
      if (retryCount >= 3) {
        await prisma.agentTask.update({ where: { id: task.id }, data: { status: "CANCELLED", tags: { push: "max-retries-reached" } } })
      } else {
        await prisma.agentTask.update({
          where: { id: task.id },
          data: { status: "ASSIGNED", blockerType: null, blockerDescription: null, blockedAt: null, failedAt: null, tags: { push: `retry:${retryCount + 1}` } },
        })
        retried++
      }
    }
    results.retry = { retried, stuck: stuck.length }
  } catch (e: any) {
    results.retry = { error: e.message?.slice(0, 80) }
  }

  // 4. OPERATIONAL ENGINE
  try {
    const { runOperationalEngine } = await import("@/lib/agents/operational-engine")
    const op = await runOperationalEngine()
    results.operational = {
      anomalies: op.anomalyCount,
      autoRemediations: op.autoRemediationsApplied,
      selfCheck: op.selfCheck,
      efficiency: op.efficiency,
    }
    if (op.anomalies.length > 0) {
      console.log(`[maintenance] Anomalii: ${op.anomalyCount.critical}C ${op.anomalyCount.high}H ${op.anomalyCount.medium}M`)
    }
  } catch (e: any) {
    results.operational = { error: e.message?.slice(0, 80) }
  }

  // 5. ROLLUP OBIECTIVE
  try {
    const { rollupAllObjectives } = await import("@/lib/agents/objective-rollup")
    const rollup = await rollupAllObjectives()
    results.rollup = { updated: rollup.updated }
  } catch (e: any) {
    results.rollup = { error: e.message?.slice(0, 80) }
  }

  // 6. TASK HYGIENE
  try {
    const { cleanStaleTasks } = await import("@/lib/agents/task-hygiene")
    const cleaned = await cleanStaleTasks()
    results.hygiene = { cleaned }
  } catch (e: any) {
    results.hygiene = { error: e.message?.slice(0, 80) }
  }

  // Salvam timestamp
  try {
    await prisma.systemConfig.upsert({
      where: { key: "MAINTENANCE_LAST_RUN" },
      update: { value: new Date().toISOString() },
      create: { key: "MAINTENANCE_LAST_RUN", value: new Date().toISOString() },
    })
  } catch {}

  const durationMs = Date.now() - start
  console.log(`[maintenance] Done in ${durationMs}ms`)

  return NextResponse.json({
    ok: true,
    durationMs,
    ...results,
    timestamp: new Date().toISOString(),
  })
}
