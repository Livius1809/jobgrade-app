/**
 * learning-funnel.ts — Pâlnia de învățare
 *
 * Mecanism interfață agent ↔ mediu.
 * Totul ce trece prin agent produce învățare.
 *
 * 6 niveluri:
 * 1. CAPTURĂ — log structurat per eveniment
 * 2. DISTILARE — extrage declarativ + procedural + anti-pattern
 * 3. AGENT — KB individual actualizat
 * 4. DEPARTAMENT — propagare la frați
 * 5. ORGANIZAȚIE — consolidare cross-departament
 * 6. SPIRALĂ — feedback loop descendent
 */

import { prisma } from "@/lib/prisma"
import Anthropic from "@anthropic-ai/sdk"

// ═══ TIPURI ═══

export interface AgentEvent {
  agentRole: string
  type: "TASK" | "CONVERSATION" | "SIGNAL" | "FEEDBACK" | "ERROR" | "COURSE" | "DECISION"
  input: string
  output: string
  success: boolean
  metadata?: Record<string, any>
}

interface DistilledKnowledge {
  declarative: string[]   // CE am învățat (fapte noi)
  procedural: string[]    // CUM fac (proceduri noi/rafinate)
  antiPatterns: string[]  // CE NU fac (greșeli descoperite)
  confirms: string[]      // CE am confirmat (cunoștințe existente validate)
  refutes: string[]       // CE am infirmat (cunoștințe existente greșite)
}

// ═══ NIVEL 1-3: CAPTURĂ → DISTILARE → INTEGRARE AGENT ═══

/**
 * Punct de intrare principal: orice interacțiune trece prin pâlnie.
 */
export async function learningFunnel(event: AgentEvent): Promise<{
  knowledgeCreated: number
  knowledgeUpdated: number
  antiPatternsFound: number
}> {
  let knowledgeCreated = 0
  let knowledgeUpdated = 0
  let antiPatternsFound = 0

  // NIVEL 2: Distilare (AI minimală — Haiku pentru cost redus)
  const distilled = await distillLearning(event)

  // NIVEL 3: Integrare agent
  for (const knowledge of distilled.declarative) {
    if (knowledge.length < 20) continue
    const created = await upsertAgentKnowledge(event.agentRole, "declarative", knowledge)
    if (created) knowledgeCreated++
    else knowledgeUpdated++
  }

  for (const procedure of distilled.procedural) {
    if (procedure.length < 20) continue
    const created = await upsertAgentKnowledge(event.agentRole, "procedural", procedure)
    if (created) knowledgeCreated++
    else knowledgeUpdated++
  }

  for (const antiPattern of distilled.antiPatterns) {
    if (antiPattern.length < 20) continue
    await prisma.learningArtifact.create({
      data: {
        studentRole: event.agentRole,
        teacherRole: "learning-funnel",
        problemClass: "anti-pattern-discovered",
        rule: antiPattern,
        example: `Descoperit din ${event.type}: ${event.input.slice(0, 100)}`,
        antiPattern: antiPattern,
        sourceType: "POST_EXECUTION",
        effectivenessScore: 0.8,
      },
    })
    antiPatternsFound++
  }

  // Confirmare cunoștințe existente → crește score
  for (const confirm of distilled.confirms) {
    await boostMatchingKnowledge(event.agentRole, confirm, 0.02)
  }

  // Infirmare → scade score
  for (const refute of distilled.refutes) {
    await boostMatchingKnowledge(event.agentRole, refute, -0.1)
  }

  return { knowledgeCreated, knowledgeUpdated, antiPatternsFound }
}

// ═══ NIVEL 2: DISTILARE CU AI ═══

