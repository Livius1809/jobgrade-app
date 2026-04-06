import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { QuarantineStatus } from "@/generated/prisma"
import { checkImmuneMemory, type ImmunePatternInput } from "@/lib/agents/boundary-engine"

export const dynamic = "force-dynamic"

/**
 * /api/v1/quarantine
 *
 * D2 — Quarantine + Immune Memory.
 *
 * GET    ?status=...              — listare carantină
 * PATCH  ?id=...&action=release|destroy  — review entry
 * GET    ?view=patterns           — listare immune patterns
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
  const view = url.searchParams.get("view")

  // ── Immune Patterns view ──
  if (view === "patterns") {
    const businessId = url.searchParams.get("businessId")
    const patterns = await prisma.immunePattern.findMany({
      where: {
        isActive: true,
        ...(businessId ? { OR: [{ businessId: null }, { businessId }] } : {}),
      },
      orderBy: { occurrenceCount: "desc" },
    })
    return NextResponse.json({ patterns, total: patterns.length })
  }

  // ── Quarantine list ──
  const status = url.searchParams.get("status") as QuarantineStatus | null
  const where: Record<string, unknown> = {}
  if (status) where.status = status

  const entries = await prisma.quarantineEntry.findMany({
    where,
    include: { violation: { include: { rule: { select: { code: true, name: true, ruleType: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  return NextResponse.json({
    entries: entries.map((e) => ({
      id: e.id,
      contentType: e.contentType,
      contentHash: e.contentHash,
      status: e.status,
      createdAt: e.createdAt,
      reviewedBy: e.reviewedBy,
      reviewedAt: e.reviewedAt,
      rule: e.violation.rule,
      sourceType: e.violation.sourceType,
      sourceRole: e.violation.sourceRole,
    })),
    total: entries.length,
  })
}

export async function PATCH(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const id = url.searchParams.get("id")
  const action = url.searchParams.get("action")

  if (!id || !action) {
    return NextResponse.json({ error: "missing_id_or_action" }, { status: 400 })
  }

  const entry = await prisma.quarantineEntry.findUnique({ where: { id } })
  if (!entry) {
    return NextResponse.json({ error: "not_found" }, { status: 404 })
  }
  if (entry.status !== "QUARANTINED") {
    return NextResponse.json({ error: "already_reviewed", currentStatus: entry.status }, { status: 409 })
  }

  const body = await req.json().catch(() => ({}))
  const reviewedBy = (body as Record<string, unknown>).reviewedBy as string ?? "owner"
  const releaseReason = (body as Record<string, unknown>).reason as string | undefined

  let newStatus: QuarantineStatus
  if (action === "release") {
    newStatus = "RELEASED"
  } else if (action === "destroy") {
    newStatus = "DESTROYED"
  } else {
    return NextResponse.json({ error: "invalid_action", valid: ["release", "destroy"] }, { status: 400 })
  }

  const updated = await prisma.quarantineEntry.update({
    where: { id },
    data: {
      status: newStatus,
      reviewedBy,
      reviewedAt: new Date(),
      releaseReason,
    },
  })

  // ── Immune memory update ──
  // Dacă destroy, actualizăm/creem immune pattern
  if (action === "destroy") {
    const violation = await prisma.boundaryViolation.findUnique({ where: { id: entry.violationId } })
    if (violation) {
      const patternKey = entry.contentHash
      const existing = await prisma.immunePattern.findUnique({
        where: { businessId_patternType_patternKey: { businessId: violation.businessId ?? "", patternType: "content_hash", patternKey } },
      })

      if (existing) {
        await prisma.immunePattern.update({
          where: { id: existing.id },
          data: {
            occurrenceCount: existing.occurrenceCount + 1,
            lastSeenAt: new Date(),
            violationIds: [...existing.violationIds, violation.id],
            autoBlock: existing.occurrenceCount + 1 >= existing.threshold,
          },
        })
      } else {
        await prisma.immunePattern.create({
          data: {
            businessId: violation.businessId,
            patternType: "content_hash",
            patternKey,
            description: `Content pattern detected from ${violation.sourceType}`,
            violationIds: [violation.id],
          },
        })
      }
    }
  }

  return NextResponse.json({ entry: updated })
}
