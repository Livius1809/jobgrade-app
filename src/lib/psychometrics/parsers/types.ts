/**
 * Types pentru parsere instrumente psihometrice
 *
 * Fiecare parser extrage scoruri structurate din PDF-uri nestructurate
 * folosind cpuCall (AI-based extraction) prin CPU gateway.
 */

// ── Scale CPI 260 ──────────────────────────────────────────

export interface CPI260Scale {
  name: string
  abbreviation: string
  category: "STRUCTURAL" | "FOLK" | "SPECIAL_PURPOSE" | "WORK"
  rawScore: number | null
  tScore: number
  percentile: number
}

export interface CPI260Result {
  instrumentId: "CPI_260"
  subjectCode: string
  subjectName: string
  gender: "M" | "F"
  /** 3 scale structurale (v1, v2, v3) */
  structuralScales: CPI260Scale[]
  /** 20 scale folk (Dominance, Capacity for Status, etc.) */
  folkScales: CPI260Scale[]
  /** 7 scale special purpose */
  specialPurposeScales: CPI260Scale[]
  /** 5 scale WORK */
  workScales: CPI260Scale[]
  /** Toate scalele agregate */
  allScales: CPI260Scale[]
  /** Cuboid type (alpha, beta, gamma, delta) */
  cuboidType: string | null
  parsedAt: string
  confidence: number
}

// ── ESQ-2 ──────────────────────────────────────────────────

export interface ESQ2Scale {
  name: string
  centile: number
  tScore: number
  riskLevel: "LOW" | "MODERATE" | "HIGH" | "CRITICAL"
}

export interface ESQ2Result {
  instrumentId: "ESQ_2"
  subjectCode: string
  subjectName: string
  /** 16 scale centile */
  scales: ESQ2Scale[]
  /** Scor integritate global */
  overallIntegrity: {
    centile: number
    tScore: number
    level: "LOW" | "MODERATE" | "HIGH" | "CRITICAL"
  }
  /** Indicatori de risc activi */
  riskIndicators: Array<{
    name: string
    centile: number
    description: string
  }>
  parsedAt: string
  confidence: number
}

// ── AMI (Achievement Motivation Inventory) ─────────────────

export interface AMIScale {
  name: string
  abbreviation: string
  stanine: number
  tScore: number
  percentile: number
}

export interface AMIResult {
  instrumentId: "AMI"
  subjectCode: string
  subjectName: string
  /** 17 scale stanine */
  scales: AMIScale[]
  /** Profil motivational agreat */
  motivationProfile: {
    overall: number // stanine mediu
    category: "LOW" | "MODERATE" | "HIGH" | "VERY_HIGH"
  }
  parsedAt: string
  confidence: number
}

// ── PASAT 2000 ─────────────────────────────────────────────

export interface PASAT2000Metric {
  name: string
  value: number
  unit: string
  percentile: number | null
  interpretation: string
}

export interface PASAT2000Result {
  instrumentId: "PASAT_2000"
  subjectCode: string
  subjectName: string
  /** Metrici de performanta */
  metrics: PASAT2000Metric[]
  /** Scor atentie sustinuta */
  sustainedAttention: {
    score: number
    centile: number
    tScore: number
  }
  /** Timpi de reactie */
  reactionTimes: {
    mean: number
    median: number
    standardDeviation: number
    unit: "ms"
  }
  /** Rate de eroare */
  errorRates: {
    omissions: number
    commissions: number
    totalErrorPct: number
  }
  /** Consistenta pe blocuri de timp */
  blockConsistency: Array<{
    block: number
    score: number
    reactionTime: number
  }>
  parsedAt: string
  confidence: number
}

// ── Union type ─────────────────────────────────────────────

export type PsychometricResult =
  | CPI260Result
  | ESQ2Result
  | AMIResult
  | PASAT2000Result

export type InstrumentType = "CPI_260" | "ESQ_2" | "AMI" | "PASAT_2000"

// ── Parser interface ───────────────────────────────────────

export interface ParsedPDFText {
  /** Text extras din PDF (raw) */
  rawText: string
  /** Numar pagini */
  pageCount: number
}

export interface ParserOptions {
  /** Cod angajat (override daca nu se detecteaza din PDF) */
  subjectCode?: string
  /** Nume angajat (override) */
  subjectName?: string
  /** Gen (override) */
  gender?: "M" | "F"
  /** Tenant ID pentru cost tracking */
  tenantId?: string
}
