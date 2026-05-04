/**
 * N3: PROFILER ORGANIZAȚIONAL — firma ca organism
 *
 * Integrează N2 (toți angajații) + structură + cultură + procese + piață.
 *
 * Vede ce N2 nu vede:
 * - 10 oameni buni individual DAR cultură toxică = performanță slabă
 * - Structură bună DAR procese ineficiente = risipă
 * - Oameni și procese bune DAR piață în scădere = adaptare necesară
 *
 * Consumă din:
 * - N2 Individual (profiluri angajați)
 * - JE Process Engine (evaluare posturi)
 * - Culture Audit (7 dimensiuni)
 * - Benchmark Engine (salarii piață)
 * - Psychometrics Battery (rezultate echipă)
 * - Motor Teritorial (context piață)
 */

import { prisma } from "@/lib/prisma"
import { IndividualProfiler, type IndividualProfile } from "./n2-individual"

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface OrganizationalProfile {
  entityId: string  // tenant ID
  entityType: "ORGANIZATION"

  /** Profiluri N2 ale angajaților (agregate, nu individuale) */
  workforce: {
    totalEmployees: number
    profiledEmployees: number
    avgMaturity: string
    dominantCognitiveStyle?: string
    tensionsDetected: number
    topTrainingNeeds: string[]
  }

  /** Structură organizațională */
  structure: {
    totalJobs: number
    evaluatedJobs: number
    grades: number
    avgGrade: number
    structureHealth: "SANATOASA" | "PARTIALA" | "NESTRUCTURATA"
  }

  /** Cultură (din audit C4) */
  culture?: {
    overallScore: number
    dimensions: Record<string, number>
    strongestDimension: string
    weakestDimension: string
    roCalibrated: boolean
  }

  /** Piață (din Motor Teritorial) */
  marketContext?: {
    territory: string
    sectorPosition: string
    competitionLevel: string
    marketTrend: string
  }

  /** Sănătatea organizației ca organism */
  organismHealth: {
    score: number  // 0-10
    diagnosis: string
    strengths: string[]
    weaknesses: string[]
    prescription: string[]
  }
}

// ═══════════════════════════════════════════════════════════════
// ORGANIZATIONAL PROFILER
// ═══════════════════════════════════════════════════════════════

export const OrganizationalProfiler = {
  /**
   * Construiește profilul organizațional complet.
   * Agregă N2 + structură + cultură + piață.
   */
  async buildProfile(tenantId: string): Promise<OrganizationalProfile> {
    // Date organizaționale
    const [tenant, jobs, sessions, employees] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: tenantId } }),
      prisma.job.findMany({ where: { tenantId } }),
      prisma.evaluationSession.findMany({
        where: { tenantId, status: "COMPLETED" },
        orderBy: { updatedAt: "desc" },
        take: 1,
      }),
      (prisma as any).employee?.findMany?.({ where: { tenantId } }).catch(() => []),
    ])

    const evaluatedJobs = jobs.filter((j: any) => j.totalScore > 0).length
    const grades = await prisma.salaryGrade.findMany({ where: { tenantId } })

    // Structură
    const structure: OrganizationalProfile["structure"] = {
      totalJobs: jobs.length,
      evaluatedJobs,
      grades: grades.length,
      avgGrade: grades.length > 0
        ? Math.round(grades.reduce((s, g) => s + g.order, 0) / grades.length * 10) / 10
        : 0,
      structureHealth: evaluatedJobs === jobs.length && jobs.length > 0
        ? "SANATOASA"
        : evaluatedJobs > 0
          ? "PARTIALA"
          : "NESTRUCTURATA",
    }

    // Workforce (agregate)
    const workforce: OrganizationalProfile["workforce"] = {
      totalEmployees: (employees as any[])?.length || 0,
      profiledEmployees: 0, // TODO: count employees with N2 profiles
      avgMaturity: "DEVELOPING",
      tensionsDetected: 0,
      topTrainingNeeds: [],
    }

    // Sănătatea organismului
    const organismHealth = diagnoseOrganism(structure, workforce)

    return {
      entityId: tenantId,
      entityType: "ORGANIZATION",
      workforce,
      structure,
      organismHealth,
    }
  },
}

function diagnoseOrganism(
  structure: OrganizationalProfile["structure"],
  workforce: OrganizationalProfile["workforce"]
): OrganizationalProfile["organismHealth"] {
  let score = 5 // baza
  const strengths: string[] = []
  const weaknesses: string[] = []
  const prescription: string[] = []

  if (structure.structureHealth === "SANATOASA") {
    score += 2
    strengths.push("Toate posturile evaluate — structură completă")
  } else if (structure.structureHealth === "NESTRUCTURATA") {
    score -= 2
    weaknesses.push("Zero posturi evaluate — organizație nestructurată")
    prescription.push("Prioritar: evaluare posturi (C1) pentru fundament")
  }

  if (structure.grades > 0) {
    score += 1
    strengths.push("Grilă salarială formată")
  } else {
    weaknesses.push("Fără grilă salarială — risc conformitate EU")
    prescription.push("Formare grilă salarială (C2) pentru conformitate Directiva EU 2023/970")
  }

  if (workforce.totalEmployees > 0 && workforce.profiledEmployees / workforce.totalEmployees > 0.5) {
    score += 1
    strengths.push("Peste 50% angajați profilați")
  }

  return {
    score: Math.max(1, Math.min(10, score)),
    diagnosis: score >= 7 ? "Organism sănătos — focalizare pe optimizare" :
      score >= 4 ? "Organism în dezvoltare — necesită structurare" :
      "Organism fragil — necesită fundament urgent",
    strengths,
    weaknesses,
    prescription,
  }
}
