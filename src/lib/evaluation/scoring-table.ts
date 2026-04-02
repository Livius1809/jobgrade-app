/**
 * scoring-table.ts — Baremul de punctare pe cele 6 criterii
 *
 * ATENȚIE: Aceste valori sunt SECRET DE SERVICIU.
 * NU se afișează clientului/evaluatorului.
 * Se folosesc DOAR în backend pentru calcul grad.
 *
 * Sursa: Documentele operaționale reale (metodologie JE)
 * Verificat: Doc 6 rezultate brute — scorurile se confirmă matematic
 */

export const SCORING_TABLE = {
  Knowledge: {
    A: 80,   // Pregătire minimă, fără experiență
    B: 160,  // Liceu, 6-12 luni experiență
    C: 240,  // Liceu + cursuri specializate, 1-2 ani
    D: 320,  // Diplomă colegiu, 2-3 ani experiență
    E: 400,  // Universitate, 4-6 ani experiență
    F: 480,  // Universitate, 8-10 ani experiență
    G: 560,  // Grad avansat, 10+ ani experiență
  },
  Communications: {
    A: 85,   // Conversație/scriere de bază, informații simple
    B: 170,  // Moderate, unele abilități de persuasiune
    C: 255,  // Persuasiune, înțelegere, influențare
    D: 340,  // Comunicare dezvoltată, relații umane, influențare comportament
    E: 425,  // Comunicare critică, toate nivelurile, confidențial
  },
  ProblemSolving: {
    A: 80,   // Analiză minimă, probleme identice, supervizare strictă
    B: 160,  // Analiză de bază, probleme similare, supervizare disponibilă
    C: 240,  // Analiză moderată, probleme diferite, review la nevoie
    D: 320,  // Probleme variate, latitudine, creativitate
    E: 400,  // Probleme diverse, gândire dificilă, independentă
    F: 480,  // Foarte diverse, cercetare, analiză complicată
    G: 560,  // Strategice, integrare departamente, funcție critică
  },
  DecisionMaking: {
    A: 80,   // Decizii simple, instrucțiuni clare
    B: 160,  // Decizii de rutină, metode bine definite
    C: 240,  // Decizii standard, unele evenimente neașteptate
    D: 320,  // Decizii independente, poate modifica proceduri
    E: 400,  // Decizii complexe, autoritate în cadrul politicii
    F: 480,  // Multe decizii complexe, rapid și flexibil
    G: 560,  // Decizii cu impact strategic pe termen lung
  },
  BusinessImpact: {
    A: 140,  // Impact limitat sau inexistent
    B: 280,  // Impact minor, munca pre-verificată
    C: 420,  // Influențial, consiliere/analiză ca suport
    D: 560,  // Direct, responsabilitate majoră pe rezultate
  },
  WorkingConditions: {
    A: 45,   // Minimal, birou curat, fără riscuri, stres minim
    B: 90,   // Moderat, confortabil dar nu curat/liniștit, unele riscuri
    C: 135,  // Considerabil, mediu zgomotos, riscuri substanțiale, deadline-uri
  },
} as const

export type CriterionKey = keyof typeof SCORING_TABLE
export type SubfactorLevel = string // A, B, C, D, E, F, G

/**
 * Calculează punctajul total pentru un set de scoruri pe litere.
 * INTERN — nu se expune clientului.
 */
export function calculateTotalPoints(scores: Record<CriterionKey, SubfactorLevel>): number {
  let total = 0
  for (const [criterion, level] of Object.entries(scores)) {
    const table = SCORING_TABLE[criterion as CriterionKey]
    if (table && level in table) {
      total += table[level as keyof typeof table]
    }
  }
  return total
}

/**
 * Determină gradul/nivelul din punctajul total.
 * Pragurile sunt derivate din datele reale (Doc 6 + Doc 7).
 *
 * INTERN — nu se expune clientului.
 */
export const GRADE_THRESHOLDS = [
  { grade: 1, label: "Nivel 1", minPoints: 2200 },
  { grade: 2, label: "Nivel 2", minPoints: 2000 },
  { grade: 3, label: "Nivel 3", minPoints: 1800 },
  { grade: 4, label: "Nivel 4", minPoints: 1600 },
  { grade: 5, label: "Nivel 5", minPoints: 1300 },
  { grade: 6, label: "Nivel 6", minPoints: 1100 },
  { grade: 7, label: "Nivel 7", minPoints: 900 },
  { grade: 8, label: "Nivel 8", minPoints: 0 },
]

export function getGradeFromPoints(totalPoints: number): { grade: number; label: string } {
  for (const threshold of GRADE_THRESHOLDS) {
    if (totalPoints >= threshold.minPoints) {
      return { grade: threshold.grade, label: threshold.label }
    }
  }
  return { grade: 8, label: "Nivel 8" }
}

/**
 * Punctaj maxim teoretic: 560+425+560+560+560+135 = 2800
 * Punctaj minim teoretic: 80+85+80+80+140+45 = 510
 */
export const MAX_POINTS = 2800
export const MIN_POINTS = 510
