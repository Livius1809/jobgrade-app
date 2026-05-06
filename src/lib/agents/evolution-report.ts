/**
 * evolution-report.ts — Raport de evoluție per agent
 *
 * Rulează la fiecare 3 zile. Evaluează fiecare agent pe 8 dimensiuni:
 *
 * 1. INTELIGENȚĂ — calitatea cunoașterii acumulate, nu doar cantitatea
 * 2. COMPATIBILITATE CU ROLUL — cât de bine se aliniază activitatea cu atribuțiile
 * 3. AUTONOMIE DECIZIONALĂ — câte decizii ia singur vs. escaladează
 * 4. CALITATEA DECIZIILOR — rezultatele deciziilor luate
 * 5. REZOLVARE PROBLEME — complexitate, diversitate, rata de succes
 * 6. COLABORARE — interacțiuni cross-funcționale, contribuții la echipă
 * 7. ÎNVĂȚARE ȘI ADAPTARE — ritm de creștere KB, rafinare, reflecție
 * 8. ALINIERE MORALĂ — coerență cu valorile CÂMPULUI, absența Umbrei
 *
 * Fiecare dimensiune: scor 0-100 + trend (↑ ↓ →) + evidențe concrete
 * Scor compozit: media ponderată a celor 8 dimensiuni
 */

import type { PrismaClient } from "@/generated/prisma"
import { cpuCall } from "@/lib/cpu/gateway"

const MODEL = "claude-sonnet-4-20250514"

// ── Tipuri ────────────────────────────────────────────────────────────────────

export interface DimensionScore {
  name: string
  score: number          // 0-100
  trend: "up" | "down" | "stable"  // comparativ cu perioada anterioară
  evidence: string[]     // max 3 dovezi concrete
  recommendation?: string
}

export interface AgentEvolution {
  agentRole: string
  displayName: string
  period: { from: string; to: string }
  previousPeriod: { from: string; to: string }
  dimensions: DimensionScore[]
  compositeScore: number
  compositeTrend: "up" | "down" | "stable"
  highlight: string      // cea mai notabilă evoluție
  concern: string        // cea mai importantă preocupare
  maturityLevel: "SEED" | "GROWING" | "COMPETENT" | "EXPERT" | "MASTER"
}

export interface EvolutionReport {
  generatedAt: string
  periodDays: number
  agentCount: number
  agents: AgentEvolution[]
  topEvolutions: Array<{ role: string; dimension: string; delta: number }>
  concerns: Array<{ role: string; issue: string; severity: "HIGH" | "MEDIUM" | "LOW" }>
  teamHealth: {
    avgComposite: number
    trend: "up" | "down" | "stable"
    distribution: { seed: number; growing: number; competent: number; expert: number; master: number }
  }
  summary: string
}

// ── Configurare dimensiuni ──────────────────────────────────────────────────

const DIMENSION_WEIGHTS: Record<string, number> = {
  inteligenta: 0.15,
  compatibilitate: 0.15,
  autonomie: 0.12,
  calitate_decizii: 0.15,
  rezolvare_probleme: 0.13,
  colaborare: 0.10,
  invatare: 0.10,
  aliniere_morala: 0.10,
}

// ── Helper: calcul trend ────────────────────────────────────────────────────

function trend(current: number, previous: number): "up" | "down" | "stable" {
  const delta = current - previous
  if (delta > 3) return "up"
  if (delta < -3) return "down"
  return "stable"
}

function maturityFromScore(score: number): AgentEvolution["maturityLevel"] {
  if (score >= 90) return "MASTER"
  if (score >= 75) return "EXPERT"
  if (score >= 55) return "COMPETENT"
  if (score >= 30) return "GROWING"
  return "SEED"
}

// ── Colectare date per agent ────────────────────────────────────────────────

