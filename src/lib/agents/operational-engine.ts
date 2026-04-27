/**
 * operational-engine.ts — Orchestrator operational integrat + self-check
 *
 * Integreaza toate procesele intr-un singur heartbeat:
 *   1. EFICIENTA — rata completare, kbHit, cost, timp rezolvare
 *   2. STRUCTURA — ierarhie, delegare, review-uri, escaladari
 *   3. COERENTA — obiective vs task-uri vs rezultate
 *   4. SELF-CHECK — verifica ca toate sistemele ruleaza corect
 *
 * Anomaliile detectate se clasifica:
 *   - AUTO_REMEDIERE: se repara singur (retry, re-assign)
 *   - ESCALARE_MANAGER: managerul responsabil primeste task
 *   - ESCALARE_OWNER: doar pentru decizii strategice reale
 *
 * Ruleaza la fiecare ciclu cron, DUPA executor + proactive loop + learning.
 */

import { prisma } from "@/lib/prisma"

// ═══ TIPURI ═══

export type AnomalyType =
  | "EFFICIENCY_DROP"           // productivitatea a scazut
  | "KB_OVER_RELIANCE"          // prea mult kbHit, prea putin executie reala
  | "STALE_REVIEW"              // review-uri nefacute de X zile
  | "LATERAL_STUCK"             // cereri laterale fara raspuns
  | "MANAGER_INACTIVE"          // manager nu a rulat cicluri
  | "OBJECTIVE_ORPHAN"          // obiectiv fara task-uri noi
  | "TASK_OBJECTIVE_MISMATCH"   // task-uri fara obiectiv legat
  | "PROACTIVE_LOOP_MISSING"    // proactive loop nu a rulat
  | "LEARNING_ENGINE_STALE"     // learning orchestrator nu a rulat
  | "CRON_MISSING"              // cron nu ruleaza
  | "ESCALATION_LEAK"           // escaladari ajung la Owner cand nu trebuie
  | "TASK_STAGNATION"           // task-uri care nu progreseaza

export type AnomalyAction = "AUTO_REMEDIERE" | "ESCALARE_MANAGER" | "ESCALARE_OWNER" | "LOG_ONLY"

export interface Anomaly {
  type: AnomalyType
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  title: string
  detail: string
  affectedEntities: string[]
  action: AnomalyAction
  autoRemediation?: string  // ce se face automat
}

export interface OperationalHealthReport {
  timestamp: string
  durationMs: number

  // Metrici
  efficiency: {
    completionRate24h: number    // % completate din procesate
    kbHitRate24h: number         // % rezolvate din KB (fara executie reala)
    realExecutionRate24h: number // % cu executie reala
    avgTaskAge: number           // varsta medie task-uri ASSIGNED (ore)
  }

  structure: {
    proactiveLoopLast48h: number       // cate cicluri manageriale
    reviewPendingCount: number          // task-uri care asteapta review
    reviewPendingOldest: number | null  // varsta celui mai vechi (ore)
    lateralStuckCount: number           // cereri laterale fara raspuns > 48h
    managerInactiveList: string[]       // manageri care n-au rulat ciclu
  }

  coherence: {
    objectivesActive: number
    objectivesWithRecentTasks: number   // obiective cu task-uri in ultimele 7 zile
    orphanObjectives: string[]          // obiective fara task-uri recente
    tasksWithoutObjective: number       // task-uri nelegatede niciun obiectiv
  }

  selfCheck: {
    proactiveLoopRunning: boolean
    learningOrchestratorRunning: boolean
    cronExecutorRunning: boolean
    signalsCronRunning: boolean
    kbHitHealthy: boolean              // < 80% kbHit = sanatos
    escalationHealthy: boolean          // < 3 escaladari Owner/zi = sanatos
  }

  anomalies: Anomaly[]
  anomalyCount: { total: number; critical: number; high: number; medium: number; low: number }
  autoRemediationsApplied: number
}

// ═══ ENGINE ═══