async function distillLearning(event: AgentEvent): Promise<DistilledKnowledge> {
  const empty: DistilledKnowledge = { declarative: [], procedural: [], antiPatterns: [], confirms: [], refutes: [] }

  // Skip dacă eveniment trivial
  if (event.output.length < 50) return empty

  try {
    const client = new Anthropic()
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      messages: [{
        role: "user",
        content: `Analizează această interacțiune a agentului ${event.agentRole} și extrage cunoștințe:

EVENIMENT: ${event.type}
SUCCES: ${event.success}
INPUT: ${event.input.slice(0, 500)}
OUTPUT: ${event.output.slice(0, 1000)}

Extrage în format JSON strict (fără alte comentarii):
{
  "declarative": ["fapt nou 1", "fapt nou 2"],
  "procedural": ["pas/procedură nouă 1"],
  "antiPatterns": ["ce NU trebuie făcut"],
  "confirms": ["cunoștință existentă confirmată"],
  "refutes": ["cunoștință existentă infirmată"]
}

Reguli:
- DOAR cunoștințe NOI sau RAFINATE, nu reformulări ale inputului
- Minim 20 caractere per intrare
- Dacă nu e nimic nou → arrays goale
- Maxim 3 per categorie`
      }],
    })

    const text = response.content[0].type === "text" ? response.content[0].text : ""
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return empty

    const parsed = JSON.parse(jsonMatch[0])
    return {
      declarative: Array.isArray(parsed.declarative) ? parsed.declarative : [],
      procedural: Array.isArray(parsed.procedural) ? parsed.procedural : [],
      antiPatterns: Array.isArray(parsed.antiPatterns) ? parsed.antiPatterns : [],
      confirms: Array.isArray(parsed.confirms) ? parsed.confirms : [],
      refutes: Array.isArray(parsed.refutes) ? parsed.refutes : [],
    }
  } catch (e) {
    console.log("[LEARNING-FUNNEL] Distill error:", (e as Error).message?.slice(0, 100))
    return empty
  }
}

// ═══ NIVEL 3: UPSERT CUNOȘTINȚĂ AGENT ═══

async function upsertAgentKnowledge(
  agentRole: string,
  type: "declarative" | "procedural",
  knowledge: string
): Promise<boolean> {
  // Caută dacă există deja ceva similar
  const existing = await prisma.learningArtifact.findFirst({
    where: {
      studentRole: agentRole,
      problemClass: { contains: type },
      rule: { contains: knowledge.slice(0, 50), mode: "insensitive" },
    },
  })

  if (existing) {
    // Update: crește applied count + score
    await prisma.learningArtifact.update({
      where: { id: existing.id },
      data: {
        appliedCount: { increment: 1 },
        effectivenessScore: Math.min(1.0, existing.effectivenessScore + 0.01),
      },
    })
    return false // updated, not created
  }

  // Create nou
  await prisma.learningArtifact.create({
    data: {
      studentRole: agentRole,
      teacherRole: "learning-funnel",
      problemClass: `funnel-${type}`,
      rule: knowledge,
      example: `Învățat din experiență directă`,
      antiPattern: "",
      sourceType: "POST_EXECUTION",
      effectivenessScore: 0.7, // începe mai jos, crește cu utilizarea
    },
  })
  return true // created
}

// ═══ BOOST/PENALIZE CUNOȘTINȚE ═══

async function boostMatchingKnowledge(agentRole: string, hint: string, delta: number) {
  const matches = await prisma.learningArtifact.findMany({
    where: {
      studentRole: agentRole,
      rule: { contains: hint.slice(0, 30), mode: "insensitive" },
    },
    take: 3,
  })

  for (const match of matches) {
    const newScore = Math.max(0, Math.min(1.0, match.effectivenessScore + delta))
    await prisma.learningArtifact.update({
      where: { id: match.id },
      data: { effectivenessScore: newScore },
    })
  }
}

// ═══ NIVEL 4: PROPAGARE DEPARTAMENTALĂ ═══

const DEPARTMENT_MAP: Record<string, string[]> = {
  "COG": ["cog-agent", "CCO", "DOA", "DOAS", "QLA"],
  "MARKETING": ["DMA", "cma-agent", "CWA", "MKA", "ACA"],
  "CLIENT": ["soa-agent", "hr-counselor-agent", "COCSA", "CSM", "CSA", "CSSA", "DVB2B"],
  "LEGAL": ["CJA", "DPA", "CCIA"],
  "FINANCE": ["CFO", "COAFin", "BCA"],
  "TECH": ["coa-agent", "SVHA", "DOAS"],
  "INTELLIGENCE": ["CIA", "RDA", "CDIA"],
  "PRODUCT": ["PMA", "PPMO", "DVB2B"],
}

function getDepartmentSiblings(agentRole: string): string[] {
  for (const [, agents] of Object.entries(DEPARTMENT_MAP)) {
    if (agents.includes(agentRole)) {
      return agents.filter(a => a !== agentRole)
    }
  }
  return []
}

/**
 * Propagare zilnică: cunoștințe valoroase → frați din departament
 */
