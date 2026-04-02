/**
 * criteria-mapping.ts — Mapare 6 criterii JobGrade → 4 criterii Lege
 *
 * Legea Art. 3(1)(g) definește 4 criterii pentru „muncă de valoare egală":
 * 1. Cunoștințe și deprinderi profesionale
 * 2. Efort intelectual și/sau fizic
 * 3. Responsabilități
 * 4. Condiții de muncă
 *
 * JobGrade evaluează pe 6 criterii (mai granular):
 * Knowledge, Communications, Problem Solving, Decision Making, Business Impact, Working Conditions
 *
 * Maparea (confirmată Owner 02.04.2026):
 * Cunoștințe = Knowledge + Communications
 * Efort = Problem Solving
 * Responsabilități = Decision Making + Business Impact
 * Condiții = Working Conditions
 */

export const CRITERIA_MAP = {
  CUNOSTINTE_DEPRINDERI: {
    label: "Cunoștințe și deprinderi profesionale",
    legalRef: "Art. 3(1)(g) — cunoștințe și deprinderi profesionale similare sau egale",
    jobgradeFactors: ["Knowledge", "Communications"],
    description: "Ce trebuie SĂ ȘTII și SĂ POȚI — educație, experiență, comunicare",
  },
  EFORT_INTELECTUAL_FIZIC: {
    label: "Efort intelectual și/sau fizic",
    legalRef: "Art. 3(1)(g) — efort intelectual și/sau fizic egal sau similar",
    jobgradeFactors: ["Problem Solving"],
    description: "Cât de COMPLEX e ce faci — complexitatea problemelor de rezolvat",
  },
  RESPONSABILITATI: {
    label: "Responsabilități",
    legalRef: "Art. 3(1)(g) — responsabilități",
    jobgradeFactors: ["Decision Making", "Business Impact"],
    description: "Ce DECIZI și ce IMPACT are — nivelul deciziilor și impactul asupra afacerii",
  },
  CONDITII_MUNCA: {
    label: "Condiții de muncă",
    legalRef: "Art. 3(1)(g) — condiții de muncă",
    jobgradeFactors: ["Working Conditions"],
    description: "ÎN CE CONTEXT lucrezi — mediu fizic, stres, riscuri",
  },
} as const

export type LegalCriterionKey = keyof typeof CRITERIA_MAP
export type JobGradeFactor = "Knowledge" | "Communications" | "Problem Solving" | "Decision Making" | "Business Impact" | "Working Conditions"

/**
 * Agregă scorurile pe 6 criterii JobGrade în cele 4 criterii ale legii.
 * Scorul agregat = media scorurilor factorilor componenți.
 */
export function aggregateToLegalCriteria(scores: Record<JobGradeFactor, number>): Record<LegalCriterionKey, number> {
  const result: Record<string, number> = {}

  for (const [key, config] of Object.entries(CRITERIA_MAP)) {
    const factorScores = config.jobgradeFactors.map(f => scores[f as JobGradeFactor] || 0)
    result[key] = factorScores.length > 0
      ? Math.round(factorScores.reduce((a, b) => a + b, 0) / factorScores.length * 100) / 100
      : 0
  }

  return result as Record<LegalCriterionKey, number>
}

/**
 * Normalizare salariu la normă completă (8h).
 * Un angajat part-time 4h cu 3.600 RON = echivalent 7.200 RON full-time.
 */
export function normalizeSalary(monthlySalary: number, workSchedule: string): number {
  const hoursMap: Record<string, number> = { H2: 2, H4: 4, H6: 6, H8: 8 }
  const hours = hoursMap[workSchedule] || 8
  return (monthlySalary / hours) * 8
}

/**
 * Calculează salariul total lunar brut (normalizat).
 * Include: bază + sporuri fixe + bonusuri (normalizate lunar) + comisioane (normalizate lunar) + beneficii + tichete
 */
export function calculateTotalMonthlyGross(entry: {
  baseSalary: number
  fixedAllowances: number
  annualBonuses: number
  annualCommissions: number
  benefitsInKind: number
  mealVouchers: number
  workSchedule: string
}): number {
  const monthlyTotal =
    entry.baseSalary +
    entry.fixedAllowances +
    (entry.annualBonuses / 12) +
    (entry.annualCommissions / 12) +
    entry.benefitsInKind +
    entry.mealVouchers

  return normalizeSalary(monthlyTotal, entry.workSchedule)
}
