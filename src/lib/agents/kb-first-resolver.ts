/**
 * kb-first-resolver.ts — Componenta B: KB-first (resurse interne întâi)
 *
 * Principiul P3: Înainte de orice apel AI extern, verificăm KB intern.
 * Dacă răspunsul există cu confidence suficientă → îl folosim (cost ZERO).
 * Dacă NU → apelăm extern + salvăm în KB (a doua oară cost ZERO).
 *
 * Căutare pe MULTIPLE axe:
 * 1. SOP/procedură per tip task (problemClass: "procedure")
 * 2. Cunoștințe domeniu relevante (rule conține keywords)
 * 3. Cross-agent match (KB agenți înrudiți)
 * 4. KBEntry (tabelul vechi) ca fallback
 */

import { prisma } from "@/lib/prisma"

export interface KBResolveResult {
  hit: boolean
  level: "EXACT" | "PROCEDURE" | "KNOWLEDGE" | "CROSS_AGENT" | "KB_LEGACY" | "MISS"
  content?: string
  confidence: number
  sourceEntryId?: string
  sourceAgentRole?: string
}

/**
 * Încearcă rezolvarea unui task din KB ÎNAINTE de apel AI extern.
 */
export async function resolveFromKB(
  agentRole: string,
  taskTitle: string,
  taskDescription: string,
  threshold: number = 0.85
): Promise<KBResolveResult> {
  // Cuvinte cheie din task
  const keywords = (taskTitle + " " + taskDescription)
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 3)
    .slice(0, 10)

  // ═══ Nivel 1: SOP / PROCEDURĂ ═══
  // Agentul are procedură definită? (cea mai valoroasă — score 1.0)
  // Doar artefacte validate (folosite cu succes) sau cu score ridicat (seeduire)
  const procedure = await prisma.learningArtifact.findFirst({
    where: {
      studentRole: agentRole,
      problemClass: "procedure",
      effectivenessScore: { gte: 0.8 },
      OR: [
        { validated: true },
        { effectivenessScore: { gte: 0.9 } }, // seeduire originală — trusted
      ],
    },
    orderBy: { effectivenessScore: "desc" },
  })

  if (procedure) {
    await prisma.learningArtifact.update({
      where: { id: procedure.id },
      data: { appliedCount: { increment: 1 } },
    })
    // Procedura e context, nu răspuns complet — dar ghidează execuția
    // Returnăm ca hit DOAR dacă procedura conține cuvinte din task
    const procedureLower = procedure.rule.toLowerCase()
    const keywordHits = keywords.filter(kw => procedureLower.includes(kw)).length
    if (keywordHits >= 2) {
      return {
        hit: true,
        level: "PROCEDURE",
        content: procedure.rule,
        confidence: 0.9,
        sourceEntryId: procedure.id,
      }
    }
  }

  // ═══ Nivel 2: CUNOȘTINȚE DOMENIU (rule conține keywords din task) ═══
  // Doar artefacte validate sau cu score ridicat
  for (const keyword of keywords.slice(0, 5)) {
    const match = await prisma.learningArtifact.findFirst({
      where: {
        studentRole: agentRole,
        rule: { contains: keyword, mode: "insensitive" },
        effectivenessScore: { gte: 0.5 },
        problemClass: { not: "procedure" },
        OR: [
          { validated: true },
          { effectivenessScore: { gte: 0.8 } },
        ],
      },
      orderBy: { effectivenessScore: "desc" },
    })

    if (match) {
      await prisma.learningArtifact.update({
        where: { id: match.id },
        data: { appliedCount: { increment: 1 } },
      })
      return {
        hit: true,
        level: "KNOWLEDGE",
        content: `${match.rule}\n\nExemplu: ${match.example}`,
        confidence: Math.min(match.effectivenessScore + 0.05, 1.0),
        sourceEntryId: match.id,
        sourceAgentRole: match.teacherRole,
      }
    }
  }

  // ═══ Nivel 3: CROSS-AGENT MATCH ═══
  const relatedRoles = await getRelatedAgentRoles(agentRole)

  if (relatedRoles.length > 0) {
    for (const keyword of keywords.slice(0, 3)) {
      const crossMatch = await prisma.learningArtifact.findFirst({
        where: {
          studentRole: { in: relatedRoles },
          rule: { contains: keyword, mode: "insensitive" },
          effectivenessScore: { gte: 0.5 },
        },
        orderBy: { effectivenessScore: "desc" },
      })

      if (crossMatch) {
        return {
          hit: true,
          level: "CROSS_AGENT",
          content: `[Extrapolat din ${crossMatch.teacherRole}] ${crossMatch.rule}`,
          confidence: crossMatch.effectivenessScore * 0.7,
          sourceEntryId: crossMatch.id,
          sourceAgentRole: crossMatch.teacherRole,
        }
      }
    }
  }

  // ═══ Nivel 4: KB LEGACY (tabelul vechi KBEntry) ═══
  try {
    const kbMatch = await (prisma as any).kBEntry?.findFirst({
      where: {
        agentRole,
        content: { contains: keywords[0] || taskTitle.slice(0, 20), mode: "insensitive" },
        confidence: { gte: 0.7 },
      },
      orderBy: { confidence: "desc" },
    })

    if (kbMatch) {
      return {
        hit: true,
        level: "KB_LEGACY",
        content: kbMatch.content,
        confidence: kbMatch.confidence ?? 0.7,
        sourceEntryId: kbMatch.id,
        sourceAgentRole: agentRole,
      }
    }
  } catch {}

  // ═══ Nivel 5: MISS ═══
  return { hit: false, level: "MISS", confidence: 0 }
}

/**
 * Identifică agenții înrudiți (laterali + ierarhici) pentru extrapolare.
 */
async function getRelatedAgentRoles(agentRole: string): Promise<string[]> {
  const related: string[] = []

  try {
    const agent = await (prisma as any).agent?.findFirst({
      where: { role: agentRole },
      select: { reportsTo: true },
    }).catch(() => null)

    if (agent?.reportsTo) {
      related.push(agent.reportsTo)
      const siblings = await (prisma as any).agent?.findMany({
        where: { reportsTo: agent.reportsTo, role: { not: agentRole } },
        select: { role: true },
        take: 10,
      }).catch(() => [])
      for (const s of siblings ?? []) related.push(s.role)
    }

    const subs = await (prisma as any).agent?.findMany({
      where: { reportsTo: agentRole },
      select: { role: true },
      take: 10,
    }).catch(() => [])
    for (const s of subs ?? []) related.push(s.role)
  } catch {}

  return [...new Set(related)]
}

/**
 * Salvează cunoașterea dobândită în KB după o execuție reușită.
 */
/**
 * Salvează cunoașterea dobândită după execuție aprobată de manager.
 * Artefactul se creează cu validated=true (managerul a confirmat calitatea)
 * și confidence din parametru (default 0.7 = aprobat, 0.5 = auto).
 */
export async function saveToKBAfterExecution(
  agentRole: string,
  taskTitle: string,
  taskResult: string,
  confidence: number = 0.7
): Promise<void> {
  await prisma.learningArtifact.create({
    data: {
      problemClass: taskTitle.split(" ").slice(0, 5).join(" ").toLowerCase(),
      rule: `${taskTitle}: ${taskResult.slice(0, 2000)}`,
      example: taskResult.slice(0, 500),
      teacherRole: agentRole,
      studentRole: agentRole,
      sourceType: "POST_EXECUTION",
      effectivenessScore: confidence,
      validated: confidence >= 0.7, // aprobat de manager = validated
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    },
  })
}
