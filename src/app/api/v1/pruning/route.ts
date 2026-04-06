import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { PruneReason, PruneStatus } from "@/generated/prisma"
import {
  detectPruneCandidates,
  detectPropagationCandidates,
  type KBEntryForPruning,
} from "@/lib/agents/kb-pruner"

export const dynamic = "force-dynamic"

/**
 * /api/v1/pruning
 *
 * F1+F2 — KB Pruning + Selective Propagation (Evolution Layer).
 *
 * POST   ?action=scan&businessId=...      — scanează KB, produce candidați
 * POST   ?action=propagation-scan         — detectează candidați propagare
 * GET    ?businessId=...&status=...       — listare candidați
 * PATCH  ?id=...&decision=approve|keep|defer  — review Owner
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
  const status = url.searchParams.get("status")
  const view = url.searchParams.get("view")

  if (view === "propagations") {
    const propagations = await prisma.propagationEvent.findMany({
      where: {
        ...(businessId ? { businessId } : {}),
        ...(status ? { status: status as import("@/generated/prisma").PropagationStatus } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    })
    return NextResponse.json({ propagations, total: propagations.length })
  }

  const candidates = await prisma.pruneCandidate.findMany({
    where: {
      ...(businessId ? { businessId } : {}),
      ...(status ? { status: status as PruneStatus } : {}),
    },
    orderBy: [{ score: "desc" }],
    take: 100,
  })

  return NextResponse.json({
    candidates: candidates.map((c) => ({
      ...c,
      metrics: c.metrics as Record<string, unknown>,
    })),
    total: candidates.length,
    byStatus: {
      FLAGGED: candidates.filter((c) => c.status === "FLAGGED").length,
      APPROVED: candidates.filter((c) => c.status === "APPROVED").length,
      KEPT: candidates.filter((c) => c.status === "KEPT").length,
      DEFERRED: candidates.filter((c) => c.status === "DEFERRED").length,
    },
  })
}

// ── POST ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const action = url.searchParams.get("action")
  const businessId = url.searchParams.get("businessId")

  if (!businessId) {
    return NextResponse.json({ error: "missing_businessId" }, { status: 400 })
  }

  if (action === "scan") {
    // Fetch KB entries cu metadata necesară
    const kbEntries = await prisma.kBEntry.findMany({
      where: { agentRole: { not: undefined } },
      select: {
        id: true,
        content: true,
        agentRole: true,
        tags: true,
        status: true,
        usageCount: true,
        successRate: true,
        createdAt: true,
        validatedAt: true,
      },
    })

    const entries: KBEntryForPruning[] = kbEntries.map((e) => ({
      id: e.id,
      title: e.content.slice(0, 100),
      agentRole: e.agentRole,
      tags: e.tags,
      usageCount: e.usageCount,
      successRate: e.successRate,
      createdAt: e.createdAt,
      lastUsedAt: e.validatedAt,
      validatedAt: e.validatedAt,
      status: e.status,
    }))

    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const candidates = detectPruneCandidates(entries, {
      unusedDays: (body.unusedDays as number) ?? 90,
      lowSuccessThreshold: (body.lowSuccessThreshold as number) ?? 20,
      minAgeForPruning: (body.minAgeForPruning as number) ?? 30,
    })

    // Upsert candidați în DB
    let created = 0
    let updated = 0
    for (const c of candidates) {
      const existing = await prisma.pruneCandidate.findUnique({
        where: { entityType_entityId: { entityType: c.entityType, entityId: c.entityId } },
      })
      if (existing) {
        if (existing.status === "FLAGGED") {
          await prisma.pruneCandidate.update({
            where: { id: existing.id },
            data: { score: c.score, metrics: c.metrics as unknown as import("@/generated/prisma").Prisma.InputJsonValue },
          })
          updated++
        }
      } else {
        await prisma.pruneCandidate.create({
          data: {
            businessId,
            entityType: c.entityType,
            entityId: c.entityId,
            entityTitle: c.entityTitle,
            reason: c.reason as PruneReason,
            score: c.score,
            metrics: c.metrics as unknown as import("@/generated/prisma").Prisma.InputJsonValue,
            status: "FLAGGED",
          },
        })
        created++
      }
    }

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      scanned: entries.length,
      candidatesFound: candidates.length,
      created,
      updated,
      topCandidates: candidates.slice(0, 10),
    })
  }

  if (action === "propagation-scan") {
    const kbEntries = await prisma.kBEntry.findMany({
      select: {
        id: true,
        content: true,
        agentRole: true,
        tags: true,
        status: true,
        usageCount: true,
        successRate: true,
        createdAt: true,
        validatedAt: true,
      },
    })

    const entries: KBEntryForPruning[] = kbEntries.map((e) => ({
      id: e.id,
      title: e.content.slice(0, 100),
      agentRole: e.agentRole,
      tags: e.tags,
      usageCount: e.usageCount,
      successRate: e.successRate,
      createdAt: e.createdAt,
      lastUsedAt: e.validatedAt,
      validatedAt: e.validatedAt,
      status: e.status,
    }))

    const agents = await prisma.agentDefinition.findMany({ select: { agentRole: true } })
    const allRoles = agents.map((a) => a.agentRole)

    const candidates = detectPropagationCandidates(entries, allRoles)

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      scanned: entries.length,
      propagationCandidates: candidates.length,
      candidates: candidates.slice(0, 20),
    })
  }

  return NextResponse.json({ error: "missing_action", valid: ["scan", "propagation-scan"] }, { status: 400 })
}

// ── PATCH ────────────────────────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const id = url.searchParams.get("id")
  const decision = url.searchParams.get("decision")

  if (!id || !decision) {
    return NextResponse.json({ error: "missing_id_or_decision" }, { status: 400 })
  }

  const validDecisions: Record<string, PruneStatus> = {
    approve: "APPROVED",
    keep: "KEPT",
    defer: "DEFERRED",
  }

  if (!validDecisions[decision]) {
    return NextResponse.json({ error: "invalid_decision", valid: Object.keys(validDecisions) }, { status: 400 })
  }

  const body = await req.json().catch(() => ({})) as Record<string, unknown>

  const existing = await prisma.pruneCandidate.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 })
  }

  const updated = await prisma.pruneCandidate.update({
    where: { id },
    data: {
      status: validDecisions[decision],
      reviewedBy: (body.reviewedBy as string) ?? "owner",
      reviewedAt: new Date(),
      reviewNote: (body.note as string) ?? null,
    },
  })

  return NextResponse.json({ candidate: updated })
}
