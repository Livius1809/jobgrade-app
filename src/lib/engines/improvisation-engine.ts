/**
 * improvisation-engine.ts — ENGINE 5: Improvisation (Resilience) (06.05.2026)
 *
 * Cand totul esueaza (KB miss, Claude indisponibil, fara procedura),
 * in loc de `degraded: true`, organismul INCEARCA CEVA.
 *
 * Analogie umana: instalatorul vine si unealta de care are nevoie e stricata.
 * Nu pleaca acasa — gaseste alta cale.
 *
 * Ierarhie de strategii (incercate in ordine):
 * 1. ANALOGICAL — gaseste cea mai apropiata problema rezolvata si adapteaza solutia
 * 2. CONSTRAINT_RELAXATION — rezolva o versiune mai simpla a problemei
 * 3. MULTI_AGENT_BRAINSTORM — intreaba 3 agenti diferiti ce ar face ei
 * 4. MINIMUM_VIABLE — produce ceva imperfect dar util
 * 5. GRACEFUL_NARRATIVE — explica onest ce nu putem face si de ce, cu plan de rezolvare
 */

import { prisma } from "@/lib/prisma"

// ── Types ──────────────────────────────────────────────────────────────────

export type ImprovisationStrategy =
  | "ANALOGICAL"
  | "CONSTRAINT_RELAXATION"
  | "MULTI_AGENT_BRAINSTORM"
  | "MINIMUM_VIABLE"
  | "GRACEFUL_NARRATIVE"

export interface ImprovisationResult {
  strategy: ImprovisationStrategy
  output: string
  confidence: number // cat de siguri suntem pe rezultatul improvizat
  reasoning: string // de ce am ales aceasta strategie
  isImprovised: true // mereu true — marcheaza output non-standard
}

export interface ImprovisationContext {
  taskTitle: string
  taskDescription: string
  agentRole: string
  failureReason: string // de ce a esuat calea standard
  availableKB: string[] // fragmente KB care se potrivesc partial
}

export interface ImprovisationStats {
  totalImprovisations: number
  byStrategy: Record<ImprovisationStrategy, number>
  averageConfidence: number
  lastImprovisedAt: string | null
}

// ── Stats persistence ──────────────────────────────────────────────────────

const IMPROV_STATS_KEY = "IMPROVISATION_STATS"
const IMPROV_LOG_KEY = "IMPROVISATION_LOG"

interface ImprovisationLogEntry {
  timestamp: string
  strategy: ImprovisationStrategy
  confidence: number
  taskTitle: string
  agentRole: string
  failureReason: string
}

async function loadStats(): Promise<ImprovisationStats> {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: IMPROV_STATS_KEY },
    })
    if (!config?.value) {
      return {
        totalImprovisations: 0,
        byStrategy: {
          ANALOGICAL: 0,
          CONSTRAINT_RELAXATION: 0,
          MULTI_AGENT_BRAINSTORM: 0,
          MINIMUM_VIABLE: 0,
          GRACEFUL_NARRATIVE: 0,
        },
        averageConfidence: 0,
        lastImprovisedAt: null,
      }
    }
    return JSON.parse(config.value) as ImprovisationStats
  } catch {
    return {
      totalImprovisations: 0,
      byStrategy: {
        ANALOGICAL: 0,
        CONSTRAINT_RELAXATION: 0,
        MULTI_AGENT_BRAINSTORM: 0,
        MINIMUM_VIABLE: 0,
        GRACEFUL_NARRATIVE: 0,
      },
      averageConfidence: 0,
      lastImprovisedAt: null,
    }
  }
}

async function recordImprovisation(
  result: ImprovisationResult,
  context: ImprovisationContext,
): Promise<void> {
  try {
    // Update stats
    const stats = await loadStats()
    const newTotal = stats.totalImprovisations + 1
    stats.averageConfidence =
      (stats.averageConfidence * stats.totalImprovisations + result.confidence) / newTotal
    stats.totalImprovisations = newTotal
    stats.byStrategy[result.strategy] = (stats.byStrategy[result.strategy] ?? 0) + 1
    stats.lastImprovisedAt = new Date().toISOString()

    await prisma.systemConfig.upsert({
      where: { key: IMPROV_STATS_KEY },
      create: {
        key: IMPROV_STATS_KEY,
        value: JSON.stringify(stats),
        label: "Improvisation Engine stats",
      },
      update: { value: JSON.stringify(stats) },
    })

    // Append to log (keep last 100 entries)
    const logConfig = await prisma.systemConfig.findUnique({
      where: { key: IMPROV_LOG_KEY },
    })
    const log: ImprovisationLogEntry[] = logConfig?.value
      ? JSON.parse(logConfig.value)
      : []

    log.unshift({
      timestamp: new Date().toISOString(),
      strategy: result.strategy,
      confidence: result.confidence,
      taskTitle: context.taskTitle.slice(0, 100),
      agentRole: context.agentRole,
      failureReason: context.failureReason.slice(0, 200),
    })

    await prisma.systemConfig.upsert({
      where: { key: IMPROV_LOG_KEY },
      create: {
        key: IMPROV_LOG_KEY,
        value: JSON.stringify(log.slice(0, 100)),
        label: "Improvisation Engine log (last 100)",
      },
      update: { value: JSON.stringify(log.slice(0, 100)) },
    })
  } catch (err) {
    console.error("[IMPROVISATION] Failed to record stats:", err)
  }
}

