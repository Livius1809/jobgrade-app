/**
 * Company Profiler — Maturitate organizațională
 *
 * Determină ce nivel a atins firma cu datele reale
 * și ce servicii se deblochează la fiecare nivel.
 */

import type { DataPointPresence, MaturityLevel, MaturityState, ServiceReadiness, ServiceType } from "./types"

const SERVICE_REQUIREMENTS: Record<ServiceType, {
  level: 1 | 2 | 3
  check: (d: DataPointPresence) => boolean
  missing: (d: DataPointPresence) => string[]
  reportSections: string[]
}> = {
  JOB_EVALUATION: {
    level: 1,
    check: d => d.jobCount >= 2,
    missing: d => d.jobCount < 2 ? [`Adăugați cel puțin 2 posturi (aveți ${d.jobCount})`] : [],
    reportSections: ["Alinierea postului cu misiunea organizației", "Coerența criteriilor de evaluare cu valorile declarate"],
  },
  JOB_DESCRIPTION_AI: {
    level: 1,
    check: d => d.hasCaen && d.jobCount >= 1,
    missing: d => {
      const m: string[] = []
      if (!d.hasCaen) m.push("Completați codul CAEN")
      if (d.jobCount < 1) m.push("Adăugați cel puțin un post")
      return m
    },
    reportSections: ["Relevanța atribuțiilor față de obiectul de activitate"],
  },
  PAY_GAP_ANALYSIS: {
    level: 1,
    check: d => d.evaluationSessionsCompleted >= 1 && d.hasSalaryStructure,
    missing: d => {
      const m: string[] = []
      if (d.evaluationSessionsCompleted < 1) m.push("Finalizați cel puțin o sesiune de evaluare")
      if (!d.hasSalaryStructure) m.push("Configurați structura salarială")
      return m
    },
    reportSections: ["Conformitate salarială EU 2023/970", "Justificări aliniate cu valorile organizației"],
  },
  SALARY_BENCHMARK: {
    level: 2,
    check: d => d.evaluationSessionsCompleted >= 1 && d.hasSalaryStructure,
    missing: d => {
      const m: string[] = []
      if (d.evaluationSessionsCompleted < 1) m.push("Finalizați o sesiune de evaluare")
      if (!d.hasSalaryStructure) m.push("Configurați structura salarială")
      return m
    },
    reportSections: ["Poziționarea pe piață reflectă viziunea", "Competitivitate vs. aspirație declarată"],
  },
  PAY_GAP_MEDIATION: {
    level: 2,
    check: d => d.hasPayGapAnalysis,
    missing: d => !d.hasPayGapAnalysis ? ["Rulați mai întâi analiza pay gap (N1)"] : [],
    reportSections: ["Context valoric al diferențelor salariale", "Recomandări aliniate cu misiunea"],
  },
  CULTURE_AUDIT: {
    level: 3,
    check: d => d.hasValues && d.evaluationSessionsCompleted >= 1 && d.jobsWithDescriptions >= 3,
    missing: d => {
      const m: string[] = []
      if (!d.hasValues) m.push("Validați valorile organizației")
      if (d.evaluationSessionsCompleted < 1) m.push("Finalizați o sesiune de evaluare")
      if (d.jobsWithDescriptions < 3) m.push(`Completați fișe de post (aveți ${d.jobsWithDescriptions}, minim 3)`)
      return m
    },
    reportSections: ["Audit cultură: valori declarate vs. practicate", "Harta culturală pe departamente"],
  },
  PERFORMANCE_SYSTEM: {
    level: 3,
    check: d => d.hasKPIs && d.hasValues,
    missing: d => {
      const m: string[] = []
      if (!d.hasKPIs) m.push("Definiți KPI-uri")
      if (!d.hasValues) m.push("Validați valorile organizației")
      return m
    },
    reportSections: ["Alinierea KPI cu valorile", "Coerența compensare-performanță"],
  },
  DEVELOPMENT_PLAN: {
    level: 3,
    check: d => d.hasMission && d.hasVision && d.hasValues && d.evaluationSessionsCompleted >= 1,
    missing: d => {
      const m: string[] = []
      if (!d.hasMission) m.push("Validați misiunea")
      if (!d.hasVision) m.push("Validați viziunea")
      if (!d.hasValues) m.push("Validați valorile")
      if (d.evaluationSessionsCompleted < 1) m.push("Finalizați o sesiune de evaluare")
      return m
    },
    reportSections: ["Plan dezvoltare derivat din MVV", "Priorități de creștere aliniate cu viziunea"],
  },
}

