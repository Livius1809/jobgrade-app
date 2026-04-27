/**
 * learning-orchestrator.ts — Orchestrator unic de invatare cu bucle de feedback
 *
 * Pipeline complet:
 *   EVERY_CYCLE:
 *     1. Propagare departamentala (KB catre frati)
 *     2. Feedback propagare (artefacte propagate → evalueaza eficacitate)
 *     3. Cleanup artefacte expirate + analiza "de ce nu s-a folosit"
 *     4. Statistici invatare
 *
 *   DAILY:
 *     5. Consolidare organizationala → re-injectare in agenti (bucla inchisa)
 *     6. Distilare ierarhica bottom-up → re-alimentare palnie (bucla inchisa)
 *     7. Evaluare maturitate → interventie pe agenti slabi (bucla inchisa)
 *
 * Buclele de feedback (NOUL mecanism):
 *   F1. ORG artifacts → re-injectate ca KB in agentii de nivel tactic/strategic
 *   F2. Distilare manager → re-alimenteaza palnia de ingestie ca eveniment DECISION
 *   F3. Maturity SEED/SPROUT → trigger cold-start suplimentar sau learning boost
 *   F4. Propagare → tracking eficacitate (appliedCount pe artefacte propagate)
 *   F5. Expirare → log de analiza (de ce nu s-a folosit)
 *
 * Mecanismele inline (learningFunnel, extractPostExecutionLearning, brainstorm,
 * lateral-collaboration, client-feedback) raman triggered din
 * task-executor/intelligent-executor/proactive-loop.
 */

import { prisma } from "@/lib/prisma"

const LAST_DAILY_KEY = "LEARNING_ORCHESTRATOR_LAST_DAILY"

export interface OrchestratorResult {
  phase: "CYCLE" | "CYCLE_AND_DAILY"
  propagated: number
  propagationFeedback: { tracked: number; effective: number; ineffective: number }
  consolidated: number
  orgReinjected: number
  distilled: number
  distillResults: Array<{ manager: string; inputs: number }>
  distillFeedback: number
  maturityUpdated: number
  maturityScores: Array<{ agent: string; level: string; score: number }>
  maturityInterventions: number
  expired: number
  expirationInsights: number
  stats: { totalArtifacts: number; avgEffectiveness: number; validatedPct: number } | null
  durationMs: number
  errors: string[]
}

