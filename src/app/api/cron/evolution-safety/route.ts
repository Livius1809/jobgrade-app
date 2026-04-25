/**
 * Cron: Evolution Safety Net
 *
 * Rulează săptămânal (ex: luni dimineața).
 * Verifică fiecare manager: dacă nu a rulat ciclul de evoluție
 * pe echipa lui în ultimele SAFETY_NET_DAYS zile, îl rulează automat
 * și notifică atât managerul cât și Owner-ul.
 *
 * Principiu: managerul are inițiativa, dar organismul nu rămâne fără puls.
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { runEvolutionCycle, getLastCycle, saveCycle, INTERNAL_CONFIG } from "@/lib/evolution-engine"

export const dynamic = "force-dynamic"
export const maxDuration = 300

const SAFETY_NET_DAYS = 7

function verifyCron(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && req.headers.get("authorization") === `Bearer ${cronSecret}`) return true
  const internalKey = process.env.INTERNAL_API_KEY
  if (internalKey && req.headers.get("x-internal-key") === internalKey) return true
  return false
}

export async function GET(req: NextRequest) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const p = prisma as any
  const now = new Date()
  const cutoff = new Date(now.getTime() - SAFETY_NET_DAYS * 24 * 60 * 60 * 1000)

  // Toți managerii activi cu echipe
  const managers = await p.agentDefinition.findMany({
    where: { isManager: true, isActive: true },
    select: { agentRole: true, displayName: true },
  })

  const results: Array<{ manager: string; action: string; score?: number }> = []

  for (const mgr of managers) {
    const subjectId = `team:${mgr.agentRole}`

    // Echipa
    const team = await p.agentRelationship.findMany({
      where: { parentRole: mgr.agentRole, relationType: "REPORTS_TO", isActive: true },
      select: { childRole: true },
    })

    if (team.length === 0) {
      results.push({ manager: mgr.agentRole, action: "skip-no-team" })
      continue
    }

    // Ultimul ciclu
    const lastCycle = await getLastCycle("INTERNAL", subjectId, prisma)

    if (lastCycle?.completedAt) {
      const completedAt = new Date(lastCycle.completedAt)
      if (completedAt > cutoff) {
        results.push({ manager: mgr.agentRole, action: "ok-recent" })
        continue
      }
    }

    // Overdue — rulează automat
    console.log(`[evolution-safety] ${mgr.agentRole} overdue — autorun`)

    try {
      const config = {
        ...INTERNAL_CONFIG,
        metadata: {
          managerRole: mgr.agentRole,
          teamRoles: team.map((t: any) => t.childRole),
          triggeredBy: "safety-net",
        },
      }

      const cycle = await runEvolutionCycle(config, subjectId, lastCycle, prisma)
      await saveCycle(cycle, prisma)

      const score = cycle.newAwareness?.compositeScore || cycle.awareness?.compositeScore
      results.push({ manager: mgr.agentRole, action: "auto-run", score })

      // Notifică Owner
      const owner = await p.user.findFirst({
        where: { role: { in: ["OWNER", "SUPER_ADMIN"] } },
        select: { id: true },
      })

      if (owner) {
        await p.notification.create({
          data: {
            userId: owner.id,
            type: "REPORT_GENERATED",
            title: `Safety net: ciclu evolutie automat ${mgr.displayName || mgr.agentRole}`,
            body: `${mgr.displayName} nu a rulat ciclul in ${SAFETY_NET_DAYS} zile. Rulat automat.\nScor: ${score}/100\nEchipa: ${team.map((t: any) => t.childRole).join(", ")}`,
            read: false,
            sourceRole: mgr.agentRole,
            requestKind: "INFORMATION",
            requestData: JSON.stringify({ isReport: true, category: "safety-net", triggeredBy: "cron" }),
          },
        })
      }
    } catch (e: any) {
      console.error(`[evolution-safety] ${mgr.agentRole} error:`, e.message)
      results.push({ manager: mgr.agentRole, action: "error: " + e.message })
    }
  }

  const autoRuns = results.filter(r => r.action === "auto-run").length
  const ok = results.filter(r => r.action === "ok-recent").length

  return NextResponse.json({
    safetyNetDays: SAFETY_NET_DAYS,
    totalManagers: managers.length,
    alreadyCurrent: ok,
    autoRunTriggered: autoRuns,
    skipped: results.filter(r => r.action.startsWith("skip")).length,
    errors: results.filter(r => r.action.startsWith("error")).length,
    details: results,
  })
}
