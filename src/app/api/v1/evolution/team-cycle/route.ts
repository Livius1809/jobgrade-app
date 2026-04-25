/**
 * POST /api/v1/evolution/team-cycle
 *
 * Managerul evaluează starea echipei și decide dacă rulează un ciclu de evoluție.
 * Fiecare manager e responsabil pentru echipa lui — nu doar COG pentru tot.
 *
 * Body: {
 *   managerRole: "COG" | "COA" | "DMA" | etc.
 *   force?: boolean
 * }
 *
 * GET /api/v1/evolution/team-cycle?overview=true
 *   Returnează starea tuturor echipelor: cine a rulat, cine nu, cine e overdue.
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { runEvolutionCycle, getLastCycle, saveCycle, INTERNAL_CONFIG } from "@/lib/evolution-engine"

export const dynamic = "force-dynamic"
export const maxDuration = 120

// Interval maxim fără ciclu (zile) — după asta, safety net-ul intervine
const SAFETY_NET_DAYS = 7

export async function POST(req: NextRequest) {
  // Auth: internal key sau cron
  const internalKey = process.env.INTERNAL_API_KEY
  const hasKey = internalKey && req.headers.get("x-internal-key") === internalKey
  if (!hasKey) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const body = await req.json()
  const { managerRole, force } = body

  if (!managerRole) {
    return NextResponse.json({ error: "managerRole obligatoriu" }, { status: 400 })
  }

  const p = prisma as any

  // Verifică că e manager
  const manager = await p.agentDefinition.findFirst({
    where: { agentRole: managerRole, isManager: true, isActive: true },
    select: { agentRole: true, displayName: true },
  })

  if (!manager) {
    return NextResponse.json({ error: `${managerRole} nu e manager activ` }, { status: 404 })
  }

  // Găsește echipa (direct reports)
  const team = await p.agentRelationship.findMany({
    where: { parentRole: managerRole, relationType: "REPORTS_TO", isActive: true },
    select: { childRole: true },
  })

  const teamRoles = team.map((t: any) => t.childRole)

  // Verifică ultimul ciclu al acestui manager
  const subjectId = `team:${managerRole}`
  const lastCycle = await getLastCycle("INTERNAL", subjectId, prisma)

  if (lastCycle?.completedAt && !force) {
    const lastCompleted = new Date(lastCycle.completedAt)
    const nextDue = new Date(lastCompleted.getTime() + INTERNAL_CONFIG.cycleDays * 24 * 60 * 60 * 1000)
    if (new Date() < nextDue) {
      return NextResponse.json({
        message: `Ciclul urmator e programat pentru ${nextDue.toISOString().split("T")[0]}. Foloseste force=true pentru a rula acum.`,
        lastCycle: {
          cycleNumber: lastCycle.cycleNumber,
          completedAt: lastCycle.completedAt,
          compositeScore: lastCycle.newAwareness?.compositeScore || lastCycle.awareness?.compositeScore,
        },
      })
    }
  }

  // Rulează ciclul cu config INTERNAL dar scoped la echipa managerului
  const config = {
    ...INTERNAL_CONFIG,
    // Override collectData to scope to this team
    metadata: { managerRole, teamRoles, teamSize: teamRoles.length },
  }

  const cycle = await runEvolutionCycle(config, subjectId, lastCycle, prisma)
  await saveCycle(cycle, prisma)

  // Depune raport în Owner Inbox
  const owner = await p.user.findFirst({
    where: { role: { in: ["OWNER", "SUPER_ADMIN"] } },
    select: { id: true },
  })

  if (owner) {
    await p.notification.create({
      data: {
        userId: owner.id,
        type: "REPORT_GENERATED",
        title: `Ciclu evolutie echipa ${manager.displayName || managerRole}`,
        body: [
          `Scor: ${cycle.newAwareness?.compositeScore || cycle.awareness?.compositeScore}/100`,
          `Maturitate: ${cycle.newAwareness?.maturityLevel || cycle.awareness?.maturityLevel}`,
          `Echipa: ${teamRoles.join(", ")}`,
          `Gaps: ${cycle.diagnosis?.length || 0}`,
          cycle.narrativeSummary || "",
        ].join("\n"),
        read: false,
        sourceRole: managerRole,
        requestKind: "INFORMATION",
        requestData: JSON.stringify({
          isReport: true,
          category: "ciclu-evolutie",
          cycleNumber: cycle.cycleNumber,
          compositeScore: cycle.newAwareness?.compositeScore || cycle.awareness?.compositeScore,
        }),
      },
    })
  }

  return NextResponse.json({
    ok: true,
    managerRole,
    teamSize: teamRoles.length,
    cycleNumber: cycle.cycleNumber,
    compositeScore: cycle.newAwareness?.compositeScore || cycle.awareness?.compositeScore,
    maturityLevel: cycle.newAwareness?.maturityLevel || cycle.awareness?.maturityLevel,
    gapsFound: cycle.diagnosis?.length || 0,
    narrativeSummary: cycle.narrativeSummary,
  })
}

/**
 * GET — Overview: starea ciclurilor pe toate echipele
 */
