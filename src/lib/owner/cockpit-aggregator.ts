/**
 * Owner Cockpit Aggregator — funcție pură care produce starea completă a organismului.
 *
 * Livrat: 06.04.2026, Owner Dashboard v2.
 *
 * Produce:
 *  A) Status per strat (8 straturi × {HEALTHY, WARNING, CRITICAL} + sub-factori)
 *  B) Decizii cu lanțuri cauzale (situație → roluri → fluxuri → obiective)
 *
 * Principii:
 *  - FUNCȚIE PURĂ — zero I/O, zero side-effects
 *  - Reutilizează aggregateSituations() din situation-aggregator
 *  - Pre-loaded data: 0 query-uri suplimentare, totul in-memory
 */

import {
  aggregateSituations,
  summarizeSituations,
  type EventInput,
  type Situation,
} from "@/lib/disfunctions/situation-aggregator"

// ── Tipuri publice ────────────────────────────────────────────────────────────

export type LayerHealth = "HEALTHY" | "WARNING" | "CRITICAL"

export interface SubFactor {
  name: string
  value: string | number
  status: LayerHealth
  detail?: string
}

export interface Alarm {
  message: string
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
}

export interface LayerStatus {
  key: string
  label: string
  status: LayerHealth
  subFactors: SubFactor[]
  alarmCount: number
  alarms: Alarm[]
}

export interface CausalityFlux {
  fluxId: string
  totalSteps: number
  criticalSteps: number
}

export interface CausalityObjective {
  code: string
  title: string
  priority: string
  riskLevel: string
  healthScore: number | null
}

export interface EscalationPath {
  role: string
  chain: string[] // [parent, grandparent, ...]
}

export interface DecisionOption {
  label: string
  description: string
  risk: "LOW" | "MEDIUM" | "HIGH"
}

export interface DecisionItem {
  situationId: string
  title: string
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
  classification: string
  cause: string
  actionRequired: string
  options: DecisionOption[]
  affectedRoles: string[]
  affectedFluxes: CausalityFlux[]
  impactedObjectives: CausalityObjective[]
  escalationPaths: EscalationPath[]
  firstSeenAt: string
  lastSeenAt: string
  eventCount: number
  /** Raw disfunction event IDs — needed by decide endpoint to mark them RESOLVED. */
  eventIds: string[]
}

export interface OwnerCockpitResult {
  generatedAt: string
  layers: {
    awareness: LayerStatus
    goals: LayerStatus
    action: LayerStatus
    homeostasis: LayerStatus
    immune: LayerStatus
    metabolism: LayerStatus
    evolution: LayerStatus
    rhythm: LayerStatus
  }
  // NEW 10.04.2026: Organism Pulse — vital signs meta-panel deasupra celor 8 straturi
  vitalSigns: {
    verdict: "ALIVE" | "WEAKENED" | "CRITICAL" | "UNKNOWN"
    summary: { pass: number; warn: number; fail: number; skip: number }
    runAt: string | null
    tests: Array<{
      name: string
      status: "PASS" | "WARN" | "FAIL" | "SKIP"
      notes?: string
      metrics?: Record<string, unknown>
    }>
  }
  decisions: DecisionItem[]
  situationsSummary: ReturnType<typeof summarizeSituations>
}

// ── Tipuri input (ce primește funcția din endpoint) ───────────────────────────

export interface CockpitInputs {
  // AWARENESS
  signalCount24h: number
  strategicThemes: { severity: string; confidence: string; title: string }[]
  // NEW 10.04.2026 — signal→task pipeline
  signalsProcessed24h?: number
  signalsPending?: number
  reactiveTasksCreated24h?: number

  // GOALS
  objectives: {
    code: string; title: string; priority: string; status: string
    ownerRoles: string[]; contributorRoles: string[]
    healthScore?: number | null; riskLevel?: string
  }[]

  // ACTION
  patches: { status: string; targetRole: string; createdAt: string | Date }[]
  // NEW 10.04.2026 — task executor
  tasksExecuted24h?: { completed: number; blocked: number; failed: number; assigned: number }
  proactiveCycles24h?: number
  selfTasksExecuted24h?: number

