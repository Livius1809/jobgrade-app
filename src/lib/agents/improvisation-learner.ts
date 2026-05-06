/**
 * improvisation-learner.ts — Meta-learning din improvizatie (06.05.2026)
 *
 * ARHITECTURA: Dupa ce organismul improvizeaza (succes SAU esec),
 * extrage INVATARE din experienta.
 *
 * Succesul produce: proceduri noi descoperite (confidence initiala scazuta)
 * Esecul produce: intelegerea CAUZEI (mai valoroasa decat anti-pattern)
 *
 * Diferenta critica:
 *   Anti-pattern: "Nu folosi strategia X" (blanket rule)
 *   Failure understanding: "Nu folosi strategia X CAND conditia Z e prezenta"
 *   Al doilea e infinit mai util — pastreaza strategia disponibila pentru alte contexte.
 *
 * Ambele alimenteaza modelul mental:
 *   SUCCESS → noua muchie ENABLES (strategia X ENABLES rezolvarea Y)
 *   FAILURE → noua muchie BLOCKS (conditia Z BLOCKS strategia X in contextul Y)
 */

import { prisma } from "@/lib/prisma"
import { cpuCall } from "@/lib/cpu/gateway"
import { updateMentalModel } from "@/lib/engines/mental-model"

// ── Types ──────────────────────────────────────────────────────────────────

export interface ImprovisationLesson {
  strategy: string // ANALOGICAL, CONSTRAINT_RELAXATION, etc.
  context: string // domain + situation
  outcome: "SUCCESS" | "PARTIAL" | "FAILURE"
  resultQuality: number

  // For SUCCESS:
  discoveredProcedure?: string // new way of doing things

  // For FAILURE — MORE VALUABLE:
  failureCause?: string // WHY it didn't work (inferred)
  failureConditions?: string[] // WHEN this strategy fails

  // Meta-learning:
  strategyEffectiveness: {
    domain: string
    strategy: string
    successRate: number
    sampleSize: number
  }
}

interface ImprovisationInput {
  strategy: string
  context: {
    taskTitle: string
    taskDescription: string
    agentRole: string
    failureReason: string
  }
  output: string
  confidence: number
}

interface TaskOutcome {
  resultQuality: number
  feedback?: string
}

// ── Outcome classification ────────────────────────────────────────────────

function classifyOutcome(resultQuality: number): "SUCCESS" | "PARTIAL" | "FAILURE" {
  if (resultQuality > 0.7) return "SUCCESS"
  if (resultQuality >= 0.3) return "PARTIAL"
  return "FAILURE"
}

// ── Strategy effectiveness tracking ───────────────────────────────────────

const STRATEGY_STATS_KEY = "IMPROVISATION_STRATEGY_STATS"

interface StrategyStatsStore {
  // key: "domain::strategy" → { successes, total }
  [domainStrategy: string]: { successes: number; total: number }
}

async function loadStrategyStats(): Promise<StrategyStatsStore> {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: STRATEGY_STATS_KEY },
    })
    if (!config?.value) return {}
    return JSON.parse(config.value) as StrategyStatsStore
  } catch {
    return {}
  }
}

async function saveStrategyStats(stats: StrategyStatsStore): Promise<void> {
  try {
    await prisma.systemConfig.upsert({
      where: { key: STRATEGY_STATS_KEY },
      create: {
        key: STRATEGY_STATS_KEY,
        value: JSON.stringify(stats),
        label: "Improvisation strategy effectiveness per domain",
      },
      update: { value: JSON.stringify(stats) },
    })
  } catch (err) {
    console.error("[IMPROV-LEARNER] Failed to save strategy stats:", err)
  }
}

function getDomain(agentRole: string): string {
  // Map agent roles to broad domains for stats aggregation
  const domainMap: Record<string, string> = {
    COG: "management", COCSA: "client", CCO: "management",
    DOA: "operations", DOAS: "operations", QLA: "quality",
    DMA: "marketing", CMA: "marketing", CWA: "content",
    MKA: "marketing", ACA: "analytics",
    SOA: "client", CSM: "client", CSA: "client", CSSA: "client",
    CJA: "legal", DPA: "legal", CCIA: "legal",
    CFO: "finance", COAFin: "finance", BCA: "finance",
    COA: "tech", SVHA: "security", TDA: "tech",
    CIA: "intelligence", RDA: "research", CDIA: "intelligence",
    PMA: "product", PPMO: "product", DVB2B: "product",
  }
  return domainMap[agentRole] ?? "general"
}

// ── Failure analysis (cheap Claude call) ──────────────────────────────────

