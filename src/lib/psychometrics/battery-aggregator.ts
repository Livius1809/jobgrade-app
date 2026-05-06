/**
 * Battery Aggregator — agreg scoruri din instrumente multiple intr-un profil unificat
 *
 * Converteste output-urile parserilor (CPI260, ESQ2, AMI, PASAT2000)
 * in formatul NormalizedScore si apeleaza buildIntegratedTraits() pentru
 * trasaturi agregate cross-instrument.
 *
 * CONSUM: battery-aggregator se apeleaza dupa ce TOATE instrumentele
 * dintr-o baterie au fost parsate si salvate in tenant storage.
 */

import {
  buildIntegratedTraits,
  normalizeCPI,
  normalizeAMI,
  normalizeESQ,
  normalizePASAT,
  tScoreToLevel,
  type NormalizedScore,
  type IntegratedTrait,
} from "@/lib/profiling/score-normalizer"

import type {
  PsychometricResult,
  CPI260Result,
  ESQ2Result,
  AMIResult,
  PASAT2000Result,
} from "@/lib/psychometrics/parsers/types"

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface BatteryResult {
  instrumentId: string
  scores: Array<{ name: string; tScore: number; percentile: number; category?: string }>
}

export interface AggregatedProfile {
  /** Trasaturi integrate calculate din buildIntegratedTraits() */
  integratedTraits: Array<{
    name: string
    category: string
    tScore: number
    sources: string[]
  }>
  /** Zone de excelenta (trasaturi cu scor ridicat) */
  strongAreas: string[]
  /** Zone de dezvoltare (trasaturi cu scor scazut) */
  developmentAreas: string[]
  /** Indicatori de risc din ESQ-2 */
  riskFlags: string[]
  /** Profil motivational din AMI */
  motivationProfile: string
  /** Profil atentie din PASAT */
  attentionProfile: string
  /** Grad de pregatire global 0-100 */
  overallReadiness: number
  /** Scoruri normalizate brute (pentru gap analysis) */
  normalizedScores: NormalizedScore[]
}

// ═══════════════════════════════════════════════════════════════
// CONVERSIE PARSER RESULTS → NORMALIZED SCORES
// ═══════════════════════════════════════════════════════════════

/**
 * Converteste un CPI260Result in NormalizedScore[].
 * CPI260 are deja T-scores pe fiecare scala.
 */
function convertCPI260(result: CPI260Result): NormalizedScore[] {
  return result.allScales.map(scale =>
    normalizeCPI(scale.abbreviation, scale.tScore, result.gender)
  )
}

/**
 * Converteste un ESQ2Result in NormalizedScore[].
 * ESQ-2 are centile pe 16 scale.
 */
function convertESQ2(result: ESQ2Result): NormalizedScore[] {
  return result.scales.map(scale =>
    normalizeESQ(scale.name, scale.centile)
  )
}

/**
 * Converteste un AMIResult in NormalizedScore[].
 * AMI are stanine pe 17 scale.
 */
function convertAMI(result: AMIResult): NormalizedScore[] {
  return result.scales.map(scale =>
    normalizeAMI(scale.name, scale.stanine)
  )
}

/**
 * Converteste un PASAT2000Result in NormalizedScore[].
 * PASAT are metrici + centile pe atentie sustinuta.
 */
function convertPASAT(result: PASAT2000Result): NormalizedScore[] {
  const scores: NormalizedScore[] = []

  // Scor atentie sustinuta
  scores.push(normalizePASAT("Atentie sustinuta", result.sustainedAttention.centile))

  // Metrici cu centile
  for (const metric of result.metrics) {
    if (metric.percentile !== null) {
      scores.push(normalizePASAT(metric.name, metric.percentile))
    }
  }

  return scores
}

/**
 * Converteste orice PsychometricResult in NormalizedScore[].
 */
function convertToNormalized(result: PsychometricResult): NormalizedScore[] {
  switch (result.instrumentId) {
    case "CPI_260":
      return convertCPI260(result as CPI260Result)
    case "ESQ_2":
      return convertESQ2(result as ESQ2Result)
    case "AMI":
      return convertAMI(result as AMIResult)
    case "PASAT_2000":
      return convertPASAT(result as PASAT2000Result)
    default:
      return []
  }
}

// ═══════════════════════════════════════════════════════════════
// INSTRUMENT-SPECIFIC INSIGHTS
// ═══════════════════════════════════════════════════════════════

/**
 * Extrage riskFlags din ESQ-2.
 * Scalele cu centile HIGH sau CRITICAL sunt indicatori de risc.
 */
function extractRiskFlags(results: PsychometricResult[]): string[] {
  const flags: string[] = []
  for (const r of results) {
    if (r.instrumentId !== "ESQ_2") continue
    const esq = r as ESQ2Result
    for (const indicator of esq.riskIndicators) {
      flags.push(`${indicator.name}: centila ${indicator.centile} — ${indicator.description}`)
    }
    if (esq.overallIntegrity.level === "HIGH" || esq.overallIntegrity.level === "CRITICAL") {
      flags.push(`Risc integritate ${esq.overallIntegrity.level}: centila ${esq.overallIntegrity.centile}`)
    }
  }
  return flags
}

/**
 * Determina profilul motivational din AMI.
 */
function extractMotivationProfile(results: PsychometricResult[]): string {
  for (const r of results) {
    if (r.instrumentId !== "AMI") continue
    const ami = r as AMIResult
    const cat = ami.motivationProfile.category
    const labels: Record<string, string> = {
      VERY_HIGH: "Motivatie foarte ridicata",
      HIGH: "Motivatie ridicata",
      MODERATE: "Motivatie moderata",
      LOW: "Motivatie scazuta",
    }
    return labels[cat] || `Motivatie: stanine mediu ${ami.motivationProfile.overall}`
  }
  return "Neevaluat"
}