export async function propagateDepartmentLearning(): Promise<number> {
  const valuable = await prisma.learningArtifact.findMany({
    where: {
      effectivenessScore: { gte: 0.85 },
      appliedCount: { gte: 3 },
      validated: true, // OBLIGATORIU — nu propagăm halucinații
      teacherRole: { not: "learning-funnel-propagated" }, // nu propaga din nou ce a fost propagat
    },
    take: 20,
  })

  let propagated = 0
  for (const knowledge of valuable) {
    const siblings = getDepartmentSiblings(knowledge.studentRole)
    for (const sibling of siblings) {
      // Verifică dacă agentul are deja
      const exists = await prisma.learningArtifact.findFirst({
        where: {
          studentRole: sibling,
          rule: { contains: knowledge.rule.slice(0, 50), mode: "insensitive" },
        },
      })
      if (exists) continue

      await prisma.learningArtifact.create({
        data: {
          studentRole: sibling,
          teacherRole: "learning-funnel-propagated",
          problemClass: knowledge.problemClass,
          rule: knowledge.rule,
          example: `Propagat de la ${knowledge.studentRole} (score ${knowledge.effectivenessScore.toFixed(2)})`,
          antiPattern: knowledge.antiPattern || "",
          sourceType: "EXTRAPOLATION",
          effectivenessScore: knowledge.effectivenessScore * 0.8, // puțin mai mic decât originalul
        },
      })
      propagated++
    }
  }

  return propagated
}

// ═══ NIVEL 5: CONSOLIDARE ORGANIZAȚIONALĂ ═══

/**
 * Consolidare săptămânală: pattern-uri cross-departament → cunoștință organizație
 */
export async function consolidateOrgLearning(): Promise<number> {
  // Găsește cunoștințe care apar la 3+ agenți din departamente diferite
  const frequent = await prisma.$queryRaw`
    SELECT rule, COUNT(DISTINCT "studentRole") as agent_count, AVG("effectivenessScore") as avg_score
    FROM learning_artifacts
    WHERE "effectivenessScore" >= 0.8 AND validated = true
    GROUP BY rule
    HAVING COUNT(DISTINCT "studentRole") >= 3
    ORDER BY agent_count DESC
    LIMIT 10
  ` as Array<{ rule: string; agent_count: bigint; avg_score: number }>

  let consolidated = 0
  for (const pattern of frequent) {
    // Salvează ca cunoștință organizațională (pentru COG)
    const exists = await prisma.learningArtifact.findFirst({
      where: {
        studentRole: "ORG",
        rule: { contains: pattern.rule.slice(0, 50), mode: "insensitive" },
      },
    })
    if (exists) continue

    await prisma.learningArtifact.create({
      data: {
        studentRole: "ORG",
        teacherRole: "learning-funnel-consolidation",
        problemClass: "org-pattern",
        rule: pattern.rule,
        example: `Pattern cross-departament: ${pattern.agent_count} agenți, score ${pattern.avg_score.toFixed(2)}`,
        antiPattern: "",
        sourceType: "EXTRAPOLATION",
        effectivenessScore: Math.min(1.0, pattern.avg_score + 0.1),
      },
    })
    consolidated++
  }

  return consolidated
}

// ═══ NIVEL 6: SPIRALA EVOLUTIVĂ ═══

/**
 * Evaluare maturitate per agent — apelat lunar
 */
export async function evaluateMaturity(agentRole: string): Promise<{
  level: "SEED" | "SPROUT" | "GROWTH" | "BLOOM"
  score: number
  artifacts: number
  avgEffectiveness: number
}> {
  const stats = await prisma.learningArtifact.aggregate({
    where: { studentRole: agentRole },
    _count: true,
    _avg: { effectivenessScore: true },
    _sum: { appliedCount: true },
  })

  const artifacts = stats._count
  const avgScore = stats._avg.effectivenessScore || 0
  const totalApplied = stats._sum.appliedCount || 0

  // Maturitate bazată pe volum + calitate + utilizare
  const score = (
    Math.min(1, artifacts / 50) * 0.3 +     // volum: 50 artifacts = max
    avgScore * 0.4 +                          // calitate: score mediu
    Math.min(1, totalApplied / 100) * 0.3    // utilizare: 100 aplicări = max
  )

  let level: "SEED" | "SPROUT" | "GROWTH" | "BLOOM"
  if (score >= 0.8) level = "BLOOM"
  else if (score >= 0.6) level = "GROWTH"
  else if (score >= 0.3) level = "SPROUT"
  else level = "SEED"

  return { level, score, artifacts, avgEffectiveness: avgScore }
}
