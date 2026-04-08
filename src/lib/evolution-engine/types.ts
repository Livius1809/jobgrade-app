/**
 * types.ts — Tipuri fundamentale ale Evolution Engine
 *
 * Același motor, 4 contexte:
 *   OWNER    — client zero, primul testat, cel mai important
 *   INTERNAL — agenții proprii (organism viu)
 *   B2B      — organizația client (firmă)
 *   B2C      — individul client (persoană)
 *
 * Engine-ul fractal: fiecare ciclu produce conștientizare care revelează
 * un nou nivel de dezaliniere, invizibil la nivelul anterior.
 * Planul se rescrie la nivel superior. Spirala urcă.
 */

// ── Cele 4 contexte ────────────────────────────────────────────────────────

export type EvolutionContext = "OWNER" | "INTERNAL" | "B2B" | "B2C"

// ── Ciclul fractal în 7 pași ───────────────────────────────────────────────

export type CycleStep =
  | "AWARENESS"          // 1. Conștientizare stare curentă — "Unde sunt acum?"
  | "DIAGNOSIS"          // 2. Diagnostic dezaliniere — "Ce nu e aliniat?"
  | "PLAN"               // 3. Plan evolutiv — "Ce pot face?"
  | "ACTION"             // 4. Acțiune — "Fac."
  | "MONITORING"         // 5. Monitorizare efecte — "Ce s-a schimbat?"
  | "NEW_AWARENESS"      // 6. Conștientizare stare nouă — "Cine sunt acum?"
  | "REFORMULATION"      // 7. Reformulare → plan v2 — "Văd mai clar → ciclu superior"

// ── Snapshot-ul stării (fotografia la un moment dat) ───────────────────────

export interface StateSnapshot {
  /** Identificator subiect (agentRole | tenantId | b2cUserId | "owner") */
  subjectId: string
  context: EvolutionContext
  /** Momentul capturii */
  capturedAt: string
  /** Scorul compozit curent (0-100) */
  compositeScore: number
  /** Dimensiunile evaluate */
  dimensions: DimensionScore[]
  /** Nivel maturitate */
  maturityLevel: MaturityLevel
  /** Faza pe spirală (pentru B2C) */
  spiralPhase?: "CHRYSALIS" | "BUTTERFLY" | "FLIGHT" | "LEAP"
  /** Etapa competenței (1-4, fractal) */
  competenceStage?: number
  /** Metadata extra per context */
  metadata?: Record<string, unknown>
}

// ── Dimensiunile (configurabile per context) ──────────────────────────────

export interface DimensionScore {
  /** Cod intern (ex: "autonomie", "auto_cunoastere") */
  code: string
  /** Nume afișabil (ex: "Autonomie decizională") */
  name: string
  /** Scor 0-100 */
  score: number
  /** Trend comparativ cu ciclul anterior */
  trend: "up" | "down" | "stable"
  /** Dovezi concrete (max 3) */
  evidence: string[]
  /** Recomandare de creștere */
  recommendation?: string
  /** Ponderea în scorul compozit (0-1, suma = 1) */
  weight: number
}

export interface DimensionDefinition {
  code: string
  name: string
  weight: number
  /** Descriere internă (nu se expune clientului) */
  description: string
}

// ── Dezaliniere (gap detectat) ─────────────────────────────────────────────

export interface Misalignment {
  /** Dimensiunea afectată */
  dimensionCode: string
  /** Severitate */
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
  /** Descriere (internă) */
  description: string
  /** Descriere tradusă (pentru client — fără jargon) */
  clientFacingDescription?: string
  /** Ce revelează (de ce era invizibilă la ciclul anterior) */
  revealedBy?: string
}

// ── Planul evolutiv ────────────────────────────────────────────────────────

export interface EvolutionPlan {
  /** Versiunea planului (1 = primul ciclu, N = al N-lea ciclu) */
  version: number
  /** Ciclul care l-a generat */
  cycleNumber: number
  /** Acțiuni planificate */
  actions: PlannedAction[]
  /** Jaloane de progres */
  milestones: Milestone[]
  /** De când e valid */
  createdAt: string
  /** Până când (orientativ, nu prescriptiv) */
  targetDate?: string
}

export interface PlannedAction {
  /** Ce trebuie făcut */
  description: string
  /** Descriere tradusă (fără jargon) */
  clientFacingDescription?: string
  /** Dimensiunea vizată */
  dimensionCode: string
  /** Prioritate */
  priority: "HIGH" | "MEDIUM" | "LOW"
  /** Status execuție */
  status: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED"
  /** Acțiune concretă per context */
  contextAction?: string
}

export interface Milestone {
  /** Titlu (vizibil clientului, tradus) */
  title: string
  /** Dimensiunea vizată */
  dimensionCode: string
  /** Prag de atingere */
  targetScore?: number
  /** Atins? */
  reached: boolean
  /** Când a fost atins */
  reachedAt?: string
}

