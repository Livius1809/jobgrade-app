/**
 * dosage-calibrator.ts — Calibrarea dozei de cunoaștere
 *
 * Clientul primește cunoaștere în doze adaptate capacității sale
 * de integrare în tabloul propriei conștientizări.
 *
 * Nu e despre CÂT poate citi. E despre CÂT poate INTEGRA.
 *
 * Factori de dozare:
 *   1. Faza spirală — crisalida suportă mai puțină profunzime
 *   2. Etapa competenței — inconștient incompetent ≠ conștient competent
 *   3. Hawkins — sub 200 (emoție reactivă) vs. peste 200 (procesare rațională)
 *   4. Ritmul personal — frecvența sesiunilor, consistența revenirii
 *   5. Reziliența observată — cum a reacționat la provocări anterioare
 *   6. Herrmann — cadranul dominant dictează forma, nu doar conținutul
 *
 * Principiu: MAI BINE prea puțin decât prea mult.
 * Un insight integrat valorează mai mult decât 10 primite și ignorate.
 */

import type { CognitiveProfile } from "./cognitive-adapter"

// ── Nivelul de dozaj ───────────────────────────────────────────────────────

export type DosageLevel =
  | "SEED"       // O singură întrebare simplă. Fără profunzime forțată.
  | "SPROUT"     // Întrebare + o nuanță. Puțin mai adânc.
  | "GROWING"    // Întrebare provocatoare. Poate destabiliza ușor.
  | "DEEPENING"  // Confruntare blândă. Profunzime reală.
  | "FULL"       // Întrebare din Fază 2. Maximă profunzime suportabilă.

export interface DosageConfig {
  level: DosageLevel
  /** Profunzimea maximă permisă (1-5) */
  maxDepth: number
  /** Câte prompt-uri pe sesiune (nu inunda) */
  promptsPerSession: number
  /** Timp minim între sesiuni de journaling (ore) */
  minIntervalHours: number
  /** Sugestie: oferă varianta extinsă doar dacă clientul cere */
  offerExtendedOnly: boolean
  /** Explicația internă a nivelului */
  rationale: string
}

/**
 * Calculează doza de cunoaștere pe care clientul o poate integra ACUM.
 *
 * Nu e despre ce VREA — e despre ce POATE procesa fără să blocheze.
 */
