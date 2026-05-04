/**
 * ORGANIZATIONAL NARRATIVE — Profilul narativ la nivel de organizație
 *
 * Analog narrative-profile.ts dar pentru entități ORGANIZATION.
 * Integrează: Climat (CO), Cultură (3C), Structură (C1), Conformitate (C2),
 * Competitivitate (C3), și evoluția în timp.
 *
 * Document VIU: se auto-perfecționează cu fiecare puls, decizie HR,
 * intervenție implementată.
 */

import type {
  NarrativeDocument,
  NarrativeSection,
  InferenceBlock,
  InferenceUpdate,
  InferenceHistory,
  InferenceVersion,
  EmergentDimension,
  SimulatorDimension,
  SimulatorMilestone,
  ViewerRole,
} from "./narrative-profile"
import type { OrganizationalProfile } from "./n3-organizational"

// ═══════════════════════════════════════════════════════════════
// ORGANIZATIONAL NARRATIVE SECTIONS (10 secțiuni adaptate)
// ═══════════════════════════════════════════════════════════════

export const ORG_NARRATIVE_SECTIONS = [
  { order: 1, id: "org-opening", title: "Despre organizația ta", subtitle: "Scopul acestei analize" },
  { order: 2, id: "org-identity", title: "Cine ești ca organizație", subtitle: "Cultură, valori, identitate" },
  { order: 3, id: "org-how-works", title: "Cum funcționezi", subtitle: "Procese, structuri, dinamici" },
  { order: 4, id: "org-strengths", title: "Ce te face puternică", subtitle: "Avantaje competitive reale" },
  { order: 5, id: "org-blind-spots", title: "Unde te sabotezi", subtitle: "Decalaje 3C, riscuri, blocaje" },
  { order: 6, id: "org-aspiration", title: "Unde vrei să ajungi", subtitle: "MVV vs. realitate" },
  { order: 7, id: "org-gap", title: "Distanța", subtitle: "Declarat vs. Actual (3C)" },
  { order: 8, id: "org-plan", title: "Drumul", subtitle: "Plan intervenție multi-nivel" },
  { order: 9, id: "org-simulator", title: "Simulatorul", subtitle: "What-if organizațional" },
  { order: 10, id: "org-closing", title: "Pulsul viu", subtitle: "Monitorizare continuă" },
] as const

export type OrgSectionId = typeof ORG_NARRATIVE_SECTIONS[number]["id"]

// ═══════════════════════════════════════════════════════════════
// ORGANIZATIONAL INFERENCE SOURCES
// ═══════════════════════════════════════════════════════════════

/** Sursele de date la nivel org (analog ScaleReference la nivel individual) */
export interface OrgDataSource {
  sourceType:
    | "CLIMATE_SURVEY"        // CO — 8 dimensiuni
    | "CULTURE_AUDIT"         // 3C — 7 dimensiuni
    | "HR_METRICS"            // Turnover, absenteism, etc.
    | "STRUCTURE"             // Ierarhie, grade, departamente
    | "PAY_GAP"              // Indicatori echitate
    | "EMPLOYEE_PROFILES"    // Agregate N2 per departament
    | "MARKET_POSITION"      // Benchmark piață
    | "PROCESS_MAP"          // Hartă procese, KPI
    | "INTERVENTION_RESULTS" // Rezultate intervenții anterioare
    | "PULSE"                // Pulsuri lunare

  sourceLabel: string         // "Climat organizațional Q1 2026"
  dimension?: string          // "Leadership" | "Inovare" | etc.
  value: number               // Scor agregat
  benchmark?: number          // Referință sector/piață
  trend?: "ASCENDING" | "STABLE" | "DESCENDING"
  sampleSize?: number         // Câți angajați au contribuit
  measuredAt: string          // Când s-a măsurat
}

/** Inferență la nivel organizațional */
export interface OrgInferenceBlock {
  statementId: string
  sources: OrgDataSource[]
  composition: string          // Cum interacționează sursele
  mechanism: string            // Logica inferenței
  convergence: number          // Câte surse confirmă
  costImplication?: {          // Implicație financiară
    annualCost: number         // RON/an
    description: string        // "Costul turnover-ului generat de..."
  }
  riskLevel?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  complianceFlag?: string      // Referință legislativă dacă e relevant
  consultantNotes?: string

  /** Explicație per rol */
  roleExplanations: Partial<Record<ViewerRole, {
    summary: string            // Ce vede rolul respectiv
    actionRecommendation?: string
  }>>
}

// ═══════════════════════════════════════════════════════════════
// LIVING ORGANIZATIONAL PROFILE
// ═══════════════════════════════════════════════════════════════

/** Profilul organizațional ca document VIU */
export interface LivingOrganizationalProfile {
  /** Documentul narativ curent (ultima versiune) */
  current: OrgNarrativeDocument

  /** Organizația (tenant) */
  tenantId: string
  organizationName: string

  /** Istoricul inferențelor */
  inferenceHistories: Map<string, InferenceHistory>

  /** Update-uri neprocesate */
  pendingUpdates: OrgInferenceUpdate[]

  /** Praguri de regenerare */
  regenerationThreshold: {
    minUpdates: number
    minMaturityChange: number
    maxAge: string              // "30 days" | "7 days" (puls lunar)
  }

  /** Dimensiuni emergente la nivel org */
  emergentDimensions: OrgEmergentDimension[]

  /** Versiuni anterioare ale documentului (pentru comparativ) */
  versionHistory: Array<{
    version: number
    generatedAt: string
    triggerReason: string       // "Puls Q1", "Post-intervenție", "Re-calibrare"
    keyChanges: string[]        // Ce s-a schimbat vs. versiunea anterioară
  }>
}

