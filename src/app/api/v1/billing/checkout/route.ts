import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"
import { getStripe, detectStripeMode, getSubscriptionPriceId, getCreditPriceId, findCreditPackage, CREDIT_PACKAGES, SUBSCRIPTIONS, type StripeMode } from "@/lib/stripe"
import { getAppUrl } from "@/lib/get-app-url"
import { calculateServicePrice, LAYER_NAMES, detectTier, type SubscriptionTier } from "@/lib/pricing"

const schema = z.object({
  type: z.enum(["credits", "subscription", "service"]),
  packageId: z.string().optional(),
  billing: z.enum(["monthly", "annual"]).optional(),
  renewal: z.enum(["auto", "manual"]).optional(), // reînnoire automată sau manuală
  tier: z.string().optional(), // ESSENTIALS, BUSINESS, ENTERPRISE
  layer: z.number().min(1).max(4).optional(),
  positions: z.number().min(1).optional(),
  employees: z.number().min(1).optional(),
  annual: z.boolean().optional(),
  creditPackageId: z.string().optional(),
  sandbox: z.boolean().optional(), // forțează test mode
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

    // ── Determinare mod Stripe (test/live) ──
    const stripeMode: StripeMode = detectStripeMode({
      isSandbox: data.sandbox,
      isPilot: false,
      tenantId,
    })
    const stripeClient = getStripe(stripeMode)

    // Get or create Stripe customer
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, stripeCustomerId: true },
    })
    if (!tenant) {
      return NextResponse.json({ message: "Tenant negăsit." }, { status: 404 })
    }

    // ── TVA: gestionat AUTOMAT de Stripe Tax ──
    // Stripe Tax calculează TVA corect per țară/client.
    // Oblio preia direct ce vede în Stripe → factură corectă.
    // Prețurile noastre sunt NET (fără TVA). Stripe adaugă automat.
    const companyProfile = await prisma.companyProfile.findFirst({
      where: { tenantId },
      select: { isVATPayer: true, regCom: true, address: true, county: true, cui: true },
    })
    const isB2B = companyProfile?.isVATPayer === true

    let customerId = tenant.stripeCustomerId
    if (!customerId) {
      // Include date fiscale pe Stripe Customer — Oblio le preia automat pentru facturare
      const customer = await stripeClient.customers.create({
        name: tenant.name,
        email: session.user.email ?? undefined,
        metadata: {
          tenantId,
          cui: (companyProfile as any)?.cui || "",
          regCom: (companyProfile as any)?.regCom || "",
          isVATPayer: String(isB2B),
        },
        address: {
          line1: (companyProfile as any)?.address || "",
          state: (companyProfile as any)?.county || "",
          country: "RO",
        },
        tax_exempt: isB2B ? "reverse" : "none",
      })
      customerId = customer.id
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { stripeCustomerId: customerId },
      })
    }

    // ── Subscription checkout (3 tier-uri) ──
    if (data.type === "subscription") {
      const tier: SubscriptionTier = (data.tier as SubscriptionTier) || detectTier(data.positions || 0, data.employees || 0)
      const billing = data.billing || "monthly"
      const renewal = data.renewal || "auto"

      const priceId = getSubscriptionPriceId(tier, billing, stripeMode)

      if (!priceId) {
        return NextResponse.json({ message: `Prețul abonamentului ${tier} (${billing}) nu este configurat.` }, { status: 400 })
      }

      // Determinare mod checkout:
      // - Monthly + reînnoire automată → subscription (recurring)
      // - Monthly + reînnoire manuală → payment (one-off)
      // - Annual + reînnoire automată → subscription (yearly recurring)
      // - Annual + reînnoire manuală → payment (one-off)
      const isRecurring = renewal === "auto"

      const checkoutSession = await stripeClient.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: isRecurring ? "subscription" : "payment",
        automatic_tax: { enabled: true },
        success_url: `${APP_URL}/settings/billing?success=subscription&tier=${tier}`,
        cancel_url: `${APP_URL}/settings/billing?canceled=1`,
        metadata: {
          tenantId, type: "subscription", tier, billing, renewal,
          stripeMode,
        },
      })

      return NextResponse.json({ url: checkoutSession.url, mode: stripeMode })
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
      // Prețuri NET — Stripe Tax adaugă TVA automat
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
              description: "Pachet credite suplimentare",
            },
            unit_amount: creditPkg.price * 100,
          },
          quantity: 1,
        })
      }

      const checkoutSession = await stripeClient.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        line_items: lineItems,
        mode: "payment",
        automatic_tax: { enabled: true },
        success_url: `${APP_URL}/portal?success=service&layer=${data.layer}`,
        cancel_url: `${APP_URL}/portal?canceled=1`,
        metadata: {
          tenantId,
          type: "service",
          layer: String(data.layer),
          positions: String(data.positions),
          employees: String(data.employees),
          priceRON: String(totalRON),
          isB2B: String(isB2B),
          creditPackageId: data.creditPackageId || "",
          credits: creditPkg ? String(creditPkg.credits) : "0",
        },
      })

      return NextResponse.json({ url: checkoutSession.url })
    }

    // ── Credits checkout ──
    const pkg = findCreditPackage(data.packageId || "")
    if (!pkg) {
      return NextResponse.json({ message: "Pachet invalid." }, { status: 400 })
    }

    const creditPriceId = getCreditPriceId(pkg.id, stripeMode)

    if (creditPriceId) {
      const checkoutSession = await stripeClient.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [{ price: creditPriceId, quantity: 1 }],
        mode: "payment",
        automatic_tax: { enabled: true },
        success_url: `${APP_URL}/portal?success=credits&amount=${pkg.credits}`,
        cancel_url: `${APP_URL}/portal?canceled=1`,
        metadata: { tenantId, type: "credits", packageId: pkg.id, credits: String(pkg.credits), stripeMode },
      })
      return NextResponse.json({ url: checkoutSession.url, mode: stripeMode })
    }

    // Fallback: create price on-the-fly (preț NET, Stripe Tax adaugă TVA)
    const checkoutSession = await stripeClient.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      automatic_tax: { enabled: true },
      line_items: [{
        price_data: {
          currency: "ron",
          product_data: { name: `${pkg.label} — ${pkg.credits} credite`, description: pkg.description },
          unit_amount: pkg.price * 100,
        },
        quantity: 1,
      }],
      mode: "payment",
      success_url: `${APP_URL}/portal?success=credits&amount=${pkg.credits}`,
      cancel_url: `${APP_URL}/portal?canceled=1`,
      metadata: { tenantId, type: "credits", packageId: pkg.id, credits: String(pkg.credits), stripeMode },
    })

    return NextResponse.json({ url: checkoutSession.url, mode: stripeMode })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Date invalide.", errors: error.issues }, { status: 400 })
    }
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error("[BILLING CHECKOUT]", errMsg, error)
    return NextResponse.json({ message: `Eroare: ${errMsg}` }, { status: 500 })
  }
}
