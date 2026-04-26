import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { PatchType } from "@/generated/prisma"
import {
  evaluateHomeostasis,
  type HomeostaticTargetInput,
} from "@/lib/agents/homeostasis-monitor"
import {
  generateSelfRegulationActions,
  summarizeSelfRegulation,
} from "@/lib/agents/self-regulation"

export const dynamic = "force-dynamic"

/**
 * /api/v1/self-regulation
 *
 * C2 — Self-Regulation. Evaluează targets homeostatice și generează
 * AgentBehaviorPatch proposals automat pentru corecții ușoare.
 *
 * POST ?businessId=...&dryRun=true  — evaluează + propune (fără persist)
 * POST ?businessId=...              — evaluează + crează patches
 */

function verifyInternalAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

export async function POST(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const businessId = url.searchParams.get("businessId")
  if (!businessId) {
    return NextResponse.json({ error: "missing_businessId" }, { status: 400 })
  }
  const dryRun = url.searchParams.get("dryRun") === "true"

  const body = await req.json().catch(() => ({}))
  const config = (body as Record<string, unknown>).config as Record<string, number> | undefined

  // 1. Fetch active targets
  const targets = await prisma.homeostaticTarget.findMany({
    where: { businessId, isActive: true },
  })

  const inputs: HomeostaticTargetInput[] = targets.map((t) => ({
    id: t.id,
    code: t.code,
    name: t.name,
    metricName: t.metricName,
    metricUnit: t.metricUnit,
    targetType: t.targetType as "SERVICE" | "ROLE" | "SYSTEM",
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

  // 2. Evaluate
  const evaluations = evaluateHomeostasis(inputs)

  // 3. Generate self-regulation actions (doar pentru autoCorrect=true)
  const autoCorrectEvals = evaluations.filter((e) => {
    const target = targets.find((t) => t.id === e.targetId)
    return target?.autoCorrect === true
  })

  const actions = generateSelfRegulationActions(autoCorrectEvals, config)
  const summary = summarizeSelfRegulation(actions)

  // 4. Persist patches (dacă nu e dryRun)
  const createdPatches: string[] = []
  if (!dryRun) {
    for (const action of actions) {
      // Check: nu crea duplicat dacă deja există patch PROPOSED/ACTIVE pe același target
      const existingPatch = await prisma.agentBehaviorPatch.findFirst({
        where: {
          businessId,
          triggerSourceId: action.triggerSourceId,
          triggeredBy: "Homeostasis",
          status: { in: ["PROPOSED", "APPROVED", "ACTIVE"] },
        },
      })
      if (existingPatch) continue

      const patch = await prisma.agentBehaviorPatch.create({
        data: {
          businessId,
          targetRole: action.patchSpec.targetRole as string ?? "SYSTEM",
          patchType: (action.patchType as PatchType) ?? "ATTENTION_SHIFT",
          patchSpec: action.patchSpec as unknown as import("@/generated/prisma").Prisma.InputJsonValue,
          triggeredBy: action.triggeredBy,
          triggerSourceId: action.triggerSourceId,
          rationale: action.rationale,
          status: "PROPOSED",
          expiresAt: new Date(Date.now() + action.autoExpireHours * 60 * 60 * 1000),
        },
      })
      createdPatches.push(patch.id)
    }
  }

  // ── FIX #2: Patches PROPOSED → taskuri automate de corecție ──
  let tasksCreated = 0
  if (!dryRun && createdPatches.length > 0) {
    for (const action of actions) {
      const targetRole = (action.patchSpec as any)?.targetRole || "COA"
      try {
        await prisma.agentTask.create({
          data: {
            businessId,
            assignedBy: "SYSTEM",
            assignedTo: targetRole,
            title: `Auto-corecție: ${action.rationale?.slice(0, 100) || "homeostasis deviation"}`,
            description: `Self-regulation a detectat o deviație homeostatică.\n\nRațiune: ${action.rationale}\nTip patch: ${action.patchType}\nSpec: ${JSON.stringify(action.patchSpec)}\n\nAcțiune: aplică corecția sau escalează dacă nu poți.`,
            taskType: "PROCESS_EXECUTION",
            priority: "HIGH",
            status: "ASSIGNED",
            tags: ["self-regulation", "auto-correction", `patch:${action.patchType}`],
          },
        })
        tasksCreated++
      } catch { /* non-blocking */ }
    }
  }

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    businessId,
    dryRun,
    evaluations: evaluations.length,
    deviating: evaluations.filter((e) => e.status === "WARNING" || e.status === "CRITICAL").length,
    actions,
    summary,
    createdPatches,
    tasksCreated,
  })
}
