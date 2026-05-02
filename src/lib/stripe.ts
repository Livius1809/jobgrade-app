/**
 * stripe.ts — Dual mode Stripe (test + live)
 *
 * Test mode: sandbox, demo, pilot → card test 4242, zero bani reali
 * Live mode: clienți reali cu cont activat → plăți reale
 *
 * Determinare mod:
 * - Explicit: getStripe("test") sau getStripe("live")
 * - Automat: funcție de context (sandbox=test, portal=live)
 * - Default: STRIPE_MODE env var sau "test"
 */

import Stripe from "stripe"

export type StripeMode = "test" | "live"

// Cache per mod — nu recreăm la fiecare apel
const stripeInstances: Record<StripeMode, Stripe | null> = { test: null, live: null }

/**
 * Returnează instanța Stripe pentru modul specificat.
 */
export function getStripe(mode?: StripeMode): Stripe {
  const effectiveMode = mode || getDefaultMode()

  if (!stripeInstances[effectiveMode]) {
    const key = effectiveMode === "live"
      ? process.env.STRIPE_SECRET_KEY_LIVE
      : process.env.STRIPE_SECRET_KEY_TEST

    // Fallback: dacă nu există key per mod, folosim STRIPE_SECRET_KEY (legacy)
    const effectiveKey = key || process.env.STRIPE_SECRET_KEY
    if (!effectiveKey) {
      throw new Error(`Stripe ${effectiveMode} key nu este configurat (STRIPE_SECRET_KEY_${effectiveMode.toUpperCase()})`)
    }

    stripeInstances[effectiveMode] = new Stripe(effectiveKey)
  }

  return stripeInstances[effectiveMode]!
}

/**
 * Modul default — din env var sau "test"
 */
function getDefaultMode(): StripeMode {
  const envMode = process.env.STRIPE_MODE?.toLowerCase()
  if (envMode === "live") return "live"
  return "test"
}

/**
 * Detectează modul din context (pagina curentă, tip cont).
 */
export function detectStripeMode(context: {
  isSandbox?: boolean
  isDemo?: boolean
  isPilot?: boolean
  tenantId?: string
}): StripeMode {
  // Sandbox, demo, pilot → mereu test
  if (context.isSandbox || context.isDemo || context.isPilot) return "test"

  // Tenant-uri pilot/demo cunoscute → test
  const PILOT_TENANTS = [
    "cmolbwrlr000004jplchaxsy8", // JG_itself
  ]
  if (context.tenantId && PILOT_TENANTS.includes(context.tenantId)) return "test"

  // Restul → funcție de STRIPE_MODE
  return getDefaultMode()
}

// Backward compat — lazy getter pe modul default
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return (getStripe() as any)[prop]
  },
})

// ═══════════════════════════════════════════════════════════════
// PRICE IDs — dual (test + live)
// ═══════════════════════════════════════════════════════════════

interface PriceIds {
  test: string
  live: string
}

function dualPrice(testEnv: string, liveEnv: string): PriceIds {
  return {
    test: process.env[testEnv] || "",
    live: process.env[liveEnv] || process.env[testEnv] || "", // fallback test dacă live nu e setat
  }
}

/**
 * Returnează price ID-ul pentru modul activ.
 */
function priceForMode(prices: PriceIds, mode: StripeMode): string {
  return prices[mode] || prices.test
}

// ── Abonamente per tier ──

interface SubscriptionTierConfig {
  id: string
  label: string
  description: string
  monthlyPriceIds: PriceIds
  annualPriceIds: PriceIds
  monthlyPrice: number
  annualPrice: number
  currency: string
}

export const SUBSCRIPTIONS: Record<string, SubscriptionTierConfig> = {
  ESSENTIALS: {
    id: "essentials",
    label: "Essentials",
    description: "Firmă mică (1-50 ang.) — 1 operator, 90 min chat gratuit, suport standard",
    monthlyPriceIds: dualPrice("STRIPE_PRICE_ESSENTIALS_MONTHLY", "STRIPE_PRICE_ESSENTIALS_MONTHLY_LIVE"),
    annualPriceIds: dualPrice("STRIPE_PRICE_ESSENTIALS_ANNUAL", "STRIPE_PRICE_ESSENTIALS_ANNUAL_LIVE"),
    monthlyPrice: 299,
    annualPrice: 2_990,
    currency: "RON",
  },
  BUSINESS: {
    id: "business",
    label: "Business",
    description: "Firmă medie (51-200 ang.) — 3 operatori, 150 min chat gratuit, suport prioritar",
    monthlyPriceIds: dualPrice("STRIPE_PRICE_BUSINESS_MONTHLY", "STRIPE_PRICE_BUSINESS_MONTHLY_LIVE"),
    annualPriceIds: dualPrice("STRIPE_PRICE_BUSINESS_ANNUAL", "STRIPE_PRICE_BUSINESS_ANNUAL_LIVE"),
    monthlyPrice: 599,
    annualPrice: 5_990,
    currency: "RON",
  },
  ENTERPRISE: {
    id: "enterprise",
    label: "Enterprise",
    description: "Firmă mare (200+ ang.) — 5+ operatori, 250 min chat gratuit, account manager dedicat",
    monthlyPriceIds: dualPrice("STRIPE_PRICE_ENTERPRISE_MONTHLY", "STRIPE_PRICE_ENTERPRISE_MONTHLY_LIVE"),
    annualPriceIds: dualPrice("STRIPE_PRICE_ENTERPRISE_ANNUAL", "STRIPE_PRICE_ENTERPRISE_ANNUAL_LIVE"),
    monthlyPrice: 999,
    annualPrice: 9_990,
    currency: "RON",
  },
}

