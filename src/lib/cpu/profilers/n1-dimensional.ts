/**
 * N1: PROFILER DIMENSIONAL — o dimensiune specifică
 *
 * Cel mai granular nivel. Profilare pe o singură axă, izolată.
 * Nu interpretează — doar MĂSOARĂ pe axa respectivă.
 *
 * Dimensiuni disponibile:
 * - Competențe (evaluare JG 6 criterii)
 * - Stil cognitiv (Herrmann HBDI — A/B/C/D)
 * - Tip personalitate (MBTI — 16 tipuri)
 * - Motivație (AMI — stanine → T-score)
 * - Integritate (ESQ-2 — centile → T-score)
 * - Leadership (CPI260 — 18 trăsături)
 * - Valori (VIA Character Strengths)
 * - Nivel conștiință (Hawkins — 0-1000)
 *
 * Acest modul e FACADE peste instrumentele existente.
 * Nu duplică cod — re-exportă funcții existente cu interfață unificată.
 */

// Re-export instrumente existente ca dimensiuni N1
// Fiecare instrument devine o "dimensiune" accesibilă uniform

import { scoreHermann } from "@/lib/b2c/questionnaires/hermann-hbdi"
import type { HermannAnswers, HermannResult } from "@/lib/b2c/questionnaires/types"
import { scoreMBTI } from "@/lib/b2c/questionnaires/mbti"
import type { MBTIAnswers, MBTIResult } from "@/lib/b2c/questionnaires/types"
import { normalizeHBDI, classifyAllScores, buildIntegratedTraits, type NormalizedScore } from "@/lib/profiling/score-normalizer"
import { calculateTotalPoints, getGradeFromPoints } from "@/lib/evaluation/scoring-table"

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type DimensionId =
  | "COGNITIVE_STYLE"     // Herrmann HBDI
  | "PERSONALITY_TYPE"    // MBTI
  | "COMPETENCE"          // JG 6 criterii
  | "MOTIVATION"          // AMI
  | "INTEGRITY"           // ESQ-2
  | "LEADERSHIP"          // CPI260
  | "VALUES"              // VIA
  | "CONSCIOUSNESS"       // Hawkins
  | "CLIMATE"             // CO (Climat Organizațional)

export interface DimensionalProfile {
  dimensionId: DimensionId
  entityId: string
  entityType: "PERSON" | "JOB" | "ORGANIZATION"
  /** Rezultat brut al instrumentului */
  rawResult: any
  /** Scor normalizat T-score (mean=50, SD=10) — comparabil cross-instrument */
  normalizedScore?: number
  /** Clasificare: EXCELENTA / PERFECTIONARE / MEDIAN */
  classification?: string
  /** Încredere în măsurătoare (0-1) */
  confidence: number
  /** Timestamp */
  measuredAt: string
}

// ═══════════════════════════════════════════════════════════════
// DIMENSIONAL PROFILER
// ═══════════════════════════════════════════════════════════════

