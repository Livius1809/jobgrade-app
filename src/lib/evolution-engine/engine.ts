/**
 * engine.ts — EvolutionEngine — nucleul fractal al platformei JobGrade
 *
 * Același mecanism, 4 contexte: OWNER → INTERNAL → B2B → B2C
 *
 * Ciclul fractal în 7 pași:
 *   1. CONȘTIENTIZARE STARE CURENTĂ  — "Unde sunt acum?"
 *   2. DIAGNOSTIC DEZALINIERE         — "Ce nu e aliniat?"
 *   3. PLAN EVOLUTIV                  — "Ce pot face?"
 *   4. ACȚIUNE                        — "Fac."
 *   5. MONITORIZARE EFECTE            — "Ce s-a schimbat?"
 *   6. CONȘTIENTIZARE STARE NOUĂ     — "Cine sunt acum?"
 *   7. REFORMULARE → PLAN v2         — "Văd mai clar → ciclu superior"
 *
 * Proprietatea fractalului: pasul 6 revelează dezalinieri invizibile
 * la nivelul anterior. Pasul 7 rescrie planul la nivel superior.
 * Spirala urcă. Asta e masterpiece-ul.
 *
 * Owner este client zero — engine-ul rulează ÎNTÂI pe el.
 */

import { cpuCall } from "@/lib/cpu/gateway"
import type {
  EvolutionContext,
  EvolutionCycle,
  StateSnapshot,
  Misalignment,
  EvolutionPlan,
  PlannedAction,
  EffectMeasurement,
  ContextConfig,
  DimensionScore,
  DataSourceResult,
} from "./types"
import { maturityFromScore } from "./types"

const MODEL = "claude-sonnet-4-20250514"

// ── Utilitar trend ─────────────────────────────────────────────────────────

function trend(current: number, previous: number): "up" | "down" | "stable" {
  const delta = current - previous
  if (delta > 3) return "up"
  if (delta < -3) return "down"
  return "stable"
}

// ── PAS 1: Conștientizare stare curentă ────────────────────────────────────

async function buildAwareness(
  config: ContextConfig,
  subjectId: string,
  periodStart: Date,
  periodEnd: Date,
  prevStart: Date,
  prevEnd: Date,
  prisma: any
): Promise<{ snapshot: StateSnapshot; rawData: DataSourceResult }> {
  // Colectare date din surse specifice contextului
  const data = await config.collectData(subjectId, periodStart, periodEnd, prevStart, prevEnd, prisma)

  // Calcul dimensiuni cu funcția specifică contextului
  const dimensions = config.calculateDimensions(data, config.dimensions)

  // Scor compozit ponderat
  const compositeScore = Math.round(
    dimensions.reduce((sum, d) => sum + d.score * d.weight, 0)
  )

  const snapshot: StateSnapshot = {
    subjectId,
    context: config.context,
    capturedAt: new Date().toISOString(),
    compositeScore,
    dimensions,
    maturityLevel: maturityFromScore(compositeScore),
    metadata: { rawMetrics: data.metrics },
  }

  return { snapshot, rawData: data }
}

// ── PAS 2: Diagnostic dezaliniere ──────────────────────────────────────────

