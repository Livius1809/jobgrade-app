/**
 * PIE Score Normalizer — Normalizare, Clasificare, Gap Analysis
 *
 * Responsabilități:
 *  1. Normalizează scoruri din instrumente diferite pe scala comună T-score
 *  2. Clasifică scorurile relative la cerințele postului
 *  3. Calculează gap-uri (decalaje) persoană vs. cerințe
 *  4. Produce analiza de compatibilitate integrată
 *
 * Consumă funcțiile existente din src/lib/profiling/score-normalizer.ts
 * și le extinde cu logica de integrare PIE (person × position).
 */

import {
  type NormalizedScore,
  type SignificantScore,
  classifyAllScores,
  interpretScore,
  tScoreToLevel,
  isInverseScale,
  buildIntegratedTraits,
} from "@/lib/profiling/score-normalizer"

import type {
  PersonProfile,
  PositionProfile,
  OrganizationProfile,
  GapItem,
  GapAnalysis,
  GapSeverity,
} from "./types"

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

/** Praguri gap severity (în T-score delta) */
const GAP_THRESHOLDS = {
  CRITIC: -20,        // deficit > 2 SD
  SEMNIFICATIV: -15,  // deficit 1.5 SD
  MODERAT: -10,       // deficit 1 SD
  MINOR: -5,          // deficit 0.5 SD
  // >= -5 sau pozitiv = ALINIAT
}

/** Ponderi pe categorii de trăsături pentru scorul global */
const CATEGORY_WEIGHTS: Record<string, number> = {
  COGNITIV: 0.20,
  EMOTIONAL: 0.15,
  SOCIAL: 0.15,
  MOTIVATIONAL: 0.15,
  LEADERSHIP: 0.20,
  INTEGRITATE: 0.15,
}

/** Mapare competențe post → instrumente care le măsoară */
const COMPETENCE_INSTRUMENT_MAP: Record<string, Array<{ instrumentId: string; scales: string[] }>> = {
  "leadership": [
    { instrumentId: "cpi260", scales: ["LP", "DO", "CS", "MP"] },
    { instrumentId: "ami", scales: ["DO", "EZ", "FU"] },
  ],
  "comunicare": [
    { instrumentId: "cpi260", scales: ["SY", "SP", "EM"] },
    { instrumentId: "hbdi", scales: ["Cadran C", "Cadran D"] },
  ],
  "analiza": [
    { instrumentId: "cpi260", scales: ["IE", "AI"] },
    { instrumentId: "hbdi", scales: ["Cadran A"] },
    { instrumentId: "ami", scales: ["LB"] },
  ],
  "organizare": [
    { instrumentId: "cpi260", scales: ["AC", "WO", "RE"] },
    { instrumentId: "hbdi", scales: ["Cadran B"] },
  ],
  "creativitate": [
    { instrumentId: "hbdi", scales: ["Cadran D"] },
    { instrumentId: "cpi260", scales: ["FX", "AI"] },
  ],
  "integritate": [
    { instrumentId: "esq2", scales: ["Risc de Comportament Contraproductiv", "Furt", "Sabotaj"] },
    { instrumentId: "cpi260", scales: ["RE", "SO", "GI", "CM"] },
  ],
  "rezilienta": [
    { instrumentId: "cpi260", scales: ["SC", "WB", "SA"] },
    { instrumentId: "ami", scales: ["BE", "LS"] },
  ],
  "orientare_client": [
    { instrumentId: "cpi260", scales: ["EM", "TO", "SP"] },
    { instrumentId: "ami", scales: ["EN", "FX"] },
  ],
}

/** Timpul estimat de dezvoltare per gap severity */
const DEVELOPMENT_TIME: Record<GapSeverity, number> = {
  CRITIC: 18,
  SEMNIFICATIV: 12,
  MODERAT: 6,
  MINOR: 3,
  ALINIAT: 0,
}

/** Ce se poate dezvolta prin training */
const DEVELOPABLE_DIMENSIONS = new Set([
  "COGNITIV", "SOCIAL", "MOTIVATIONAL", "LEADERSHIP",
  "comunicare", "analiza", "organizare", "creativitate", "orientare_client", "rezilienta",
])

// ═══════════════════════════════════════════════════════════════
// GAP CALCULATION
// ═══════════════════════════════════════════════════════════════

/**
 * Determină severitatea unui gap pe baza delta T-score.
 */
