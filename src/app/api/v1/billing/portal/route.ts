import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe"
import { getAppUrl } from "@/lib/get-app-url"

const APP_URL = getAppUrl()

export async function POST(_req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const tenantId = session.user.tenantId

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { stripeCustomerId: true },
    })

    if (!tenant?.stripeCustomerId) {
      return NextResponse.json(
        { message: "Nu există un cont de facturare asociat." },
        { status: 404 }
      )
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: tenant.stripeCustomerId,
      return_url: `${APP_URL}/settings/billing`,
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (error) {
    console.error("[BILLING PORTAL]", error)
    return NextResponse.json({ message: "Eroare la deschidere portal." }, { status: 500 })
  }
}
