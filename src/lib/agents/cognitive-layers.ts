/**
 * cognitive-layers.ts — 7 Straturi Cognitive Superioare ale Organismului
 *
 * Emulează procesele cognitive umane pe care un simplu task executor nu le are:
 *
 *  1. Meta-evaluator (Îndoiala productivă)
 *  2. Ritm cardiac variabil (Urgență adaptivă)
 *  3. Contradicție constructivă (Respingere argumentată)
 *  4. Detector anomalii (Intuiție sintetică)
 *  5. Învățare ponderată prin cost
 *  6. Curiozitate dirijată (Blind spots)
 *  7. Jurisprudență morală (Registru dileme)
 *
 * Fiecare strat e o funcție pură, integrabilă în ciclul cron executor.
 * Costul suplimentar total: ~1 apel Haiku per ciclu pentru stratul 1,
 * restul sunt calcule locale (zero API calls).
 */

import { prisma } from "@/lib/prisma"

// ══════════════════════════════════════════════════════════════════════════════
// STRAT 1: META-EVALUATOR — "De ce fac asta?"
// ══════════════════════════════════════════════════════════════════════════════
//
// Înainte de a executa un task, verifică:
//  - Obiectivul părinte mai e relevant? (nu e deja 100%?)
//  - Alt task COMPLETED din același obiectiv a rezolvat deja asta?
//  - Descrierea contrazice un KB entry recent?
//
// Returnează: PROCEED | SKIP_REDUNDANT | SKIP_OBJECTIVE_MET | CHALLENGE
// Cost: 0 apeluri Claude (doar DB queries)

export interface MetaEvaluation {
  verdict: "PROCEED" | "SKIP_REDUNDANT" | "SKIP_OBJECTIVE_MET" | "CHALLENGE"
  reason: string
}

export async function metaEvaluateTask(taskId: string): Promise<MetaEvaluation> {
  const task = await prisma.agentTask.findUnique({
    where: { id: taskId },
    select: {
      id: true, title: true, description: true,
      objectiveId: true, assignedTo: true, tags: true,
    },
  })

  if (!task) return { verdict: "PROCEED", reason: "Task negăsit — proceed by default" }

  // 1. Obiectivul e deja 100%?
  if (task.objectiveId) {
    const obj = await prisma.organizationalObjective.findUnique({
      where: { id: task.objectiveId },
      select: { currentValue: true, status: true },
    })
    if (obj && (obj.currentValue ?? 0) >= 100) {
      return { verdict: "SKIP_OBJECTIVE_MET", reason: `Obiectivul e deja la ${obj.currentValue}%` }
    }
    if (obj?.status !== "ACTIVE") {
      return { verdict: "SKIP_OBJECTIVE_MET", reason: `Obiectivul nu mai e ACTIVE (${obj?.status})` }
    }
  }

  // 2. Alt task COMPLETED din același obiectiv are output similar?
  if (task.objectiveId) {
    const siblings = await prisma.agentTask.findMany({
      where: {
        objectiveId: task.objectiveId,
        status: "COMPLETED",
        id: { not: task.id },
        result: { not: null },
      },
      select: { title: true, result: true },
      take: 10,
    })

    const taskWords = (task.title + " " + (task.description || "")).toLowerCase().split(/\s+/)
    for (const sib of siblings) {
      const sibWords = (sib.title + " " + (sib.result || "")).toLowerCase()
      const overlap = taskWords.filter(w => w.length > 4 && sibWords.includes(w)).length
      if (overlap >= 5) {
        return {
          verdict: "SKIP_REDUNDANT",
          reason: `Task similar deja completat: "${sib.title.slice(0, 60)}" (${overlap} cuvinte comune)`,
        }
      }
    }
  }

  // 3. KB entry recent contrazice taskul? (ex: "nu face X" dar taskul e "fa X")
  const recentKB = await prisma.kBEntry.findMany({
    where: {
      agentRole: task.assignedTo,
      status: "PERMANENT",
      tags: { hasSome: task.tags.slice(0, 3) },
    },
    select: { content: true },
    take: 5,
    orderBy: { createdAt: "desc" },
  })

  for (const kb of recentKB) {
    const content = kb.content.toLowerCase()
    if (
      (content.includes("nu face") || content.includes("nu mai") || content.includes("anulat") || content.includes("deprecat")) &&
      task.title && content.includes(task.title.toLowerCase().split(" ").slice(0, 3).join(" "))
    ) {
      return {
        verdict: "CHALLENGE",
        reason: `KB entry contrazice taskul: "${kb.content.slice(0, 80)}..."`,
      }
    }
  }

  return { verdict: "PROCEED", reason: "Nicio contradicție detectată" }
}


