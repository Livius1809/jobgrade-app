/**
 * curiosity-engine.ts — ENGINE 4: Emergent Motivation (06.05.2026)
 *
 * Nu e constiinta, ci comportament care produce efecte similare:
 * cand pattern-uri se repeta sau necunoscute se acumuleaza,
 * organismul genereaza autonom obiective exploratorii.
 *
 * Analogie umana: "Hmm, asta-i ciudat... de ce se tot intampla? Vreau sa inteleg."
 *
 * NU: "Mi s-a spus sa investighez X"
 * CI: "AM OBSERVAT X si vreau sa inteleg"
 *
 * Triggers:
 * 1. RECURRING_ANOMALY — aceeasi disfunctie de 3+ ori → "de ce se tot strica?"
 * 2. KNOWLEDGE_GAP — KB queries cu miss consistent pe un domeniu → "nu stim destul despre X"
 * 3. UNEXPLAINED_SUCCESS — task reusit cu scor mare dar fara KB hit → "ce a mers asa bine?"
 * 4. UNEXPLAINED_FAILURE — task esuat desi avea KB entries → "de ce a esuat?"
 * 5. NOVEL_PATTERN — contemplation a gasit ceva nou neexplorat → "interesant, sa sapam"
 */

import { prisma } from "@/lib/prisma"
import { getRecentInsights } from "./contemplation-engine"

// ── Types ──────────────────────────────────────────────────────────────────

export interface CuriositySignal {
  domain: string // e.g., "culture_audit", "matching", "agent_COG"
  trigger:
    | "RECURRING_ANOMALY"
    | "KNOWLEDGE_GAP"
    | "UNEXPLAINED_SUCCESS"
    | "UNEXPLAINED_FAILURE"
    | "NOVEL_PATTERN"
  description: string
  curiosityScore: number // 0-1: cat de mult "vrea" organismul sa exploreze
  occurrences: number // de cate ori a aparut pattern-ul
  suggestedExploration: string // ce sa investigam
}

export interface MotivationResult {
  signals: CuriositySignal[]
  objectivesCreated: number
  domainsExplored: string[]
}

// ── Curiosity score persistence ────────────────────────────────────────────

const CURIOSITY_CONFIG_KEY = "CURIOSITY_SCORES"

interface CuriosityScoreMap {
  [domain: string]: {
    score: number
    lastUpdated: string
    signalCount: number
  }
}

async function loadCuriosityScores(): Promise<CuriosityScoreMap> {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: CURIOSITY_CONFIG_KEY },
    })
    if (!config?.value) return {}
    return JSON.parse(config.value) as CuriosityScoreMap
  } catch {
    return {}
  }
}

async function saveCuriosityScores(scores: CuriosityScoreMap): Promise<void> {
  await prisma.systemConfig.upsert({
    where: { key: CURIOSITY_CONFIG_KEY },
    create: {
      key: CURIOSITY_CONFIG_KEY,
      value: JSON.stringify(scores),
      label: "Curiosity Engine — accumulated curiosity per domain",
    },
    update: {
      value: JSON.stringify(scores),
    },
  })
}

function updateDomainCuriosity(
  scores: CuriosityScoreMap,
  domain: string,
  signalScore: number,
): number {
  const existing = scores[domain]
  const now = new Date().toISOString()

  if (existing) {
    // Accumulate — domains that keep generating signals get progressively higher curiosity
    // Diminishing returns: each new signal adds less (logarithmic growth)
    const accumulatedScore = Math.min(
      1.0,
      existing.score + signalScore * (1 / (1 + Math.log2(existing.signalCount + 1))),
    )
    scores[domain] = {
      score: accumulatedScore,
      lastUpdated: now,
      signalCount: existing.signalCount + 1,
    }
    return accumulatedScore
  } else {
    scores[domain] = { score: signalScore, lastUpdated: now, signalCount: 1 }
    return signalScore
  }
}

// ── Signal detectors ───────────────────────────────────────────────────────