/**
 * Calculează nivelul de maturitate din date concrete
 */
export function computeMaturityLevel(data: DataPointPresence): MaturityLevel {
  // COMPLETE: MVV validat + date operaționale consistente
  if (data.hasMission && data.hasVision && data.hasValues &&
      data.evaluationSessionsCompleted >= 1 && data.hasSalaryStructure) {
    return "COMPLETE"
  }
  // SUBSTANTIAL: benchmark sau pay gap + structură salarială
  if ((data.hasBenchmark || data.hasPayGapAnalysis) && data.hasSalaryStructure) {
    return "SUBSTANTIAL"
  }
  // PARTIAL: structură salarială sau sesiuni completate
  if (data.hasSalaryStructure || data.evaluationSessionsCompleted >= 1) {
    return "PARTIAL"
  }
  // EMERGENT: are fișe de post sau posturi suficiente
  if (data.jobsWithDescriptions >= 1 || data.jobCount >= 3) {
    return "EMERGENT"
  }
  return "IMPLICIT"
}

/**
 * Calculează scor numeric de maturitate (0-100)
 */
export function computeMaturityScore(data: DataPointPresence): number {
  let score = 0
  // Identitate (max 15)
  if (data.hasCaen) score += 5
  if (data.hasDescription) score += 5
  if (data.hasMission || data.hasVision || data.hasValues) score += 5
  // Structură (max 25)
  score += Math.min(data.jobCount * 3, 15)
  score += Math.min(data.jobsWithDescriptions * 2, 10)
  // Operațional (max 30)
  score += Math.min(data.evaluationSessionsCompleted * 10, 20)
  if (data.hasSalaryStructure) score += 10
  // Maturitate MVV (max 30)
  if (data.hasMission) score += 8
  if (data.hasVision) score += 7
  if (data.hasValues) score += 5
  if (data.hasBenchmark) score += 5
  if (data.hasKPIs) score += 5
  return Math.min(score, 100)
}

/**
 * Determină starea completă de maturitate
 */
export function computeMaturityState(data: DataPointPresence): MaturityState {
  const level = computeMaturityLevel(data)
  const score = computeMaturityScore(data)

  const services: ServiceReadiness[] = Object.entries(SERVICE_REQUIREMENTS).map(([key, req]) => ({
    service: key as ServiceType,
    level: req.level,
    ready: req.check(data),
    missing: req.missing(data),
    reportSections: req.check(data) ? req.reportSections : [],
  }))

  // Ce lipsește pentru nivelul următor
  const nextReqs: string[] = []
  if (level === "IMPLICIT") {
    if (data.jobCount < 3) nextReqs.push(`Adăugați posturi (aveți ${data.jobCount}, trebuie minim 3)`)
    if (!data.hasCaen) nextReqs.push("Completați codul CAEN")
  } else if (level === "EMERGENT") {
    if (data.evaluationSessionsCompleted < 1) nextReqs.push("Finalizați o sesiune de evaluare")
    if (!data.hasSalaryStructure) nextReqs.push("Configurați structura salarială")
  } else if (level === "PARTIAL") {
    if (!data.hasBenchmark) nextReqs.push("Rulați un benchmark salarial")
    if (!data.hasPayGapAnalysis) nextReqs.push("Rulați analiza pay gap")
  } else if (level === "SUBSTANTIAL") {
    if (!data.hasMission) nextReqs.push("Validați misiunea organizației")
    if (!data.hasVision) nextReqs.push("Validați viziunea")
    if (!data.hasValues) nextReqs.push("Validați valorile")
  }

  return { level, score, dataPoints: data, unlockedServices: services, nextLevelRequirements: nextReqs }
}