// ══════════════════════════════════════════════════════════════════════════════
// STRAT 2: RITM CARDIAC VARIABIL — "Cât de rapid bat acum?"
// ══════════════════════════════════════════════════════════════════════════════
//
// Batch size dinamic bazat pe:
//  - Deadline-uri apropiate (< 48h) → accelerare
//  - Owner activ (sesiune Claude în ultimele 2h) → accelerare
//  - Taskuri CRITICAL pendinte → accelerare
//  - Zero presiune → economisire (batch mic)
//
// Returnează: batch size optim (2-20)
// Cost: 0 apeluri Claude

export interface HeartbeatConfig {
  batchSize: number
  reason: string
  urgencyLevel: "CALM" | "ALERT" | "URGENT" | "EMERGENCY"
}

export async function calculateHeartbeat(): Promise<HeartbeatConfig> {
  const now = new Date()
  const h48 = new Date(now.getTime() - 48 * 3600000)
  const h2 = new Date(now.getTime() - 2 * 3600000)

  const [criticalTasks, deadlineSoon, recentKBFromOwner, totalAssigned] = await Promise.all([
    // Taskuri CRITICAL pendinte
    prisma.agentTask.count({
      where: { status: "ASSIGNED", priority: "CRITICAL" },
    }),
    // Taskuri cu deadline < 48h
    prisma.agentTask.count({
      where: {
        status: { in: ["ASSIGNED", "IN_PROGRESS"] },
        deadlineAt: { lte: h48, gte: now },
      },
    }),
    // Owner activ (KB entries EXPERT_HUMAN recente = sesiune Claude)
    prisma.kBEntry.count({
      where: { source: "EXPERT_HUMAN", createdAt: { gte: h2 } },
    }),
    // Total ASSIGNED
    prisma.agentTask.count({ where: { status: "ASSIGNED" } }),
  ])

  // Scor urgență 0-100
  let urgencyScore = 0
  const reasons: string[] = []

  if (criticalTasks > 0) {
    urgencyScore += 40
    reasons.push(`${criticalTasks} CRITICAL pendinte`)
  }
  if (deadlineSoon > 0) {
    urgencyScore += 30
    reasons.push(`${deadlineSoon} cu deadline < 48h`)
  }
  if (recentKBFromOwner > 0) {
    urgencyScore += 20
    reasons.push("Owner activ (sesiune Claude recentă)")
  }
  if (totalAssigned > 50) {
    urgencyScore += 10
    reasons.push(`coadă mare: ${totalAssigned} ASSIGNED`)
  }

  // Batch size: 2 (calm) → 20 (emergency)
  let batchSize: number
  let urgencyLevel: HeartbeatConfig["urgencyLevel"]

  if (urgencyScore >= 70) {
    batchSize = 20
    urgencyLevel = "EMERGENCY"
  } else if (urgencyScore >= 40) {
    batchSize = 15
    urgencyLevel = "URGENT"
  } else if (urgencyScore >= 20) {
    batchSize = 10
    urgencyLevel = "ALERT"
  } else {
    batchSize = 5
    urgencyLevel = "CALM"
  }

  return {
    batchSize,
    urgencyLevel,
    reason: reasons.length > 0 ? reasons.join("; ") : "Fără presiune — ritm economic",
  }
}


