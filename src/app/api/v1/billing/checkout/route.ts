import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { stripe, CREDIT_PACKAGES } from "@/lib/stripe"

const schema = z.object({
  packageId: z.enum(["credits_50", "credits_150", "credits_500"]),
})

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const tenantId = session.user.tenantId
    const body = await req.json()
    const data = schema.parse(body)

    const pkg = CREDIT_PACKAGES.find((p) => p.id === data.packageId)
    if (!pkg) {
      return NextResponse.json({ message: "Pachet invalid." }, { status: 400 })
    }

    // Get or create Stripe customer for this tenant
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

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: pkg.priceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${APP_URL}/app/settings/billing?success=1&credits=${pkg.credits}`,
      cancel_url: `${APP_URL}/app/settings/billing?canceled=1`,
      metadata: {
        tenantId,
        packageId: pkg.id,
        credits: String(pkg.credits),
      },
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Date invalide.", errors: error.issues },
        { status: 400 }
      )
    }
    console.error("[BILLING CHECKOUT]", error)
    return NextResponse.json({ message: "Eroare la creare sesiune plată." }, { status: 500 })
  }
}