async function inferFailureCause(
  strategy: string,
  context: ImprovisationInput["context"],
  output: string,
  resultQuality: number,
  feedback?: string,
): Promise<{ cause: string; conditions: string[] }> {
  try {
    const cpuResult = await cpuCall({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      system: "",
      messages: [
        {
          role: "user",
          content: `Analizeaza acest esec al unei strategii de improvizatie si deduce CAUZA si CONDITIILE.

STRATEGIA: ${strategy}
CONTEXT: Agent ${context.agentRole}, task "${context.taskTitle}"
MOTIV ESEC STANDARD: ${context.failureReason.slice(0, 200)}
OUTPUT IMPROVIZAT: ${output.slice(0, 300)}
CALITATE REZULTAT: ${resultQuality.toFixed(2)}/1.0
${feedback ? `FEEDBACK: ${feedback.slice(0, 200)}` : ""}

Raspunde in JSON strict:
{
  "cause": "motivul principal pentru care strategia ${strategy} a esuat in acest context",
  "conditions": ["conditia 1 care a contribuit la esec", "conditia 2"]
}

REGULI:
- Cauza trebuie sa fie SPECIFICA, nu generica
- Conditiile descriu CAND aceasta strategie esueaza (nu mereu, ci in anumite contexte)
- Maxim 3 conditii`,
        },
      ],
      agentRole: context.agentRole,
      operationType: "improvisation-failure-analysis",
    })

    const jsonMatch = cpuResult.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return { cause: "Cauza necunoscuta", conditions: [] }

    const parsed = JSON.parse(jsonMatch[0])
    return {
      cause: String(parsed.cause ?? "Cauza necunoscuta"),
      conditions: Array.isArray(parsed.conditions) ? parsed.conditions.map(String) : [],
    }
  } catch (err) {
    console.error("[IMPROV-LEARNER] Failure analysis error:", err)
    return { cause: "Eroare la analiza cauzei", conditions: [] }
  }
}

// ── Main learning function ────────────────────────────────────────────────

/**
 * Processes an improvisation result and extracts learning.
 *
 * SUCCESS → discovered procedure (low initial confidence)
 * FAILURE → understanding of WHY (more valuable than anti-pattern)
 *   - Anti-pattern says: "don't do X"
 *   - Failure understanding says: "don't do X WHEN condition Z is present"
 *   - Second is infinitely more useful
 *
 * Both feed the mental model:
 *   SUCCESS → new ENABLES edge (strategy X ENABLES solving Y)
 *   FAILURE → new BLOCKS edge (condition Z BLOCKS strategy X in context Y)
 */
