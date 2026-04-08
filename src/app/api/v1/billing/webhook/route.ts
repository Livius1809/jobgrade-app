import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { addCredits } from "@/lib/credits"
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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session

    if (session.payment_status !== "paid") {
      return NextResponse.json({ received: true })
    }

    const tenantId = session.metadata?.tenantId
    const credits = parseInt(session.metadata?.credits ?? "0", 10)
    const packageId = session.metadata?.packageId ?? "unknown"

    if (!tenantId || credits <= 0) {
      console.error("[WEBHOOK] Missing metadata in checkout session")
      return NextResponse.json({ received: true })
    }

    try {
      await addCredits(
        tenantId,
        credits,
        `Cumpărare pachet ${packageId} — ${credits} credite`,
        "PURCHASE"
      )
      console.log(`[WEBHOOK] Added ${credits} credits to tenant ${tenantId}`)
    } catch (err) {
      console.error("[WEBHOOK] Failed to add credits:", err)
      return NextResponse.json({ message: "Failed to add credits." }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}
