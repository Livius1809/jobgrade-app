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
  description: "Acces portal, găzduire date, suport, 1h consultanță/lună",
  monthlyPriceId: process.env.STRIPE_PRICE_SUBSCRIPTION_MONTHLY || "",
  annualPriceId: process.env.STRIPE_PRICE_SUBSCRIPTION_ANNUAL || "",
  // Prețuri de calibrat — placeholder
  monthlyPrice: 0,
  annualPrice: 0,
  currency: "RON",
}

// ── Pachete credite (one-time payment) ──
export const CREDIT_PACKAGES = [
  {
    id: "credits_start",
    credits: 0,    // de calibrat
    price: 0,      // de calibrat
    currency: "RON",
    label: "Pachet Start",
    description: "Pentru primele evaluări și rapoarte",
    priceId: process.env.STRIPE_PRICE_CREDITS_START || "",
  },
  {
    id: "credits_business",
    credits: 0,    // de calibrat
    price: 0,      // de calibrat
    currency: "RON",
    label: "Pachet Business",
    description: "Pentru utilizare regulată",
    priceId: process.env.STRIPE_PRICE_CREDITS_BUSINESS || "",
    popular: true,
    discount: "10%",
  },
  {
    id: "credits_enterprise",
    credits: 0,    // de calibrat
    price: 0,      // de calibrat
    currency: "RON",
    label: "Pachet Enterprise",
    description: "Pentru organizații cu volum mare",
    priceId: process.env.STRIPE_PRICE_CREDITS_ENTERPRISE || "",
    discount: "20%",
  },
] as const