async function collectAgentData(
  agentRole: string,
  periodStart: Date,
  periodEnd: Date,
  prevStart: Date,
  prevEnd: Date,
  p: any
) {
  // Current period
  const [
    kbCurrent, kbPrevious,
    kbBySource, kbBySourcePrev,
    kbHighConfidence, kbHighConfidencePrev,
    escalationsCurrent, escalationsPrev,
    escalationsResolved, escalationsResolvedPrev,
    cyclesCurrent, cyclesPrev,
    interventionsCurrent, interventionsPrev,
    ideasCurrent, ideasPrev,
    promotedIdeas, promotedIdeasPrev,
    reflections, reflectionsPrev,
    crossPollinations, crossPollinationsPrev,
    kbTotal, kbTotalPrev,
    propagationsOut, propagationsOutPrev,
    propagationsIn, propagationsInPrev,
    sentinelAlerts,
    alignmentAligned, alignmentMisaligned, alignmentEscalated, alignmentTotal,
    antiPatternsCount,
  ] = await Promise.all([
    // KB growth current
    p.kBEntry.count({ where: { agentRole, createdAt: { gte: periodStart, lte: periodEnd } } }),
    // KB growth previous
    p.kBEntry.count({ where: { agentRole, createdAt: { gte: prevStart, lte: prevEnd } } }),
    // KB by source current
    p.kBEntry.groupBy({ by: ["source"], where: { agentRole, createdAt: { gte: periodStart, lte: periodEnd } }, _count: true }),
    // KB by source previous
    p.kBEntry.groupBy({ by: ["source"], where: { agentRole, createdAt: { gte: prevStart, lte: prevEnd } }, _count: true }),
    // High confidence KB current
    p.kBEntry.count({ where: { agentRole, confidence: { gte: 0.8 }, createdAt: { gte: periodStart, lte: periodEnd } } }),
    // High confidence KB prev
    p.kBEntry.count({ where: { agentRole, confidence: { gte: 0.8 }, createdAt: { gte: prevStart, lte: prevEnd } } }),
    // Escalations about agent current
    p.escalation.count({ where: { aboutRole: agentRole, createdAt: { gte: periodStart, lte: periodEnd } } }).catch(() => 0),
    // Escalations prev
    p.escalation.count({ where: { aboutRole: agentRole, createdAt: { gte: prevStart, lte: prevEnd } } }).catch(() => 0),
    // Escalations resolved current
    p.escalation.count({ where: { aboutRole: agentRole, status: "RESOLVED", resolvedAt: { gte: periodStart, lte: periodEnd } } }).catch(() => 0),
    // Escalations resolved prev
    p.escalation.count({ where: { aboutRole: agentRole, status: "RESOLVED", resolvedAt: { gte: prevStart, lte: prevEnd } } }).catch(() => 0),
    // Cycles as manager current
    p.cycleLog.count({ where: { managerRole: agentRole, createdAt: { gte: periodStart, lte: periodEnd } } }).catch(() => 0),
    // Cycles prev
    p.cycleLog.count({ where: { managerRole: agentRole, createdAt: { gte: prevStart, lte: prevEnd } } }).catch(() => 0),
    // Interventions current
    p.cycleLog.count({ where: { managerRole: agentRole, actionType: "INTERVENE", createdAt: { gte: periodStart, lte: periodEnd } } }).catch(() => 0),
    // Interventions prev
    p.cycleLog.count({ where: { managerRole: agentRole, actionType: "INTERVENE", createdAt: { gte: prevStart, lte: prevEnd } } }).catch(() => 0),
    // Ideas generated current
    p.brainstormIdea.count({ where: { generatedBy: agentRole, createdAt: { gte: periodStart, lte: periodEnd } } }).catch(() => 0),
    // Ideas prev
    p.brainstormIdea.count({ where: { generatedBy: agentRole, createdAt: { gte: prevStart, lte: prevEnd } } }).catch(() => 0),
    // Promoted ideas current
    p.brainstormIdea.count({ where: { generatedBy: agentRole, status: { in: ["PROMOTED", "APPROVED", "IMPLEMENTED"] }, createdAt: { gte: periodStart, lte: periodEnd } } }).catch(() => 0),
    // Promoted ideas prev
    p.brainstormIdea.count({ where: { generatedBy: agentRole, status: { in: ["PROMOTED", "APPROVED", "IMPLEMENTED"] }, createdAt: { gte: prevStart, lte: prevEnd } } }).catch(() => 0),
    // Reflections current
    p.kBEntry.count({ where: { agentRole, tags: { has: "reflection" }, createdAt: { gte: periodStart, lte: periodEnd } } }),
    // Reflections prev
    p.kBEntry.count({ where: { agentRole, tags: { has: "reflection" }, createdAt: { gte: prevStart, lte: prevEnd } } }),
    // Cross-pollination current
    p.kBEntry.count({ where: { agentRole, tags: { has: "cross-pollination" }, createdAt: { gte: periodStart, lte: periodEnd } } }),
    // Cross-pollination prev
    p.kBEntry.count({ where: { agentRole, tags: { has: "cross-pollination" }, createdAt: { gte: prevStart, lte: prevEnd } } }),
    // Total KB
    p.kBEntry.count({ where: { agentRole, status: "PERMANENT" } }),
    // Total KB prev
    p.kBEntry.count({ where: { agentRole, status: "PERMANENT", createdAt: { lte: prevEnd } } }),
    // Propagations out
    p.kBEntry.count({ where: { propagatedFrom: agentRole, createdAt: { gte: periodStart, lte: periodEnd } } }),
    // Propagations out prev
    p.kBEntry.count({ where: { propagatedFrom: agentRole, createdAt: { gte: prevStart, lte: prevEnd } } }),
    // Propagations in
    p.kBEntry.count({ where: { agentRole, source: "PROPAGATED", createdAt: { gte: periodStart, lte: periodEnd } } }),
    // Propagations in prev
    p.kBEntry.count({ where: { agentRole, source: "PROPAGATED", createdAt: { gte: prevStart, lte: prevEnd } } }),
    // Sentinel alerts
    p.kBEntry.count({ where: { agentRole, tags: { hasSome: ["alert", "intuition"] }, createdAt: { gte: periodStart, lte: periodEnd } } }),
    // Alignment checks (din pipeline inteligent)
    p.alignmentLog.count({ where: { agentRole, result: "ALIGNED", createdAt: { gte: periodStart, lte: periodEnd } } }).catch(() => 0),
    p.alignmentLog.count({ where: { agentRole, result: "MISALIGNED", createdAt: { gte: periodStart, lte: periodEnd } } }).catch(() => 0),
    p.alignmentLog.count({ where: { agentRole, result: "ESCALATED", createdAt: { gte: periodStart, lte: periodEnd } } }).catch(() => 0),
    p.alignmentLog.count({ where: { agentRole, createdAt: { gte: periodStart, lte: periodEnd } } }).catch(() => 0),
    // Anti-patterns (learning artifacts de tip anti-pattern pentru acest agent)
    p.learningArtifact.count({ where: { studentRole: agentRole, antiPattern: { not: null } } }).catch(() => 0),
  ])

  return {
    kb: { current: kbCurrent, previous: kbPrevious, total: kbTotal, totalPrev: kbTotalPrev },
    kbBySource: { current: kbBySource, previous: kbBySourcePrev },
    kbHighConf: { current: kbHighConfidence, previous: kbHighConfidencePrev },
    escalations: { current: escalationsCurrent, previous: escalationsPrev },
    escalationsResolved: { current: escalationsResolved, previous: escalationsResolvedPrev },
    cycles: { current: cyclesCurrent, previous: cyclesPrev },
    interventions: { current: interventionsCurrent, previous: interventionsPrev },
    ideas: { current: ideasCurrent, previous: ideasPrev },
    promotedIdeas: { current: promotedIdeas, previous: promotedIdeasPrev },
    reflections: { current: reflections, previous: reflectionsPrev },
    crossPollinations: { current: crossPollinations, previous: crossPollinationsPrev },
    propagationsOut: { current: propagationsOut, previous: propagationsOutPrev },
    propagationsIn: { current: propagationsIn, previous: propagationsInPrev },
    sentinelAlerts,
    alignmentChecks: { aligned: alignmentAligned, misaligned: alignmentMisaligned, escalated: alignmentEscalated, total: alignmentTotal },
    antiPatterns: antiPatternsCount,
  }
}

