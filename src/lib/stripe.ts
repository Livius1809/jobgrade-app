import Stripe from "stripe"

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not configured")
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-02-25.clover",
    })
  }
  return _stripe
}

// Backward compat — lazy getter
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return (getStripe() as any)[prop]
  },
})

// ── Abonament (subscription lunar/anual) ──
export const SUBSCRIPTION = {
  id: "subscription",
  label: "Abonament JobGrade",
  description: "Acces portal, dashboard cu diagnostic, MVV draft, profil sectorial, consultant HR familiarizare (135 min/lună)",
  monthlyPriceId: process.env.STRIPE_PRICE_SUBSCRIPTION_MONTHLY || "",
  annualPriceId: process.env.STRIPE_PRICE_SUBSCRIPTION_ANNUAL || "",
  monthlyPrice: 399,     // RON/lună
  annualPrice: 3_990,    // RON/an (17% discount)
  currency: "RON",
}

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