  // HOMEOSTASIS
  homeoEvaluations: { status: string; targetCode: string; targetName: string }[]

  // IMMUNE
  recentViolations: { severity: string; ruleCode: string }[]
  quarantinedCount: number

  // METABOLISM
  budgets: { agentRole: string; withinBudget: boolean; costUsedPct: number }[]
  lifecyclePhase: string
  // NEW 10.04.2026 — cron state + cost estimate
  executorCronEnabled?: boolean
  estimatedCost24hUsd?: number

  // EVOLUTION
  pruneCandidatesFlagged: number

  // RHYTHM
  outcomes: { serviceCode: string; currentValue: number | null; targetValue: number }[]
  overdueRituals: number
  unansweredWildCards: number
  measurementGaps: number
  // NEW 10.04.2026 — vital signs latest (10 teste + verdict overall)
  vitalSignsLatest?: {
    verdict: "ALIVE" | "WEAKENED" | "CRITICAL" | "UNKNOWN"
    pass: number
    warn: number
    fail: number
    skip: number
    runAt: string | null
    tests?: Array<{
      name: string
      status: "PASS" | "WARN" | "FAIL" | "SKIP"
      notes?: string
      metrics?: Record<string, unknown>
    }>
  }

  // CAUZALITATE
  disfunctionEvents: EventInput[]
  fluxStepRoles: { fluxId: string; stepId: string; roleCode: string; raci: string; isCritical: boolean }[]
  allObjectives: { code: string; title: string; priority: string; ownerRoles: string[]; contributorRoles: string[]; healthScore?: number | null; riskLevel?: string }[]
  agentRelationships: { childRole: string; parentRole: string }[]
}

// ── Layer health computation ─────────────────────────────────────────────────

function computeAwareness(inputs: CockpitInputs): LayerStatus {
  const {
    signalCount24h,
    strategicThemes,
    signalsPending = 0,
    reactiveTasksCreated24h = 0,
  } = inputs
  const criticalThemes = strategicThemes.filter(t => t.severity === "CRITICAL")
  const highThemes = strategicThemes.filter(t => t.severity === "HIGH" || t.confidence === "HIGH")
  const alarms: Alarm[] = []

  if (criticalThemes.length > 0) alarms.push({ message: `${criticalThemes.length} temă(e) CRITICAL`, severity: "CRITICAL" })
  if (signalCount24h === 0) alarms.push({ message: "Zero semnale externe în 24h", severity: "MEDIUM" })
  if (signalsPending > 50) alarms.push({ message: `${signalsPending} semnale neprocesate (backlog mare)`, severity: "HIGH" })
  else if (signalsPending > 10) alarms.push({ message: `${signalsPending} semnale neprocesate`, severity: "MEDIUM" })

  let status: LayerHealth = "HEALTHY"
  if (criticalThemes.length > 0 || signalsPending > 50) status = "CRITICAL"
  else if (highThemes.length > 0 || signalCount24h === 0 || signalsPending > 10) status = "WARNING"

  return {
    key: "awareness", label: "Conștiință", status,
    subFactors: [
      { name: "Semnale 24h", value: signalCount24h, status: signalCount24h > 0 ? "HEALTHY" : "WARNING" },
      { name: "Teme strategice", value: strategicThemes.length, status: criticalThemes.length > 0 ? "CRITICAL" : highThemes.length > 0 ? "WARNING" : "HEALTHY" },
      { name: "Semnale neprocesate", value: signalsPending, status: signalsPending > 50 ? "CRITICAL" : signalsPending > 10 ? "WARNING" : "HEALTHY" },
      { name: "Tasks reactive 24h", value: reactiveTasksCreated24h, status: "HEALTHY" },
    ],
    alarmCount: alarms.length, alarms,
  }
}

