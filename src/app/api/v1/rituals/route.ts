import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { RitualType } from "@/generated/prisma"

export const dynamic = "force-dynamic"

/**
 * /api/v1/rituals
 *
 * G3 — Rituals (Rhythm Layer).
 * Retrospective, post-incident reviews, strategic reviews.
 *
 * GET    ?businessId=...              — listare ritualuri
 * POST                                — creare ritual
 * PATCH  ?id=...                      — update / mark as run
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

  const includeInactive = url.searchParams.get("includeInactive") === "true"

  const rituals = await prisma.ritual.findMany({
    where: {
      businessId,
      ...(includeInactive ? {} : { isActive: true }),
    },
    orderBy: { ritualType: "asc" },
  })

  return NextResponse.json({
    rituals,
    total: rituals.length,
    byType: {
      RETROSPECTIVE: rituals.filter((r) => r.ritualType === "RETROSPECTIVE").length,
      POST_INCIDENT: rituals.filter((r) => r.ritualType === "POST_INCIDENT").length,
      STRATEGIC: rituals.filter((r) => r.ritualType === "STRATEGIC").length,
      CELEBRATION: rituals.filter((r) => r.ritualType === "CELEBRATION").length,
      CALIBRATION: rituals.filter((r) => r.ritualType === "CALIBRATION").length,
    },
  })
}

const createSchema = z.object({
  businessId: z.string().min(1),
  code: z.string().min(2).max(50).regex(/^[a-z0-9-_]+$/),
  name: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  ritualType: z.enum(["RETROSPECTIVE", "POST_INCIDENT", "STRATEGIC", "CELEBRATION", "CALIBRATION"]),
  cronExpression: z.string().min(5).max(50),
  timezone: z.string().optional().default("Europe/Bucharest"),
  templatePrompt: z.string().min(10),
  participantRoles: z.array(z.string()),
  outputTarget: z.enum(["ntfy", "kb", "brainstorm", "report"]),
})

export async function POST(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 })
  }
  const input = parsed.data

  const existing = await prisma.ritual.findUnique({
    where: { businessId_code: { businessId: input.businessId, code: input.code } },
  })
  if (existing) {
    return NextResponse.json({ error: "code_exists" }, { status: 409 })
  }

  const ritual = await prisma.ritual.create({
    data: {
      businessId: input.businessId,
      code: input.code,
      name: input.name,
      description: input.description,
      ritualType: input.ritualType as RitualType,
      cronExpression: input.cronExpression,
      timezone: input.timezone,
      templatePrompt: input.templatePrompt,
      participantRoles: input.participantRoles,
      outputTarget: input.outputTarget,
    },
  })

  return NextResponse.json({ ritual }, { status: 201 })
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

  // Update config
  if (body.name !== undefined) data.name = body.name
  if (body.description !== undefined) data.description = body.description
  if (body.cronExpression !== undefined) data.cronExpression = body.cronExpression
  if (body.templatePrompt !== undefined) data.templatePrompt = body.templatePrompt
  if (body.participantRoles !== undefined) data.participantRoles = body.participantRoles
  if (body.outputTarget !== undefined) data.outputTarget = body.outputTarget
  if (body.isActive !== undefined) data.isActive = body.isActive

  // Mark as run
  if (body.markRun === true) {
    data.lastRunAt = new Date()
    data.lastRunStatus = (body.runStatus as string) ?? "success"
    data.runCount = { increment: 1 }
  }

  const updated = await prisma.ritual.update({ where: { id }, data })
  return NextResponse.json({ ritual: updated })
}