function diagnose(
  snapshot: StateSnapshot,
  previousSnapshot: StateSnapshot | null,
  config: ContextConfig
): Misalignment[] {
  const gaps: Misalignment[] = []

  for (const dim of snapshot.dimensions) {
    // Gap pe scor absolut
    if (dim.score < config.thresholds.critical) {
      gaps.push({
        dimensionCode: dim.code,
        severity: "CRITICAL",
        description: `${dim.name}: ${dim.score}/100 — sub pragul critic (${config.thresholds.critical})`,
        revealedBy: previousSnapshot
          ? `Ciclul anterior: ${previousSnapshot.dimensions.find(d => d.code === dim.code)?.score || "?"}/100`
          : "Prima măsurare",
      })
    } else if (dim.score < config.thresholds.high) {
      gaps.push({
        dimensionCode: dim.code,
        severity: "HIGH",
        description: `${dim.name}: ${dim.score}/100 — sub pragul ridicat (${config.thresholds.high})`,
      })
    } else if (dim.score < config.thresholds.medium) {
      gaps.push({
        dimensionCode: dim.code,
        severity: "MEDIUM",
        description: `${dim.name}: ${dim.score}/100 — zonă de atenție`,
      })
    }

    // Gap pe trend descendent (nou față de ciclul anterior)
    if (previousSnapshot && dim.trend === "down") {
      const prevDim = previousSnapshot.dimensions.find(d => d.code === dim.code)
      if (prevDim && prevDim.trend !== "down") {
        // Dezaliniere NOUĂ — invizibilă la ciclul anterior
        gaps.push({
          dimensionCode: dim.code,
          severity: "MEDIUM",
          description: `${dim.name}: trend descendent NOU (era ${prevDim.trend}, acum ↓)`,
          revealedBy: "Schimbare de trend — invizibilă la ciclul anterior",
        })
      }
    }
  }

  // Sortează: CRITICAL > HIGH > MEDIUM > LOW
  const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
  gaps.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  return gaps
}

// ── PAS 3: Plan evolutiv ───────────────────────────────────────────────────

function buildPlan(
  diagnosis: Misalignment[],
  snapshot: StateSnapshot,
  config: ContextConfig,
  cycleNumber: number
): EvolutionPlan {
  const actions = config.generateActions(diagnosis, snapshot, config.context)

  // Generează jaloane din acțiuni HIGH+CRITICAL
  const milestones = diagnosis
    .filter(g => g.severity === "CRITICAL" || g.severity === "HIGH")
    .map(g => {
      const dim = snapshot.dimensions.find(d => d.code === g.dimensionCode)
      return {
        title: dim ? `${dim.name} peste ${config.thresholds.medium}` : `Rezolvă ${g.dimensionCode}`,
        dimensionCode: g.dimensionCode,
        targetScore: config.thresholds.medium,
        reached: false,
      }
    })

  return {
    version: cycleNumber,
    cycleNumber,
    actions,
    milestones,
    createdAt: new Date().toISOString(),
  }
}

// ── PAS 5: Monitorizare efecte ─────────────────────────────────────────────

function measureEffects(
  plan: EvolutionPlan,
  previousSnapshot: StateSnapshot | null,
  currentSnapshot: StateSnapshot
): EffectMeasurement {
  const actionsCompleted = plan.actions.filter(a => a.status === "COMPLETED").length
  const milestonesReached = plan.milestones.filter(m => m.reached).length

  const dimensionDeltas = currentSnapshot.dimensions.map(dim => {
    const prev = previousSnapshot?.dimensions.find(d => d.code === dim.code)
    return {
      dimensionCode: dim.code,
      previousScore: prev?.score || 0,
      currentScore: dim.score,
      delta: dim.score - (prev?.score || 0),
    }
  })

  const qualitativeInsights: string[] = []
  const improvements = dimensionDeltas.filter(d => d.delta > 5)
  const regressions = dimensionDeltas.filter(d => d.delta < -5)

  if (improvements.length > 0) {
    qualitativeInsights.push(
      `Progres pe: ${improvements.map(d => `${d.dimensionCode} (+${d.delta})`).join(", ")}`
    )
  }
  if (regressions.length > 0) {
    qualitativeInsights.push(
      `Regresie pe: ${regressions.map(d => `${d.dimensionCode} (${d.delta})`).join(", ")}`
    )
  }
  if (improvements.length === 0 && regressions.length === 0) {
    qualitativeInsights.push("Stabil — fără schimbări semnificative")
  }

  return {
    actionsCompleted,
    actionsTotal: plan.actions.length,
    milestonesReached,
    milestonesTotal: plan.milestones.length,
    dimensionDeltas,
    qualitativeInsights,
  }
}

