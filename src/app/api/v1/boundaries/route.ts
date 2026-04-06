import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import {
  BoundaryRuleType,
  BoundarySeverity,
  BoundaryAction,
} from "@/generated/prisma"
import {
  checkBoundaries,
  type BoundaryRuleInput,
  type BoundaryCondition,
} from "@/lib/agents/boundary-engine"

export const dynamic = "force-dynamic"

/**
 * /api/v1/boundaries
 *
 * D1 — Boundary Rules Engine (Immune Layer).
 *
 * GET    ?businessId=...           — listare reguli active
 * POST                             — creare regulă
 * PATCH  ?id=...                   — update regulă
 * POST   ?action=check             — verifică input contra regulilor
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
  const ruleType = url.searchParams.get("ruleType")
  const includeInactive = url.searchParams.get("includeInactive") === "true"

  const where: Record<string, unknown> = {}
  if (businessId) where.businessId = businessId
  if (ruleType) where.ruleType = ruleType
  if (!includeInactive) where.isActive = true

  const rules = await prisma.boundaryRule.findMany({
    where,
    orderBy: [{ severity: "asc" }, { code: "asc" }],
    include: { _count: { select: { violations: true } } },
  })

  return NextResponse.json({
    rules: rules.map((r) => ({
      ...r,
      condition: r.condition as Record<string, unknown>,
      violationCount: r._count.violations,
    })),
    total: rules.length,
  })
}

// ── POST ─────────────────────────────────────────────────────────────────────

const createSchema = z.object({
  businessId: z.string().nullable().optional(),
  code: z.string().min(2).max(50).regex(/^[a-z0-9-_]+$/),
  name: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  ruleType: z.enum(["MORAL_CORE", "SCOPE_VIOLATION", "CONSISTENCY", "DATA_INTEGRITY", "PRIVACY"]),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).optional().default("HIGH"),
  condition: z.record(z.string(), z.unknown()),
  action: z.enum(["BLOCK", "QUARANTINE", "WARN", "LOG"]).optional().default("BLOCK"),
  notifyRoles: z.array(z.string()).optional().default([]),
  escalateToOwner: z.boolean().optional().default(false),
})

const checkSchema = z.object({
  businessId: z.string().optional(),
  sourceType: z.string().min(1),
  sourceRole: z.string().optional(),
  content: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export async function POST(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const action = url.searchParams.get("action")

  // ── Check action: verifică input contra regulilor ──
  if (action === "check") {
    const body = await req.json().catch(() => null)
    const parsed = checkSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_input", details: parsed.error.flatten() },
        { status: 400 },
      )
    }
    const input = parsed.data

    // Încarcă reguli (shared + business-specific)
    const where: Record<string, unknown> = { isActive: true }
    if (input.businessId) {
      where.OR = [{ businessId: null }, { businessId: input.businessId }]
    }

    const rules = await prisma.boundaryRule.findMany({ where: { isActive: true } })

    // Filtrează: shared (businessId null) + business-specific
    const relevantRules = rules.filter(
      (r) => r.businessId === null || r.businessId === input.businessId,
    )

    const ruleInputs: BoundaryRuleInput[] = relevantRules.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      ruleType: r.ruleType as BoundaryRuleInput["ruleType"],
      severity: r.severity as BoundaryRuleInput["severity"],
      condition: r.condition as BoundaryCondition,
      action: r.action as BoundaryRuleInput["action"],
      notifyRoles: r.notifyRoles,
      escalateToOwner: r.escalateToOwner,
      isActive: r.isActive,
    }))

    const verdict = checkBoundaries(ruleInputs, {
      sourceType: input.sourceType,
      sourceRole: input.sourceRole,
      content: input.content,
      metadata: input.metadata,
    })

    // Persistă violațiile
    for (const v of verdict.violations) {
      await prisma.boundaryViolation.create({
        data: {
          ruleId: v.ruleId,
          businessId: input.businessId ?? null,
          sourceType: input.sourceType,
          sourceRole: input.sourceRole,
          inputSnapshot: input.content.slice(0, 5000),
          actionTaken: v.action as BoundaryAction,
        },
      })
    }

    return NextResponse.json({ verdict })
  }

  // ── Create rule ──
  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    )
  }
  const input = parsed.data

  const existing = await prisma.boundaryRule.findUnique({ where: { code: input.code } })
  if (existing) {
    return NextResponse.json({ error: "code_exists", existing }, { status: 409 })
  }

  const rule = await prisma.boundaryRule.create({
    data: {
      businessId: input.businessId ?? null,
      code: input.code,
      name: input.name,
      description: input.description,
      ruleType: input.ruleType as BoundaryRuleType,
      severity: (input.severity as BoundarySeverity) ?? "HIGH",
      condition: input.condition as unknown as import("@/generated/prisma").Prisma.InputJsonValue,
      action: (input.action as BoundaryAction) ?? "BLOCK",
      notifyRoles: input.notifyRoles,
      escalateToOwner: input.escalateToOwner,
    },
  })

  return NextResponse.json({ rule }, { status: 201 })
}

// ── PATCH ────────────────────────────────────────────────────────────────────

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
  if (!body) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 })
  }

  const existing = await prisma.boundaryRule.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 })
  }

  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = body.name
  if (body.description !== undefined) data.description = body.description
  if (body.severity !== undefined) data.severity = body.severity
  if (body.condition !== undefined) data.condition = body.condition
  if (body.action !== undefined) data.action = body.action
  if (body.notifyRoles !== undefined) data.notifyRoles = body.notifyRoles
  if (body.escalateToOwner !== undefined) data.escalateToOwner = body.escalateToOwner
  if (body.isActive !== undefined) data.isActive = body.isActive

  const updated = await prisma.boundaryRule.update({ where: { id }, data })
  return NextResponse.json({ rule: updated })
}
