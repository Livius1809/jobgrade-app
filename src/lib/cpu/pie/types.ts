/**
 * PIE Types — Profiler Integration Engine
 *
 * Tipuri pentru cele 3 integrări PIE:
 *   1. Om × Post (person × position)
 *   2. Om × Post × Organizație (person × position × org)
 *   3. Post × Organizație (position × org) — NU trece prin PIE, exclusiv Profiler Engine B2B
 *
 * PIE se activează DOAR la puncte de intersecție.
 * Profil singular = un singur engine. PIE intră doar la combinare.
 */

import type { NormalizedScore, SignificantScore, IntegratedTrait } from "@/lib/profiling/score-normalizer"
import type { IndividualProfile } from "@/lib/cpu/profilers/n2-individual"

// ═══════════════════════════════════════════════════════════════
// SOURCE PROFILES — ce primește PIE de la engine-uri
// ═══════════════════════════════════════════════════════════════

/** Profil persoană — vine din Profiler Engine B2C sau B2B */
export interface PersonProfile {
  personId: string
  source: "B2C" | "B2B"
  /** Scoruri normalizate din baterie psihometrică */
  scores: NormalizedScore[]
  /** Trăsături integrate (calculate din scoruri) */
  traits: IntegratedTrait[]
  /** Stil cognitiv Herrmann */
  cognitiveStyle?: { dominant: "A" | "B" | "C" | "D"; quadrants: Record<"A" | "B" | "C" | "D", number> }
  /** Tip MBTI */
  personalityType?: string
  /** Nivel maturitate */
  maturityLevel: "NEWCOMER" | "EXPLORING" | "DEVELOPING" | "MATURING" | "INTEGRATED"
  /** Profilul complet N2 dacă disponibil */
  individualProfile?: IndividualProfile
}

/** Profil post — cerințele poziției */
export interface PositionProfile {
  positionId: string
  tenantId: string
  title: string
  grade?: number
  /** Cerințe pe cele 6 criterii JG */
  criteriaScores?: {
    education: number
    communication: number
    problemSolving: number
    decisionMaking: number
    businessImpact: number
    workConditions: number
  }
  /** Competențe necesare (din fișa post) */
  requiredCompetences: Array<{
    name: string
    level: "JUNIOR" | "MEDIU" | "SENIOR" | "EXPERT"
    weight: number
  }>
  /** Stil cognitiv preferat (din analiza sarcinilor) */
  preferredCognitiveStyle?: "A" | "B" | "C" | "D" | "AB" | "CD" | "AC" | "BD"
  /** Leadership necesar */
  leadershipRequired: boolean
  /** Nivel integritate necesar (posturi critice) */
  integrityThreshold: "STANDARD" | "RIDICAT" | "CRITIC"
}

/** Profil organizație — cultura și contextul */
export interface OrganizationProfile {
  tenantId: string
  orgName: string
  /** Dimensiuni cultură organizațională (din CO) */
  culture?: {
    dimensions: Array<{ name: string; score: number; level: string }>
    dominantStyle: string
  }
  /** Valorile declarate (din MVV) */
  declaredValues: string[]
  /** Maturitate organizațională */
  maturityLevel: "STARTUP" | "GROWTH" | "MATURE" | "TRANSFORMING"
  /** Stil leadership dominant */
  leadershipStyle?: string
  /** Nivel deschidere la schimbare */
  changeReadiness: "SCAZUT" | "MEDIU" | "RIDICAT"
  /** Toggle serviciu */
  serviceMode: "CLASIC" | "TRANSFORMATIONAL"
}

// ═══════════════════════════════════════════════════════════════
// INTEGRATION TYPES — cele 3 tipuri de integrare PIE
// ═══════════════════════════════════════════════════════════════

export type IntegrationType =
  | "PERSON_POSITION"              // Om × Post
  | "PERSON_POSITION_ORG"          // Om × Post × Organizație
  | "POSITION_ORG"                 // Post × Org (NU trece prin PIE)

// ═══════════════════════════════════════════════════════════════
// GAP ANALYSIS — decalaje identificate
// ═══════════════════════════════════════════════════════════════

export type GapSeverity = "CRITIC" | "SEMNIFICATIV" | "MODERAT" | "MINOR" | "ALINIAT"

export interface GapItem {
  dimension: string
  instrumentSource: string
  /** Ce cere postul/organizația */
  required: number
  /** Ce are persoana */
  actual: number
  /** Diferența (negativ = deficit, pozitiv = surplus) */
  delta: number
  severity: GapSeverity
  /** Interpretare umană */
  interpretation: string
  /** Poate fi acoperit prin training? */
  developable: boolean
  /** Timpul estimat de dezvoltare (luni) */
  estimatedDevelopmentMonths?: number
}

