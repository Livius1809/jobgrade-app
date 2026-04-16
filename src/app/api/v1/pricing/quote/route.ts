import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/v1/pricing/quote?service=X&volume=Y
 *
 * Returnează cotația pentru un serviciu la un volum dat.
 * Folosește valorile din ServicePricing + CreditValue (populate de COG/Owner).
 *
 * Format răspuns:
 * {
 *   serviceCode, serviceName, serviceType, unitMeasure,
 *   volume,
 *   costPerUnitCredits, costPerUnitRON,
 *   totalCredits, totalRON,
 *   validUntil (effectiveFrom + 30 zile)
 * }
 */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ message: "auth" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const serviceCode = searchParams.get("service")
  const volume = parseInt(searchParams.get("volume") ?? "1", 10)
  const executionVariant = searchParams.get("variant") ?? "AUTO" // AUTO | HYBRID_AI_MEDIATED | HYBRID_HUMAN_MEDIATED

  if (!serviceCode || isNaN(volume) || volume < 1) {
    return NextResponse.json(
      { message: "Parametri obligatorii: service, volume (>= 1); opțional: variant" },
      { status: 400 }
    )
  }

  // Citește pricing curent + valoare credit (filtrat pe variantă)
  const [pricing, creditValue] = await Promise.all([
    prisma.servicePricing.findFirst({
      where: { serviceCode, executionVariant, effectiveFrom: { lte: new Date() } },
      orderBy: { effectiveFrom: "desc" },
    }),
    prisma.creditValue.findFirst({ orderBy: { effectiveFrom: "desc" } }),
  ])

  if (!pricing) {
    return NextResponse.json(
      { message: `Prețul pentru serviciul "${serviceCode}" nu este încă publicat. În curând disponibil.` },
      { status: 404 }
    )
  }

  if (!creditValue) {
    return NextResponse.json(
      { message: "Valoarea creditului nu este încă publicată. În curând disponibil." },
      { status: 404 }
    )
  }

  const costPerUnitCredits = Number(pricing.costInCredits)
  const valuePerCreditRON = Number(creditValue.valuePerCreditRON)
  const costPerUnitRON = costPerUnitCredits * valuePerCreditRON

  const totalCredits = costPerUnitCredits * volume
  const totalRON = costPerUnitRON * volume

  // Cotația e validă 30 zile de la generare (sau până la următoarea actualizare prețuri)
  const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  return NextResponse.json({
    serviceCode: pricing.serviceCode,
    serviceName: pricing.serviceName,
    serviceType: pricing.serviceType,
    unitMeasure: pricing.unitMeasure,
    volume,
    costPerUnitCredits,
    costPerUnitRON: Math.round(costPerUnitRON * 100) / 100,
    totalCredits: Math.round(totalCredits * 10000) / 10000,
    totalRON: Math.round(totalRON * 100) / 100,
    valuePerCreditRON,
    chatTier: pricing.chatTier,
    isFreeTier: pricing.isFreeTier,
    freeTierLimit: pricing.freeTierLimit,
    freeTierUnit: pricing.freeTierUnit,
    validUntil: validUntil.toISOString(),
  })
}