// ══════════════════════════════════════════════════════════════════════════════
// STRAT 3: CONTRADICȚIE CONSTRUCTIVĂ — "Nu sunt de acord"
// ══════════════════════════════════════════════════════════════════════════════
//
// Într-un tool_use output, agentul poate returna status="objection" cu un argument.
// Acest strat evaluează obiecția: e validă sau nu?
//
// Dacă validă → taskul e redirecționat sau obiectivul e adaptat.
// Dacă invalidă → taskul e re-executat cu context suplimentar.
//
// Cost: 0 apeluri Claude (evaluare pe baza KB)

export interface ObjectionEvaluation {
  valid: boolean
  action: "ACCEPT_REDIRECT" | "ACCEPT_ADAPT_OBJECTIVE" | "OVERRIDE_REEXECUTE"
  reasoning: string
}

export async function evaluateObjection(
  taskId: string,
  objectionText: string,
  assignedTo: string
): Promise<ObjectionEvaluation> {
  // Căutăm dovezi în KB care susțin obiecția
  const supportingKB = await prisma.kBEntry.findMany({
    where: {
      status: "PERMANENT",
      agentRole: assignedTo,
    },
    select: { content: true },
    take: 10,
    orderBy: { createdAt: "desc" },
  })

  const objLower = objectionText.toLowerCase()
  let supportScore = 0

  // Verificăm dacă KB-ul agentului susține obiecția
  for (const kb of supportingKB) {
    const kbLower = kb.content.toLowerCase()
    // Cuvinte cheie din obiecție prezente în KB
    const words = objLower.split(/\s+/).filter(w => w.length > 4)
    const matches = words.filter(w => kbLower.includes(w)).length
    if (matches >= 3) supportScore += 20
  }

  // Verificăm dacă taskul contrazice un obiectiv mai mare
  const task = await prisma.agentTask.findUnique({
    where: { id: taskId },
    select: { objectiveId: true },
  })

  if (task?.objectiveId) {
    const obj = await prisma.organizationalObjective.findUnique({
      where: { id: task.objectiveId },
      select: { title: true, tags: true },
    })
    // Dacă obiecția menționează obiectivul = agentul vede imaginea de ansamblu
    if (obj?.title && objLower.includes(obj.title.toLowerCase().split(" ")[0])) {
      supportScore += 30
    }
  }

  // Verificăm dacă alt agent a semnalat ceva similar
  const similarSignals = await prisma.agentTask.count({
    where: {
      assignedTo,
      status: "BLOCKED",
      blockerDescription: { not: null },
    },
  })
  if (similarSignals >= 2) supportScore += 15

  // Decizie
  if (supportScore >= 50) {
    return {
      valid: true,
      action: "ACCEPT_ADAPT_OBJECTIVE",
      reasoning: `Obiecție susținută de ${supportScore} puncte evidență (KB + context obiectiv + semnale similare)`,
    }
  } else if (supportScore >= 25) {
    return {
      valid: true,
      action: "ACCEPT_REDIRECT",
      reasoning: `Obiecție parțial susținută (${supportScore}p). Redirecționare recomandată.`,
    }
  }

  return {
    valid: false,
    action: "OVERRIDE_REEXECUTE",
    reasoning: `Obiecție nesusținută (${supportScore}p). Re-execuție cu context suplimentar.`,
  }
}


// ══════════════════════════════════════════════════════════════════════════════
// STRAT 4: DETECTOR ANOMALII — "Ceva nu e în regulă"
// ══════════════════════════════════════════════════════════════════════════════
//
// Caută discontinuități statistice fără a ști ce caută:
//  - Agent care era activ → brusc inactiv
//  - KB crește dar success rate scade
//  - Obiectiv la 100% dar taskuri noi continuă să apară
//  - Cost/task crește brusc
//
// Returnează anomalii detectate + severitate
// Cost: 0 apeluri Claude

export interface Anomaly {
  type: "ACTIVITY_DROP" | "EFFICIENCY_PARADOX" | "ZOMBIE_OBJECTIVE" | "COST_SPIKE" | "ORPHAN_PATTERN"
  severity: "LOW" | "MEDIUM" | "HIGH"
  signal: string
  suggestedAction: string
}

