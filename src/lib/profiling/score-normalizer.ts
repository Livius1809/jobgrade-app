/**
 * Score Normalizer — normalizare scoruri eterogene pe scala comuna
 *
 * Fiecare instrument psihometric are scala proprie:
 * - CPI 260: T-score (media 50, SD 10)
 * - AMI: Stanine (1-9, media 5, SD ~2)
 * - ESQ-2: Centile (0-100)
 * - PASAT: Centile (0-100)
 * - HBDI: Scale 1-100 pe 4 cadrane (A/B/C/D)
 * - MBTI: 4 dimensiuni dihotomice (E/I, S/N, T/F, J/P) + claritate
 * - CO: Media 1-7 cu praguri variabile per dimensiune
 * - Balint: Scor total + rang relativ la grup
 *
 * Scala comuna: T-score (media 50, SD 10) — standard in psihometrie
 * Cu etaloane de referinta acolo unde exista
 */

// ── Tipuri ──────────────────────────────────────────────

export interface NormalizedScore {
  instrumentId: string
  instrumentName: string
  scaleName: string
  rawScore: number | string
  normalizedT: number // T-score echivalent (30-70 range tipic)
  percentile: number // 0-100
  level: "FOARTE_SCAZUT" | "SCAZUT" | "MEDIU" | "RIDICAT" | "FOARTE_RIDICAT"
  referenceNorm: string | null // ex: "Etalon RO N=1600 feminin"
  confidence: number // 0-1, cat de siguri suntem pe normalizare
}

export interface IntegratedProfile {
  subjectCode: string
  subjectName: string
  scores: NormalizedScore[]
  // Trăsături agregate (din inferența inductivă)
  traits: IntegratedTrait[]
  // Profilul narativ (text generat)
  narrative: string | null
}

export interface IntegratedTrait {
  name: string
  category: "COGNITIV" | "EMOTIONAL" | "SOCIAL" | "MOTIVATIONAL" | "LEADERSHIP" | "INTEGRITATE"
  score: number // T-score mediu din scalele contribuitoare
  level: string
  sources: Array<{ instrument: string; scale: string; contribution: number }>
  description: string
}

// ── Conversii ──────────────────────────────────────────

/** Stanine (1-9) → T-score echivalent */
export function stanineToT(stanine: number): number {
  // Stanine: media=5, SD=2. T-score: media=50, SD=10
  return Math.round(50 + (stanine - 5) * 5)
}

/** Centile (0-100) → T-score echivalent (via z-score) */
export function centileToT(centile: number): number {
  // Aproximare: centila → z-score → T-score
  const clampedCentile = Math.max(1, Math.min(99, centile))
  // Tabel simplificat centile → z-score
  const z = centileToZ(clampedCentile)
  return Math.round(50 + z * 10)
}

function centileToZ(centile: number): number {
  // Aproximare Beasley-Springer-Moro pentru inversa distribuției normale
  const p = centile / 100
  if (p <= 0.5) {
    const t = Math.sqrt(-2 * Math.log(p))
    return -(t - (2.515517 + 0.802853 * t + 0.010328 * t * t) / (1 + 1.432788 * t + 0.189269 * t * t + 0.001308 * t * t * t))
  } else {
    const t = Math.sqrt(-2 * Math.log(1 - p))
    return t - (2.515517 + 0.802853 * t + 0.010328 * t * t) / (1 + 1.432788 * t + 0.189269 * t * t + 0.001308 * t * t * t)
  }
}

/** Scala 1-7 (CO) → T-score echivalent */
export function scale7ToT(score: number, thresholds: [number, number, number, number]): number {
  // Mapare pe baza pragurilor dimensiunii
  // F.Slab < t[0] < Slab < t[1] < Mediu < t[2] < Intens < t[3] < F.Intens
  if (score <= thresholds[0]) return 30 + Math.round((score / thresholds[0]) * 5)
  if (score <= thresholds[1]) return 38 + Math.round(((score - thresholds[0]) / (thresholds[1] - thresholds[0])) * 7)
  if (score <= thresholds[2]) return 46 + Math.round(((score - thresholds[1]) / (thresholds[2] - thresholds[1])) * 8)
  if (score <= thresholds[3]) return 55 + Math.round(((score - thresholds[2]) / (thresholds[3] - thresholds[2])) * 10)
  return 65 + Math.round(((score - thresholds[3]) / (7 - thresholds[3])) * 5)
}

