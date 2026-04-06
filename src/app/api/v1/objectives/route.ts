import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import {
  ObjectiveDirection,
  ObjectivePriority,
  ObjectiveStatus,
} from "@/generated/prisma"

export const dynamic = "force-dynamic"

/**
 * /api/v1/objectives
 *
 * A1 — OrganizationalObjective — Living Organization Goals layer.
 * Obiectivele operaționale ale fiecărui Business (organism). Fundament pentru
 * tot ce urmează în straturile A-G.
 *
 * Scoped per Business prin `businessId` query param (required pe GET, în body pe POST).
 *
 * GET   ?businessId=biz_jobgrade&status=ACTIVE — listare cu filtre
 * POST                                         — creează obiectiv nou
 * PATCH ?id=<objectiveId>                      — update status / currentValue / priority
 *
 * Principiu: definirea obiectivelor e act Owner / strategic. API-ul expune CRUD
 * dar validarea de conținut (ce e un obiectiv bun) rămâne la Owner.
 */

function verifyInternalAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

// ── GET ──────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const businessId = url.searchParams.get("businessId")
  if (!businessId) {
    return NextResponse.json(
      { error: "missing_businessId_query_param" },
      { status: 400 },
    )
  }

  const status = url.searchParams.get("status")
  const priority = url.searchParams.get("priority")
  const includeArchived = url.searchParams.get("includeArchived") === "true"
  const tag = url.searchParams.get("tag")

  const where: Record<string, unknown> = { businessId }
  if (status) where.status = status
  else if (!includeArchived) where.status = { not: "ARCHIVED" }
  if (priority) where.priority = priority
  if (tag) where.tags = { has: tag }

  // Verifică că businessId există
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { id: true, code: true, name: true },
  })
  if (!business) {
    return NextResponse.json({ error: "business_not_found" }, { status: 404 })
  }

  const objectives = await prisma.organizationalObjective.findMany({
    where,
    orderBy: [{ priority: "asc" }, { deadlineAt: "asc" }, { createdAt: "desc" }],
  })

  return NextResponse.json({
    business,
    total: objectives.length,
    objectives,
  })
}

// ── POST ─────────────────────────────────────────────────────────────────────

const postSchema = z.object({
  businessId: z.string().min(1),
  code: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-_]+$/, "code must be lowercase alphanumeric with - or _"),
  title: z.string().min(3).max(300),
  description: z.string().min(10).max(5000),
  metricName: z.string().min(2).max(100),
  metricUnit: z.string().max(50).optional(),
  targetValue: z.number(),
  currentValue: z.number().nullable().optional(),
  direction: z
    .enum(["INCREASE", "DECREASE", "MAINTAIN", "REACH"])
    .optional()
    .default("INCREASE"),
  startDate: z.string().datetime().optional(),
  deadlineAt: z.string().datetime().optional(),
  priority: z
    .enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"])
    .optional()
    .default("MEDIUM"),
  status: z
    .enum([
      "DRAFT",
      "ACTIVE",
      "AT_RISK",
      "MET",
      "FAILED",
      "SUSPENDED",
      "ARCHIVED",
    ])
    .optional()
    .default("ACTIVE"),
  ownerRoles: z.array(z.string()).optional().default([]),
  contributorRoles: z.array(z.string()).optional().default([]),
  tags: z.array(z.string()).optional().default([]),
  sourceDocUrl: z.string().url().max(2000).optional(),
  createdBy: z.string().max(100).optional(),
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

  // Verifică că Business există
  const business = await prisma.business.findUnique({
    where: { id: input.businessId },
  })
  if (!business) {
    return NextResponse.json({ error: "business_not_found" }, { status: 404 })
  }

  // Verifică unicitatea code-ului per business
  const existing = await prisma.organizationalObjective.findUnique({
    where: {
      businessId_code: { businessId: input.businessId, code: input.code },
    },
  })
  if (existing) {
    return NextResponse.json(
      { error: "objective_code_exists", existing },
      { status: 409 },
    )
  }

  const objective = await prisma.organizationalObjective.create({
    data: {
      businessId: input.businessId,
      code: input.code,
      title: input.title,
      description: input.description,
      metricName: input.metricName,
      metricUnit: input.metricUnit,
      targetValue: input.targetValue,
      currentValue: input.currentValue,
      direction: input.direction as ObjectiveDirection,
      startDate: input.startDate ? new Date(input.startDate) : new Date(),
      deadlineAt: input.deadlineAt ? new Date(input.deadlineAt) : null,
      priority: input.priority as ObjectivePriority,
      status: input.status as ObjectiveStatus,
      ownerRoles: input.ownerRoles,
      contributorRoles: input.contributorRoles,
      tags: input.tags,
      sourceDocUrl: input.sourceDocUrl,
      createdBy: input.createdBy,
    },
  })

  return NextResponse.json({ objective }, { status: 201 })
}

// ── PATCH ────────────────────────────────────────────────────────────────────

const patchSchema = z.object({
  title: z.string().min(3).max(300).optional(),
  description: z.string().min(10).max(5000).optional(),
  targetValue: z.number().optional(),
  currentValue: z.number().optional(),
  deadlineAt: z.string().datetime().nullable().optional(),
  priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).optional(),
  status: z
    .enum([
      "DRAFT",
      "ACTIVE",
      "AT_RISK",
      "MET",
      "FAILED",
      "SUSPENDED",
      "ARCHIVED",
    ])
    .optional(),
  ownerRoles: z.array(z.string()).optional(),
  contributorRoles: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
})

export async function PATCH(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const id = url.searchParams.get("id")
  if (!id) {
    return NextResponse.json(
      { error: "missing_id_query_param" },
      { status: 400 },
    )
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

  const existing = await prisma.organizationalObjective.findUnique({
    where: { id },
  })
  if (!existing) {
    return NextResponse.json({ error: "objective_not_found" }, { status: 404 })
  }

  // Auto-set completedAt când status trece la MET
  const completedAt =
    input.status === "MET" && existing.status !== "MET"
      ? new Date()
      : input.status &&
          input.status !== "MET" &&
          existing.status === "MET"
        ? null
        : undefined

  const objective = await prisma.organizationalObjective.update({
    where: { id },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.targetValue !== undefined && { targetValue: input.targetValue }),
      ...(input.currentValue !== undefined && {
        currentValue: input.currentValue,
      }),
      ...(input.deadlineAt !== undefined && {
        deadlineAt: input.deadlineAt ? new Date(input.deadlineAt) : null,
      }),
      ...(input.priority !== undefined && {
        priority: input.priority as ObjectivePriority,
      }),
      ...(input.status !== undefined && {
        status: input.status as ObjectiveStatus,
      }),
      ...(input.ownerRoles !== undefined && { ownerRoles: input.ownerRoles }),
      ...(input.contributorRoles !== undefined && {
        contributorRoles: input.contributorRoles,
      }),
      ...(input.tags !== undefined && { tags: input.tags }),
      ...(completedAt !== undefined && { completedAt }),
    },
  })

  return NextResponse.json({ objective })
}
