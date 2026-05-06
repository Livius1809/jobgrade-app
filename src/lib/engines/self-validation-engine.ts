/**
 * Self-Validation Engine — Autovalidare obiectiva per nivel
 *
 * Nu "cred ca am facut bine" ci "datele arata ca am facut bine".
 * Fiecare nivel se valideaza prin EFECTELE actiunilor sale, nu prin intentii.
 *
 * Metricile nu sunt raportare externa — sunt OGLINDA interna.
 * Fiecare nivel se uita la propriile metrici si se ajusteaza.
 *
 * Fluxul: metrici -> agent vede -> se ajusteaza -> metrici mai bune
 * NU: metrici -> dashboard -> Owner vede -> Owner decide
 */

import { prisma } from "@/lib/prisma"
import { MANAGER_CONFIGS, getManagerConfig } from "@/lib/agents/manager-configs"
import { checkBirthReadiness } from "@/lib/engines/business-birth"

// ═══════════════════════════════════════════════════════════════════════════════
// TIPURI
// ═══════════════════════════════════════════════════════════════════════════════

// ═══ NIVEL 1: AGENT OPERATIONAL ═══
// "Am rezolvat singur sau am escaladat? Am improvizat? Ce nu stiu?"

export interface AgentSelfValidation {
  agentRole: string
  period: { from: Date; to: Date }

  // Autonomie
  autonomyRate: number        // (tasks resolved alone) / (total tasks)
  escalationRate: number      // (escalated) / (total)
  kbHitRate: number           // (resolved from KB) / (total)

  // Calitate
  avgOutputQuality: number    // medie resultQuality
  qualityTrend: "IMPROVING" | "STABLE" | "DECLINING"

  // Cognitie
  improvisationRate: number   // cat de des improvizeaza
  improvisationSuccessRate: number // cand improvizeaza, cat reuseste
  contestationsAccepted: number   // cate contestari ale managerului au fost acceptate

  // Cunoastere
  kbGrowth: number            // KB entries noi validate in perioada
  knowledgeGaps: string[]     // domenii cu KB miss repetat

  // Verdict auto-generat
  selfAssessment: "GROWING" | "COMPETENT" | "STAGNATING" | "DECLINING"
  adjustmentNeeded: string[]
}

// ═══ NIVEL 2: MANAGER TACTIC ═══
// "Echipa mea creste? Cine stagneaza? Unde sunt gap-uri sistematice?"

export interface ManagerSelfValidation {
  managerRole: string
  teamRoles: string[]
  period: { from: Date; to: Date }

  // Echipa
  teamAutonomyRate: number
  teamAutonomyTrend: "IMPROVING" | "STABLE" | "DECLINING"
  weakestLink: { role: string; issue: string } | null
  strongestGrower: { role: string; improvement: number } | null

  // Calibrare proprie
  directivesContested: number
  directivesContestedAccepted: number
  objectivesCompletionRate: number

  // Cunoastere echipa
  systematicGaps: string[]
  crossPollination: number

  // Contemplare
  insightsGenerated: number
  insightsActioned: number

  selfAssessment: "EFFECTIVE_LEADER" | "COMPETENT_MANAGER" | "NEEDS_ADJUSTMENT" | "BOTTLENECK"
  adjustmentNeeded: string[]
}

// ═══ NIVEL 3: COG (STRATEGIC) ═══
// "Organismul devine mai autonom? Calitatea creste? Costul scade?"

export interface OrganismSelfValidation {
  period: { from: Date; to: Date }

  // Autonomie organism
  overallAutonomyRate: number
  autonomyTrend90Days: "ACCELERATING" | "STEADY" | "DECELERATING" | "REGRESSING"
  escalationsToOwner: number
  escalationsTrend: "DECREASING" | "STABLE" | "INCREASING"

  // Calitate globala
  avgOutputQuality: number
  qualityTrend: "IMPROVING" | "STABLE" | "DECLINING"
  selfHealingRate: number

  // Cognitie organism
  contemplationInsights: number
  insightsThatPreventedProblems: number
  mentalModelAccuracy: number
  criticalThinkingImpact: number

  // Evolutie cunoastere
  validatedKBGrowthRate: number
  knowledgeDepthScore: number
  curiosityROI: number

  // Costul inteligentei
  costPerDecision: number
  costTrend: "DECREASING" | "STABLE" | "INCREASING"

  // INDICATORUL SUPREM
  spiralVelocity: number

  selfAssessment: "EVOLVING" | "FUNCTIONAL" | "PLATEAUING" | "DETERIORATING"
  strategicAdjustments: string[]
}

