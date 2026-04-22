/**
 * alignment-checker.ts — Componenta D: Deducție Colaborativă pe Lanțul Ierarhic
 *
 * Principiul P6 fail-safe: dacă agentul nu poate deduce alinierea cu CÂMPUL,
 * NU execută orb ci inițiază un proces pe 5 niveluri de rezoluție.
 *
 * Principiul Owner: FLAG la Owner e ULTIMUL resort (~0.01%).
 * Majoritatea se rezolvă prin extrapolare 3D (laterală + verticală).
 *
 * 5 niveluri:
 * 1. Reguli statice (cost 0)
 * 2. KB propriu — reguli internalizate (cost 0)
 * 3. Extrapolare 3D din agenți înrudiți: frați + superiori + subordonați (cost 0)
 * 4. Deducție AI minimală — Haiku mic (cost minimal)
 * 5. Escalare progresivă pe lanțul ierarhic → COG → FLAG Owner
 *
 * La fiecare rezolvare: LearningArtifact coboară în KB-urile inferioare.
 * Efectul pe termen lung: FLAG-uri la Owner tind spre ZERO.
 */

import { prisma } from "@/lib/prisma"
import Anthropic from "@anthropic-ai/sdk"

export interface AlignmentResult {
  allowed: boolean
  level: 1 | 2 | 3 | 4 | 5
  result: "ALIGNED" | "UNCERTAIN" | "MISALIGNED" | "EXTRAPOLATED" | "ESCALATED"
  reasoning: string
  resolvedBy?: string // agentRole care a rezolvat
  costTokens: number
  artifactCreated: boolean
}

// ═══ Cuvinte/pattern-uri interzise statice (Nivel 1) ═══
export const BLOCKED_PATTERNS = [
  /discrimina(re|t|ți)/i,
  /manipula(re|t)/i,
  /ocoli(re|t).*lege/i,
  /date\s+false/i,
  /falsific/i,
  /hărțui(re|t)/i,
  /evaziune/i,
  /corupție/i,
  /spălare.*bani/i,
]

const SENSITIVE_TAGS = new Set(["legal", "client-facing", "strategy", "financial", "hr-decision"])

/**
 * Verifică alinierea unui task cu CÂMPUL (L1) pe 5 niveluri progresive.
 *
 * @param agentRole - cine vrea să execute
 * @param taskTitle - ce vrea să facă
 * @param taskDescription - detalii
 * @param tags - taguri ale task-ului
 * @param skipLevel2ForRoutine - skip Nivel 4 AI pentru task-uri routine (economie)
 */
