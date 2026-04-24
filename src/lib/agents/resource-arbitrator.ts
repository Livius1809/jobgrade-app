/**
 * resource-arbitrator.ts — Arbitru de resurse: deliberare, compromis, calibrare
 *
 * PRINCIPIU: Organismul nu aplică un tabel fix (80/20). Deliberează între
 * cereri concurente (extern vs intern), face un compromis, observă efectul,
 * și se calibrează la următorul ciclu. Cu timpul, dezvoltă simțul compromisului.
 *
 * Cereri concurente:
 *   EXTERN: taskuri client, semnale piață, deadline-uri legale, marketing
 *   INTERN: agenți în declin, KB goale, anomalii, obiective stagnante, maintenance
 *
 * Constrângeri:
 *   Budget Claude, batch size (heartbeat), faza business, sănătate cognitivă
 *
 * Feedback loop:
 *   După fiecare ciclu → s-a degradat sănătatea? → ajustare compromis viitor
 *   Stocat: SystemConfig "ARBITRATOR_HISTORY" — ultimele 50 compromisuri + efecte
 */

import { prisma } from "@/lib/prisma"

// ── Tipuri ───────────────────────────────────────────────────

export interface CompetingDemand {
  source: "EXTERNAL" | "INTERNAL"
  category: string         // ex: "client-task", "agent-health", "legal-deadline"
  urgency: number          // 0-100
  impact: number           // 0-100
  count: number            // câte taskuri/cereri
}

export interface Compromise {
  externalPct: number      // 0-100
  internalPct: number      // 0-100 (= 100 - externalPct)
  externalSlots: number    // câte sloturi din batch
  internalSlots: number
  reasoning: string        // de ce acest raport
  confidence: number       // 0-100 cât de sigur e pe decizie
}

export interface CompromiseOutcome {
  timestamp: string
  compromise: Compromise
  effect: {
    healthBefore: number   // cognitive health score înainte
    healthAfter: number    // cognitive health score după
    healthDelta: number    // diferența
    externalCompleted: number
    internalCompleted: number
    externalFailed: number
    internalFailed: number
  }
  wasGoodDecision: boolean // health nu a scăzut sub prag ȘI extern a progresat
}

export interface ArbitratorState {
  lastUpdated: string
  currentBias: number          // -50 (bias intern) la +50 (bias extern), 0 = neutru
  consecutiveHealthDrops: number  // câte cicluri la rând a scăzut sănătatea
  history: CompromiseOutcome[]    // max 50 compromisuri recente
  learnedPatterns: {
    optimalExternalPct: number   // media raportului care a funcționat
    riskThreshold: number        // sub ce health score nu mai sacrific intern
    recoverySpeed: number        // câte cicluri durează recuperarea
  }
}

const ARBITRATOR_KEY = "ARBITRATOR_STATE"

// ── Persistare ───────────────────────────────────────────────

async function loadState(): Promise<ArbitratorState> {
  const config = await prisma.systemConfig.findUnique({
    where: { key: ARBITRATOR_KEY },
  }).catch(() => null)

  if (config) {
    try { return JSON.parse(config.value) } catch {}
  }

  return {
    lastUpdated: new Date().toISOString(),
    currentBias: 0,
    consecutiveHealthDrops: 0,
    history: [],
    learnedPatterns: {
      optimalExternalPct: 65,  // baseline conservator
      riskThreshold: 45,       // sub 45 health → mod intern
      recoverySpeed: 3,        // 3 cicluri pentru recuperare
    },
  }
}

async function saveState(state: ArbitratorState): Promise<void> {
  state.lastUpdated = new Date().toISOString()
  await prisma.systemConfig.upsert({
    where: { key: ARBITRATOR_KEY },
    update: { value: JSON.stringify(state) },
    create: { key: ARBITRATOR_KEY, value: JSON.stringify(state) },
  })
}

// ── Colectare cereri concurente ──────────────────────────────