/** T-score → nivel interpretare */
export function tScoreToLevel(t: number): NormalizedScore["level"] {
  if (t < 35) return "FOARTE_SCAZUT"
  if (t < 45) return "SCAZUT"
  if (t < 55) return "MEDIU"
  if (t < 65) return "RIDICAT"
  return "FOARTE_RIDICAT"
}

/** T-score → percentila estimata */
export function tToPercentile(t: number): number {
  const z = (t - 50) / 10
  // Aproximare CDF normala
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429
  const p = 0.3275911
  const sign = z < 0 ? -1 : 1
  const x = Math.abs(z) / Math.sqrt(2)
  const t2 = 1 / (1 + p * x)
  const erf = 1 - ((((a5 * t2 + a4) * t2 + a3) * t2 + a2) * t2 + a1) * t2 * Math.exp(-x * x)
  return Math.round((0.5 * (1 + sign * erf)) * 100)
}

// ── Normalizare per instrument ──────────────────────────

export function normalizeCPI(scaleName: string, tScore: number, gender: "M" | "F" = "F"): NormalizedScore {
  return {
    instrumentId: "cpi260",
    instrumentName: "CPI 260",
    scaleName,
    rawScore: tScore,
    normalizedT: tScore, // CPI e deja T-score
    percentile: tToPercentile(tScore),
    level: tScoreToLevel(tScore),
    referenceNorm: `Etalon RO standard ${gender === "F" ? "feminin" : "masculin"} (N=1600)`,
    confidence: 0.95,
  }
}

export function normalizeAMI(scaleName: string, stanine: number): NormalizedScore {
  const t = stanineToT(stanine)
  return {
    instrumentId: "ami",
    instrumentName: "AMI",
    scaleName,
    rawScore: stanine,
    normalizedT: t,
    percentile: tToPercentile(t),
    level: tScoreToLevel(t),
    referenceNorm: "Etalon RO adulți (N=3600)",
    confidence: 0.90,
  }
}

export function normalizeESQ(scaleName: string, centile: number): NormalizedScore {
  const t = centileToT(centile)
  return {
    instrumentId: "esq2",
    instrumentName: "ESQ-2",
    scaleName,
    rawScore: centile,
    normalizedT: t,
    percentile: centile,
    level: tScoreToLevel(t),
    referenceNorm: "Etalon candidați selecție",
    confidence: 0.85,
  }
}

export function normalizePASAT(scaleName: string, centile: number): NormalizedScore {
  const t = centileToT(centile)
  return {
    instrumentId: "pasat",
    instrumentName: "PASAT 2000",
    scaleName,
    rawScore: centile,
    normalizedT: t,
    percentile: centile,
    level: tScoreToLevel(t),
    referenceNorm: "Etalon RO global (N=1119)",
    confidence: 0.85,
  }
}

export function normalizeHBDI(quadrant: "A" | "B" | "C" | "D", score: number): NormalizedScore {
  // HBDI: 1-100 per cadran, nu e distribuit normal — normalizare relativă
  const t = Math.round(30 + (score / 100) * 40) // mapare liniară 1-100 → 30-70
  return {
    instrumentId: "hbdi",
    instrumentName: "Herrmann HBDI",
    scaleName: `Cadran ${quadrant}`,
    rawScore: score,
    normalizedT: t,
    percentile: tToPercentile(t),
    level: tScoreToLevel(t),
    referenceNorm: "Norme Herrmann International",
    confidence: 0.80,
  }
}

export function normalizeCO(dimensionId: string, dimensionName: string, mean: number, thresholds: [number, number, number, number]): NormalizedScore {
  const t = scale7ToT(mean, thresholds)
  return {
    instrumentId: "co",
    instrumentName: "Climat Organizațional",
    scaleName: dimensionName,
    rawScore: mean,
    normalizedT: t,
    percentile: tToPercentile(t),
    level: tScoreToLevel(t),
    referenceNorm: "Norme interne (praguri per dimensiune)",
    confidence: 0.85,
  }
}

// ── Agregare trăsături din scoruri normalizate ──────────

/**
 * Mapare scale instrumente → trăsături integrate.
 * Fiecare trăsătură = media ponderată a scalelor contribuitoare.
 */
