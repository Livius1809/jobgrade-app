/**
 * pricing.ts — Sursa de adevăr pentru prețuri și tier-uri
 *
 * 3 tier-uri abonament: Essentials / Business / Enterprise
 * Preț/credit funcție de tier (nu de volum cumpărat)
 * Tier detectat automat din nr. poziții + nr. angajați
 *
 * Calculator per card:
 *   C1: input = poziții (angajații nu se cer)
 *   C2: input = angajați (pozițiile se preiau din C1)
 *   C3/C4: input = servicii specifice (datele se preiau din C1+C2)
 */

// ═══════════════════════════════════════════════════════════════
// TIER-URI ABONAMENT
// ═══════════════════════════════════════════════════════════════

export type SubscriptionTier = "ESSENTIALS" | "BUSINESS" | "ENTERPRISE"

export interface TierConfig {
  id: SubscriptionTier
  label: string
  monthlyPrice: number       // RON/lună
  annualPrice: number        // RON/an
  creditPrice: number        // RON per credit
  creditDiscount: string     // discount față de preț plin
  maxPositions: number       // limită posturi
  maxOperators: number       // licențe simultane
  freeChat: number           // minute chat gratuit/lună
  storage: string            // stocare
  support: string            // nivel suport
  accountManager: string     // tip account manager
  employeeRange: string      // segment angajați
}

export const TIERS: Record<SubscriptionTier, TierConfig> = {
  ESSENTIALS: {
    id: "ESSENTIALS",
    label: "Essentials",
    monthlyPrice: 299,
    annualPrice: 2_990,
    creditPrice: 8.00,
    creditDiscount: "—",
    maxPositions: 30,
    maxOperators: 1,
    freeChat: 90,
    storage: "500 MB",
    support: "Standard (48h)",
    accountManager: "Nu",
    employeeRange: "1-50 angajați",
  },
  BUSINESS: {
    id: "BUSINESS",
    label: "Business",
    monthlyPrice: 599,
    annualPrice: 5_990,
    creditPrice: 6.50,
    creditDiscount: "19%",
    maxPositions: 100,
    maxOperators: 3,
    freeChat: 150,
    storage: "2 GB",
    support: "Prioritar (24h)",
    accountManager: "Partajat",
    employeeRange: "51-200 angajați",
  },
  ENTERPRISE: {
    id: "ENTERPRISE",
    label: "Enterprise",
    monthlyPrice: 999,
    annualPrice: 9_990,
    creditPrice: 5.50,
    creditDiscount: "31%",
    maxPositions: 9999,
    maxOperators: 5,
    freeChat: 250,
    storage: "10 GB",
    support: "Premium (4h)",
    accountManager: "Dedicat",
    employeeRange: "200+ angajați",
  },
}

/**
 * Detectează tier-ul optim din dimensiunea organizației.
 * Folosit automat la fiecare schimbare de poziții/angajați.
 */
export function detectTier(positions: number, employees: number): SubscriptionTier {
  const maxDim = Math.max(positions, employees)
  if (maxDim > 200 || positions > 100) return "ENTERPRISE"
  if (maxDim > 50 || positions > 30) return "BUSINESS"
  return "ESSENTIALS"
}

/**
 * Prețul per credit funcție de tier-ul activ.
 */
export function pricePerCredit(tier: SubscriptionTier): number {
  return TIERS[tier].creditPrice
}

/**
 * Preț abonament lunar funcție de tier.
 */
export function subscriptionPrice(tier: SubscriptionTier, annual: boolean = false): number {
  return annual ? TIERS[tier].annualPrice : TIERS[tier].monthlyPrice
}

// ═══════════════════════════════════════════════════════════════
// CALCULATOR CREDITE PER CARD
// ═══════════════════════════════════════════════════════════════

export interface CreditItem {
  label: string
  credits: number
  detail: string
  card: number // C1=1, C2=2, C3=3, C4=4
}

/**
 * Calculează credite necesare PER CARD.
 * Fiecare card primește doar inputul relevant:
 *   C1: positions (employees nu se cere)
 *   C2: employees (positions preluat din C1)
 *   C3: positions + employees (preluate)
 *   C4: positions + employees (preluate)
 */