// Backward compat
export const SUBSCRIPTION = {
  id: "essentials",
  label: "Essentials",
  description: SUBSCRIPTIONS.ESSENTIALS.description,
  monthlyPriceId: SUBSCRIPTIONS.ESSENTIALS.monthlyPriceIds.test,
  annualPriceId: SUBSCRIPTIONS.ESSENTIALS.annualPriceIds.test,
  monthlyPrice: 299,
  annualPrice: 2_990,
  currency: "RON",
}

/**
 * Returnează price ID-ul abonament per tier + billing + mod.
 */
export function getSubscriptionPriceId(
  tier: string,
  billing: "monthly" | "annual",
  mode: StripeMode
): string {
  const sub = SUBSCRIPTIONS[tier.toUpperCase()]
  if (!sub) return ""
  return billing === "annual"
    ? priceForMode(sub.annualPriceIds, mode)
    : priceForMode(sub.monthlyPriceIds, mode)
}

// ── Pachete credite ──

export interface CreditPackage {
  id: string
  credits: number
  price: number
  pricePerCredit: number
  currency: string
  label: string
  description: string
  priceIds: PriceIds
  popular?: boolean
  discount?: string
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: "credits_micro", credits: 100, price: 800, pricePerCredit: 8.00,
    currency: "RON", label: "Micro", description: "O evaluare JE + un raport mic",
    priceIds: dualPrice("STRIPE_PRICE_CREDITS_MICRO", "STRIPE_PRICE_CREDITS_MICRO_LIVE"),
  },
  {
    id: "credits_mini", credits: 250, price: 1_875, pricePerCredit: 7.50,
    currency: "RON", label: "Mini", description: "4 poziții JE sau mix de rapoarte",
    priceIds: dualPrice("STRIPE_PRICE_CREDITS_MINI", "STRIPE_PRICE_CREDITS_MINI_LIVE"),
    discount: "6%",
  },
  {
    id: "credits_start", credits: 500, price: 3_500, pricePerCredit: 7.00,
    currency: "RON", label: "Start", description: "Firmă mică — acoperire ~6 luni",
    priceIds: dualPrice("STRIPE_PRICE_CREDITS_START", "STRIPE_PRICE_CREDITS_START_LIVE"),
    discount: "12%",
  },
  {
    id: "credits_business", credits: 1_500, price: 9_750, pricePerCredit: 6.50,
    currency: "RON", label: "Business", description: "Firmă medie — acoperire ~1 an",
    priceIds: dualPrice("STRIPE_PRICE_CREDITS_BUSINESS", "STRIPE_PRICE_CREDITS_BUSINESS_LIVE"),
    popular: true, discount: "19%",
  },
  {
    id: "credits_professional", credits: 5_000, price: 30_000, pricePerCredit: 6.00,
    currency: "RON", label: "Professional", description: "Firmă mare — suită completă",
    priceIds: dualPrice("STRIPE_PRICE_CREDITS_PROFESSIONAL", "STRIPE_PRICE_CREDITS_PROFESSIONAL_LIVE"),
    discount: "25%",
  },
  {
    id: "credits_enterprise", credits: 15_000, price: 82_500, pricePerCredit: 5.50,
    currency: "RON", label: "Enterprise", description: "Corporație — volum maxim",
    priceIds: dualPrice("STRIPE_PRICE_CREDITS_ENTERPRISE", "STRIPE_PRICE_CREDITS_ENTERPRISE_LIVE"),
    discount: "31%",
  },
]

export function findCreditPackage(id: string): CreditPackage | undefined {
  return CREDIT_PACKAGES.find(p => p.id === id)
}

/**
 * Returnează price ID-ul pachet credite per mod.
 */
export function getCreditPriceId(packageId: string, mode: StripeMode): string {
  const pkg = findCreditPackage(packageId)
  if (!pkg) return ""
  return priceForMode(pkg.priceIds, mode)
}
