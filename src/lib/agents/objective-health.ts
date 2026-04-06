/**
 * Objective Health Monitor — calculează sănătatea fiecărui obiectiv organizațional.
 *
 * Livrat: 06.04.2026, Increment A2 din "Living Organization" architecture.
 *
 * Consumă:
 *  - OrganizationalObjective (stare curentă: currentValue, targetValue, direction, deadline)
 *  - StrategicTheme[] (awareness layer — teme care pot afecta obiective prin tag match)
 *  - DisfunctionEvent[] (semnale de disfuncție pe rolurile ownerRoles/contributorRoles)
 *
 * Produce:
 *  - ObjectiveHealthReport per obiectiv: progress %, momentum, risk level, semnale legate
 *  - Recomandare status: dacă obiectivul ar trebui mutat la AT_RISK / MET / altfel
 *
 * Principii:
 *  - FUNCȚIE PURĂ — zero I/O, deterministă cu `config.now`
 *  - Progress calculat matematic din (currentValue, targetValue, direction)
 *  - Risk calculat din: progress + deadline proximity + semnale externe convergente
 *  - NU schimbă nimic automat — produce recomandare, Owner decide
 */

// ── Tipuri publice ────────────────────────────────────────────────────────────

export interface ObjectiveInput {
  id: string
  code: string
  title: string
  businessId: string
  metricName: string
  metricUnit?: string | null
  targetValue: number
  currentValue: number | null
  direction: "INCREASE" | "DECREASE" | "MAINTAIN" | "REACH"
  startDate: string | Date
  deadlineAt?: string | Date | null
  completedAt?: string | Date | null
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
  status: string
  ownerRoles: string[]
  contributorRoles: string[]
  tags: string[]
}

export interface RelatedSignal {
  type: "strategic_theme" | "disfunction"
  id: string
  title: string
  severity: string
  relevance: "direct" | "indirect" // direct = tag match; indirect = role overlap
}

export interface ObjectiveHealthReport {
  objectiveId: string
  objectiveCode: string
  objectiveTitle: string

  /** Progress ca % (0-100+). 100 = met, >100 = exceeding. null dacă currentValue lipsește. */
  progressPct: number | null

  /** Zile rămase până la deadline. null dacă e continuous. Negativ dacă e depășit. */
  daysRemaining: number | null

  /** Momentum estimat: ACCELERATING, ON_TRACK, STALLING, DECLINING, UNKNOWN */
  momentum: "ACCELERATING" | "ON_TRACK" | "STALLING" | "DECLINING" | "UNKNOWN"

  /** Risk level calculat din progress + deadline + semnale */
  riskLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "NONE"

  /** Status recomandat — ce ar trebui să fie statusul dacă am evalua acum */
  recommendedStatus: string

  /** De ce recomandăm ce recomandăm */
  rationale: string

  /** Semnale din awareness layer legate de acest obiectiv */
  relatedSignals: RelatedSignal[]

  /** Score compus 0-100 (health score — mai mare = mai sănătos) */
  healthScore: number
}

export interface StrategicThemeInput {
  id: string
  title: string
  confidence: string
  severity: string
  rule: string
  evidence: {
    emergentThemeTokens: string[]
    categoryBreakdown: Record<string, number>
  }
}

export interface DisfunctionInput {
  id: string
  status: string
  severity: string
  targetType: string
  targetId: string
  signal: string
}

export interface ObjectiveHealthInputs {
  objectives: ObjectiveInput[]
  strategicThemes: StrategicThemeInput[]
  disfunctions: DisfunctionInput[]
}

export interface ObjectiveHealthConfig {
  now?: Date
}

// ── Helper-i ──────────────────────────────────────────────────────────────────

function toDate(v: string | Date | null | undefined): Date | null {
  if (!v) return null
  return v instanceof Date ? v : new Date(v)
}

function daysBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000)
}

// ── Progress calculation ─────────────────────────────────────────────────────

function computeProgress(obj: ObjectiveInput): number | null {
  if (obj.currentValue === null || obj.currentValue === undefined) return null

  switch (obj.direction) {
    case "INCREASE":
    case "REACH":
      // 0 → target: progres liniar
      if (obj.targetValue === 0) return obj.currentValue >= 0 ? 100 : 0
      return Math.round((obj.currentValue / obj.targetValue) * 100 * 10) / 10

    case "DECREASE":
      // Invers: 100% = currentValue ≤ 0 sau la target
      // Presupunem start la un maxim implicit (dacă nu avem startValue, facem relative)
      if (obj.targetValue === 0) return obj.currentValue <= 0 ? 100 : 0
      // Scădere: dacă current e la 50% din target, progress e 50%
      // Dacă current e mai mare ca target, progress e negativ (sub zero)
      return Math.round(
        (1 - (obj.currentValue - obj.targetValue) / obj.targetValue) * 100 * 10,
      ) / 10

    case "MAINTAIN":
      // Bandă: 100% dacă e la target ± 10%, descrescător în rest
      const deviation = Math.abs(obj.currentValue - obj.targetValue)
      const tolerance = Math.abs(obj.targetValue) * 0.1
      if (deviation <= tolerance) return 100
      const overDeviation = deviation - tolerance
      const maxDeviation = Math.abs(obj.targetValue) * 0.5
      return Math.max(
        0,
        Math.round((1 - overDeviation / maxDeviation) * 100 * 10) / 10,
      )

    default:
      return null
  }
}

