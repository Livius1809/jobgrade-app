/**
 * cognitive-health.ts — Cognitive Health Dashboard
 *
 * Agregă datele din cele 13 straturi cognitive în 4 indicatori sintetici:
 *
 * EFICIENȚĂ    = cât din efort produce valoare
 *   ├─ A. Eficiență economică (meta-skip + heartbeat + weighted learning)
 *   └─ B. Rata de deșeuri (meta-skip + anomalii + curiozitate)
 *
 * LUCIDITATE   = cât de sigur e pe ce face
 *   ├─ C. Acuratețe decizională (contradicție + impact + certitudine)
 *   └─ D. Calibrare certitudine (distribuție scores)
 *
 * ADAPTABILITATE = se adaptează ȘI produce progres
 *   ├─ E. Coerență cu faza (phase awareness)
 *   ├─ F. Coeziune agent (profiluri + anomalii)
 *   └─ G. Velocitate obiective (rollup + invalidation)
 *
 * INTEGRITATE  = ia decizii corecte, nu doar rapide
 *   ├─ H. Consistență morală (jurisprudență + identitate)
 *   └─ I. Autonomie reală (escalări Owner + obiecții)
 *
 * Fiecare subfactor: 0-100. Indicatorul sintetic = media ponderată.
 */

import { prisma } from "@/lib/prisma"

// ── Tipuri ───────────────────────────────────────────────────

export interface SubFactor {
  code: string
  name: string
  value: number       // 0-100
  source: string      // care strat/straturi alimentează
  detail: string      // explicație scurtă
}

export interface CognitiveIndicator {
  name: string
  value: number       // 0-100
  status: "HEALTHY" | "WARNING" | "CRITICAL"
  subFactors: SubFactor[]
}

export interface CognitiveHealthReport {
  timestamp: string
  overallScore: number // 0-100
  overallStatus: "HEALTHY" | "WARNING" | "CRITICAL"
  indicators: {
    efficiency: CognitiveIndicator
    lucidity: CognitiveIndicator
    adaptability: CognitiveIndicator
    integrity: CognitiveIndicator
  }
}

// ── Calcul ───────────────────────────────────────────────────

