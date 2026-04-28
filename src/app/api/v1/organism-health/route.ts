/**
 * GET /api/v1/organism-health
 *
 * Diagnostic complet organism — 14 verificari verde/galben/rosu.
 * Echivalentul scriptului organism-health.ts dar ca API (pentru dashboard).
 * Auth: session Owner sau x-internal-key
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const maxDuration = 30

type Status = "VERDE" | "GALBEN" | "ROSU"

interface Check {
  component: string
  status: Status
  detail: string
  metric?: number
}

export async function GET(req: NextRequest) {
  const key = req.headers.get("x-internal-key")
  if (key !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()
  const h6 = new Date(now.getTime() - 6 * 3600000)
  const h24 = new Date(now.getTime() - 24 * 3600000)
  const h48 = new Date(now.getTime() - 48 * 3600000)
  const d7 = new Date(now.getTime() - 7 * 24 * 3600000)
  const p = prisma as any
  const checks: Check[] = []

  // Toate query-urile in paralel
  const [
    executorLast, proactiveLast, learningLast, maintenanceLast, opEngineLast,
    completed6h, kbHit6h, reviewPending,
    totalArtifacts, validatedArtifacts, artifacts24h,
    objectivesActive, tasksOnObj,
    blocked, metaKB,
    ownerNotifs,
    created6h, cancelled6h,
  ] = await Promise.all([
    prisma.systemConfig.findUnique({ where: { key: "EXECUTOR_LAST_RUN" } }).catch(() => null),
    prisma.systemConfig.findUnique({ where: { key: "PROACTIVE_LOOP_LAST_RUN" } }).catch(() => null),
    prisma.systemConfig.findUnique({ where: { key: "LEARNING_ORCHESTRATOR_LAST_DAILY" } }).catch(() => null),
    prisma.systemConfig.findUnique({ where: { key: "MAINTENANCE_LAST_RUN" } }).catch(() => null),
    prisma.systemConfig.findUnique({ where: { key: "OPERATIONAL_ENGINE_LAST" } }).catch(() => null),
    prisma.agentTask.count({ where: { completedAt: { gte: h6 }, status: "COMPLETED" } }),
    prisma.agentTask.count({ where: { completedAt: { gte: h6 }, status: "COMPLETED", kbHit: true } }),
    prisma.agentTask.count({ where: { status: "REVIEW_PENDING" as any } }),
    prisma.learningArtifact.count(),
    prisma.learningArtifact.count({ where: { validated: true } }),
    prisma.learningArtifact.count({ where: { createdAt: { gte: h24 } } }),
    prisma.organizationalObjective.count({ where: { status: { not: "ARCHIVED" } } }),
    prisma.agentTask.count({ where: { createdAt: { gte: d7 }, objectiveId: { not: null }, status: { not: "CANCELLED" } } }),
    prisma.agentTask.count({ where: { status: "BLOCKED" } }),
    p.kBEntry?.count({ where: { tags: { hasSome: ["meta-organism"] } } }).catch(() => 0) ?? 0,
    p.notification?.count({ where: { type: "AGENT_MESSAGE", createdAt: { gte: h24 }, respondedAt: null } }).catch(() => 0) ?? 0,
    prisma.agentTask.count({ where: { createdAt: { gte: h6 } } }),
    prisma.agentTask.count({ where: { status: "CANCELLED", updatedAt: { gte: h6 } } }),
  ])

  // Helper
  function ageHours(val: string | null | undefined): number | null {
    if (!val) return null
    return Math.round((now.getTime() - new Date(val).getTime()) / 3600000 * 10) / 10
  }

  // 1. Executor
  const execAge = ageHours(executorLast?.value)
  checks.push({
    component: "Cron Executor",
    status: execAge !== null ? (execAge < 1 ? "VERDE" : execAge < 2 ? "GALBEN" : "ROSU") : "ROSU",
    detail: execAge !== null ? `Ultimul run: ${Math.round(execAge * 60)}min` : "NEVER RUN",
    metric: execAge !== null ? Math.round(execAge * 60) : -1,
  })

  // 2. Maintenance
  const maintAge = ageHours(maintenanceLast?.value)
  checks.push({
    component: "Maintenance Cron",
    status: maintAge !== null ? (maintAge < 3 ? "VERDE" : maintAge < 6 ? "GALBEN" : "ROSU") : "ROSU",
    detail: maintAge !== null ? `Ultimul run: ${Math.round(maintAge * 60)}min` : "NEVER RUN",
    metric: maintAge !== null ? Math.round(maintAge * 60) : -1,
  })

  // 3. Proactive Loop
  const proactiveAge = ageHours(proactiveLast?.value)
  checks.push({
    component: "Proactive Loop",
    status: proactiveAge !== null ? (proactiveAge < 6 ? "VERDE" : proactiveAge < 24 ? "GALBEN" : "ROSU") : "ROSU",
    detail: proactiveAge !== null ? `Ultimul ciclu: ${proactiveAge}h` : "NEVER (timestamp absent)",
  })

  // 4. Learning
  const learnAge = ageHours(learningLast?.value)
  checks.push({
    component: "Learning Engine",
    status: learnAge !== null ? (learnAge < 25 ? "VERDE" : "ROSU") : "ROSU",
    detail: learnAge !== null ? `Daily: ${learnAge}h. Artifacts 24h: ${artifacts24h}. Total: ${totalArtifacts}` : `NEVER. Artifacts 24h: ${artifacts24h}`,
  })

  // 5. Operational Engine
  let opStatus: Status = "ROSU"
  let opDetail = "NEVER RUN"
  if (opEngineLast?.value) {
    try {
      const report = JSON.parse(opEngineLast.value)
      opStatus = report.anomalyCount.critical === 0 ? (report.anomalyCount.high === 0 ? "VERDE" : "GALBEN") : "ROSU"
      opDetail = `Anomalii: ${report.anomalyCount.total} (${report.anomalyCount.critical}C ${report.anomalyCount.high}H). Auto-remedieri: ${report.autoRemediationsApplied}`
    } catch {}
  }
  checks.push({ component: "Operational Engine", status: opStatus, detail: opDetail })

  // 6. Task Execution
  const kbRate = completed6h > 0 ? Math.round((kbHit6h / completed6h) * 100) : 0
  checks.push({
    component: "Task Execution (6h)",
    status: completed6h > 0 ? (kbRate <= 70 ? "VERDE" : "GALBEN") : "ROSU",
    detail: `${completed6h} completate. KB-hit: ${kbRate}%. Real: ${100 - kbRate}%`,
    metric: completed6h,
  })

  // 7. Review Queue
  checks.push({
    component: "Review Queue",
    status: reviewPending < 20 ? "VERDE" : reviewPending < 50 ? "GALBEN" : "ROSU",
    detail: `${reviewPending} asteapta review`,
    metric: reviewPending,
  })

  // 8. Escaladari Owner
  checks.push({
    component: "Escaladari Owner",
    status: ownerNotifs <= 1 ? "VERDE" : ownerNotifs <= 3 ? "GALBEN" : "ROSU",
    detail: `${ownerNotifs} active nerezolvate`,
    metric: ownerNotifs,
  })

  // 9. KB Health
  const validPct = totalArtifacts > 0 ? Math.round((validatedArtifacts / totalArtifacts) * 100) : 0
  checks.push({
    component: "KB Health",
    status: validPct >= 30 ? "VERDE" : validPct >= 15 ? "GALBEN" : "ROSU",
    detail: `${totalArtifacts} total, ${validatedArtifacts} validate (${validPct}%)`,
    metric: validPct,
  })

  // 10. Obiective
  checks.push({
    component: "Obiective",
    status: tasksOnObj > 0 ? "VERDE" : "GALBEN",
    detail: `${objectivesActive} active. ${tasksOnObj} task-uri in 7 zile`,
    metric: objectivesActive,
  })

  // 11. BLOCKED
  checks.push({
    component: "Task-uri BLOCKED",
    status: blocked === 0 ? "VERDE" : blocked < 10 ? "GALBEN" : "ROSU",
    detail: `${blocked} blocate`,
    metric: blocked,
  })

  // 12. Meta-organism KB
  checks.push({
    component: "Meta-organism KB",
    status: metaKB >= 70 ? "VERDE" : "ROSU",
    detail: `${metaKB} agenti`,
    metric: metaKB,
  })

  // 13. Cost
  const cost = completed6h * 0.02
  checks.push({
    component: "Cost estimat (6h)",
    status: cost < 1 ? "VERDE" : cost < 3 ? "GALBEN" : "ROSU",
    detail: `~$${cost.toFixed(2)} (${completed6h} tasks)`,
    metric: Math.round(cost * 100) / 100,
  })

  // 14. Productivitate
  const prodRatio = created6h > 0 ? Math.round(((created6h - cancelled6h) / created6h) * 100) : 100
  checks.push({
    component: "Productivitate (6h)",
    status: prodRatio >= 70 ? "VERDE" : prodRatio >= 40 ? "GALBEN" : "ROSU",
    detail: `Create: ${created6h}, Anulate: ${cancelled6h}. Ratio: ${prodRatio}%`,
    metric: prodRatio,
  })

  const verde = checks.filter(c => c.status === "VERDE").length
  const galben = checks.filter(c => c.status === "GALBEN").length
  const rosu = checks.filter(c => c.status === "ROSU").length

  return NextResponse.json({
    timestamp: now.toISOString(),
    verdict: rosu === 0 ? (galben === 0 ? "SANATOS" : "ATENTIE") : "PROBLEME",
    summary: { verde, galben, rosu, total: checks.length },
    checks,
  })
}
