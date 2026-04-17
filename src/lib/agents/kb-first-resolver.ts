/**
 * kb-first-resolver.ts — Componenta B: KB-first (resurse interne întâi)
 *
 * Principiul P3: Înainte de orice apel AI extern, verificăm KB intern.
 * Dacă răspunsul există cu confidence suficientă → îl folosim (cost ZERO).
 * Dacă NU → apelăm extern + salvăm în KB (a doua oară cost ZERO).
 *
 * 4 niveluri de match:
 * 1. Exact match (titlu + tip task identic rezolvat anterior)
 * 2. Vector similarity (pgvector dacă activat)
 * 3. Cross-agent match (KB agenți înrudiți)
 * 4. Miss → apel extern necesar
 */

import { prisma } from "@/lib/prisma"

export interface KBResolveResult {
  hit: boolean
  level: "EXACT" | "VECTOR" | "CROSS_AGENT" | "MISS"
  content?: string // răspunsul din KB dacă hit
  confidence: number // 0-1
  sourceEntryId?: string
  sourceAgentRole?: string
}

/**
 * Încearcă rezolvarea unui task din KB ÎNAINTE de apel AI extern.
 *
 * @param agentRole - rolul agentului care execută
 * @param taskTitle - titlul task-ului
 * @param taskDescription - descrierea task-ului
 * @param threshold - pragul minim de similaritate (default 0.85)
 */
export async function resolveFromKB(
  agentRole: string,
  taskTitle: string,
  taskDescription: string,
  threshold: number = 0.85
): Promise<KBResolveResult> {
  // ═══ Nivel 1: EXACT MATCH ═══
  // Caută în LearningArtifact cu problemClass similară
  const exactMatch = await prisma.learningArtifact.findFirst({
    where: {
      studentRole: agentRole,
      problemClass: { contains: taskTitle.split(" ").slice(0, 3).join(" "), mode: "insensitive" },
      effectivenessScore: { gte: 0.5 },
    },
    orderBy: { effectivenessScore: "desc" },
  })

  if (exactMatch) {
    // Incrementăm appliedCount
    await prisma.learningArtifact.update({
      where: { id: exactMatch.id },
      data: { appliedCount: { increment: 1 } },
    })
    return {
      hit: true,
      level: "EXACT",
      content: `${exactMatch.rule}\n\nExemplu: ${exactMatch.example}`,
      confidence: Math.min(exactMatch.effectivenessScore + 0.1, 1.0),
      sourceEntryId: exactMatch.id,
      sourceAgentRole: exactMatch.teacherRole,
    }
  }

  // Caută în KB entries ale agentului
  const kbMatch = await (prisma as any).kBEntry?.findFirst({
    where: {
      agentRole,
      content: { contains: taskTitle.split(" ").slice(0, 3).join(" "), mode: "insensitive" },
      confidence: { gte: threshold },
    },
    orderBy: { confidence: "desc" },
  }).catch(() => null)

  if (kbMatch) {
    return {
      hit: true,
      level: "EXACT",
      content: kbMatch.content,
      confidence: kbMatch.confidence ?? 0.85,
      sourceEntryId: kbMatch.id,
      sourceAgentRole: agentRole,
    }
  }

  // ═══ Nivel 2: VECTOR SIMILARITY ═══
  // pgvector search dacă disponibil (skip dacă nu e configurat)
  // TODO: implementare pgvector search când embeddings sunt active
  // const vectorMatch = await searchKBByVector(taskDescription, agentRole, threshold)
  // if (vectorMatch) return { hit: true, level: "VECTOR", ... }

  // ═══ Nivel 3: CROSS-AGENT MATCH ═══
  // Caută în KB-urile agenților înrudiți (frați + superiori + subordonați)
  const relatedRoles = await getRelatedAgentRoles(agentRole)

  if (relatedRoles.length > 0) {
    // Caută LearningArtifact de la agenți înrudiți
    const crossMatch = await prisma.learningArtifact.findFirst({
      where: {
        studentRole: { in: relatedRoles },
        problemClass: { contains: taskTitle.split(" ").slice(0, 3).join(" "), mode: "insensitive" },
        effectivenessScore: { gte: 0.3 }, // threshold mai permisiv pentru extrapolare
      },
      orderBy: { effectivenessScore: "desc" },
    })

    if (crossMatch) {
      // Salvăm artefactul extrapolat în KB-ul agentului curent
      await prisma.learningArtifact.create({
        data: {
          problemClass: crossMatch.problemClass,
          rule: crossMatch.rule,
          example: `[EXTRAPOLAT din ${crossMatch.teacherRole}] ${crossMatch.example}`,
          antiPattern: crossMatch.antiPattern,
          teacherRole: crossMatch.teacherRole,
          studentRole: agentRole,
          sourceType: "EXTRAPOLATION",
          effectivenessScore: crossMatch.effectivenessScore * 0.7, // confidence redusă la extrapolare
        },
      })

      return {
        hit: true,
        level: "CROSS_AGENT",
        content: `[Extrapolat din ${crossMatch.teacherRole}] ${crossMatch.rule}\n\nExemplu: ${crossMatch.example}`,
        confidence: crossMatch.effectivenessScore * 0.7,
        sourceEntryId: crossMatch.id,
        sourceAgentRole: crossMatch.teacherRole,
      }
    }
  }

  // ═══ Nivel 4: MISS ═══
  return {
    hit: false,
    level: "MISS",
    confidence: 0,
  }
}

/**
 * Identifică agenții înrudiți (laterali + ierarhici) pentru extrapolare.
 * Citește relațiile din DB (tabela agents cu reportsTo).
 */
async function getRelatedAgentRoles(agentRole: string): Promise<string[]> {
  const related: string[] = []

  try {
    // Caută agentul curent și relațiile lui
    const agent = await (prisma as any).agent?.findFirst({
      where: { role: agentRole },
      select: { reportsTo: true },
    }).catch(() => null)

    if (agent?.reportsTo) {
      // Superior direct
      related.push(agent.reportsTo)

      // Frați (același superior)
      const siblings = await (prisma as any).agent?.findMany({
        where: { reportsTo: agent.reportsTo, role: { not: agentRole } },
        select: { role: true },
        take: 10,
      }).catch(() => [])
      for (const s of siblings ?? []) related.push(s.role)
    }

    // Subordonați direcți
    const subs = await (prisma as any).agent?.findMany({
      where: { reportsTo: agentRole },
      select: { role: true },
      take: 10,
    }).catch(() => [])
    for (const s of subs ?? []) related.push(s.role)
  } catch {
    // Dacă tabela agent nu există, returnăm gol
  }

  return [...new Set(related)]
}

/**
 * Salvează cunoașterea dobândită în KB după o execuție reușită.
 * P3: "a doua oară costul e ZERO"
 */
export async function saveToKBAfterExecution(
  agentRole: string,
  taskTitle: string,
  taskResult: string,
  confidence: number = 0.6
): Promise<void> {
  // Salvăm ca LearningArtifact de tip POST_EXECUTION
  await prisma.learningArtifact.create({
    data: {
      problemClass: taskTitle.split(" ").slice(0, 5).join(" "),
      rule: `Rezolvat prin execuție directă: ${taskTitle}`,
      example: taskResult.slice(0, 500),
      teacherRole: agentRole,
      studentRole: agentRole, // self-learning
      sourceType: "POST_EXECUTION",
      effectivenessScore: confidence,
    },
  })
}