const TRAIT_MAP: Array<{
  name: string
  category: IntegratedTrait["category"]
  sources: Array<{ instrument: string; scales: string[]; weight: number }>
  description: string
}> = [
  {
    name: "Potențial de leadership",
    category: "LEADERSHIP",
    sources: [
      { instrument: "cpi260", scales: ["LP", "DO", "CS", "MP"], weight: 0.4 },
      { instrument: "ami", scales: ["DO", "EZ", "FU"], weight: 0.3 },
      { instrument: "pasat", scales: ["Asertivitate", "Incredere in propriile forte"], weight: 0.3 },
    ],
    description: "Capacitatea de a conduce, influența, încrederea în situații de autoritate",
  },
  {
    name: "Stabilitate emoțională",
    category: "EMOTIONAL",
    sources: [
      { instrument: "cpi260", scales: ["SC", "WB", "SA"], weight: 0.4 },
      { instrument: "esq2", scales: ["Satisfactia Muncii"], weight: 0.3 },
      { instrument: "pasat", scales: ["Rezistenta emotionala", "Stabilitate emotionala"], weight: 0.3 },
    ],
    description: "Echilibru emoțional, autocontrol, reziliență în fața stresului",
  },
  {
    name: "Orientare spre performanță",
    category: "MOTIVATIONAL",
    sources: [
      { instrument: "ami", scales: ["BE", "EN", "LS", "SK"], weight: 0.4 },
      { instrument: "cpi260", scales: ["AC", "AI", "WO"], weight: 0.3 },
      { instrument: "esq2", scales: ["Productivitate", "Acuratete"], weight: 0.3 },
    ],
    description: "Motivație pentru rezultate, perseverență, standarde de excelență",
  },
  {
    name: "Competență socială",
    category: "SOCIAL",
    sources: [
      { instrument: "cpi260", scales: ["SY", "SP", "EM", "TO"], weight: 0.4 },
      { instrument: "pasat", scales: ["Sociabilitate", "Senzitivitate psihologica"], weight: 0.3 },
      { instrument: "ami", scales: ["FX", "EN"], weight: 0.3 },
    ],
    description: "Abilități interpersonale, empatie, adaptabilitate socială",
  },
  {
    name: "Integritate profesională",
    category: "INTEGRITATE",
    sources: [
      { instrument: "esq2", scales: ["Risc de Comportament Contraproductiv"], weight: 0.5 },
      { instrument: "cpi260", scales: ["RE", "SO", "GI", "CM"], weight: 0.5 },
    ],
    description: "Onestitate, responsabilitate, aderență la norme etice",
  },
  {
    name: "Capacitate cognitivă",
    category: "COGNITIV",
    sources: [
      { instrument: "cpi260", scales: ["IE", "AI"], weight: 0.5 },
      { instrument: "ami", scales: ["LB", "SP"], weight: 0.3 },
      { instrument: "hbdi", scales: ["Cadran A"], weight: 0.2 },
    ],
    description: "Eficiență intelectuală, capacitate de analiză, dorința de învățare",
  },
]

/**
 * Construiește trăsăturile integrate din scoruri normalizate
 */
export function buildIntegratedTraits(scores: NormalizedScore[]): IntegratedTrait[] {
  return TRAIT_MAP.map(trait => {
    let totalWeight = 0
    let weightedSum = 0
    const sources: IntegratedTrait["sources"] = []

    for (const src of trait.sources) {
      const matchingScores = scores.filter(s =>
        s.instrumentId === src.instrument && src.scales.some(sc => s.scaleName.includes(sc))
      )
      if (matchingScores.length > 0) {
        const avgT = matchingScores.reduce((s, sc) => s + sc.normalizedT, 0) / matchingScores.length
        weightedSum += avgT * src.weight
        totalWeight += src.weight
        sources.push({
          instrument: src.instrument,
          scale: matchingScores.map(s => s.scaleName).join(", "),
          contribution: Math.round(avgT),
        })
      }
    }

    const score = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 50
    return {
      name: trait.name,
      category: trait.category,
      score,
      level: tScoreToLevel(score) === "FOARTE_SCAZUT" ? "Foarte scăzut" :
             tScoreToLevel(score) === "SCAZUT" ? "Scăzut" :
             tScoreToLevel(score) === "MEDIU" ? "Mediu" :
             tScoreToLevel(score) === "RIDICAT" ? "Ridicat" : "Foarte ridicat",
      sources,
      description: trait.description,
    }
  })
}
