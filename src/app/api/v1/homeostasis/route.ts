import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { HomeostaticTargetType, HomeostaticStatus } from "@/generated/prisma"
import {
  evaluateHomeostasis,
  summarizeHomeostasis,
  type HomeostaticTargetInput,
} from "@/lib/agents/homeostasis-monitor"

export const dynamic = "force-dynamic"

/**
 * /api/v1/homeostasis
 *
 * C1 — Homeostatic Targets + Monitor.
 *
 * GET    ?businessId=... — evaluate all targets + return current state
 * POST                   — create new target
 * PATCH  ?id=...         — update reading or config
 */

function verifyInternalAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

// ── GET (evaluate) ───────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const businessId = url.searchParams.get("businessId")
  if (!businessId) {
    return NextResponse.json({ error: "missing_businessId" }, { status: 400 })
  }

  const targets = await prisma.homeostaticTarget.findMany({
    where: { businessId, isActive: true },
    orderBy: { code: "asc" },
  })

  const inputs: HomeostaticTargetInput[] = targets.map((t) => ({
    id: t.id,
    code: t.code,
    name: t.name,
    metricName: t.metricName,
    metricUnit: t.metricUnit,
    targetType: t.targetType,
    targetEntityId: t.targetEntityId,
    minValue: t.minValue,
    maxValue: t.maxValue,
    optimalValue: t.optimalValue,
    warningPct: t.warningPct,
    criticalPct: t.criticalPct,
    lastReading: t.lastReading,
    lastReadingAt: t.lastReadingAt,
    autoCorrect: t.autoCorrect,
  }))

  const evaluations = evaluateHomeostasis(inputs)
  const summary = summarizeHomeostasis(evaluations)

  // Update currentStatus in DB for each target (side-effect, dar lightweight)
  for (const ev of evaluations) {
    if (ev.status !== "UNKNOWN") {
      await prisma.homeostaticTarget.update({
        where: { id: ev.targetId },
        data: { currentStatus: ev.status as HomeostaticStatus },
      })
    }
  }

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    businessId,
    summary,
    evaluations,
  })
}

// ── POST (create target) ────────────────────────────────────────────────────

const postSchema = z.object({
  businessId: z.string().min(1),
  code: z.string().min(2).max(50).regex(/^[a-z0-9-_]+$/),
  name: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  metricName: z.string().min(2).max(100),
  metricUnit: z.string().max(20).optional(),
  targetType: z.enum(["SERVICE", "ROLE", "SYSTEM"]),
  targetEntityId: z.string().max(100).nullable().optional(),
  minValue: z.number().nullable().optional(),
  maxValue: z.number().nullable().optional(),
  optimalValue: z.number().nullable().optional(),
  warningPct: z.number().min(1).max(100).optional().default(10),
  criticalPct: z.number().min(1).max(100).optional().default(25),
  autoCorrect: z.boolean().optional().default(false),
})

export async function POST(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = postSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    )
  }
  const input = parsed.data

  const existing = await prisma.homeostaticTarget.findUnique({
    where: { businessId_code: { businessId: input.businessId, code: input.code } },
  })
  if (existing) {
    return NextResponse.json({ error: "target_code_exists", existing }, { status: 409 })
  }

  const target = await prisma.homeostaticTarget.create({
    data: {
      businessId: input.businessId,
      code: input.code,
      name: input.name,
      description: input.description,
      metricName: input.metricName,
      metricUnit: input.metricUnit,
      targetType: input.targetType as HomeostaticTargetType,
      targetEntityId: input.targetEntityId,
      minValue: input.minValue ?? null,
      maxValue: input.maxValue ?? null,
      optimalValue: input.optimalValue ?? null,
      warningPct: input.warningPct,
      criticalPct: input.criticalPct,
      autoCorrect: input.autoCorrect,
    },
  })

  return NextResponse.json({ target }, { status: 201 })
}

// ── PATCH (update reading or config) ─────────────────────────────────────────

const patchSchema = z.object({
  lastReading: z.number().optional(),
  minValue: z.number().nullable().optional(),
  maxValue: z.number().nullable().optional(),
  optimalValue: z.number().nullable().optional(),
  warningPct: z.number().min(1).max(100).optional(),
  criticalPct: z.number().min(1).max(100).optional(),
  autoCorrect: z.boolean().optional(),
  isActive: z.boolean().optional(),
})

export async function PATCH(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const id = url.searchParams.get("id")
  if (!id) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 })
  }

  const body = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    )
  }
  const input = parsed.data

  const existing = await prisma.homeostaticTarget.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "target_not_found" }, { status: 404 })
  }

  const data: Record<string, unknown> = {}
  if (input.lastReading !== undefined) {
    data.lastReading = input.lastReading
    data.lastReadingAt = new Date()
  }
  if (input.minValue !== undefined) data.minValue = input.minValue
  if (input.maxValue !== undefined) data.maxValue = input.maxValue
  if (input.optimalValue !== undefined) data.optimalValue = input.optimalValue
  if (input.warningPct !== undefined) data.warningPct = input.warningPct
  if (input.criticalPct !== undefined) data.criticalPct = input.criticalPct
  if (input.autoCorrect !== undefined) data.autoCorrect = input.autoCorrect
  if (input.isActive !== undefined) data.isActive = input.isActive

  const updated = await prisma.homeostaticTarget.update({
    where: { id },
    data,
  })

  return NextResponse.json({ target: updated })
}