// ── PAS 7: Reformulare plan ────────────────────────────────────────────────
// Cheia fractalului: conștientizarea stării noi revelează dezalinieri
// invizibile la nivelul anterior. Planul se rescrie la nivel superior.

function reformulatePlan(
  previousPlan: EvolutionPlan,
  newDiagnosis: Misalignment[],
  newSnapshot: StateSnapshot,
  config: ContextConfig,
  newCycleNumber: number
): EvolutionPlan {
  // Acțiuni necompletate din planul vechi — se rescriu la nivel superior
  const carriedOver = previousPlan.actions
    .filter(a => a.status !== "COMPLETED" && a.status !== "SKIPPED")
    .map(a => ({
      ...a,
      description: `[Continuat din ciclul ${previousPlan.cycleNumber}] ${a.description}`,
      priority: a.priority === "MEDIUM" ? "HIGH" as const : a.priority, // escaladează prioritatea
    }))

  // Acțiuni NOI din dezalinieri recent revelate
  const newActions = config.generateActions(
    newDiagnosis.filter(g =>
      // Doar dezalinierile REVELATE de ciclul nou (invizibile înainte)
      g.revealedBy != null
    ),
    newSnapshot,
    config.context
  )

  // Combine: carried over + new revelations
  const allActions = [...carriedOver, ...newActions]

  // Jaloane actualizate
  const milestones = newDiagnosis
    .filter(g => g.severity === "CRITICAL" || g.severity === "HIGH")
    .map(g => {
      const dim = newSnapshot.dimensions.find(d => d.code === g.dimensionCode)
      return {
        title: dim ? `${dim.name} peste ${config.thresholds.medium}` : `Rezolvă ${g.dimensionCode}`,
        dimensionCode: g.dimensionCode,
        targetScore: config.thresholds.medium,
        reached: (dim?.score || 0) >= config.thresholds.medium,
        reachedAt: (dim?.score || 0) >= config.thresholds.medium ? new Date().toISOString() : undefined,
      }
    })

  return {
    version: newCycleNumber,
    cycleNumber: newCycleNumber,
    actions: allActions,
    milestones,
    createdAt: new Date().toISOString(),
  }
}

// ── SUMAR NARATIV (Claude generează) ───────────────────────────────────────

