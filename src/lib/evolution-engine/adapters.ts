/**
 * adapters.ts — Adaptoare per context pentru Evolution Engine
 *
 * Fiecare context implementează:
 *   1. collectData — colectare date din surse specifice
 *   2. calculateDimensions — calcul scoruri pe 8 dimensiuni
 *   3. generateActions — generare acțiuni din dezalinieri
 *
 * Structura e identică, sursele diferă. Asta e fractalul.
 */

import type {
  ContextConfig,
  DataSourceResult,
  DimensionScore,
  DimensionDefinition,
  Misalignment,
  PlannedAction,
  StateSnapshot,
  EvolutionContext,
} from "./types"
import {
  OWNER_DIMENSIONS,
  INTERNAL_DIMENSIONS,
  B2B_DIMENSIONS,
  B2C_DIMENSIONS,
} from "./dimensions"

// ── Utilitar trend ─────────────────────────────────────────────────────────

function trend(current: number, previous: number): "up" | "down" | "stable" {
  const delta = current - previous
  if (delta > 3) return "up"
  if (delta < -3) return "down"
  return "stable"
}

function dimScore(value: number, max: number = 100): number {
  return Math.min(max, Math.max(0, Math.round(value)))
}

// ═══════════════════════════════════════════════════════════════════════════
// OWNER ADAPTER
// ═══════════════════════════════════════════════════════════════════════════

async function collectOwnerData(
  _subjectId: string,
  periodStart: Date,
  periodEnd: Date,
  prevStart: Date,
  prevEnd: Date,
  prisma: any
): Promise<DataSourceResult> {
  const p = prisma
  const [
    calibCurrent, calibPrev,
    l1Flags, l2Flags, l3Flags,
    critice, patterns,
    proposalsDecided, proposalsApproved, proposalsDeferred,
    ownerInteractions,
  ] = await Promise.all([
    p.kBEntry.count({ where: { agentRole: "COG", tags: { has: "owner-calibration" }, createdAt: { gte: periodStart, lte: periodEnd } } }),
    p.kBEntry.count({ where: { agentRole: "COG", tags: { has: "owner-calibration" }, createdAt: { gte: prevStart, lte: prevEnd } } }),
    p.kBEntry.count({ where: { agentRole: "COG", tags: { hasEvery: ["owner-calibration", "l1"] }, createdAt: { gte: periodStart, lte: periodEnd } } }),
    p.kBEntry.count({ where: { agentRole: "COG", tags: { hasEvery: ["owner-calibration", "l2"] }, createdAt: { gte: periodStart, lte: periodEnd } } }),
    p.kBEntry.count({ where: { agentRole: "COG", tags: { hasEvery: ["owner-calibration", "l3"] }, createdAt: { gte: periodStart, lte: periodEnd } } }),
    p.kBEntry.count({ where: { agentRole: "COG", tags: { hasEvery: ["owner-calibration", "critic"] }, createdAt: { gte: periodStart, lte: periodEnd } } }),
    p.kBEntry.count({ where: { agentRole: "COG", tags: { has: "pattern-recurent" }, createdAt: { gte: periodStart, lte: periodEnd } } }),
    p.orgProposal.count({ where: { ownerDecision: { not: null }, updatedAt: { gte: periodStart, lte: periodEnd } } }).catch(() => 0),
    p.orgProposal.count({ where: { ownerDecision: "APPROVED", updatedAt: { gte: periodStart, lte: periodEnd } } }).catch(() => 0),
    p.orgProposal.count({ where: { ownerDecision: "DEFERRED", updatedAt: { gte: periodStart, lte: periodEnd } } }).catch(() => 0),
    p.kBEntry.count({ where: { agentRole: "COG", tags: { has: "cog-chat" }, createdAt: { gte: periodStart, lte: periodEnd } } }).catch(() => 0),
  ])

  return {
    metrics: {
      calibrations: { current: calibCurrent, previous: calibPrev },
      l1Flags: { current: l1Flags, previous: 0 },
      l2Flags: { current: l2Flags, previous: 0 },
      l3Flags: { current: l3Flags, previous: 0 },
      critice: { current: critice, previous: 0 },
      patterns: { current: patterns, previous: 0 },
      decisions: { current: proposalsDecided, previous: 0 },
      approved: { current: proposalsApproved, previous: 0 },
      deferred: { current: proposalsDeferred, previous: 0 },
      interactions: { current: ownerInteractions, previous: 0 },
    },
    qualitative: [],
  }
}

