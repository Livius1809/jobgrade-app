import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import {
  runProactiveCycle,
  runAllManagerCycles,
} from "@/lib/agents/proactive-loop"
import {
  MANAGER_CONFIGS,
  getManagerConfig,
  ALL_MANAGER_ROLES,
} from "@/lib/agents/manager-configs"
import {
  processTimeouts,
  getEscalationSummary,
} from "@/lib/agents/escalation-chain"

const schema = z.object({
  managerRole: z.string().optional(),
  level: z.enum(["operational", "tactical", "strategic"]).optional(),
  dryRun: z.boolean().optional().default(false),
})

function verifyInternalAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

/**
 * POST /api/v1/agents/cycle
 *
 * Rulează ciclul proactiv de management.
 *
 * Body:
 * - managerRole?: string — rulează doar pentru un manager specific
 * - level?: "operational" | "tactical" | "strategic" — rulează per nivel
 * - dryRun?: boolean — evaluează dar nu execută acțiuni
 *
 * Dacă nici managerRole nici level nu sunt specificate, rulează toți managerii.
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
          availableManagers: ALL_MANAGER_ROLES,
        },
        { status: 400 }
      )
    }

    const { managerRole, level, dryRun } = parsed.data

    // Procesează timeout-uri înainte de cicluri
    const timeoutsProcessed = await processTimeouts(prisma).catch(() => 0)

    if (managerRole) {
      // Ciclu individual
      const config = getManagerConfig(managerRole)
      if (!config) {
        return NextResponse.json(
          {
            message: `"${managerRole}" nu e un manager valid.`,
            availableManagers: ALL_MANAGER_ROLES,
          },
          { status: 400 }
        )
      }

      const result = await runProactiveCycle(config, prisma, { dryRun })

      return NextResponse.json({
        mode: "single",
        timeoutsProcessed,
        dryRun,
        result: {
          manager: result.managerRole,
          level: config.level,
          subordinatesChecked: result.subordinatesChecked,
          evaluations: result.evaluations,
          actions: result.actions,
          summary: result.summary,
          nextCycleAt: result.nextCycleAt,
          durationMs: result.durationMs,
        },
      })
    }

    // Batch: toți managerii sau per nivel
    const results = await runAllManagerCycles(MANAGER_CONFIGS, prisma, {
      dryRun,
      level: level as any,
    })

    const totalActions = results.reduce((sum, r) => sum + r.actions.length, 0)
    const totalEscalations = results.reduce(
      (sum, r) => sum + r.actions.filter((a) => a.type === "ESCALATE").length,
      0
    )

    return NextResponse.json({
      mode: level ? `level:${level}` : "all",
      timeoutsProcessed,
      dryRun,
      managersProcessed: results.length,
      totalActions,
      totalEscalations,
      results: results.map((r) => ({
        manager: r.managerRole,
        subordinatesChecked: r.subordinatesChecked,
        evaluations: r.evaluations.map((e) => ({
          subordinate: e.subordinate,
          status: e.status,
          reason: e.reason,
        })),
        actions: r.actions.map((a) => ({
          type: a.type,
          target: a.target,
          description: a.description,
        })),
        summary: r.summary,
        durationMs: r.durationMs,
      })),
    })
  } catch (err: any) {
    console.error("[agents/cycle] Eroare:", err)
    return NextResponse.json(
      { message: "Eroare internă.", error: err.message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/v1/agents/cycle
 *
 * Returnează configurația managerilor, escalări active, și sumar.
 */
export async function GET(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
  }

  try {
    const escalationSummary = await getEscalationSummary(prisma).catch(() => ({
      total: 0,
      open: 0,
      resolved: 0,
      timedOut: 0,
      byPriority: {},
      ownerAttention: 0,
    }))

    return NextResponse.json({
      managers: MANAGER_CONFIGS.map((c) => ({
        role: c.agentRole,
        level: c.level,
        subordinates: c.subordinates,
        reportsTo: c.reportsTo,
        cycleIntervalHours: c.cycleIntervalHours,
        objectivesCount: c.objectives.length,
      })),
      levels: {
        strategic: {
          managers: MANAGER_CONFIGS.filter((c) => c.level === "strategic").map((c) => c.agentRole),
          cycleHours: 24,
        },
        tactical: {
          managers: MANAGER_CONFIGS.filter((c) => c.level === "tactical").map((c) => c.agentRole),
          cycleHours: 12,
        },
        operational: {
          managers: MANAGER_CONFIGS.filter((c) => c.level === "operational").map((c) => c.agentRole),
          cycleHours: 4,
        },
      },
      escalations: escalationSummary,
    })
  } catch (err: any) {
    console.error("[agents/cycle] Eroare GET:", err)
    return NextResponse.json(
      { message: "Eroare internă.", error: err.message },
      { status: 500 }
    )
  }
}