function calculateGapSeverity(delta: number, inverse: boolean): GapSeverity {
  const effectiveDelta = inverse ? -delta : delta
  if (effectiveDelta <= GAP_THRESHOLDS.CRITIC) return "CRITIC"
  if (effectiveDelta <= GAP_THRESHOLDS.SEMNIFICATIV) return "SEMNIFICATIV"
  if (effectiveDelta <= GAP_THRESHOLDS.MODERAT) return "MODERAT"
  if (effectiveDelta <= GAP_THRESHOLDS.MINOR) return "MINOR"
  return "ALINIAT"
}

/**
 * Calculează scorul necesar din cerințele postului.
 * Convertește nivelul competenței cerute în T-score echivalent.
 */
function competenceLevelToT(level: "JUNIOR" | "MEDIU" | "SENIOR" | "EXPERT"): number {
  switch (level) {
    case "JUNIOR": return 40
    case "MEDIU": return 50
    case "SENIOR": return 60
    case "EXPERT": return 70
  }
}

/**
 * Mapare integrityThreshold → T-score minim acceptabil.
 */
function integrityThresholdToT(threshold: "STANDARD" | "RIDICAT" | "CRITIC"): number {
  switch (threshold) {
    case "STANDARD": return 45
    case "RIDICAT": return 55
    case "CRITIC": return 65
  }
}

// ═══════════════════════════════════════════════════════════════
// CORE FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Calculează gap analysis complet între persoană și post.
 * Compară scorurile normalizate ale persoanei cu cerințele postului.
 */