function calculateOwnerDimensions(data: DataSourceResult, defs: DimensionDefinition[]): DimensionScore[] {
  const m = data.metrics
  return defs.map(def => {
    let score = 70 // baseline
    const evidence: string[] = []

    switch (def.code) {
      case "profil_decizional":
        score = m.decisions.current > 0
          ? dimScore(60 + (m.approved.current / Math.max(1, m.decisions.current)) * 20 + (m.deferred.current > 0 ? 10 : 0))
          : 70
        evidence.push(`${m.decisions.current} decizii (${m.approved.current} aprobate)`)
        break
      case "aliniere_l1":
        score = dimScore(100 - m.l1Flags.current * 12 - m.critice.current * 25)
        evidence.push(`${m.l1Flags.current} flag-uri L1`, m.critice.current === 0 ? "Zero critice" : `${m.critice.current} CRITICE`)
        break
      case "aliniere_l2":
        score = dimScore(100 - m.l2Flags.current * 8)
        evidence.push(`${m.l2Flags.current} flag-uri L2`)
        break
      case "aliniere_l3":
        score = dimScore(100 - m.l3Flags.current * 10 - m.critice.current * 30)
        evidence.push(`${m.l3Flags.current} flag-uri L3`)
        break
      case "pattern_awareness":
        score = dimScore(100 - m.patterns.current * 20)
        evidence.push(`${m.patterns.current} pattern-uri recurente`)
        break
      case "comunicare":
        score = dimScore(70 + (m.calibrations.current === 0 ? 30 : Math.max(0, 30 - m.calibrations.current * 5)))
        evidence.push(`${m.calibrations.current} discrepanțe (vs. ${m.calibrations.previous} anterior)`)
        break
      case "relatie_echipa":
        score = dimScore(60 + m.interactions.current * 5 + m.deferred.current * 10 - m.critice.current * 15)
        evidence.push(`${m.interactions.current} interacțiuni echipă`)
        break
      case "autenticitate":
        score = dimScore(90 - m.critice.current * 20 - m.patterns.current * 10 + m.interactions.current * 3)
        evidence.push(m.critice.current === 0 ? "Coerență valori-acțiuni" : "Discrepanțe detectate")
        break
    }

    return {
      code: def.code,
      name: def.name,
      score,
      trend: trend(score, 70),
      evidence,
      weight: def.weight,
    }
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// INTERNAL ADAPTER (agenți AI)
// ═══════════════════════════════════════════════════════════════════════════

async function collectInternalData(
  subjectId: string,
  periodStart: Date,
  periodEnd: Date,
  prevStart: Date,
  prevEnd: Date,
  prisma: any
): Promise<DataSourceResult> {
  const p = prisma
  const role = subjectId
  const [
    kbCurrent, kbPrev, kbHighConf, kbHighConfPrev,
    escalations, escalationsPrev, escalationsResolved,
    cycles, interventions,
    ideas, promotedIdeas,
    reflections, reflectionsPrev,
    crossPoll, propagationsOut, propagationsIn,
  ] = await Promise.all([
    p.kBEntry.count({ where: { agentRole: role, createdAt: { gte: periodStart, lte: periodEnd } } }),
    p.kBEntry.count({ where: { agentRole: role, createdAt: { gte: prevStart, lte: prevEnd } } }),
    p.kBEntry.count({ where: { agentRole: role, confidence: { gte: 0.8 }, createdAt: { gte: periodStart, lte: periodEnd } } }),
    p.kBEntry.count({ where: { agentRole: role, confidence: { gte: 0.8 }, createdAt: { gte: prevStart, lte: prevEnd } } }),
    p.escalation.count({ where: { aboutRole: role, createdAt: { gte: periodStart, lte: periodEnd } } }).catch(() => 0),
    p.escalation.count({ where: { aboutRole: role, createdAt: { gte: prevStart, lte: prevEnd } } }).catch(() => 0),
    p.escalation.count({ where: { aboutRole: role, status: "RESOLVED", resolvedAt: { gte: periodStart, lte: periodEnd } } }).catch(() => 0),
    p.cycleLog.count({ where: { managerRole: role, createdAt: { gte: periodStart, lte: periodEnd } } }).catch(() => 0),
    p.cycleLog.count({ where: { managerRole: role, actionType: "INTERVENE", createdAt: { gte: periodStart, lte: periodEnd } } }).catch(() => 0),
    p.brainstormIdea.count({ where: { generatedBy: role, createdAt: { gte: periodStart, lte: periodEnd } } }).catch(() => 0),
    p.brainstormIdea.count({ where: { generatedBy: role, status: { in: ["PROMOTED", "APPROVED", "IMPLEMENTED"] }, createdAt: { gte: periodStart, lte: periodEnd } } }).catch(() => 0),
    p.kBEntry.count({ where: { agentRole: role, tags: { has: "reflection" }, createdAt: { gte: periodStart, lte: periodEnd } } }),
    p.kBEntry.count({ where: { agentRole: role, tags: { has: "reflection" }, createdAt: { gte: prevStart, lte: prevEnd } } }),
    p.kBEntry.count({ where: { agentRole: role, tags: { has: "cross-pollination" }, createdAt: { gte: periodStart, lte: periodEnd } } }),
    p.kBEntry.count({ where: { propagatedFrom: role, createdAt: { gte: periodStart, lte: periodEnd } } }),
    p.kBEntry.count({ where: { agentRole: role, source: "PROPAGATED", createdAt: { gte: periodStart, lte: periodEnd } } }),
  ])

  return {
    metrics: {
      kb: { current: kbCurrent, previous: kbPrev },
      kbHighConf: { current: kbHighConf, previous: kbHighConfPrev },
      escalations: { current: escalations, previous: escalationsPrev },
      escalationsResolved: { current: escalationsResolved, previous: 0 },
      cycles: { current: cycles, previous: 0 },
      interventions: { current: interventions, previous: 0 },
      ideas: { current: ideas, previous: 0 },
      promotedIdeas: { current: promotedIdeas, previous: 0 },
      reflections: { current: reflections, previous: reflectionsPrev },
      crossPoll: { current: crossPoll, previous: 0 },
      propagationsOut: { current: propagationsOut, previous: 0 },
      propagationsIn: { current: propagationsIn, previous: 0 },
    },
    qualitative: [],
  }
}

function calculateInternalDimensions(data: DataSourceResult, defs: DimensionDefinition[]): DimensionScore[] {
  const m = data.metrics
  return defs.map(def => {
    let score = 50
    const evidence: string[] = []

    switch (def.code) {
      case "inteligenta":
        score = dimScore(m.kbHighConf.current * 15 + m.kb.current * 5 + m.reflections.current * 10)
        evidence.push(`${m.kbHighConf.current} entries high-conf`, `${m.reflections.current} reflecții`)
        break
      case "compatibilitate":
        score = dimScore(30 + (m.kb.current > 0 ? 20 : 0) + (m.cycles.current > 0 ? 20 : 0) + (m.ideas.current > 0 ? 15 : 0) + (m.escalations.current === 0 ? 15 : 0))
        evidence.push(`${m.escalations.current} escaladări`)
        break
      case "autonomie": {
        const total = m.cycles.current + m.interventions.current + m.escalations.current
        score = total > 0 ? dimScore(((m.cycles.current + m.interventions.current) / total) * 100) : 50
        evidence.push(`${m.cycles.current + m.interventions.current} decizii autonome`)
        break
      }
      case "calitate_decizii":
        score = dimScore(m.promotedIdeas.current * 25 + m.escalationsResolved.current * 15 + m.propagationsOut.current * 10 + (m.escalations.current === 0 ? 20 : 0))
        evidence.push(`${m.promotedIdeas.current} idei promovate`)
        break
      case "rezolvare_probleme":
        score = dimScore(m.interventions.current * 15 + m.escalationsResolved.current * 20 + m.crossPoll.current * 15)
        evidence.push(`${m.interventions.current} intervenții`, `${m.crossPoll.current} cross-domain`)
        break
      case "colaborare":
        score = dimScore(m.crossPoll.current * 20 + m.propagationsOut.current * 15 + m.propagationsIn.current * 10)
        evidence.push(`${m.propagationsOut.current} partajate`, `${m.propagationsIn.current} primite`)
        break
      case "invatare":
        score = dimScore(m.kb.current * 8 + m.reflections.current * 15 + m.kbHighConf.current * 10 + m.propagationsIn.current * 5)
        evidence.push(`${m.kb.current} entries noi (vs. ${m.kb.previous})`)
        break
      case "aliniere_morala":
        score = dimScore(85 + m.reflections.current * 5 - m.escalations.current * 10)
        evidence.push(m.escalations.current === 0 ? "Zero incidente etice" : `${m.escalations.current} escaladări`)
        break
    }

    return { code: def.code, name: def.name, score, trend: trend(score, 50), evidence, weight: def.weight }
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// B2B ADAPTER (organizație client)
// ═══════════════════════════════════════════════════════════════════════════

async function collectB2BData(
  subjectId: string, // tenantId
  periodStart: Date,
  periodEnd: Date,
  prevStart: Date,
  prevEnd: Date,
  prisma: any
): Promise<DataSourceResult> {
  const p = prisma
  const [
    sessionsActive, sessionsPrev, sessionsCompleted,
    jobsEvaluated, jobsTotal,
    interactions, interactionsPrev,
    reportsGenerated,
    payGapReports,
    aiGenerations,
  ] = await Promise.all([
    p.evaluationSession.count({ where: { tenantId: subjectId, createdAt: { gte: periodStart, lte: periodEnd } } }).catch(() => 0),
    p.evaluationSession.count({ where: { tenantId: subjectId, createdAt: { gte: prevStart, lte: prevEnd } } }).catch(() => 0),
    p.evaluationSession.count({ where: { tenantId: subjectId, status: "COMPLETED", createdAt: { gte: periodStart, lte: periodEnd } } }).catch(() => 0),
    p.job.count({ where: { tenantId: subjectId, status: "ACTIVE" } }).catch(() => 0),
    p.job.count({ where: { tenantId: subjectId } }).catch(() => 0),
    p.interactionLog.count({ where: { tenantId: subjectId, createdAt: { gte: periodStart, lte: periodEnd } } }).catch(() => 0),
    p.interactionLog.count({ where: { tenantId: subjectId, createdAt: { gte: prevStart, lte: prevEnd } } }).catch(() => 0),
    p.report.count({ where: { tenantId: subjectId, createdAt: { gte: periodStart, lte: periodEnd } } }).catch(() => 0),
    p.payGapReport.count({ where: { tenantId: subjectId } }).catch(() => 0),
    p.aiGeneration.count({ where: { tenantId: subjectId, createdAt: { gte: periodStart, lte: periodEnd } } }).catch(() => 0),
  ])

  return {
    metrics: {
      sessions: { current: sessionsActive, previous: sessionsPrev },
      sessionsCompleted: { current: sessionsCompleted, previous: 0 },
      jobsEvaluated: { current: jobsEvaluated, previous: 0 },
      jobsTotal: { current: jobsTotal, previous: 0 },
      interactions: { current: interactions, previous: interactionsPrev },
      reports: { current: reportsGenerated, previous: 0 },
      payGap: { current: payGapReports, previous: 0 },
      aiUsage: { current: aiGenerations, previous: 0 },
    },
    qualitative: [],
  }
}

function calculateB2BDimensions(data: DataSourceResult, defs: DimensionDefinition[]): DimensionScore[] {
  const m = data.metrics
  return defs.map(def => {
    let score = 30
    const evidence: string[] = []

    switch (def.code) {
      case "maturitate_evaluare": {
        const evalRate = m.jobsTotal.current > 0 ? (m.jobsEvaluated.current / m.jobsTotal.current) * 100 : 0
        score = dimScore(evalRate * 0.6 + m.sessionsCompleted.current * 10)
        evidence.push(`${m.jobsEvaluated.current}/${m.jobsTotal.current} posturi evaluate`)
        break
      }
      case "echitate_salariala":
        score = dimScore(m.payGap.current > 0 ? 60 + m.payGap.current * 10 : 30)
        evidence.push(`${m.payGap.current} rapoarte pay gap generate`)
        break
      case "transparenta":
        score = dimScore(m.reports.current * 15 + (m.payGap.current > 0 ? 30 : 0))
        evidence.push(`${m.reports.current} rapoarte publicate`)
        break
      case "engagement":
        score = dimScore(m.interactions.current > 0 ? 40 + Math.min(60, m.interactions.current * 2) : 20)
        evidence.push(`${m.interactions.current} interacțiuni (vs. ${m.interactions.previous})`)
        break
      case "utilizare_instrumente":
        score = dimScore(m.aiUsage.current * 10 + m.reports.current * 10 + m.sessions.current * 15)
        evidence.push(`${m.aiUsage.current} generări AI`, `${m.sessions.current} sesiuni evaluare`)
        break
      case "aliniere_valori":
        score = dimScore(40 + m.sessionsCompleted.current * 15 + (m.payGap.current > 0 ? 20 : 0))
        evidence.push(`${m.sessionsCompleted.current} sesiuni completate`)
        break
      case "evolutie_timp":
        score = dimScore(m.interactions.current > m.interactions.previous ? 70 : m.interactions.current === m.interactions.previous ? 50 : 30)
        evidence.push(m.interactions.current > m.interactions.previous ? "Trend crescător" : "Stagnare sau declin")
        break
      case "relatie_platforma":
        score = dimScore(30 + m.interactions.current * 3 + m.aiUsage.current * 5 + m.reports.current * 5)
        evidence.push(`Profunzime: ${m.aiUsage.current > 3 ? "parteneriat" : m.aiUsage.current > 0 ? "utilizare" : "explorare"}`)
        break
    }

    return { code: def.code, name: def.name, score, trend: trend(score, 30), evidence, weight: def.weight }
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// B2C ADAPTER (individ)
// ═══════════════════════════════════════════════════════════════════════════

async function collectB2CData(
  subjectId: string, // b2cUserId
  periodStart: Date,
  periodEnd: Date,
  prevStart: Date,
  prevEnd: Date,
  prisma: any
): Promise<DataSourceResult> {
  const p = prisma
  const [
    sessions, sessionsPrev,
    evolution, evolutionPrev,
    testsCompleted,
    cardsActive,
    communityAccess,
    profile,
  ] = await Promise.all([
    p.b2CSession.count({ where: { userId: subjectId, startedAt: { gte: periodStart, lte: periodEnd } } }).catch(() => 0),
    p.b2CSession.count({ where: { userId: subjectId, startedAt: { gte: prevStart, lte: prevEnd } } }).catch(() => 0),
    p.b2CEvolutionEntry.count({ where: { userId: subjectId, createdAt: { gte: periodStart, lte: periodEnd } } }).catch(() => 0),
    p.b2CEvolutionEntry.count({ where: { userId: subjectId, createdAt: { gte: prevStart, lte: prevEnd } } }).catch(() => 0),
    p.b2CTestResult.count({ where: { userId: subjectId } }).catch(() => 0),
    p.b2CCardProgress.count({ where: { userId: subjectId, status: "ACTIVE" } }).catch(() => 0),
    p.b2CCardProgress.count({ where: { userId: subjectId, communityReady: true } }).catch(() => 0),
    p.b2CProfile.findUnique({ where: { userId: subjectId } }).catch(() => null),
  ])

  const hawkins = profile?.hawkinsEstimate || 0
  const herrmannComplete = profile?.herrmannA != null ? 1 : 0
  const viaComplete = (profile?.viaSignature?.length || 0) > 0 ? 1 : 0

  return {
    metrics: {
      sessions: { current: sessions, previous: sessionsPrev },
      evolution: { current: evolution, previous: evolutionPrev },
      tests: { current: testsCompleted, previous: 0 },
      cardsActive: { current: cardsActive, previous: 0 },
      communityAccess: { current: communityAccess, previous: 0 },
      hawkins: { current: hawkins, previous: 0 },
      herrmann: { current: herrmannComplete, previous: 0 },
      via: { current: viaComplete, previous: 0 },
      spiralLevel: { current: profile?.spiralLevel || 1, previous: 0 },
      spiralStage: { current: profile?.spiralStage || 1, previous: 0 },
    },
    qualitative: [],
  }
}

function calculateB2CDimensions(data: DataSourceResult, defs: DimensionDefinition[]): DimensionScore[] {
  const m = data.metrics
  return defs.map(def => {
    let score = 20
    const evidence: string[] = []

    switch (def.code) {
      case "auto_cunoastere":
        score = dimScore(m.herrmann.current * 25 + m.via.current * 25 + m.tests.current * 10 + (m.hawkins.current > 200 ? 20 : 0))
        evidence.push(`Herrmann: ${m.herrmann.current ? "completat" : "nu"}`, `VIA: ${m.via.current ? "completat" : "nu"}`)
        break
      case "claritate_directie":
        score = dimScore(m.cardsActive.current * 15 + m.evolution.current * 5 + (m.spiralLevel.current > 1 ? 20 : 0))
        evidence.push(`${m.cardsActive.current} carduri active`, `Spirală: nivel ${m.spiralLevel.current}`)
        break
      case "angajament_proces":
        score = dimScore(m.sessions.current * 10 + (m.sessions.current > m.sessions.previous ? 20 : 0) + m.tests.current * 5)
        evidence.push(`${m.sessions.current} sesiuni (vs. ${m.sessions.previous})`)
        break
      case "profunzime_reflectie":
        score = dimScore(m.evolution.current * 8 + (m.spiralStage.current >= 2 ? 20 : 0) + (m.hawkins.current > 200 ? 15 : 0))
        evidence.push(`${m.evolution.current} momente evolutive`, `Etapă: ${m.spiralStage.current}/4`)
        break
      case "transfer_practica":
        score = dimScore(m.evolution.current * 5 + (m.spiralStage.current >= 3 ? 30 : 0) + m.communityAccess.current * 15)
        evidence.push(`Etapă competență: ${m.spiralStage.current}/4 (3+ = aplică conștient)`)
        break
      case "rezilienta":
        score = dimScore(50 + (m.sessions.current >= m.sessions.previous ? 20 : -10) + m.evolution.current * 3)
        evidence.push(m.sessions.current >= m.sessions.previous ? "Constanță menținută" : "Frecvență scăzută")
        break
      case "deschidere_feedback":
        score = dimScore(40 + m.sessions.current * 5 + m.tests.current * 10 + m.cardsActive.current * 5)
        evidence.push(`${m.tests.current} teste parcurse (acceptă evaluarea)`)
        break
      case "evolutie_constiinta":
        score = dimScore(m.hawkins.current > 0 ? (m.hawkins.current / 10) : 30 + m.spiralLevel.current * 10)
        evidence.push(`Hawkins estimat: ~${m.hawkins.current || "N/A"} (intern)`)
        break
    }

    return { code: def.code, name: def.name, score, trend: trend(score, 20), evidence, weight: def.weight }
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// GENERATOR ACȚIUNI (comun, adaptat per context)
// ═══════════════════════════════════════════════════════════════════════════

function generateActionsCommon(
  diagnosis: Misalignment[],
  _currentState: StateSnapshot,
  context: EvolutionContext
): PlannedAction[] {
  return diagnosis
    .filter(g => g.severity === "CRITICAL" || g.severity === "HIGH" || g.severity === "MEDIUM")
    .slice(0, 5) // max 5 acțiuni per ciclu — focalizare
    .map(gap => {
      const action: PlannedAction = {
        description: `Adresează: ${gap.description}`,
        dimensionCode: gap.dimensionCode,
        priority: gap.severity === "CRITICAL" ? "HIGH" : gap.severity === "HIGH" ? "HIGH" : "MEDIUM",
        status: "PLANNED",
      }

      // Acțiuni specifice per context
      switch (context) {
        case "OWNER":
          action.contextAction = "Reflecție + ajustare comportament personal"
          action.clientFacingDescription = undefined // Owner vede tot
          break
        case "INTERNAL":
          action.contextAction = "Task delegat + ajustare KB + recalibrare ciclu"
          break
        case "B2B":
          action.contextAction = "Recomandare în raportul client + ghidare CSSA"
          action.clientFacingDescription = `Recomandare: ${gap.description.replace(/[<>]/g, "")}`
          break
        case "B2C":
          action.contextAction = "Sugestie naturală în dialog (invizibilă, prin Călăuza/Profiler)"
          action.clientFacingDescription = gap.clientFacingDescription || undefined
          break
      }

      return action
    })
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURAȚII EXPORTATE
// ═══════════════════════════════════════════════════════════════════════════

export const OWNER_CONFIG: ContextConfig = {
  context: "OWNER",
  dimensions: OWNER_DIMENSIONS,
  cycleDays: 3,
  collectData: collectOwnerData,
  calculateDimensions: calculateOwnerDimensions,
  generateActions: generateActionsCommon,
  thresholds: { critical: 20, high: 40, medium: 60 },
}

export const INTERNAL_CONFIG: ContextConfig = {
  context: "INTERNAL",
  dimensions: INTERNAL_DIMENSIONS,
  cycleDays: 3,
  collectData: collectInternalData,
  calculateDimensions: calculateInternalDimensions,
  generateActions: generateActionsCommon,
  thresholds: { critical: 15, high: 35, medium: 55 },
}

export const B2B_CONFIG: ContextConfig = {
  context: "B2B",
  dimensions: B2B_DIMENSIONS,
  cycleDays: 7, // ciclul B2B e mai lent — clienții nu interacționează zilnic
  collectData: collectB2BData,
  calculateDimensions: calculateB2BDimensions,
  generateActions: generateActionsCommon,
  thresholds: { critical: 15, high: 30, medium: 50 },
}

export const B2C_CONFIG: ContextConfig = {
  context: "B2C",
  dimensions: B2C_DIMENSIONS,
  cycleDays: 7, // ciclul B2C e la ritmul clientului
  collectData: collectB2CData,
  calculateDimensions: calculateB2CDimensions,
  generateActions: generateActionsCommon,
  thresholds: { critical: 10, high: 25, medium: 45 },
}

export function getConfigForContext(context: EvolutionContext): ContextConfig {
  switch (context) {
    case "OWNER": return OWNER_CONFIG
    case "INTERNAL": return INTERNAL_CONFIG
    case "B2B": return B2B_CONFIG
    case "B2C": return B2C_CONFIG
  }
}