export async function detectAnomalies(): Promise<Anomaly[]> {
  const anomalies: Anomaly[] = []
  const now = new Date()
  const h48 = new Date(now.getTime() - 48 * 3600000)
  const h168 = new Date(now.getTime() - 7 * 24 * 3600000) // 7 zile

  // 1. ACTIVITY_DROP: agent activ săptămâna trecută, 0 activitate 48h
  const recentActiveAgents = await prisma.executionTelemetry.findMany({
    where: { createdAt: { gte: h168, lt: h48 } },
    select: { agentRole: true },
    distinct: ["agentRole"],
  })
  const currentActiveAgents = new Set(
    (await prisma.executionTelemetry.findMany({
      where: { createdAt: { gte: h48 } },
      select: { agentRole: true },
      distinct: ["agentRole"],
    })).map(a => a.agentRole)
  )

  for (const agent of recentActiveAgents) {
    if (!currentActiveAgents.has(agent.agentRole)) {
      anomalies.push({
        type: "ACTIVITY_DROP",
        severity: "MEDIUM",
        signal: `${agent.agentRole} era activ săptămâna trecută dar 0 activitate în 48h`,
        suggestedAction: "Verifică dacă are taskuri ASSIGNED sau dacă e blocat",
      })
    }
  }

  // 2. EFFICIENCY_PARADOX: KB crește dar success rate scade
  const kbGrowth7d = await prisma.kBEntry.count({ where: { createdAt: { gte: h168 } } })
  const tasksCompleted7d = await prisma.agentTask.count({
    where: { status: "COMPLETED", completedAt: { gte: h168 } },
  })
  const tasksFailed7d = await prisma.agentTask.count({
    where: { status: "FAILED", failedAt: { gte: h168 } },
  })
  const successRate = tasksCompleted7d + tasksFailed7d > 0
    ? Math.round((tasksCompleted7d / (tasksCompleted7d + tasksFailed7d)) * 100)
    : 100

  if (kbGrowth7d > 50 && successRate < 70) {
    anomalies.push({
      type: "EFFICIENCY_PARADOX",
      severity: "HIGH",
      signal: `KB crește (+${kbGrowth7d} entries) dar success rate e doar ${successRate}%`,
      suggestedAction: "KB-ul conține probabil informație de calitate scăzută — audit necesar",
    })
  }

  // 3. ZOMBIE_OBJECTIVE: obiectiv la 100% dar taskuri noi continuă
  const completedObjs = await prisma.organizationalObjective.findMany({
    where: { status: "ACTIVE", currentValue: { gte: 100 } },
    select: { id: true, code: true },
  })
  for (const obj of completedObjs) {
    const newTasks = await prisma.agentTask.count({
      where: {
        objectiveId: obj.id,
        status: "ASSIGNED",
        createdAt: { gte: h168 },
      },
    })
    if (newTasks > 0) {
      anomalies.push({
        type: "ZOMBIE_OBJECTIVE",
        severity: "MEDIUM",
        signal: `${obj.code} e la 100% dar ${newTasks} taskuri noi create în 7 zile`,
        suggestedAction: "Obiectivul trebuie marcat COMPLETED sau taskurile anulate",
      })
    }
  }

  // 4. COST_SPIKE: cost/task azi > 3x media ultimelor 7 zile
  const costToday = await prisma.executionTelemetry.aggregate({
    where: { createdAt: { gte: new Date(now.getTime() - 24 * 3600000) } },
    _avg: { estimatedCostUSD: true },
    _count: { id: true },
  })
  const costWeek = await prisma.executionTelemetry.aggregate({
    where: { createdAt: { gte: h168 } },
    _avg: { estimatedCostUSD: true },
  })

  const avgToday = costToday._avg.estimatedCostUSD ?? 0
  const avgWeek = costWeek._avg.estimatedCostUSD ?? 0
  if (avgWeek > 0 && avgToday > avgWeek * 3 && (costToday._count?.id ?? 0) >= 5) {
    anomalies.push({
      type: "COST_SPIKE",
      severity: "HIGH",
      signal: `Cost/task azi $${avgToday.toFixed(3)} vs media $${avgWeek.toFixed(3)} (${Math.round(avgToday / avgWeek)}x)`,
      suggestedAction: "Verifică dacă taskuri non-critice folosesc Sonnet în loc de Haiku",
    })
  }

  // 5. ORPHAN_PATTERN: > 30% taskuri noi fără obiectiv
  const newTasks7d = await prisma.agentTask.count({ where: { createdAt: { gte: h168 } } })
  const newOrphans7d = await prisma.agentTask.count({
    where: { createdAt: { gte: h168 }, objectiveId: null },
  })
  if (newTasks7d > 10 && newOrphans7d / newTasks7d > 0.3) {
    anomalies.push({
      type: "ORPHAN_PATTERN",
      severity: "MEDIUM",
      signal: `${Math.round((newOrphans7d / newTasks7d) * 100)}% din taskurile noi sunt fără obiectiv (${newOrphans7d}/${newTasks7d})`,
      suggestedAction: "Ciclurile proactive creează taskuri fără legătură la strategie",
    })
  }

  return anomalies
}