// ── Strategy implementations ───────────────────────────────────────────────

/**
 * Strategy 1: ANALOGICAL
 * Find the closest solved problem and adapt the solution.
 */
async function tryAnalogical(context: ImprovisationContext): Promise<ImprovisationResult | null> {
  try {
    // Extract keywords from task
    const keywords = (context.taskTitle + " " + context.taskDescription)
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .slice(0, 10)

    if (keywords.length === 0) return null

    // Search LearningArtifact for similar problems in ANY domain
    // (not just the current agent's domain — that's the point of analogy)
    let bestMatch: { rule: string; example: string; teacherRole: string; problemClass: string; score: number } | null = null

    for (const keyword of keywords) {
      const artifacts = await prisma.learningArtifact.findMany({
        where: {
          rule: { contains: keyword },
          effectivenessScore: { gte: 0.6 },
        },
        select: {
          rule: true,
          example: true,
          teacherRole: true,
          problemClass: true,
          effectivenessScore: true,
        },
        take: 5,
      })

      for (const a of artifacts) {
        if (!bestMatch || a.effectivenessScore > bestMatch.score) {
          bestMatch = {
            rule: a.rule,
            example: a.example,
            teacherRole: a.teacherRole,
            problemClass: a.problemClass,
            score: a.effectivenessScore,
          }
        }
      }
    }

    if (!bestMatch) return null

    const output = [
      `[ANALOGIE din ${bestMatch.teacherRole}/${bestMatch.problemClass}]`,
      ``,
      `Problema similara rezolvata anterior:`,
      `Regula: ${bestMatch.rule.slice(0, 500)}`,
      `Exemplu: ${bestMatch.example.slice(0, 300)}`,
      ``,
      `Adaptare pentru contextul curent (${context.agentRole}, "${context.taskTitle}"):`,
      `Aplicand aceeasi abordare, sugerez: ${bestMatch.rule.slice(0, 200)}`,
      `Aceasta este o solutie improvizata bazata pe analogie — necesita validare.`,
    ].join("\n")

    return {
      strategy: "ANALOGICAL",
      output,
      confidence: Math.min(0.7, bestMatch.score * 0.8),
      reasoning: `Am gasit un learning artifact relevant de la ${bestMatch.teacherRole} (problemClass: ${bestMatch.problemClass}, effectiveness: ${bestMatch.score.toFixed(2)}). Adaptez solutia.`,
      isImprovised: true,
    }
  } catch (err) {
    console.error("[IMPROVISATION] ANALOGICAL strategy error:", err)
    return null
  }
}

/**
 * Strategy 2: CONSTRAINT_RELAXATION
 * Simplify the task — remove the most complex requirement.
 */