async function detectRecurringAnomalies(): Promise<CuriositySignal[]> {
  const signals: CuriositySignal[] = []
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  try {
    // Group disfunctionEvent by (targetType, signal) in last 30 days
    const events = await prisma.disfunctionEvent.findMany({
      where: { detectedAt: { gte: thirtyDaysAgo } },
      select: { targetType: true, targetId: true, signal: true },
    })

    // Group by targetType + signal
    const groups = new Map<string, { count: number; targetIds: Set<string> }>()
    for (const e of events) {
      const key = `${e.targetType}::${e.signal}`
      const group = groups.get(key) ?? { count: 0, targetIds: new Set<string>() }
      group.count++
      group.targetIds.add(e.targetId)
      groups.set(key, group)
    }

    for (const [key, group] of groups) {
      if (group.count >= 3) {
        const [targetType, signal] = key.split("::")
        const domain = `${targetType}_${signal}`.toLowerCase().replace(/[^a-z0-9_]/g, "_")
        // Score: 3 occurrences = 0.5, 6 = 0.7, 10+ = 0.85
        const rawScore = Math.min(0.95, 0.3 + group.count * 0.07)

        signals.push({
          domain,
          trigger: "RECURRING_ANOMALY",
          description: `Disfunctie "${signal}" pe ${targetType} s-a repetat de ${group.count} ori in ultimele 30 zile (targets: ${[...group.targetIds].slice(0, 5).join(", ")})`,
          curiosityScore: rawScore,
          occurrences: group.count,
          suggestedExploration: `Investigheaza cauza radacina a disfunctiei "${signal}" pe ${targetType}. De ce se repeta? Exista un pattern structural?`,
        })
      }
    }
  } catch (err) {
    console.error("[CURIOSITY] detectRecurringAnomalies error:", err)
  }

  return signals
}

async function detectKnowledgeGaps(): Promise<CuriositySignal[]> {
  const signals: CuriositySignal[] = []

  try {
    // Find tasks that were NOT resolved from KB (kbHit=false) and group by assignedTo
    // If same agent keeps missing KB on similar topics, it's a gap
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const kbMissTasks = await prisma.agentTask.findMany({
      where: {
        kbHit: false,
        status: { in: ["COMPLETED", "FAILED", "BLOCKED"] },
        completedAt: { gte: thirtyDaysAgo },
      },
      select: { assignedTo: true, title: true, tags: true },
      take: 200,
    })

    // Group by agent and extract keyword frequency
    const agentKeywords = new Map<string, Map<string, number>>()
    for (const t of kbMissTasks) {
      const keywords = (t.title + " " + (t.tags ?? []).join(" "))
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3)

      for (const kw of keywords) {
        if (!agentKeywords.has(t.assignedTo)) {
          agentKeywords.set(t.assignedTo, new Map())
        }
        const kwMap = agentKeywords.get(t.assignedTo)!
        kwMap.set(kw, (kwMap.get(kw) ?? 0) + 1)
      }
    }

    // If a keyword appears 5+ times for same agent → knowledge gap
    for (const [agent, kwMap] of agentKeywords) {
      for (const [keyword, count] of kwMap) {
        if (count >= 5) {
          const domain = `kb_gap_${agent}_${keyword}`.toLowerCase()
          const rawScore = Math.min(0.9, 0.4 + count * 0.05)

          signals.push({
            domain,
            trigger: "KNOWLEDGE_GAP",
            description: `Agentul ${agent} a avut ${count} KB miss-uri pe keyword "${keyword}" in ultimele 30 zile. Lipseste cunostinta fundamentala.`,
            curiosityScore: rawScore,
            occurrences: count,
            suggestedExploration: `Creeaza KB entries pentru domeniul "${keyword}" relevant agentului ${agent}. Surse: L2 cold-start, documente interne, sau cercetare.`,
          })
        }
      }
    }
  } catch (err) {
    console.error("[CURIOSITY] detectKnowledgeGaps error:", err)
  }

  return signals
}

async function detectUnexplainedSuccesses(): Promise<CuriositySignal[]> {
  const signals: CuriositySignal[] = []

  try {
    // Tasks completed with high quality but WITHOUT KB hit
    // (agent did something new and excellent — why?)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const excellentTasks = await prisma.agentTask.findMany({
      where: {
        status: "COMPLETED",
        kbHit: false,
        resultQuality: { gte: 90 },
        completedAt: { gte: thirtyDaysAgo },
      },
      select: {
        id: true,
        assignedTo: true,
        title: true,
        taskType: true,
        resultQuality: true,
        tags: true,
      },
      take: 50,
    })

    // Group by agent+taskType
    const groups = new Map<string, typeof excellentTasks>()
    for (const t of excellentTasks) {
      const key = `${t.assignedTo}::${t.taskType}`
      const group = groups.get(key) ?? []
      group.push(t)
      groups.set(key, group)
    }

    for (const [key, tasks] of groups) {
      if (tasks.length >= 2) {
        const [agent, taskType] = key.split("::")
        const domain = `success_${agent}_${taskType}`.toLowerCase()
        const avgQuality =
          tasks.reduce((sum, t) => sum + (t.resultQuality ?? 0), 0) / tasks.length
        const rawScore = Math.min(0.9, 0.5 + tasks.length * 0.1)

        signals.push({
          domain,
          trigger: "UNEXPLAINED_SUCCESS",
          description: `Agentul ${agent} a completat ${tasks.length} task-uri de tip ${taskType} cu calitate medie ${avgQuality.toFixed(0)}% FARA KB hit. Ce face diferit?`,
          curiosityScore: rawScore,
          occurrences: tasks.length,
          suggestedExploration: `Analizeaza rezultatele task-urilor excelente ale lui ${agent} pe ${taskType}. Extrage pattern-ul de succes si transforma-l in KB entry.`,
        })
      }
    }
  } catch (err) {
    console.error("[CURIOSITY] detectUnexplainedSuccesses error:", err)
  }

  return signals
}