export interface GapAnalysis {
  totalGaps: number
  criticalGaps: number
  strengths: number
  alignments: number
  overallFitScore: number // 0-100
  gaps: GapItem[]
  /** Scoruri agregate per categorie */
  byCategory: Record<string, { avgDelta: number; gapCount: number; worstGap: GapItem | null }>
}

// ═══════════════════════════════════════════════════════════════
// INTEGRATION RESULTS
// ═══════════════════════════════════════════════════════════════

/** Rezultat integrare Om × Post */
export interface PersonPositionResult {
  integrationType: "PERSON_POSITION"
  personId: string
  positionId: string
  /** Scor compatibilitate global (0-100) */
  compatibilityScore: number
  /** Nivel compatibilitate */
  compatibilityLevel: "EXCELENT" | "BUN" | "ACCEPTABIL" | "MARGINAL" | "INADECVAT"
  /** Gap analysis complet */
  gapAnalysis: GapAnalysis
  /** Scoruri semnificative clasificate */
  classifiedScores: {
    excellence: SignificantScore[]
    development: SignificantScore[]
    inNorm: SignificantScore[]
  }
  /** Potrivire stil cognitiv */
  cognitiveStyleFit: { fit: boolean; detail: string }
  /** Recomandare */
  recommendation: {
    decision: "RECOMANDAT" | "RECOMANDAT_CU_DEZVOLTARE" | "RECOMANDAT_CU_REZERVE" | "NERECOMANDAT"
    reasoning: string
    developmentPlan?: string[]
    risks?: string[]
  }
  /** Timestamp */
  generatedAt: string
}

/** Rezultat integrare Om × Post × Organizație */
export interface PersonPositionOrgResult {
  integrationType: "PERSON_POSITION_ORG"
  personId: string
  positionId: string
  tenantId: string
  /** Compatibilitate cu postul (din PersonPositionResult) */
  positionFit: PersonPositionResult
  /** Compatibilitate cu cultura organizațională */
  cultureFit: {
    score: number
    level: "EXCELENT" | "BUN" | "ACCEPTABIL" | "TENSIUNE" | "CONFLICT"
    alignedValues: string[]
    conflictingValues: string[]
    culturalGaps: GapItem[]
  }
  /** Compatibilitate stil leadership */
  leadershipFit?: {
    personStyle: string
    orgExpectation: string
    compatible: boolean
    detail: string
  }
  /** Scor integrat final (ponderat: 50% post + 30% cultură + 20% leadership) */
  integratedScore: number
  integratedLevel: "EXCELENT" | "BUN" | "ACCEPTABIL" | "MARGINAL" | "INADECVAT"
  /** Prognoza retenție (luni estimate înainte de risc plecare) */
  retentionPrognosis: {
    estimatedMonths: number
    riskFactors: string[]
    protectiveFactors: string[]
  }
  /** Recomandare finală */
  recommendation: {
    decision: "RECOMANDAT" | "RECOMANDAT_CU_DEZVOLTARE" | "RECOMANDAT_CU_REZERVE" | "NERECOMANDAT"
    reasoning: string
    onboardingNotes?: string[]
    developmentPlan?: string[]
  }
  generatedAt: string
}

// ═══════════════════════════════════════════════════════════════
// PIE OUTPUT DESTINATIONS
// ═══════════════════════════════════════════════════════════════

export type OutputDestination =
  | "EVALUATED_PERSON"       // Persoana evaluată
  | "HR_SUPERVISOR"          // Director HR
  | "HIERARCHY_SUPERVISOR"   // Superiorul ierarhic
  | "HUMAN_CONSULTANT"       // Consultantul uman
  | "HR_COUNSELOR_AGENT"     // Agent HR Counselor
  | "B2C_CARD3_COUNSELOR"   // Consilier Card 3 (doar dacă persoana optează pentru dezvoltare individuală)

export interface PIEOutput {
  destination: OutputDestination
  /** Ce vede acest destinatar (filtrat per rol) */
  visibleData: Partial<PersonPositionResult | PersonPositionOrgResult>
  /** Recomandări specifice rolului */
  roleSpecificRecommendations: string[]
  /** Nivel detaliu */
  detailLevel: "SUMAR" | "DETALIAT" | "COMPLET"
}

// ═══════════════════════════════════════════════════════════════
// PIE REQUEST
// ═══════════════════════════════════════════════════════════════

export interface PIERequest {
  integrationType: "PERSON_POSITION" | "PERSON_POSITION_ORG"
  person: PersonProfile
  position: PositionProfile
  organization?: OrganizationProfile
  /** Destinatari care vor primi raportul */
  outputDestinations: OutputDestination[]
  /** Context B2B sau B2C */
  businessContext: "B2B" | "B2C"
  /** Card activ (B2B C3/C4, B2C Card 3) */
  activeCard?: string
  /** Limba raport */
  language: "ro" | "en"
}