// ── Măsurare efecte ────────────────────────────────────────────────────────

export interface EffectMeasurement {
  /** Ce acțiuni au fost executate */
  actionsCompleted: number
  actionsTotal: number
  /** Jaloane atinse */
  milestonesReached: number
  milestonesTotal: number
  /** Delta pe dimensiuni (scor nou - scor vechi) */
  dimensionDeltas: Array<{
    dimensionCode: string
    previousScore: number
    currentScore: number
    delta: number
  }>
  /** Observații calitative */
  qualitativeInsights: string[]
}

// ── Ciclul complet ─────────────────────────────────────────────────────────

export interface EvolutionCycle {
  /** Numărul ciclului (1, 2, 3...) */
  cycleNumber: number
  /** Contextul */
  context: EvolutionContext
  /** Subiectul */
  subjectId: string
  /** Pasul curent */
  currentStep: CycleStep
  /** Timestamp-uri per pas */
  stepTimestamps: Partial<Record<CycleStep, string>>

  // Cele 7 pași (populate pe măsură ce ciclul progresează)
  /** Pas 1 — Conștientizare stare curentă */
  awareness?: StateSnapshot
  /** Pas 2 — Diagnostic dezaliniere */
  diagnosis?: Misalignment[]
  /** Pas 3 — Plan evolutiv */
  plan?: EvolutionPlan
  /** Pas 4 — Acțiuni executate (referință) */
  actionsExecuted?: string[]
  /** Pas 5 — Monitorizare efecte */
  monitoring?: EffectMeasurement
  /** Pas 6 — Conștientizare stare nouă */
  newAwareness?: StateSnapshot
  /** Pas 7 — Plan reformulat (devine planul ciclului N+1) */
  reformulatedPlan?: EvolutionPlan

  /** Metadata */
  startedAt: string
  completedAt?: string
  /** Sumar narativ generat */
  narrativeSummary?: string
}

// ── Niveluri de maturitate (comune tuturor contextelor) ───────────────────

export type MaturityLevel = "SEED" | "GROWING" | "COMPETENT" | "EXPERT" | "MASTER"

/** Traducere pentru client (B2C — fără jargon) */
export const MATURITY_CLIENT_LABELS: Record<MaturityLevel, string> = {
  SEED: "Începutul drumului",
  GROWING: "Pe cale",
  COMPETENT: "Mergi sigur",
  EXPERT: "Ai profunzime",
  MASTER: "A devenit firesc",
}

/** Traducere pentru B2B (limbaj business) */
export const MATURITY_B2B_LABELS: Record<MaturityLevel, string> = {
  SEED: "Faza inițială",
  GROWING: "În dezvoltare",
  COMPETENT: "Operațional",
  EXPERT: "Matur",
  MASTER: "Excelență",
}

export function maturityFromScore(score: number): MaturityLevel {
  if (score >= 90) return "MASTER"
  if (score >= 75) return "EXPERT"
  if (score >= 55) return "COMPETENT"
  if (score >= 30) return "GROWING"
  return "SEED"
}

// ── Surse de date (pluggable per context) ─────────────────────────────────

export interface DataSourceResult {
  /** Metrici numerice colectate */
  metrics: Record<string, { current: number; previous: number }>
  /** Observații calitative */
  qualitative: string[]
  /** Metadata raw */
  raw?: Record<string, unknown>
}

/**
 * Funcție de colectare date — fiecare context implementează a sa.
 * Primește subiect + perioadă, returnează date brute.
 */
export type DataCollector = (
  subjectId: string,
  periodStart: Date,
  periodEnd: Date,
  prevStart: Date,
  prevEnd: Date,
  prisma: any
) => Promise<DataSourceResult>

/**
 * Funcție de calcul dimensiuni — fiecare context implementează a sa.
 * Primește datele brute, returnează scoruri pe dimensiuni.
 */
export type DimensionCalculator = (
  data: DataSourceResult,
  definitions: DimensionDefinition[]
) => DimensionScore[]

/**
 * Funcție de generare acțiuni — fiecare context implementează a sa.
 * Primește gaps detectate, returnează acțiuni planificate.
 */
export type ActionGenerator = (
  diagnosis: Misalignment[],
  currentState: StateSnapshot,
  context: EvolutionContext
) => PlannedAction[]

// ── Configurația unui context ─────────────────────────────────────────────

export interface ContextConfig {
  context: EvolutionContext
  /** Dimensiunile evaluate (8 per context, definite în memorie) */
  dimensions: DimensionDefinition[]
  /** Frecvența ciclului (în zile) */
  cycleDays: number
  /** Funcții specifice contextului */
  collectData: DataCollector
  calculateDimensions: DimensionCalculator
  generateActions: ActionGenerator
  /** Praguri pentru diagnostic */
  thresholds: {
    critical: number  // sub acest scor = CRITICAL
    high: number      // sub acest scor = HIGH
    medium: number    // sub acest scor = MEDIUM
  }
}
