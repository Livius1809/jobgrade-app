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
import { selfCompleteBatch, type KBGap, type SelfCompleteResult } from "@/lib/kb/self-complete"

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

  // ── Obiectivele agentului (scopul evaluării) ─────────────

  const objectives = await p.$queryRaw`
    SELECT id, code, title, status, "currentValue", "targetValue", "metricName", "deadlineAt"
    FROM organizational_objectives
    WHERE status = 'ACTIVE'
      AND ("ownerRoles" @> ARRAY[${agentRole}]::text[] OR "contributorRoles" @> ARRAY[${agentRole}]::text[])
    ORDER BY priority
  `.catch(() => []) as any[]

  const objectiveIds = objectives.map((o: any) => o.id)

  // ── Colectare date introspecție (în raport cu obiectivele) ──

  const [kbCount, kbRecentCount, tasksWeek, tasksDone, tasksBlocked, feedbackCount, tasksOnObjectives, tasksDoneOnObjectives] = await Promise.all([
    p.kBEntry.count({ where: { agentRole, status: "PERMANENT" } }),
    p.kBEntry.count({ where: { agentRole, status: "PERMANENT", createdAt: { gte: oneWeekAgo } } }),
    p.agentTask.count({ where: { assignedTo: agentRole, createdAt: { gte: oneWeekAgo } } }).catch(() => 0),
    p.agentTask.count({ where: { assignedTo: agentRole, status: "COMPLETED", createdAt: { gte: oneWeekAgo } } }).catch(() => 0),
    p.agentTask.count({ where: { assignedTo: agentRole, blockerType: { not: null }, blockedAt: { gte: oneWeekAgo } } }).catch(() => 0),
    p.agentTask.count({ where: { assignedTo: agentRole, resultQuality: { not: null }, createdAt: { gte: oneWeekAgo } } }).catch(() => 0),
    // Taskuri legate de obiective (relevanță)
    objectiveIds.length > 0
      ? p.agentTask.count({ where: { assignedTo: agentRole, objectiveId: { in: objectiveIds }, createdAt: { gte: oneWeekAgo } } }).catch(() => 0)
      : 0,
    objectiveIds.length > 0
      ? p.agentTask.count({ where: { assignedTo: agentRole, objectiveId: { in: objectiveIds }, status: "COMPLETED", createdAt: { gte: oneWeekAgo } } }).catch(() => 0)
      : 0,
  ])

  // Progres pe obiective
  const objectiveProgress = objectives.map((o: any) => ({
    code: o.code,
    title: o.title,
    progress: o.targetValue > 0 ? Math.round((o.currentValue || 0) / o.targetValue * 100) : 0,
    overdue: o.deadlineAt && new Date(o.deadlineAt) < now,
  }))

  // Scor self-assessment (orientat pe obiective)
  const hasObjectives = objectives.length > 0
  const objectiveAlignmentScore = tasksWeek > 0 && hasObjectives
    ? Math.round(tasksOnObjectives / tasksWeek * 100) // % taskuri aliniate la obiective
    : hasObjectives ? 0 : 50 // fără obiective = neutru
  const taskScore = tasksWeek > 0 ? Math.round(tasksDone / tasksWeek * 100) : 50
  const blockScore = tasksWeek > 0 ? Math.max(0, 100 - tasksBlocked * 25) : 100
  const kbRelevanceScore = kbCount >= KB_WEAK_THRESHOLD ? 100 : Math.round(kbCount / KB_WEAK_THRESHOLD * 100)
  const objectiveProgressScore = hasObjectives
    ? Math.round(objectiveProgress.reduce((s, o) => s + o.progress, 0) / objectives.length)
    : 50

  // Ponderi: obiective > taskuri > aliniere > KB
  const compositeScore = Math.round(
    objectiveProgressScore * 0.30 +
    taskScore * 0.25 +
    objectiveAlignmentScore * 0.25 +
    kbRelevanceScore * 0.10 +
    blockScore * 0.10
  )

  const diagnostic = {
    objectives: {
      count: objectives.length,
      progress: objectiveProgress,
      alignmentScore: objectiveAlignmentScore,
      progressScore: objectiveProgressScore,
    },
    kb: { total: kbCount, recent: kbRecentCount, weak: kbCount < KB_WEAK_THRESHOLD },
    tasks: { week: tasksWeek, done: tasksDone, blocked: tasksBlocked, onObjectives: tasksOnObjectives, feedback: feedbackCount },
    scores: {
      objectiveProgress: objectiveProgressScore,
      taskCompletion: taskScore,
      objectiveAlignment: objectiveAlignmentScore,
      kbRelevance: kbRelevanceScore,
      unblocked: blockScore,
    },
    composite: compositeScore,
  }

  // ── Acțiuni corective (orientate pe obiective) ──────────

  const actions: string[] = []

  // 1. Obiective overdue → urgență
  const overdueObjectives = objectiveProgress.filter(o => o.overdue)
  if (overdueObjectives.length > 0) {
    actions.push(`obiective-overdue:${overdueObjectives.map(o => o.code).join(",")}`)
  }

  // 2. Aliniere slabă — lucrezi pe lucruri care nu sunt legate de obiective
  if (tasksWeek > 3 && objectiveAlignmentScore < 30 && hasObjectives) {
    actions.push("aliniere-slaba-obiective")
  }

  // 3. KB insuficient pentru obiective
  if (kbCount < KB_WEAK_THRESHOLD) {
    const hasColdStart = await p.kBEntry.count({
      where: { agentRole, source: "SELF_INTERVIEW", status: "PERMANENT" },
    })

    if (hasColdStart === 0) {
      actions.push("solicitat-cold-start")
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

    actions.push("kb-insuficient-pentru-obiective")
  }

  // 4. Blocaje frecvente
  if (tasksBlocked > 2) {
    actions.push("blocaje-frecvente")
  }

  // 5. Stagnare — nicio creștere KB și nicio mișcare pe obiective
  if (kbRecentCount === 0 && tasksDoneOnObjectives === 0 && hasObjectives) {
    actions.push("stagnare-pe-obiective")
  }

  // 6. Fără obiective — agentul nu e alocat pe nimic
  if (!hasObjectives) {
    actions.push("niciun-obiectiv-alocat")
  }

  // ── Auto-completare KB pentru obiective cu gap ──────────
  // Doar dacă are obiective și KB-ul nu acoperă subiectele necesare

  let selfCompleteResults: SelfCompleteResult[] = []

  if (hasObjectives && (kbCount < KB_WEAK_THRESHOLD || objectiveAlignmentScore < 50)) {
    // Extrage temele din obiective ca gaps de cunoaștere
    const gaps: KBGap[] = objectives
      .filter((o: any) => {
        const prog = objectiveProgress.find(p => p.code === o.code)
        return prog && prog.progress < 50 // obiective sub 50% progres
      })
      .map((o: any) => ({
        agentRole,
        topic: `${o.title} — cunoastere necesara pentru avansare`,
        objectiveCode: o.code,
        context: `Obiectiv: ${o.title}. Progres: ${objectiveProgress.find(p => p.code === o.code)?.progress || 0}%. Agent: ${agentRole}.`,
      }))

    if (gaps.length > 0) {
      selfCompleteResults = await selfCompleteBatch(gaps)
      const resolved = selfCompleteResults.filter(r => r.resolved)
      const escalated = selfCompleteResults.filter(r => r.source === "escalated-owner")

      if (resolved.length > 0) {
        actions.push(`auto-completare:${resolved.length}-gaps-rezolvate`)
      }
      if (escalated.length > 0) {
        actions.push(`escalat-owner:${escalated.length}-gaps-fara-sursa`)
      }
    }
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
        selfComplete: selfCompleteResults.length > 0
          ? selfCompleteResults.map(r => ({ topic: r.gap.topic, resolved: r.resolved, source: r.source }))
          : undefined,
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
    selfComplete: selfCompleteResults.length > 0
      ? {
          totalGaps: selfCompleteResults.length,
          resolved: selfCompleteResults.filter(r => r.resolved).length,
          escalated: selfCompleteResults.filter(r => r.source === "escalated-owner").length,
          details: selfCompleteResults.map(r => ({ topic: r.gap.topic, source: r.source, resolved: r.resolved, message: r.message })),
        }
      : undefined,
  })
}
