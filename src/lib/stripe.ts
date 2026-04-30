import Stripe from "stripe"

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not configured")
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  }
  return _stripe
}

// Backward compat — lazy getter
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return (getStripe() as any)[prop]
  },
})

// ── Abonamente per tier ──
export const SUBSCRIPTIONS = {
  ESSENTIALS: {
    id: "essentials",
    label: "Essentials",
    description: "Firmă mică (1-50 ang.) — 1 operator, 90 min chat gratuit, suport standard",
    monthlyPriceId: process.env.STRIPE_PRICE_ESSENTIALS_MONTHLY || "",
    annualPriceId: process.env.STRIPE_PRICE_ESSENTIALS_ANNUAL || "",
    monthlyPrice: 299,
    annualPrice: 2_990,
    currency: "RON",
  },
  BUSINESS: {
    id: "business",
    label: "Business",
    description: "Firmă medie (51-200 ang.) — 3 operatori, 150 min chat gratuit, suport prioritar",
    monthlyPriceId: process.env.STRIPE_PRICE_BUSINESS_MONTHLY || "",
    annualPriceId: process.env.STRIPE_PRICE_BUSINESS_ANNUAL || "",
    monthlyPrice: 599,
    annualPrice: 5_990,
    currency: "RON",
  },
  ENTERPRISE: {
    id: "enterprise",
    label: "Enterprise",
    description: "Firmă mare (200+ ang.) — 5+ operatori, 250 min chat gratuit, account manager dedicat",
    monthlyPriceId: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || "",
    annualPriceId: process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL || "",
    monthlyPrice: 999,
    annualPrice: 9_990,
    currency: "RON",
  },
} as const

// Backward compat — referință la tier default
export const SUBSCRIPTION = SUBSCRIPTIONS.ESSENTIALS

// ── Pachete credite (one-time payment) ──
export interface CreditPackage {
  id: string
  credits: number
  price: number        // RON
  pricePerCredit: number
  currency: string
  label: string
  description: string
  priceId: string
  popular?: boolean
  discount?: string
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: "credits_micro",
    credits: 100,
    price: 800,
    pricePerCredit: 8.00,
    currency: "RON",
    label: "Micro",
    description: "O evaluare JE + un raport mic",
    priceId: process.env.STRIPE_PRICE_CREDITS_MICRO || "",
  },
  {
    id: "credits_mini",
    credits: 250,
    price: 1_875,
    pricePerCredit: 7.50,
    currency: "RON",
    label: "Mini",
    description: "4 poziții JE sau mix de rapoarte",
    priceId: process.env.STRIPE_PRICE_CREDITS_MINI || "",
    discount: "6%",
  },
  {
    id: "credits_start",
    credits: 500,
    price: 3_500,
    pricePerCredit: 7.00,
    currency: "RON",
    label: "Start",
    description: "Firmă mică — acoperire ~6 luni",
    priceId: process.env.STRIPE_PRICE_CREDITS_START || "",
    discount: "12%",
  },
  {
    id: "credits_business",
    credits: 1_500,
    price: 9_750,
    pricePerCredit: 6.50,
    currency: "RON",
    label: "Business",
    description: "Firmă medie — acoperire ~1 an",
    priceId: process.env.STRIPE_PRICE_CREDITS_BUSINESS || "",
    popular: true,
    discount: "19%",
  },
  {
    id: "credits_professional",
    credits: 5_000,
    price: 30_000,
    pricePerCredit: 6.00,
    currency: "RON",
    label: "Professional",
    description: "Firmă mare — suită completă",
    priceId: process.env.STRIPE_PRICE_CREDITS_PROFESSIONAL || "",
    discount: "25%",
  },
  {
    id: "credits_enterprise",
    credits: 15_000,
    price: 82_500,
    pricePerCredit: 5.50,
    currency: "RON",
    label: "Enterprise",
    description: "Corporație — volum maxim",
    priceId: process.env.STRIPE_PRICE_CREDITS_ENTERPRISE || "",
    discount: "31%",
  },
]

// Helper: find package by ID
export function findCreditPackage(id: string): CreditPackage | undefined {
  return CREDIT_PACKAGES.find(p => p.id === id)
}