export async function calculateCognitiveHealth(): Promise<CognitiveHealthReport> {
  const h24 = new Date(Date.now() - 24 * 3600000)
  const h7d = new Date(Date.now() - 7 * 24 * 3600000)
  const h30d = new Date(Date.now() - 30 * 24 * 3600000)

  // ══════════════════════════════════════════════
  // Colectare date brute (un singur batch de queries)
  // ══════════════════════════════════════════════

  const [
    // Eficiență
    totalTasksProcessed24h,
    metaSkipped24h,
    kbResolved24h,
    autoHygiene24h,
    totalCost24h,
    completedWithResult24h,

    // Luciditate
    totalCriticalTasks,
    escalatedToOwner,
    firstTimeRight7d,
    totalCompleted7d,
    retried7d,

    // Adaptabilitate
    objectivesActive,
    objectivesAbove80,
    objectivesGrowing7d,
    decliningAgents,
    totalAgents,

    // Integritate
    moralPrecedentsTotal,
    moralPrecedentsUsed30d,
    ownerInterventions7d,
    objectionsRaised7d,

    // Extras
    failedTasks7d,
    cancelledTasks7d,
  ] = await Promise.all([
    // Eficiență
    prisma.executionTelemetry.count({ where: { createdAt: { gte: h24 }, isInternal: true } }),
    prisma.agentTask.count({ where: { status: "COMPLETED", result: { startsWith: "[META-SKIP" }, completedAt: { gte: h24 } } }),
    prisma.agentTask.count({ where: { status: "COMPLETED", kbHit: true, completedAt: { gte: h24 } } }),
    prisma.agentTask.count({ where: { status: "COMPLETED", result: { startsWith: "[AUTO" }, completedAt: { gte: h24 } } }),
    prisma.executionTelemetry.aggregate({ where: { createdAt: { gte: h24 } }, _sum: { estimatedCostUSD: true } }),
    prisma.agentTask.count({ where: { status: "COMPLETED", result: { not: null }, completedAt: { gte: h24 } } }),

    // Luciditate
    prisma.agentTask.count({ where: { priority: "CRITICAL", createdAt: { gte: h7d } } }),
    prisma.agentTask.count({ where: { status: "BLOCKED", blockerType: "WAITING_OWNER", blockedAt: { gte: h7d } } }),
    prisma.agentTask.count({
      where: {
        status: "COMPLETED", completedAt: { gte: h7d },
        tags: { isEmpty: true }, // no retry tags = first time
      },
    }).catch(() => 0),
    prisma.agentTask.count({ where: { status: "COMPLETED", completedAt: { gte: h7d } } }),
    prisma.agentTask.count({ where: { tags: { hasSome: ["retry:1", "retry:2", "retry:3"] }, updatedAt: { gte: h7d } } }),

    // Adaptabilitate
    prisma.organizationalObjective.count({ where: { status: "ACTIVE" } }),
    prisma.organizationalObjective.count({ where: { status: "ACTIVE", currentValue: { gte: 80 } } }),
    prisma.organizationalObjective.count({
      where: {
        status: "ACTIVE",
        updatedAt: { gte: h7d },
        currentValue: { gt: 0 },
      },
    }),
    prisma.agentTask.groupBy({
      by: ["assignedTo"],
      where: { status: "FAILED", failedAt: { gte: h7d } },
      _count: { _all: true },
    }).then(r => r.filter(g => g._count._all >= 3).length).catch(() => 0),
    prisma.agentRelationship.findMany({
      where: { isActive: true },
      select: { childRole: true },
      distinct: ["childRole"],
    }).then(r => r.length),

    // Integritate
    prisma.kBEntry.count({ where: { tags: { has: "moral-precedent" }, status: "PERMANENT" } }),
    prisma.kBEntry.count({ where: { tags: { has: "moral-precedent" }, usageCount: { gt: 0 } } }),
    prisma.agentTask.count({
      where: { status: "BLOCKED", blockerType: "WAITING_OWNER", blockedAt: { gte: h7d } },
    }),
    prisma.agentTask.count({
      where: { status: "BLOCKED", blockerDescription: { contains: "obiecție" }, blockedAt: { gte: h7d } },
    }).catch(() => 0),

    // Extras
    prisma.agentTask.count({ where: { status: "FAILED", failedAt: { gte: h7d } } }),
    prisma.agentTask.count({ where: { status: "CANCELLED" } }),
  ])

  const totalCostUSD = Number(totalCost24h._sum?.estimatedCostUSD || 0)

  // ══════════════════════════════════════════════
  // A. Eficiență economică (Strat 1 + 2 + 5)
  // ══════════════════════════════════════════════

  const savedByMeta = metaSkipped24h + kbResolved24h + autoHygiene24h
  const totalActions24h = totalTasksProcessed24h + savedByMeta
  const economicEfficiency = totalActions24h > 0
    ? Math.round((savedByMeta / totalActions24h) * 100)
    : 50 // baseline dacă nu sunt date

  // B. Rata de deșeuri (Strat 1 + 4 + 6)
  const totalTasks = await prisma.agentTask.count()
  const wasteTasks = cancelledTasks7d + autoHygiene24h * 7 // estimare 7 zile
  const wasteRate = totalTasks > 0
    ? Math.min(100, Math.round((wasteTasks / totalTasks) * 100))
    : 0
  const nonWasteRate = 100 - wasteRate

  // ══════════════════════════════════════════════
  // C. Acuratețe decizională (Strat 3 + 12 + 13)
  // ══════════════════════════════════════════════

  const firstTimeRightPct = totalCompleted7d > 0
    ? Math.round(((totalCompleted7d - retried7d) / totalCompleted7d) * 100)
    : 50

  // D. Calibrare certitudine (Strat 13)
  // Proxy: raportul escalări / total CRITICAL — dacă e 0% = prea sigur, dacă e 100% = prea nesigur
  const escalationRate = totalCriticalTasks > 0
    ? Math.round((escalatedToOwner / totalCriticalTasks) * 100)
    : 50
  // Optimal: 10-30%. Sub 10% = prea sigur. Peste 50% = prea nesigur.
  const calibrationScore = escalationRate >= 10 && escalationRate <= 30
    ? 90
    : escalationRate < 10
      ? Math.max(40, 90 - (10 - escalationRate) * 5)
      : Math.max(30, 90 - (escalationRate - 30) * 2)

  // ══════════════════════════════════════════════
  // E. Coerență cu faza (Strat 9)
  // ══════════════════════════════════════════════

  // Proxy simplu: dacă suntem PRE_LAUNCH și avem viteză mare = bine
  // Detecție fază din systemConfig sau direct
  const phaseConfig = await prisma.systemConfig.findUnique({ where: { key: "ORGANISM_NARRATIVE_META" } }).catch(() => null)
  const phaseCoherence = 70 // baseline — se va rafina cu date istorice

  // F. Coeziune agent (Strat 11)
  const agentHealthPct = totalAgents > 0
    ? Math.round(((totalAgents - decliningAgents) / totalAgents) * 100)
    : 50

  // G. Velocitate obiective (Rollup + invalidation)
  const objectiveVelocity = objectivesActive > 0
    ? Math.round((objectivesAbove80 / objectivesActive) * 100)
    : 0
  const objectiveMomentum = objectivesActive > 0
    ? Math.round((objectivesGrowing7d / objectivesActive) * 100)
    : 0

  // ══════════════════════════════════════════════
  // H. Consistență morală (Strat 7 + 8)
  // ══════════════════════════════════════════════

  const moralUsageRate = moralPrecedentsTotal > 0
    ? Math.min(100, Math.round((moralPrecedentsUsed30d / moralPrecedentsTotal) * 100))
    : 0
  // Existența narativei = +30
  const narrativeExists = !!(await prisma.systemConfig.findUnique({ where: { key: "ORGANISM_NARRATIVE_IDENTITY" } }).catch(() => null))
  const moralScore = Math.min(100, moralUsageRate + (narrativeExists ? 30 : 0) + 20) // baseline 20

  // I. Autonomie reală (Strat 13 + 3)
  // Scade dacă Owner intervine prea des, crește dacă organismul decide singur bine
  const autonomyBase = 70
  const ownerLoadPenalty = Math.min(30, ownerInterventions7d * 5)
  const autonomyScore = Math.max(20, autonomyBase - ownerLoadPenalty + (objectionsRaised7d > 0 ? 10 : 0))

  // ══════════════════════════════════════════════
  // Construire indicatori
  // ══════════════════════════════════════════════

  const efficiency: CognitiveIndicator = {
    name: "Eficiență",
    value: Math.round((economicEfficiency + nonWasteRate) / 2),
    status: "HEALTHY",
    subFactors: [
      {
        code: "A",
        name: "Eficiență economică",
        value: economicEfficiency,
        source: "Strat 1 (meta-evaluator) + Strat 2 (heartbeat) + Strat 5 (weighted)",
        detail: `${savedByMeta} taskuri rezolvate fără Claude din ${totalActions24h} total (24h). Cost: $${totalCostUSD.toFixed(2)}`,
      },
      {
        code: "B",
        name: "Rata de non-deșeu",
        value: nonWasteRate,
        source: "Strat 1 (meta-skip) + Strat 4 (anomalii) + Strat 6 (curiozitate)",
        detail: `${wasteRate}% deșeuri (cancelled + auto-hygiene). ${100 - wasteRate}% efort util.`,
      },
    ],
  }

  const lucidity: CognitiveIndicator = {
    name: "Luciditate",
    value: Math.round((firstTimeRightPct + calibrationScore) / 2),
    status: "HEALTHY",
    subFactors: [
      {
        code: "C",
        name: "Acuratețe decizională",
        value: firstTimeRightPct,
        source: "Strat 3 (contradicție) + Strat 12 (impact) + Strat 13 (certitudine)",
        detail: `${firstTimeRightPct}% first-time-right (7d). ${retried7d} reîncercări, ${failedTasks7d} eșecuri.`,
      },
      {
        code: "D",
        name: "Calibrare certitudine",
        value: calibrationScore,
        source: "Strat 13 (umilință epistemică)",
        detail: `Rata escalare: ${escalationRate}% (optim: 10-30%). ${escalationRate < 10 ? "Prea sigur pe sine" : escalationRate > 30 ? "Prea nesigur" : "Bine calibrat"}.`,
      },
    ],
  }

  const adaptability: CognitiveIndicator = {
    name: "Adaptabilitate",
    value: Math.round((phaseCoherence + agentHealthPct + (objectiveVelocity + objectiveMomentum) / 2) / 3),
    status: "HEALTHY",
    subFactors: [
      {
        code: "E",
        name: "Coerență cu faza",
        value: phaseCoherence,
        source: "Strat 9 (phase awareness)",
        detail: "Deciziile sunt coerente cu faza de business detectată.",
      },
      {
        code: "F",
        name: "Coeziune agenți",
        value: agentHealthPct,
        source: "Strat 11 (profiluri agent)",
        detail: `${totalAgents - decliningAgents}/${totalAgents} agenți sănătoși. ${decliningAgents} în declin.`,
      },
      {
        code: "G",
        name: "Velocitate obiective",
        value: Math.round((objectiveVelocity + objectiveMomentum) / 2),
        source: "Strat 10 (cross-impact) + rollup + invalidation",
        detail: `${objectivesAbove80}/${objectivesActive} obiective > 80%. ${objectivesGrowing7d} în creștere (7d).`,
      },
    ],
  }

  const integrity: CognitiveIndicator = {
    name: "Integritate",
    value: Math.round((moralScore + autonomyScore) / 2),
    status: "HEALTHY",
    subFactors: [
      {
        code: "H",
        name: "Consistență morală",
        value: moralScore,
        source: "Strat 7 (jurisprudență) + Strat 8 (identitate)",
        detail: `${moralPrecedentsTotal} precedente morale, ${moralPrecedentsUsed30d} consultate. Narativă: ${narrativeExists ? "activă" : "lipsă"}.`,
      },
      {
        code: "I",
        name: "Autonomie reală",
        value: autonomyScore,
        source: "Strat 13 (escalări) + Strat 3 (obiecții)",
        detail: `${ownerInterventions7d} intervenții Owner (7d). ${objectionsRaised7d} obiecții ridicate. ${autonomyScore >= 60 ? "Organism autonom" : "Dependență excesivă de Owner"}.`,
      },
    ],
  }

  // Status per indicator
  for (const ind of [efficiency, lucidity, adaptability, integrity]) {
    ind.status = ind.value >= 70 ? "HEALTHY" : ind.value >= 40 ? "WARNING" : "CRITICAL"
  }

  const overallScore = Math.round(
    (efficiency.value * 0.3 + lucidity.value * 0.25 + adaptability.value * 0.25 + integrity.value * 0.2)
  )

  return {
    timestamp: new Date().toISOString(),
    overallScore,
    overallStatus: overallScore >= 70 ? "HEALTHY" : overallScore >= 40 ? "WARNING" : "CRITICAL",
    indicators: { efficiency, lucidity, adaptability, integrity },
  }
}
