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
    cronExecutorRunning: boolean        // executor a rulat in ultimele 2h
    cronExecutorLastRun: string         // timestamp ultimul run
    proactiveLoopRunning: boolean       // manageri au rulat cicluri in 48h
    learningOrchestratorRunning: boolean // learning daily a rulat
    kbHitHealthy: boolean               // < 80% kbHit = sanatos
    escalationHealthy: boolean           // < 3 escaladari Owner/zi = sanatos
    ownerEscalations24h: number         // cate escaladari Owner in 24h
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

  // Verificam proactive loop prin timestamp salvat de /agents/cycle
  const proactiveLastRun = await prisma.systemConfig.findUnique({ where: { key: "PROACTIVE_LOOP_LAST_RUN" } }).catch(() => null)
  const proactiveAge = proactiveLastRun?.value
    ? (now.getTime() - new Date(proactiveLastRun.value).getTime()) / 3600000
    : 999

  const [cycleCount48h, reviewPending, lateralStuck] = await Promise.all([
    // Fallback: si CycleLog daca exista
    p.cycleLog?.count({ where: { startedAt: { gte: h48 } } }).catch(() => (proactiveAge < 48 ? 1 : 0)),
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
      action: "AUTO_REMEDIERE",
      autoRemediation: "Cereri laterale blocate > 48h → CANCELLED automat",
    })
    // Self-healing: anulam cereri laterale blocate > 48h
    const cancelledLateral = await prisma.agentTask.updateMany({
      where: {
        status: "BLOCKED",
        blockerType: "DEPENDENCY",
        tags: { hasSome: ["lateral-collaboration"] },
        blockedAt: { lt: h48 },
      },
      data: { status: "CANCELLED" },
    })
    if (cancelledLateral.count > 0) autoRemediations += cancelledLateral.count
  }

  // Self-healing: ACCEPTED > 5 zile fara progres → revert la ASSIGNED
  const old5dAccepted = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)
  const staleAccepted = await prisma.agentTask.updateMany({
    where: { status: "ACCEPTED", acceptedAt: { lt: old5dAccepted } },
    data: { status: "ASSIGNED", acceptedAt: null },
  })
  if (staleAccepted.count > 0) autoRemediations += staleAccepted.count

  // Self-healing: task-uri cu acelasi titlu CANCELLED 3+ ori → blacklist (nu mai crea)
  // Acesta e deja implementat ca circuit breaker in task-executor.ts

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

  // Citim TOATE timestamps per nivel
  const checkKeys = [
    "LEARNING_ORCHESTRATOR_LAST_DAILY",
    "EXECUTOR_CRON_ENABLED",
    "EXECUTOR_LAST_RUN",
    "EXECUTOR_PROACTIVE_RUN",
    "EXECUTOR_SIGNALS_RUN",
    "EXECUTOR_RETRY_RUN",
  ]
  const configs = await Promise.all(
    checkKeys.map(key => prisma.systemConfig.findUnique({ where: { key } }).catch(() => null))
  )
  const configMap: Record<string, string | null> = {}
  checkKeys.forEach((key, i) => { configMap[key] = configs[i]?.value || null })

  const learningRunning = configMap["LEARNING_ORCHESTRATOR_LAST_DAILY"]
    ? (now.getTime() - new Date(configMap["LEARNING_ORCHESTRATOR_LAST_DAILY"]).getTime()) < 25 * 3600000
    : false
  const cronRunning = configMap["EXECUTOR_CRON_ENABLED"] !== "false"
  const proactiveRunning = cycleCount48h > 0
  const kbHealthy = kbHitRate <= 80

  // Verificam daca executor-ul a rulat in ultimele 2 ore (ar trebui la 30 min)
  const executorLastRun = configMap["EXECUTOR_LAST_RUN"]
  const executorRunning = executorLastRun
    ? (now.getTime() - new Date(executorLastRun).getTime()) < 2 * 3600000
    : false

  // Escaladari Owner — cate in ultimele 24h
  const ownerEscalations = await (p.notification?.count({
    where: { type: "AGENT_MESSAGE", createdAt: { gte: h24 }, respondedAt: null },
  }).catch(() => 0)) ?? 0
  const escalationHealthy = ownerEscalations < 3

  // Verificam fiecare nivel
  if (!executorRunning) {
    anomalies.push({
      type: "CRON_MISSING",
      severity: "CRITICAL",
      title: "Executor cron nu a rulat in ultimele 2 ore",
      detail: `Ultimul run: ${executorLastRun || "NICIODATA"}. Vercel cron poate fi oprit sau endpoint-ul esueaza.`,
      affectedEntities: [],
      action: "ESCALARE_OWNER",
    })
  }

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

  if (!proactiveRunning) {
    // Deja detectat mai sus ca PROACTIVE_LOOP_MISSING, nu duplicam
  }

  if (!escalationHealthy) {
    anomalies.push({
      type: "ESCALATION_LEAK",
      severity: "HIGH",
      title: `${ownerEscalations} escaladari Owner in 24h — prea multe`,
      detail: "Structura escaladeaza prea mult la Owner. Bucla de feedback ierarhic nu functioneaza corect.",
      affectedEntities: [],
      action: "LOG_ONLY",
    })
  }

  if (!kbHealthy) {
    // Deja detectat mai sus ca KB_OVER_RELIANCE, nu duplicam
  }

  // ═══ 5. RESOURCE MARKET — verificare bugete + propuneri redistribuire ═══

  try {
    const budgets = await p.resourceBudget?.findMany({
      where: { isActive: true },
      select: { agentRole: true, maxLlmCostPerDay: true, usedLlmCost: true },
    }).catch(() => []) ?? []

    if (budgets.length > 0) {
      const overBudget = budgets.filter((b: any) => b.usedLlmCost > b.maxLlmCostPerDay)
      const underBudget = budgets.filter((b: any) => b.usedLlmCost < b.maxLlmCostPerDay * 0.2)

      if (overBudget.length > 0) {
        anomalies.push({
          type: "EFFICIENCY_DROP",
          severity: "MEDIUM",
          title: `${overBudget.length} agenti peste buget zilnic`,
          detail: `Agenti: ${overBudget.map((b: any) => b.agentRole).join(", ")}. Posibil: task-uri prea complexe sau lipsa KB.`,
          affectedEntities: overBudget.map((b: any) => b.agentRole),
          action: "LOG_ONLY",
        })
      }

      // Auto-remediere: propune transfer buget de la sub-utilizati la supra-utilizati
      if (overBudget.length > 0 && underBudget.length > 0) {
        try {
          const { proposeNegotiations, checkBudgets } = await import("./resource-meter")
          const budgetInputs = budgets.map((b: any) => ({
            agentRole: b.agentRole,
            maxLlmCostPerDay: b.maxLlmCostPerDay,
            usedLlmCost: b.usedLlmCost,
          }))
          const checks = checkBudgets(budgetInputs)
          const proposals = proposeNegotiations(checks, budgetInputs)
          if (proposals.length > 0) {
            console.log(`[operational-engine] Resource proposals: ${proposals.length} transfers sugerate`)
          }
        } catch {}
      }
    }
  } catch {}

  // ═══ 6. WILD CARDS — provocari saptamanale (doar luni) ═══

  const dayOfWeek = now.getDay()
  if (dayOfWeek === 1) { // Luni
    try {
      const { generateWeeklyWildCards } = await import("./wild-card-generator")
      const weekOf = now.toISOString().slice(0, 10)
      // Verificam daca au fost deja generate saptamana asta
      const existing = await p.wildCard?.count({
        where: { weekOf },
      }).catch(() => 0) ?? 0

      if (existing === 0) {
        const agents = await p.agentDefinition?.findMany({
          where: { isActive: true, activityMode: "PROACTIVE_CYCLIC" },
          select: { agentRole: true },
        }).catch(() => []) ?? []
        const roles = agents.map((a: any) => a.agentRole)
        if (roles.length > 0) {
          const cards = generateWeeklyWildCards(roles, new Date(weekOf))
          for (const card of cards) {
            await p.wildCard?.create({ data: card }).catch(() => {})
          }
          console.log(`[operational-engine] Wild cards: ${cards.length} generate pentru saptamana ${weekOf}`)
        }
      }
    } catch {}
  }

  // ═══ 7. PAIR LEARNING — mentoring saptamanal (doar vineri) ═══

  if (dayOfWeek === 5) { // Vineri
    try {
      const { runPairLearning } = await import("./pair-learning")
      // Gasim perechi senior-junior cu KB complementar
      const agents = await p.agentDefinition?.findMany({
        where: { isActive: true, isManager: true },
        select: { agentRole: true, level: true },
        take: 5,
      }).catch(() => []) ?? []

      const juniors = await p.agentDefinition?.findMany({
        where: { isActive: true, isManager: false },
        select: { agentRole: true, level: true },
        take: 5,
      }).catch(() => []) ?? []

      // O singura pereche pe saptamana (cost-aware)
      if (agents.length > 0 && juniors.length > 0) {
        const senior = agents[Math.floor(Math.random() * agents.length)]
        const junior = juniors[Math.floor(Math.random() * juniors.length)]
        try {
          await runPairLearning(senior.agentRole, junior.agentRole, "best practices din experienta recenta", prisma)
          console.log(`[operational-engine] Pair learning: ${senior.agentRole} → ${junior.agentRole}`)
        } catch {}
      }
    } catch {}
  }

  // ═══ DIAGNOSTIC COMPLET (cele 14 verificari — integrat in self-check automat) ═══

  type DiagStatus = "VERDE" | "GALBEN" | "ROSU"
  const diagnosticChecks: Array<{ component: string; status: DiagStatus; detail: string }> = []

  // Check: BLOCKED
  const blockedCount = await prisma.agentTask.count({ where: { status: "BLOCKED" } })
  diagnosticChecks.push({
    component: "Task-uri BLOCKED",
    status: blockedCount === 0 ? "VERDE" : blockedCount < 10 ? "GALBEN" : "ROSU",
    detail: `${blockedCount} blocate`,
  })
  // Auto-remediere BLOCKED > 7 zile (deja existent mai sus)

  // Check: Meta-organism KB
  const metaKBCount = await p.kBEntry?.count({ where: { tags: { hasSome: ["meta-organism"] } } }).catch(() => 0) ?? 0
  diagnosticChecks.push({
    component: "Meta-organism KB",
    status: metaKBCount >= 70 ? "VERDE" : "ROSU",
    detail: `${metaKBCount} agenti`,
  })

  // Check: Cost estimat
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const todayCompleted = await prisma.agentTask.count({ where: { completedAt: { gte: todayStart }, status: "COMPLETED" } })
  const estimatedCost = todayCompleted * 0.02
  diagnosticChecks.push({
    component: "Cost estimat azi",
    status: estimatedCost < 3 ? "VERDE" : estimatedCost < 5 ? "GALBEN" : "ROSU",
    detail: `~$${estimatedCost.toFixed(2)} (${todayCompleted} tasks)`,
  })

  // Check: Productivitate
  const h6 = new Date(now.getTime() - 6 * 3600000)
  const created6h = await prisma.agentTask.count({ where: { createdAt: { gte: h6 } } })
  const cancelled6h = await prisma.agentTask.count({ where: { status: "CANCELLED", updatedAt: { gte: h6 } } })
  const prodRatio = created6h > 0 ? Math.round(((created6h - cancelled6h) / created6h) * 100) : 100
  diagnosticChecks.push({
    component: "Productivitate 6h",
    status: prodRatio >= 70 ? "VERDE" : prodRatio >= 40 ? "GALBEN" : "ROSU",
    detail: `Ratio: ${prodRatio}% (${created6h} create, ${cancelled6h} anulate)`,
  })

  // Check: Bucle (circuit breaker)
  const loopReconfig = await prisma.agentTask.count({ where: { status: "CANCELLED", updatedAt: { gte: h24 }, title: { contains: "Reconfigurare atributii" } } })
  const loopSelfCheck = await prisma.agentTask.count({ where: { status: "CANCELLED", updatedAt: { gte: h24 }, title: { contains: "Self-check" } } })
  const loopTotal = loopReconfig + loopSelfCheck
  diagnosticChecks.push({
    component: "Bucle detectate 24h",
    status: loopTotal === 0 ? "VERDE" : loopTotal < 10 ? "GALBEN" : "ROSU",
    detail: `${loopTotal} (reconfig: ${loopReconfig}, self-check: ${loopSelfCheck})`,
  })

  // Check: Maintenance cron
  const maintLast = await prisma.systemConfig.findUnique({ where: { key: "MAINTENANCE_LAST_RUN" } }).catch(() => null)
  const maintAge = maintLast?.value ? (now.getTime() - new Date(maintLast.value).getTime()) / 3600000 : 999
  diagnosticChecks.push({
    component: "Maintenance cron",
    status: maintAge < 3 ? "VERDE" : maintAge < 6 ? "GALBEN" : "ROSU",
    detail: maintAge < 999 ? `${Math.round(maintAge * 60)}min` : "NEVER",
  })

  const diagVerde = diagnosticChecks.filter(c => c.status === "VERDE").length
  const diagRosu = diagnosticChecks.filter(c => c.status === "ROSU").length

  // Salvam diagnosticul complet
  try {
    await prisma.systemConfig.upsert({
      where: { key: "DIAGNOSTIC_COMPLET_LAST" },
      update: { value: JSON.stringify({
        timestamp: now.toISOString(),
        verdict: diagRosu === 0 ? "SANATOS" : "PROBLEME",
        verde: diagVerde, rosu: diagRosu,
        checks: diagnosticChecks,
      }) },
      create: { key: "DIAGNOSTIC_COMPLET_LAST", value: JSON.stringify({
        timestamp: now.toISOString(),
        verdict: diagRosu === 0 ? "SANATOS" : "PROBLEME",
        verde: diagVerde, rosu: diagRosu,
        checks: diagnosticChecks,
      }) },
    })
  } catch {}

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
      cronExecutorRunning: executorRunning,
      cronExecutorLastRun: executorLastRun || "NEVER",
      proactiveLoopRunning: proactiveRunning,
      learningOrchestratorRunning: learningRunning,
      kbHitHealthy: kbHealthy,
      escalationHealthy,
      ownerEscalations24h: ownerEscalations,
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

  // Alerting ntfy — push notification la anomalii CRITICAL
  const criticalAnomalies = anomalies.filter(a => a.severity === "CRITICAL")
  if (criticalAnomalies.length > 0) {
    try {
      const ntfyTopic = process.env.NTFY_TOPIC || "jobgrade-owner-liviu-2026"
      const message = criticalAnomalies.map(a => `${a.title}`).join("\n")
      await fetch(`https://ntfy.sh/${ntfyTopic}`, {
        method: "POST",
        headers: {
          "Title": `JobGrade CRITICAL: ${criticalAnomalies.length} anomalii`,
          "Priority": "urgent",
          "Tags": "warning,rotating_light",
        },
        body: message,
      }).catch(() => {})
    } catch {}
  }

  return report
}
