import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

function verifyInternalAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

export async function GET(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  try {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const p = prisma as any

    const [
      totalUsers,
      usersByStatus,
      activeSessionsToday,
      cardProgressRaw,
      communityStats,
      revenueTotal,
      revenueLast30d,
      recentMessages,
    ] = await Promise.all([
      // Total B2C users
      p.b2CUser.count().catch(() => 0),

      // Users by status (for conversion funnel)
      p.b2CUser.groupBy({
        by: ["status"],
        _count: { _all: true },
      }).catch(() => []),

      // Active sessions today
      p.b2CSession.count({
        where: {
          OR: [
            { status: "ACTIVE" },
            { startedAt: { gte: todayStart } },
          ],
        },
      }).catch(() => 0),

      // Card progress distribution
      p.b2CCardProgress.groupBy({
        by: ["card", "status"],
        _count: { _all: true },
      }).catch(() => []),

      // Community stats
      p.b2CCommunity.findMany({
        where: { isActive: true },
        select: {
          id: true,
          card: true,
          name: true,
          _count: { select: { members: true, messages: true } },
        },
      }).catch(() => []),

      // Total revenue (sum of PURCHASE type transactions)
      p.b2CCreditTransaction.aggregate({
        where: { type: "PURCHASE" },
        _sum: { amount: true },
      }).catch(() => ({ _sum: { amount: 0 } })),

      // Revenue last 30 days
      p.b2CCreditTransaction.aggregate({
        where: {
          type: "PURCHASE",
          createdAt: { gte: new Date(now.getTime() - 30 * 86400000) },
        },
        _sum: { amount: true },
      }).catch(() => ({ _sum: { amount: 0 } })),

      // Recent community messages (last 24h)
      p.b2CCommunityMessage.count({
        where: { createdAt: { gte: new Date(now.getTime() - 86400000) } },
      }).catch(() => 0),
    ])

    // Build conversion funnel
    const statusMap: Record<string, number> = {}
    for (const row of usersByStatus as any[]) {
      statusMap[row.status] = row._count._all
    }
    const funnel = {
      onboarding: statusMap["ONBOARDING"] || 0,
      active: statusMap["ACTIVE"] || 0,
      inactive: statusMap["INACTIVE"] || 0,
      suspended: statusMap["SUSPENDED"] || 0,
    }

    // Paying users = users with at least one PURCHASE transaction
    let payingUsers = 0
    try {
      const payingRaw = await p.b2CCreditTransaction.groupBy({
        by: ["userId"],
        where: { type: "PURCHASE" },
      })
      payingUsers = payingRaw.length
    } catch {
      payingUsers = 0
    }

    // Card progress distribution
    const cardDistribution: Record<string, Record<string, number>> = {}
    for (const row of cardProgressRaw as any[]) {
      if (!cardDistribution[row.card]) cardDistribution[row.card] = {}
      cardDistribution[row.card][row.status] = row._count._all
    }

    // Safety alerts — query B2C evolution entries with safety flags
    // Since no SafetyAlert model exists, we check for CRITIC/RIDICAT in metadata
    let safetyAlerts: any[] = []
    try {
      safetyAlerts = await p.b2CEvolutionEntry.findMany({
        where: {
          type: "SAFETY_ALERT",
          createdAt: { gte: new Date(now.getTime() - 7 * 86400000) },
        },
        select: {
          id: true,
          card: true,
          createdAt: true,
          metadata: true,
          userId: true,
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      })
    } catch {
      // SAFETY_ALERT may not exist in enum — fallback empty
      safetyAlerts = []
    }

    // Community activity
    const communities = (communityStats as any[]).map((c: any) => ({
      card: c.card,
      name: c.name,
      members: c._count.members,
      messages: c._count.messages,
    }))

    return NextResponse.json({
      totalUsers,
      activeSessionsToday,
      funnel: {
        ...funnel,
        paying: payingUsers,
      },
      cardDistribution,
      safetyAlerts: safetyAlerts.map((a: any) => ({
        id: a.id,
        card: a.card,
        createdAt: a.createdAt,
        level: a.metadata?.level || "UNKNOWN",
        reason: a.metadata?.reason || "",
      })),
      communities,
      recentMessages24h: recentMessages,
      revenue: {
        totalCredits: revenueTotal._sum?.amount || 0,
        last30dCredits: revenueLast30d._sum?.amount || 0,
      },
    })
  } catch (error) {
    console.error("[b2c-monitor] Error:", error)
    return NextResponse.json({ error: "internal" }, { status: 500 })
  }
}