export async function runLearningOrchestrator(): Promise<OrchestratorResult> {
  const start = Date.now()
  const errors: string[] = []

  let propagated = 0
  const propagationFeedback = { tracked: 0, effective: 0, ineffective: 0 }
  let consolidated = 0
  let orgReinjected = 0
  let distilled = 0
  const distillResults: OrchestratorResult["distillResults"] = []
  let distillFeedback = 0
  let maturityUpdated = 0
  const maturityScores: OrchestratorResult["maturityScores"] = []
  let maturityInterventions = 0
  let expired = 0
  let expirationInsights = 0
  let stats: OrchestratorResult["stats"] = null

  // ═══ FAZA 1: EVERY CYCLE — propagare departamentala ═══
  try {
    const { propagateDepartmentLearning } = await import("./learning-funnel")
    propagated = await propagateDepartmentLearning()
  } catch (e: any) {
    errors.push(`propagate: ${e.message?.slice(0, 80)}`)
  }

  // ═══ FAZA 2: EVERY CYCLE — BUCLA F4: feedback propagare ═══
  // Artefactele propagate care nu au fost aplicate deloc in 14 zile → scad scorul
  // Cele cu appliedCount > 0 → confirmare (creste scorul originalului)
  try {
    const fb = await trackPropagationEffectiveness()
    propagationFeedback.tracked = fb.tracked
    propagationFeedback.effective = fb.effective
    propagationFeedback.ineffective = fb.ineffective
  } catch (e: any) {
    errors.push(`propagation-feedback: ${e.message?.slice(0, 80)}`)
  }

  // ═══ FAZA 3: EVERY CYCLE — cleanup + BUCLA F5: analiza expirare ═══
  try {
    const result = await expireWithInsight()
    expired = result.expired
    expirationInsights = result.insights
  } catch (e: any) {
    errors.push(`expire: ${e.message?.slice(0, 80)}`)
  }

  // ═══ FAZA 4: EVERY CYCLE — statistici ═══
  try {
    stats = await getLearningSnapshot()
  } catch (e: any) {
    errors.push(`stats: ${e.message?.slice(0, 80)}`)
  }

  // ═══ VERIFICARE DAILY ═══
  const shouldRunDaily = await checkDailyNeeded()
  let phase: OrchestratorResult["phase"] = "CYCLE"

  if (shouldRunDaily) {
    phase = "CYCLE_AND_DAILY"

    // ═══ FAZA 5: DAILY — consolidare + BUCLA F1: re-injectare ORG ═══
    try {
      const { consolidateOrgLearning } = await import("./learning-funnel")
      consolidated = await consolidateOrgLearning()
      // F1: Re-injecteaza artefactele ORG in agentii tactici/strategici
      if (consolidated > 0) {
        orgReinjected = await reinjectOrgKnowledge()
      }
    } catch (e: any) {
      errors.push(`consolidate: ${e.message?.slice(0, 80)}`)
    }

    // ═══ FAZA 6: DAILY — distilare + BUCLA F2: re-alimentare palnie ═══
    try {
      const { runDistillationCycle } = await import("./knowledge-distiller")
      const result = await runDistillationCycle(prisma)
      distilled = result.processed
      distillResults.push(...result.results.map(r => ({
        manager: r.managerRole,
        inputs: r.inputCount,
      })))
      // F2: Fiecare distilare devine eveniment de tip DECISION in palnia de ingestie
      if (result.results.length > 0) {
        distillFeedback = await feedDistillationBackToFunnel(result.results)
      }
    } catch (e: any) {
      errors.push(`distill: ${e.message?.slice(0, 80)}`)
    }

    // ═══ FAZA 7: DAILY — maturitate + BUCLA F3: interventie ═══
    try {
      const { evaluateMaturity } = await import("./learning-funnel")
      const agents = await getActiveAgentRoles()
      for (const role of agents.slice(0, 20)) {
        try {
          const maturity = await evaluateMaturity(role)
          maturityScores.push({
            agent: role,
            level: maturity.level,
            score: Math.round(maturity.score * 100) / 100,
          })
          maturityUpdated++
        } catch {}
      }
      if (maturityScores.length > 0) {
        await saveMaturitySnapshot(maturityScores)
        // F3: Agentii cu maturity SEED primesc interventie
        maturityInterventions = await interveneOnLowMaturity(maturityScores)
      }
    } catch (e: any) {
      errors.push(`maturity: ${e.message?.slice(0, 80)}`)
    }

    await markDailyDone()
  }

  return {
    phase,
    propagated,
    propagationFeedback,
    consolidated,
    orgReinjected,
    distilled,
    distillResults,
    distillFeedback,
    maturityUpdated,
    maturityScores,
    maturityInterventions,
    expired,
    expirationInsights,
    stats,
    durationMs: Date.now() - start,
    errors,
  }
}

// ═══════════════════════════════════════════════════════════
// BUCLA F1: Re-injectare cunostinte ORG in agenti tactici
// ═══════════════════════════════════════════════════════════

async function reinjectOrgKnowledge(): Promise<number> {
  // Gaseste artefacte ORG recente (ultimele 48h, neredistribuite)
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000)
  const orgArtifacts = await prisma.learningArtifact.findMany({
    where: {
      studentRole: "ORG",
      createdAt: { gte: since },
      teacherRole: "learning-funnel-consolidation",
    },
    take: 10,
  })

  if (orgArtifacts.length === 0) return 0

  // Agentii tactici si strategici care beneficiaza de cunostinte ORG
  const tacticalRoles = ["cog-agent", "CCO", "DMA", "CFO", "CJA", "PMA", "CIA"]
  let reinjected = 0

  for (const artifact of orgArtifacts) {
    for (const role of tacticalRoles) {
      // Verifica daca agentul are deja aceasta cunostinta
      const exists = await prisma.learningArtifact.findFirst({
        where: {
          studentRole: role,
          rule: { contains: artifact.rule.slice(0, 50), mode: "insensitive" },
        },
      })
      if (exists) continue

      await prisma.learningArtifact.create({
        data: {
          studentRole: role,
          teacherRole: "org-reinject",
          problemClass: "org-pattern-applied",
          rule: `[Pattern organizational] ${artifact.rule}`,
          example: artifact.example || "",
          antiPattern: "",
          sourceType: "EXTRAPOLATION",
          effectivenessScore: 0.75,
          validated: true, // vine din consolidare (3+ agenti au confirmat)
        },
      })
      reinjected++
    }
  }

  return reinjected
}

// ═══════════════════════════════════════════════════════════
// BUCLA F2: Distilare → re-alimentare palnie de ingestie
// ═══════════════════════════════════════════════════════════