export function calculateGapAnalysis(
  person: PersonProfile,
  position: PositionProfile,
): GapAnalysis {
  const gaps: GapItem[] = []

  // 1. Gap pe competențe cerute de post
  for (const competence of position.requiredCompetences) {
    const requiredT = competenceLevelToT(competence.level)
    const competenceKey = competence.name.toLowerCase().replace(/\s+/g, "_")
    const instrumentMapping = COMPETENCE_INSTRUMENT_MAP[competenceKey]

    if (instrumentMapping) {
      // Căutăm scoruri relevante din bateria persoanei
      const relevantScores = person.scores.filter(s =>
        instrumentMapping.some(m =>
          m.instrumentId === s.instrumentId && m.scales.some(sc => s.scaleName.includes(sc))
        )
      )

      if (relevantScores.length > 0) {
        const avgActual = relevantScores.reduce((sum, s) => sum + s.normalizedT, 0) / relevantScores.length
        const delta = avgActual - requiredT
        const inverse = relevantScores.some(s => isInverseScale(s.instrumentId, s.scaleName))
        const severity = calculateGapSeverity(delta, inverse)

        gaps.push({
          dimension: competence.name,
          instrumentSource: relevantScores.map(s => s.instrumentName).join(", "),
          required: requiredT,
          actual: Math.round(avgActual),
          delta: Math.round(delta),
          severity,
          interpretation: buildGapInterpretation(competence.name, delta, severity),
          developable: DEVELOPABLE_DIMENSIONS.has(competenceKey),
          estimatedDevelopmentMonths: DEVELOPMENT_TIME[severity],
        })
      } else {
        // Nu avem date — marcăm ca gap nemasurat
        gaps.push({
          dimension: competence.name,
          instrumentSource: "Neevaluat",
          required: requiredT,
          actual: 0,
          delta: -requiredT,
          severity: "MODERAT",
          interpretation: `Nu există date psihometrice pentru ${competence.name}. Evaluare necesară.`,
          developable: true,
          estimatedDevelopmentMonths: undefined,
        })
      }
    }
  }

  // 2. Gap pe integritate (dacă postul cere nivel ridicat/critic)
  if (position.integrityThreshold !== "STANDARD") {
    const requiredIntegrity = integrityThresholdToT(position.integrityThreshold)
    const integrityScores = person.scores.filter(s =>
      s.instrumentId === "esq2" || (s.instrumentId === "cpi260" && ["RE", "SO", "GI", "CM"].some(sc => s.scaleName.includes(sc)))
    )

    if (integrityScores.length > 0) {
      // Pentru ESQ-2 scale inverse: scor MIC = bun
      const esqScores = integrityScores.filter(s => s.instrumentId === "esq2")
      const cpiScores = integrityScores.filter(s => s.instrumentId === "cpi260")

      // ESQ-2: invertim interpretarea (scor mare pe risc = rău)
      const esqAvg = esqScores.length > 0
        ? 100 - (esqScores.reduce((s, sc) => s + sc.normalizedT, 0) / esqScores.length)
        : null
      const cpiAvg = cpiScores.length > 0
        ? cpiScores.reduce((s, sc) => s + sc.normalizedT, 0) / cpiScores.length
        : null

      const avgIntegrity = esqAvg !== null && cpiAvg !== null
        ? (esqAvg * 0.6 + cpiAvg * 0.4)
        : (esqAvg ?? cpiAvg ?? 50)

      const delta = avgIntegrity - requiredIntegrity
      const severity = calculateGapSeverity(delta, false)

      gaps.push({
        dimension: "Integritate profesională",
        instrumentSource: integrityScores.map(s => s.instrumentName).join(", "),
        required: requiredIntegrity,
        actual: Math.round(avgIntegrity),
        delta: Math.round(delta),
        severity,
        interpretation: buildGapInterpretation("integritate", delta, severity),
        developable: false, // Integritatea nu se "dezvoltă" prin training
        estimatedDevelopmentMonths: undefined,
      })
    }
  }

  // 3. Gap pe stil cognitiv (dacă postul are preferință)
  if (position.preferredCognitiveStyle && person.cognitiveStyle) {
    const preferred = position.preferredCognitiveStyle
    const personDominant = person.cognitiveStyle.dominant
    const fit = preferred.includes(personDominant)

    if (!fit) {
      // Calculăm distanța cognitivă
      const preferredQuadrants = preferred.split("") as Array<"A" | "B" | "C" | "D">
      const maxPreferredScore = Math.max(...preferredQuadrants.map(q => person.cognitiveStyle!.quadrants[q] ?? 0))
      const dominantScore = person.cognitiveStyle.quadrants[personDominant] ?? 50
      const delta = maxPreferredScore - dominantScore

      gaps.push({
        dimension: "Stil cognitiv",
        instrumentSource: "Herrmann HBDI",
        required: 60, // T-score echivalent pentru "preferință clară"
        actual: Math.round(30 + (maxPreferredScore / 100) * 40), // Convertim HBDI → T
        delta: Math.round(delta / 2.5), // Scalăm pe delta semnificativă
        severity: Math.abs(delta) > 30 ? "SEMNIFICATIV" : "MODERAT",
        interpretation: `Postul necesită dominanță ${preferred}, persoana are dominanță ${personDominant}. ${Math.abs(delta) > 30 ? "Decalaj cognitiv important." : "Adaptare posibilă."}`,
        developable: false, // Stilul cognitiv e stabil
        estimatedDevelopmentMonths: undefined,
      })
    }
  }

  // 4. Gap pe leadership (dacă postul necesită)
  if (position.leadershipRequired) {
    const leadershipTraits = person.traits.filter(t => t.category === "LEADERSHIP")
    if (leadershipTraits.length > 0) {
      const avgLeadership = leadershipTraits.reduce((s, t) => s + t.score, 0) / leadershipTraits.length
      const requiredLeadership = 60 // T-score pentru leadership cerut
      const delta = avgLeadership - requiredLeadership
      const severity = calculateGapSeverity(delta, false)

      gaps.push({
        dimension: "Potențial de leadership",
        instrumentSource: leadershipTraits.flatMap(t => t.sources.map(s => s.instrument)).join(", "),
        required: requiredLeadership,
        actual: Math.round(avgLeadership),
        delta: Math.round(delta),
        severity,
        interpretation: buildGapInterpretation("leadership", delta, severity),
        developable: true,
        estimatedDevelopmentMonths: DEVELOPMENT_TIME[severity],
      })
    }
  }

  // Agregare per categorie
  const byCategory: GapAnalysis["byCategory"] = {}
  for (const gap of gaps) {
    const cat = gap.dimension
    if (!byCategory[cat]) {
      byCategory[cat] = { avgDelta: 0, gapCount: 0, worstGap: null }
    }
    byCategory[cat].avgDelta += gap.delta
    byCategory[cat].gapCount++
    if (!byCategory[cat].worstGap || gap.delta < byCategory[cat].worstGap.delta) {
      byCategory[cat].worstGap = gap
    }
  }
  for (const cat of Object.keys(byCategory)) {
    if (byCategory[cat].gapCount > 0) {
      byCategory[cat].avgDelta = Math.round(byCategory[cat].avgDelta / byCategory[cat].gapCount)
    }
  }

  const criticalGaps = gaps.filter(g => g.severity === "CRITIC" || g.severity === "SEMNIFICATIV").length
  const strengths = gaps.filter(g => g.delta > 5).length
  const alignments = gaps.filter(g => g.severity === "ALINIAT").length

  // Scor global fit: 100 - penalizare per gap
  const penaltyMap: Record<GapSeverity, number> = {
    CRITIC: 25,
    SEMNIFICATIV: 15,
    MODERAT: 8,
    MINOR: 3,
    ALINIAT: 0,
  }
  const totalPenalty = gaps.reduce((sum, g) => sum + penaltyMap[g.severity], 0)
  const overallFitScore = Math.max(0, Math.min(100, 100 - totalPenalty + strengths * 3))

  return {
    totalGaps: gaps.length,
    criticalGaps,
    strengths,
    alignments,
    overallFitScore,
    gaps,
    byCategory,
  }
}

