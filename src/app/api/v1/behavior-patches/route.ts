import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { PatchType, PatchStatus } from "@/generated/prisma"
import {
  canTransition,
  computeExpiresAt,
  checkExpired,
  summarizePatches,
  type PatchInput,
  type PatchStatus as PatchStatusType,
} from "@/lib/agents/patch-lifecycle"

export const dynamic = "force-dynamic"

/**
 * /api/v1/behavior-patches
 *
 * B1 — AgentBehaviorPatch CRUD + lifecycle management.
 *
 * GET   ?businessId=...                — listare patches (default: non-terminal)
 * POST                                 — propune patch nou (status=PROPOSED)
 * PATCH ?id=...&action=approve|apply|confirm|revert|reject|expire-check
 *
 * Action lifecycle:
 *   PROPOSED → approve → APPROVED → apply → ACTIVE → confirm → CONFIRMED
 *                                         → (auto) → EXPIRED
 *                                         → revert → REVERTED
 *            → reject → REJECTED
 *
 * Special action: expire-check — scanează ACTIVE patches cu expiresAt depășit
 *                                și le mută la EXPIRED. Apelabil de cron.
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
  const includeTerminal = url.searchParams.get("includeTerminal") === "true"
  const targetRole = url.searchParams.get("targetRole")

  const where: Record<string, unknown> = { businessId }
  if (!includeTerminal) {
    where.status = { in: ["PROPOSED", "APPROVED", "ACTIVE", "CONFIRMED"] }
  }
  if (targetRole) where.targetRole = targetRole

  const patches = await prisma.agentBehaviorPatch.findMany({
    where,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  })

  const patchInputs: PatchInput[] = patches.map((p) => ({
    id: p.id,
    targetRole: p.targetRole,
    patchType: p.patchType as PatchInput["patchType"],
    patchSpec: p.patchSpec as Record<string, unknown>,
    triggeredBy: p.triggeredBy,
    rationale: p.rationale,
    status: p.status as PatchInput["status"],
    appliedAt: p.appliedAt,
    expiresAt: p.expiresAt,
    confirmedAt: p.confirmedAt,
  }))

  const summary = summarizePatches(patchInputs)

  return NextResponse.json({
    businessId,
    summary,
    patches,
  })
}

// ── POST ─────────────────────────────────────────────────────────────────────

const postSchema = z.object({
  businessId: z.string().min(1),
  targetRole: z.string().min(1),
  patchType: z.enum([
    "PRIORITY_SHIFT",
    "ATTENTION_SHIFT",
    "SCOPE_EXPAND",
    "SCOPE_NARROW",
    "ACTIVITY_MODE",
    "CYCLE_INTERVAL",
  ]),
  patchSpec: z.record(z.string(), z.unknown()),
  triggeredBy: z.string().min(1),
  triggerSourceId: z.string().optional(),
  rationale: z.string().min(10).max(5000),
  ttlHours: z.number().min(1).max(168).optional().default(24),
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

  // Verifică că agentul există
  const agent = await prisma.agentDefinition.findUnique({
    where: { agentRole: input.targetRole },
    select: { agentRole: true, displayName: true },
  })
  if (!agent) {
    return NextResponse.json({ error: "agent_not_found" }, { status: 404 })
  }

  const patch = await prisma.agentBehaviorPatch.create({
    data: {
      businessId: input.businessId,
      targetRole: input.targetRole,
      patchType: input.patchType as PatchType,
      patchSpec: input.patchSpec as unknown as import("@/generated/prisma").Prisma.InputJsonValue,
      triggeredBy: input.triggeredBy,
      triggerSourceId: input.triggerSourceId,
      rationale: input.rationale,
      status: "PROPOSED",
    },
  })

  return NextResponse.json(
    { patch, agent: { role: agent.agentRole, name: agent.displayName } },
    { status: 201 },
  )
}

// ── PATCH ────────────────────────────────────────────────────────────────────

const ACTION_TO_STATUS: Record<string, PatchStatusType> = {
  approve: "APPROVED",
  apply: "ACTIVE",
  confirm: "CONFIRMED",
  revert: "REVERTED",
  reject: "REJECTED",
}

export async function PATCH(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const action = url.searchParams.get("action")

  // Special action: expire-check — scanează toate ACTIVE cu expiresAt depășit
  if (action === "expire-check") {
    const businessId = url.searchParams.get("businessId")
    if (!businessId) {
      return NextResponse.json({ error: "missing_businessId" }, { status: 400 })
    }
    const activePatches = await prisma.agentBehaviorPatch.findMany({
      where: { businessId, status: "ACTIVE", expiresAt: { not: null } },
    })
    const patchInputs: PatchInput[] = activePatches.map((p) => ({
      id: p.id,
      targetRole: p.targetRole,
      patchType: p.patchType as PatchInput["patchType"],
      patchSpec: p.patchSpec as Record<string, unknown>,
      triggeredBy: p.triggeredBy,
      rationale: p.rationale,
      status: p.status as PatchInput["status"],
      appliedAt: p.appliedAt,
      expiresAt: p.expiresAt,
      confirmedAt: p.confirmedAt,
    }))
    const results = checkExpired(patchInputs)
    const toExpire = results.filter((r) => r.shouldExpire)

    let expired = 0
    for (const r of toExpire) {
      await prisma.agentBehaviorPatch.update({
        where: { id: r.patchId },
        data: {
          status: "EXPIRED",
          revertedAt: new Date(),
          revertReason: "auto_expired",
        },
      })
      expired++
    }

    return NextResponse.json({
      action: "expire-check",
      checked: results.length,
      expired,
      details: toExpire.map((r) => ({
        patchId: r.patchId,
        targetRole: r.targetRole,
        minutesPastExpiry: r.minutesPastExpiry,
      })),
    })
  }

  // Normal lifecycle transition
  const id = url.searchParams.get("id")
  if (!id || !action) {
    return NextResponse.json(
      { error: "missing_id_or_action_param" },
      { status: 400 },
    )
  }

  const targetStatus = ACTION_TO_STATUS[action]
  if (!targetStatus) {
    return NextResponse.json(
      {
        error: "invalid_action",
        validActions: Object.keys(ACTION_TO_STATUS),
      },
      { status: 400 },
    )
  }

  const existing = await prisma.agentBehaviorPatch.findUnique({
    where: { id },
  })
  if (!existing) {
    return NextResponse.json({ error: "patch_not_found" }, { status: 404 })
  }

  if (!canTransition(existing.status as PatchStatusType, targetStatus)) {
    return NextResponse.json(
      {
        error: "invalid_transition",
        from: existing.status,
        to: targetStatus,
        validNext: getValidTransitionsForStatus(existing.status as PatchStatusType),
      },
      { status: 409 },
    )
  }

  // Build update data based on action
  const now = new Date()
  const updateData: Record<string, unknown> = {
    status: targetStatus as PatchStatus,
  }

  if (action === "apply") {
    updateData.appliedAt = now
    // Read body for optional ttlHours
    const body = await req.json().catch(() => ({}))
    const ttlHours =
      typeof body?.ttlHours === "number" ? body.ttlHours : 24
    updateData.expiresAt = computeExpiresAt(now, ttlHours)
  }
  if (action === "confirm") {
    updateData.confirmedAt = now
  }
  if (action === "revert") {
    updateData.revertedAt = now
    updateData.revertReason = "owner_reverted"
  }
  if (action === "reject") {
    updateData.revertedAt = now
    updateData.revertReason = "owner_rejected"
  }

  const updated = await prisma.agentBehaviorPatch.update({
    where: { id },
    data: updateData,
  })

  return NextResponse.json({ patch: updated, action, previousStatus: existing.status })
}

// Helper needed for error response
function getValidTransitionsForStatus(status: PatchStatusType): string[] {
  const map: Record<PatchStatusType, string[]> = {
    PROPOSED: ["approve", "reject"],
    APPROVED: ["apply", "reject", "revert"],
    ACTIVE: ["confirm", "revert"],
    EXPIRED: [],
    CONFIRMED: ["revert"],
    REVERTED: [],
    REJECTED: [],
  }
  return map[status] ?? []
}
