/**
 * learning-pipeline.ts — Componenta C: Learning Artifact Pipeline
 *
 * Principiul P1: Escalare cu învățare (anti-buclă).
 * Principiul P6: Învățare bidirecțională (inductiv + deductiv).
 *
 * Două fluxuri:
 * 1. POST-EXECUȚIE (inductiv): din rezultatul unei execuții reușite,
 *    extragem pattern → regulă → salvăm în KB
 * 2. ESCALARE REZOLVATĂ (P1): când superiorul rezolvă un task escalat,
 *    emite LearningArtifact care coboară în KB-ul subordonatului.
 *    A doua oară, subordonatul nu mai escaladează.
 *
 * Efectul pe termen lung: sistemul devine mai autonom cu fiecare
 * interacțiune. KB-ul crește organic, escaladările scad exponențial.
 */

import { prisma } from "@/lib/prisma"

// ═══════════════════════════════════════════════════════════
// FLUX 1: POST-EXECUȚIE (inductiv)
// ═══════════════════════════════════════════════════════════

export interface PostExecutionInput {
  taskId: string
  agentRole: string
  taskTitle: string
  taskType: string
  result: string
  wasSuccessful: boolean
}

/**
 * Extrage un artefact de învățare din rezultatul unei execuții reușite.
 * Salvează în KB-ul agentului ca self-learning (teacherRole = studentRole).
 */
export async function extractPostExecutionLearning(
  input: PostExecutionInput
): Promise<string | null> {
  if (!input.wasSuccessful || !input.result || input.result.length < 50) {
    return null
  }

  // Clasificăm problema din titlul task-ului
  const problemClass = classifyProblem(input.taskTitle, input.taskType)

  // Verificăm dacă nu avem deja un artefact similar (evităm duplicare)
  const existing = await prisma.learningArtifact.findFirst({
    where: {
      studentRole: input.agentRole,
      problemClass,
      sourceType: "POST_EXECUTION",
    },
  })

  if (existing) {
    // Actualizăm effectiveness-ul (dovadă că pattern-ul se repetă)
    await prisma.learningArtifact.update({
      where: { id: existing.id },
      data: {
        appliedCount: { increment: 1 },
        effectivenessScore: Math.min(existing.effectivenessScore + 0.05, 1.0),
      },
    })
    return existing.id
  }

  // Creăm artefact nou
  const artifact = await prisma.learningArtifact.create({
    data: {
      problemClass,
      rule: `Task "${input.taskTitle}" rezolvat cu succes de ${input.agentRole}`,
      example: input.result.slice(0, 500),
      teacherRole: input.agentRole,
      studentRole: input.agentRole,
      sourceType: "POST_EXECUTION",
      sourceEscalationId: input.taskId,
      effectivenessScore: 0.3, // scor inițial modest
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // expiră în 90 zile dacă nu e folosit
    },
  })

  return artifact.id
}

// ═══════════════════════════════════════════════════════════
// FLUX 2: ESCALARE REZOLVATĂ (P1 explicit)
// ═══════════════════════════════════════════════════════════

export interface EscalationResolutionInput {
  originalTaskId: string
  escalatedFromRole: string // subordonatul care a escalat
  resolvedByRole: string // superiorul care a rezolvat
  problemTitle: string
  resolution: string // soluția
  reasoning: string // de ce funcționează
}

/**
 * Când superiorul rezolvă un task escalat, produce un LearningArtifact
 * care coboară în KB-ul subordonatului + al agenților înrudiți.
 *
 * P1: "A doua oară, subordonatul nu mai escaladează pentru aceeași clasă
 * de probleme."
 */