export function calibrateDosage(
  profile: CognitiveProfile,
  sessionHistory: {
    totalSessions: number
    lastSessionDaysAgo: number
    avgSessionsPerWeek: number
    regressionCount: number // câte regresii pe spirală a avut
    lastMilestoneType?: string // ultimul tip de jalon atins
  }
): DosageConfig {
  const { spiralPhase, competenceStage, hawkinsEstimate } = profile
  const { totalSessions, lastSessionDaysAgo, avgSessionsPerWeek, regressionCount } = sessionHistory

  // ── Factori de calcul ──────────────────────────────────────────────

  // Factor 1: Faza spirală
  const phaseScore: Record<typeof spiralPhase, number> = {
    CHRYSALIS: 1,
    BUTTERFLY: 2,
    FLIGHT: 3,
    LEAP: 4,
  }

  // Factor 2: Etapa competenței
  // Etapa 2 (conștient incompetent) e CEA MAI VULNERABILĂ
  // — clientul tocmai a văzut ce nu știa. Doza mai mică.
  const stageScore: Record<number, number> = {
    1: 1.0, // inconștient incompetent — deschide ușor
    2: 0.7, // conștient incompetent — VULNERABIL, dozează atent
    3: 1.2, // conștient competent — poate mai mult
    4: 1.5, // inconștient competent — integrare naturală
  }

  // Factor 3: Hawkins
  const hawkinsScore = hawkinsEstimate >= 350 ? 1.5  // Acceptare — procesare profundă
    : hawkinsEstimate >= 200 ? 1.2                     // Curaj — deschis dar fragil
    : hawkinsEstimate >= 150 ? 0.8                     // Mândrie — rezistă la profunzime
    : 0.6                                               // Sub 150 — emoție dominantă

  // Factor 4: Ritm personal
  const rhythmScore = avgSessionsPerWeek >= 3 ? 1.3   // Angajat, constant
    : avgSessionsPerWeek >= 1 ? 1.0                     // Moderat
    : lastSessionDaysAgo > 14 ? 0.6                     // S-a depărtat — nu forța
    : 0.8                                               // Sporadic

  // Factor 5: Reziliență
  const resilienceScore = regressionCount === 0 ? 1.1  // Nicio regresie — stabil
    : regressionCount <= 2 ? 1.0                        // Normal — regresiile sunt parte din drum
    : 0.7                                               // Multiple regresii — dozează cu grijă

  // ── Calcul nivel ──────────────────────────────────────────────────

  const rawScore = phaseScore[spiralPhase]
    * (stageScore[competenceStage] || 1)
    * hawkinsScore
    * rhythmScore
    * resilienceScore

  // Prima sesiune — mereu SEED
  if (totalSessions <= 1) {
    return {
      level: "SEED",
      maxDepth: 1,
      promptsPerSession: 1,
      minIntervalHours: 24,
      offerExtendedOnly: true,
      rationale: "Prima sesiune — o singură întrebare, observăm reacția.",
    }
  }

  // Calculăm nivelul
  let level: DosageLevel
  let maxDepth: number
  let promptsPerSession: number
  let minIntervalHours: number

  if (rawScore < 0.8) {
    level = "SEED"
    maxDepth = 1
    promptsPerSession = 1
    minIntervalHours = 48 // mai rar — lasă timp de integrare
  } else if (rawScore < 1.2) {
    level = "SPROUT"
    maxDepth = 2
    promptsPerSession = 1
    minIntervalHours = 24
  } else if (rawScore < 2.0) {
    level = "GROWING"
    maxDepth = 3
    promptsPerSession = 2
    minIntervalHours = 12
  } else if (rawScore < 3.0) {
    level = "DEEPENING"
    maxDepth = 4
    promptsPerSession = 2
    minIntervalHours = 8
  } else {
    level = "FULL"
    maxDepth = 5
    promptsPerSession = 3
    minIntervalHours = 4
  }

  // Etapa 2 override: MEREU oferi varianta extinsă doar la cerere
  const offerExtendedOnly = competenceStage === 2 || level === "SEED" || level === "SPROUT"

  return {
    level,
    maxDepth,
    promptsPerSession,
    minIntervalHours,
    offerExtendedOnly,
    rationale: `Score: ${rawScore.toFixed(2)} (fază: ${spiralPhase}, etapă: ${competenceStage}, Hawkins: ~${hawkinsEstimate}, ritm: ${avgSessionsPerWeek}/săpt, regresii: ${regressionCount})`,
  }
}

/**
 * Verifică dacă e momentul potrivit pentru un nou prompt de journaling.
 *
 * Returnează null dacă DA, sau motivul dacă NU.
 */
export function shouldOfferJournal(
  dosage: DosageConfig,
  lastJournalAt: Date | null,
  journalsToday: number
): string | null {
  // Interval minim nerespect
  if (lastJournalAt) {
    const hoursSince = (Date.now() - lastJournalAt.getTime()) / (1000 * 60 * 60)
    if (hoursSince < dosage.minIntervalHours) {
      return `Interval minim ${dosage.minIntervalHours}h — mai ${Math.ceil(dosage.minIntervalHours - hoursSince)}h de așteptat`
    }
  }

  // Limita zilnică
  if (journalsToday >= dosage.promptsPerSession) {
    return `Limita zilnică atinsă (${dosage.promptsPerSession} prompts/zi la nivel ${dosage.level})`
  }

  return null // DA, e momentul potrivit
}
