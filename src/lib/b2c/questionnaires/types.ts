/**
 * Tipuri comune pentru chestionarele B2C de profilare
 */

// ── Hermann HBDI ────────────────────────────────────────────

export interface HermannQuestion {
  id: number          // 1-72
  text: string        // Textul întrebării
  quadrant: HermannQuadrant
}

export type HermannQuadrant = "CoS" | "CoD" | "LiS" | "LiD"

/** Răspuns Likert 1-5 */
export type HermannResponse = 1 | 2 | 3 | 4 | 5

export interface HermannAnswers {
  [questionId: number]: HermannResponse
}

export interface HermannResult {
  // Scoruri cadrane (0-100)
  CoS: number   // Cortical Stâng — Analitic (A)
  CoD: number   // Cortical Drept — Imaginativ (D)
  LiS: number   // Limbic Stâng — Secvențial (B)
  LiD: number   // Limbic Drept — Interpersonal (C)

  // Scoruri derivate (0-100)
  rationalitate: number    // (CoS + CoD) / 2
  emotionalitate: number   // (LiS + LiD) / 2
  modStang: number         // (CoS + LiS) / 2
  modDrept: number         // (CoD + LiD) / 2

  // Preferințe (top 2 cadrane)
  preferences: Record<HermannQuadrant, "prefera" | "respinge">

  // Cadran dominant
  dominant: HermannQuadrant
  profile: string   // ex: "CoS-LiS" (cele 2 cadrane preferate)
}

// ── MBTI ───────────���────────────────────────────────────────

export interface MBTIQuestion {
  id: number
  text: string
  optionA: string
  optionB: string
  optionC?: string  // doar Q17
  dichotomy: MBTIDichotomy
  /** Punctaj pentru răspunsul A: [dimensiune1_puncte, dimensiune2_puncte] */
  scoringA: [number, number]
  /** Punctaj pentru răspunsul B */
  scoringB: [number, number]
  /** Punctaj pentru răspunsul C (doar Q17) */
  scoringC?: [number, number]
}

export type MBTIDichotomy = "EI" | "SN" | "TF" | "JP"

export type MBTIResponse = "A" | "B" | "C"

export interface MBTIAnswers {
  [questionId: number]: MBTIResponse
}

export interface MBTIResult {
  // Scoruri brute per dimensiune
  E: number
  I: number
  S: number
  N: number
  T: number
  F: number
  J: number
  P: number

  // Tipul MBTI (4 litere)
  type: string  // ex: "ESTJ"

  // Intensitate per factor (cât de clar e preferința)
  intensity: {
    EI: number   // scor dominant
    SN: number
    TF: number
    JP: number
  }

  // Procentaj claritate (0-100 per dichotomie)
  clarity: {
    EI: number
    SN: number
    TF: number
    JP: number
  }
}

// ── Profil combinat ─────────────────────────────────────────

export interface ProfilingResults {
  hermann?: HermannResult
  mbti?: MBTIResult
  completedAt?: string
}