async function detectUnexplainedFailures(): Promise<CuriositySignal[]> {
  const signals: CuriositySignal[] = []

  try {
    // Tasks failed or very low quality DESPITE having KB entries available
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const failedTasks = await prisma.agentTask.findMany({
      where: {
        OR: [
          { status: "BLOCKED" },
          { status: "FAILED" },
          { status: "COMPLETED", resultQuality: { lte: 30 } },
        ],
        completedAt: { gte: thirtyDaysAgo },
      },
      select: {
        id: true,
        assignedTo: true,
        title: true,
        taskType: true,
        resultQuality: true,
        status: true,
        blockerType: true,
        blockerDescription: true,
        tags: true,
      },
      take: 100,
    })

    // For each failed task, check if there were relevant KB entries
    for (const task of failedTasks) {
      const keywords = task.title
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3)

      if (keywords.length === 0) continue

      // Check if KB has entries for this agent + these keywords
      const kbCount = await prisma.kBEntry.count({
        where: {
          agentRole: task.assignedTo,
          status: "PERMANENT",
          content: { contains: keywords[0] }, // simplified check
        },
      })

      if (kbCount > 0) {
        const domain = `failure_${task.assignedTo}_${task.taskType}`.toLowerCase()
        signals.push({
          domain,
          trigger: "UNEXPLAINED_FAILURE",
          description: `Task "${task.title}" (${task.assignedTo}) a esuat cu status ${task.status}${task.resultQuality != null ? ` (calitate: ${task.resultQuality}%)` : ""} desi KB-ul are ${kbCount} entries relevante. Blocker: ${task.blockerDescription?.slice(0, 100) ?? "necunoscut"}.`,
          curiosityScore: 0.7,
          occurrences: 1,
          suggestedExploration: `Investigheaza de ce KB-ul existent nu a ajutat la rezolvarea task-ului. KB entries neactualizate? Format incompatibil? Problema de alta natura decat cunostinta?`,
        })
      }
    }

    // Deduplicate by domain — keep highest curiosity
    const deduped = new Map<string, CuriositySignal>()
    for (const s of signals) {
      const existing = deduped.get(s.domain)
      if (!existing || s.curiosityScore > existing.curiosityScore) {
        if (existing) {
          s.occurrences = existing.occurrences + s.occurrences
        }
        deduped.set(s.domain, s)
      }
    }

    return [...deduped.values()]
  } catch (err) {
    console.error("[CURIOSITY] detectUnexplainedFailures error:", err)
    return []
  }
}

async function detectNovelPatterns(): Promise<CuriositySignal[]> {
  const signals: CuriositySignal[] = []

  try {
    // Query recent contemplation insights with novelty > 0.7
    // that haven't been explored (no matching objective or task)
    const insights = await getRecentInsights(20)
    const novel = insights.filter((i) => i.novelty > 0.7)

    for (const insight of novel) {
      // Check if this insight was already explored (matching task exists)
      const existingTask = await prisma.agentTask.findFirst({
        where: {
          title: { contains: insight.title.slice(0, 50) },
          status: { in: ["ASSIGNED", "ACCEPTED", "IN_PROGRESS", "COMPLETED"] },
        },
        select: { id: true },
      })

      if (!existingTask) {
        const domain = `novel_${insight.type}_${insight.id}`.toLowerCase()
        signals.push({
          domain,
          trigger: "NOVEL_PATTERN",
          description: `Contemplation a descoperit: "${insight.title}" (tip: ${insight.type}, novelty: ${insight.novelty.toFixed(2)}, confidence: ${insight.confidence.toFixed(2)}). Nimeni nu a explorat inca.`,
          curiosityScore: insight.novelty * insight.confidence,
          occurrences: 1,
          suggestedExploration: insight.suggestedObjective ?? insight.description,
        })
      }
    }
  } catch (err) {
    console.error("[CURIOSITY] detectNovelPatterns error:", err)
  }

  return signals
}

// ── Objective creation ─────────────────────────────────────────────────────