// ── Risk level calculation ───────────────────────────────────────────────────

function computeRisk(
  progress: number | null,
  daysRemaining: number | null,
  priority: string,
  relatedSignalCount: number,
): { riskLevel: ObjectiveHealthReport["riskLevel"]; healthScore: number } {
  let score = 100

  // Impactul progresului
  if (progress === null) {
    score -= 30 // nu avem nici o măsurătoare → risc moderat
  } else if (progress >= 100) {
    score += 10 // exceeding, bonus mic
  } else if (progress >= 80) {
    score -= 5 // on track
  } else if (progress >= 50) {
    score -= 20
  } else if (progress >= 20) {
    score -= 40
  } else {
    score -= 60 // aproape nimic realizat
  }

  // Impactul deadline-ului
  if (daysRemaining !== null) {
    if (daysRemaining < 0) {
      score -= 30 // deadline depășit
    } else if (daysRemaining < 7) {
      score -= 20 // sub o săptămână
    } else if (daysRemaining < 30) {
      score -= 10 // sub o lună
    }
    // Combinat: progres mic + deadline aproape = extra penalizare
    if (progress !== null && progress < 50 && daysRemaining < 30) {
      score -= 15
    }
  }

  // Impactul priority — CRITICAL obiectivele au tolerance mai mică
  if (priority === "CRITICAL") score -= 10
  else if (priority === "HIGH") score -= 5

  // Impactul semnalelor legate — disfuncții pe roluri relevante amplifică risc
  score -= Math.min(20, relatedSignalCount * 5)

  const healthScore = Math.max(0, Math.min(100, score))

  let riskLevel: ObjectiveHealthReport["riskLevel"]
  if (healthScore >= 80) riskLevel = "NONE"
  else if (healthScore >= 60) riskLevel = "LOW"
  else if (healthScore >= 40) riskLevel = "MEDIUM"
  else if (healthScore >= 20) riskLevel = "HIGH"
  else riskLevel = "CRITICAL"

  return { riskLevel, healthScore }
}

// ── Momentum estimation ──────────────────────────────────────────────────────

function estimateMomentum(
  progress: number | null,
  daysRemaining: number | null,
  daysElapsed: number,
): ObjectiveHealthReport["momentum"] {
  if (progress === null) return "UNKNOWN"
  if (progress >= 100) return "ON_TRACK"

  if (daysRemaining === null) {
    // Continuous objective — dacă progress e decent, e OK
    return progress >= 80 ? "ON_TRACK" : progress >= 50 ? "STALLING" : "DECLINING"
  }

  // Deadline-based: compară progresul cu timpul consumat
  const totalDays = daysElapsed + Math.max(0, daysRemaining)
  if (totalDays <= 0) return "UNKNOWN"
  const expectedProgress = (daysElapsed / totalDays) * 100
  const gap = progress - expectedProgress

  if (gap > 10) return "ACCELERATING"
  if (gap > -10) return "ON_TRACK"
  if (gap > -30) return "STALLING"
  return "DECLINING"
}

// ── Related signals ──────────────────────────────────────────────────────────

function findRelatedSignals(
  obj: ObjectiveInput,
  strategicThemes: StrategicThemeInput[],
  disfunctions: DisfunctionInput[],
): RelatedSignal[] {
  const signals: RelatedSignal[] = []
  const allRoles = new Set([...obj.ownerRoles, ...obj.contributorRoles])
  const tags = new Set(obj.tags.map((t) => t.toLowerCase()))

  // Strategic themes — match pe tag overlap
  for (const st of strategicThemes) {
    const tokenMatch = st.evidence.emergentThemeTokens.some((t) =>
      tags.has(t.toLowerCase()),
    )
    if (tokenMatch) {
      signals.push({
        type: "strategic_theme",
        id: st.id,
        title: st.title,
        severity: st.severity,
        relevance: "direct",
      })
    }
  }

  // Disfunctions — match pe roluri implicate (OPEN/ESCALATED pe owner/contributor roles)
  for (const d of disfunctions) {
    if (d.status !== "OPEN" && d.status !== "ESCALATED") continue
    if (d.targetType === "ROLE" && allRoles.has(d.targetId)) {
      signals.push({
        type: "disfunction",
        id: d.id,
        title: `${d.targetId}: ${d.signal} [${d.severity}]`,
        severity: d.severity,
        relevance: "direct",
      })
    }
  }

  return signals
}

