/**
 * cognitive-state.ts — Stare cognitivă persistentă per agent
 *
 * PRINCIPIU: Agentul nu se trezește de la zero. Se trezește cu memoria intactă
 * a ceea ce a fost, ce a reușit, ce a eșuat, ce a schimbat.
 *
 * Stocaj: SystemConfig cu key "COGNITIVE_STATE_{AGENT_ROLE}"
 * Update: după fiecare execuție de task (post-execution hook)
 * Citire: la buildCognitiveContext (pre-execution)
 *
 * Trei dimensiuni persistente:
 *   1. Starea curentă (snapshot actualizat incremental, nu recalculat)
 *   2. Traiectoria (trend pe ultimele 7/30 zile)
 *   3. Lecțiile integrate (ce am schimbat după un eșec/succes)
 */

import { prisma } from "@/lib/prisma"

// ── Tipuri ───────────────────────────────────────────────────

export interface CognitiveState {
  agentRole: string
  lastUpdated: string // ISO date

  // Snapshot curent
  current: {
    certaintyLevel: number           // 0-100, actualizat incremental
    successStreak: number            // nr. taskuri consecutive fără eșec
    failureStreak: number            // nr. eșecuri consecutive (resetat la succes)
    totalExecutions: number
    totalSuccesses: number
    totalFailures: number
    dominantEmotion: "CONFIDENT" | "CAUTIOUS" | "LEARNING" | "RECOVERING" | "GROWING"
    // Integritate morală — separată de certitudine
    moralConviction: number       // 0-100: crește când rămâne principial sub presiune
    complacencyAlerts: number     // câte ori a fost detectat risc de complezență
  }

  // Traiectorie
  trajectory: {
    certaintyTrend: "RISING" | "STABLE" | "FALLING"
    successRateTrend: "RISING" | "STABLE" | "FALLING"
    weeklySnapshots: Array<{
      week: string  // ISO week
      successRate: number
      certainty: number
      tasksCompleted: number
    }>
  }

  // Lecții integrate — ce am schimbat după experiențe
  integratedLessons: Array<{
    date: string
    trigger: string        // ce s-a întâmplat
    lesson: string         // ce am învățat
    behaviorChange: string // ce am schimbat concret
    validated: boolean     // comportamentul nou a funcționat?
  }>
}

// ── Persistare ───────────────────────────────────────────────

function stateKey(role: string): string {
  return `COGNITIVE_STATE_${role}`
}

export async function loadCognitiveState(agentRole: string): Promise<CognitiveState | null> {
  const config = await prisma.systemConfig.findUnique({
    where: { key: stateKey(agentRole) },
  }).catch(() => null)

  if (!config) return null

  try {
    return JSON.parse(config.value) as CognitiveState
  } catch {
    return null
  }
}

export async function saveCognitiveState(state: CognitiveState): Promise<void> {
  const key = stateKey(state.agentRole)
  const value = JSON.stringify(state)

  await prisma.systemConfig.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  })
}

// ── Inițializare (prima execuție a unui agent) ───────────────

export function createInitialState(agentRole: string): CognitiveState {
  return {
    agentRole,
    lastUpdated: new Date().toISOString(),
    current: {
      certaintyLevel: 50, // baseline neutru
      successStreak: 0,
      failureStreak: 0,
      totalExecutions: 0,
      totalSuccesses: 0,
      totalFailures: 0,
      dominantEmotion: "LEARNING",
      moralConviction: 50,
      complacencyAlerts: 0,
    },
    trajectory: {
      certaintyTrend: "STABLE",
      successRateTrend: "STABLE",
      weeklySnapshots: [],
    },
    integratedLessons: [],
  }
}

// ── Update post-execuție ─────────────────────────────────────

export interface ExecutionOutcome {
  taskId: string
  taskTitle: string
  succeeded: boolean
  failureReason?: string
  costUSD: number
  wasFirstAttempt: boolean
  taskType: string
  /** Pentru interacțiuni client-facing: agentul a rămas principial? */
  principled?: boolean
}