async function createExploratoryObjective(
  signal: CuriositySignal,
): Promise<string | null> {
  try {
    const biz = await prisma.systemConfig.findUnique({
      where: { key: "DEFAULT_BUSINESS_ID" },
    })
    const businessId = biz?.value ?? "biz_jobgrade"

    const dateCode = new Date().toISOString().slice(0, 10).replace(/-/g, "")
    const code = `CURIOSITY-${signal.domain.slice(0, 30)}-${dateCode}`

    // Check if this objective already exists (avoid duplicates)
    const existing = await prisma.organizationalObjective.findFirst({
      where: { businessId, code },
    })
    if (existing) return null

    // Determine relevant agent based on domain
    const agentRole = extractAgentFromDomain(signal.domain)

    const obj = await prisma.organizationalObjective.create({
      data: {
        businessId,
        code,
        title: `[Curiozitate] ${signal.description.slice(0, 80)}`,
        description: `Auto-generat de Curiosity Engine.\n\nTrigger: ${signal.trigger}\nDomeniu: ${signal.domain}\nScor curiozitate: ${signal.curiosityScore.toFixed(2)}\nOcurente: ${signal.occurrences}\n\nExplorare sugerata:\n${signal.suggestedExploration}`,
        metricName: "exploration_complete",
        metricUnit: "boolean",
        targetValue: 1,
        currentValue: 0,
        direction: "REACH",
        priority: signal.curiosityScore >= 0.8 ? "HIGH" : "MEDIUM",
        status: "ACTIVE",
        level: "OPERATIONAL",
        ownerRoles: [agentRole],
        contributorRoles: ["COG"],
        tags: ["curiosity", "auto-generated", signal.trigger.toLowerCase()],
        cascadedBy: "CURIOSITY_ENGINE",
        createdBy: "CURIOSITY_ENGINE",
      },
    })

    // Also create a task for the agent to investigate
    await prisma.agentTask.create({
      data: {
        businessId,
        assignedBy: "CURIOSITY_ENGINE",
        assignedTo: agentRole,
        title: `[Curiozitate] Exploreaza: ${signal.domain}`,
        description: signal.suggestedExploration,
        taskType: "INVESTIGATION",
        priority: "NECESAR",
        tags: ["curiosity", signal.trigger.toLowerCase(), signal.domain],
        objectiveId: obj.id,
        status: "ASSIGNED",
      },
    })

    return obj.id
  } catch (err) {
    console.error("[CURIOSITY] createExploratoryObjective error:", err)
    return null
  }
}

function extractAgentFromDomain(domain: string): string {
  // Try to extract agent role from domain name
  const domainUpper = domain.toUpperCase()
  const knownAgents = [
    "COG", "COA", "COCSA", "CIA", "CCIA", "CJA",
    "SVHA", "SA", "TDA", "SQA", "CCO", "CFO",
    "MKA", "SOA", "PMA", "DMA", "SAFETY_MONITOR",
  ]
  for (const agent of knownAgents) {
    if (domainUpper.includes(agent)) return agent
  }
  return "COG" // default: COG investigates
}

// ── Main scan function ─────────────────────────────────────────────────────

/**
 * Scans for curiosity-worthy patterns and autonomously generates exploratory objectives.
 *
 * Runs all 5 detectors in parallel, accumulates curiosity scores per domain,
 * and creates OrganizationalObjective + AgentTask for signals above threshold.
 */
export async function scanForCuriosity(): Promise<MotivationResult> {
  // Run all detectors in parallel
  const [anomalies, gaps, successes, failures, novelPatterns] = await Promise.all([
    detectRecurringAnomalies(),
    detectKnowledgeGaps(),
    detectUnexplainedSuccesses(),
    detectUnexplainedFailures(),
    detectNovelPatterns(),
  ])

  const allSignals = [...anomalies, ...gaps, ...successes, ...failures, ...novelPatterns]

  // Load and update accumulated curiosity scores
  const scores = await loadCuriosityScores()
  for (const signal of allSignals) {
    signal.curiosityScore = updateDomainCuriosity(scores, signal.domain, signal.curiosityScore)
  }
  await saveCuriosityScores(scores)

  // Create objectives for high-curiosity signals
  let objectivesCreated = 0
  const domainsExplored: string[] = []

  for (const signal of allSignals) {
    if (signal.curiosityScore > 0.6) {
      const objId = await createExploratoryObjective(signal)
      if (objId) {
        objectivesCreated++
        domainsExplored.push(signal.domain)
      }
    }
  }

  return {
    signals: allSignals,
    objectivesCreated,
    domainsExplored,
  }
}

/**
 * Returns the current curiosity scores per domain (for dashboard/debugging).
 */
export async function getCuriosityScores(): Promise<CuriosityScoreMap> {
  return loadCuriosityScores()
}