async function collectDemands(): Promise<CompetingDemand[]> {
  const h24 = new Date(Date.now() - 24 * 3600000)
  const demands: CompetingDemand[] = []

  // EXTERN: taskuri orientate client
  const clientTags = ["client", "marketing", "onboarding", "b2b", "sales", "portal", "content"]
  const externalTasks = await prisma.agentTask.count({
    where: { status: "ASSIGNED", tags: { hasSome: clientTags } },
  })
  if (externalTasks > 0) {
    demands.push({
      source: "EXTERNAL", category: "client-tasks",
      urgency: Math.min(90, 40 + externalTasks * 5), impact: 80, count: externalTasks,
    })
  }

  // EXTERN: semnale externe neprocesate
  const pendingSignals = await prisma.externalSignal.count({
    where: { processedAt: null },
  }).catch(() => 0)
  if (pendingSignals > 0) {
    demands.push({
      source: "EXTERNAL", category: "market-signals",
      urgency: 60, impact: 50, count: pendingSignals,
    })
  }

  // EXTERN: taskuri cu deadline < 48h
  const deadlineTasks = await prisma.agentTask.count({
    where: {
      status: "ASSIGNED",
      deadlineAt: { lte: new Date(Date.now() + 48 * 3600000), gte: new Date() },
    },
  })
  if (deadlineTasks > 0) {
    demands.push({
      source: "EXTERNAL", category: "deadline-pressure",
      urgency: 95, impact: 90, count: deadlineTasks,
    })
  }

  // INTERN: agenți fără KB (blind spots)
  const agentsNoKB = await prisma.agentRelationship.findMany({
    where: { isActive: true },
    select: { childRole: true },
    distinct: ["childRole"],
  })
  let blindSpots = 0
  for (const a of agentsNoKB) {
    const kbCount = await prisma.kBEntry.count({
      where: { agentRole: a.childRole, status: "PERMANENT" },
    })
    if (kbCount < 3) blindSpots++
  }
  if (blindSpots > 0) {
    demands.push({
      source: "INTERNAL", category: "knowledge-gaps",
      urgency: 30, impact: 60, count: blindSpots,
    })
  }

  // INTERN: taskuri BLOCKED/FAILED recente
  const blockedCount = await prisma.agentTask.count({
    where: { status: { in: ["BLOCKED", "FAILED"] }, updatedAt: { gte: h24 } },
  })
  if (blockedCount > 0) {
    demands.push({
      source: "INTERNAL", category: "blocked-tasks",
      urgency: 50, impact: 40, count: blockedCount,
    })
  }

  // INTERN: obiective sub 30% (stagnante)
  const stagnantObjs = await prisma.organizationalObjective.count({
    where: { status: "ACTIVE", currentValue: { lt: 30 } },
  })
  if (stagnantObjs > 0) {
    demands.push({
      source: "INTERNAL", category: "stagnant-objectives",
      urgency: 35, impact: 55, count: stagnantObjs,
    })
  }

  return demands
}

// ── Deliberare: compromisul ─────────────────────────────────

export async function deliberate(
  batchSize: number,
  cognitiveHealthScore: number,
): Promise<Compromise> {
  const state = await loadState()
  const demands = await collectDemands()

  // Scoruri agregate
  const externalDemands = demands.filter(d => d.source === "EXTERNAL")
  const internalDemands = demands.filter(d => d.source === "INTERNAL")

  const externalPressure = externalDemands.reduce((sum, d) => sum + d.urgency * d.impact / 100, 0)
  const internalPressure = internalDemands.reduce((sum, d) => sum + d.urgency * d.impact / 100, 0)
  const totalPressure = externalPressure + internalPressure || 1

  // Raport natural din presiuni
  let naturalExternalPct = Math.round((externalPressure / totalPressure) * 100)

  // Ajustare pe baza sănătății cognitive
  if (cognitiveHealthScore < state.learnedPatterns.riskThreshold) {
    // Sub prag — mod supraviețuire, forțăm intern
    naturalExternalPct = Math.min(naturalExternalPct, 30)
  } else if (cognitiveHealthScore < 60) {
    // Zonă de atenție — limităm extern
    naturalExternalPct = Math.min(naturalExternalPct, 60)
  }

  // Ajustare pe baza biasului învățat (din compromisuri anterioare)
  naturalExternalPct = Math.max(10, Math.min(90, naturalExternalPct + state.currentBias))

  // Ajustare pe baza drop-urilor consecutive de sănătate
  if (state.consecutiveHealthDrops >= 2) {
    // Sănătatea scade de 2+ cicluri → forțăm mai mult intern
    naturalExternalPct = Math.max(20, naturalExternalPct - state.consecutiveHealthDrops * 10)
  }

  // Calculăm sloturi
  const externalSlots = Math.max(1, Math.round(batchSize * naturalExternalPct / 100))
  const internalSlots = Math.max(1, batchSize - externalSlots)

  // Confidence: scade dacă nu avem date istorice
  const historicRelevance = Math.min(100, state.history.length * 5)
  const confidence = Math.round(
    (historicRelevance * 0.3) +
    (cognitiveHealthScore > 60 ? 40 : 20) +
    (state.consecutiveHealthDrops === 0 ? 30 : 10)
  )

  // Reasoning
  const reasonParts: string[] = []
  if (externalDemands.length > 0) {
    reasonParts.push(`${externalDemands.reduce((s, d) => s + d.count, 0)} cereri externe (${externalDemands.map(d => d.category).join(", ")})`)
  }
  if (internalDemands.length > 0) {
    reasonParts.push(`${internalDemands.reduce((s, d) => s + d.count, 0)} cereri interne (${internalDemands.map(d => d.category).join(", ")})`)
  }
  if (cognitiveHealthScore < state.learnedPatterns.riskThreshold) {
    reasonParts.push(`sănătate sub prag (${cognitiveHealthScore} < ${state.learnedPatterns.riskThreshold}) → mod intern`)
  }
  if (state.consecutiveHealthDrops >= 2) {
    reasonParts.push(`${state.consecutiveHealthDrops} cicluri consecutive de degradare → corecție internă`)
  }

  return {
    externalPct: naturalExternalPct,
    internalPct: 100 - naturalExternalPct,
    externalSlots,
    internalSlots,
    reasoning: reasonParts.join("; ") || "Echilibru natural",
    confidence,
  }
}

