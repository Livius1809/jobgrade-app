/**
 * cognitive-layers-advanced.ts — Straturi Cognitive 8-13
 *
 * Al doilea val: nu mai e despre gândirea individuală (straturi 1-7)
 * ci despre EXISTENȚA ÎN CONTEXT — identitate, timp, relații, consecințe, umilință.
 *
 *  8.  Identitate narativă — "Cine sunt eu?"
 *  9.  Simțul timpului — "Unde sunt în povestea mea?"
 *  10. Cross-impact eșec — "Ce m-a format?"
 *  11. Profil comportamental per agent — "Ce simte celălalt?"
 *  12. Impact simulator — "Dacă fac asta, ce altceva se mișcă?"
 *  13. Umilința epistemică — "Poate nu știu ce nu știu"
 *
 * Cost total: 1 apel Haiku/lună (strat 8), restul 0 apeluri Claude.
 */

import { prisma } from "@/lib/prisma"

// ══════════════════════════════════════════════════════════════════════════════
// STRAT 8: IDENTITATE NARATIVĂ — "Cine sunt eu?"
// ══════════════════════════════════════════════════════════════════════════════
//
// Autobiografie operațională: nu misiune/viziune (declarative) ci
// "ce am făcut, ce am refuzat, ce m-a costat, ce m-a definit".
// Document viu de ~500 cuvinte, rescris lunar, injectat în decizii strategice.
//
// Stocat ca SystemConfig key "ORGANISM_NARRATIVE_IDENTITY"
// Cost: 1 apel Haiku/lună (la regenerare)

const NARRATIVE_KEY = "ORGANISM_NARRATIVE_IDENTITY"
const NARRATIVE_META_KEY = "ORGANISM_NARRATIVE_META"

export interface NarrativeIdentity {
  narrative: string        // textul autobiografiei (~500 cuvinte)
  generatedAt: string      // ISO date
  dataPoints: {
    totalTasksCompleted: number
    totalTasksFailed: number
    totalKBEntries: number
    moralPrecedents: number
    topAgentsByOutput: string[]
    biggestFailure: string | null
    biggestSuccess: string | null
    defineningDecisions: string[]
  }
}

/**
 * Generează sau returnează narativa curentă.
 * Regenerare: doar dacă > 30 zile de la ultima sau nu există.
 */
export async function getOrGenerateNarrative(): Promise<NarrativeIdentity | null> {
  const existing = await prisma.systemConfig.findUnique({ where: { key: NARRATIVE_KEY } })

  if (existing) {
    try {
      const parsed = JSON.parse(existing.value) as NarrativeIdentity
      const age = Date.now() - new Date(parsed.generatedAt).getTime()
      if (age < 30 * 24 * 3600000) return parsed // < 30 zile — valid
    } catch {}
  }

  // Regenerare necesară — colectăm datele
  return await generateNarrativeFromData()
}