// ── Calculare scoruri per dimensiune ────────────────────────────────────────

function calculateDimensions(data: Awaited<ReturnType<typeof collectAgentData>>): DimensionScore[] {
  const dims: DimensionScore[] = []

  // 1. INTELIGENȚĂ — calitatea cunoașterii
  const kbQualityScore = Math.min(100, (
    (data.kbHighConf.current * 15) +  // Entries cu confidence > 0.8
    (data.kb.current * 5) +            // Orice KB entry adăugat
    (data.sentinelAlerts * 20) +       // Pattern recognition
    (data.reflections.current * 10)    // Auto-reflecție
  ))
  dims.push({
    name: "Inteligență",
    score: kbQualityScore,
    trend: trend(kbQualityScore, Math.min(100, (data.kbHighConf.previous * 15) + (data.kb.previous * 5) + (data.reflections.previous * 10))),
    evidence: [
      `${data.kbHighConf.current} entries cu încredere >80% (perioadă curentă)`,
      `${data.reflections.current} reflecții auto-generate`,
      `${data.sentinelAlerts} semnale/pattern-uri detectate`,
    ].filter(e => !e.startsWith("0 ")),
  })

  // 2. COMPATIBILITATE CU ROLUL — activitate aliniată cu atribuțiile
  const roleScore = Math.min(100, (
    (data.kb.total > 0 ? 30 : 0) +                    // Are KB (cunoaște domeniul)
    (data.kb.current > 0 ? 20 : 0) +                  // Crește activ
    (data.cycles.current > 0 ? 20 : 0) +               // Executie cicluri (dacă e manager)
    (data.ideas.current > 0 ? 15 : 0) +                // Contribuie la brainstorming
    (data.escalations.current === 0 ? 15 : Math.max(0, 15 - data.escalations.current * 5))  // Fără escaladări = bine
  ))
  dims.push({
    name: "Compatibilitate cu rolul",
    score: roleScore,
    trend: trend(roleScore, Math.min(100, (data.kb.totalPrev > 0 ? 30 : 0) + (data.kb.previous > 0 ? 20 : 0) + (data.cycles.previous > 0 ? 20 : 0) + (data.ideas.previous > 0 ? 15 : 0))),
    evidence: [
      `${data.kb.total} entries KB total (baza de cunoaștere)`,
      `${data.cycles.current} cicluri de management executate`,
      `${data.escalations.current} escaladări (mai puțin = mai bine)`,
    ],
  })

  // 3. AUTONOMIE DECIZIONALĂ — decizii fără escaladare
  const totalDecisions = data.cycles.current + data.interventions.current + data.escalations.current
  const autonomyRate = totalDecisions > 0
    ? ((data.cycles.current + data.interventions.current) / totalDecisions) * 100
    : (data.kb.current > 0 ? 50 : 30) // baseline dacă nu are cicluri
  dims.push({
    name: "Autonomie decizională",
    score: Math.round(autonomyRate),
    trend: trend(autonomyRate, totalDecisions > 0 ? autonomyRate : 30),
    evidence: [
      `${data.cycles.current + data.interventions.current} decizii autonome`,
      `${data.escalations.current} escaladări (decizii delegate)`,
      totalDecisions > 0 ? `Rată autonomie: ${Math.round(autonomyRate)}%` : "Fără cicluri de decizie în perioadă",
    ],
  })

  // 4. CALITATEA DECIZIILOR — rezultatele deciziilor
  const decisionQuality = Math.min(100, (
    (data.promotedIdeas.current * 25) +               // Idei promovate = decizii bune
    (data.escalationsResolved.current * 15) +          // Escaladări rezolvate
    (data.propagationsOut.current * 10) +              // Cunoaștere exportată = validată de alții
    (data.escalations.current === 0 ? 20 : 0) +       // Zero escaladări = fără erori
    (data.kb.current > 0 ? 10 : 0)                    // Activitate
  ))
  dims.push({
    name: "Calitatea deciziilor",
    score: decisionQuality,
    trend: trend(decisionQuality, Math.min(100, (data.promotedIdeas.previous * 25) + (data.escalationsResolved.previous * 15) + (data.propagationsOut.previous * 10))),
    evidence: [
      `${data.promotedIdeas.current} idei promovate/aprobate`,
      `${data.escalationsResolved.current} probleme rezolvate`,
      `${data.propagationsOut.current} cunoștințe exportate către alți agenți`,
    ].filter(e => !e.startsWith("0 ")),
  })

  // 5. REZOLVARE PROBLEME — complexitate și diversitate
  const problemScore = Math.min(100, (
    (data.interventions.current * 15) +                // Intervenții = probleme rezolvate
    (data.escalationsResolved.current * 20) +           // Escaladări rezolvate
    (data.ideas.current * 5) +                         // Idei generate
    (data.crossPollinations.current * 15) +            // Conexiuni cross-domain
    (data.sentinelAlerts * 10)                         // Pattern detection
  ))
  dims.push({
    name: "Rezolvare probleme",
    score: problemScore,
    trend: trend(problemScore, Math.min(100, (data.interventions.previous * 15) + (data.escalationsResolved.previous * 20) + (data.ideas.previous * 5) + (data.crossPollinations.previous * 15))),
    evidence: [
      `${data.interventions.current} intervenții directe`,
      `${data.crossPollinations.current} insight-uri cross-domain`,
      `${data.ideas.current} idei în brainstorming`,
    ].filter(e => !e.startsWith("0 ")),
  })

  // 6. COLABORARE — interacțiuni inter-agent
  const collabScore = Math.min(100, (
    (data.crossPollinations.current * 20) +
    (data.propagationsOut.current * 15) +
    (data.propagationsIn.current * 10) +
    (data.ideas.current * 5) +
    (data.kb.current > 0 ? 10 : 0)
  ))
  dims.push({
    name: "Colaborare",
    score: collabScore,
    trend: trend(collabScore, Math.min(100, (data.crossPollinations.previous * 20) + (data.propagationsOut.previous * 15) + (data.propagationsIn.previous * 10))),
    evidence: [
      `${data.propagationsOut.current} cunoștințe partajate`,
      `${data.propagationsIn.current} cunoștințe primite`,
      `${data.crossPollinations.current} sesiuni cross-pollination`,
    ],
  })

  // 7. ÎNVĂȚARE ȘI ADAPTARE — ritm de creștere
  const learningScore = Math.min(100, (
    (data.kb.current * 8) +                            // KB growth
    (data.reflections.current * 15) +                  // Reflecție activă
    (data.kbHighConf.current * 10) +                   // Calitate înaltă
    (data.kb.current > data.kb.previous ? 15 : 0) +    // Trend crescător
    (data.propagationsIn.current * 5)                  // Învață de la alții
  ))
  dims.push({
    name: "Învățare și adaptare",
    score: learningScore,
    trend: trend(data.kb.current, data.kb.previous),
    evidence: [
      `${data.kb.current} entries noi (vs. ${data.kb.previous} perioada anterioară)`,
      `${data.reflections.current} sesiuni de reflecție`,
      `${data.propagationsIn.current} cunoștințe absorbite de la colegi`,
    ],
  })

  // 8. ALINIERE MORALĂ — coerență REALĂ cu CÂMPUL
  // NU presupunem aliniere by design — măsurăm din dovezi concrete:
  // alignment checks trecute, anti-patterns detectate, output-uri retractate
  const alignmentData = data.alignmentChecks ?? { aligned: 0, misaligned: 0, escalated: 0, total: 0 }
  const antiPatterns = data.antiPatterns ?? 0
  const alignedRate = alignmentData.total > 0
    ? (alignmentData.aligned / alignmentData.total) * 100
    : 50 // fără date = nu știm, nu presupunem
  const moralScore = Math.min(100, Math.max(0,
    Math.round(alignedRate) +                           // Rată reală de aliniere din alignment checker
    (data.reflections.current * 3) -                    // Reflecția crește ușor
    (antiPatterns * 15) -                               // Anti-patterns = dovadă de probleme reale
    (alignmentData.misaligned * 20) -                   // MISALIGNED = penalizare serioasă
    (alignmentData.escalated * 5)                       // Escaladare = incertitudine (mai puțin grav)
  ))
  dims.push({
    name: "Aliniere morală",
    score: moralScore,
    trend: trend(moralScore, 50),
    evidence: [
      alignmentData.total > 0
        ? `${alignmentData.aligned}/${alignmentData.total} verificări trecute (${Math.round(alignedRate)}%)`
        : "Nicio verificare alignment încă — scor neutru",
      alignmentData.misaligned > 0 ? `${alignmentData.misaligned} acțiuni blocate ca nealiniate` : "Zero acțiuni nealiniate",
      antiPatterns > 0 ? `${antiPatterns} anti-patterns detectate` : "Zero anti-patterns",
      `${data.reflections.current} reflecții morale/etice`,
    ].filter(e => !e.startsWith("0 ") && !e.startsWith("Zero")),
  })

  return dims
}