/**
 * Calculează gap-uri culturale (persoană vs. organizație).
 */
export function calculateCulturalGaps(
  person: PersonProfile,
  organization: OrganizationProfile,
): GapItem[] {
  const culturalGaps: GapItem[] = []

  if (!organization.culture) return culturalGaps

  // Mapăm dimensiunile culturale pe scoruri persoană
  // Dimensiuni tipice CO: Comunicare, Inovare, Sprijin, Autonomie, Echitate, Presiune, Coeziune, Recunoaștere
  const cultureDimensionToTraitMap: Record<string, string[]> = {
    "Comunicare": ["Competență socială"],
    "Inovare": ["Capacitate cognitivă"],
    "Sprijin": ["Stabilitate emoțională", "Competență socială"],
    "Autonomie": ["Orientare spre performanță"],
    "Echitate": ["Integritate profesională"],
    "Presiune": ["Stabilitate emoțională"],
    "Coeziune": ["Competență socială"],
    "Recunoaștere": ["Orientare spre performanță"],
  }

  for (const dim of organization.culture.dimensions) {
    const mappedTraits = cultureDimensionToTraitMap[dim.name]
    if (!mappedTraits) continue

    const relevantTraits = person.traits.filter(t => mappedTraits.includes(t.name))
    if (relevantTraits.length === 0) continue

    const personAvg = relevantTraits.reduce((s, t) => s + t.score, 0) / relevantTraits.length
    // Convertim scorul cultural (care e pe scala 1-7 normalizat) la T-score
    const orgT = Math.round(30 + (dim.score / 7) * 40)
    const delta = personAvg - orgT

    // Cultura nu e "cerință" — un delta mare semnifică diferență de stil
    const absDelta = Math.abs(delta)
    const severity: GapSeverity = absDelta > 20 ? "SEMNIFICATIV" : absDelta > 10 ? "MODERAT" : "ALINIAT"

    if (severity !== "ALINIAT") {
      culturalGaps.push({
        dimension: `Fit cultural: ${dim.name}`,
        instrumentSource: relevantTraits.map(t => t.sources.map(s => s.instrument).join(", ")).join("; "),
        required: orgT,
        actual: Math.round(personAvg),
        delta: Math.round(delta),
        severity,
        interpretation: delta > 0
          ? `Persoana are o orientare mai puternică pe ${dim.name} decât cultura organizației. Poate fi agent de schimbare sau sursă de frustrare.`
          : `Persoana are o orientare mai slabă pe ${dim.name} decât cultura organizației. Adaptare necesară sau risc de neintegrare.`,
        developable: true,
        estimatedDevelopmentMonths: severity === "SEMNIFICATIV" ? 9 : 4,
      })
    }
  }

  return culturalGaps
}

/**
 * Clasifică scorurile persoanei relative la cerințele postului.
 * Returnează scoruri semnificative grupate.
 */
export function classifyPersonScores(person: PersonProfile): {
  excellence: SignificantScore[]
  development: SignificantScore[]
  inNorm: SignificantScore[]
} {
  return classifyAllScores(person.scores)
}

/**
 * Calculează scorul de compatibilitate stil cognitiv.
 */