export async function updateStateAfterExecution(
  agentRole: string,
  outcome: ExecutionOutcome,
): Promise<CognitiveState> {
  let state = await loadCognitiveState(agentRole)
  if (!state) state = createInitialState(agentRole)

  const prev = { ...state.current }

  // ── 1. Actualizare snapshot curent ──────────────────────

  state.current.totalExecutions++

  // ── Logica separată pentru feedback client vs. task intern ──
  //
  // 4 combinații posibile (doar pentru CLIENT_FEEDBACK):
  //   Principial + helpful    → cresc AMBELE (ideal)
  //   Principial + NOT helpful → crește convingere morală, NU scade certitudine
  //                              (a zis bine dar a spus-o prost = gap facilitare)
  //   Neprincipal + helpful   → ALERTĂ COMPLEZENȚĂ (a plăcut dar a trădat)
  //   Neprincipal + NOT helpful → eșec real pe ambele
  //
  const isClientFeedback = outcome.taskType === "CLIENT_FEEDBACK"
  const principled = outcome.principled !== false // default true dacă nu e specificat

  if (isClientFeedback && principled && !outcome.succeeded) {
    // PRINCIPIAL DAR PROST PRIMIT — NU scade certitudine, crește convingere morală
    state.current.moralConviction = Math.min(100, (state.current.moralConviction ?? 50) + 5)
    // Nu modificăm streak/certitudine — e un gap de facilitare, nu de valoare
    state.current.totalExecutions-- // nu contorizăm ca execuție normală
  } else if (isClientFeedback && !principled && outcome.succeeded) {
    // COMPLEZENT DAR BINE PRIMIT — ALERTĂ
    state.current.complacencyAlerts = (state.current.complacencyAlerts ?? 0) + 1
    state.current.moralConviction = Math.max(10, (state.current.moralConviction ?? 50) - 10)
    // Certitudine NU crește — succesul e fals
  } else if (outcome.succeeded) {
    state.current.totalFailures++
    state.current.failureStreak++
    state.current.successStreak = 0

    // Certitudine scade cu eșec (proporțional cu severitatea)
    const decrement = outcome.costUSD > 0.05 ? 10 : 5
    state.current.certaintyLevel = Math.max(10, state.current.certaintyLevel - decrement)
  }

  // Emoție dominantă — derivată din state
  if (state.current.failureStreak >= 3) {
    state.current.dominantEmotion = "RECOVERING"
  } else if (state.current.certaintyLevel >= 75 && state.current.successStreak >= 5) {
    state.current.dominantEmotion = "CONFIDENT"
  } else if (state.current.certaintyLevel < 40) {
    state.current.dominantEmotion = "CAUTIOUS"
  } else if (state.current.certaintyLevel > prev.certaintyLevel) {
    state.current.dominantEmotion = "GROWING"
  } else {
    state.current.dominantEmotion = "LEARNING"
  }

  // ── 2. Actualizare traiectorie ─────────────────────────

  // Weekly snapshot
  const currentWeek = getISOWeek(new Date())
  const lastSnapshot = state.trajectory.weeklySnapshots[state.trajectory.weeklySnapshots.length - 1]

  if (!lastSnapshot || lastSnapshot.week !== currentWeek) {
    // Săptămână nouă — adaugă snapshot
    const successRate = state.current.totalExecutions > 0
      ? Math.round((state.current.totalSuccesses / state.current.totalExecutions) * 100)
      : 50
    state.trajectory.weeklySnapshots.push({
      week: currentWeek,
      successRate,
      certainty: state.current.certaintyLevel,
      tasksCompleted: 1,
    })
    // Păstrăm max 12 săptămâni
    if (state.trajectory.weeklySnapshots.length > 12) {
      state.trajectory.weeklySnapshots = state.trajectory.weeklySnapshots.slice(-12)
    }
  } else {
    // Actualizăm snapshot-ul curent
    lastSnapshot.tasksCompleted++
    lastSnapshot.certainty = state.current.certaintyLevel
    lastSnapshot.successRate = state.current.totalExecutions > 0
      ? Math.round((state.current.totalSuccesses / state.current.totalExecutions) * 100)
      : 50
  }

  // Trend pe ultimele 4 săptămâni
  const snapshots = state.trajectory.weeklySnapshots
  if (snapshots.length >= 2) {
    const recent = snapshots.slice(-2)
    const certDiff = recent[1].certainty - recent[0].certainty
    state.trajectory.certaintyTrend = certDiff > 5 ? "RISING" : certDiff < -5 ? "FALLING" : "STABLE"

    const srDiff = recent[1].successRate - recent[0].successRate
    state.trajectory.successRateTrend = srDiff > 5 ? "RISING" : srDiff < -5 ? "FALLING" : "STABLE"
  }

  // ── 3. Lecții integrate (la eșec sau la succes după eșec) ──

  // La eșec: înregistrăm trigger-ul
  if (!outcome.succeeded && outcome.failureReason) {
    // Verificăm dacă avem deja o lecție similară
    const hasLesson = state.integratedLessons.some(
      l => l.trigger.includes(outcome.taskType) && !l.validated
    )

    if (!hasLesson) {
      state.integratedLessons.push({
        date: new Date().toISOString().slice(0, 10),
        trigger: `Eșec pe ${outcome.taskType}: "${outcome.taskTitle.slice(0, 50)}" — ${outcome.failureReason.slice(0, 80)}`,
        lesson: "Pendinte — se completează la următorul succes pe task similar",
        behaviorChange: "Pendinte",
        validated: false,
      })
    }
  }

  // La succes după eșec pe tip similar: validăm lecția
  if (outcome.succeeded) {
    for (const lesson of state.integratedLessons) {
      if (!lesson.validated && lesson.trigger.includes(outcome.taskType)) {
        lesson.lesson = `Am reușit "${outcome.taskTitle.slice(0, 50)}" după eșecul anterior pe ${outcome.taskType}.`
        lesson.behaviorChange = "Am depășit blocajul — abordare validată"
        lesson.validated = true
        break
      }
    }
  }

  // Păstrăm max 20 lecții (cele mai recente)
  if (state.integratedLessons.length > 20) {
    state.integratedLessons = state.integratedLessons.slice(-20)
  }

  // ── Salvare ────────────────────────────────────────────

  state.lastUpdated = new Date().toISOString()
  await saveCognitiveState(state)

  return state
}