export async function checkAlignment(
  agentRole: string,
  taskTitle: string,
  taskDescription: string,
  tags: string[] = [],
  skipLevel2ForRoutine: boolean = false
): Promise<AlignmentResult> {
  const actionSummary = `${taskTitle}: ${taskDescription.slice(0, 200)}`

  // ═══ NIVEL 1: REGULI STATICE (cost = 0) ═══
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(taskTitle) || pattern.test(taskDescription)) {
      const result: AlignmentResult = {
        allowed: false,
        level: 1,
        result: "MISALIGNED",
        reasoning: `Pattern interzis detectat: ${pattern.source}`,
        costTokens: 0,
        artifactCreated: false,
      }
      await logAlignment(agentRole, actionSummary, result)
      return result
    }
  }

  // Dacă task-ul nu e sensibil și e routine → skip nivelurile superioare
  const isSensitive = tags.some((t) => SENSITIVE_TAGS.has(t))
  if (!isSensitive && skipLevel2ForRoutine) {
    return {
      allowed: true,
      level: 1,
      result: "ALIGNED",
      reasoning: "Task routine, trecut Nivel 1 static",
      costTokens: 0,
      artifactCreated: false,
    }
  }

  // ═══ NIVEL 2: KB PROPRIU (cost = 0) ═══
  const ownKB = await prisma.learningArtifact.findFirst({
    where: {
      studentRole: agentRole,
      problemClass: { contains: "alignment", mode: "insensitive" },
      effectivenessScore: { gte: 0.5 },
    },
    orderBy: { effectivenessScore: "desc" },
  })

  if (ownKB) {
    // Verificăm dacă regula din KB confirmă alinierea
    const isAligned = !ownKB.antiPattern ||
      !taskTitle.toLowerCase().includes(ownKB.antiPattern.toLowerCase().slice(0, 30))

    if (isAligned) {
      await prisma.learningArtifact.update({
        where: { id: ownKB.id },
        data: { appliedCount: { increment: 1 } },
      })
      const result: AlignmentResult = {
        allowed: true,
        level: 2,
        result: "ALIGNED",
        reasoning: `Regulă KB propriu aplicată: ${ownKB.rule.slice(0, 100)}`,
        costTokens: 0,
        artifactCreated: false,
      }
      await logAlignment(agentRole, actionSummary, result)
      return result
    }
  }

  // ═══ NIVEL 3: EXTRAPOLARE 3D (cost = 0) ═══
  const relatedRoles = await getRelatedRolesForAlignment(agentRole)

  if (relatedRoles.length > 0) {
    const crossKB = await prisma.learningArtifact.findFirst({
      where: {
        studentRole: { in: relatedRoles },
        problemClass: { contains: "alignment", mode: "insensitive" },
        effectivenessScore: { gte: 0.3 },
      },
      orderBy: { effectivenessScore: "desc" },
    })

    if (crossKB) {
      // Salvăm principiul extrapolat în KB propriu
      await prisma.learningArtifact.create({
        data: {
          problemClass: `alignment::${taskTitle.split(" ").slice(0, 3).join("-").toLowerCase()}`,
          rule: crossKB.rule,
          example: `[EXTRAPOLAT din ${crossKB.teacherRole} via alignment-checker] ${crossKB.example?.slice(0, 200)}`,
          teacherRole: crossKB.teacherRole,
          studentRole: agentRole,
          sourceType: "EXTRAPOLATION",
          effectivenessScore: crossKB.effectivenessScore * 0.6,
        },
      })

      const result: AlignmentResult = {
        allowed: true,
        level: 3,
        result: "EXTRAPOLATED",
        reasoning: `Extrapolat din ${crossKB.teacherRole}: ${crossKB.rule.slice(0, 100)}`,
        resolvedBy: crossKB.teacherRole,
        costTokens: 0,
        artifactCreated: true,
      }
      await logAlignment(agentRole, actionSummary, result)
      return result
    }
  }

  // ═══ NIVEL 4: DEDUCȚIE AI MINIMALĂ (cost = Haiku mic) ═══
  if (isSensitive) {
    try {
      const client = new Anthropic()
      const response = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 100,
        messages: [{
          role: "user",
          content: `Acest task este aliniat cu principiul BINELUI (susține viața, replicabil, auto-propagă)?\n\nTask: "${taskTitle}"\nDetalii: "${taskDescription.slice(0, 200)}"\n\nRăspunde strict: ALIGNED sau UNCERTAIN sau MISALIGNED + motivul în max 20 cuvinte.`,
        }],
      })

      const text = response.content[0].type === "text" ? response.content[0].text : ""
      const tokensUsed = (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0)

      if (text.includes("ALIGNED") && !text.includes("MISALIGNED")) {
        // Salvăm principiul dedus în KB
        await prisma.learningArtifact.create({
          data: {
            problemClass: `alignment::${taskTitle.split(" ").slice(0, 3).join("-").toLowerCase()}`,
            rule: `ALIGNED (dedus AI): ${text.slice(0, 200)}`,
            example: taskTitle,
            teacherRole: "AI_DEDUCTION",
            studentRole: agentRole,
            sourceType: "POST_EXECUTION",
            effectivenessScore: 0.4,
          },
        })

        const result: AlignmentResult = {
          allowed: true,
          level: 4,
          result: "ALIGNED",
          reasoning: text.slice(0, 200),
          costTokens: tokensUsed,
          artifactCreated: true,
        }
        await logAlignment(agentRole, actionSummary, result)
        return result
      }

      if (text.includes("MISALIGNED")) {
        const result: AlignmentResult = {
          allowed: false,
          level: 4,
          result: "MISALIGNED",
          reasoning: text.slice(0, 200),
          costTokens: tokensUsed,
          artifactCreated: false,
        }
        await logAlignment(agentRole, actionSummary, result)
        return result
      }

      // UNCERTAIN → escaladare la Nivel 5
      const result: AlignmentResult = {
        allowed: false,
        level: 5,
        result: "ESCALATED",
        reasoning: `AI UNCERTAIN: ${text.slice(0, 200)}. Escaladat la superior.`,
        costTokens: tokensUsed,
        artifactCreated: false,
      }
      await logAlignment(agentRole, actionSummary, result)
      return result
    } catch {
      // Dacă AI eșuează → escaladare
    }
  }

  // ═══ NIVEL 5: ESCALARE (fallback — task marcat pentru review superior) ═══
  const result: AlignmentResult = {
    allowed: false,
    level: 5,
    result: "ESCALATED",
    reasoning: "Nu s-a putut deduce alinierea la nivelurile 1-4. Escaladat pe lanțul ierarhic.",
    costTokens: 0,
    artifactCreated: false,
  }
  await logAlignment(agentRole, actionSummary, result)
  return result
}

// ═══ UTILITĂȚI ═══

async function getRelatedRolesForAlignment(agentRole: string): Promise<string[]> {
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
  } catch {
    // silent
  }
  return [...new Set(related)]
}

async function logAlignment(
  agentRole: string,
  actionSummary: string,
  result: AlignmentResult
): Promise<void> {
  try {
    await prisma.alignmentLog.create({
      data: {
        agentRole,
        actionSummary,
        level: result.level,
        result: result.result,
        resolvedBy: result.resolvedBy ?? null,
        reasoning: result.reasoning,
        artifactCreated: result.artifactCreated,
        costTokens: result.costTokens,
      },
    })
  } catch {
    // Nu blocăm execuția dacă logarea eșuează
  }
}