async function tryConstraintRelaxation(
  context: ImprovisationContext,
): Promise<ImprovisationResult | null> {
  try {
    // Parse task description for "requirements" — sentences with action verbs
    const sentences = context.taskDescription
      .split(/[.\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10)

    if (sentences.length < 2) return null

    // Heuristic: the longest/most technical sentence is the most complex
    const sorted = [...sentences].sort((a, b) => b.length - a.length)
    const removedRequirement = sorted[0]
    const simplifiedRequirements = sentences.filter((s) => s !== removedRequirement)

    const output = [
      `[SIMPLIFICARE — Constraint Relaxation]`,
      ``,
      `Task-ul original nu poate fi rezolvat complet. Am simplificat:`,
      ``,
      `ELIMINAT (prea complex pentru resurse curente):`,
      `  "${removedRequirement.slice(0, 200)}"`,
      ``,
      `CE PUTEM LIVRA:`,
      ...simplifiedRequirements.map((r) => `  - ${r.slice(0, 150)}`),
      ``,
      `IMPORTANT: Acest rezultat este PARTIAL. Cerinta eliminata trebuie adresata separat.`,
    ].join("\n")

    return {
      strategy: "CONSTRAINT_RELAXATION",
      output,
      confidence: 0.5,
      reasoning: `Am eliminat cerinta cea mai complexa ("${removedRequirement.slice(0, 80)}...") si livrat ce ramane. Task-ul original are ${sentences.length} cerinte; livram ${simplifiedRequirements.length}.`,
      isImprovised: true,
    }
  } catch (err) {
    console.error("[IMPROVISATION] CONSTRAINT_RELAXATION strategy error:", err)
    return null
  }
}

/**
 * Strategy 3: MULTI_AGENT_BRAINSTORM
 * Query KB from 3 different agent roles for the same keywords.
 */
async function tryMultiAgentBrainstorm(
  context: ImprovisationContext,
): Promise<ImprovisationResult | null> {
  try {
    const keywords = context.taskTitle
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .slice(0, 5)

    if (keywords.length === 0) return null

    // Get 3 agent roles different from the assigned agent
    const relatedAgents = await prisma.agentDefinition.findMany({
      where: {
        isActive: true,
        agentRole: { not: context.agentRole },
      },
      select: { agentRole: true, displayName: true, description: true },
      take: 10,
    })

    if (relatedAgents.length < 2) return null

    // Pick 3 agents semi-randomly (prioritize managers)
    const agents = relatedAgents.slice(0, 3)

    // Query KB from each agent's perspective
    const perspectives: string[] = []
    for (const agent of agents) {
      const entries = await prisma.kBEntry.findMany({
        where: {
          agentRole: agent.agentRole,
          status: "PERMANENT",
          content: { contains: keywords[0] },
        },
        select: { content: true, confidence: true },
        take: 3,
        orderBy: { confidence: "desc" },
      })

      if (entries.length > 0) {
        perspectives.push(
          `[${agent.agentRole} — ${agent.displayName}]\n` +
            entries.map((e) => `  ${e.content.slice(0, 200)}`).join("\n"),
        )
      } else {
        perspectives.push(
          `[${agent.agentRole} — ${agent.displayName}]\n  (Fara cunostinte directe pe acest subiect, dar rolul de "${agent.description.slice(0, 100)}" sugereaza o abordare din perspectiva ${agent.displayName}.)`,
        )
      }
    }

    if (perspectives.length === 0) return null

    const output = [
      `[BRAINSTORM MULTI-AGENT — ${agents.length} perspective]`,
      ``,
      `Task: "${context.taskTitle}"`,
      `Agent original: ${context.agentRole} (esuat: ${context.failureReason.slice(0, 100)})`,
      ``,
      `Perspective de la alti agenti:`,
      ``,
      ...perspectives,
      ``,
      `SINTEZA: Combinand aceste perspective, sugerez o abordare care integreaza cunostintele din ${agents.length} domenii diferite.`,
      `Aceasta este o solutie improvizata — necesita validare de catre manager.`,
    ].join("\n")

    return {
      strategy: "MULTI_AGENT_BRAINSTORM",
      output,
      confidence: perspectives.some((p) => !p.includes("Fara cunostinte")) ? 0.55 : 0.35,
      reasoning: `Am consultat KB-ul a ${agents.length} agenti (${agents.map((a) => a.agentRole).join(", ")}) pentru perspectiva pe "${keywords.join(", ")}".`,
      isImprovised: true,
    }
  } catch (err) {
    console.error("[IMPROVISATION] MULTI_AGENT_BRAINSTORM strategy error:", err)
    return null
  }
}

/**
 * Strategy 4: MINIMUM_VIABLE
 * Produce the simplest possible useful output.
 */
function tryMinimumViable(context: ImprovisationContext): ImprovisationResult {
  const kbSummary =
    context.availableKB.length > 0
      ? context.availableKB.map((kb) => `  - ${kb.slice(0, 150)}`).join("\n")
      : "  (niciun fragment KB disponibil)"

  const output = [
    `[RASPUNS IMPROVIZAT — Minimum Viable]`,
    ``,
    `Acesta este un raspuns improvizat pentru "${context.taskTitle}".`,
    ``,
    `CE STIM:`,
    kbSummary,
    ``,
    `CE LIPSESTE:`,
    `  - Procedura standard nu e disponibila`,
    `  - Motiv esec: ${context.failureReason.slice(0, 200)}`,
    ``,
    `ACTIUNE PROPUSA (safe, minimal):`,
    `  1. Documenteaza situatia curenta`,
    `  2. Identifica surse de informatie relevante`,
    `  3. Escaladeaza catre ${context.agentRole === "COG" ? "Owner" : "COG"} pentru decizie`,
    ``,
    `NOTA: Aceasta NU este o solutie completa. Este un punct de plecare pentru rezolvare manuala.`,
  ].join("\n")

  return {
    strategy: "MINIMUM_VIABLE",
    output,
    confidence: 0.3,
    reasoning: `Toate strategiile anterioare au esuat. Livrez structura minima utila: ce stim, ce lipseste, ce actiuni safe putem lua.`,
    isImprovised: true,
  }
}

/**
 * Strategy 5: GRACEFUL_NARRATIVE
 * Last resort — explain honestly what happened.
 */
function tryGracefulNarrative(context: ImprovisationContext): ImprovisationResult {
  const output = [
    `[NARATIV TRANSPARENT — Nu am putut rezolva]`,
    ``,
    `Task: "${context.taskTitle}"`,
    `Agent: ${context.agentRole}`,
    ``,
    `CE S-A INTAMPLAT:`,
    `  Calea standard a esuat: ${context.failureReason.slice(0, 300)}`,
    ``,
    `CE AM INCERCAT:`,
    `  - Cautare analogii in LearningArtifact (fara match relevant)`,
    `  - Simplificare cerinte (insuficient context)`,
    `  - Consultare KB agenti adiacenti (fara cunostinte utile)`,
    `  - Generare output minimal (sub pragul de utilitate)`,
    ``,
    `PLAN DE REZOLVARE:`,
    `  1. Owner sau COG trebuie sa ofere directie explicita`,
    `  2. Se recomanda adaugarea de KB entries pentru domeniul "${context.taskTitle.split(" ").slice(0, 3).join(" ")}"`,
    `  3. Task-ul ramane BLOCAT pana la interventie umana sau actualizare KB`,
    ``,
    `Aceasta transparenta e mai utila decat un raspuns incorect.`,
  ].join("\n")

  return {
    strategy: "GRACEFUL_NARRATIVE",
    output,
    confidence: 0.15,
    reasoning: `Toate cele 4 strategii anterioare au esuat sau au produs rezultate sub pragul de acceptabilitate. Livrez narativ transparent — onest e mai bun decat fals.`,
    isImprovised: true,
  }
}

// ── Main improvise function ────────────────────────────────────────────────

/**
 * When all standard paths fail, improvise.
 *
 * Tries strategies in order of decreasing reliability:
 * 1. ANALOGICAL → 2. CONSTRAINT_RELAXATION → 3. MULTI_AGENT_BRAINSTORM →
 * 4. MINIMUM_VIABLE → 5. GRACEFUL_NARRATIVE
 *
 * Always returns a result (GRACEFUL_NARRATIVE is the absolute fallback).
 */
export async function improvise(context: ImprovisationContext): Promise<ImprovisationResult> {
  // Strategy 1: ANALOGICAL
  const analogical = await tryAnalogical(context)
  if (analogical && analogical.confidence >= 0.4) {
    await recordImprovisation(analogical, context)
    return analogical
  }

  // Strategy 2: CONSTRAINT_RELAXATION
  const relaxed = await tryConstraintRelaxation(context)
  if (relaxed && relaxed.confidence >= 0.35) {
    await recordImprovisation(relaxed, context)
    return relaxed
  }

  // Strategy 3: MULTI_AGENT_BRAINSTORM
  const brainstorm = await tryMultiAgentBrainstorm(context)
  if (brainstorm && brainstorm.confidence >= 0.3) {
    await recordImprovisation(brainstorm, context)
    return brainstorm
  }

  // Strategy 4: MINIMUM_VIABLE
  const minimal = tryMinimumViable(context)
  if (minimal.confidence >= 0.2) {
    await recordImprovisation(minimal, context)
    return minimal
  }

  // Strategy 5: GRACEFUL_NARRATIVE (always succeeds)
  const narrative = tryGracefulNarrative(context)
  await recordImprovisation(narrative, context)
  return narrative
}

/**
 * Returns improvisation stats for monitoring/dashboard.
 */
export async function getImprovisationStats(): Promise<ImprovisationStats> {
  return loadStats()
}

/**
 * Returns recent improvisation log entries.
 */
export async function getImprovisationLog(limit: number = 20): Promise<ImprovisationLogEntry[]> {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: IMPROV_LOG_KEY },
    })
    if (!config?.value) return []
    const log = JSON.parse(config.value) as ImprovisationLogEntry[]
    return log.slice(0, limit)
  } catch {
    return []
  }
}