// ══════════════════════════════════════════════════════════════════════════════
// STRAT 5: ÎNVĂȚARE PONDERATĂ PRIN COST — "Lecția asta a costat"
// ══════════════════════════════════════════════════════════════════════════════
//
// KB entries din eșecuri sau execuții costisitoare primesc confidence multiplicat.
// Formula: confidence = base × (1 + costFactor) × (1 + impactFactor)
//
// Cost: 0 apeluri Claude

export function calculateLearningWeight(input: {
  baseCost: number         // costul execuției în USD
  taskFailed: boolean      // a eșuat taskul?
  retryCount: number       // de câte ori a fost reîncercat?
  impactClients: number    // câți clienți ar fi fost afectați (0 = intern)
  isFromProdBug: boolean   // provine dintr-un bug în producție?
}): number {
  let weight = 1.0

  // Costul execuției: fiecare $0.10 adaugă 0.5 la weight
  weight += input.baseCost * 5

  // Eșecurile sunt lecții mai valoroase
  if (input.taskFailed) weight *= 2
  if (input.retryCount >= 3) weight *= 1.5

  // Impactul asupra clienților
  if (input.impactClients > 0) weight *= (1 + input.impactClients * 0.3)

  // Bug în producție = lecție critică
  if (input.isFromProdBug) weight *= 3

  return Math.round(Math.min(weight, 20) * 100) / 100 // cap la 20x
}

/**
 * Actualizează confidence pentru KB entries recente pe baza costului execuției.
 * Apelat periodic (la fiecare ciclu cron).
 */
export async function applyWeightedLearning(): Promise<number> {
  const h24 = new Date(Date.now() - 24 * 3600000)

  // Taskuri completate/eșuate cu telemetry în ultimele 24h
  const recentTasks = await prisma.agentTask.findMany({
    where: {
      status: { in: ["COMPLETED", "FAILED"] },
      updatedAt: { gte: h24 },
    },
    select: {
      id: true, assignedTo: true, status: true, tags: true,
      result: true, failureReason: true,
    },
    take: 50,
  })

  let updated = 0

  for (const task of recentTasks) {
    // Găsim telemetry asociată
    const telemetry = await prisma.executionTelemetry.findFirst({
      where: { taskId: task.id },
      select: { estimatedCostUSD: true },
    })

    if (!telemetry) continue

    const retryTag = task.tags.find(t => t.startsWith("retry:"))
    const retryCount = retryTag ? parseInt(retryTag.split(":")[1]) : 0

    const weight = calculateLearningWeight({
      baseCost: telemetry.estimatedCostUSD,
      taskFailed: task.status === "FAILED",
      retryCount,
      impactClients: 0,
      isFromProdBug: task.tags.includes("prod-bug"),
    })

    // Actualizăm KB entries ale agentului create în ultima oră cu weight-ul calculat
    if (weight > 1.5) {
      const result = await prisma.kBEntry.updateMany({
        where: {
          agentRole: task.assignedTo,
          createdAt: { gte: new Date(Date.now() - 3600000) },
          confidence: { lt: weight },
        },
        data: { confidence: weight },
      })
      updated += result.count
    }
  }

  return updated
}


