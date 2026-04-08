import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

/**
 * GET /api/v1/disfunctions/cockpit
 *
 * Endpoint unic care returnează starea completă a sistemului de detecție într-un
 * singur request. Folosit de Owner Dashboard + raport ad-hoc Owner.
 *
 * Agregă:
 *  - Summary 24h pe clase / status / severitate
 *  - Top 10 cele mai critice OPEN events cu lanț escaladare
 *  - Activitatea pe niveluri (strategic/tactical/operational): activ vs D2
 *  - Auto-remedieri ultimele 24h (indicator sănătate sistem)
 *
 * Principiu: doar metadate + agregări, zero conținut semantic.
 */

function verifyInternalAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

export async function GET(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const now = new Date()
  const d1ago = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  // Parallel queries pentru viteză
  const [events, agents] = await Promise.all([
    prisma.disfunctionEvent.findMany({
      where: { detectedAt: { gte: d1ago } },
      orderBy: { detectedAt: "desc" },
    }),
    prisma.agentDefinition.findMany({
      where: { isActive: true },
      select: { agentRole: true, level: true, isManager: true },
    }),
  ])

  // Summary agregat
  const byClass = { D1_TECHNICAL: 0, D2_FUNCTIONAL_MGMT: 0, D3_BUSINESS_PROCESS: 0 }
  const byStatus = { OPEN: 0, REMEDIATING: 0, RESOLVED: 0, ESCALATED: 0 }
  const bySeverity = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 }
  let autoResolved = 0
  for (const e of events) {
    byClass[e.class]++
    byStatus[e.status]++
    bySeverity[e.severity]++
    if (e.status === "RESOLVED" && e.resolvedBy === "auto") autoResolved++
  }

  // Top 10 critice OPEN
  const openEvents = events.filter((e) => e.status === "OPEN")
  const severityRank: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }
  const topCritical = [...openEvents]
    .sort((a, b) => {
      const sa = severityRank[a.severity] ?? 0
      const sb = severityRank[b.severity] ?? 0
      if (sa !== sb) return sb - sa
      return a.detectedAt.getTime() - b.detectedAt.getTime()
    })
    .slice(0, 10)

  // Pentru fiecare top critical cu targetType=ROLE, adăugăm escalation chain (1 query/rol)
  const rolesInTop = topCritical
    .filter((e) => e.targetType === "ROLE")
    .map((e) => e.targetId)
  const uniqueRoles = [...new Set(rolesInTop)]

  const chainByRole = new Map<string, string[]>()
  if (uniqueRoles.length > 0) {
    // Batch-load all REPORTS_TO relationships upfront (single query)
    const allRels = await prisma.agentRelationship.findMany({
      where: { relationType: "REPORTS_TO", isActive: true },
      select: { childRole: true, parentRole: true },
    })
    // Build lookup: childRole → parentRole
    const parentByChild = new Map<string, string>()
    for (const rel of allRels) {
      parentByChild.set(rel.childRole, rel.parentRole)
    }
    // Traverse chains in memory (no additional queries)
    for (const role of uniqueRoles) {
      const chain: string[] = []
      let current = role
      const visited = new Set<string>()
      for (let i = 0; i < 10; i++) {
        if (visited.has(current)) break
        visited.add(current)
        const parent = parentByChild.get(current)
        if (!parent) break
        chain.push(parent)
        current = parent
      }
      chainByRole.set(role, chain)
    }
  }

  const topCriticalEnriched = topCritical.map((e) => ({
    id: e.id,
    class: e.class,
    severity: e.severity,
    targetType: e.targetType,
    targetId: e.targetId,
    signal: e.signal,
    detectedAt: e.detectedAt,
    ageMinutes: Math.round((Date.now() - e.detectedAt.getTime()) / 60000),
    escalationChain: e.targetType === "ROLE" ? chainByRole.get(e.targetId) ?? [] : [],
  }))

  // D2 pe niveluri (derivăm din events + organigramă)
  const roleByCode = new Map(agents.map((a) => [a.agentRole, a]))
  const d2Events = events.filter(
    (e) => e.class === "D2_FUNCTIONAL_MGMT" && e.status === "OPEN" && e.targetType === "ROLE",
  )
  const d2ByLevel = { STRATEGIC: 0, TACTICAL: 0, OPERATIONAL: 0 }
  const totalByLevel = { STRATEGIC: 0, TACTICAL: 0, OPERATIONAL: 0 }
  for (const a of agents) {
    totalByLevel[a.level]++
  }
  for (const e of d2Events) {
    const a = roleByCode.get(e.targetId)
    if (a) d2ByLevel[a.level]++
  }

  return NextResponse.json({
    generatedAt: now,
    windowHours: 24,
    totals: {
      events: events.length,
      open: byStatus.OPEN,
      resolved: byStatus.RESOLVED,
      escalated: byStatus.ESCALATED,
      autoResolved,
    },
    byClass,
    bySeverity,
    d2ByLevel,
    totalByLevel,
    topCritical: topCriticalEnriched,
  })
}