function computeGoals(inputs: CockpitInputs): LayerStatus {
  const { objectives } = inputs
  const active = objectives.filter(o => o.status !== "ARCHIVED" && o.status !== "SUSPENDED")
  const critical = active.filter(o => o.riskLevel === "CRITICAL")
  const high = active.filter(o => o.riskLevel === "HIGH")
  const met = active.filter(o => o.status === "MET")
  const alarms: Alarm[] = []

  for (const o of critical) alarms.push({ message: `${o.code}: risc CRITICAL`, severity: "CRITICAL" })
  for (const o of high) alarms.push({ message: `${o.code}: risc HIGH`, severity: "HIGH" })

  const avgHealth = active.length > 0
    ? Math.round(active.reduce((s, o) => s + (o.healthScore ?? 50), 0) / active.length)
    : 100

  let status: LayerHealth = "HEALTHY"
  if (critical.length > 0) status = "CRITICAL"
  else if (high.length > 0 || avgHealth < 60) status = "WARNING"

  return {
    key: "goals", label: "Obiective", status,
    subFactors: [
      { name: "Active", value: active.length, status: "HEALTHY" },
      { name: "Atinse", value: met.length, status: "HEALTHY" },
      { name: "Sănătate medie", value: `${avgHealth}%`, status: avgHealth >= 60 ? "HEALTHY" : "WARNING" },
    ],
    alarmCount: alarms.length, alarms,
  }
}

function computeAction(inputs: CockpitInputs): LayerStatus {
  const {
    patches,
    tasksExecuted24h = { completed: 0, blocked: 0, failed: 0, assigned: 0 },
    proactiveCycles24h = 0,
    selfTasksExecuted24h = 0,
  } = inputs
  const now = Date.now()
  const proposed = patches.filter(p => p.status === "PROPOSED")
  const active = patches.filter(p => p.status === "ACTIVE")
  const pending48h = proposed.filter(p => now - new Date(p.createdAt).getTime() > 48 * 3600000)
  const pending24h = proposed.filter(p => now - new Date(p.createdAt).getTime() > 24 * 3600000)
  const alarms: Alarm[] = []

  if (pending48h.length > 3) alarms.push({ message: `${pending48h.length} patch-uri pending >48h`, severity: "HIGH" })
  else if (pending24h.length > 0) alarms.push({ message: `${pending24h.length} patch-uri pending >24h`, severity: "MEDIUM" })

  // Task executor health
  const totalExecuted = tasksExecuted24h.completed + tasksExecuted24h.blocked + tasksExecuted24h.failed
  const successRate = totalExecuted > 0 ? Math.round((tasksExecuted24h.completed / totalExecuted) * 100) : null
  if (tasksExecuted24h.failed > 5) alarms.push({ message: `${tasksExecuted24h.failed} taskuri eșuate 24h`, severity: "HIGH" })
  if (tasksExecuted24h.assigned > 50 && totalExecuted < 5) alarms.push({ message: `${tasksExecuted24h.assigned} taskuri neexecutate (executor inactiv?)`, severity: "HIGH" })

  let status: LayerHealth = "HEALTHY"
  if (pending48h.length > 3 || tasksExecuted24h.failed > 5) status = "CRITICAL"
  else if (pending24h.length > 0 || (totalExecuted > 0 && successRate !== null && successRate < 70)) status = "WARNING"

  return {
    key: "action", label: "Acțiune", status,
    subFactors: [
      { name: "Tasks executate 24h", value: `${tasksExecuted24h.completed}/${totalExecuted || "—"}`, status: successRate !== null && successRate < 70 ? "WARNING" : "HEALTHY" },
      { name: "Self-tasks 24h", value: selfTasksExecuted24h, status: "HEALTHY" },
      { name: "Cicluri proactive", value: proactiveCycles24h, status: proactiveCycles24h > 0 ? "HEALTHY" : "WARNING" },
      { name: "Patch-uri propuse", value: proposed.length, status: pending24h.length > 0 ? "WARNING" : "HEALTHY" },
    ],
    alarmCount: alarms.length, alarms,
  }
}