export async function createEscalationLearning(
  input: EscalationResolutionInput
): Promise<{ artifactId: string; propagatedTo: string[] }> {
  const problemClass = classifyProblem(input.problemTitle, "ESCALATION")

  // 1. Creăm artefactul principal (teacher → student)
  const artifact = await prisma.learningArtifact.create({
    data: {
      problemClass,
      rule: input.resolution,
      example: `Escalat de ${input.escalatedFromRole}: "${input.problemTitle}". Rezolvat de ${input.resolvedByRole}: ${input.reasoning}`,
      teacherRole: input.resolvedByRole,
      studentRole: input.escalatedFromRole,
      sourceType: "ESCALATION",
      sourceEscalationId: input.originalTaskId,
      effectivenessScore: 0.7, // scor inițial mai mare (vine de la superior)
      expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 180 zile
    },
  })

  // 2. Propagăm la agenți înrudiți (frații subordonatului)
  const propagatedTo: string[] = [input.escalatedFromRole]

  try {
    const siblings = await (prisma as any).agent?.findMany({
      where: {
        reportsTo: input.resolvedByRole,
        role: { not: input.escalatedFromRole },
      },
      select: { role: true },
      take: 10,
    }).catch(() => [])

    for (const sibling of siblings ?? []) {
      await prisma.learningArtifact.create({
        data: {
          problemClass,
          rule: input.resolution,
          example: `[PROPAGAT de la ${input.escalatedFromRole}] ${input.reasoning}`,
          teacherRole: input.resolvedByRole,
          studentRole: sibling.role,
          sourceType: "ESCALATION",
          sourceEscalationId: input.originalTaskId,
          effectivenessScore: 0.5, // scor mai mic la propagare
          expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
        },
      })
      propagatedTo.push(sibling.role)
    }
  } catch {
    // Ignorăm erorile de propagare (nu blocăm fluxul principal)
  }

  return { artifactId: artifact.id, propagatedTo }
}

// ═══════════════════════════════════════════════════════════
// UTILITĂȚI
// ═══════════════════════════════════════════════════════════

/**
 * Clasifică problema din titlul task-ului (pentru matching ulterior).
 * Normalizare: lowercase, eliminare cuvinte comune, primele 5 cuvinte relevante.
 */
function classifyProblem(title: string, taskType: string): string {
  const stopWords = new Set([
    "a", "al", "ale", "ar", "au", "ca", "ce", "cu", "da", "de", "din",
    "e", "ei", "el", "este", "eu", "fi", "in", "la", "le", "lui",
    "mai", "ne", "ni", "no", "nu", "o", "pe", "pentru", "sa", "se",
    "si", "sunt", "un", "va", "vom", "și", "că", "în", "să",
    "the", "a", "an", "is", "of", "to", "for", "with", "on", "at",
  ])

  const words = title
    .toLowerCase()
    .replace(/[^a-zA-ZăâîșțĂÂÎȘȚ\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w))
    .slice(0, 5)

  return `${taskType}::${words.join("-")}`
}

/**
 * Cleanup: expiră artefactele nefolosite > 90 zile.
 * Rulat periodic (ex: o dată pe săptămână).
 */
export async function expireUnusedArtifacts(): Promise<number> {
  const result = await prisma.learningArtifact.deleteMany({
    where: {
      expiresAt: { lte: new Date() },
      appliedCount: 0,
    },
  })
  return result.count
}

/**
 * Statistici learning pipeline pentru dashboard COG.
 */
export async function getLearningStats() {
  const [total, bySource, topEffective, recentCreated] = await Promise.all([
    prisma.learningArtifact.count(),
    prisma.learningArtifact.groupBy({
      by: ["sourceType"],
      _count: { _all: true },
    }),
    prisma.learningArtifact.findMany({
      orderBy: { effectivenessScore: "desc" },
      take: 5,
      select: {
        problemClass: true,
        teacherRole: true,
        studentRole: true,
        effectivenessScore: true,
        appliedCount: true,
      },
    }),
    prisma.learningArtifact.count({
      where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    }),
  ])

  return {
    totalArtifacts: total,
    bySource: Object.fromEntries(bySource.map((s) => [s.sourceType, s._count._all])),
    topEffective,
    createdLast7Days: recentCreated,
  }
}
