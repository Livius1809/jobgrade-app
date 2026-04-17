import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { stripe, CREDIT_PACKAGES, SUBSCRIPTION } from "@/lib/stripe"
import { getAppUrl } from "@/lib/get-app-url"

const schema = z.object({
  type: z.enum(["credits", "subscription"]),
  packageId: z.string().optional(),
  billing: z.enum(["monthly", "annual"]).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const tenantId = session.user.tenantId
    const body = await req.json()
    const data = schema.parse(body)
    const APP_URL = getAppUrl()

    // Get or create Stripe customer
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, stripeCustomerId: true },
    })
    if (!tenant) {
      return NextResponse.json({ message: "Tenant negăsit." }, { status: 404 })
    }

    let customerId = tenant.stripeCustomerId
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: tenant.name,
        email: session.user.email ?? undefined,
        metadata: { tenantId },
      })
      customerId = customer.id
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { stripeCustomerId: customerId },
      })
    }

    // ── Subscription checkout ──
    if (data.type === "subscription") {
      const priceId = data.billing === "annual"
        ? SUBSCRIPTION.annualPriceId
        : SUBSCRIPTION.monthlyPriceId

      if (!priceId) {
        return NextResponse.json({ message: "Prețul abonamentului nu este configurat în Stripe." }, { status: 400 })
      }

      const checkoutSession = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        success_url: `${APP_URL}/settings/billing?success=subscription`,
        cancel_url: `${APP_URL}/settings/billing?canceled=1`,
        metadata: { tenantId, type: "subscription", billing: data.billing || "monthly" },
      })

      return NextResponse.json({ url: checkoutSession.url })
    }

    // ── Credits checkout ──
    const pkg = CREDIT_PACKAGES.find((p) => p.id === data.packageId)
    if (!pkg) {
      return NextResponse.json({ message: "Pachet invalid." }, { status: 400 })
    }

    // If Stripe price ID configured → use it
    if (pkg.priceId) {
      const checkoutSession = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [{ price: pkg.priceId, quantity: 1 }],
        mode: "payment",
        success_url: `${APP_URL}/settings/billing?success=credits&amount=${pkg.credits}`,
        cancel_url: `${APP_URL}/settings/billing?canceled=1`,
        metadata: {
          tenantId,
          type: "credits",
          packageId: pkg.id,
          credits: String(pkg.credits),
        },
      })
      return NextResponse.json({ url: checkoutSession.url })
    }

    // Fallback: create price on-the-fly (test mode)
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "ron",
          product_data: {
            name: `${pkg.label} — ${pkg.credits} credite`,
            description: pkg.description,
          },
          unit_amount: pkg.price * 100, // Stripe uses bani (cents)
        },
        quantity: 1,
      }],
      mode: "payment",
      success_url: `${APP_URL}/settings/billing?success=credits&amount=${pkg.credits}`,
      cancel_url: `${APP_URL}/settings/billing?canceled=1`,
      metadata: {
        tenantId,
        type: "credits",
        packageId: pkg.id,
        credits: String(pkg.credits),
      },
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Date invalide.", errors: error.issues }, { status: 400 })
    }
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error("[BILLING CHECKOUT]", errMsg, error)
    return NextResponse.json({ message: `Eroare: ${errMsg}` }, { status: 500 })
  }
}