async function feedDistillationBackToFunnel(
  results: Array<{ managerRole: string; distilledInsight: string; inputCount: number }>
): Promise<number> {
  let fed = 0

  for (const result of results) {
    if (!result.distilledInsight || result.distilledInsight.length < 30) continue

    try {
      // Importam learningFunnel si trimitem distilarea ca eveniment DECISION
      const { learningFunnel } = await import("./learning-funnel")
      await learningFunnel({
        agentRole: result.managerRole,
        type: "DECISION",
        input: `Distilare din ${result.inputCount} surse subordonate`,
        output: result.distilledInsight,
        success: true,
        metadata: { source: "distillation-feedback", inputCount: result.inputCount },
      })
      fed++
    } catch {}
  }

  return fed
}

// ═══════════════════════════════════════════════════════════
// BUCLA F3: Interventie pe agenti cu maturitate scazuta
// ═══════════════════════════════════════════════════════════

async function interveneOnLowMaturity(
  scores: Array<{ agent: string; level: string; score: number }>
): Promise<number> {
  const lowAgents = scores.filter(s => s.level === "SEED")
  if (lowAgents.length === 0) return 0

  let interventions = 0
  const p = prisma as any

  for (const agent of lowAgents) {
    // Verificam cate artefacte validate are
    const validatedCount = await prisma.learningArtifact.count({
      where: { studentRole: agent.agent, validated: true },
    })

    if (validatedCount < 5) {
      // Agent cu putine artefacte validate — creeaza task de learning boost
      try {
        await p.agentTask?.create({
          data: {
            assignedTo: agent.agent,
            createdBy: "learning-orchestrator",
            title: `[Learning Boost] Consolidare cunostinte ${agent.agent}`,
            description: `Agentul ${agent.agent} are maturitate SEED (score: ${agent.score}). ` +
              `Doar ${validatedCount} artefacte validate. ` +
              `Revizuieste KB-ul propriu, identifica lacune, si propune completari ` +
              `pe baza rolului si atributiilor tale.`,
            taskType: "KB_RESEARCH",
            priority: "MEDIUM",
            status: "ASSIGNED",
            tags: ["learning-boost", "maturity-intervention"],
          },
        })
        interventions++
      } catch {}
    }
  }

  return interventions
}

// ═══════════════════════════════════════════════════════════
// BUCLA F4: Tracking eficacitate propagare
// ═══════════════════════════════════════════════════════════

async function trackPropagationEffectiveness(): Promise<{
  tracked: number; effective: number; ineffective: number
}> {
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)

  // Artefacte propagate vechi de 14+ zile
  const propagated = await prisma.learningArtifact.findMany({
    where: {
      teacherRole: "learning-funnel-propagated",
      createdAt: { lt: twoWeeksAgo },
      // Nu le-am evaluat inca (sourceType nu contine "tracked")
      NOT: { example: { contains: "[TRACKED]" } },
    },
    take: 50,
  })

  let effective = 0
  let ineffective = 0

  for (const art of propagated) {
    if (art.appliedCount > 0) {
      // Folosit → confirmare. Boost scorul originalului
      effective++
      // Gaseste originalul si creste scorul
      const original = await prisma.learningArtifact.findFirst({
        where: {
          rule: { contains: art.rule.slice(0, 50), mode: "insensitive" },
          teacherRole: { not: "learning-funnel-propagated" },
        },
      })
      if (original) {
        await prisma.learningArtifact.update({
          where: { id: original.id },
          data: {
            effectivenessScore: Math.min(1.0, original.effectivenessScore + 0.02),
          },
        })
      }
    } else {
      // Nefolosit 14 zile → scade scorul propagarii
      ineffective++
      await prisma.learningArtifact.update({
        where: { id: art.id },
        data: {
          effectivenessScore: Math.max(0, art.effectivenessScore - 0.1),
        },
      })
    }

    // Marcheaza ca tracked
    await prisma.learningArtifact.update({
      where: { id: art.id },
      data: { example: `${art.example || ""} [TRACKED]` },
    })
  }

  return { tracked: propagated.length, effective, ineffective }
}

// ═══════════════════════════════════════════════════════════
// BUCLA F5: Expirare cu insight (de ce nu s-a folosit)
// ═══════════════════════════════════════════════════════════