// ── Feedback: ce s-a întâmplat? ─────────────────────────────

export async function recordCompromiseOutcome(
  compromise: Compromise,
  healthBefore: number,
  healthAfter: number,
  externalCompleted: number,
  internalCompleted: number,
  externalFailed: number,
  internalFailed: number,
): Promise<void> {
  const state = await loadState()

  const healthDelta = healthAfter - healthBefore
  const wasGoodDecision = healthDelta >= -5 && externalCompleted > 0

  const outcome: CompromiseOutcome = {
    timestamp: new Date().toISOString(),
    compromise,
    effect: {
      healthBefore, healthAfter, healthDelta,
      externalCompleted, internalCompleted,
      externalFailed, internalFailed,
    },
    wasGoodDecision,
  }

  state.history.push(outcome)
  if (state.history.length > 50) state.history = state.history.slice(-50)

  // ── Calibrare bias ────────────────────────────────────

  if (healthDelta < -10) {
    // Sănătatea a scăzut semnificativ → bias spre intern
    state.currentBias = Math.max(-30, state.currentBias - 5)
    state.consecutiveHealthDrops++
  } else if (healthDelta >= 0 && externalCompleted > 0) {
    // Sănătatea stabilă + progres extern → bias ușor spre extern
    state.currentBias = Math.min(20, state.currentBias + 2)
    state.consecutiveHealthDrops = 0
  } else {
    state.consecutiveHealthDrops = 0
  }

  // ── Recalculare patterns ──────────────────────────────

  // Optimal external %: media compromisurilor care au funcționat
  const goodDecisions = state.history.filter(h => h.wasGoodDecision)
  if (goodDecisions.length >= 5) {
    state.learnedPatterns.optimalExternalPct = Math.round(
      goodDecisions.reduce((sum, d) => sum + d.compromise.externalPct, 0) / goodDecisions.length
    )
  }

  // Risk threshold: cel mai mic health la care un compromis extern a funcționat
  const externalHeavy = state.history.filter(h => h.compromise.externalPct >= 70 && h.wasGoodDecision)
  if (externalHeavy.length >= 3) {
    state.learnedPatterns.riskThreshold = Math.round(
      Math.min(...externalHeavy.map(h => h.effect.healthBefore))
    )
  }

  // Recovery speed: câte cicluri de la health drop la recovery
  let recoverySum = 0
  let recoveryCount = 0
  for (let i = 1; i < state.history.length; i++) {
    if (state.history[i - 1].effect.healthDelta < -5 && state.history[i].effect.healthDelta > 0) {
      recoveryCount++
      recoverySum++
    } else if (state.history[i - 1].effect.healthDelta < -5) {
      recoverySum++
    }
  }
  if (recoveryCount > 0) {
    state.learnedPatterns.recoverySpeed = Math.round(recoverySum / recoveryCount)
  }

  await saveState(state)
}

// ── Integrare cu task selection ──────────────────────────────

/**
 * Returnează tag-urile prioritare pentru sloturi externe vs interne.
 * Folosit de intelligent-executor la selecția taskurilor din batch.
 */
export function getTaskSelectionCriteria(compromise: Compromise): {
  externalTags: string[]
  internalTags: string[]
  externalSlots: number
  internalSlots: number
} {
  return {
    externalTags: [
      "client", "marketing", "onboarding", "b2b", "sales", "portal",
      "content", "media-book", "landing", "compliance", "art5", "art7",
      "signal-reactive", "legal",
    ],
    internalTags: [
      "organism", "audit", "cleanup", "kb", "learning",
      "self-regulation", "homeostasis", "probe", "health",
    ],
    externalSlots: compromise.externalSlots,
    internalSlots: compromise.internalSlots,
  }
}