export const DimensionalProfiler = {
  /**
   * Profilare stil cognitiv — Herrmann HBDI
   * Input: răspunsuri 72 itemi
   * Output: 4 cadrane (A/B/C/D) + derivate
   */
  cognitiveStyle(answers: Record<string, number>, entityId: string): DimensionalProfile {
    const result = scoreHermann(answers as unknown as HermannAnswers)
    return {
      dimensionId: "COGNITIVE_STYLE",
      entityId,
      entityType: "PERSON",
      rawResult: result,
      normalizedScore: normalizeHBDI("A", result.CoS).normalizedT,
      confidence: Object.keys(answers).length >= 60 ? 0.9 : 0.6,
      measuredAt: new Date().toISOString(),
    }
  },

  /**
   * Profilare tip personalitate — MBTI
   * Input: răspunsuri 95 itemi
   * Output: tip (ex: ESTJ), intensitate per dicotomie
   */
  personalityType(answers: Record<string, string>, entityId: string): DimensionalProfile {
    const result = scoreMBTI(answers as unknown as MBTIAnswers)
    return {
      dimensionId: "PERSONALITY_TYPE",
      entityId,
      entityType: "PERSON",
      rawResult: result,
      confidence: Object.keys(answers).length >= 80 ? 0.9 : 0.6,
      measuredAt: new Date().toISOString(),
    }
  },

  /**
   * Profilare competențe — JG 6 criterii
   * Input: litere per criteriu (A-G)
   * Output: punctaj total + grad
   */
  competence(
    criteria: Record<string, string>,
    entityId: string,
    entityType: "PERSON" | "JOB" = "JOB"
  ): DimensionalProfile {
    const totalPoints = calculateTotalPoints(criteria)
    const grade = getGradeFromPoints(totalPoints)
    return {
      dimensionId: "COMPETENCE",
      entityId,
      entityType,
      rawResult: { criteria, totalPoints, grade },
      normalizedScore: Math.round((totalPoints / 2800) * 100), // normalizat 0-100
      confidence: Object.keys(criteria).length === 6 ? 1.0 : 0.5,
      measuredAt: new Date().toISOString(),
    }
  },

  /**
   * Profilare externă normalizată — CPI260, ESQ-2, AMI, PASAT
   * Input: scoruri brute de la instrument extern
   * Output: T-score normalizat + clasificare
   */
  externalInstrument(input: NormalizedScore, entityId: string): DimensionalProfile {
    const tScore = input.normalizedT
    const dimensionMap: Record<string, DimensionId> = {
      CPI_260: "LEADERSHIP",
      ESQ_2: "INTEGRITY",
      AMI: "MOTIVATION",
    }
    return {
      dimensionId: dimensionMap[input.instrumentId] || "COMPETENCE",
      entityId,
      entityType: "PERSON",
      rawResult: input,
      normalizedScore: tScore,
      classification: tScore >= 60 ? "EXCELENTA" : tScore >= 40 ? "MEDIAN" : "PERFECTIONARE",
      confidence: 0.85, // instrumente externe standardizate
      measuredAt: new Date().toISOString(),
    }
  },

  /**
   * Profilare nivel conștiință — Hawkins (estimat din comportament)
   * Input: estimare Hawkins (0-1000) + încredere
   * Output: nivel + interpretare
   */
  consciousness(hawkinsEstimate: number, confidence: number, entityId: string): DimensionalProfile {
    return {
      dimensionId: "CONSCIOUSNESS",
      entityId,
      entityType: "PERSON",
      rawResult: {
        hawkinsEstimate,
        zone: hawkinsEstimate < 200 ? "REACTIV_EMOTIONAL" : hawkinsEstimate < 400 ? "RATIONAL" : "INTEGRAT",
        description: hawkinsEstimate < 200
          ? "Sub 200: emoție reactivă, vulnerabilitate la manipulare"
          : hawkinsEstimate < 400
            ? "200-400: procesare rațională, discernământ"
            : "400+: integrare, compasiune, înțelepciune",
      },
      normalizedScore: Math.round(hawkinsEstimate / 10), // 0-100
      confidence,
      measuredAt: new Date().toISOString(),
    }
  },

  /**
   * Integrează TOATE scorurile N1 ale unei persoane într-un tabel unificat.
   * Nu face sinteză (asta e N2) — doar normalizează și aliniază.
   */
  integrateAllDimensions(profiles: DimensionalProfile[]): {
    dimensions: DimensionalProfile[]
    integratedTraits?: ReturnType<typeof buildIntegratedTraits>
    completeness: number // 0-1 — câte dimensiuni avem din totalul posibil
  } {
    const possibleDimensions: DimensionId[] = [
      "COGNITIVE_STYLE", "PERSONALITY_TYPE", "COMPETENCE",
      "MOTIVATION", "INTEGRITY", "LEADERSHIP", "VALUES", "CONSCIOUSNESS",
    ]

    const present = new Set(profiles.map(p => p.dimensionId))
    const completeness = present.size / possibleDimensions.length

    // Dacă avem scoruri normalizabile, construim trăsăturile integrate
    let integratedTraits
    try {
      const normInputs = profiles
        .filter(p => p.rawResult?.instrumentId)
        .map(p => p.rawResult as NormalizedScore)
      if (normInputs.length >= 2) {
        const classified = classifyAllScores(normInputs)
        integratedTraits = buildIntegratedTraits([...classified.excellence, ...classified.development, ...classified.inNorm])
      }
    } catch {
      // Nu toate profilurile au format compatibil
    }

    return { dimensions: profiles, integratedTraits, completeness }
  },
}
