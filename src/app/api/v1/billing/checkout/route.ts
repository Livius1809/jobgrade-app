import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"
import { stripe, CREDIT_PACKAGES, SUBSCRIPTIONS } from "@/lib/stripe"
import { getAppUrl } from "@/lib/get-app-url"
import { calculateServicePrice, LAYER_NAMES, detectTier, type SubscriptionTier } from "@/lib/pricing"

const schema = z.object({
  type: z.enum(["credits", "subscription", "service"]),
  packageId: z.string().optional(),
  billing: z.enum(["monthly", "annual"]).optional(),
  layer: z.number().min(1).max(4).optional(),
  positions: z.number().min(1).optional(), // validated contextually below
  employees: z.number().min(1).optional(), // validated contextually below
  annual: z.boolean().optional(),
  creditPackageId: z.string().optional(),
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

    // Validare contextuală minim poziții/salariați per layer
    if (data.type === "service" && data.layer) {
      if (data.layer === 1) {
        // Modul 1 (Ordine internă): minim 2 poziții + 2 salariați
        if ((data.positions ?? 0) < 2) {
          return NextResponse.json(
            { message: "Modulul 1 necesită minim 2 poziții pentru ierarhizare." },
            { status: 400 }
          )
        }
        if ((data.employees ?? 0) < 2) {
          return NextResponse.json(
            { message: "Modulul 1 necesită minim 2 salariați." },
            { status: 400 }
          )
        }
      }
      // Modul 2+ (Pay gap): minim 1 angajat (≠ administrator)
      if (data.layer >= 2 && (data.employees ?? 0) < 1) {
        return NextResponse.json(
          { message: "Analiza decalajelor necesită minim 1 salariat." },
          { status: 400 }
        )
      }
    }

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

    // ── Subscription checkout (3 tier-uri) ──
    if (data.type === "subscription") {
      // Detectăm tier-ul din poziții/angajați sau explicit din body
      const tier: SubscriptionTier = (data as any).tier || detectTier(data.positions || 0, data.employees || 0)
      const sub = SUBSCRIPTIONS[tier]

      const priceId = data.billing === "annual"
        ? sub.annualPriceId
        : sub.monthlyPriceId

      if (!priceId) {
        return NextResponse.json({ message: `Prețul abonamentului ${sub.label} nu este configurat în Stripe.` }, { status: 400 })
      }

      // Monthly = subscription (recurring), Annual = payment (one-off)
      const isRecurring = data.billing !== "annual"
      const checkoutSession = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: isRecurring ? "subscription" : "payment",
        success_url: `${APP_URL}/settings/billing?success=subscription&tier=${tier}`,
        cancel_url: `${APP_URL}/settings/billing?canceled=1`,
        metadata: { tenantId, type: "subscription", tier, billing: data.billing || "monthly" },
      })

      return NextResponse.json({ url: checkoutSession.url })
    }

    // ── Service package checkout ──
    if (data.type === "service") {
      if (!data.layer || !data.positions || !data.employees) {
        return NextResponse.json({ message: "Layer, poziții și salariați sunt obligatorii." }, { status: 400 })
      }

      const { serviciiRON } = calculateServicePrice(data.layer, data.positions, data.employees)
      const layerName = LAYER_NAMES[data.layer] || `Pachet ${data.layer}`

      // Verifică dacă e upgrade — calculează prorata
      const existingPurchase = await prisma.servicePurchase.findUnique({
        where: { tenantId },
        select: { layer: true, positions: true, employees: true },
      }).catch(() => null)

      const isUpgrade = existingPurchase && data.layer > existingPurchase.layer
      let serviciiDiff = serviciiRON
      let abonamentRON = data.annual ? 3990 : 399

      if (isUpgrade) {
        // Prorata: scadem prețul pachetului curent
        const { serviciiRON: currentPrice } = calculateServicePrice(
          existingPurchase.layer,
          existingPurchase.positions,
          existingPurchase.employees
        )
        serviciiDiff = Math.max(0, serviciiRON - currentPrice)
        abonamentRON = 0 // abonamentul curent rămâne activ
      }

      // Credite suplimentare (opțional)
      const creditPkg = data.creditPackageId ? CREDIT_PACKAGES.find(p => p.id === data.creditPackageId) : null
      const crediteRON = creditPkg ? creditPkg.price : 0
      const totalRON = serviciiDiff + abonamentRON + crediteRON

      const lineItems: any[] = [
        {
          price_data: {
            currency: "ron",
            product_data: {
              name: isUpgrade ? `JobGrade — Upgrade → ${layerName}` : `JobGrade — ${layerName}`,
              description: isUpgrade
                ? `Upgrade de la ${LAYER_NAMES[existingPurchase!.layer]}. Rest de plată servicii.`
                : `${data.positions} poziții, ${data.employees} salariați. Servicii + abonament ${data.annual ? "anual" : "lunar"}.`,
            },
            unit_amount: (serviciiDiff + abonamentRON) * 100,
          },
          quantity: 1,
        },
      ]

      if (creditPkg) {
        lineItems.push({
          price_data: {
            currency: "ron",
            product_data: {
              name: `Credite ${creditPkg.label} — ${creditPkg.credits} credite`,
              description: `Pachet credite suplimentare`,
            },
            unit_amount: creditPkg.price * 100,
          },
          quantity: 1,
        })
      }

      const checkoutSession = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        line_items: lineItems,
        mode: "payment",
        success_url: `${APP_URL}/portal?success=service&layer=${data.layer}`,
        cancel_url: `${APP_URL}/portal?canceled=1`,
        metadata: {
          tenantId,
          type: "service",
          layer: String(data.layer),
          positions: String(data.positions),
          employees: String(data.employees),
          priceRON: String(totalRON),
          creditPackageId: data.creditPackageId || "",
          credits: creditPkg ? String(creditPkg.credits) : "0",
        },
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
        success_url: `${APP_URL}/portal?success=credits&amount=${pkg.credits}`,
        cancel_url: `${APP_URL}/portal?canceled=1`,
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
      success_url: `${APP_URL}/portal?success=credits&amount=${pkg.credits}`,
      cancel_url: `${APP_URL}/portal?canceled=1`,
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