// ── Status recommendation ────────────────────────────────────────────────────

function recommendStatus(
  obj: ObjectiveInput,
  progress: number | null,
  daysRemaining: number | null,
  riskLevel: string,
): { status: string; rationale: string } {
  // Nu recomandăm pe DRAFT / SUSPENDED / ARCHIVED
  if (["DRAFT", "SUSPENDED", "ARCHIVED"].includes(obj.status)) {
    return { status: obj.status, rationale: "Obiectivul nu e activ — păstrează statusul curent." }
  }

  // MET
  if (progress !== null && progress >= 100) {
    return {
      status: "MET",
      rationale: `Progress ${progress}% ≥ 100%. Obiectivul pare atins. Verifică manual și marchează oficial.`,
    }
  }

  // FAILED — deadline depășit + progress sub 80%
  if (daysRemaining !== null && daysRemaining < 0 && (progress === null || progress < 80)) {
    return {
      status: "FAILED",
      rationale: `Deadline depășit cu ${Math.abs(Math.round(daysRemaining))} zile și progress doar ${progress ?? "necunoscut"}%. Necesită decizie: replanificare sau închidere.`,
    }
  }

  // AT_RISK
  if (riskLevel === "CRITICAL" || riskLevel === "HIGH") {
    return {
      status: "AT_RISK",
      rationale: `Risk level ${riskLevel}. ${progress !== null ? `Progress: ${progress}%.` : "Progress necunoscut."} ${daysRemaining !== null ? `Zile rămase: ${Math.round(daysRemaining)}.` : "Obiectiv continuu."} Cere atenție imediată.`,
    }
  }

  // ACTIVE
  return {
    status: "ACTIVE",
    rationale: `Risk level ${riskLevel}. Obiectivul progresează normal.`,
  }
}

// ── Exportul principal ────────────────────────────────────────────────────────

export function computeObjectiveHealth(
  inputs: ObjectiveHealthInputs,
  config: ObjectiveHealthConfig = {},
): ObjectiveHealthReport[] {
  const now = config.now ?? new Date()
  const reports: ObjectiveHealthReport[] = []

  for (const obj of inputs.objectives) {
    const progress = computeProgress(obj)
    const startDate = toDate(obj.startDate) ?? now
    const deadlineAt = toDate(obj.deadlineAt)
    const daysRemaining = deadlineAt ? daysBetween(now, deadlineAt) : null
    const daysElapsed = daysBetween(startDate, now)

    const relatedSignals = findRelatedSignals(
      obj,
      inputs.strategicThemes,
      inputs.disfunctions,
    )

    const momentum = estimateMomentum(progress, daysRemaining, daysElapsed)
    const { riskLevel, healthScore } = computeRisk(
      progress,
      daysRemaining,
      obj.priority,
      relatedSignals.length,
    )
    const { status: recommendedStatus, rationale } = recommendStatus(
      obj,
      progress,
      daysRemaining,
      riskLevel,
    )

    reports.push({
      objectiveId: obj.id,
      objectiveCode: obj.code,
      objectiveTitle: obj.title,
      progressPct: progress,
      daysRemaining: daysRemaining !== null ? Math.round(daysRemaining * 10) / 10 : null,
      momentum,
      riskLevel,
      recommendedStatus,
      rationale,
      relatedSignals,
      healthScore,
    })
  }

  // Sortare: healthScore crescător (cele mai bolnave primele)
  reports.sort((a, b) => a.healthScore - b.healthScore)

  return reports
}

/**
 * Sumar rapid pentru cockpit.
 */
export function summarizeHealth(reports: ObjectiveHealthReport[]): {
  total: number
  critical: number
  atRisk: number
  onTrack: number
  avgHealthScore: number
  worstObjective: ObjectiveHealthReport | null
} {
  if (reports.length === 0) {
    return { total: 0, critical: 0, atRisk: 0, onTrack: 0, avgHealthScore: 0, worstObjective: null }
  }
  const critical = reports.filter((r) => r.riskLevel === "CRITICAL").length
  const atRisk = reports.filter(
    (r) => r.riskLevel === "HIGH" || r.riskLevel === "MEDIUM",
  ).length
  const onTrack = reports.filter(
    (r) => r.riskLevel === "LOW" || r.riskLevel === "NONE",
  ).length
  const avgHealthScore =
    Math.round(
      (reports.reduce((s, r) => s + r.healthScore, 0) / reports.length) * 10,
    ) / 10

  return {
    total: reports.length,
    critical,
    atRisk,
    onTrack,
    avgHealthScore,
    worstObjective: reports[0],
  }
}
