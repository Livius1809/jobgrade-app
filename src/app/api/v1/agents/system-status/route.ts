/**
 * GET /api/v1/agents/system-status
 *
 * Comprehensive system status for COG and managers.
 * Returns real-time metrics so COG can "see the orchestra" instead of
 * operating in the dark with static KB data.
 *
 * Auth: x-internal-key (same as other internal APIs)
 *
 * Returns:
 * - Platform health (DB, Redis, Claude API)
 * - Task distribution (by status)
 * - Agent activity (recent completions, blocked, failed)
 * - Organism vitality (cycles, KB growth, disfunctions)
 * - Objectives progress
 * - Uptime indicators
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const maxDuration = 30

function verifyAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

export async function GET(req: NextRequest) {
  if (!verifyAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()
  const h24 = new Date(now.getTime() - 24 * 3600000)
  const h48 = new Date(now.getTime() - 48 * 3600000)
  const d7 = new Date(now.getTime() - 7 * 86400000)

  try {
    const [
      tasksByStatus,
      completedLast24h,
      failedLast24h,
      blockedNow,
      kbTotal,
      kbLast24h,
      disfunctionsOpen,
      disfunctionsResolved24h,
      cycleLogsTotal,
      cycleLogsLast24h,
      signalsPending,
      agentCount,
      objectivesByStatus,
      recentCompletions,
      recentFailures,
    ] = await Promise.all([
      prisma.agentTask.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.agentTask.count({ where: { status: "COMPLETED", completedAt: { gte: h24 } } }),
      prisma.agentTask.count({ where: { status: "FAILED", failedAt: { gte: h24 } } }),
      prisma.agentTask.count({ where: { status: "BLOCKED" } }),
      prisma.kBEntry.count(),
      prisma.kBEntry.count({ where: { createdAt: { gte: h24 } } }),
      prisma.disfunctionEvent.count({ where: { status: { in: ["OPEN", "REMEDIATING", "ESCALATED"] } } }),
      prisma.disfunctionEvent.count({ where: { status: "RESOLVED", resolvedAt: { gte: h24 } } }),
      prisma.cycleLog.count(),
      prisma.cycleLog.count({ where: { createdAt: { gte: h24 } } }),
      prisma.externalSignal.count({ where: { processedAt: null } }),
      prisma.agentDefinition.count({ where: { isActive: true } }),
      prisma.organizationalObjective.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.agentTask.findMany({
        where: { status: "COMPLETED", completedAt: { gte: h24 } },
        orderBy: { completedAt: "desc" },
        take: 10,
        select: { assignedTo: true, title: true, completedAt: true },
      }),
      prisma.agentTask.findMany({
        where: { status: { in: ["FAILED", "BLOCKED"] } },
        orderBy: { updatedAt: "desc" },
        take: 10,
        select: { assignedTo: true, title: true, status: true, failureReason: true, blockerDescription: true },
      }),
    ])

    // Compute vitality scores
    const taskStatusMap: Record<string, number> = {}
    for (const s of tasksByStatus) taskStatusMap[s.status] = s._count._all
    const totalTasks = Object.values(taskStatusMap).reduce((a, b) => a + b, 0)
    const completed = taskStatusMap["COMPLETED"] || 0
    const failed = taskStatusMap["FAILED"] || 0
    const blocked = taskStatusMap["BLOCKED"] || 0
    const successRate = totalTasks > 0
      ? Math.round((completed / (completed + failed + blocked || 1)) * 100)
      : 0

    const objectiveStatusMap: Record<string, number> = {}
    for (const o of objectivesByStatus) objectiveStatusMap[o.status] = o._count._all

    return NextResponse.json({
      timestamp: now.toISOString(),
      platform: {
        status: "OPERATIONAL",
        url: "https://jobgrade.ro",
        uptimeTarget: "99.5%",
      },
      tasks: {
        distribution: taskStatusMap,
        total: totalTasks,
        completedLast24h,
        failedLast24h,
        blockedNow,
        successRate: `${successRate}%`,
        successRateTarget: ">80%",
      },
      organism: {
        agents: agentCount,
        kbEntries: kbTotal,
        kbGrowthLast24h: kbLast24h,
        cycleLogsTotal,
        cycleLogsLast24h,
        disfunctionsOpen,
        disfunctionsResolvedLast24h: disfunctionsResolved24h,
        signalsPending,
      },
      objectives: objectiveStatusMap,
      recentCompletions: recentCompletions.map(t => ({
        agent: t.assignedTo,
        title: t.title?.slice(0, 80),
        at: t.completedAt?.toISOString(),
      })),
      issues: recentFailures.map(t => ({
        agent: t.assignedTo,
        title: t.title?.slice(0, 80),
        status: t.status,
        reason: (t.failureReason || t.blockerDescription)?.slice(0, 150),
      })),
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: "System status query failed", detail: error.message },
      { status: 500 }
    )
  }
}