function computeHomeostasis(inputs: CockpitInputs): LayerStatus {
  const { homeoEvaluations } = inputs
  const critical = homeoEvaluations.filter(e => e.status === "CRITICAL")
  const warning = homeoEvaluations.filter(e => e.status === "WARNING")
  const optimal = homeoEvaluations.filter(e => e.status === "OPTIMAL" || e.status === "NORMAL")
  const alarms: Alarm[] = []

  for (const e of critical) alarms.push({ message: `${e.targetCode}: CRITICAL`, severity: "CRITICAL" })
  for (const e of warning) alarms.push({ message: `${e.targetCode}: WARNING`, severity: "MEDIUM" })

  let status: LayerHealth = "HEALTHY"
  if (critical.length > 0) status = "CRITICAL"
  else if (warning.length > 0) status = "WARNING"

  return {
    key: "homeostasis", label: "Homeostazie", status,
    subFactors: [
      { name: "Targets", value: homeoEvaluations.length, status: "HEALTHY" },
      { name: "Optime", value: optimal.length, status: "HEALTHY" },
      { name: "Devieri", value: critical.length + warning.length, status: critical.length > 0 ? "CRITICAL" : warning.length > 0 ? "WARNING" : "HEALTHY" },
    ],
    alarmCount: alarms.length, alarms,
  }
}

function computeImmune(inputs: CockpitInputs): LayerStatus {
  const { recentViolations, quarantinedCount } = inputs
  const critViolations = recentViolations.filter(v => v.severity === "CRITICAL")
  const highViolations = recentViolations.filter(v => v.severity === "HIGH")
  const alarms: Alarm[] = []

  if (critViolations.length > 0) alarms.push({ message: `${critViolations.length} violări CRITICAL`, severity: "CRITICAL" })
  if (quarantinedCount > 0) alarms.push({ message: `${quarantinedCount} item(e) în carantină`, severity: "MEDIUM" })

  let status: LayerHealth = "HEALTHY"
  if (critViolations.length > 0) status = "CRITICAL"
  else if (quarantinedCount > 0 || highViolations.length > 0) status = "WARNING"

  return {
    key: "immune", label: "Imunitate", status,
    subFactors: [
      { name: "Violări 24h", value: recentViolations.length, status: critViolations.length > 0 ? "CRITICAL" : recentViolations.length > 0 ? "WARNING" : "HEALTHY" },
      { name: "Carantină", value: quarantinedCount, status: quarantinedCount > 0 ? "WARNING" : "HEALTHY" },
    ],
    alarmCount: alarms.length, alarms,
  }
}

function computeMetabolism(inputs: CockpitInputs): LayerStatus {
  const {
    budgets,
    lifecyclePhase,
    executorCronEnabled = false,
    estimatedCost24hUsd = 0,
  } = inputs
  const overBudget = budgets.filter(b => !b.withinBudget)
  const overBudget120 = budgets.filter(b => b.costUsedPct > 120)
  const alarms: Alarm[] = []

  if (overBudget120.length > 0) alarms.push({ message: `${overBudget120.length} agent(i) >120% buget`, severity: "HIGH" })
  else if (overBudget.length > 0) alarms.push({ message: `${overBudget.length} agent(i) >100% buget`, severity: "MEDIUM" })
  if (estimatedCost24hUsd > 50) alarms.push({ message: `Cost 24h ~$${estimatedCost24hUsd.toFixed(2)} (peste $50)`, severity: "HIGH" })
  else if (estimatedCost24hUsd > 10) alarms.push({ message: `Cost 24h ~$${estimatedCost24hUsd.toFixed(2)}`, severity: "MEDIUM" })

  let status: LayerHealth = "HEALTHY"
  if (overBudget120.length > 0 || estimatedCost24hUsd > 50) status = "CRITICAL"
  else if (overBudget.length > 0 || estimatedCost24hUsd > 10) status = "WARNING"

  return {
    key: "metabolism", label: "Metabolism", status,
    subFactors: [
      { name: "Faza", value: lifecyclePhase, status: "HEALTHY" },
      { name: "Cron executor", value: executorCronEnabled ? "ON" : "OFF", status: executorCronEnabled ? "HEALTHY" : "HEALTHY" },
      { name: "Cost 24h", value: `$${estimatedCost24hUsd.toFixed(2)}`, status: estimatedCost24hUsd > 50 ? "CRITICAL" : estimatedCost24hUsd > 10 ? "WARNING" : "HEALTHY" },
      { name: "Bugete depășite", value: overBudget.length, status: overBudget.length > 0 ? "WARNING" : "HEALTHY" },
    ],
    alarmCount: alarms.length, alarms,
  }
}