// ── Generare raport complet ─────────────────────────────────────────────────

export async function generateEvolutionReport(
  prisma: PrismaClient,
  periodDays: number = 3
): Promise<EvolutionReport> {
  const p = prisma as any
  const now = new Date()
  const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000)
  const prevEnd = periodStart
  const prevStart = new Date(prevEnd.getTime() - periodDays * 24 * 60 * 60 * 1000)

  // Get all active agents
  const agents = await p.agentDefinition.findMany({
    where: { isActive: true },
    select: { agentRole: true, displayName: true, description: true },
  })

  const agentEvolutions: AgentEvolution[] = []
  const topEvolutions: EvolutionReport["topEvolutions"] = []
  const concerns: EvolutionReport["concerns"] = []

  for (const agent of agents) {
    const data = await collectAgentData(agent.agentRole, periodStart, now, prevStart, prevEnd, p)
    const dimensions = calculateDimensions(data)

    // Scor compozit ponderat
    const dimMap: Record<string, number> = {}
    const dimNames = ["inteligenta", "compatibilitate", "autonomie", "calitate_decizii", "rezolvare_probleme", "colaborare", "invatare", "aliniere_morala"]
    dimensions.forEach((d, i) => { dimMap[dimNames[i]] = d.score })

    const compositeScore = Math.round(
      Object.entries(DIMENSION_WEIGHTS).reduce((sum, [key, weight]) => sum + (dimMap[key] || 0) * weight, 0)
    )

    // Previous composite (simplificat)
    const prevComposite = Math.round(compositeScore * 0.95) // Aproximare — ideal ar fi stocat

    const evolution: AgentEvolution = {
      agentRole: agent.agentRole,
      displayName: agent.displayName || agent.agentRole,
      period: { from: periodStart.toISOString(), to: now.toISOString() },
      previousPeriod: { from: prevStart.toISOString(), to: prevEnd.toISOString() },
      dimensions,
      compositeScore,
      compositeTrend: trend(compositeScore, prevComposite),
      highlight: dimensions.reduce((best, d) => d.score > best.score ? d : best, dimensions[0]).name +
        ` (${dimensions.reduce((best, d) => d.score > best.score ? d : best, dimensions[0]).score}/100)`,
      concern: dimensions.reduce((worst, d) => d.score < worst.score ? d : worst, dimensions[0]).name +
        ` (${dimensions.reduce((worst, d) => d.score < worst.score ? d : worst, dimensions[0]).score}/100)`,
      maturityLevel: maturityFromScore(compositeScore),
    }
    agentEvolutions.push(evolution)

    // Track top evolutions
    for (const dim of dimensions) {
      if (dim.trend === "up") {
        topEvolutions.push({ role: agent.agentRole, dimension: dim.name, delta: dim.score })
      }
    }

    // Track concerns
    for (const dim of dimensions) {
      if (dim.score < 20) {
        concerns.push({ role: agent.agentRole, issue: `${dim.name}: ${dim.score}/100`, severity: "HIGH" })
      } else if (dim.score < 40) {
        concerns.push({ role: agent.agentRole, issue: `${dim.name}: ${dim.score}/100`, severity: "MEDIUM" })
      }
    }
  }

  // Sort by composite score
  agentEvolutions.sort((a, b) => b.compositeScore - a.compositeScore)
  topEvolutions.sort((a, b) => b.delta - a.delta)

  // Team health
  const avgComposite = agentEvolutions.length > 0
    ? Math.round(agentEvolutions.reduce((s, a) => s + a.compositeScore, 0) / agentEvolutions.length)
    : 0

  const distribution = {
    seed: agentEvolutions.filter(a => a.maturityLevel === "SEED").length,
    growing: agentEvolutions.filter(a => a.maturityLevel === "GROWING").length,
    competent: agentEvolutions.filter(a => a.maturityLevel === "COMPETENT").length,
    expert: agentEvolutions.filter(a => a.maturityLevel === "EXPERT").length,
    master: agentEvolutions.filter(a => a.maturityLevel === "MASTER").length,
  }

  // Generate summary with Claude
  let summary = ""
  try {
    const top3 = agentEvolutions.slice(0, 3).map(a => `${a.agentRole}: ${a.compositeScore}/100 (${a.maturityLevel})`).join(", ")
    const bottom3 = agentEvolutions.slice(-3).map(a => `${a.agentRole}: ${a.compositeScore}/100 (${a.maturityLevel})`).join(", ")
    const highConcerns = concerns.filter(c => c.severity === "HIGH").map(c => `${c.role}: ${c.issue}`).join("; ")

    const cpuResult = await cpuCall({
      model: MODEL,
      max_tokens: 500,
      system: "",
      messages: [{
        role: "user",
        content: `Ești COG și redactezi un sumar executiv al raportului de evoluție a echipei de agenți AI.

Date: ${agentEvolutions.length} agenți evaluați. Media echipei: ${avgComposite}/100.
Distribuție maturitate: ${JSON.stringify(distribution)}.
Top 3: ${top3}.
Bottom 3: ${bottom3}.
Preocupări critice: ${highConcerns || "Niciuna"}.

Scrie un paragraf de 3-4 propoziții în română, cu diacritice, ton profesional dar cald. Fără bullet points — text continuu.`,
      }],
      agentRole: "COG",
      operationType: "evolution-report-summary",
    })
    summary = cpuResult.text
  } catch {
    summary = `Raport de evoluție: ${agentEvolutions.length} agenți evaluați. Media echipei: ${avgComposite}/100. Distribuție: ${distribution.seed} SEED, ${distribution.growing} GROWING, ${distribution.competent} COMPETENT, ${distribution.expert} EXPERT, ${distribution.master} MASTER.`
  }

  return {
    generatedAt: now.toISOString(),
    periodDays,
    agentCount: agentEvolutions.length,
    agents: agentEvolutions,
    topEvolutions: topEvolutions.slice(0, 10),
    concerns: concerns.sort((a, b) => a.severity === "HIGH" ? -1 : b.severity === "HIGH" ? 1 : 0),
    teamHealth: {
      avgComposite,
      trend: "stable",
      distribution,
    },
    summary,
  }
}
