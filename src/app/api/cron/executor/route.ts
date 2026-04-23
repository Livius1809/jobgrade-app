/**
 * Executor endpoint — procesează task-urile ASSIGNED ale agenților.
 *
 * Poate fi apelat:
 * - Din cron GitHub Actions (la 2h)
 * - Manual cu x-internal-key (oricând)
 *
 * Auth: CRON_SECRET (Vercel) SAU x-internal-key
 *
 * Principii:
 * - FĂRĂ guard de ore — task-urile se execută când există
 * - Kill-switch ON by default — dacă nu e explicit "false", rulează
 * - Procesează TOATĂ coada, nu doar batch de 5
 * - Task-uri BLOCKED > 24h → retry automat (reset la ASSIGNED)
 */

import { NextRequest, NextResponse } from "next/server"
import { runIntelligentBatch } from "@/lib/agents/intelligent-executor"

export const maxDuration = 300 // 5 min

export async function GET(request: NextRequest) {
  // Auth
  const authHeader = request.headers.get("authorization")
  const internalKey = request.headers.get("x-internal-key")
  const isAuthorized = authHeader === `Bearer ${process.env.CRON_SECRET}` ||
    internalKey === process.env.INTERNAL_API_KEY
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Kill-switch: ON by default — oprește DOAR dacă e explicit "false"
  let executorEnabled = true
  const envVal = process.env.EXECUTOR_CRON_ENABLED
  if (envVal === "false" || envVal === "0") {
    executorEnabled = false
  }
  try {
    const { prisma } = await import("@/lib/prisma")
    const dbConfig = await prisma.systemConfig.findUnique({ where: { key: "EXECUTOR_CRON_ENABLED" } }).catch(() => null)
    if (dbConfig?.value === "false") executorEnabled = false
    if (dbConfig?.value === "true") executorEnabled = true
  } catch { /* DB unavailable — use env var */ }

  if (!executorEnabled) {
    return NextResponse.json({ ok: false, reason: "Kill-switch explicit false" })
  }

  try {
    // Retry: deblocăm task-uri BLOCKED > 24h (punct 4)
    const { prisma } = await import("@/lib/prisma")
    const retried = await prisma.agentTask.updateMany({
      where: {
        status: "BLOCKED",
        blockedAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      data: {
        status: "ASSIGNED",
        blockerType: null,
        blockerDescription: null,
        blockedAt: null,
      },
    }).catch(() => ({ count: 0 }))

    // Procesează toată coada — batch-uri de 10 până nu mai sunt task-uri
    let totalProcessed = 0
    let totalExecuted = 0
    let totalBlocked = 0
    let allResults: any[] = []
    let batchCount = 0
    const maxBatches = 10 // safety: max 100 task-uri per ciclu

    while (batchCount < maxBatches) {
      const result = await runIntelligentBatch(10)

      if (result.tasksProcessed === 0) break // nu mai sunt task-uri

      totalProcessed += result.tasksProcessed
      totalExecuted += result.tasksExecuted
      totalBlocked += result.tasksBlockedAlignment + result.tasksBlockedBudget
      allResults = allResults.concat(result.results)
      batchCount++

      // Dacă toate task-urile din batch sunt blocked/skipped, oprim (evităm loop infinit)
      if (result.tasksExecuted === 0 && result.tasksSkippedKB === 0) break
    }

    // NIVEL 4: Propagare departamentală (la fiecare ciclu)
    let propagated = 0
    try {
      const { propagateDepartmentLearning } = await import("@/lib/agents/learning-funnel")
      propagated = await propagateDepartmentLearning()
    } catch {}

    // NIVEL 5: Curățare artefacte învățare expirate (săptămânal — doar luni)
    let expiredCleaned = 0
    if (new Date().getDay() === 1) {
      try {
        const { expireUnusedArtifacts } = await import("@/lib/agents/learning-pipeline")
        expiredCleaned = await expireUnusedArtifacts()
      } catch {}
    }

    return NextResponse.json({
      ok: true,
      batches: batchCount,
      retriedFromBlocked: retried.count,
      totalProcessed,
      totalExecuted,
      totalBlocked,
      propagatedLearning: propagated,
      expiredCleaned,
      results: allResults.slice(0, 20),
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("[cron/executor] Error:", error.message)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}