async function expireWithInsight(): Promise<{ expired: number; insights: number }> {
  // Artefacte expirate (data trecuta) si cu appliedCount = 0
  const expiredArtifacts = await prisma.learningArtifact.findMany({
    where: {
      expiresAt: { lt: new Date() },
      appliedCount: 0,
    },
    select: { id: true, studentRole: true, problemClass: true, rule: true },
    take: 50,
  })

  let insights = 0

  // Analiza per agent: ce categorii de cunostinte nu se folosesc?
  const unusedByAgent: Record<string, string[]> = {}
  for (const art of expiredArtifacts) {
    if (!unusedByAgent[art.studentRole]) unusedByAgent[art.studentRole] = []
    unusedByAgent[art.studentRole].push(art.problemClass)
  }

  // Salveaza pattern-ul "ce nu se foloseste" ca insight organizational
  for (const [agent, classes] of Object.entries(unusedByAgent)) {
    const classFreq: Record<string, number> = {}
    for (const c of classes) {
      classFreq[c] = (classFreq[c] || 0) + 1
    }
    // Daca un agent are 3+ artefacte nefolosite din aceeasi clasa → insight
    for (const [cls, count] of Object.entries(classFreq)) {
      if (count >= 3) {
        try {
          await prisma.learningArtifact.create({
            data: {
              studentRole: agent,
              teacherRole: "expiration-insight",
              problemClass: "learning-gap",
              rule: `[Insight expirare] ${count} artefacte din clasa "${cls}" au expirat nefolosite. ` +
                `Posibile cauze: cunostinta irelelevanta pentru rolul actual, ` +
                `formulare prea generica, sau taskuri din aceasta arie nu exista.`,
              example: `Artefacte expirate: ${classes.slice(0, 5).join(", ")}`,
              antiPattern: "",
              sourceType: "POST_EXECUTION",
              effectivenessScore: 0.6,
              validated: true, // trebuie vizibil in KB resolver ca sa poata actiona
            },
          })
          insights++
        } catch {}
      }
    }
  }

  // Sterge efectiv artefactele expirate
  const deleted = await prisma.learningArtifact.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
      appliedCount: 0,
    },
  })

  // Sterge si artefactele cu scor < 0.1 (degradate de feedback)
  const degraded = await prisma.learningArtifact.deleteMany({
    where: {
      effectivenessScore: { lt: 0.1 },
      validated: false,
    },
  })

  return { expired: deleted.count + degraded.count, insights }
}

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

async function checkDailyNeeded(): Promise<boolean> {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: LAST_DAILY_KEY },
    })
    if (!config) return true

    const lastRun = new Date(config.value)
    const hoursSince = (Date.now() - lastRun.getTime()) / (1000 * 60 * 60)
    return hoursSince >= 20
  } catch {
    return true
  }
}

async function markDailyDone(): Promise<void> {
  try {
    await prisma.systemConfig.upsert({
      where: { key: LAST_DAILY_KEY },
      update: { value: new Date().toISOString() },
      create: { key: LAST_DAILY_KEY, value: new Date().toISOString() },
    })
  } catch {}
}

async function getActiveAgentRoles(): Promise<string[]> {
  try {
    const agents = await (prisma as any).agent?.findMany({
      where: { isActive: true },
      select: { role: true },
      take: 50,
    }) ?? []
    return agents.map((a: any) => a.role)
  } catch {
    return []
  }
}

async function getLearningSnapshot(): Promise<{
  totalArtifacts: number
  avgEffectiveness: number
  validatedPct: number
}> {
  const total = await prisma.learningArtifact.count()
  const validated = await prisma.learningArtifact.count({
    where: { validated: true },
  })
  const avg = await prisma.learningArtifact.aggregate({
    _avg: { effectivenessScore: true },
  })

  return {
    totalArtifacts: total,
    avgEffectiveness: Math.round((avg._avg.effectivenessScore || 0) * 100) / 100,
    validatedPct: total > 0 ? Math.round((validated / total) * 100) : 0,
  }
}

async function saveMaturitySnapshot(
  scores: Array<{ agent: string; level: string; score: number }>
): Promise<void> {
  try {
    const summary = {
      SEED: scores.filter(s => s.level === "SEED").length,
      SPROUT: scores.filter(s => s.level === "SPROUT").length,
      GROWTH: scores.filter(s => s.level === "GROWTH").length,
      BLOOM: scores.filter(s => s.level === "BLOOM").length,
    }
    await prisma.systemConfig.upsert({
      where: { key: "AGENT_MATURITY_SNAPSHOT" },
      update: {
        value: JSON.stringify({ timestamp: new Date().toISOString(), agents: scores, summary }),
      },
      create: {
        key: "AGENT_MATURITY_SNAPSHOT",
        value: JSON.stringify({ timestamp: new Date().toISOString(), agents: scores, summary }),
      },
    })
  } catch {}
}
