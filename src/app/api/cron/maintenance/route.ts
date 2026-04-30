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

  // Timeout wrapper — fiecare pas are max 30s
  async function withTimeout<T>(label: string, fn: () => Promise<T>, maxMs = 30000): Promise<T | null> {
    try {
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`TIMEOUT ${maxMs}ms`)), maxMs)),
      ])
      return result
    } catch (e: any) {
      console.log(`[maintenance] ${label} skip: ${e.message?.slice(0, 60)}`)
      results[label] = { error: e.message?.slice(0, 80) }
      return null
    }
  }

  // 1. LEARNING ORCHESTRATOR
  const lr = await withTimeout("learning", async () => {
    const { runLearningOrchestrator } = await import("@/lib/agents/learning-orchestrator")
    return await runLearningOrchestrator()
  }, 40000) // learning poate dura mai mult (daily)
  if (lr) {
    results.learning = { phase: lr.phase, propagated: lr.propagated, errors: lr.errors.length, durationMs: lr.durationMs }
    if (lr.phase === "CYCLE_AND_DAILY") {
      console.log(`[maintenance] Learning DAILY: consolidated=${lr.consolidated}, distilled=${lr.distilled}, maturity=${lr.maturityUpdated}`)
    }
  }

  // 2. SIGNALS PROCESSING
  await withTimeout("signals", async () => {
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
          assignedTo: assignTo, assignedBy: "COSO", status: "ASSIGNED", priority: "URGENT",
          taskType: "INVESTIGATION", businessId: "biz_jobgrade",
          tags: ["signal-reactive", `signal:${signal.id}`, `category:${signal.category}`],
        },
      }).catch(() => {})
      processed++
    }
    results.signals = { processed }
  })

  // 3. RETRY STUCK TASKS
  await withTimeout("retry", async () => {
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
  })

  // 4. OPERATIONAL ENGINE
  await withTimeout("operational", async () => {
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
  })

  // 5. ROLLUP OBIECTIVE
  await withTimeout("rollup", async () => {
    const { rollupAllObjectives } = await import("@/lib/agents/objective-rollup")
    const rollup = await rollupAllObjectives()
    results.rollup = { updated: rollup.updated }
  })

  // 6. TASK HYGIENE
  await withTimeout("hygiene", async () => {
    const { cleanStaleTasks } = await import("@/lib/agents/task-hygiene")
    const cleaned = await cleanStaleTasks()
    results.hygiene = { cleaned }
  })

  // 7. COST BUDGET CHECK — opreste executorul daca depaseste bugetul zilnic
  await withTimeout("costBudget", async () => {
    const DAILY_BUDGET_USD = 5.0 // $5/zi max
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const todayTasks = await prisma.agentTask.count({
      where: { completedAt: { gte: todayStart }, status: "COMPLETED" },
    })
    const estimatedCost = todayTasks * 0.02 // ~$0.02 per task avg
    const budgetPct = Math.round((estimatedCost / DAILY_BUDGET_USD) * 100)

    results.costBudget = { estimatedCost: Math.round(estimatedCost * 100) / 100, budgetPct, dailyBudget: DAILY_BUDGET_USD }

    if (budgetPct >= 100) {
      // Opreste executorul pana maine
      await prisma.systemConfig.upsert({
        where: { key: "EXECUTOR_CRON_ENABLED" },
        update: { value: "false" },
        create: { key: "EXECUTOR_CRON_ENABLED", value: "false" },
      })
      console.log(`[maintenance] BUDGET EXCEEDED: $${estimatedCost.toFixed(2)}/$${DAILY_BUDGET_USD} (${budgetPct}%) — executor PAUSED`)
    } else if (budgetPct >= 80) {
      console.log(`[maintenance] Budget warning: $${estimatedCost.toFixed(2)}/$${DAILY_BUDGET_USD} (${budgetPct}%)`)
    }

    // Re-enable executorul daca e o zi noua si era oprit
    const ks = await prisma.systemConfig.findUnique({ where: { key: "EXECUTOR_CRON_ENABLED" } })
    if (ks?.value === "false" && budgetPct < 10) {
      await prisma.systemConfig.update({ where: { key: "EXECUTOR_CRON_ENABLED" }, data: { value: "true" } })
      console.log("[maintenance] Budget reset — executor RE-ENABLED")
    }
  })

  // 8. METRICS SNAPSHOT ZILNIC
  await withTimeout("metricsSnapshot", async () => {
    const todayStr = new Date().toISOString().slice(0, 10)
    const existing = await prisma.systemConfig.findUnique({ where: { key: `METRICS_SNAPSHOT_${todayStr}` } }).catch(() => null)
    // Salvam/actualizam o data pe zi
    const todayStart = new Date(todayStr + "T00:00:00Z")
    const [completed, created, cancelled, kbHit, artCreated, artTotal, validated] = await Promise.all([
      prisma.agentTask.count({ where: { completedAt: { gte: todayStart }, status: "COMPLETED" } }),
      prisma.agentTask.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.agentTask.count({ where: { status: "CANCELLED", updatedAt: { gte: todayStart } } }),
      prisma.agentTask.count({ where: { completedAt: { gte: todayStart }, status: "COMPLETED", kbHit: true } }),
      prisma.learningArtifact.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.learningArtifact.count(),
      prisma.learningArtifact.count({ where: { validated: true } }),
    ])
    const kbRate = completed > 0 ? Math.round((kbHit / completed) * 100) : 0
    const snapshot = {
      date: todayStr, tasksCompleted: completed, tasksCreated: created, tasksCancelled: cancelled,
      kbHitRate: kbRate, realExecRate: 100 - kbRate,
      learningArtifactsCreated: artCreated, learningArtifactsTotal: artTotal,
      validatedPct: artTotal > 0 ? Math.round((validated / artTotal) * 100) : 0,
      costEstimated: Math.round(completed * 0.02 * 100) / 100,
      productivityRatio: created > 0 ? Math.round(((created - cancelled) / created) * 100) : 100,
    }
    await prisma.systemConfig.upsert({
      where: { key: `METRICS_SNAPSHOT_${todayStr}` },
      update: { value: JSON.stringify(snapshot) },
      create: { key: `METRICS_SNAPSHOT_${todayStr}`, value: JSON.stringify(snapshot) },
    })
    results.metricsSnapshot = { date: todayStr, tasksCompleted: completed }
  })

  // 9. INGESTIE AUTONOMA — procesare joburi IN_PROGRESS (documente mari)
  await withTimeout("ingestion", async () => {
    // Gaseste joburi de ingestie nefinalizate
    const configs = await prisma.systemConfig.findMany({
      where: { key: { startsWith: "INGEST_JOB_" } },
    })
    let processedChunks = 0
    let processedJobs = 0

    for (const config of configs) {
      try {
        const job = JSON.parse(config.value)
        if (job.status !== "IN_PROGRESS") continue

        processedJobs++
        // Procesam max 5 chunk-uri per job per ciclu maintenance (control cost)
        const batch = 5
        const startIdx = job.processedUpTo
        const endIdx = Math.min(startIdx + batch, job.chunks.length)

        if (startIdx >= job.chunks.length) {
          job.status = "COMPLETED"
          await prisma.systemConfig.update({ where: { key: config.key }, data: { value: JSON.stringify(job) } })
          continue
        }

        const { extractKnowledgeFromChunk } = await import("@/lib/kb/ingest-document")

        for (let i = startIdx; i < endIdx; i++) {
          const entries = await extractKnowledgeFromChunk(
            job.chunks[i], job.sourceTitle, job.sourceAuthor, job.sourceType, i, job.chunks.length,
          )
          for (const entry of entries) {
            const existing = await prisma.kBEntry.findFirst({
              where: { agentRole: entry.agentRole, content: entry.content, status: "PERMANENT" },
            })
            if (!existing) {
              await prisma.kBEntry.create({
                data: {
                  agentRole: entry.agentRole, kbType: (entry.kbType || "METHODOLOGY") as any,
                  content: entry.content, source: "EXPERT_HUMAN",
                  tags: [...(entry.tags || []), `ingest:${job.id}`, `source:${job.sourceTitle}`],
                  status: "PERMANENT", confidence: entry.confidence || 0.8,
                },
              })
              job.entriesCreated++
              job.byRole[entry.agentRole] = (job.byRole[entry.agentRole] || 0) + 1
            }
          }
          processedChunks++
        }

        job.processedUpTo = endIdx
        if (endIdx >= job.chunks.length) {
          job.status = "COMPLETED"
          // Notificare Owner ca ingestia e completa
          try {
            const { Resend } = await import("resend")
            const resend = new Resend(process.env.RESEND_API_KEY)
            await resend.emails.send({
              from: "JobGrade <noreply@jobgrade.ro>",
              to: process.env.OWNER_EMAIL || "liviu.stroie@psibus.ro",
              subject: `[JobGrade] Ingestie completă: ${job.sourceTitle}`,
              text: `Documentul "${job.sourceTitle}" (${job.sourceAuthor}) a fost procesat complet.\n\n${job.entriesCreated} entries create.\nConsultanți: ${Object.entries(job.byRole).map(([r, n]) => `${r}: ${n}`).join(", ")}`,
            }).catch(() => {})
          } catch {}
        }

        await prisma.systemConfig.update({ where: { key: config.key }, data: { value: JSON.stringify(job) } })
      } catch (e: any) {
        console.error(`[maintenance/ingestion] Error on ${config.key}: ${e.message}`)
      }
    }

    results.ingestion = { processedJobs, processedChunks }
  }, 60000) // 60s timeout (ingestia poate fi lenta)

  // 10. FULL-CHECK PLATFORMĂ (la fiecare 6h — QLA automat)
  await withTimeout("fullCheck", async () => {
    const lastCheck = await prisma.systemConfig.findUnique({ where: { key: "FULL_CHECK_LAST_RUN" } })
    const lastCheckAge = lastCheck ? Date.now() - new Date(JSON.parse(lastCheck.value).timestamp).getTime() : Infinity
    const SIX_HOURS = 6 * 3600000

    if (lastCheckAge >= SIX_HOURS) {
      const baseUrl = process.env.NEXTAUTH_URL || process.env.APP_URL || "https://jobgrade.ro"
      const res = await fetch(`${baseUrl}/api/v1/health/full-check`, {
        method: "POST",
        headers: { "x-internal-key": process.env.INTERNAL_API_KEY || "" },
      })
      const data = await res.json().catch(() => ({}))
      results.fullCheck = {
        totalChecks: data.totalChecks,
        passed: data.passed,
        failed: data.failed,
        coverage: data.coverage,
        escalated: data.escalated,
      }
      console.log(`[maintenance] Full-check: ${data.passed}/${data.totalChecks} pass, ${data.failed} fail${data.escalated ? " — ESCALAT" : ""}`)
    } else {
      results.fullCheck = { skipped: true, nextInMs: SIX_HOURS - lastCheckAge }
    }
  })

  // Salvam timestamp
  try {
    await prisma.systemConfig.upsert({
      where: { key: "MAINTENANCE_LAST_RUN" },
      update: { value: new Date().toISOString() },
      create: { key: "MAINTENANCE_LAST_RUN", value: new Date().toISOString() },
    })
  } catch {}

  // Heartbeat ping — confirmă la UptimeRobot că maintenance a rulat
  try {
    const heartbeatUrl = process.env.UPTIMEROBOT_MAINTENANCE_HEARTBEAT
    if (heartbeatUrl) await fetch(heartbeatUrl).catch(() => {})
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