// ═══ NIVEL 4: CPU (CROSS-BUSINESS) ═══
// "Business-ul produce cunoastere transferabila? Spirala se accelereaza?"

export interface CPUSelfValidation {
  businesses: { businessId: string; spiralVelocity: number; autonomyRate: number }[]

  // Transfer cunoastere
  sharedKBGrowth: number
  crossBusinessLearning: number

  // Capacitate reproductiva
  birthReadiness: boolean
  maturityScore: number

  selfAssessment: "READY_TO_REPRODUCE" | "MATURING" | "GROWING" | "NASCENT"
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const p = prisma as any

function periodRange(periodDays: number): { from: Date; to: Date } {
  const to = new Date()
  const from = new Date(to.getTime() - periodDays * 24 * 60 * 60 * 1000)
  return { from, to }
}

function previousPeriodRange(periodDays: number): { from: Date; to: Date } {
  const to = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000)
  const from = new Date(to.getTime() - periodDays * 24 * 60 * 60 * 1000)
  return { from, to }
}

function trend(current: number, previous: number): "IMPROVING" | "STABLE" | "DECLINING" {
  const delta = current - previous
  if (delta > 5) return "IMPROVING"
  if (delta < -5) return "DECLINING"
  return "STABLE"
}

// ═══════════════════════════════════════════════════════════════════════════════
// NIVEL 1: AGENT
// ═══════════════════════════════════════════════════════════════════════════════

