/**
 * Vercel Cron endpoint — processes ASSIGNED agent tasks.
 *
 * Runs every 5 minutes via Vercel Cron Jobs. Calls the internal task
 * executor with `cron: true` (respects EXECUTOR_CRON_ENABLED kill-switch).
 *
 * Auth: Vercel injects CRON_SECRET automatically for cron-invoked requests.
 * Manual calls require `Authorization: Bearer ${CRON_SECRET}`.
 *
 * Architecture note (L1+L2+L3 governance):
 * - L1 (CÂMPUL): moral-core validates each task output before marking COMPLETED
 * - L2 (Consultanți): agents can request L2 expertise during execution via KB lookup
 * - L3 (Legal): CJA reviews tasks tagged 'legal' or containing compliance signals
 * The executor itself is L4 infrastructure; governance is applied at task level.
 */

import { NextRequest, NextResponse } from "next/server"
import { runIntelligentBatch } from "@/lib/agents/intelligent-executor"

export const maxDuration = 300 // 5 min — matches execute-task route

export async function GET(request: NextRequest) {
  // Verify Vercel Cron auth
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Guard: doar L-V 08:00-18:00 EET
  const now = new Date()
  const eetHour = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Bucharest" })).getHours()
  const eetDay = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Bucharest" })).getDay()
  if (eetDay === 0 || eetDay === 6 || eetHour < 8 || eetHour >= 22) {
    return NextResponse.json({ ok: true, skipped: true, reason: "Outside business hours (L-V 08-18 EET)" })
  }

  // Kill-switch: check DB config first, env var fallback
  let executorEnabled = process.env.EXECUTOR_CRON_ENABLED === "true"
  try {
    const { prisma } = await import("@/lib/prisma")
    const dbConfig = await prisma.systemConfig.findUnique({ where: { key: "EXECUTOR_CRON_ENABLED" } })
    if (dbConfig) executorEnabled = dbConfig.value === "true"
  } catch { /* DB unavailable — use env var */ }

  if (!executorEnabled) {
    return NextResponse.json({
      ok: false,
      reason: "EXECUTOR_CRON_ENABLED kill-switch is not 'true'",
    })
  }

  try {
    const result = await runIntelligentBatch(5)

    return NextResponse.json({
      ok: true,
      threshold: result.thresholdResult,
      tasksProcessed: result.tasksProcessed,
      tasksSkippedKB: result.tasksSkippedKB,
      tasksBlockedAlignment: result.tasksBlockedAlignment,
      tasksBlockedBudget: result.tasksBlockedBudget,
      tasksExecuted: result.tasksExecuted,
      results: result.results,
      totalDurationMs: result.totalDurationMs,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("[cron/executor] Error:", error.message)
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    )
  }
}
