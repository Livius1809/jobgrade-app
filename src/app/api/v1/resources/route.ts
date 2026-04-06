import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import {
  aggregateUsage,
  checkBudgets,
  proposeNegotiations,
  type ResourceUsageInput,
  type ResourceBudgetInput,
} from "@/lib/agents/resource-meter"

export const dynamic = "force-dynamic"

/**
 * /api/v1/resources
 *
 * E1+E2 — Resource Metering + Budget Management (Metabolism Layer).
 *
 * GET    ?businessId=...&view=usage|budgets|negotiations  — vizualizare
 * POST   ?action=record                                   — înregistrează usage
 * POST   ?action=negotiate                                — cerere resurse
 * PATCH  ?id=...&entity=budget|negotiation                — update
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
    return NextResponse.json({ error: "missing_businessId" }, { status: 400 })
  }
  const view = url.searchParams.get("view") ?? "usage"
  const windowHours = parseInt(url.searchParams.get("windowHours") ?? "24", 10)

  if (view === "budgets") {
    const budgets = await prisma.resourceBudget.findMany({
      where: { businessId, isActive: true },
      orderBy: { priority: "desc" },
    })
    const budgetInputs: ResourceBudgetInput[] = budgets.map((b) => ({
      agentRole: b.agentRole,
      maxLlmTokensPerDay: b.maxLlmTokensPerDay,
      maxLlmCostPerDay: b.maxLlmCostPerDay,
      maxCyclesPerDay: b.maxCyclesPerDay,
      maxDurationMsPerDay: b.maxDurationMsPerDay,
      usedLlmTokens: b.usedLlmTokens,
      usedLlmCost: b.usedLlmCost,
      usedCycles: b.usedCycles,
      usedDurationMs: b.usedDurationMs,
      lastResetAt: b.lastResetAt,
      priority: b.priority,
    }))
    const checks = checkBudgets(budgetInputs)
    const proposals = proposeNegotiations(checks, budgetInputs)

    return NextResponse.json({
      budgets: checks,
      overBudgetCount: checks.filter((c) => !c.withinBudget).length,
      proposals,
    })
  }

  if (view === "negotiations") {
    const negotiations = await prisma.resourceNegotiation.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
      take: 50,
    })
    return NextResponse.json({ negotiations, total: negotiations.length })
  }

  // Default: usage aggregation
  const windowMs = windowHours * 60 * 60 * 1000
  const since = new Date(Date.now() - windowMs)

  const usages = await prisma.resourceUsage.findMany({
    where: { businessId, measuredAt: { gte: since } },
  })

  const usageInputs: ResourceUsageInput[] = usages.map((u) => ({
    agentRole: u.agentRole,
    actionType: u.actionType,
    llmTokensIn: u.llmTokensIn,
    llmTokensOut: u.llmTokensOut,
    llmCostUsd: u.llmCostUsd,
    dbQueries: u.dbQueries,
    durationMs: u.durationMs,
    measuredAt: u.measuredAt,
  }))

  const summaries = aggregateUsage(usageInputs, windowMs)
  const totalCost = summaries.reduce((s, a) => s + a.totalCostUsd, 0)

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    businessId,
    windowHours,
    totalCostUsd: Math.round(totalCost * 10000) / 10000,
    totalAgents: summaries.length,
    agents: summaries,
  })
}

// ── POST ─────────────────────────────────────────────────────────────────────

const recordSchema = z.object({
  businessId: z.string().min(1),
  agentRole: z.string().min(1),
  actionType: z.string().min(1),
  llmTokensIn: z.number().int().min(0).optional().default(0),
  llmTokensOut: z.number().int().min(0).optional().default(0),
  llmCostUsd: z.number().min(0).optional().default(0),
  dbQueries: z.number().int().min(0).optional().default(0),
  durationMs: z.number().int().min(0).optional().default(0),
  triggerSource: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

const negotiateSchema = z.object({
  businessId: z.string().min(1),
  requestorRole: z.string().min(1),
  donorRole: z.string().nullable().optional(),
  resourceType: z.enum(["llm_tokens", "llm_cost", "cycles", "duration"]),
  amountRequested: z.number().int().min(1),
  reason: z.string().min(5),
  objectiveId: z.string().optional(),
})

export async function POST(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const action = url.searchParams.get("action")
  const body = await req.json().catch(() => null)

  if (action === "record") {
    const parsed = recordSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 })
    }
    const input = parsed.data

    const usage = await prisma.resourceUsage.create({
      data: {
        businessId: input.businessId,
        agentRole: input.agentRole,
        actionType: input.actionType,
        llmTokensIn: input.llmTokensIn,
        llmTokensOut: input.llmTokensOut,
        llmCostUsd: input.llmCostUsd,
        dbQueries: input.dbQueries,
        durationMs: input.durationMs,
        triggerSource: input.triggerSource,
        metadata: input.metadata as unknown as import("@/generated/prisma").Prisma.InputJsonValue ?? undefined,
      },
    })

    // Update rolling budget
    await prisma.resourceBudget.updateMany({
      where: { businessId: input.businessId, agentRole: input.agentRole },
      data: {
        usedLlmTokens: { increment: input.llmTokensIn + input.llmTokensOut },
        usedLlmCost: { increment: input.llmCostUsd },
        usedCycles: { increment: 1 },
        usedDurationMs: { increment: input.durationMs },
      },
    })

    return NextResponse.json({ usage }, { status: 201 })
  }

  if (action === "negotiate") {
    const parsed = negotiateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 })
    }
    const input = parsed.data

    // Auto-grant dacă cererea e mică (<20% din bugetul curent)
    const budget = await prisma.resourceBudget.findUnique({
      where: { businessId_agentRole: { businessId: input.businessId, agentRole: input.requestorRole } },
    })

    let status: "PENDING" | "AUTO_GRANTED" = "PENDING"
    let amountGranted = 0

    if (budget) {
      const currentMax = input.resourceType === "llm_tokens" ? budget.maxLlmTokensPerDay
        : input.resourceType === "llm_cost" ? budget.maxLlmCostPerDay
        : input.resourceType === "cycles" ? budget.maxCyclesPerDay
        : budget.maxDurationMsPerDay

      if (input.amountRequested <= currentMax * 0.2) {
        status = "AUTO_GRANTED"
        amountGranted = input.amountRequested
      }
    }

    const negotiation = await prisma.resourceNegotiation.create({
      data: {
        businessId: input.businessId,
        requestorRole: input.requestorRole,
        donorRole: input.donorRole,
        resourceType: input.resourceType,
        amountRequested: input.amountRequested,
        amountGranted,
        reason: input.reason,
        objectiveId: input.objectiveId,
        status,
        decidedBy: status === "AUTO_GRANTED" ? "auto" : null,
        decidedAt: status === "AUTO_GRANTED" ? new Date() : null,
      },
    })

    return NextResponse.json({ negotiation }, { status: 201 })
  }

  return NextResponse.json({ error: "missing_action", valid: ["record", "negotiate"] }, { status: 400 })
}

// ── PATCH ────────────────────────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const id = url.searchParams.get("id")
  const entity = url.searchParams.get("entity")
  if (!id || !entity) {
    return NextResponse.json({ error: "missing_id_or_entity" }, { status: 400 })
  }

  const body = await req.json().catch(() => ({})) as Record<string, unknown>

  if (entity === "budget") {
    const data: Record<string, unknown> = {}
    if (body.maxLlmTokensPerDay !== undefined) data.maxLlmTokensPerDay = body.maxLlmTokensPerDay
    if (body.maxLlmCostPerDay !== undefined) data.maxLlmCostPerDay = body.maxLlmCostPerDay
    if (body.maxCyclesPerDay !== undefined) data.maxCyclesPerDay = body.maxCyclesPerDay
    if (body.maxDurationMsPerDay !== undefined) data.maxDurationMsPerDay = body.maxDurationMsPerDay
    if (body.priority !== undefined) data.priority = body.priority
    if (body.isActive !== undefined) data.isActive = body.isActive

    // Reset usage counters
    if (body.reset === true) {
      data.usedLlmTokens = 0
      data.usedLlmCost = 0
      data.usedCycles = 0
      data.usedDurationMs = 0
      data.lastResetAt = new Date()
    }

    const updated = await prisma.resourceBudget.update({ where: { id }, data })
    return NextResponse.json({ budget: updated })
  }

  if (entity === "negotiation") {
    const action = body.action as string
    if (!["grant", "deny"].includes(action)) {
      return NextResponse.json({ error: "invalid_action", valid: ["grant", "deny"] }, { status: 400 })
    }

    const negotiation = await prisma.resourceNegotiation.findUnique({ where: { id } })
    if (!negotiation || negotiation.status !== "PENDING") {
      return NextResponse.json({ error: "not_found_or_not_pending" }, { status: 404 })
    }

    const updated = await prisma.resourceNegotiation.update({
      where: { id },
      data: {
        status: action === "grant" ? "GRANTED" : "DENIED",
        amountGranted: action === "grant" ? (body.amount as number ?? negotiation.amountRequested) : 0,
        decidedBy: (body.decidedBy as string) ?? "owner",
        decidedAt: new Date(),
      },
    })

    return NextResponse.json({ negotiation: updated })
  }

  return NextResponse.json({ error: "invalid_entity", valid: ["budget", "negotiation"] }, { status: 400 })
}
