/**
 * /api/v1/metrics-snapshot
 *
 * POST — Salveaza snapshot zilnic al metricilor organism (apelat de maintenance)
 * GET  — Returneaza trend pe 7/30 zile
 *
 * Snapshot-urile se salveaza in SystemConfig cu cheie METRICS_SNAPSHOT_YYYY-MM-DD
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

interface DailySnapshot {
  date: string
  tasksCompleted: number
  tasksCreated: number
  tasksCancelled: number
  kbHitRate: number
  realExecRate: number
  learningArtifactsCreated: number
  learningArtifactsTotal: number
  validatedPct: number
  reviewPending: number
  blocked: number
  escalationsOwner: number
  costEstimated: number
  productivityRatio: number
  proactiveLoopRan: boolean
  learningDailyRan: boolean
  agentsActive: number
}

// POST — Creaza/actualizeaza snapshot pentru azi
export async function POST(req: NextRequest) {
  const key = req.headers.get("x-internal-key")
  if (key !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const todayStart = new Date(today + "T00:00:00Z")
  const todayEnd = new Date(today + "T23:59:59Z")
  const p = prisma as any

  const [
    completed, created, cancelled, kbHit,
    artifactsCreated, artifactsTotal, validated,
    reviewPending, blocked, escalations,
    proactiveLast, learningLast,
  ] = await Promise.all([
    prisma.agentTask.count({ where: { completedAt: { gte: todayStart, lte: todayEnd }, status: "COMPLETED" } }),
    prisma.agentTask.count({ where: { createdAt: { gte: todayStart, lte: todayEnd } } }),
    prisma.agentTask.count({ where: { status: "CANCELLED", updatedAt: { gte: todayStart, lte: todayEnd } } }),
    prisma.agentTask.count({ where: { completedAt: { gte: todayStart, lte: todayEnd }, status: "COMPLETED", kbHit: true } }),
    prisma.learningArtifact.count({ where: { createdAt: { gte: todayStart, lte: todayEnd } } }),
    prisma.learningArtifact.count(),
    prisma.learningArtifact.count({ where: { validated: true } }),
    prisma.agentTask.count({ where: { status: "REVIEW_PENDING" as any } }),
    prisma.agentTask.count({ where: { status: "BLOCKED" } }),
    p.notification?.count({ where: { type: "AGENT_MESSAGE", createdAt: { gte: todayStart }, respondedAt: null } }).catch(() => 0) ?? 0,
    prisma.systemConfig.findUnique({ where: { key: "PROACTIVE_LOOP_LAST_RUN" } }).catch(() => null),
    prisma.systemConfig.findUnique({ where: { key: "LEARNING_ORCHESTRATOR_LAST_DAILY" } }).catch(() => null),
  ])

  const kbHitRate = completed > 0 ? Math.round((kbHit / completed) * 100) : 0
  const productivityRatio = created > 0 ? Math.round(((created - cancelled) / created) * 100) : 100

  const snapshot: DailySnapshot = {
    date: today,
    tasksCompleted: completed,
    tasksCreated: created,
    tasksCancelled: cancelled,
    kbHitRate,
    realExecRate: 100 - kbHitRate,
    learningArtifactsCreated: artifactsCreated,
    learningArtifactsTotal: artifactsTotal,
    validatedPct: artifactsTotal > 0 ? Math.round((validated / artifactsTotal) * 100) : 0,
    reviewPending,
    blocked,
    escalationsOwner: escalations,
    costEstimated: Math.round(completed * 0.02 * 100) / 100,
    productivityRatio,
    proactiveLoopRan: proactiveLast?.value ? (now.getTime() - new Date(proactiveLast.value).getTime()) < 24 * 3600000 : false,
    learningDailyRan: learningLast?.value ? (now.getTime() - new Date(learningLast.value).getTime()) < 25 * 3600000 : false,
    agentsActive: 73,
  }

  await prisma.systemConfig.upsert({
    where: { key: `METRICS_SNAPSHOT_${today}` },
    update: { value: JSON.stringify(snapshot) },
    create: { key: `METRICS_SNAPSHOT_${today}`, value: JSON.stringify(snapshot) },
  })

  return NextResponse.json({ ok: true, snapshot })
}

// GET — Trend pe 7 sau 30 zile
export async function GET(req: NextRequest) {
  const key = req.headers.get("x-internal-key")
  if (key !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const days = parseInt(url.searchParams.get("days") || "7")

  const snapshots: DailySnapshot[] = []
  for (let i = 0; i < days; i++) {
    const date = new Date(Date.now() - i * 24 * 3600000).toISOString().slice(0, 10)
    const config = await prisma.systemConfig.findUnique({ where: { key: `METRICS_SNAPSHOT_${date}` } }).catch(() => null)
    if (config?.value) {
      try { snapshots.push(JSON.parse(config.value)) } catch {}
    }
  }

  snapshots.reverse() // cronologic

  // Calcul trend-uri
  const trend = {
    tasksCompleted: snapshots.map(s => ({ date: s.date, value: s.tasksCompleted })),
    realExecRate: snapshots.map(s => ({ date: s.date, value: s.realExecRate })),
    costDaily: snapshots.map(s => ({ date: s.date, value: s.costEstimated })),
    learningGrowth: snapshots.map(s => ({ date: s.date, value: s.learningArtifactsTotal })),
    validatedPct: snapshots.map(s => ({ date: s.date, value: s.validatedPct })),
    productivityRatio: snapshots.map(s => ({ date: s.date, value: s.productivityRatio })),
  }

  // Direction: creste/scade/stabil
  function direction(values: number[]): "UP" | "DOWN" | "STABLE" {
    if (values.length < 2) return "STABLE"
    const first = values[0], last = values[values.length - 1]
    const diff = ((last - first) / (first || 1)) * 100
    if (diff > 5) return "UP"
    if (diff < -5) return "DOWN"
    return "STABLE"
  }

  return NextResponse.json({
    days,
    snapshotCount: snapshots.length,
    snapshots,
    trend,
    directions: {
      tasksCompleted: direction(snapshots.map(s => s.tasksCompleted)),
      realExecRate: direction(snapshots.map(s => s.realExecRate)),
      cost: direction(snapshots.map(s => s.costEstimated)),
      learningGrowth: direction(snapshots.map(s => s.learningArtifactsTotal)),
      validatedPct: direction(snapshots.map(s => s.validatedPct)),
      productivity: direction(snapshots.map(s => s.productivityRatio)),
    },
  })
}
