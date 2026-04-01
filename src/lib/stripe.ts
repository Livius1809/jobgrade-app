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

export const CREDIT_PACKAGES = [
  {
    id: "credits_50",
    credits: 50,
    price: 29,
    currency: "RON",
    label: "Starter",
    priceId: process.env.STRIPE_PRICE_50_CREDITS!,
  },
  {
    id: "credits_150",
    credits: 150,
    price: 79,
    currency: "RON",
    label: "Business",
    priceId: process.env.STRIPE_PRICE_150_CREDITS!,
    popular: true,
  },
  {
    id: "credits_500",
    credits: 500,
    price: 229,
    currency: "RON",
    label: "Enterprise",
    priceId: process.env.STRIPE_PRICE_500_CREDITS!,
  },
] as const