export async function learnFromImprovisation(
  improvisationResult: ImprovisationInput,
  taskOutcome: TaskOutcome,
): Promise<ImprovisationLesson> {
  const outcome = classifyOutcome(taskOutcome.resultQuality)
  const domain = getDomain(improvisationResult.context.agentRole)
  const strategy = improvisationResult.strategy

  // ── Update strategy effectiveness stats ─────────────────────────────
  const stats = await loadStrategyStats()
  const statsKey = `${domain}::${strategy}`
  if (!stats[statsKey]) {
    stats[statsKey] = { successes: 0, total: 0 }
  }
  stats[statsKey].total++
  if (outcome === "SUCCESS") stats[statsKey].successes++
  await saveStrategyStats(stats)

  const currentStats = stats[statsKey]
  const successRate = currentStats.total > 0 ? currentStats.successes / currentStats.total : 0

  // ── Build the lesson ────────────────────────────────────────────────
  const lesson: ImprovisationLesson = {
    strategy,
    context: `${domain}/${improvisationResult.context.agentRole}: ${improvisationResult.context.taskTitle}`,
    outcome,
    resultQuality: taskOutcome.resultQuality,
    strategyEffectiveness: {
      domain,
      strategy,
      successRate,
      sampleSize: currentStats.total,
    },
  }

  // ── SUCCESS: create discovered procedure ────────────────────────────
  if (outcome === "SUCCESS") {
    const procedureDescription = `Procedura descoperita prin improvizatie (${strategy}): ${improvisationResult.output.slice(0, 500)}`
    lesson.discoveredProcedure = procedureDescription

    // Store as LearningArtifact with low initial confidence
    try {
      await prisma.learningArtifact.create({
        data: {
          studentRole: improvisationResult.context.agentRole,
          teacherRole: "improvisation-learner",
          problemClass: "improvised-procedure",
          rule: procedureDescription,
          example: `Task: "${improvisationResult.context.taskTitle}" — strategia ${strategy} a functionat cu confidence ${improvisationResult.confidence.toFixed(2)}`,
          antiPattern: "",
          sourceType: "POST_EXECUTION",
          effectivenessScore: 0.5, // Low — not yet proven repeatable
        },
      })
    } catch (err) {
      console.error("[IMPROV-LEARNER] Failed to create SUCCESS artifact:", err)
    }

    // Feed mental model: ENABLES edge
    try {
      await updateMentalModel({
        content: `Strategia ${strategy} ENABLES rezolvarea problemelor de tip "${improvisationResult.context.taskTitle.slice(0, 100)}" in domeniul ${domain}. Confidence initiala: ${improvisationResult.confidence.toFixed(2)}. Success rate cumulat: ${(successRate * 100).toFixed(0)}% (${currentStats.total} incercari).`,
        source: "improvisation-learner",
        agentRole: improvisationResult.context.agentRole,
      })
    } catch {
      // Mental model update is optional
    }
  }

  // ── FAILURE: infer cause and conditions ─────────────────────────────
  if (outcome === "FAILURE") {
    const { cause, conditions } = await inferFailureCause(
      strategy,
      improvisationResult.context,
      improvisationResult.output,
      taskOutcome.resultQuality,
      taskOutcome.feedback,
    )

    lesson.failureCause = cause
    lesson.failureConditions = conditions

    // Store cause as LearningArtifact (failure understanding)
    try {
      await prisma.learningArtifact.create({
        data: {
          studentRole: improvisationResult.context.agentRole,
          teacherRole: "improvisation-learner",
          problemClass: "failure-understanding",
          rule: `Strategia ${strategy} esueaza CAND: ${conditions.join("; ")}. Cauza: ${cause}`,
          example: `Task: "${improvisationResult.context.taskTitle}" — quality ${taskOutcome.resultQuality.toFixed(2)}`,
          antiPattern: conditions.length > 0
            ? `NU folosi ${strategy} cand: ${conditions.join("; ")}`
            : `${strategy} a esuat in contextul: ${improvisationResult.context.taskTitle.slice(0, 100)}`,
          sourceType: "POST_EXECUTION",
          effectivenessScore: 0.7, // Failure learnings start higher — they're more definitive
        },
      })
    } catch (err) {
      console.error("[IMPROV-LEARNER] Failed to create FAILURE artifact:", err)
    }

    // Feed mental model: BLOCKS edge with conditions
    try {
      await updateMentalModel({
        content: `${conditions.length > 0 ? `Conditiile [${conditions.join(", ")}] BLOCKS` : `Contextul "${improvisationResult.context.taskTitle.slice(0, 80)}" BLOCKS`} strategia ${strategy} in domeniul ${domain}. Cauza: ${cause}. Aceasta NU inseamna ca ${strategy} e inutila — doar ca in aceste conditii specifice nu functioneaza.`,
        source: "improvisation-learner",
        agentRole: improvisationResult.context.agentRole,
      })
    } catch {
      // Mental model update is optional
    }
  }

  // ── PARTIAL: treat as weak success (procedure exists but unreliable) ─
  if (outcome === "PARTIAL") {
    try {
      await prisma.learningArtifact.create({
        data: {
          studentRole: improvisationResult.context.agentRole,
          teacherRole: "improvisation-learner",
          problemClass: "improvised-procedure-partial",
          rule: `Procedura partiala (${strategy}): ${improvisationResult.output.slice(0, 400)}`,
          example: `Task: "${improvisationResult.context.taskTitle}" — quality ${taskOutcome.resultQuality.toFixed(2)} (partial)`,
          antiPattern: "",
          sourceType: "POST_EXECUTION",
          effectivenessScore: 0.35, // Very low — partial success is questionable
        },
      })
    } catch (err) {
      console.error("[IMPROV-LEARNER] Failed to create PARTIAL artifact:", err)
    }
  }

  return lesson
}

// ── Strategy effectiveness query ──────────────────────────────────────────

/**
 * Returns strategy effectiveness for a given domain.
 * Used by improvisation engine to ORDER strategies by domain.
 *
 * Example: "in domain evaluation, ANALOGICAL works 80% but CONSTRAINT_RELAXATION only 30%"
 */
export async function getStrategyEffectiveness(
  domain?: string,
): Promise<
  Array<{ domain: string; strategy: string; successRate: number; sampleSize: number }>
> {
  const stats = await loadStrategyStats()
  const results: Array<{
    domain: string
    strategy: string
    successRate: number
    sampleSize: number
  }> = []

  for (const [key, value] of Object.entries(stats)) {
    const [d, s] = key.split("::")
    if (domain && d !== domain) continue
    results.push({
      domain: d,
      strategy: s,
      successRate: value.total > 0 ? value.successes / value.total : 0,
      sampleSize: value.total,
    })
  }

  // Sort by success rate descending (for strategy ordering)
  results.sort((a, b) => b.successRate - a.successRate)
  return results
}
