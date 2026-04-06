import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

/**
 * /api/v1/outcomes
 *
 * G1 — Service Outcomes (Rhythm Layer).
 * Metric singular de rezultat real per serviciu + measurements.
 *
 * GET    ?businessId=...                  — listare outcomes
 * POST                                    — creare outcome
 * PATCH  ?id=...                          — update outcome
 * POST   ?action=measure&outcomeId=...    — adaugă measurement
 */

function verifyInternalAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

export async function GET(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const businessId = url.searchParams.get("businessId")
  if (!businessId) {
    return NextResponse.json({ error: "missing_businessId" }, { status: 400 })
  }

  const includeMeasurements = url.searchParams.get("includeMeasurements") === "true"

  const outcomes = await prisma.serviceOutcome.findMany({
    where: { businessId, isActive: true },
    orderBy: { serviceCode: "asc" },
    include: includeMeasurements
      ? { measurements: { orderBy: { measuredAt: "desc" }, take: 10 } }
      : undefined,
  })

  return NextResponse.json({
    outcomes,
    total: outcomes.length,
    withCurrentValue: outcomes.filter((o) => o.currentValue !== null).length,
    onTarget: outcomes.filter((o) =>
      o.currentValue !== null && o.currentValue >= o.targetValue,
    ).length,
  })
}

const createSchema = z.object({
  businessId: z.string().min(1),
  serviceCode: z.string().min(2).max(50).regex(/^[a-z0-9-_]+$/),
  serviceName: z.string().min(3).max(200),
  metricName: z.string().min(2).max(100),
  metricUnit: z.string().min(1).max(20),
  targetValue: z.number(),
  currentValue: z.number().nullable().optional(),
  collectionMethod: z.enum(["client_feedback", "automated", "manual_review", "a_b_test"]),
  collectionFrequency: z.enum(["per_session", "monthly", "quarterly"]),
})

const measureSchema = z.object({
  value: z.number(),
  source: z.enum(["client_survey", "system_auto", "owner_manual", "a_b_result"]),
  notes: z.string().max(2000).optional(),
  tenantId: z.string().optional(),
  sessionId: z.string().optional(),
})

export async function POST(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const action = url.searchParams.get("action")
  const body = await req.json().catch(() => null)

  if (action === "measure") {
    const outcomeId = url.searchParams.get("outcomeId")
    if (!outcomeId) {
      return NextResponse.json({ error: "missing_outcomeId" }, { status: 400 })
    }

    const parsed = measureSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 })
    }

    const outcome = await prisma.serviceOutcome.findUnique({ where: { id: outcomeId } })
    if (!outcome) {
      return NextResponse.json({ error: "outcome_not_found" }, { status: 404 })
    }

    const measurement = await prisma.outcomeMeasurement.create({
      data: {
        outcomeId,
        value: parsed.data.value,
        source: parsed.data.source,
        notes: parsed.data.notes,
        tenantId: parsed.data.tenantId,
        sessionId: parsed.data.sessionId,
      },
    })

    // Update currentValue pe outcome
    await prisma.serviceOutcome.update({
      where: { id: outcomeId },
      data: { currentValue: parsed.data.value },
    })

    return NextResponse.json({ measurement }, { status: 201 })
  }

  // Create outcome
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 })
  }
  const input = parsed.data

  const existing = await prisma.serviceOutcome.findUnique({
    where: { businessId_serviceCode: { businessId: input.businessId, serviceCode: input.serviceCode } },
  })
  if (existing) {
    return NextResponse.json({ error: "service_code_exists" }, { status: 409 })
  }

  const outcome = await prisma.serviceOutcome.create({ data: input })
  return NextResponse.json({ outcome }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const id = url.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 })

  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  const data: Record<string, unknown> = {}

  if (body.serviceName !== undefined) data.serviceName = body.serviceName
  if (body.metricName !== undefined) data.metricName = body.metricName
  if (body.metricUnit !== undefined) data.metricUnit = body.metricUnit
  if (body.targetValue !== undefined) data.targetValue = body.targetValue
  if (body.collectionMethod !== undefined) data.collectionMethod = body.collectionMethod
  if (body.collectionFrequency !== undefined) data.collectionFrequency = body.collectionFrequency
  if (body.isActive !== undefined) data.isActive = body.isActive

  const updated = await prisma.serviceOutcome.update({ where: { id }, data })
  return NextResponse.json({ outcome: updated })
}