export function calcCardCredits(card: number, positions: number, employees: number): {
  items: CreditItem[]
  total: number
} {
  const items: CreditItem[] = []

  if (card === 1) {
    items.push({ label: "Evaluare posturi (JE AUTO)", credits: positions * 60, detail: `${positions} × 60 cr`, card: 1 })
    items.push({ label: "Fișe de post AI", credits: positions * 12, detail: `${positions} × 12 cr`, card: 1 })
  }

  if (card === 2) {
    items.push({ label: "Structură salarială", credits: 20 + employees * 1, detail: `20 + ${employees} × 1 cr`, card: 2 })
    items.push({ label: "Analiză pay gap (Art. 9)", credits: 15 + Math.ceil(employees * 0.5), detail: `15 + ${employees} × 0,5 cr`, card: 2 })
    items.push({ label: "Benchmark salarial", credits: 30 + Math.ceil(positions * 1.5), detail: `30 + ${positions} × 1,5 cr`, card: 2 })
  }

  if (card === 3) {
    items.push({ label: "Pachete salariale", credits: 25 + positions * 1, detail: `25 + ${positions} × 1 cr`, card: 3 })
    items.push({ label: "Evaluare performanță", credits: employees * 15, detail: `${employees} × 15 cr`, card: 3 })
    items.push({ label: "Impact bugetar", credits: 40, detail: "40 cr", card: 3 })
  }

  if (card === 4) {
    const recruitProjects = Math.max(1, Math.ceil(positions * 0.2))
    items.push({ label: "Dezvoltare HR", credits: 40 + employees * 1, detail: `40 + ${employees} × 1 cr`, card: 4 })
    items.push({ label: "Recrutare", credits: recruitProjects * 60, detail: `${recruitProjects} proiecte × 60 cr`, card: 4 })
    items.push({ label: "Manual angajat", credits: 20 + Math.ceil(positions * 1.5), detail: `20 + ${positions} × 1,5 cr`, card: 4 })
  }

  return { items, total: items.reduce((s, i) => s + i.credits, 0) }
}

/**
 * Calculează credite CUMULATIVE (toate cardurile până la nivelul dat).
 * Backward compat cu calcLayerCredits.
 */
export function calcLayerCredits(layer: number, positions: number, employees: number) {
  const allItems: CreditItem[] = []
  for (let c = 1; c <= layer; c++) {
    const { items } = calcCardCredits(c, positions, employees)
    allItems.push(...items)
  }
  const total = allItems.reduce((s, i) => s + i.credits, 0)
  return { items: allItems, total }
}

/**
 * Calculează credite DELTA (doar diferența față de ce e deja evaluat).
 * Folosit la adăugare incrementală.
 */
export function calcDeltaCredits(
  card: number,
  newPositions: number,
  oldPositions: number,
  newEmployees: number,
  oldEmployees: number
): { items: CreditItem[]; total: number } {
  const deltaPos = Math.max(0, newPositions - oldPositions)
  const deltaEmp = Math.max(0, newEmployees - oldEmployees)

  if (deltaPos === 0 && deltaEmp === 0) {
    return { items: [], total: 0 }
  }

  return calcCardCredits(card, deltaPos, deltaEmp)
}

/**
 * Preț total servicii per card, în RON.
 */
export function calculateCardPrice(
  card: number,
  positions: number,
  employees: number,
  tier: SubscriptionTier
) {
  const calc = calcCardCredits(card, positions, employees)
  const ppc = pricePerCredit(tier)
  const totalRON = Math.round(calc.total * ppc)
  return { credits: calc.total, totalRON, pricePerCredit: ppc, tier, items: calc.items }
}

/**
 * Preț total servicii cumulative (toate cardurile).
 * Backward compat cu calculateServicePrice.
 */
export function calculateServicePrice(layer: number, positions: number, employees: number) {
  const tier = detectTier(positions, employees)
  const calc = calcLayerCredits(layer, positions, employees)
  const ppc = pricePerCredit(tier)
  const serviciiRON = Math.round(calc.total * ppc)
  return { credits: calc.total, serviciiRON, tier, pricePerCredit: ppc, items: calc.items }
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTE
// ═══════════════════════════════════════════════════════════════

export const LAYER_NAMES: Record<number, string> = {
  1: "Organizare internă (C1)",
  2: "Conformitate (C2)",
  3: "Competitivitate (C3)",
  4: "Dezvoltare (C4)",
}

export const CARD_DESCRIPTIONS: Record<number, { inputLabel: string; inputHint: string }> = {
  1: { inputLabel: "Număr poziții de evaluat", inputHint: "Câte posturi distincte aveți în organigramă?" },
  2: { inputLabel: "Număr angajați", inputHint: "Câți angajați aveți în total?" },
  3: { inputLabel: "Servicii competitivitate", inputHint: "Datele se preiau din C1 și C2" },
  4: { inputLabel: "Obiective dezvoltare", inputHint: "Datele se preiau din C1, C2 și C3" },
}
