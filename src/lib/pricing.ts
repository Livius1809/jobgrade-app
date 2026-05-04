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
 * Calculează credite DELTA (diferența față de ce e deja evaluat).
 *
 * La CREȘTERE: returnează credite necesare pentru diferența nouă.
 * La SCĂDERE: returnează credite recuperabile (conversia în credite a ceea ce nu mai e folosit).
 *
 * Fiscal RO (art. 134 Cod Fiscal): serviciile prestate sunt venituri definitive.
 * Creditele consumate = irecuperabile. Creditele neconsumate = rămân ale clientului.
 * Conversia diferenței abonament → credite = bonus/serviciu suplimentar, nu stornare.
 */
export function calcDeltaCredits(
  card: number,
  newPositions: number,
  oldPositions: number,
  newEmployees: number,
  oldEmployees: number
): {
  items: CreditItem[]
  total: number
  direction: "UPGRADE" | "DOWNGRADE" | "UNCHANGED"
} {
  const deltaPos = newPositions - oldPositions
  const deltaEmp = newEmployees - oldEmployees

  if (deltaPos === 0 && deltaEmp === 0) {
    return { items: [], total: 0, direction: "UNCHANGED" }
  }

  if (deltaPos >= 0 && deltaEmp >= 0) {
    // CREȘTERE — credite noi necesare
    const calc = calcCardCredits(card, Math.max(0, deltaPos), Math.max(0, deltaEmp))
    return { ...calc, direction: "UPGRADE" }
  }

  // SCĂDERE — calculăm ce s-ar recupera (informativ, nu ramburs)
  const shrinkPos = Math.abs(Math.min(0, deltaPos))
  const shrinkEmp = Math.abs(Math.min(0, deltaEmp))
  const calc = calcCardCredits(card, shrinkPos, shrinkEmp)

  // Creditele "recuperate" sunt informative — serviciile deja prestate nu se rambursează
  // Dar diferența de abonament se poate converti în credite (decizie Owner 30.04.2026)
  return {
    items: calc.items.map(i => ({ ...i, label: `[Recuperabil] ${i.label}`, credits: -i.credits })),
    total: -calc.total,
    direction: "DOWNGRADE",
  }
}

/**
 * Calculează conversia diferenței de abonament în credite la downgrade.
 *
 * Fiscal RO: NU e stornare. Venitul abonamentului curent rămâne integral.
 * Creditele oferite = bonus/serviciu suplimentar = cost operațional intern.
 *
 * Ex: Business (599) → Essentials (299) = 300 RON diferență
 *     La tarif Business (6.50 RON/credit) = 46 credite bonus
 */
export function calcDowngradeConversion(
  currentTier: SubscriptionTier,
  newTier: SubscriptionTier,
  annual: boolean = false
): {
  priceDifference: number
  creditsConverted: number
  creditRate: number
  explanation: string
} {
  const currentPrice = subscriptionPrice(currentTier, annual)
  const newPrice = subscriptionPrice(newTier, annual)
  const diff = currentPrice - newPrice

  if (diff <= 0) {
    return { priceDifference: 0, creditsConverted: 0, creditRate: 0, explanation: "Nu este downgrade" }
  }

  // Conversia se face la tariful tier-ului CURENT (mai avantajos pentru client)
  const rate = pricePerCredit(currentTier)
  const credits = Math.floor(diff / rate)

  const period = annual ? "an" : "lună"

  return {
    priceDifference: diff,
    creditsConverted: credits,
    creditRate: rate,
    explanation: `Diferența de ${diff} RON/${period} (${TIERS[currentTier].label} → ${TIERS[newTier].label}) se convertește în ${credits} credite la tariful ${rate} RON/credit.`,
  }
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

// ═══════════════════════════════════════════════════════════════
// BILLING PERIOD + RENEWAL TYPE
// ═══════════════════════════════════════════════════════════════

export type BillingPeriod = "MONTHLY" | "ANNUAL"
export type RenewalType = "AUTO" | "MANUAL"

export interface BillingConfig {
  period: BillingPeriod
  renewal: RenewalType
  /** Discount anual vs lunar */
  annualDiscount: number        // 17% (2 luni gratuite)
}

export const DEFAULT_BILLING: BillingConfig = {
  period: "MONTHLY",
  renewal: "AUTO",
  annualDiscount: 17,
}

/**
 * Calculează prețul abonamentului per lună funcție de billing config.
 *
 * Lunar: prețul plin pe lună. Reînnoire automată sau manuală.
 * Anual: 10 luni plătite din 12 (-17%). Reînnoire automată sau manuală.
 *
 * Reînnoire automată: se taxează automat la expirare.
 * Reînnoire manuală: se trimite notificare la T-7 zile, clientul confirmă.
 *   Dacă nu confirmă în 7 zile: acces read-only, datele se păstrează 90 zile.
 */
export function billingPrice(
  tier: SubscriptionTier,
  config: BillingConfig
): {
  perMonth: number
  total: number
  periodLabel: string
  renewalLabel: string
  savings: number
} {
  const t = TIERS[tier]
  if (config.period === "ANNUAL") {
    const perMonth = Math.round(t.annualPrice / 12)
    const savings = t.monthlyPrice * 12 - t.annualPrice
    return {
      perMonth,
      total: t.annualPrice,
      periodLabel: "anual",
      renewalLabel: config.renewal === "AUTO" ? "Reînnoire automată" : "Reînnoire manuală",
      savings,
    }
  }
  return {
    perMonth: t.monthlyPrice,
    total: t.monthlyPrice,
    periodLabel: "lunar",
    renewalLabel: config.renewal === "AUTO" ? "Reînnoire automată" : "Reînnoire manuală",
    savings: 0,
  }
}

/**
 * Textul explicativ pentru reînnoire (client-facing).
 */
export function renewalExplanation(config: BillingConfig): string {
  if (config.renewal === "AUTO") {
    return config.period === "ANNUAL"
      ? "Abonamentul se reînnoiește automat anual. Veți fi notificat cu 30 de zile înainte. Puteți anula oricând."
      : "Abonamentul se reînnoiește automat lunar. Puteți anula oricând, iar accesul rămâne activ până la sfârșitul perioadei plătite."
  }
  return config.period === "ANNUAL"
    ? "Abonamentul expiră la finalul anului. Veți fi notificat cu 30 de zile înainte. Dacă nu reînnoiți, accesul devine read-only iar datele se păstrează 90 de zile."
    : "Abonamentul expiră la finalul lunii. Veți fi notificat cu 7 zile înainte. Dacă nu reînnoiți, accesul devine read-only iar datele se păstrează 90 de zile."
}