function computeEvolution(inputs: CockpitInputs): LayerStatus {
  const { pruneCandidatesFlagged } = inputs
  const alarms: Alarm[] = []

  if (pruneCandidatesFlagged > 10) alarms.push({ message: `${pruneCandidatesFlagged} candidați de pruning`, severity: "HIGH" })
  else if (pruneCandidatesFlagged > 0) alarms.push({ message: `${pruneCandidatesFlagged} candidați de pruning`, severity: "MEDIUM" })

  let status: LayerHealth = "HEALTHY"
  if (pruneCandidatesFlagged > 10) status = "CRITICAL"
  else if (pruneCandidatesFlagged > 0) status = "WARNING"

  return {
    key: "evolution", label: "Evoluție", status,
    subFactors: [
      { name: "Pruning pending", value: pruneCandidatesFlagged, status: pruneCandidatesFlagged > 0 ? "WARNING" : "HEALTHY" },
    ],
    alarmCount: alarms.length, alarms,
  }
}

function computeRhythm(inputs: CockpitInputs): LayerStatus {
  const {
    outcomes,
    overdueRituals,
    unansweredWildCards,
    measurementGaps,
    vitalSignsLatest,
  } = inputs
  const measured = outcomes.filter(o => o.currentValue !== null)
  const onTarget = measured.filter(o => o.currentValue! >= o.targetValue)
  const offTarget = measured.length > 0 ? measured.length - onTarget.length : 0
  const offTargetPct = measured.length > 0 ? Math.round((offTarget / measured.length) * 100) : 0
  const alarms: Alarm[] = []

  if (offTargetPct > 50) alarms.push({ message: `${offTargetPct}% outcomes sub target`, severity: "HIGH" })
  if (overdueRituals > 2) alarms.push({ message: `${overdueRituals} ritualuri întârziate`, severity: "HIGH" })
  else if (overdueRituals > 0) alarms.push({ message: `${overdueRituals} ritual(uri) întârziat(e)`, severity: "MEDIUM" })
  if (measurementGaps > 0) alarms.push({ message: `${measurementGaps} outcomes fără date`, severity: "MEDIUM" })
  if (vitalSignsLatest?.verdict === "CRITICAL") alarms.push({ message: "Vital signs: CRITICAL", severity: "CRITICAL" })
  else if (vitalSignsLatest?.verdict === "WEAKENED") alarms.push({ message: "Vital signs: WEAKENED", severity: "MEDIUM" })

  let status: LayerHealth = "HEALTHY"
  if (offTargetPct > 50 || overdueRituals > 2 || vitalSignsLatest?.verdict === "CRITICAL") status = "CRITICAL"
  else if (overdueRituals > 0 || offTarget > 0 || measurementGaps > 0 || vitalSignsLatest?.verdict === "WEAKENED") status = "WARNING"

  const vitalLabel = vitalSignsLatest
    ? `${vitalSignsLatest.verdict} (${vitalSignsLatest.pass}P/${vitalSignsLatest.warn}W/${vitalSignsLatest.fail}F)`
    : "Nerulat"

  return {
    key: "rhythm", label: "Ritm", status,
    subFactors: [
      { name: "Vital signs", value: vitalLabel, status: vitalSignsLatest?.verdict === "CRITICAL" ? "CRITICAL" : vitalSignsLatest?.verdict === "WEAKENED" ? "WARNING" : vitalSignsLatest ? "HEALTHY" : "WARNING" },
      { name: "Outcomes măsurate", value: `${onTarget.length}/${outcomes.length}`, status: offTarget > 0 ? "WARNING" : "HEALTHY" },
      { name: "Ritualuri overdue", value: overdueRituals, status: overdueRituals > 0 ? "WARNING" : "HEALTHY" },
      { name: "Gaps date", value: measurementGaps, status: measurementGaps > 0 ? "WARNING" : "HEALTHY" },
    ],
    alarmCount: alarms.length, alarms,
  }
}

