/**
 * POST /api/v1/evolution/self-cycle
 *
 * Orice agent își evaluează propria stare și își completează gap-urile.
 * Introspecție: KB propriu, taskuri completate, feedback primit, blocaje.
 * Post-evaluare: solicită automat cunoaștere lipsă de la L2.
 *
 * Body: {
 *   agentRole: string,
 *   force?: boolean
 * }
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const SELF_CYCLE_INTERVAL_DAYS = 7
const KB_WEAK_THRESHOLD = 30

export async function POST(req: NextRequest) {
  const internalKey = process.env.INTERNAL_API_KEY
  const hasKey = internalKey && req.headers.get("x-internal-key") === internalKey
  if (!hasKey) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const body = await req.json()
  const { agentRole, force } = body

  if (!agentRole) {
    return NextResponse.json({ error: "agentRole obligatoriu" }, { status: 400 })
  }

  const p = prisma as any

  // Verifică că agentul există
  const agent = await p.agentDefinition.findFirst({
    where: { agentRole, isActive: true },
    select: { agentRole: true, displayName: true, isManager: true },
  })

  if (!agent) {
    return NextResponse.json({ error: `${agentRole} nu exista sau nu e activ` }, { status: 404 })
  }

  // Verifică ultimul self-cycle
  const lastSelfCycle = await p.kBEntry.findFirst({
    where: {
      agentRole,
      tags: { has: "self-cycle" },
      status: "PERMANENT",
    },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  })

  if (lastSelfCycle && !force) {
    const daysSince = (Date.now() - new Date(lastSelfCycle.createdAt).getTime()) / (24 * 60 * 60 * 1000)
    if (daysSince < SELF_CYCLE_INTERVAL_DAYS) {
      return NextResponse.json({
        message: `Ultimul self-cycle a fost acum ${Math.round(daysSince)} zile. Urmatorul e peste ${Math.round(SELF_CYCLE_INTERVAL_DAYS - daysSince)} zile. Foloseste force=true.`,
      })
    }
  }

  const now = new Date()
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  // ── Colectare date introspecție ──────────────────────────

  const [kbCount, kbRecentCount, tasksWeek, tasksDone, tasksBlocked, feedbackCount] = await Promise.all([
    p.kBEntry.count({ where: { agentRole, status: "PERMANENT" } }),
    p.kBEntry.count({ where: { agentRole, status: "PERMANENT", createdAt: { gte: oneWeekAgo } } }),
    p.agentTask.count({ where: { assignedTo: agentRole, createdAt: { gte: oneWeekAgo } } }).catch(() => 0),
    p.agentTask.count({ where: { assignedTo: agentRole, status: "COMPLETED", createdAt: { gte: oneWeekAgo } } }).catch(() => 0),
    p.agentTask.count({ where: { assignedTo: agentRole, blockerType: { not: null }, blockedAt: { gte: oneWeekAgo } } }).catch(() => 0),
    p.agentTask.count({ where: { assignedTo: agentRole, resultQuality: { not: null }, createdAt: { gte: oneWeekAgo } } }).catch(() => 0),
  ])

  // Scor self-assessment
  const kbScore = Math.min(100, Math.round(kbCount / 1.5)) // 150 entries = 100%
  const taskScore = tasksWeek > 0 ? Math.round(tasksDone / tasksWeek * 100) : 50
  const blockScore = tasksWeek > 0 ? Math.max(0, 100 - tasksBlocked * 25) : 100
  const growthScore = kbRecentCount > 0 ? Math.min(100, kbRecentCount * 10) : 0

  const compositeScore = Math.round(kbScore * 0.3 + taskScore * 0.3 + blockScore * 0.2 + growthScore * 0.2)

  const diagnostic = {
    kbTotal: kbCount,
    kbRecent: kbRecentCount,
    kbWeak: kbCount < KB_WEAK_THRESHOLD,
    tasksWeek,
    tasksDone,
    tasksBlocked,
    feedbackReceived: feedbackCount,
    scores: { kb: kbScore, tasks: taskScore, blocks: blockScore, growth: growthScore },
    composite: compositeScore,
  }

  // ── Acțiuni corective automate ──────────────────────────

  const actions: string[] = []

  // 1. KB slab → solicită propagare de la L2
  if (kbCount < KB_WEAK_THRESHOLD) {
    // Solicită cold start dacă nu a fost rulat
    const hasColdStart = await p.kBEntry.count({
      where: { agentRole, source: "SELF_INTERVIEW", status: "PERMANENT" },
    })

    if (hasColdStart === 0) {
      actions.push("solicitat-cold-start")
      // Creează task de cold start
      await p.agentTask.create({
        data: {
          businessId: "biz_jobgrade",
          assignedBy: agentRole,
          assignedTo: "COA",
          title: `Cold start necesar pentru ${agentRole} (auto-detectat)`,
          description: `Agentul ${agentRole} a detectat prin self-cycle ca nu are KB din self-interview. Ruleaza cold start: POST /api/v1/kb/cold-start { agentRole: "${agentRole}" }`,
          taskType: "PROCESS_EXECUTION",
          priority: "IMPORTANT",
          status: "ASSIGNED",
          tags: ["self-cycle", "cold-start-request", `agent:${agentRole}`],
        },
      }).catch(() => {})
    }

    actions.push("kb-gap-detectat")
  }

  // 2. Taskuri blocate → auto-escalare
  if (tasksBlocked > 2) {
    actions.push("blocaje-frecvente")
  }

  // 3. Nicio creștere KB → flag stagnare
  if (kbRecentCount === 0 && kbCount > 0) {
    actions.push("stagnare-kb")
  }

  // ── Salvare self-cycle ca KB entry ──────────────────────

  await p.kBEntry.create({
    data: {
      agentRole,
      kbType: "PERMANENT",
      content: JSON.stringify({
        type: "self-cycle",
        date: now.toISOString(),
        diagnostic,
        actions,
        compositeScore,
      }),
      tags: ["self-cycle", "introspectie", `score:${compositeScore}`],
      confidence: 0.9,
      source: "DISTILLED_INTERACTION",
      status: "PERMANENT",
      usageCount: 0,
      validatedAt: now,
    },
  })

  return NextResponse.json({
    ok: true,
    agentRole,
    displayName: agent.displayName,
    diagnostic,
    actions,
    compositeScore,
  })
}
