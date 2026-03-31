import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import {
  runBatchPropagation,
  propagateEntry,
  getPropagationGraph,
  getReceivingAgents,
  PROPAGATION_SOURCE_ROLES,
} from "@/lib/kb/propagate"

const schema = z.object({
  sourceRole: z.string().optional(),
  sinceHours: z.number().min(1).max(720).optional().default(24),
  dryRun: z.boolean().optional().default(false),
})

function verifyInternalAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

/**
 * POST /api/v1/kb/propagate
 *
 * Declanșează propagarea bottom-up a cunoștințelor între agenți.
 * Rulat de obicei nightly prin FLUX-023 (n8n cron).
 *
 * Body: { sourceRole?: string, sinceHours?: number, dryRun?: boolean }
 * - sourceRole: opțional — propagă doar de la un agent specific
 * - sinceHours: default 24h — entries validate în ultimele N ore
 * - dryRun: true → abstractizează dar nu persistă (preview)
 */
export async function POST(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
  }

  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Date invalide.",
          errors: parsed.error.flatten().fieldErrors,
          availableSourceRoles: PROPAGATION_SOURCE_ROLES,
        },
        { status: 400 }
      )
    }

    const { sourceRole, sinceHours, dryRun } = parsed.data

    if (sourceRole && !PROPAGATION_SOURCE_ROLES.includes(sourceRole)) {
      return NextResponse.json(
        {
          message: `Rolul "${sourceRole}" nu are reguli de propagare definite.`,
          availableSourceRoles: PROPAGATION_SOURCE_ROLES,
        },
        { status: 400 }
      )
    }

    const result = await runBatchPropagation(prisma, {
      sourceRole,
      sinceHours,
      dryRun,
    })

    const totalPropagated = result.propagationResults.reduce(
      (sum, r) => sum + r.targets.filter((t) => t.persisted).length,
      0
    )

    return NextResponse.json({
      processedEntries: result.processedEntries,
      skippedEntries: result.skippedEntries,
      totalPropagated,
      dryRun,
      durationMs: result.durationMs,
      details: result.propagationResults.map((r) => ({
        sourceRole: r.sourceRole,
        sourceEntryId: r.sourceEntryId,
        targets: r.targets.map((t) => ({
          targetRole: t.targetRole,
          persisted: t.persisted,
          confidence: t.confidence,
          error: t.error,
        })),
      })),
    })
  } catch (err: any) {
    console.error("[propagate] Eroare:", err)
    return NextResponse.json(
      { message: "Eroare internă.", error: err.message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/v1/kb/propagate
 *
 * Returnează graful de propagare și statistici.
 */
export async function GET(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
  }

  try {
    // Statistici propagări existente
    const propagatedCounts = await prisma.kBEntry.groupBy({
      by: ["agentRole"],
      where: { source: "PROPAGATED" },
      _count: { id: true },
    })

    const countMap = new Map(
      propagatedCounts.map((c: any) => [c.agentRole, c._count.id])
    )

    // Entries eligibile pentru propagare (ultimele 24h)
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const eligibleCount = await prisma.kBEntry.count({
      where: {
        status: "PERMANENT",
        confidence: { gte: 0.70 },
        validatedAt: { gte: since24h },
        source: { not: "PROPAGATED" },
        agentRole: { in: PROPAGATION_SOURCE_ROLES },
      },
    })

    return NextResponse.json({
      graph: getPropagationGraph(),
      sourceRoles: PROPAGATION_SOURCE_ROLES,
      receivingAgents: getReceivingAgents(),
      stats: {
        eligibleEntries24h: eligibleCount,
        propagatedPerRole: Object.fromEntries(countMap),
        totalPropagated: propagatedCounts.reduce(
          (sum: number, c: any) => sum + c._count.id,
          0
        ),
      },
    })
  } catch (err: any) {
    console.error("[propagate] Eroare GET:", err)
    return NextResponse.json(
      { message: "Eroare internă.", error: err.message },
      { status: 500 }
    )
  }
}