export async function validateAgent(
  agentRole: string,
  periodDays: number = 7
): Promise<AgentSelfValidation> {
  const period = periodRange(periodDays)
  const prev = previousPeriodRange(periodDays)

  // ── Task counts for current period ──
  const [completed, escalated, blocked, total, kbHitCount] = await Promise.all([
    p.agentTask.count({
      where: { assignedTo: agentRole, status: "COMPLETED", completedAt: { gte: period.from, lte: period.to } },
    }).catch(() => 0),
    p.agentTask.count({
      where: { assignedTo: agentRole, status: { in: ["BLOCKED", "FAILED"] }, createdAt: { gte: period.from, lte: period.to } },
    }).catch(() => 0),
    p.agentTask.count({
      where: { assignedTo: agentRole, status: "BLOCKED", blockedAt: { gte: period.from, lte: period.to } },
    }).catch(() => 0),
    p.agentTask.count({
      where: { assignedTo: agentRole, createdAt: { gte: period.from, lte: period.to } },
    }).catch(() => 0),
    p.agentTask.count({
      where: { assignedTo: agentRole, status: "COMPLETED", kbHit: true, completedAt: { gte: period.from, lte: period.to } },
    }).catch(() => 0),
  ])

  const autonomyRate = total > 0 ? Math.round((completed / total) * 100) : 0
  const escalationRate = total > 0 ? Math.round((escalated / total) * 100) : 0
  const kbHitRate = total > 0 ? Math.round((kbHitCount / total) * 100) : 0

  // ── Quality ──
  const qualityAgg = await p.agentTask.aggregate({
    where: {
      assignedTo: agentRole,
      status: "COMPLETED",
      resultQuality: { not: null },
      completedAt: { gte: period.from, lte: period.to },
    },
    _avg: { resultQuality: true },
  }).catch(() => ({ _avg: { resultQuality: null } }))
  const avgOutputQuality = Math.round(qualityAgg._avg?.resultQuality ?? 0)

  // Previous period quality for trend
  const prevQualityAgg = await p.agentTask.aggregate({
    where: {
      assignedTo: agentRole,
      status: "COMPLETED",
      resultQuality: { not: null },
      completedAt: { gte: prev.from, lte: prev.to },
    },
    _avg: { resultQuality: true },
  }).catch(() => ({ _avg: { resultQuality: null } }))
  const prevQuality = Math.round(prevQualityAgg._avg?.resultQuality ?? 0)
  const qualityTrend = trend(avgOutputQuality, prevQuality)

  // ── Improvisation ──
  const improvisedTasks = await p.agentTask.count({
    where: {
      assignedTo: agentRole,
      tags: { has: "improvised" },
      createdAt: { gte: period.from, lte: period.to },
    },
  }).catch(() => 0)
  const improvisedSuccessful = await p.agentTask.count({
    where: {
      assignedTo: agentRole,
      tags: { has: "improvised" },
      status: "COMPLETED",
      completedAt: { gte: period.from, lte: period.to },
    },
  }).catch(() => 0)
  const improvisationRate = total > 0 ? Math.round((improvisedTasks / total) * 100) : 0
  const improvisationSuccessRate = improvisedTasks > 0
    ? Math.round((improvisedSuccessful / improvisedTasks) * 100)
    : 0

  // ── Contestations (hierarchical-critical-thinking) ──
  const contestationsAccepted = await p.kBEntry.count({
    where: {
      agentRole,
      tags: { has: "contestation-accepted" },
      createdAt: { gte: period.from, lte: period.to },
    },
  }).catch(() => 0)

  // ── KB Growth ──
  const kbGrowth = await p.kBEntry.count({
    where: {
      agentRole,
      status: "PERMANENT",
      createdAt: { gte: period.from, lte: period.to },
    },
  }).catch(() => 0)

  // ── Knowledge gaps: domains where agent had KB miss repeatedly ──
  // Detect from tasks that were NOT kbHit (agent had to execute real, no KB to rely on)
  const nonKbTasks = await p.agentTask.findMany({
    where: {
      assignedTo: agentRole,
      kbHit: false,
      status: "COMPLETED",
      completedAt: { gte: period.from, lte: period.to },
    },
    select: { taskType: true, tags: true },
  }).catch(() => [])

  // Group by taskType to find repeated misses
  const gapMap = new Map<string, number>()
  for (const t of nonKbTasks) {
    const key = t.taskType || "UNKNOWN"
    gapMap.set(key, (gapMap.get(key) || 0) + 1)
  }
  const knowledgeGaps: string[] = []
  for (const [domain, count] of gapMap) {
    if (count >= 2) knowledgeGaps.push(`${domain} (${count} misses)`)
  }

  // ── Previous period autonomy for trend comparison ──
  const prevCompleted = await p.agentTask.count({
    where: { assignedTo: agentRole, status: "COMPLETED", completedAt: { gte: prev.from, lte: prev.to } },
  }).catch(() => 0)
  const prevTotal = await p.agentTask.count({
    where: { assignedTo: agentRole, createdAt: { gte: prev.from, lte: prev.to } },
  }).catch(() => 0)
  const prevAutonomy = prevTotal > 0 ? Math.round((prevCompleted / prevTotal) * 100) : 0

  // ── Self-assessment ──
  const adjustmentNeeded: string[] = []

  // Assessment logic
  let selfAssessment: AgentSelfValidation["selfAssessment"]
  const autonomyImproving = autonomyRate > prevAutonomy + 5
  const qualityGood = avgOutputQuality >= 60

  if (autonomyRate >= 80 && qualityTrend !== "DECLINING" && autonomyImproving) {
    selfAssessment = "GROWING"
  } else if (autonomyRate >= 60 && qualityGood) {
    selfAssessment = "COMPETENT"
  } else if (autonomyRate < prevAutonomy - 10 || qualityTrend === "DECLINING") {
    selfAssessment = "DECLINING"
  } else {
    selfAssessment = "STAGNATING"
  }

  // Adjustment recommendations
  if (escalationRate > 30) {
    adjustmentNeeded.push("Reduce dependenta de manager prin explorare KB inainte de escaladare")
  }
  if (kbHitRate < 20 && kbGrowth < 2) {
    adjustmentNeeded.push("Contribuie mai mult la KB — cunoasterea ta nu se consolideaza")
  }
  if (improvisationRate > 40) {
    adjustmentNeeded.push("Improvizezi prea mult — stabilizeaza prin documentare in KB")
  }
  if (knowledgeGaps.length > 0) {
    adjustmentNeeded.push(`Gap-uri de cunoastere in: ${knowledgeGaps.join(", ")}`)
  }
  if (qualityTrend === "DECLINING") {
    adjustmentNeeded.push("Calitatea output-ului scade — revizuieste feedback-ul de la manager")
  }

  return {
    agentRole,
    period,
    autonomyRate,
    escalationRate,
    kbHitRate,
    avgOutputQuality,
    qualityTrend,
    improvisationRate,
    improvisationSuccessRate,
    contestationsAccepted,
    kbGrowth,
    knowledgeGaps,
    selfAssessment,
    adjustmentNeeded,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// NIVEL 2: MANAGER
// ═══════════════════════════════════════════════════════════════════════════════

export async function validateManager(
  managerRole: string,
  periodDays: number = 7
): Promise<ManagerSelfValidation> {
  const period = periodRange(periodDays)

  const config = getManagerConfig(managerRole)
  const teamRoles = config?.subordinates ?? []

  // ── Aggregate agent validations for team ──
  const teamValidations: AgentSelfValidation[] = []
  for (const role of teamRoles) {
    try {
      const v = await validateAgent(role, periodDays)
      teamValidations.push(v)
    } catch {
      // Agent might not have data — skip
    }
  }

  // ── Team autonomy ──
  const teamAutonomyRate = teamValidations.length > 0
    ? Math.round(teamValidations.reduce((s, v) => s + v.autonomyRate, 0) / teamValidations.length)
    : 0

  // Previous period team autonomy (simplified: use previous completed/total)
  const prevPeriod = previousPeriodRange(periodDays)
  let prevTeamAutonomy = 0
  if (teamRoles.length > 0) {
    const [prevTeamCompleted, prevTeamTotal] = await Promise.all([
      p.agentTask.count({
        where: { assignedTo: { in: teamRoles }, status: "COMPLETED", completedAt: { gte: prevPeriod.from, lte: prevPeriod.to } },
      }).catch(() => 0),
      p.agentTask.count({
        where: { assignedTo: { in: teamRoles }, createdAt: { gte: prevPeriod.from, lte: prevPeriod.to } },
      }).catch(() => 0),
    ])
    prevTeamAutonomy = prevTeamTotal > 0 ? Math.round((prevTeamCompleted / prevTeamTotal) * 100) : 0
  }
  const teamAutonomyTrend = trend(teamAutonomyRate, prevTeamAutonomy)

  // ── Weakest link & strongest grower ──
  let weakestLink: ManagerSelfValidation["weakestLink"] = null
  let strongestGrower: ManagerSelfValidation["strongestGrower"] = null

  if (teamValidations.length > 0) {
    // Weakest: lowest autonomy + declining
    const sorted = [...teamValidations].sort((a, b) => a.autonomyRate - b.autonomyRate)
    const weakest = sorted[0]
    if (weakest.selfAssessment === "DECLINING" || weakest.selfAssessment === "STAGNATING") {
      weakestLink = {
        role: weakest.agentRole,
        issue: weakest.adjustmentNeeded[0] || `autonomyRate=${weakest.autonomyRate}%, selfAssessment=${weakest.selfAssessment}`,
      }
    }

    // Strongest grower: biggest autonomy improvement
    const withPrevious = teamValidations.filter(v => v.autonomyRate > 0)
    if (withPrevious.length > 0) {
      // Use quality trend as proxy for growth
      const growing = withPrevious
        .filter(v => v.qualityTrend === "IMPROVING" || v.selfAssessment === "GROWING")
        .sort((a, b) => b.autonomyRate - a.autonomyRate)
      if (growing.length > 0) {
        strongestGrower = {
          role: growing[0].agentRole,
          improvement: growing[0].autonomyRate,
        }
      }
    }
  }

  // ── Directives contested ──
  // Count tasks from this manager that were contested by subordinates
  const [directivesContested, directivesContestedAccepted] = await Promise.all([
    p.kBEntry.count({
      where: {
        agentRole: { in: teamRoles },
        tags: { hasSome: ["contestation-raised", "critical-thinking-triggered"] },
        createdAt: { gte: period.from, lte: period.to },
      },
    }).catch(() => 0),
    p.kBEntry.count({
      where: {
        agentRole: { in: teamRoles },
        tags: { has: "contestation-accepted" },
        createdAt: { gte: period.from, lte: period.to },
      },
    }).catch(() => 0),
  ])

  // ── Objectives completion ──
  const [objectivesActive, objectivesCompleted] = await Promise.all([
    p.organizationalObjective.count({
      where: {
        OR: [
          { ownerRoles: { has: managerRole } },
          { contributorRoles: { has: managerRole } },
        ],
      },
    }).catch(() => 0),
    p.organizationalObjective.count({
      where: {
        OR: [
          { ownerRoles: { has: managerRole } },
          { contributorRoles: { has: managerRole } },
        ],
        completedAt: { not: null },
      },
    }).catch(() => 0),
  ])
  const objectivesCompletionRate = objectivesActive > 0
    ? Math.round((objectivesCompleted / objectivesActive) * 100)
    : 0

  // ── Systematic gaps (appear in >2 team members) ──
  const gapCounter = new Map<string, number>()
  for (const v of teamValidations) {
    for (const gap of v.knowledgeGaps) {
      // Extract domain name (before the parenthetical count)
      const domain = gap.replace(/\s*\(.*\)/, "")
      gapCounter.set(domain, (gapCounter.get(domain) || 0) + 1)
    }
  }
  const systematicGaps: string[] = []
  for (const [domain, count] of gapCounter) {
    if (count >= 2) systematicGaps.push(`${domain} (${count} membri afectati)`)
  }

  // ── Cross-pollination: learning artifacts shared between team members ──
  const crossPollination = await p.learningArtifact.count({
    where: {
      teacherRole: { in: teamRoles },
      studentRole: { in: teamRoles },
      createdAt: { gte: period.from, lte: period.to },
    },
  }).catch(() => 0)

  // ── Contemplation insights ──
  // Stored in SystemConfig as JSON arrays under CONTEMPLATION_INSIGHTS_*
  const insightConfigs = await p.systemConfig.findMany({
    where: { key: { startsWith: "CONTEMPLATION_INSIGHTS" } },
  }).catch(() => [])

  let insightsGenerated = 0
  let insightsActioned = 0
  for (const cfg of insightConfigs) {
    try {
      const insights = JSON.parse(cfg.value)
      if (Array.isArray(insights)) {
        insightsGenerated += insights.length
        insightsActioned += insights.filter((i: any) => i.actionable && i.suggestedObjective).length
      }
    } catch {
      // Skip malformed
    }
  }

  // ── Self-assessment ──
  const adjustmentNeeded: string[] = []
  let selfAssessment: ManagerSelfValidation["selfAssessment"]

  if (teamAutonomyTrend === "IMPROVING" && objectivesCompletionRate >= 50 && !weakestLink) {
    selfAssessment = "EFFECTIVE_LEADER"
  } else if (teamAutonomyRate >= 50 && objectivesCompletionRate >= 30) {
    selfAssessment = "COMPETENT_MANAGER"
  } else if (teamAutonomyTrend === "DECLINING" || directivesContested > 5) {
    selfAssessment = "BOTTLENECK"
  } else {
    selfAssessment = "NEEDS_ADJUSTMENT"
  }

  if (weakestLink) {
    adjustmentNeeded.push(`Ofera coaching pentru ${weakestLink.role}: ${weakestLink.issue}`)
  }
  if (systematicGaps.length > 0) {
    adjustmentNeeded.push(`Gap-uri sistematice in echipa: ${systematicGaps.join(", ")}`)
  }
  if (directivesContested > 3 && directivesContestedAccepted === 0) {
    adjustmentNeeded.push("Echipa contesta directivele dar nu accepti niciuna — asculta mai mult")
  }
  if (crossPollination === 0 && teamRoles.length >= 3) {
    adjustmentNeeded.push("Zero transfer de cunoastere intre membrii echipei — activeaza cross-pollination")
  }
  if (selfAssessment === "BOTTLENECK") {
    adjustmentNeeded.push("Reduce interventiile directe — lasa echipa sa rezolve autonom")
  }

  return {
    managerRole,
    teamRoles,
    period,
    teamAutonomyRate,
    teamAutonomyTrend,
    weakestLink,
    strongestGrower,
    directivesContested,
    directivesContestedAccepted,
    objectivesCompletionRate,
    systematicGaps,
    crossPollination,
    insightsGenerated,
    insightsActioned,
    selfAssessment,
    adjustmentNeeded,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// NIVEL 3: ORGANISM (COG)
// ═══════════════════════════════════════════════════════════════════════════════

export async function validateOrganism(
  periodDays: number = 30
): Promise<OrganismSelfValidation> {
  const period = periodRange(periodDays)
  const prev = previousPeriodRange(periodDays)
  const period90 = periodRange(90)

  // ── Overall autonomy: completed / total across all agents ──
  const [allCompleted, allTotal, allEscalatedOwner] = await Promise.all([
    p.agentTask.count({
      where: { status: "COMPLETED", completedAt: { gte: period.from, lte: period.to } },
    }).catch(() => 0),
    p.agentTask.count({
      where: { createdAt: { gte: period.from, lte: period.to } },
    }).catch(() => 0),
    p.agentTask.count({
      where: { status: "BLOCKED", blockerType: "WAITING_OWNER", blockedAt: { gte: period.from, lte: period.to } },
    }).catch(() => 0),
  ])
  const overallAutonomyRate = allTotal > 0 ? Math.round((allCompleted / allTotal) * 100) : 0

  // Previous period autonomy
  const [prevCompleted, prevTotal, prevEscalatedOwner] = await Promise.all([
    p.agentTask.count({
      where: { status: "COMPLETED", completedAt: { gte: prev.from, lte: prev.to } },
    }).catch(() => 0),
    p.agentTask.count({
      where: { createdAt: { gte: prev.from, lte: prev.to } },
    }).catch(() => 0),
    p.agentTask.count({
      where: { status: "BLOCKED", blockerType: "WAITING_OWNER", blockedAt: { gte: prev.from, lte: prev.to } },
    }).catch(() => 0),
  ])
  const prevAutonomy = prevTotal > 0 ? Math.round((prevCompleted / prevTotal) * 100) : 0

  // 90-day autonomy for spiral velocity
  const [completed90, total90] = await Promise.all([
    p.agentTask.count({
      where: { status: "COMPLETED", completedAt: { gte: period90.from, lte: period90.to } },
    }).catch(() => 0),
    p.agentTask.count({
      where: { createdAt: { gte: period90.from, lte: period90.to } },
    }).catch(() => 0),
  ])
  const autonomy90 = total90 > 0 ? Math.round((completed90 / total90) * 100) : 0

  // Autonomy trend 90 days
  const autonomyDelta90 = overallAutonomyRate - autonomy90
  let autonomyTrend90Days: OrganismSelfValidation["autonomyTrend90Days"]
  if (autonomyDelta90 > 10) autonomyTrend90Days = "ACCELERATING"
  else if (autonomyDelta90 > 0) autonomyTrend90Days = "STEADY"
  else if (autonomyDelta90 > -10) autonomyTrend90Days = "DECELERATING"
  else autonomyTrend90Days = "REGRESSING"

  // Escalations trend
  const escalationsTrend: OrganismSelfValidation["escalationsTrend"] =
    allEscalatedOwner < prevEscalatedOwner ? "DECREASING" :
    allEscalatedOwner > prevEscalatedOwner ? "INCREASING" : "STABLE"

  // ── Quality ──
  const qualityAgg = await p.agentTask.aggregate({
    where: {
      status: "COMPLETED",
      resultQuality: { not: null },
      completedAt: { gte: period.from, lte: period.to },
    },
    _avg: { resultQuality: true },
  }).catch(() => ({ _avg: { resultQuality: null } }))
  const avgOutputQuality = Math.round(qualityAgg._avg?.resultQuality ?? 0)

  const prevQualityAgg = await p.agentTask.aggregate({
    where: {
      status: "COMPLETED",
      resultQuality: { not: null },
      completedAt: { gte: prev.from, lte: prev.to },
    },
    _avg: { resultQuality: true },
  }).catch(() => ({ _avg: { resultQuality: null } }))
  const prevQualityVal = Math.round(prevQualityAgg._avg?.resultQuality ?? 0)
  const qualityTrend = trend(avgOutputQuality, prevQualityVal)

  // ── Self-healing rate ──
  const [autoRemediated, totalIssues] = await Promise.all([
    p.agentTask.count({
      where: {
        tags: { hasSome: ["auto-remediated", "improvised", "self-healed"] },
        completedAt: { gte: period.from, lte: period.to },
      },
    }).catch(() => 0),
    p.agentTask.count({
      where: {
        status: { in: ["COMPLETED", "FAILED", "BLOCKED"] },
        createdAt: { gte: period.from, lte: period.to },
      },
    }).catch(() => 0),
  ])
  const selfHealingRate = totalIssues > 0 ? Math.round((autoRemediated / totalIssues) * 100) : 0

  // ── Contemplation insights ──
  const insightConfigs = await p.systemConfig.findMany({
    where: { key: { startsWith: "CONTEMPLATION_INSIGHTS" } },
  }).catch(() => [])

  let contemplationInsights = 0
  let insightsThatPreventedProblems = 0
  for (const cfg of insightConfigs) {
    try {
      const insights = JSON.parse(cfg.value)
      if (Array.isArray(insights)) {
        contemplationInsights += insights.length
        insightsThatPreventedProblems += insights.filter(
          (i: any) => i.type === "PREDICTION" && i.actionable
        ).length
      }
    } catch {
      // Skip
    }
  }

  // ── Mental model accuracy (predictions confirmed / total predictions) ──
  // Proxy: use PREDICTION insights with high confidence as "predictions made"
  // and those that became objectives as "confirmed"
  const mentalModelAccuracy = contemplationInsights > 0
    ? Math.round((insightsThatPreventedProblems / Math.max(1, contemplationInsights)) * 100)
    : 0

  // ── Critical thinking impact ──
  // Compare quality of tasks that went through critical-thinking vs those that didn't
  const [ctQualityAgg, nonCtQualityAgg] = await Promise.all([
    p.agentTask.aggregate({
      where: {
        tags: { hasSome: ["critical-thinking-triggered", "contestation-raised"] },
        status: "COMPLETED",
        resultQuality: { not: null },
      },
      _avg: { resultQuality: true },
    }).catch(() => ({ _avg: { resultQuality: null } })),
    p.agentTask.aggregate({
      where: {
        NOT: { tags: { hasSome: ["critical-thinking-triggered", "contestation-raised"] } },
        status: "COMPLETED",
        resultQuality: { not: null },
      },
      _avg: { resultQuality: true },
    }).catch(() => ({ _avg: { resultQuality: null } })),
  ])
  const ctQuality = ctQualityAgg._avg?.resultQuality ?? 0
  const nonCtQuality = nonCtQualityAgg._avg?.resultQuality ?? 0
  const criticalThinkingImpact = Math.round(Number(ctQuality) - Number(nonCtQuality))

  // ── KB growth ──
  const validatedKBCount = await p.kBEntry.count({
    where: {
      status: "PERMANENT",
      createdAt: { gte: period.from, lte: period.to },
    },
  }).catch(() => 0)
  // Normalize to monthly rate
  const validatedKBGrowthRate = Math.round((validatedKBCount / Math.max(1, periodDays)) * 30)

  // Knowledge depth: average usage count per KB entry (proxy for interconnectedness)
  const kbDepthAgg = await p.kBEntry.aggregate({
    where: { status: "PERMANENT" },
    _avg: { usageCount: true },
  }).catch(() => ({ _avg: { usageCount: null } }))
  const knowledgeDepthScore = Math.round(Math.min(100, (kbDepthAgg._avg?.usageCount ?? 0) * 10))

  // Curiosity ROI: learning artifacts validated / total created
  const [totalArtifacts, validatedArtifacts] = await Promise.all([
    p.learningArtifact.count({
      where: { createdAt: { gte: period.from, lte: period.to } },
    }).catch(() => 0),
    p.learningArtifact.count({
      where: { validated: true, createdAt: { gte: period.from, lte: period.to } },
    }).catch(() => 0),
  ])
  const curiosityROI = totalArtifacts > 0
    ? Math.round((validatedArtifacts / totalArtifacts) * 100)
    : 0

  // ── Cost per decision ──
  const costAgg = await p.executionTelemetry.aggregate({
    where: { createdAt: { gte: period.from, lte: period.to }, isInternal: true },
    _sum: { tokensInput: true, tokensOutput: true },
  }).catch(() => ({ _sum: { tokensInput: 0, tokensOutput: 0 } }))
  const totalTokens = (costAgg._sum?.tokensInput ?? 0) + (costAgg._sum?.tokensOutput ?? 0)
  const costPerDecision = allCompleted > 0 ? Math.round(totalTokens / allCompleted) : 0

  // Previous period cost
  const prevCostAgg = await p.executionTelemetry.aggregate({
    where: { createdAt: { gte: prev.from, lte: prev.to }, isInternal: true },
    _sum: { tokensInput: true, tokensOutput: true },
  }).catch(() => ({ _sum: { tokensInput: 0, tokensOutput: 0 } }))
  const prevTokens = (prevCostAgg._sum?.tokensInput ?? 0) + (prevCostAgg._sum?.tokensOutput ?? 0)
  const prevCostPerDecision = prevCompleted > 0 ? Math.round(prevTokens / prevCompleted) : 0
  const costTrend: OrganismSelfValidation["costTrend"] =
    costPerDecision < prevCostPerDecision * 0.9 ? "DECREASING" :
    costPerDecision > prevCostPerDecision * 1.1 ? "INCREASING" : "STABLE"

  // ── SPIRAL VELOCITY: rata de imbunatatire a autonomyRate ──
  const spiralVelocity = Math.round(((overallAutonomyRate - autonomy90) / 90) * 1000) / 1000

  // ── Self-assessment ──
  const strategicAdjustments: string[] = []
  let selfAssessment: OrganismSelfValidation["selfAssessment"]

  if (spiralVelocity > 0.1 && qualityTrend !== "DECLINING" && autonomyTrend90Days === "ACCELERATING") {
    selfAssessment = "EVOLVING"
  } else if (overallAutonomyRate >= 50 && qualityTrend !== "DECLINING") {
    selfAssessment = "FUNCTIONAL"
  } else if (spiralVelocity <= 0 || autonomyTrend90Days === "REGRESSING") {
    selfAssessment = "DETERIORATING"
  } else {
    selfAssessment = "PLATEAUING"
  }

  if (spiralVelocity <= 0) {
    strategicAdjustments.push("Spirala a stagnat — investigheaza care echipe stagneaza si de ce")
  }
  if (costTrend === "INCREASING") {
    strategicAdjustments.push("Costul per decizie creste — optimizeaza utilizarea KB sau reduce tokenii")
  }
  if (escalationsTrend === "INCREASING") {
    strategicAdjustments.push("Escalatiile catre Owner cresc — organismul devine mai dependent, nu mai autonom")
  }
  if (selfHealingRate < 10) {
    strategicAdjustments.push("Rata de auto-vindecare scazuta — implementeaza mai multe mecanisme de auto-remediere")
  }
  if (validatedKBGrowthRate < 5) {
    strategicAdjustments.push("Cunoasterea creste prea lent — activeaza curiozitatea si cross-pollination")
  }

  return {
    period,
    overallAutonomyRate,
    autonomyTrend90Days,
    escalationsToOwner: allEscalatedOwner,
    escalationsTrend,
    avgOutputQuality,
    qualityTrend,
    selfHealingRate,
    contemplationInsights,
    insightsThatPreventedProblems,
    mentalModelAccuracy,
    criticalThinkingImpact,
    validatedKBGrowthRate,
    knowledgeDepthScore,
    curiosityROI,
    costPerDecision,
    costTrend,
    spiralVelocity,
    selfAssessment,
    strategicAdjustments,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// NIVEL 4: CPU (CROSS-BUSINESS)
// ═══════════════════════════════════════════════════════════════════════════════

export async function validateCPU(): Promise<CPUSelfValidation> {
  // ── Get all businesses ──
  const businessIds = await p.agentTask.findMany({
    select: { businessId: true },
    distinct: ["businessId"],
  }).catch(() => [])

  const businesses: CPUSelfValidation["businesses"] = []

  for (const { businessId } of businessIds) {
    // Per-business autonomy
    const [bCompleted, bTotal] = await Promise.all([
      p.agentTask.count({
        where: { businessId, status: "COMPLETED" },
      }).catch(() => 0),
      p.agentTask.count({
        where: { businessId },
      }).catch(() => 0),
    ])
    const autonomyRate = bTotal > 0 ? Math.round((bCompleted / bTotal) * 100) : 0

    // Per-business spiral velocity (simplified: use 90-day window)
    const d90 = new Date(Date.now() - 90 * 24 * 3600000)
    const [bCompleted90, bTotal90] = await Promise.all([
      p.agentTask.count({
        where: { businessId, status: "COMPLETED", completedAt: { gte: d90 } },
      }).catch(() => 0),
      p.agentTask.count({
        where: { businessId, createdAt: { gte: d90 } },
      }).catch(() => 0),
    ])
    const autonomy90 = bTotal90 > 0 ? Math.round((bCompleted90 / bTotal90) * 100) : 0
    const spiralVelocity = Math.round(((autonomyRate - autonomy90) / 90) * 1000) / 1000

    businesses.push({ businessId, spiralVelocity, autonomyRate })
  }

  // ── Shared KB growth (L1/L2 shared entries) ──
  const d30 = new Date(Date.now() - 30 * 24 * 3600000)
  const sharedKBGrowth = await p.kBEntry.count({
    where: {
      businessId: "shared",
      status: "PERMANENT",
      createdAt: { gte: d30 },
    },
  }).catch(() => 0)

  // ── Cross-business learning: artifacts where teacher and student are in different businesses ──
  // Simplified: count propagated KB entries from shared
  const crossBusinessLearning = await p.kBEntry.count({
    where: {
      source: "PROPAGATED",
      businessId: { not: "shared" },
      createdAt: { gte: d30 },
    },
  }).catch(() => 0)

  // ── Birth readiness ──
  let birthReadiness = false
  let maturityScore = 0
  try {
    const readiness = await checkBirthReadiness()
    birthReadiness = readiness.ready
    maturityScore = readiness.score
  } catch {
    // business-birth might fail if not enough data
  }

  // ── Self-assessment ──
  let selfAssessment: CPUSelfValidation["selfAssessment"]
  if (birthReadiness) {
    selfAssessment = "READY_TO_REPRODUCE"
  } else if (maturityScore >= 60) {
    selfAssessment = "MATURING"
  } else if (maturityScore >= 30) {
    selfAssessment = "GROWING"
  } else {
    selfAssessment = "NASCENT"
  }

  return {
    businesses,
    sharedKBGrowth,
    crossBusinessLearning,
    birthReadiness,
    maturityScore,
    selfAssessment,
  }
}