/**
 * Determina profilul de atentie din PASAT.
 * Analizeaza viteza, acuratete si consistenta.
 */
function extractAttentionProfile(results: PsychometricResult[]): string {
  for (const r of results) {
    if (r.instrumentId !== "PASAT_2000") continue
    const pasat = r as PASAT2000Result

    const parts: string[] = []

    // Viteza (timp de reactie mediu)
    if (pasat.reactionTimes.mean < 400) {
      parts.push("viteza ridicata")
    } else if (pasat.reactionTimes.mean < 600) {
      parts.push("viteza medie")
    } else {
      parts.push("viteza scazuta")
    }

    // Acuratete (rata de eroare)
    if (pasat.errorRates.totalErrorPct < 5) {
      parts.push("acuratete excelenta")
    } else if (pasat.errorRates.totalErrorPct < 15) {
      parts.push("acuratete acceptabila")
    } else {
      parts.push("acuratete scazuta")
    }

    // Consistenta (variabilitate pe blocuri)
    if (pasat.blockConsistency.length >= 2) {
      const scores = pasat.blockConsistency.map(b => b.score)
      const mean = scores.reduce((a, b) => a + b, 0) / scores.length
      const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length
      const sd = Math.sqrt(variance)
      if (sd < mean * 0.1) {
        parts.push("consistenta ridicata")
      } else if (sd < mean * 0.25) {
        parts.push("consistenta moderata")
      } else {
        parts.push("consistenta scazuta (fluctuatii atentie)")
      }
    }

    return parts.join(", ")
  }
  return "Neevaluat"
}

// ═══════════════════════════════════════════════════════════════
// MAIN AGGREGATOR
// ═══════════════════════════════════════════════════════════════

/**
 * Agregeaza rezultatele dintr-o baterie psihometrica completa
 * intr-un profil unificat cu trasaturi integrate.
 *
 * @param results - Rezultatele parsate din instrumentele bateriei
 * @returns Profil agregat cu trasaturi, zone forte/dezvoltare, riskuri, motivatie, atentie
 */
export function aggregateBattery(results: BatteryResult[]): AggregatedProfile
export function aggregateBattery(results: PsychometricResult[]): AggregatedProfile
export function aggregateBattery(
  results: BatteryResult[] | PsychometricResult[]
): AggregatedProfile {
  // Detectam tipul de input si normalizam
  let normalizedScores: NormalizedScore[]
  let rawResults: PsychometricResult[]

  if (results.length === 0) {
    return emptyProfile()
  }

  // Daca primim PsychometricResult[] (au instrumentId ca string enum)
  if ("subjectCode" in results[0]) {
    rawResults = results as PsychometricResult[]
    normalizedScores = rawResults.flatMap(convertToNormalized)
  } else {
    // BatteryResult[] — convertim manual
    rawResults = []
    normalizedScores = (results as BatteryResult[]).flatMap(br =>
      br.scores.map(s => ({
        instrumentId: br.instrumentId.toLowerCase().replace(/_/g, ""),
        instrumentName: br.instrumentId,
        scaleName: s.name,
        rawScore: s.tScore,
        normalizedT: s.tScore,
        percentile: s.percentile,
        level: tScoreToLevel(s.tScore),
        referenceNorm: null,
        confidence: 0.8,
      }))
    )
  }

  // Construim trasaturi integrate via buildIntegratedTraits()
  const traits = buildIntegratedTraits(normalizedScores)

  // Mapam trasaturile pe formatul de iesire
  const integratedTraits = traits.map(t => ({
    name: t.name,
    category: t.category,
    tScore: t.score,
    sources: t.sources.map(s => s.instrument),
  }))

  // Zone de excelenta si dezvoltare
  const strongAreas = traits
    .filter(t => t.score >= 60)
    .sort((a, b) => b.score - a.score)
    .map(t => `${t.name} (T=${t.score})`)

  const developmentAreas = traits
    .filter(t => t.score < 40)
    .sort((a, b) => a.score - b.score)
    .map(t => `${t.name} (T=${t.score})`)

  // Instrument-specific insights
  const riskFlags = rawResults.length > 0 ? extractRiskFlags(rawResults) : []
  const motivationProfile = rawResults.length > 0 ? extractMotivationProfile(rawResults) : "Neevaluat"
  const attentionProfile = rawResults.length > 0 ? extractAttentionProfile(rawResults) : "Neevaluat"

  // Overall readiness: media ponderata a trasaturilor, scalata 0-100
  const avgTraitScore = traits.length > 0
    ? traits.reduce((sum, t) => sum + t.score, 0) / traits.length
    : 50
  // T-score 30-70 → 0-100 (cu clamp)
  const overallReadiness = Math.max(0, Math.min(100, Math.round((avgTraitScore - 30) * (100 / 40))))

  // Penalizare pentru riskFlags
  const riskPenalty = Math.min(30, riskFlags.length * 10)
  const adjustedReadiness = Math.max(0, overallReadiness - riskPenalty)

  return {
    integratedTraits,
    strongAreas,
    developmentAreas,
    riskFlags,
    motivationProfile,
    attentionProfile,
    overallReadiness: adjustedReadiness,
    normalizedScores,
  }
}

function emptyProfile(): AggregatedProfile {
  return {
    integratedTraits: [],
    strongAreas: [],
    developmentAreas: [],
    riskFlags: [],
    motivationProfile: "Neevaluat",
    attentionProfile: "Neevaluat",
    overallReadiness: 0,
    normalizedScores: [],
  }
}