/** Update la nivel organizațional */
export interface OrgInferenceUpdate extends Omit<InferenceUpdate, "trigger"> {
  trigger:
    | "PULSE_MONTHLY"          // Puls lunar (F7.1)
    | "MATURITY_QUARTERLY"     // Evaluare maturitate (F7.2)
    | "INTERVENTION_RESULT"    // Rezultat intervenție (F7.3)
    | "RECALIBRATION"          // Re-calibrare semestrială (F7.4)
    | "HR_DECISION"            // Angajare/promovare/plecare
    | "STRUCTURE_CHANGE"       // Reorganizare
    | "MARKET_SHIFT"           // Schimbare piață (Motor Teritorial)
    | "NEW_ASSESSMENT"         // Nouă evaluare (psihometrie, climat)
    | "COMPLIANCE_EVENT"       // Eveniment conformitate (audit, deadline)
}

/** Dimensiune emergentă la nivel org */
export interface OrgEmergentDimension {
  id: string
  label: string                 // "Rezistență la schimbare dept. X"
  source: "PULSE" | "HR_METRICS" | "CONSULTANT" | "PROCESS"
  confidence: number
  affectedScope: "DEPARTMENT" | "CROSS_DEPARTMENT" | "ORGANIZATION_WIDE"
  observations: Array<{
    timestamp: string
    source: string              // "Puls Mar 2026" | "Turnover Q1"
    observation: string
  }>
  promotedToSource: boolean
}

// ═══════════════════════════════════════════════════════════════
// ORGANIZATIONAL NARRATIVE DOCUMENT
// ═══════════════════════════════════════════════════════════════

export interface OrgNarrativeDocument {
  id: string
  generatedAt: string
  version: number
  entityType: "ORGANIZATION"

  /** Organizația */
  tenantId: string
  organizationName: string

  /** Scopul (MVV = aspirație) */
  scope: {
    mission: string
    vision: string
    values: string[]
    strategicObjectives: string[]
  }

  /** Profilul sursă (N3) */
  sourceProfile: OrganizationalProfile

  /** Secțiunile narative */
  sections: NarrativeSection[]

  /** Simulator organizațional */
  simulator: OrgSimulatorConfig

  /** Comparativ cu versiunea anterioară */
  previousVersion?: {
    version: number
    generatedAt: string
    deltasSummary: string[]     // "Climatul a crescut +0.4 pe Inovare"
  }
}

// ═══════════════════════════════════════════════════════════════
// ORGANIZATIONAL SIMULATOR
// ═══════════════════════════════════════════════════════════════

/** Slider-e pe INTERVENȚII, nu pe trăsături */
export interface OrgSimulatorConfig {
  interventions: OrgSimulatorIntervention[]
  currentHealth: number         // Scor sănătate 0-10 (din N3)
  current3CGap: number          // Gap mediu 3C (0-100%)
  calculateImpact: (selections: Record<string, number>) => OrgSimulatorResult
}

export interface OrgSimulatorIntervention {
  id: string
  label: string                 // "Training leadership middle management"
  category: "PEOPLE" | "PROCESS" | "CULTURE" | "STRUCTURE" | "COMPENSATION"

  /** Parametrii slider */
  investmentMin: number         // Investiție minimă RON
  investmentMax: number         // Investiție maximă RON
  currentInvestment: number     // Cât se investește acum (poate fi 0)

  /** Ce dimensiuni impactează */
  impacts: Array<{
    dimension: string           // "Leadership climat" | "Inovare" | etc.
    impactPerUnit: number       // Cât crește dimensiunea per RON investit
    maxImpact: number           // Plafon impact (diminishing returns)
  }>

  /** Milestones (ce apare în lateral) */
  milestones: OrgSimulatorMilestone[]
}

export interface OrgSimulatorMilestone {
  investmentLevel: number       // RON
  conditions: string[]          // "Angajează trainer extern", "Alocă 2h/săpt per manager"
  timeHorizon: string           // "6-9 luni"
  expectedOutcome: string       // "Scor leadership crește de la 5.8 la 6.4"
  roi: string                   // "ROI 180% în 12 luni (retenție crescută)"
}

export interface OrgSimulatorResult {
  healthScore: number           // Nou scor sănătate
  gap3C: number                 // Nou gap 3C
  totalInvestment: number       // Investiție totală RON
  estimatedROI: number          // % return
  timeToImpact: string          // "6-12 luni"
  dimensionChanges: Array<{
    dimension: string
    from: number
    to: number
    change: number
  }>
}

// ═══════════════════════════════════════════════════════════════
// COMPARISON UTILITIES
// ═══════════════════════════════════════════════════════════════

/** Generează diff narativ între două versiuni org */
export interface OrgNarrativeDiff {
  fromVersion: number
  toVersion: number
  period: string                // "Q1 → Q2 2026"

  /** Inferențe care s-au CONSOLIDAT (dovezi noi le confirmă) */
  consolidated: Array<{ statementId: string; reason: string }>

  /** Inferențe REVIZUITE (date noi le contrazic) */
  revised: Array<{ statementId: string; oldClaim: string; newClaim: string; reason: string }>

  /** Inferențe NOI (nu existau în versiunea anterioară) */
  newInsights: Array<{ statementId: string; insight: string }>

  /** Dimensiuni emergente care au apărut */
  newEmergent: OrgEmergentDimension[]

  /** Scor general: organizația evoluează sau regresează? */
  overallTrajectory: "ASCENDING" | "STABLE" | "DESCENDING"
  trajectoryExplanation: string
}