export function calculateCognitiveFit(
  person: PersonProfile,
  position: PositionProfile,
): { fit: boolean; score: number; detail: string } {
  if (!person.cognitiveStyle || !position.preferredCognitiveStyle) {
    return { fit: true, score: 70, detail: "Date insuficiente pentru evaluarea stilului cognitiv. Se presupune compatibilitate." }
  }

  const preferred = position.preferredCognitiveStyle
  const personDominant = person.cognitiveStyle.dominant
  const quadrants = person.cognitiveStyle.quadrants

  // Verificăm dacă dominanța persoanei se potrivește cu cerința
  if (preferred.includes(personDominant)) {
    const dominantScore = quadrants[personDominant]
    const score = Math.min(100, 70 + Math.round(dominantScore / 3.3))
    return {
      fit: true,
      score,
      detail: `Stil cognitiv dominant ${personDominant} se potrivește cerinței postului (${preferred}). Scor cadran: ${dominantScore}/100.`,
    }
  }

  // Nu se potrivește direct — verificăm cadranul cerut
  const preferredQuadrants = preferred.split("") as Array<"A" | "B" | "C" | "D">
  const bestFitScore = Math.max(...preferredQuadrants.map(q => quadrants[q] ?? 0))
  const score = Math.round(30 + (bestFitScore / 100) * 40)

  return {
    fit: bestFitScore >= 50,
    score,
    detail: `Stil cognitiv dominant ${personDominant} diferit de cerința postului (${preferred}). Scorul pe cadranul cerut: ${bestFitScore}/100. ${bestFitScore >= 50 ? "Adaptare posibilă." : "Decalaj semnificativ."}`,
  }
}

/**
 * Calculează prognoza de retenție pe baza fit-ului integrat.
 */
export function calculateRetentionPrognosis(
  positionFitScore: number,
  cultureFitScore: number,
  person: PersonProfile,
): { estimatedMonths: number; riskFactors: string[]; protectiveFactors: string[] } {
  const riskFactors: string[] = []
  const protectiveFactors: string[] = []

  // Factori de risc
  if (positionFitScore < 50) riskFactors.push("Compatibilitate scăzută cu postul")
  if (cultureFitScore < 50) riskFactors.push("Compatibilitate culturală scăzută")
  if (person.maturityLevel === "NEWCOMER") riskFactors.push("Nivel maturitate scăzut — volatilitate decizională")

  const motivationTraits = person.traits.filter(t => t.category === "MOTIVATIONAL")
  if (motivationTraits.length > 0) {
    const avgMotivation = motivationTraits.reduce((s, t) => s + t.score, 0) / motivationTraits.length
    if (avgMotivation < 45) riskFactors.push("Motivație sub medie")
    if (avgMotivation > 60) protectiveFactors.push("Motivație ridicată")
  }

  // Factori protectivi
  if (positionFitScore > 70) protectiveFactors.push("Compatibilitate bună cu postul")
  if (cultureFitScore > 70) protectiveFactors.push("Aliniere culturală")
  if (person.maturityLevel === "INTEGRATED" || person.maturityLevel === "MATURING") {
    protectiveFactors.push("Maturitate profesională — stabilitate")
  }

  const integrityTraits = person.traits.filter(t => t.category === "INTEGRITATE")
  if (integrityTraits.length > 0) {
    const avgIntegrity = integrityTraits.reduce((s, t) => s + t.score, 0) / integrityTraits.length
    if (avgIntegrity > 55) protectiveFactors.push("Integritate ridicată — loialitate")
  }

  // Estimare luni: scor combinat → durată probabilă
  const combinedScore = positionFitScore * 0.5 + cultureFitScore * 0.3 + (person.maturityLevel === "INTEGRATED" ? 20 : person.maturityLevel === "MATURING" ? 15 : 10)
  let estimatedMonths: number
  if (combinedScore > 80) estimatedMonths = 48
  else if (combinedScore > 65) estimatedMonths = 30
  else if (combinedScore > 50) estimatedMonths = 18
  else if (combinedScore > 35) estimatedMonths = 9
  else estimatedMonths = 4

  return { estimatedMonths, riskFactors, protectiveFactors }
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function buildGapInterpretation(dimension: string, delta: number, severity: GapSeverity): string {
  if (severity === "ALINIAT") {
    return delta > 5
      ? `${dimension}: punct forte — persoana depășește cerințele postului (+${delta} puncte T-score).`
      : `${dimension}: aliniere bună cu cerințele postului.`
  }
  if (severity === "MINOR") {
    return `${dimension}: decalaj minor (${delta} puncte). Poate fi acoperit rapid prin practică sau coaching.`
  }
  if (severity === "MODERAT") {
    return `${dimension}: decalaj moderat (${delta} puncte). Necesită plan de dezvoltare structurat (training + mentorat).`
  }
  if (severity === "SEMNIFICATIV") {
    return `${dimension}: decalaj semnificativ (${delta} puncte). Dezvoltare intensivă necesară. Evaluare risc dacă postul e critic.`
  }
  return `${dimension}: decalaj critic (${delta} puncte). Incompatibilitate majoră. Redistribuire responsabilități sau alt candidat recomandat.`
}
