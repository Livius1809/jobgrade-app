/**
 * matching-engine.ts — Matching bilateral B2C↔B2B pe 6 criterii JobGrade
 *
 * Profil candidat (din CV, format fișă post) vs. Cerințe post (de la angajator B2B)
 * Scor pe cele 6 criterii → raport compatibilitate bilateral
 *
 * Refolosește scoring-table.ts (aceleași punctaje, aceleași niveluri)
 */

import { CRITERION_DESCRIPTIONS, CRITERION_LABELS } from "@/lib/evaluation/criterion-descriptions"

// ── Tipuri ───────────────────────────────────────────────────

export interface CriteriaProfile {
  Knowledge?: string      // A-G
  Communications?: string // A-E
  ProblemSolving?: string // A-G
  DecisionMaking?: string // A-G
  BusinessImpact?: string // A-D
  WorkingConditions?: string // A-C
}

export interface MatchResult {
  overallScore: number  // 0-100
  overallMatch: "EXCELENT" | "BUN" | "PARTIAL" | "SLAB"
  criteria: Array<{
    criterion: string
    label: string
    candidateLevel: string
    jobLevel: string
    match: "ABOVE" | "MATCH" | "CLOSE" | "GAP"
    gap: number // negativ = sub cerință, pozitiv = peste
    recommendation: string
  }>
  summary: string
  forCandidate: string   // ce vede B2C
  forEmployer: string    // ce vede B2B
}

// ── Nivel → index numeric ────────────────────────────────────

const LEVEL_INDEX: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7,
}

function levelToIndex(level: string | undefined): number {
  return LEVEL_INDEX[level?.toUpperCase() || ""] || 0
}

// ── Matching ────────────────────────────────────────────────

export function matchProfiles(
  candidateProfile: CriteriaProfile,
  jobProfile: CriteriaProfile,
): MatchResult {
  const criteria: MatchResult["criteria"] = []
  let totalScore = 0
  let maxScore = 0

  const CRITERIA_KEYS = [
    "Knowledge", "Communications", "ProblemSolving",
    "DecisionMaking", "BusinessImpact", "WorkingConditions",
  ] as const

  const WEIGHTS: Record<string, number> = {
    Knowledge: 25, Communications: 15, ProblemSolving: 20,
    DecisionMaking: 20, BusinessImpact: 15, WorkingConditions: 5,
  }

  for (const key of CRITERIA_KEYS) {
    const candidateLevel = candidateProfile[key] || "nedeterminat"
    const jobLevel = jobProfile[key] || "nedeterminat"
    const weight = WEIGHTS[key]
    maxScore += weight

    if (candidateLevel === "nedeterminat" || jobLevel === "nedeterminat") {
      criteria.push({
        criterion: key,
        label: CRITERION_LABELS[key] || key,
        candidateLevel, jobLevel,
        match: "GAP", gap: 0,
        recommendation: "Date insuficiente pentru evaluare pe acest criteriu.",
      })
      continue
    }

    const cIdx = levelToIndex(candidateLevel)
    const jIdx = levelToIndex(jobLevel)
    const gap = cIdx - jIdx

    let match: "ABOVE" | "MATCH" | "CLOSE" | "GAP"
    let score: number
    let recommendation: string

    if (gap >= 1) {
      match = "ABOVE"
      score = weight
      recommendation = `Depășești cerințele (${candidateLevel} vs. ${jobLevel}). Punct forte — evidențiază-l.`
    } else if (gap === 0) {
      match = "MATCH"
      score = weight
      recommendation = `Potrivire exactă pe acest criteriu.`
    } else if (gap === -1) {
      match = "CLOSE"
      score = Math.round(weight * 0.7)
      recommendation = `Aproape de cerință (${candidateLevel} vs. ${jobLevel}). Cu puțin efort se poate acoperi.`
    } else {
      match = "GAP"
      score = Math.round(weight * Math.max(0.1, 1 + gap * 0.2))
      recommendation = `Diferență semnificativă (${candidateLevel} vs. ${jobLevel}). Necesită dezvoltare sau experiență suplimentară.`
    }

    totalScore += score
    criteria.push({
      criterion: key, label: CRITERION_LABELS[key] || key,
      candidateLevel, jobLevel, match, gap, recommendation,
    })
  }

  const overallScore = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0

  const overallMatch = overallScore >= 85 ? "EXCELENT"
    : overallScore >= 65 ? "BUN"
    : overallScore >= 45 ? "PARTIAL"
    : "SLAB"

  const matchCount = criteria.filter(c => c.match === "MATCH" || c.match === "ABOVE").length
  const gapCount = criteria.filter(c => c.match === "GAP").length

  const summary = `Compatibilitate ${overallScore}% (${overallMatch}). ${matchCount} criterii acoperite, ${gapCount} cu diferențe.`

  const forCandidate = matchCount >= 4
    ? `Profilul tău se potrivește bine cu acest post. ${gapCount > 0 ? `Există ${gapCount} zone unde poți crește.` : "Toate criteriile sunt acoperite."}`
    : gapCount >= 3
      ? `Acest post necesită competențe pe care le poți dezvolta. Concentrează-te pe: ${criteria.filter(c => c.match === "GAP").map(c => c.label).join(", ")}.`
      : `Potrivire parțială. Punctele tale forte: ${criteria.filter(c => c.match === "ABOVE" || c.match === "MATCH").map(c => c.label).join(", ")}.`

  const forEmployer = matchCount >= 4
    ? `Candidat compatibil (${overallScore}%). Acoperă ${matchCount}/6 criterii. ${criteria.filter(c => c.match === "ABOVE").length > 0 ? `Depășește cerințele pe: ${criteria.filter(c => c.match === "ABOVE").map(c => c.label).join(", ")}.` : ""}`
    : `Potrivire parțială (${overallScore}%). Gap-uri pe: ${criteria.filter(c => c.match === "GAP" || c.match === "CLOSE").map(c => c.label).join(", ")}.`

  return { overallScore, overallMatch, criteria, summary, forCandidate, forEmployer }
}
