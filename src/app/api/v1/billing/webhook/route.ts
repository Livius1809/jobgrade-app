import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { addCredits } from "@/lib/credits"
import { prisma } from "@/lib/prisma"
import Stripe from "stripe"

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get("stripe-signature")

  if (!sig) {
    return NextResponse.json({ message: "Missing signature." }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error("[WEBHOOK] Invalid signature:", err)
    return NextResponse.json({ message: "Invalid signature." }, { status: 400 })
  }

  // ── Checkout completed (credits one-time OR first subscription) ──
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session

    if (session.payment_status !== "paid") {
      return NextResponse.json({ received: true })
    }

    const tenantId = session.metadata?.tenantId
    const type = session.metadata?.type // "credits" | "subscription"

    if (!tenantId) {
      console.error("[WEBHOOK] Missing tenantId in metadata")
      return NextResponse.json({ received: true })
    }

    // Service package purchase
    if (type === "service") {
      const layer = parseInt(session.metadata?.layer ?? "0", 10)
      const positions = parseInt(session.metadata?.positions ?? "0", 10)
      const employees = parseInt(session.metadata?.employees ?? "0", 10)
      const priceRON = parseInt(session.metadata?.priceRON ?? "0", 10)

      if (layer > 0) {
        await prisma.servicePurchase.upsert({
          where: { tenantId },
          create: {
            tenantId,
            layer,
            positions,
            employees,
            priceRON,
            stripeSessionId: session.id,
            status: "ACTIVE",
          },
          update: {
            layer: { set: Math.max(layer) },
            positions,
            employees,
            priceRON,
            stripeSessionId: session.id,
            status: "ACTIVE",
          },
        })
        console.log(`[WEBHOOK] Service purchase layer ${layer} → tenant ${tenantId}`)
      }

      await createRevenueEntry(tenantId, "SERVICE", session.amount_total, session.currency, `Pachet servicii L${layer}`, session.id)
    }

    // Credits purchase
    if (type === "credits") {
      const credits = parseInt(session.metadata?.credits ?? "0", 10)
      const packageId = session.metadata?.packageId ?? "unknown"

      if (credits > 0) {
        await addCredits(tenantId, credits, `Pachet ${packageId} — ${credits} credite`, "PURCHASE")
        console.log(`[WEBHOOK] +${credits} credits → tenant ${tenantId}`)
      }

      // Revenue entry
      await createRevenueEntry(tenantId, "CREDITS", session.amount_total, session.currency, `Pachet credite ${packageId}`, session.id)
    }

    // Subscription activated
    if (type === "subscription") {
      // Activate tenant
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { status: "ACTIVE" },
      })
      console.log(`[WEBHOOK] Tenant ${tenantId} activated via subscription`)

      await createRevenueEntry(tenantId, "SUBSCRIPTION", session.amount_total, session.currency, `Abonament ${session.metadata?.billing || "lunar"}`, session.id)
    }
  }

  // ── Invoice paid (recurring subscription) ──
  if (event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice
    const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id

    if (customerId) {
      const tenant = await prisma.tenant.findFirst({
        where: { stripeCustomerId: customerId },
        select: { id: true },
      })

      if (tenant) {
        await createRevenueEntry(tenant.id, "SUBSCRIPTION", invoice.amount_paid, invoice.currency, `Abonament recurent`, invoice.id)
        console.log(`[WEBHOOK] Subscription invoice paid → tenant ${tenant.id}`)
      }
    }
  }

  return NextResponse.json({ received: true })
}

// ── Helper: create revenue entry ──
async function createRevenueEntry(
  tenantId: string,
  type: string,
  amountCents: number | null,
  currency: string | null,
  description: string,
  stripePaymentId: string,
) {
  const now = new Date()
  const periodMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  try {
    await (prisma as any).revenueEntry.create({
      data: {
        tenantId,
        type,
        amount: amountCents ? amountCents / 100 : 0, // Stripe uses cents
        currency: (currency || "ron").toUpperCase(),
        description,
        stripePaymentId,
        periodMonth,
      },
    })
  } catch (e: any) {
    console.error("[WEBHOOK] Failed to create revenue entry:", e.message)
  }
}