async function generateNarrativeFromData(): Promise<NarrativeIdentity> {
  const [
    tasksCompleted, tasksFailed, kbTotal,
    moralPrecedents, topAgents,
    biggestFailures, recentSuccesses,
  ] = await Promise.all([
    prisma.agentTask.count({ where: { status: "COMPLETED" } }),
    prisma.agentTask.count({ where: { status: "FAILED" } }),
    prisma.kBEntry.count({ where: { status: "PERMANENT" } }),
    prisma.kBEntry.count({ where: { tags: { has: "moral-precedent" } } }),
    prisma.executionTelemetry.groupBy({
      by: ["agentRole"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    }),
    prisma.agentTask.findMany({
      where: { status: "FAILED", failureReason: { not: null } },
      select: { title: true, failureReason: true, assignedTo: true },
      orderBy: { failedAt: "desc" },
      take: 3,
    }),
    prisma.agentTask.findMany({
      where: { status: "COMPLETED", result: { not: null } },
      select: { title: true, assignedTo: true },
      orderBy: { completedAt: "desc" },
      take: 5,
    }),
  ])

  // Decizii definitorii — KB entries cu tag-uri de decizie
  const decisions = await prisma.kBEntry.findMany({
    where: {
      status: "PERMANENT",
      tags: { hasSome: ["decizie", "decision", "refuzat", "moral-precedent"] },
    },
    select: { content: true },
    take: 5,
    orderBy: { confidence: "desc" },
  })

  const topAgentNames = topAgents.map(a => a.agentRole)
  const biggestFailure = biggestFailures[0]
    ? `${biggestFailures[0].title} (${biggestFailures[0].assignedTo}): ${biggestFailures[0].failureReason?.slice(0, 100)}`
    : null

  // Construim narativa din date (fără Claude — template bazat pe date)
  const successRate = tasksCompleted + tasksFailed > 0
    ? Math.round((tasksCompleted / (tasksCompleted + tasksFailed)) * 100) : 100

  const narrative = [
    `Suntem un organism cu ${kbTotal} cunoștințe acumulate și ${tasksCompleted} acțiuni finalizate.`,
    `Rata noastră de succes e ${successRate}% — ${tasksFailed > 0 ? `am eșuat de ${tasksFailed} ori și fiecare eșec ne-a învățat ceva` : "nu am eșuat încă, ceea ce ne face precauți"}.`,
    topAgentNames.length > 0 ? `Cei mai activi membri: ${topAgentNames.join(", ")}. Ei definesc ritmul.` : "",
    biggestFailure ? `Cel mai mare eșec recent: ${biggestFailure}. Nu l-am uitat.` : "",
    moralPrecedents > 0 ? `Avem ${moralPrecedents} precedente morale — situații în care am ales principiul în locul eficienței.` : "",
    decisions.length > 0 ? `Decizii care ne-au definit: ${decisions.map(d => d.content.slice(0, 80)).join("; ")}.` : "",
    `Nu suntem perfecți. Suntem un organism care învață. Fiecare ciclu ne face puțin mai buni decât cel anterior.`,
  ].filter(Boolean).join("\n\n")

  const identity: NarrativeIdentity = {
    narrative,
    generatedAt: new Date().toISOString(),
    dataPoints: {
      totalTasksCompleted: tasksCompleted,
      totalTasksFailed: tasksFailed,
      totalKBEntries: kbTotal,
      moralPrecedents,
      topAgentsByOutput: topAgentNames,
      biggestFailure,
      biggestSuccess: recentSuccesses[0]?.title || null,
      defineningDecisions: decisions.map(d => d.content.slice(0, 100)),
    },
  }

  // Salvăm
  await prisma.systemConfig.upsert({
    where: { key: NARRATIVE_KEY },
    update: { value: JSON.stringify(identity) },
    create: { key: NARRATIVE_KEY, value: JSON.stringify(identity) },
  })

  return identity
}


// ══════════════════════════════════════════════════════════════════════════════
// STRAT 9: SIMȚUL TIMPULUI — "Unde sunt în povestea mea?"
// ══════════════════════════════════════════════════════════════════════════════
//
// Detectează faza business-ului și ajustează CRITERIILE de decizie, nu doar viteza.
// Pre-lansare: toleranță la imperfecțiune, viteză maximă
// Lansare: calitate > viteză, focus pe primii clienți
// Scalare: eficiență > funcționalitate
//
// Cost: 0 apeluri Claude

export type BusinessPhase = "PRE_LAUNCH" | "LAUNCH" | "TRACTION" | "SCALE"

export interface PhaseAwareness {
  currentPhase: BusinessPhase
  confidence: number // 0-100
  signals: string[]
  decisionModifiers: {
    qualityThreshold: number    // 0-100 cât de perfecte trebuie să fie rezultatele
    speedPriority: number       // 0-100 cât de importantă e viteza
    riskTolerance: number       // 0-100 cât risc tolerăm
    experimentBudget: number    // 0-100 cât alocăm experimentelor
    clientFocusPct: number      // 0-100 cât din atenție e pe clienți vs. produs
  }
}

export async function detectBusinessPhase(): Promise<PhaseAwareness> {
  const [
    tenantCount, totalRevenue, completedSessions,
    paidTenants, firstPayment, daysActive,
  ] = await Promise.all([
    prisma.tenant.count(),
    prisma.creditTransaction.aggregate({
      where: { type: "PURCHASE" },
      _sum: { amount: true },
    }).catch(() => ({ _sum: { amount: 0 } })),
    prisma.evaluationSession.count({ where: { status: "COMPLETED" } }),
    prisma.servicePurchase.count().catch(() => 0),
    prisma.creditTransaction.findFirst({
      where: { type: "PURCHASE" },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }).catch(() => null),
    prisma.tenant.findFirst({
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
  ])

  const revenue = Number(totalRevenue._sum?.amount || 0)
  const signals: string[] = []
  let phase: BusinessPhase
  let confidence: number

  if (paidTenants === 0 && revenue === 0) {
    phase = "PRE_LAUNCH"
    confidence = 95
    signals.push("0 clienți plătitori", "0 venituri", "Organism în construcție")
  } else if (paidTenants <= 5 && revenue < 10000) {
    phase = "LAUNCH"
    confidence = 85
    signals.push(`${paidTenants} clienți plătitori`, `${revenue} RON venituri`, "Primii clienți")
  } else if (paidTenants <= 50) {
    phase = "TRACTION"
    confidence = 80
    signals.push(`${paidTenants} clienți`, `${revenue} RON`, "Tracțiune confirmată")
  } else {
    phase = "SCALE"
    confidence = 75
    signals.push(`${paidTenants} clienți`, "Scalare activă")
  }

  // Decision modifiers per fază
  const modifiers: Record<BusinessPhase, PhaseAwareness["decisionModifiers"]> = {
    PRE_LAUNCH: {
      qualityThreshold: 60,   // acceptăm imperfecțiune
      speedPriority: 90,      // viteză maximă
      riskTolerance: 80,      // toleranță mare la risc
      experimentBudget: 70,   // mult buget pentru experimente
      clientFocusPct: 20,     // focus pe produs, nu pe clienți (încă nu sunt)
    },
    LAUNCH: {
      qualityThreshold: 80,   // calitate importantă
      speedPriority: 60,      // echilibru
      riskTolerance: 50,      // prudență moderată
      experimentBudget: 40,   // mai puține experimente
      clientFocusPct: 70,     // primii clienți sunt critici
    },
    TRACTION: {
      qualityThreshold: 85,   // calitate ridicată
      speedPriority: 50,      // nu mai e urgență
      riskTolerance: 35,      // conservator
      experimentBudget: 25,   // focalizat
      clientFocusPct: 80,     // clienții dictează
    },
    SCALE: {
      qualityThreshold: 90,   // excelență
      speedPriority: 40,      // eficiență > viteză
      riskTolerance: 20,      // risc minim
      experimentBudget: 15,   // doar A/B testat
      clientFocusPct: 60,     // echilibru produs/clienți
    },
  }

  return {
    currentPhase: phase,
    confidence,
    signals,
    decisionModifiers: modifiers[phase],
  }
}


// ══════════════════════════════════════════════════════════════════════════════
// STRAT 10: CROSS-IMPACT EȘEC — "Ce m-a format?"
// ══════════════════════════════════════════════════════════════════════════════
//
// Eșecul într-un domeniu modifică temporar pragul de risc în TOATE domeniile.
// Efectul scade exponențial în timp (half-life: 7 zile).
//
// Cost: 0 apeluri Claude

export interface FailureImpact {
  globalRiskAdjustment: number  // -100 (ultra-precaut) la 0 (neutru)
  activeTraumas: Array<{
    domain: string
    originalFailure: string
    daysAgo: number
    currentImpact: number // 0-100, scade cu timpul
  }>
  recommendation: string
}

export async function calculateFailureImpact(): Promise<FailureImpact> {
  const recentFailures = await prisma.agentTask.findMany({
    where: {
      status: "FAILED",
      failedAt: { gte: new Date(Date.now() - 30 * 24 * 3600000) },
      failureReason: { not: null },
    },
    select: {
      assignedTo: true, title: true, failureReason: true, failedAt: true,
      priority: true, tags: true,
    },
    orderBy: { failedAt: "desc" },
    take: 20,
  })

  const traumas: FailureImpact["activeTraumas"] = []
  let totalImpact = 0

  for (const f of recentFailures) {
    const daysAgo = Math.round((Date.now() - new Date(f.failedAt!).getTime()) / 86400000)
    // Decay exponențial: half-life 7 zile
    const decay = Math.pow(0.5, daysAgo / 7)
    // Severitate: CRITICAL = 100, HIGH = 60, MEDIUM = 30, LOW = 10
    const baseSeverity = f.priority === "CRITICAL" ? 100 : f.priority === "HIGH" ? 60 : 30
    const currentImpact = Math.round(baseSeverity * decay)

    if (currentImpact >= 5) {
      traumas.push({
        domain: f.assignedTo,
        originalFailure: `${f.title}: ${f.failureReason?.slice(0, 80)}`,
        daysAgo,
        currentImpact,
      })
      totalImpact += currentImpact
    }
  }

  // Global adjustment: suma impactului (capped la -80)
  const globalRiskAdjustment = -Math.min(Math.round(totalImpact / 3), 80)

  let recommendation: string
  if (globalRiskAdjustment <= -50) {
    recommendation = "Traumă activă puternică — organism în mod defensiv. Doar taskuri sigure."
  } else if (globalRiskAdjustment <= -20) {
    recommendation = "Eșecuri recente au crescut prudența. Calitate > viteză."
  } else {
    recommendation = "Nicio traumă semnificativă — organism în mod normal."
  }

  return { globalRiskAdjustment, activeTraumas: traumas, recommendation }
}


// ══════════════════════════════════════════════════════════════════════════════
// STRAT 11: PROFIL COMPORTAMENTAL PER AGENT — "Ce simte celălalt?"
// ══════════════════════════════════════════════════════════════════════════════
//
// Model mental al fiecărui agent bazat pe patterns de execuție.
// Detectează schimbări de tipar = semnal că ceva s-a schimbat.
//
// Cost: 0 apeluri Claude

export interface AgentBehaviorProfile {
  agentRole: string
  metrics: {
    avgCompletionRate: number     // % taskuri completate vs total
    avgResponseTime: number      // ore medii de la ASSIGNED la COMPLETED
    refusalRate: number           // % BLOCKED/FAILED din total
    preferredTaskTypes: string[]  // top 3 tipuri acceptate
    avoidedTaskTypes: string[]   // tipuri cu refuz frecvent
  }
  trend: "STABLE" | "IMPROVING" | "DECLINING" | "ERRATIC"
  anomaly: string | null          // schimbare de tipar detectată
}

export async function buildAgentProfiles(): Promise<AgentBehaviorProfile[]> {
  const agents = await prisma.agentRelationship.findMany({
    where: { isActive: true },
    select: { childRole: true },
    distinct: ["childRole"],
  })

  const profiles: AgentBehaviorProfile[] = []
  const h30d = new Date(Date.now() - 30 * 24 * 3600000)
  const h7d = new Date(Date.now() - 7 * 24 * 3600000)

  for (const agent of agents) {
    const role = agent.childRole

    const [completed, failed, blocked, total, completedRecent, totalRecent] = await Promise.all([
      prisma.agentTask.count({ where: { assignedTo: role, status: "COMPLETED" } }),
      prisma.agentTask.count({ where: { assignedTo: role, status: "FAILED" } }),
      prisma.agentTask.count({ where: { assignedTo: role, status: "BLOCKED" } }),
      prisma.agentTask.count({ where: { assignedTo: role } }),
      prisma.agentTask.count({ where: { assignedTo: role, status: "COMPLETED", completedAt: { gte: h7d } } }),
      prisma.agentTask.count({ where: { assignedTo: role, updatedAt: { gte: h7d } } }),
    ])

    if (total === 0) continue

    const completionRate = Math.round((completed / total) * 100)
    const refusalRate = Math.round(((failed + blocked) / total) * 100)
    const recentRate = totalRecent > 0 ? Math.round((completedRecent / totalRecent) * 100) : 0

    // Trend: comparăm rata recentă (7d) cu rata generală
    let trend: AgentBehaviorProfile["trend"]
    if (totalRecent < 3) {
      trend = "STABLE" // insuficiente date recente
    } else if (recentRate > completionRate + 15) {
      trend = "IMPROVING"
    } else if (recentRate < completionRate - 15) {
      trend = "DECLINING"
    } else {
      trend = "STABLE"
    }

    // Anomalie: schimbare bruscă
    let anomaly: string | null = null
    if (trend === "DECLINING" && completionRate > 50) {
      anomaly = `${role} era la ${completionRate}% completion dar recent a scăzut la ${recentRate}%`
    }
    if (refusalRate > 40) {
      anomaly = `${role} refuză/blochează ${refusalRate}% din taskuri — posibil rol mal-configurat`
    }

    // Task types (simplificat: din tags)
    const completedTasks = await prisma.agentTask.findMany({
      where: { assignedTo: role, status: "COMPLETED" },
      select: { taskType: true },
      take: 50,
      orderBy: { completedAt: "desc" },
    })
    const typeCounts = new Map<string, number>()
    for (const t of completedTasks) {
      typeCounts.set(t.taskType, (typeCounts.get(t.taskType) || 0) + 1)
    }
    const sortedTypes = [...typeCounts.entries()].sort((a, b) => b[1] - a[1])

    const failedTasks = await prisma.agentTask.findMany({
      where: { assignedTo: role, status: { in: ["FAILED", "BLOCKED"] } },
      select: { taskType: true },
      take: 20,
    })
    const failedTypes = new Map<string, number>()
    for (const t of failedTasks) {
      failedTypes.set(t.taskType, (failedTypes.get(t.taskType) || 0) + 1)
    }
    const avoidedTypes = [...failedTypes.entries()]
      .filter(([type]) => !sortedTypes.slice(0, 3).some(([t]) => t === type))
      .sort((a, b) => b[1] - a[1])

    profiles.push({
      agentRole: role,
      metrics: {
        avgCompletionRate: completionRate,
        avgResponseTime: 0, // TODO: calculat din timestamps
        refusalRate,
        preferredTaskTypes: sortedTypes.slice(0, 3).map(([t]) => t),
        avoidedTaskTypes: avoidedTypes.slice(0, 2).map(([t]) => t),
      },
      trend,
      anomaly,
    })
  }

  return profiles
}


// ══════════════════════════════════════════════════════════════════════════════
// STRAT 12: IMPACT SIMULATOR — "Dacă fac asta, ce altceva se mișcă?"
// ══════════════════════════════════════════════════════════════════════════════
//
// Matrice de interdependențe între obiective strategice.
// La fiecare task CRITICAL, verifică: completarea crește A dar scade B?
//
// Cost: 0 apeluri Claude

export interface ImpactAssessment {
  directObjective: string | null
  positiveEffects: Array<{ objective: string; magnitude: "LOW" | "MEDIUM" | "HIGH" }>
  negativeEffects: Array<{ objective: string; risk: string; magnitude: "LOW" | "MEDIUM" | "HIGH" }>
  netAssessment: "PROCEED" | "CAUTION" | "ESCALATE"
}

// Matrice interdependențe (hardcoded — reflectă realitatea proiectului)
const OBJECTIVE_INTERDEPENDENCIES: Record<string, Record<string, { effect: "POSITIVE" | "NEGATIVE" | "NEUTRAL"; reason: string }>> = {
  PLATFORMA_QUALITY: {
    OPERATIONAL_READINESS: { effect: "POSITIVE", reason: "Platformă stabilă → operațiuni fiabile" },
    LEGAL_COMPLIANCE: { effect: "POSITIVE", reason: "Cod calitativ → conformitate mai ușoară" },
    B2C_MVP: { effect: "POSITIVE", reason: "Baza tehnică solidă → B2C pe fundament stabil" },
    MARKETING_READY: { effect: "NEUTRAL", reason: "Calitatea internă nu afectează direct marketingul" },
  },
  MARKETING_READY: {
    OPERATIONAL_READINESS: { effect: "NEGATIVE", reason: "Marketing agresiv fără operațiuni = dezamăgire" },
    B2C_MVP: { effect: "POSITIVE", reason: "Vizibilitate crescută → mai mulți early adopters B2C" },
    PLATFORMA_QUALITY: { effect: "NEUTRAL", reason: "" },
    LEGAL_COMPLIANCE: { effect: "NEUTRAL", reason: "" },
  },
  OPERATIONAL_READINESS: {
    MARKETING_READY: { effect: "POSITIVE", reason: "Operațiuni gata → marketing poate promite cu încredere" },
    B2C_MVP: { effect: "POSITIVE", reason: "Suport client funcțional → B2C viabil" },
    PLATFORMA_QUALITY: { effect: "NEUTRAL", reason: "" },
    LEGAL_COMPLIANCE: { effect: "POSITIVE", reason: "Procese operaționale → audit trail pentru conformitate" },
  },
  LEGAL_COMPLIANCE: {
    MARKETING_READY: { effect: "POSITIVE", reason: "Conformitate = argument de vânzare" },
    OPERATIONAL_READINESS: { effect: "NEUTRAL", reason: "" },
    B2C_MVP: { effect: "NEUTRAL", reason: "" },
    PLATFORMA_QUALITY: { effect: "NEUTRAL", reason: "" },
  },
  B2C_MVP: {
    MARKETING_READY: { effect: "NEGATIVE", reason: "Focus B2C deviază resurse de la marketing B2B" },
    OPERATIONAL_READINESS: { effect: "NEGATIVE", reason: "B2C adaugă complexitate operațională" },
    PLATFORMA_QUALITY: { effect: "NEGATIVE", reason: "Cod B2C rapid poate degrada calitatea" },
    LEGAL_COMPLIANCE: { effect: "NEGATIVE", reason: "GDPR B2C = efort suplimentar" },
  },
}

export async function assessTaskImpact(taskId: string): Promise<ImpactAssessment> {
  const task = await prisma.agentTask.findUnique({
    where: { id: taskId },
    select: { objectiveId: true, priority: true },
  })

  if (!task?.objectiveId) {
    return { directObjective: null, positiveEffects: [], negativeEffects: [], netAssessment: "PROCEED" }
  }

  const objective = await prisma.organizationalObjective.findUnique({
    where: { id: task.objectiveId },
    select: { code: true, parentObjectiveId: true },
  })

  if (!objective) {
    return { directObjective: null, positiveEffects: [], negativeEffects: [], netAssessment: "PROCEED" }
  }

  // Găsim obiectivul strategic (root)
  let strategicCode = objective.code.split("--")[0]

  const deps = OBJECTIVE_INTERDEPENDENCIES[strategicCode]
  if (!deps) {
    return { directObjective: strategicCode, positiveEffects: [], negativeEffects: [], netAssessment: "PROCEED" }
  }

  const positiveEffects: ImpactAssessment["positiveEffects"] = []
  const negativeEffects: ImpactAssessment["negativeEffects"] = []

  for (const [target, dep] of Object.entries(deps)) {
    if (dep.effect === "POSITIVE") {
      positiveEffects.push({ objective: target, magnitude: "MEDIUM" })
    } else if (dep.effect === "NEGATIVE") {
      negativeEffects.push({ objective: target, risk: dep.reason, magnitude: "MEDIUM" })
    }
  }

  let netAssessment: ImpactAssessment["netAssessment"] = "PROCEED"
  if (negativeEffects.length > positiveEffects.length && task.priority !== "CRITICAL") {
    netAssessment = "CAUTION"
  }
  if (negativeEffects.length >= 3) {
    netAssessment = "ESCALATE"
  }

  return { directObjective: strategicCode, positiveEffects, negativeEffects, netAssessment }
}


// ══════════════════════════════════════════════════════════════════════════════
// STRAT 13: UMILINȚA EPISTEMICĂ — "Poate nu știu ce nu știu"
// ══════════════════════════════════════════════════════════════════════════════
//
// Scor de certitudine per decizie. Deciziile cu incertitudine mare
// sunt luate conservator sau escalate la Owner.
//
// Cost: 0 apeluri Claude

export interface CertaintyAssessment {
  score: number          // 0-100 (0 = nu știu nimic, 100 = certitudine totală)
  factors: Array<{ name: string; contribution: number; detail: string }>
  recommendation: "EXECUTE_CONFIDENTLY" | "EXECUTE_CAUTIOUSLY" | "SEEK_CONFIRMATION" | "ESCALATE_TO_OWNER"
}

export async function assessCertainty(taskId: string): Promise<CertaintyAssessment> {
  const task = await prisma.agentTask.findUnique({
    where: { id: taskId },
    select: {
      id: true, assignedTo: true, title: true, description: true,
      objectiveId: true, taskType: true, tags: true,
    },
  })

  if (!task) return { score: 50, factors: [], recommendation: "EXECUTE_CAUTIOUSLY" }

  const factors: CertaintyAssessment["factors"] = []
  let score = 50 // baseline

  // 1. KB coverage: are agentul cunoștințe pe domeniu?
  const kbCount = await prisma.kBEntry.count({
    where: { agentRole: task.assignedTo, status: "PERMANENT" },
  })
  if (kbCount >= 50) {
    score += 15
    factors.push({ name: "KB coverage", contribution: 15, detail: `${kbCount} entries — cunoștințe solide` })
  } else if (kbCount >= 10) {
    score += 8
    factors.push({ name: "KB coverage", contribution: 8, detail: `${kbCount} entries — cunoștințe moderate` })
  } else {
    score -= 15
    factors.push({ name: "KB coverage", contribution: -15, detail: `Doar ${kbCount} entries — cunoștințe insuficiente` })
  }

  // 2. Precedent: a mai executat taskuri similare cu succes?
  const similarCompleted = await prisma.agentTask.count({
    where: {
      assignedTo: task.assignedTo,
      taskType: task.taskType,
      status: "COMPLETED",
    },
  })
  if (similarCompleted >= 10) {
    score += 15
    factors.push({ name: "Precedent", contribution: 15, detail: `${similarCompleted} taskuri similare completate` })
  } else if (similarCompleted >= 3) {
    score += 8
    factors.push({ name: "Precedent", contribution: 8, detail: `${similarCompleted} precedente` })
  } else {
    score -= 10
    factors.push({ name: "Precedent", contribution: -10, detail: `Doar ${similarCompleted} precedente — teritoriu nou` })
  }

  // 3. Claritate obiectiv: există obiectiv legat cu titlu clar?
  if (task.objectiveId) {
    const obj = await prisma.organizationalObjective.findUnique({
      where: { id: task.objectiveId },
      select: { title: true, currentValue: true },
    })
    if (obj?.title && obj.title.length > 20) {
      score += 10
      factors.push({ name: "Claritate obiectiv", contribution: 10, detail: `Obiectiv clar: "${obj.title.slice(0, 50)}"` })
    }
  } else {
    score -= 10
    factors.push({ name: "Fără obiectiv", contribution: -10, detail: "Task fără obiectiv — direcție neclară" })
  }

  // 4. Eșecuri anterioare pe același tip de task
  const similarFailed = await prisma.agentTask.count({
    where: {
      assignedTo: task.assignedTo,
      taskType: task.taskType,
      status: "FAILED",
    },
  })
  if (similarFailed >= 3) {
    score -= 20
    factors.push({ name: "Istoric eșecuri", contribution: -20, detail: `${similarFailed} eșecuri pe taskuri similare — risc ridicat` })
  }

  // Cap 0-100
  score = Math.max(0, Math.min(100, score))

  // Recomandare
  let recommendation: CertaintyAssessment["recommendation"]
  if (score >= 75) recommendation = "EXECUTE_CONFIDENTLY"
  else if (score >= 50) recommendation = "EXECUTE_CAUTIOUSLY"
  else if (score >= 30) recommendation = "SEEK_CONFIRMATION"
  else recommendation = "ESCALATE_TO_OWNER"

  return { score, factors, recommendation }
}


// ══════════════════════════════════════════════════════════════════════════════
// INTEGRATOR: Rulează straturile avansate la fiecare ciclu cron
// ══════════════════════════════════════════════════════════════════════════════

export interface AdvancedCognitiveCycleResult {
  phase: PhaseAwareness
  failureImpact: FailureImpact
  agentProfiles: number // count
  agentAnomalies: string[]
  narrativeAge: number | null // zile de la ultima generare
}

export async function runAdvancedCognitiveLayers(): Promise<AdvancedCognitiveCycleResult> {
  // Strat 9: Detectează faza business
  const phase = await detectBusinessPhase()

  // Strat 10: Calculează impactul eșecurilor
  const failureImpact = await calculateFailureImpact()

  // Strat 11: Construiește profiluri agent (doar zilnic — costisitor ca queries)
  const now = new Date()
  let profiles: AgentBehaviorProfile[] = []
  let agentAnomalies: string[] = []
  if (now.getHours() === 6) { // doar la 6 dimineața
    profiles = await buildAgentProfiles()
    agentAnomalies = profiles
      .filter(p => p.anomaly)
      .map(p => p.anomaly!)
  }

  // Strat 8: Verifică dacă narativa trebuie regenerată
  const narrative = await getOrGenerateNarrative()
  const narrativeAge = narrative
    ? Math.round((Date.now() - new Date(narrative.generatedAt).getTime()) / 86400000)
    : null

  // Strat 12 și 13: se aplică per-task în executor (nu aici)

  return {
    phase,
    failureImpact,
    agentProfiles: profiles.length,
    agentAnomalies,
    narrativeAge,
  }
}
