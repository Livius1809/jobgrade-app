/**
 * GET /api/v1/monitoring
 *
 * Endpoint unificat de monitorizare organism:
 *   1. Delegare COG (prin directori sau direct?)
 *   2. kbHit rate (procent taskuri rezolvate din KB)
 *   3. Task hygiene (BLOCKED/stale cleanup stats)
 *   4. Mother Maturity (snapshot scoruri agenti)
 *
 * Auth: x-internal-key sau session Owner
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const key = req.headers.get("x-internal-key")
  if (key !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const p = prisma as any
  const now = new Date()
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  // ═══ 1. DELEGARE COG ═══
  let cogDelegation = null
  try {
    // Taskuri create de COG in ultimele 7 zile
    const cogTasks = await prisma.agentTask.findMany({
      where: {
        assignedBy: "cog-agent",
        createdAt: { gte: last7d },
      },
      select: { assignedTo: true, createdAt: true },
    })

    // Cine sunt directorii (nivel 2 — subordonati directi COG)
    const cogDirectReports = await p.agentRelationship?.findMany({
      where: { parentRole: "cog-agent", isActive: true, relationType: "REPORTS_TO" },
      select: { childRole: true },
    }).catch(() => []) ?? []
    const directorRoles = new Set(cogDirectReports.map((r: any) => r.childRole))

    const toDirectors = cogTasks.filter(t => directorRoles.has(t.assignedTo)).length
    const toOthers = cogTasks.length - toDirectors
    const pctViaDirectors = cogTasks.length > 0
      ? Math.round((toDirectors / cogTasks.length) * 100)
      : 0

    cogDelegation = {
      totalTasks7d: cogTasks.length,
      toDirectors,
      toOthers,
      pctViaDirectors,
      directorRoles: Array.from(directorRoles),
      verdict: pctViaDirectors >= 80 ? "BINE" : pctViaDirectors >= 50 ? "PARTIAL" : "SLAB",
    }
  } catch (e: any) {
    cogDelegation = { error: e.message?.slice(0, 80) }
  }

  // ═══ 2. KB HIT RATE ═══
  let kbHitRate = null
  try {
    const total24h = await prisma.agentTask.count({
      where: { completedAt: { gte: last24h }, status: "COMPLETED" },
    })
    const kbHits24h = await prisma.agentTask.count({
      where: { completedAt: { gte: last24h }, status: "COMPLETED", kbHit: true },
    })

    const total7d = await prisma.agentTask.count({
      where: { completedAt: { gte: last7d }, status: "COMPLETED" },
    })
    const kbHits7d = await prisma.agentTask.count({
      where: { completedAt: { gte: last7d }, status: "COMPLETED", kbHit: true },
    })

    kbHitRate = {
      last24h: {
        total: total24h,
        kbHits: kbHits24h,
        pct: total24h > 0 ? Math.round((kbHits24h / total24h) * 100) : 0,
      },
      last7d: {
        total: total7d,
        kbHits: kbHits7d,
        pct: total7d > 0 ? Math.round((kbHits7d / total7d) * 100) : 0,
      },
      verdict: (() => {
        const pct = total7d > 0 ? (kbHits7d / total7d) * 100 : 0
        if (pct >= 40) return "EXCELENT"
        if (pct >= 20) return "BINE"
        if (pct >= 10) return "CRESTE"
        return "SLAB"
      })(),
    }
  } catch (e: any) {
    kbHitRate = { error: e.message?.slice(0, 80) }
  }

  // ═══ 3. TASK HYGIENE ═══
  let taskHygiene = null
  try {
    const statusCounts = await prisma.agentTask.groupBy({
      by: ["status"],
      _count: true,
    })

    const byStatus: Record<string, number> = {}
    for (const s of statusCounts) {
      byStatus[s.status] = s._count
    }

    // Taskuri BLOCKED > 7 zile (ar trebui sa fie 0 daca hygiene merge)
    const staleBlocked = await prisma.agentTask.count({
      where: {
        status: "BLOCKED",
        blockedAt: { lt: last7d },
      },
    })

    // Taskuri ASSIGNED > 7 zile (nu au fost procesate)
    const staleAssigned = await prisma.agentTask.count({
      where: {
        status: "ASSIGNED",
        createdAt: { lt: last7d },
      },
    })

    // Cancelled recent (cleaning automat)
    const cancelledRecent = await prisma.agentTask.count({
      where: {
        status: "CANCELLED",
        updatedAt: { gte: last7d },
      },
    })

    taskHygiene = {
      byStatus,
      staleBlocked,
      staleAssigned,
      cancelledRecent7d: cancelledRecent,
      verdict: staleBlocked === 0 && staleAssigned < 10 ? "CURAT" : "ATENTIE",
    }
  } catch (e: any) {
    taskHygiene = { error: e.message?.slice(0, 80) }
  }

  // ═══ 4. MOTHER MATURITY ═══
  let maturity = null
  try {
    const snapshot = await prisma.systemConfig.findUnique({
      where: { key: "AGENT_MATURITY_SNAPSHOT" },
    })

    if (snapshot) {
      const data = JSON.parse(snapshot.value)
      maturity = {
        lastUpdated: data.timestamp,
        summary: data.summary,
        topAgents: data.agents
          ?.sort((a: any, b: any) => b.score - a.score)
          ?.slice(0, 5)
          ?.map((a: any) => ({ agent: a.agent, level: a.level, score: a.score })),
        bottomAgents: data.agents
          ?.sort((a: any, b: any) => a.score - b.score)
          ?.slice(0, 5)
          ?.map((a: any) => ({ agent: a.agent, level: a.level, score: a.score })),
      }
    } else {
      maturity = { status: "NO_SNAPSHOT", note: "Orchestratorul daily nu a rulat inca" }
    }
  } catch (e: any) {
    maturity = { error: e.message?.slice(0, 80) }
  }

  // ═══ 5. LEARNING STATS (bonus) ═══
  let learningStats = null
  try {
    const totalArtifacts = await prisma.learningArtifact.count()
    const validated = await prisma.learningArtifact.count({ where: { validated: true } })
    const avgScore = await prisma.learningArtifact.aggregate({
      _avg: { effectivenessScore: true },
    })
    const recentCreated = await prisma.learningArtifact.count({
      where: { createdAt: { gte: last24h } },
    })

    learningStats = {
      totalArtifacts,
      validated,
      validatedPct: totalArtifacts > 0 ? Math.round((validated / totalArtifacts) * 100) : 0,
      avgEffectiveness: Math.round((avgScore._avg.effectivenessScore || 0) * 100) / 100,
      createdLast24h: recentCreated,
    }
  } catch (e: any) {
    learningStats = { error: e.message?.slice(0, 80) }
  }

  return NextResponse.json({
    timestamp: now.toISOString(),
    cogDelegation,
    kbHitRate,
    taskHygiene,
    maturity,
    learningStats,
  })
}
