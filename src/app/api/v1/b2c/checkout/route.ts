/**
 * B2C Checkout — Credit purchases with fiscal document handling
 *
 * Bon fiscal (receipt) = default, pseudonim, zero date reale
 * Factură (invoice) = opțional, date de facturare complete
 *
 * TVA: B2C = mereu cu TVA 19% inclus (conform project_fiscal_ro.md)
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { extractB2CAuth } from "@/lib/security/b2c-auth"
import { getStripe, findCreditPackage, CREDIT_PACKAGES } from "@/lib/stripe"
import { getAppUrl } from "@/lib/get-app-url"

export const dynamic = "force-dynamic"

const billingDataSchema = z.object({
  fullName: z.string().min(2),
  cui: z.string().optional(),
  address: z.string().min(3),
  county: z.string().min(2),
  isCompany: z.boolean().default(false),
})

const schema = z.object({
  userId: z.string(),
  packageId: z.string(),
  documentType: z.enum(["receipt", "invoice"]).default("receipt"),
  billingData: billingDataSchema.optional(),
})

export async function POST(req: NextRequest) {
  try {
    // ── Auth ──
    const b2cAuth = extractB2CAuth(req)
    if (!b2cAuth) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const body = await req.json()
    const data = schema.parse(body)

    // Verify ownership
    if (b2cAuth.sub !== data.userId) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 403 })
    }

    // ── Validate user exists ──
    const p = prisma as any
    const user = await p.b2CUser.findUnique({
      where: { id: data.userId },
      select: { id: true, alias: true, status: true },
    })

    if (!user || user.status === "DELETED") {
      return NextResponse.json({ message: "Utilizator negăsit." }, { status: 404 })
    }

    // ── Find credit package ──
    const pkg = findCreditPackage(data.packageId)
    if (!pkg) {
      return NextResponse.json({ message: "Pachet de credite invalid." }, { status: 400 })
    }

    // ── Validate invoice data ──
    if (data.documentType === "invoice" && !data.billingData) {
      return NextResponse.json(
        { message: "Datele de facturare sunt obligatorii pentru factură." },
        { status: 400 },
      )
    }

    const APP_URL = getAppUrl()
    const stripeClient = getStripe() // B2C uses default mode

    // ── TVA: B2C mereu cu TVA 19% inclus ──
    const vatRate = 0.19
    const priceWithoutVAT = pkg.price
    const vatAmount = Math.round(priceWithoutVAT * vatRate)
    const totalWithVAT = priceWithoutVAT + vatAmount

    // ── Build Stripe customer data ──
    const isReceipt = data.documentType === "receipt"

    const customerParams: Record<string, any> = {
      metadata: {
        b2cUserId: data.userId,
        type: "b2c",
      },
    }

    if (isReceipt) {
      // Bon fiscal — pseudonim, zero date personale
      customerParams.name = user.alias
    } else {
      // Factură — date reale de facturare
      const billing = data.billingData!
      customerParams.name = billing.fullName
      customerParams.address = {
        line1: billing.address,
        state: billing.county,
        country: "RO",
      }
      if (billing.cui) {
        customerParams.metadata.cui = billing.cui
      }
      customerParams.tax_exempt = billing.isCompany && billing.cui ? "reverse" : "none"
    }

    // Create ephemeral Stripe customer for B2C (no stripeCustomerId on B2CUser)
    const customer = await stripeClient.customers.create(customerParams)

    // ── Build metadata ──
    const metadata: Record<string, string> = {
      userId: data.userId,
      type: "b2c_credits",
      documentType: data.documentType,
      packageId: pkg.id,
      credits: String(pkg.credits),
    }

    if (!isReceipt && data.billingData) {
      metadata.fullName = data.billingData.fullName
      if (data.billingData.cui) {
        metadata.cui = data.billingData.cui
      }
    }

    // ── Description ──
    const description = isReceipt
      ? "Credite JobGrade \u2014 bon fiscal"
      : "Credite JobGrade \u2014 factur\u0103"

    // ── Statement descriptor (max 22 chars for bank statement) ──
    const shortCode = pkg.id.replace("credits_", "").toUpperCase().slice(0, 8)

    // ── Create Stripe checkout session ──
    const checkoutSession = await stripeClient.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "ron",
            product_data: {
              name: `${pkg.label} \u2014 ${pkg.credits} credite`,
              description,
            },
            unit_amount: totalWithVAT * 100, // Stripe uses smallest currency unit (bani)
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${APP_URL}/personal?success=credits&amount=${pkg.credits}`,
      cancel_url: `${APP_URL}/personal?canceled=1`,
      payment_intent_data: {
        statement_descriptor: "JOBGRADE CREDITE",
        statement_descriptor_suffix: shortCode,
      },
      metadata,
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Date invalide.", errors: error.issues },
        { status: 400 },
      )
    }
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error("[B2C CHECKOUT]", errMsg, error)
    return NextResponse.json({ message: `Eroare: ${errMsg}` }, { status: 500 })
  }
}
