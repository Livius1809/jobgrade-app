import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import {
  BusinessStatus,
  BusinessLifecyclePhase,
} from "@/generated/prisma"

export const dynamic = "force-dynamic"

/**
 * /api/v1/businesses
 *
 * A0 — Business (top-level organism) — Living Organization architecture.
 * JobGrade e Business #1, viitorul Business #2 va fi al doilea organism.
 *
 * Awareness layer (ExternalSignal, EmergentTheme, StrategicTheme) e PARTAJAT
 * între businesses. Totul de la Goals în sus (A-G) e scoped per Business prin
 * FK pe `businessId`.
 *
 * GET  — listează toate businesses active
 * POST — creează un business nou (pentru Business #2 când va fi lansat)
 * PATCH (via ?code=...) — update lifecyclePhase / status / mvvStatement
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
  const includeArchived = url.searchParams.get("includeArchived") === "true"
  const code = url.searchParams.get("code")

  const where: Record<string, unknown> = {}
  if (!includeArchived) where.status = { not: "ARCHIVED" }
  if (code) where.code = code

  const businesses = await prisma.business.findMany({
    where,
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json({
    total: businesses.length,
    businesses,
  })
}

// ── POST ─────────────────────────────────────────────────────────────────────

const postSchema = z.object({
  code: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "code must be lowercase alphanumeric with hyphens"),
  name: z.string().min(2).max(200),
  description: z.string().max(5000).optional(),
  status: z
    .enum([
      "PRE_LAUNCH",
      "PILOT",
      "ACTIVE",
      "CONSOLIDATING",
      "SUSPENDED",
      "ARCHIVED",
    ])
    .optional()
    .default("PRE_LAUNCH"),
  lifecyclePhase: z
    .enum(["GROWTH", "MATURE", "CONSOLIDATION", "PIVOT"])
    .optional()
    .default("GROWTH"),
  mvvStatement: z.string().max(2000).optional(),
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

  // Idempotent: dacă code există, întoarce 409 cu entity existent
  const existing = await prisma.business.findUnique({
    where: { code: input.code },
  })
  if (existing) {
    return NextResponse.json(
      { error: "business_code_exists", existing },
      { status: 409 },
    )
  }

  const business = await prisma.business.create({
    data: {
      code: input.code,
      name: input.name,
      description: input.description,
      status: input.status as BusinessStatus,
      lifecyclePhase: input.lifecyclePhase as BusinessLifecyclePhase,
      mvvStatement: input.mvvStatement,
    },
  })

  return NextResponse.json({ business }, { status: 201 })
}

// ── PATCH ────────────────────────────────────────────────────────────────────

const patchSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  description: z.string().max(5000).optional(),
  status: z
    .enum([
      "PRE_LAUNCH",
      "PILOT",
      "ACTIVE",
      "CONSOLIDATING",
      "SUSPENDED",
      "ARCHIVED",
    ])
    .optional(),
  lifecyclePhase: z
    .enum(["GROWTH", "MATURE", "CONSOLIDATION", "PIVOT"])
    .optional(),
  mvvStatement: z.string().max(2000).optional(),
})

export async function PATCH(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const code = url.searchParams.get("code")
  if (!code) {
    return NextResponse.json(
      { error: "missing_code_query_param" },
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

  const existing = await prisma.business.findUnique({ where: { code } })
  if (!existing) {
    return NextResponse.json({ error: "business_not_found" }, { status: 404 })
  }

  const business = await prisma.business.update({
    where: { code },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && {
        status: input.status as BusinessStatus,
      }),
      ...(input.lifecyclePhase !== undefined && {
        lifecyclePhase: input.lifecyclePhase as BusinessLifecyclePhase,
      }),
      ...(input.mvvStatement !== undefined && {
        mvvStatement: input.mvvStatement,
      }),
    },
  })

  return NextResponse.json({ business })
}