// ══════════════════════════════════════════════════════════════════════════════
// STRAT 6: CURIOZITATE DIRIJATĂ — "Ce nu știu?"
// ══════════════════════════════════════════════════════════════════════════════
//
// Identifică proactiv:
//  - Agenți fără KB entries (blind spots)
//  - Zone din platformă fără coverage
//  - Competențe concentrate pe un singur agent (SPOF)
//
// Generează taskuri de investigare ÎNAINTE să fie nevoie.
// Cost: 0 apeluri Claude

export interface BlindSpot {
  type: "AGENT_NO_KB" | "UNCOVERED_AREA" | "SINGLE_POINT_OF_FAILURE" | "STALE_KNOWLEDGE"
  entity: string
  severity: "LOW" | "MEDIUM" | "HIGH"
  suggestion: string
}

export async function detectBlindSpots(): Promise<BlindSpot[]> {
  const spots: BlindSpot[] = []

  // 1. Agenți fără KB entries
  const agentRoles = await prisma.agentRelationship.findMany({
    where: { isActive: true },
    select: { childRole: true },
    distinct: ["childRole"],
  })

  for (const agent of agentRoles) {
    const kbCount = await prisma.kBEntry.count({
      where: { agentRole: agent.childRole, status: "PERMANENT" },
    })
    if (kbCount === 0) {
      spots.push({
        type: "AGENT_NO_KB",
        entity: agent.childRole,
        severity: "HIGH",
        suggestion: `${agent.childRole} nu are niciun KB entry — nu poate învăța din experiență. Self-interview necesar.`,
      })
    } else if (kbCount < 5) {
      spots.push({
        type: "AGENT_NO_KB",
        entity: agent.childRole,
        severity: "MEDIUM",
        suggestion: `${agent.childRole} are doar ${kbCount} KB entries — cunoaștere minimală.`,
      })
    }
  }

  // 2. Single Point of Failure: competență unică pe un singur agent
  const kbByTag = await prisma.kBEntry.groupBy({
    by: ["agentRole"],
    where: { status: "PERMANENT" },
    _count: { id: true },
  })

  // Găsim tag-uri care apar la un singur agent
  const taggedEntries = await prisma.kBEntry.findMany({
    where: { status: "PERMANENT", tags: { isEmpty: false } },
    select: { agentRole: true, tags: true },
  })

  const tagToAgents = new Map<string, Set<string>>()
  for (const entry of taggedEntries) {
    for (const tag of entry.tags) {
      if (!tagToAgents.has(tag)) tagToAgents.set(tag, new Set())
      tagToAgents.get(tag)!.add(entry.agentRole)
    }
  }

  for (const [tag, agents] of tagToAgents) {
    if (agents.size === 1 && tag.length > 3) {
      const agent = [...agents][0]
      // Verificăm dacă e un tag important (nu generic)
      if (!["general", "audit", "cleanup", "probe"].includes(tag)) {
        spots.push({
          type: "SINGLE_POINT_OF_FAILURE",
          entity: `${agent}:${tag}`,
          severity: "MEDIUM",
          suggestion: `Doar ${agent} cunoaște "${tag}" — dacă e indisponibil, organizația pierde competența.`,
        })
      }
    }
  }

  // 3. Stale knowledge: KB entries neaccesate > 30 zile cu usageCount = 0
  const staleKB = await prisma.kBEntry.count({
    where: {
      status: "PERMANENT",
      usageCount: 0,
      createdAt: { lt: new Date(Date.now() - 30 * 24 * 3600000) },
    },
  })
  if (staleKB > 50) {
    spots.push({
      type: "STALE_KNOWLEDGE",
      entity: `${staleKB} entries`,
      severity: "LOW",
      suggestion: `${staleKB} KB entries create > 30 zile și niciodată folosite — posibil irelevante.`,
    })
  }

  return spots
}