export async function runOperationalEngine(): Promise<OperationalHealthReport> {
  const start = Date.now()
  const now = new Date()
  const h24 = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const h48 = new Date(now.getTime() - 48 * 60 * 60 * 1000)
  const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const p = prisma as any
  const anomalies: Anomaly[] = []
  let autoRemediations = 0

  // ═══ 1. EFICIENTA ═══

  const [completed24h, total24h, kbHit24h, assignedTasks] = await Promise.all([
    prisma.agentTask.count({ where: { completedAt: { gte: h24 }, status: "COMPLETED" } }),
    prisma.agentTask.count({ where: { createdAt: { gte: h24 } } }),
    prisma.agentTask.count({ where: { completedAt: { gte: h24 }, status: "COMPLETED", kbHit: true } }),
    prisma.agentTask.findMany({
      where: { status: "ASSIGNED" },
      select: { createdAt: true },
    }),
  ])

  const completionRate = total24h > 0 ? Math.round((completed24h / total24h) * 100) : 0
  const kbHitRate = completed24h > 0 ? Math.round((kbHit24h / completed24h) * 100) : 0
  const realExecRate = 100 - kbHitRate
  const avgTaskAgeHours = assignedTasks.length > 0
    ? Math.round(assignedTasks.reduce((sum, t) => sum + (now.getTime() - t.createdAt.getTime()), 0) / assignedTasks.length / 3600000)
    : 0

  if (kbHitRate > 80) {
    anomalies.push({
      type: "KB_OVER_RELIANCE",
      severity: "HIGH",
      title: "Structura recita din KB in loc sa execute real",
      detail: `${kbHitRate}% din task-uri completate sunt KB-hit (recitate din memorie). Doar ${realExecRate}% sunt executie reala. Posibil: KB prea permisiv sau task-uri repetitive.`,
      affectedEntities: [],
      action: "ESCALARE_MANAGER",
    })
  }

  if (avgTaskAgeHours > 72) {
    anomalies.push({
      type: "TASK_STAGNATION",
      severity: "MEDIUM",
      title: `Task-uri stagnante: varsta medie ${avgTaskAgeHours}h`,
      detail: `${assignedTasks.length} task-uri ASSIGNED cu varsta medie de ${avgTaskAgeHours} ore. Posibil: executor nu proceseaza sau task-uri prea complexe.`,
      affectedEntities: [],
      action: "LOG_ONLY",
    })
  }

  // ═══ 2. STRUCTURA ═══

  const [cycleCount48h, reviewPending, lateralStuck] = await Promise.all([
    p.cycleLog?.count({ where: { startedAt: { gte: h48 } } }).catch(() => 0),
    prisma.agentTask.findMany({
      where: { status: "REVIEW_PENDING" as any },
      select: { completedAt: true, assignedBy: true },
    }),
    prisma.agentTask.count({
      where: {
        status: "BLOCKED",
        blockerType: "DEPENDENCY",
        tags: { hasSome: ["lateral-collaboration"] },
        blockedAt: { lt: h48 },
      },
    }).catch(() => 0),
  ])

  const reviewOldestHours = reviewPending.length > 0
    ? Math.round(Math.max(...reviewPending.map(t => (now.getTime() - (t.completedAt?.getTime() || now.getTime())) / 3600000)))
    : null

  // Manageri inactivi (nu au ciclu in 48h)
  const { MANAGER_CONFIGS } = await import("./manager-configs")
  const activeCycles = await p.cycleLog?.findMany({
    where: { startedAt: { gte: h48 } },
    select: { agentRole: true },
    distinct: ["agentRole"],
  }).catch(() => [])
  const activeManagers = new Set((activeCycles || []).map((c: any) => c.agentRole))
  const inactiveManagers = MANAGER_CONFIGS.map(c => c.agentRole).filter(r => !activeManagers.has(r))

  if (cycleCount48h === 0) {
    anomalies.push({
      type: "PROACTIVE_LOOP_MISSING",
      severity: "CRITICAL",
      title: "Zero cicluri manageriale in 48h — structura nu functioneaza",
      detail: "Niciun manager nu a rulat proactive-loop. Task-urile nu sunt review-uite, nu se creeaza task-uri noi, blocajele nu se rezolva.",
      affectedEntities: inactiveManagers,
      action: "ESCALARE_OWNER",
    })
  } else if (inactiveManagers.length > 0) {
    anomalies.push({
      type: "MANAGER_INACTIVE",
      severity: "MEDIUM",
      title: `${inactiveManagers.length} manageri inactivi in 48h`,
      detail: `Manageri fara cicluri: ${inactiveManagers.join(", ")}. Subordonatii lor nu sunt monitorizati.`,
      affectedEntities: inactiveManagers,
      action: "LOG_ONLY",
    })
  }

  if (reviewPending.length > 10) {
    anomalies.push({
      type: "STALE_REVIEW",
      severity: "HIGH",
      title: `${reviewPending.length} task-uri asteapta review`,
      detail: `Cel mai vechi: ${reviewOldestHours}h. Managerii trebuie sa review-eze.`,
      affectedEntities: [...new Set(reviewPending.map(t => t.assignedBy))],
      action: "ESCALARE_MANAGER",
    })
  }

  // Auto-remediere: REVIEW_PENDING > 5 zile → auto-approve
  const old5d = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)
  const staleReviews = await prisma.agentTask.updateMany({
    where: { status: "REVIEW_PENDING" as any, completedAt: { lt: old5d } },
    data: { status: "COMPLETED" },
  })
  if (staleReviews.count > 0) autoRemediations += staleReviews.count

  if (lateralStuck > 0) {
    anomalies.push({
      type: "LATERAL_STUCK",
      severity: "MEDIUM",
      title: `${lateralStuck} cereri laterale fara raspuns > 48h`,
      detail: "Cereri inter-departamentale blocate. Posibil: managerul omolog nu a delegat.",
      affectedEntities: [],
      action: "ESCALARE_MANAGER",
    })
  }

  // Auto-remediere: ASSIGNED > 14 zile → CANCELLED
  const old14d = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
  const zombieTasks = await prisma.agentTask.updateMany({
    where: { status: "ASSIGNED", createdAt: { lt: old14d } },
    data: { status: "CANCELLED" },
  })
  if (zombieTasks.count > 0) autoRemediations += zombieTasks.count

  // Auto-remediere: BLOCKED > 7 zile → CANCELLED
  const old7dDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const oldBlocked = await prisma.agentTask.updateMany({
    where: { status: "BLOCKED", blockedAt: { lt: old7dDate } },
    data: { status: "CANCELLED" },
  })
  if (oldBlocked.count > 0) autoRemediations += oldBlocked.count

  // ═══ 3. COERENTA ═══

  const [objectivesActive, objectivesWithTasks, tasksWithoutObj] = await Promise.all([
    prisma.organizationalObjective.count({ where: { status: { not: "ARCHIVED" } } }),
    prisma.organizationalObjective.count({
      where: {
        status: { not: "ARCHIVED" },
        id: {
          in: await prisma.agentTask.findMany({
            where: { createdAt: { gte: d7 }, objectiveId: { not: null } },
            select: { objectiveId: true },
            distinct: ["objectiveId"],
          }).then(tasks => tasks.map(t => t.objectiveId!).filter(Boolean)),
        },
      },
    }).catch(() => 0),
    prisma.agentTask.count({
      where: { status: { in: ["ASSIGNED", "ACCEPTED", "IN_PROGRESS"] }, objectiveId: null },
    }),
  ])

  const orphanCount = objectivesActive - objectivesWithTasks
  let orphanObjectives: string[] = []
  if (orphanCount > objectivesActive * 0.5) {
    const orphans = await prisma.organizationalObjective.findMany({
      where: { status: { not: "ARCHIVED" } },
      select: { code: true },
      take: 10,
    })
    orphanObjectives = orphans.map(o => o.code)

    anomalies.push({
      type: "OBJECTIVE_ORPHAN",
      severity: "HIGH",
      title: `${orphanCount}/${objectivesActive} obiective fara task-uri noi in 7 zile`,
      detail: "Obiectivele exista dar nimeni nu lucreaza activ la ele. Structura nu genereaza task-uri pe obiective.",
      affectedEntities: orphanObjectives,
      action: "ESCALARE_MANAGER",
    })
  }

  // ═══ 4. SELF-CHECK ═══

  const [learningLast, lastExecConfig] = await Promise.all([
    prisma.systemConfig.findUnique({ where: { key: "LEARNING_ORCHESTRATOR_LAST_DAILY" } }),
    prisma.systemConfig.findUnique({ where: { key: "EXECUTOR_CRON_ENABLED" } }),
  ])

  const learningRunning = learningLast?.value
    ? (now.getTime() - new Date(learningLast.value).getTime()) < 25 * 3600000
    : false
  const cronRunning = lastExecConfig?.value !== "false"
  const proactiveRunning = cycleCount48h > 0
  const kbHealthy = kbHitRate <= 80
  const escalationHealthy = true // TODO: count escaladari Owner/zi

  if (!learningRunning) {
    anomalies.push({
      type: "LEARNING_ENGINE_STALE",
      severity: "MEDIUM",
      title: "Learning orchestrator nu a rulat daily",
      detail: "Consolidare, distilare, maturitate — nu ruleaza. Cunoasterea nu evolueaza.",
      affectedEntities: [],
      action: "LOG_ONLY",
    })
  }

  // ═══ SALVARE SNAPSHOT ═══

  const report: OperationalHealthReport = {
    timestamp: now.toISOString(),
    durationMs: Date.now() - start,
    efficiency: {
      completionRate24h: completionRate,
      kbHitRate24h: kbHitRate,
      realExecutionRate24h: realExecRate,
      avgTaskAge: avgTaskAgeHours,
    },
    structure: {
      proactiveLoopLast48h: cycleCount48h || 0,
      reviewPendingCount: reviewPending.length,
      reviewPendingOldest: reviewOldestHours,
      lateralStuckCount: lateralStuck,
      managerInactiveList: inactiveManagers,
    },
    coherence: {
      objectivesActive,
      objectivesWithRecentTasks: objectivesWithTasks,
      orphanObjectives,
      tasksWithoutObjective: tasksWithoutObj,
    },
    selfCheck: {
      proactiveLoopRunning: proactiveRunning,
      learningOrchestratorRunning: learningRunning,
      cronExecutorRunning: cronRunning,
      signalsCronRunning: true, // TODO
      kbHitHealthy: kbHealthy,
      escalationHealthy,
    },
    anomalies,
    anomalyCount: {
      total: anomalies.length,
      critical: anomalies.filter(a => a.severity === "CRITICAL").length,
      high: anomalies.filter(a => a.severity === "HIGH").length,
      medium: anomalies.filter(a => a.severity === "MEDIUM").length,
      low: anomalies.filter(a => a.severity === "LOW").length,
    },
    autoRemediationsApplied: autoRemediations,
  }

  // Salvam snapshot
  try {
    await prisma.systemConfig.upsert({
      where: { key: "OPERATIONAL_ENGINE_LAST" },
      update: { value: JSON.stringify(report) },
      create: { key: "OPERATIONAL_ENGINE_LAST", value: JSON.stringify(report) },
    })
  } catch {}

  return report
}