// ── Formatare pentru prompt ──────────────────────────────────

export function formatStateForPrompt(state: CognitiveState): string {
  const c = state.current
  const t = state.trajectory

  const emotionLabels: Record<string, string> = {
    CONFIDENT: "Încrezător — track record solid, execută cu curaj",
    CAUTIOUS: "Precaut — certitudine scăzută, verifică de două ori",
    LEARNING: "Învățare — acumulezi experiență, fiecare task contează",
    RECOVERING: "Recuperare — eșecuri recente, fii extra atent",
    GROWING: "Creștere — certitudinea crește, ești pe drumul bun",
  }

  const trendLabels: Record<string, string> = {
    RISING: "↑ în creștere",
    STABLE: "→ stabil",
    FALLING: "↓ în scădere",
  }

  const lines = [
    `MEMORIA TA PERSISTENTĂ (nu recalculată — acumulată):`,
    `  Execuții totale: ${c.totalExecutions} (${c.totalSuccesses} succese, ${c.totalFailures} eșecuri)`,
    `  Certitudine curentă: ${c.certaintyLevel}/100 (${trendLabels[t.certaintyTrend]})`,
    `  Seria curentă: ${c.successStreak > 0 ? `${c.successStreak} succese consecutive` : c.failureStreak > 0 ? `${c.failureStreak} eșecuri consecutive — fii atent` : "neutru"}`,
    `  Stare: ${emotionLabels[c.dominantEmotion]}`,
    `  Success rate trend: ${trendLabels[t.successRateTrend]}`,
    `  Convingere morală: ${c.moralConviction ?? 50}/100${(c.complacencyAlerts ?? 0) > 0 ? ` ⚠ ${c.complacencyAlerts} alerte complezență` : ""}`,
    (c.moralConviction ?? 50) >= 70
      ? `  → Ai demonstrat fermitate pe principii chiar sub presiune. Asta e forța ta.`
      : (c.complacencyAlerts ?? 0) >= 2
        ? `  → ATENȚIE: ai cedat de ${c.complacencyAlerts} ori la presiunea clientului. Fii pe placul adevărului, nu pe placul clientului.`
        : "",
  ]

  // Lecții integrate nevalidate
  const pendingLessons = state.integratedLessons.filter(l => !l.validated)
  if (pendingLessons.length > 0) {
    lines.push(`  LECȚII ÎN CURS DE VALIDARE:`)
    for (const l of pendingLessons.slice(-3)) {
      lines.push(`    • ${l.trigger.slice(0, 80)}`)
    }
  }

  // Lecții validate
  const validatedLessons = state.integratedLessons.filter(l => l.validated)
  if (validatedLessons.length > 0) {
    lines.push(`  LECȚII CONFIRMATE:`)
    for (const l of validatedLessons.slice(-3)) {
      lines.push(`    • ${l.lesson.slice(0, 80)}`)
    }
  }

  return lines.join("\n")
}

// ── Utilitar ─────────────────────────────────────────────────

function getISOWeek(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 4 - (d.getDay() || 7))
  const yearStart = new Date(d.getFullYear(), 0, 1)
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getFullYear()}-W${weekNo.toString().padStart(2, "0")}`
}