// ══════════════════════════════════════════════════════════════════════════════
// STRAT 7: JURISPRUDENȚĂ MORALĂ — "Am mai văzut asta"
// ══════════════════════════════════════════════════════════════════════════════
//
// Registru de dileme: fiecare situație ambiguă + decizia luată + consecința.
// La următoarea dilemă similară, organismul caută precedentul, nu regula abstractă.
//
// Schema: folosim KBEntry cu kbType=METHODOLOGY și tag "moral-precedent"
// Cost: 0 apeluri Claude (lookup pur)

export interface MoralPrecedent {
  dilemma: string
  decision: string
  consequence: string
  weight: number // cât de relevantă e consecința (1-10)
  date: string
}

export async function findMoralPrecedent(currentDilemma: string): Promise<MoralPrecedent | null> {
  // Căutăm precedente în KB cu tag "moral-precedent"
  const precedents = await prisma.kBEntry.findMany({
    where: {
      status: "PERMANENT",
      kbType: "METHODOLOGY",
      tags: { has: "moral-precedent" },
    },
    select: { content: true, confidence: true, createdAt: true },
    orderBy: { confidence: "desc" },
  })

  if (precedents.length === 0) return null

  // Matching simplu: cuvinte comune între dilemma curentă și precedente
  const dilemmaWords = currentDilemma.toLowerCase().split(/\s+/).filter(w => w.length > 4)
  let bestMatch: MoralPrecedent | null = null
  let bestScore = 0

  for (const p of precedents) {
    try {
      const parsed = JSON.parse(p.content) as MoralPrecedent
      const pWords = (parsed.dilemma || "").toLowerCase()
      const score = dilemmaWords.filter(w => pWords.includes(w)).length

      if (score > bestScore) {
        bestScore = score
        bestMatch = {
          ...parsed,
          weight: p.confidence,
          date: p.createdAt.toISOString().slice(0, 10),
        }
      }
    } catch {
      // content nu e JSON valid — skip
    }
  }

  return bestScore >= 3 ? bestMatch : null
}

/**
 * Înregistrează o dilemă + decizie + consecință în registrul moral.
 */
export async function recordMoralPrecedent(precedent: {
  dilemma: string
  decision: string
  consequence: string
  severity: number // 1-10
}): Promise<string> {
  const entry = await prisma.kBEntry.create({
    data: {
      agentRole: "MORAL_CORE",
      kbType: "METHODOLOGY",
      source: "DISTILLED_INTERACTION",
      status: "PERMANENT",
      confidence: precedent.severity,
      tags: ["moral-precedent", "jurisprudence"],
      content: JSON.stringify({
        dilemma: precedent.dilemma,
        decision: precedent.decision,
        consequence: precedent.consequence,
      }),
    },
  })
  return entry.id
}


// ══════════════════════════════════════════════════════════════════════════════
// INTEGRATOR: Rulează toate straturile la fiecare ciclu cron
// ══════════════════════════════════════════════════════════════════════════════

export interface CognitiveCycleResult {
  heartbeat: HeartbeatConfig
  anomalies: Anomaly[]
  blindSpots: BlindSpot[]
  weightedLearningUpdated: number
  metaEvaluationsRun: number
  skippedByMeta: number
}

export async function runCognitiveLayers(): Promise<CognitiveCycleResult> {
  // Strat 2: Calculează ritmul cardiac
  const heartbeat = await calculateHeartbeat()

  // Strat 4: Detectează anomalii
  const anomalies = await detectAnomalies()

  // Strat 5: Aplică învățare ponderată
  const weightedLearningUpdated = await applyWeightedLearning()

  // Strat 6: Detectează blind spots (doar la ritmul CALM — economisire)
  const blindSpots = heartbeat.urgencyLevel === "CALM"
    ? await detectBlindSpots()
    : []

  // Strat 1 și 3: se aplică per-task în executor (nu aici)
  // Strat 7: se aplică on-demand când apare o dilemă morală

  return {
    heartbeat,
    anomalies,
    blindSpots,
    weightedLearningUpdated,
    metaEvaluationsRun: 0, // populat de executor
    skippedByMeta: 0,
  }
}