// ── Decision options generator ───────────────────────────────────────────────

function generateDecisionOptions(
  sit: Situation,
  roles: string[],
  fluxCount: number,
  objectiveCount: number,
): DecisionOption[] {
  const options: DecisionOption[] = []
  const signal = (sit as any).id ?? ""

  // Role cluster (multiple roles same signal)
  if (roles.length >= 3) {
    // Anti auto-referință: dacă COG e în lista celor afectați, nu poate investiga el însuși
    const cogAffected = roles.includes("COG")
    if (cogAffected) {
      options.push({
        label: "Escaladare directă la Owner",
        description: `${roles.length} roluri raportează același semnal, INCLUSIV COG. Auto-investigarea nu e posibilă — Owner trebuie să intervină manual sau să delege la o resursă externă.`,
        risk: "LOW",
      })
    } else {
      options.push({
        label: "Investighează cauza comună",
        description: `${roles.length} roluri raportează același semnal — probabil o dependență sistemică, nu probleme individuale. Deleghez investigația la COG.`,
        risk: "LOW",
      })
    }
    options.push({
      label: "Redistribuie temporar",
      description: `Redistribuie sarcinile rolurilor afectate (${roles.join(", ")}) la peers activi. Auto-revert în 24h.`,
      risk: "MEDIUM",
    })
  }

  // Single role idle/broken
  if (roles.length === 1) {
    options.push({
      label: `Reactivează ${roles[0]}`,
      description: `Forțează un ciclu de activare pe ${roles[0]}. Dacă problema persistă, escaladarea automată intervine.`,
      risk: "LOW",
    })
    options.push({
      label: `Pauză ${roles[0]}`,
      description: `Setează ${roles[0]} pe PAUSED_KNOWN_GAP. Sarcinile se redistribuie automat la peers.`,
      risk: "LOW",
    })
  }

  // If objectives are impacted
  if (objectiveCount > 3) {
    options.push({
      label: "Escaladare manuală la COG",
      description: `${objectiveCount} obiective afectate — impactul e prea mare pentru auto-remediere. COG coordonează un plan de recuperare.`,
      risk: "LOW",
    })
  }

  // If fluxes with critical steps
  if (fluxCount > 0) {
    options.push({
      label: "Acceptă risc (monitorizare)",
      description: `Situația afectează ${fluxCount} fluxuri dar nu blochează operațional. Monitorizez și intervin doar dacă se agravează.`,
      risk: "LOW",
    })
  }

  // Always offer dismiss
  options.push({
    label: "Închide — fals pozitiv",
    description: "Marchează situația ca fals pozitiv. Evenimentele se rezolvă, regula de detecție se ajustează.",
    risk: "LOW",
  })

  return options
}

// ── Causality chain builder ──────────────────────────────────────────────────

