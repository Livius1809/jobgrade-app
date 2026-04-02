/**
 * market-data.ts — Structuri date piață salarială + mapare pe grade JobGrade
 *
 * Surse publice:
 *   - INS TEMPO Online (Institutul Național de Statistică)
 *   - Eurostat Structure of Earnings Survey
 *   - Glassdoor, Undelucram, BestJobs (agregat, public)
 *   - Hays, PwC PayWell, KPMG, Mercer (rapoarte anuale)
 *
 * Mapare pe grade:
 *   Grade 8 (510-899 pts)  → Entry level, fără experiență
 *   Grade 7 (900-1099 pts) → Junior, 1-2 ani
 *   Grade 6 (1100-1299 pts) → Mid-level, 2-4 ani
 *   Grade 5 (1300-1599 pts) → Senior, 4-7 ani
 *   Grade 4 (1600-1799 pts) → Senior+/Lead, 7-10 ani
 *   Grade 3 (1800-1999 pts) → Manager/Expert, 10+ ani
 *   Grade 2 (2000-2199 pts) → Director/Senior Manager
 *   Grade 1 (2200+ pts)     → Executive/C-level
 */

import { GRADE_THRESHOLDS } from "@/lib/evaluation/scoring-table"

// ── Tipuri ────────────────────────────────────────────────────────────────────

export interface MarketDataPoint {
  jobFamily: string
  seniorityLevel: "ENTRY" | "MID" | "SENIOR" | "LEAD" | "EXECUTIVE"
  salaryP25: number
  salaryMedian: number
  salaryP75: number
  salaryP10?: number
  salaryP90?: number
  salaryMean?: number
  sampleSize?: number
  source: string
  sourceDetail?: string
  year: number
  quarter?: number
  region?: string
  industry?: string
  corCode?: string
}

export interface BenchmarkComparison {
  jobTitle: string
  grade: number
  gradeLabel: string
  internalSalary?: number
  marketP25: number
  marketMedian: number
  marketP75: number
  compaRatio?: number       // internalSalary / marketMedian * 100
  positionInMarket: "BELOW_P25" | "P25_P50" | "P50_P75" | "ABOVE_P75" | "UNKNOWN"
  recommendation: string
}

export interface MarketSummary {
  jobFamily: string
  gradeRange: string
  dataPoints: number
  sources: string[]
  latestYear: number
  medianRange: { min: number; max: number }
  p75Range: { min: number; max: number }
}

// ── Mapare Grade → Seniority ─────────────────────────────────────────────────

export const GRADE_SENIORITY_MAP: Record<number, string[]> = {
  8: ["ENTRY"],
  7: ["ENTRY", "MID"],
  6: ["MID"],
  5: ["MID", "SENIOR"],
  4: ["SENIOR", "LEAD"],
  3: ["LEAD"],
  2: ["LEAD", "EXECUTIVE"],
  1: ["EXECUTIVE"],
}

export const SENIORITY_GRADE_MAP: Record<string, number[]> = {
  ENTRY: [8, 7],
  MID: [7, 6, 5],
  SENIOR: [5, 4],
  LEAD: [4, 3, 2],
  EXECUTIVE: [2, 1],
}

// ── Mapare COR → Job Family ──────────────────────────────────────────────────

export const COR_JOB_FAMILY: Record<string, string> = {
  "1": "Management",
  "2": "Specialisti",
  "3": "Tehnicieni",
  "4": "Administrativ",
  "5": "Servicii",
  "6": "Agricultura",
  "7": "Meseriasi",
  "8": "Operatori",
  "9": "Necalificati",
}

// ── Job Families standard ────────────────────────────────────────────────────

export const JOB_FAMILIES = [
  "IT",
  "Financiar",
  "HR",
  "Vanzari",
  "Marketing",
  "Productie",
  "Logistica",
  "Juridic",
  "Administrativ",
  "Tehnic",
  "R&D",
  "Management General",
  "Customer Service",
  "Achizitii",
  "Calitate",
] as const

export type JobFamily = typeof JOB_FAMILIES[number]

// ── Funcții de comparare ─────────────────────────────────────────────────────

/**
 * Determină poziția unui salariu față de piață.
 */
export function getMarketPosition(
  salary: number,
  p25: number,
  median: number,
  p75: number
): BenchmarkComparison["positionInMarket"] {
  if (salary < p25) return "BELOW_P25"
  if (salary < median) return "P25_P50"
  if (salary < p75) return "P50_P75"
  return "ABOVE_P75"
}

/**
 * Calculează compa-ratio: salariu / mediană piață * 100.
 * 100 = la mediană, <100 = sub piață, >100 = peste piață.
 */
export function compaRatio(salary: number, marketMedian: number): number {
  if (marketMedian <= 0) return 0
  return Math.round((salary / marketMedian) * 100)
}

/**
 * Generează recomandare text pe baza poziției în piață.
 */
export function getRecommendation(
  position: BenchmarkComparison["positionInMarket"],
  cr: number,
  jobFamily: string
): string {
  switch (position) {
    case "BELOW_P25":
      return `Salariul este semnificativ sub piață (compa-ratio ${cr}%). ` +
        `Risc ridicat de fluctuație. Se recomandă ajustare prioritară pentru familia ${jobFamily}.`
    case "P25_P50":
      return `Salariul este sub mediana pieței (compa-ratio ${cr}%). ` +
        `Se recomandă plan de aliniere în 6-12 luni.`
    case "P50_P75":
      return `Salariul este competitiv, în zona mediană-P75 (compa-ratio ${cr}%). ` +
        `Poziționare bună pentru retenție.`
    case "ABOVE_P75":
      return `Salariul depășește percentila 75 a pieței (compa-ratio ${cr}%). ` +
        `Se recomandă verificare: performanță excepțională sau supraplată?`
    default:
      return "Date insuficiente pentru comparație."
  }
}

/**
 * Compară un salariu intern cu datele de piață pentru un grad dat.
 */
export function compareSalaryToMarket(
  jobTitle: string,
  grade: number,
  gradeLabel: string,
  internalSalary: number | undefined,
  marketData: { salaryP25: number; salaryMedian: number; salaryP75: number },
  jobFamily: string
): BenchmarkComparison {
  const cr = internalSalary ? compaRatio(internalSalary, marketData.salaryMedian) : undefined
  const position = internalSalary
    ? getMarketPosition(internalSalary, marketData.salaryP25, marketData.salaryMedian, marketData.salaryP75)
    : "UNKNOWN"

  return {
    jobTitle,
    grade,
    gradeLabel,
    internalSalary,
    marketP25: marketData.salaryP25,
    marketMedian: marketData.salaryMedian,
    marketP75: marketData.salaryP75,
    compaRatio: cr,
    positionInMarket: position,
    recommendation: cr
      ? getRecommendation(position, cr, jobFamily)
      : "Nu există salariu intern pentru comparație.",
  }
}