export async function GET(req: NextRequest) {
  const p = prisma as any

  // Toți managerii activi
  const managers = await p.agentDefinition.findMany({
    where: { isManager: true, isActive: true },
    select: { agentRole: true, displayName: true, level: true },
  })

  const now = new Date()
  const results = []

  for (const mgr of managers) {
    // Echipa
    const team = await p.agentRelationship.findMany({
      where: { parentRole: mgr.agentRole, relationType: "REPORTS_TO", isActive: true },
      select: { childRole: true },
    })

    // Ultimul ciclu
    const subjectId = `team:${mgr.agentRole}`
    const lastEntries = await p.kBEntry.findMany({
      where: {
        agentRole: "EVOLUTION_ENGINE",
        tags: { hasEvery: ["evolution-cycle", "internal", subjectId] },
        status: "PERMANENT",
      },
      orderBy: { createdAt: "desc" },
      take: 1,
      select: { content: true, createdAt: true },
    })

    let lastCycle: any = null
    let daysSinceLastCycle: number | null = null
    let overdue = false

    if (lastEntries.length > 0) {
      lastCycle = JSON.parse(lastEntries[0].content)
      const completedAt = new Date(lastCycle.completedAt || lastEntries[0].createdAt)
      daysSinceLastCycle = Math.round((now.getTime() - completedAt.getTime()) / (24 * 60 * 60 * 1000))
      overdue = daysSinceLastCycle > SAFETY_NET_DAYS
    } else {
      overdue = true // niciun ciclu rulat vreodată
    }

    results.push({
      managerRole: mgr.agentRole,
      displayName: mgr.displayName,
      level: mgr.level,
      teamSize: team.length,
      teamRoles: team.map((t: any) => t.childRole),
      lastCycleNumber: lastCycle?.cycleNumber || 0,
      lastScore: lastCycle?.newAwareness?.compositeScore || lastCycle?.awareness?.compositeScore || null,
      lastMaturity: lastCycle?.newAwareness?.maturityLevel || lastCycle?.awareness?.maturityLevel || null,
      daysSinceLastCycle,
      overdue,
    })
  }

  // Sortăm: overdue first, apoi cele mai vechi
  results.sort((a, b) => {
    if (a.overdue && !b.overdue) return -1
    if (!a.overdue && b.overdue) return 1
    return (b.daysSinceLastCycle || 999) - (a.daysSinceLastCycle || 999)
  })

  const overdueCount = results.filter(r => r.overdue).length

  return NextResponse.json({
    totalManagers: results.length,
    overdueCount,
    safetyNetDays: SAFETY_NET_DAYS,
    teams: results,
  })
}