async function generateNarrative(
  cycle: EvolutionCycle,
  config: ContextConfig
): Promise<string> {
  try {
    const contextInstructions: Record<EvolutionContext, string> = {
      OWNER: `Ești consilierul intern al fondatorului JobGrade. Ton: prieten înțelept, nu auditor.
Nu felicita gratuit — observă cu onestitate. Nu critica — invită la reflecție.
NU menționa scoruri numerice — vorbește despre esență.`,
      INTERNAL: `Ești COG și redactezi sumarul evoluției unui agent AI. Ton profesional, concis.
Menționează progresul real și preocupările concrete.`,
      B2B: `Ești consilierul de business al companiei client. Ton: partener strategic, nu furnizor.
Limbaj business adaptat la rol (HR Director=specialist, CEO=viziune, CFO=numere).
NU menționa metodologii interne, scale, sau jargon tehnic.`,
      B2C: `Ești călăuza care reflectă traseul clientului. Ton: cald, simplu, uman.
ZERO jargon. ZERO scoruri. ZERO metodologii.
Clientul trebuie să simtă că e văzut, nu evaluat.
Vorbește despre ce a descoperit, nu despre ce a performat.`,
    }

    const dims = cycle.newAwareness?.dimensions || cycle.awareness?.dimensions || []
    const topDim = dims.reduce((best, d) => d.score > best.score ? d : best, dims[0])
    const lowDim = dims.reduce((worst, d) => d.score < worst.score ? d : worst, dims[0])
    const gaps = cycle.diagnosis?.length || 0
    const score = cycle.newAwareness?.compositeScore || cycle.awareness?.compositeScore || 0

    const cpuResult = await cpuCall({
      model: MODEL,
      max_tokens: 400,
      system: "",
      messages: [{
        role: "user",
        content: `${contextInstructions[config.context]}

Ciclul #${cycle.cycleNumber}. Scor: ${score}/100. Nivel: ${cycle.newAwareness?.maturityLevel || cycle.awareness?.maturityLevel}.
Punct forte: ${topDim?.name} (${topDim?.score}/100).
De lucrat: ${lowDim?.name} (${lowDim?.score}/100).
Dezalinieri: ${gaps}. ${cycle.diagnosis?.filter(g => g.revealedBy).length || 0} revelate de acest ciclu.

Scrie maxim 4 propoziții în română cu diacritice. Fiecare propoziție să aibă greutate.`,
      }],
      agentRole: "EVOLUTION_ENGINE",
      operationType: "narrative-generation",
    })

    return cpuResult.text
  } catch {
    return `Ciclul #${cycle.cycleNumber} completat. Scor: ${cycle.awareness?.compositeScore || 0}/100.`
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EVOLUTION ENGINE — funcția principală
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Rulează un ciclu complet al Evolution Engine.
 *
 * @param config - Configurația contextului (OWNER/INTERNAL/B2B/B2C)
 * @param subjectId - Cine e evaluat (agentRole | tenantId | b2cUserId | "owner")
 * @param previousCycle - Ciclul anterior (null pentru primul ciclu)
 * @param prisma - Instanță Prisma
 * @returns Ciclul complet cu toate cele 7 pași
 */
export async function runEvolutionCycle(
  config: ContextConfig,
  subjectId: string,
  previousCycle: EvolutionCycle | null,
  prisma: any
): Promise<EvolutionCycle> {
  const now = new Date()
  const periodEnd = now
  const periodStart = new Date(now.getTime() - config.cycleDays * 24 * 60 * 60 * 1000)
  const prevEnd = periodStart
  const prevStart = new Date(prevEnd.getTime() - config.cycleDays * 24 * 60 * 60 * 1000)

  const cycleNumber = (previousCycle?.cycleNumber || 0) + 1

  const cycle: EvolutionCycle = {
    cycleNumber,
    context: config.context,
    subjectId,
    currentStep: "AWARENESS",
    stepTimestamps: {},
    startedAt: now.toISOString(),
  }

  // ── PAS 1: Conștientizare stare curentă ──────────────────────────────
  cycle.stepTimestamps.AWARENESS = new Date().toISOString()
  const { snapshot: awareness } = await buildAwareness(
    config, subjectId, periodStart, periodEnd, prevStart, prevEnd, prisma
  )
  cycle.awareness = awareness
  cycle.currentStep = "DIAGNOSIS"

  // ── PAS 2: Diagnostic dezaliniere ────────────────────────────────────
  cycle.stepTimestamps.DIAGNOSIS = new Date().toISOString()
  const previousSnapshot = previousCycle?.newAwareness || previousCycle?.awareness || null
  cycle.diagnosis = diagnose(awareness, previousSnapshot, config)
  cycle.currentStep = "PLAN"

  // ── PAS 3: Plan evolutiv ─────────────────────────────────────────────
  cycle.stepTimestamps.PLAN = new Date().toISOString()
  if (previousCycle?.reformulatedPlan) {
    // Există plan reformulat din ciclul anterior — îl folosim ca bază
    cycle.plan = previousCycle.reformulatedPlan
  } else {
    cycle.plan = buildPlan(cycle.diagnosis, awareness, config, cycleNumber)
  }
  cycle.currentStep = "ACTION"

  // ── PAS 4: Acțiune ───────────────────────────────────────────────────
  // Acțiunile se execută ÎNTRE cicluri (de agenți, de client, de Owner).
  // Engine-ul nu execută — planifică și monitorizează.
  cycle.stepTimestamps.ACTION = new Date().toISOString()
  cycle.actionsExecuted = cycle.plan.actions
    .filter(a => a.status === "COMPLETED")
    .map(a => a.description)
  cycle.currentStep = "MONITORING"

  // ── PAS 5: Monitorizare efecte ───────────────────────────────────────
  cycle.stepTimestamps.MONITORING = new Date().toISOString()
  if (previousCycle?.plan) {
    cycle.monitoring = measureEffects(previousCycle.plan, previousSnapshot, awareness)
  }
  cycle.currentStep = "NEW_AWARENESS"

  // ── PAS 6: Conștientizare stare nouă ────────────────────────────────
  // Aceeași funcție ca pasul 1, dar DUPĂ ce am trecut prin diagnostic+plan.
  // Starea e identică numeric — dar CONTEXTUL e diferit:
  // acum VEDEM ce nu vedeam înainte.
  cycle.stepTimestamps.NEW_AWARENESS = new Date().toISOString()
  cycle.newAwareness = {
    ...awareness,
    capturedAt: new Date().toISOString(),
    metadata: {
      ...awareness.metadata,
      gapsRevealed: cycle.diagnosis.filter(g => g.revealedBy).length,
      previousCycleScore: previousSnapshot?.compositeScore,
      deltaFromPrevious: previousSnapshot
        ? awareness.compositeScore - previousSnapshot.compositeScore
        : null,
    },
  }
  cycle.currentStep = "REFORMULATION"

  // ── PAS 7: Reformulare → plan v2 ────────────────────────────────────
  // CHEIA FRACTALULUI: planul se rescrie la nivel superior.
  // Dezalinierile revelate de pasul 6 devin inputul ciclului următor.
  cycle.stepTimestamps.REFORMULATION = new Date().toISOString()

  // Rediagnosticăm cu noua conștientizare (vedem mai mult acum)
  const newDiagnosis = diagnose(cycle.newAwareness, awareness, config)

  cycle.reformulatedPlan = reformulatePlan(
    cycle.plan,
    newDiagnosis,
    cycle.newAwareness,
    config,
    cycleNumber + 1
  )

  // ── SUMAR NARATIV ────────────────────────────────────────────────────
  cycle.narrativeSummary = await generateNarrative(cycle, config)
  cycle.completedAt = new Date().toISOString()

  return cycle
}

// ── Funcție helper: obține ciclul anterior din DB ──────────────────────────

export async function getLastCycle(
  context: EvolutionContext,
  subjectId: string,
  prisma: any
): Promise<EvolutionCycle | null> {
  try {
    const p = prisma as any
    const entry = await p.kBEntry.findFirst({
      where: {
        agentRole: "EVOLUTION_ENGINE",
        tags: {
          hasEvery: ["evolution-cycle", context.toLowerCase(), subjectId],
        },
        status: "PERMANENT",
      },
      orderBy: { createdAt: "desc" },
    })

    if (!entry) return null
    return JSON.parse(entry.content) as EvolutionCycle
  } catch {
    return null
  }
}

// ── Funcție helper: salvează ciclul în DB ──────────────────────────────────

export async function saveCycle(
  cycle: EvolutionCycle,
  prisma: any
): Promise<void> {
  const p = prisma as any
  await p.kBEntry.create({
    data: {
      agentRole: "EVOLUTION_ENGINE",
      kbType: "PERMANENT",
      content: JSON.stringify(cycle),
      source: "DISTILLED_INTERACTION",
      confidence: 1.0,
      status: "PERMANENT",
      tags: [
        "evolution-cycle",
        cycle.context.toLowerCase(),
        cycle.subjectId,
        `cycle-${cycle.cycleNumber}`,
        `maturity-${cycle.newAwareness?.maturityLevel || cycle.awareness?.maturityLevel || "SEED"}`,
      ],
    },
  })
}