function buildCausalityChains(
  situations: Situation[],
  fluxStepRoles: CockpitInputs["fluxStepRoles"],
  objectives: CockpitInputs["allObjectives"],
  relationships: CockpitInputs["agentRelationships"],
): DecisionItem[] {
  const decisionSituations = situations.filter(s => s.classification === "DECISION_REQUIRED")

  // Index: roleCode → fluxStepRoles for that role
  const roleToFluxes = new Map<string, typeof fluxStepRoles>()
  for (const fsr of fluxStepRoles) {
    const existing = roleToFluxes.get(fsr.roleCode) ?? []
    existing.push(fsr)
    roleToFluxes.set(fsr.roleCode, existing)
  }

  // Index: childRole → parentRole (escalation)
  const escalationMap = new Map<string, string>()
  for (const rel of relationships) {
    escalationMap.set(rel.childRole, rel.parentRole)
  }

  function buildEscalationChain(role: string): string[] {
    const chain: string[] = []
    let current = role
    const seen = new Set<string>()
    while (escalationMap.has(current) && !seen.has(current)) {
      seen.add(current)
      current = escalationMap.get(current)!
      chain.push(current)
    }
    return chain
  }

  return decisionSituations.map(sit => {
    const roles = sit.scope.entities

    // Roles → Fluxes
    const fluxMap = new Map<string, { totalSteps: number; criticalSteps: number }>()
    for (const role of roles) {
      const fsrs = roleToFluxes.get(role) ?? []
      for (const fsr of fsrs) {
        const existing = fluxMap.get(fsr.fluxId) ?? { totalSteps: 0, criticalSteps: 0 }
        existing.totalSteps++
        if (fsr.isCritical) existing.criticalSteps++
        fluxMap.set(fsr.fluxId, existing)
      }
    }

    // Collect ALL roles involved in affected fluxes
    const allFluxRoles = new Set<string>(roles)
    for (const fluxId of fluxMap.keys()) {
      for (const fsr of fluxStepRoles) {
        if (fsr.fluxId === fluxId) allFluxRoles.add(fsr.roleCode)
      }
    }

    // Roles → Objectives (via ownerRoles + contributorRoles)
    const impactedObjectives: CausalityObjective[] = []
    const seenObj = new Set<string>()
    for (const role of allFluxRoles) {
      for (const obj of objectives) {
        if (seenObj.has(obj.code)) continue
        if (obj.ownerRoles.includes(role) || obj.contributorRoles.includes(role)) {
          seenObj.add(obj.code)
          impactedObjectives.push({
            code: obj.code,
            title: obj.title,
            priority: obj.priority,
            riskLevel: obj.riskLevel ?? "NONE",
            healthScore: obj.healthScore ?? null,
          })
        }
      }
    }

    // Escalation paths — per rol, nu flat set
    const escalationPaths: EscalationPath[] = roles.map(role => ({
      role,
      chain: buildEscalationChain(role),
    }))

    // Generate decision options based on situation type
    const options = generateDecisionOptions(sit, roles, fluxMap.size, impactedObjectives.length)

    return {
      situationId: sit.id,
      title: sit.title,
      severity: sit.severity,
      classification: sit.classification,
      cause: sit.cause,
      actionRequired: sit.actionRequired,
      options,
      affectedRoles: [...roles],
      affectedFluxes: Array.from(fluxMap.entries()).map(([fluxId, data]) => ({
        fluxId, totalSteps: data.totalSteps, criticalSteps: data.criticalSteps,
      })),
      impactedObjectives,
      escalationPaths,
      firstSeenAt: sit.firstSeenAt,
      lastSeenAt: sit.lastSeenAt,
      eventCount: sit.eventIds.length,
      eventIds: [...sit.eventIds],
    }
  })
}

// ── Funcția principală ───────────────────────────────────────────────────────

export function computeOwnerCockpit(inputs: CockpitInputs): OwnerCockpitResult {
  // 1. Compute layer statuses
  const layers = {
    awareness: computeAwareness(inputs),
    goals: computeGoals(inputs),
    action: computeAction(inputs),
    homeostasis: computeHomeostasis(inputs),
    immune: computeImmune(inputs),
    metabolism: computeMetabolism(inputs),
    evolution: computeEvolution(inputs),
    rhythm: computeRhythm(inputs),
  }

  // 2. Compute situations from disfunction events
  const situations = aggregateSituations(inputs.disfunctionEvents)
  const situationsSummary = summarizeSituations(situations)

  // 3. Build causality chains for DECISION_REQUIRED situations
  const decisions = buildCausalityChains(
    situations,
    inputs.fluxStepRoles,
    inputs.allObjectives,
    inputs.agentRelationships,
  )

  // 4. Vital Signs — meta-panel "Organism Pulse"
  const vs = inputs.vitalSignsLatest
  const vitalSigns: OwnerCockpitResult["vitalSigns"] = vs
    ? {
        verdict: vs.verdict,
        summary: { pass: vs.pass, warn: vs.warn, fail: vs.fail, skip: vs.skip },
        runAt: vs.runAt,
        tests: vs.tests || [],
      }
    : {
        verdict: "UNKNOWN",
        summary: { pass: 0, warn: 0, fail: 0, skip: 0 },
        runAt: null,
        tests: [],
      }

  return {
    generatedAt: new Date().toISOString(),
    layers,
    vitalSigns,
    decisions,
    situationsSummary,
  }
}
