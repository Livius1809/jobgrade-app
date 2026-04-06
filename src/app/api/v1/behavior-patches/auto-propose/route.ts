import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { PatchType } from "@/generated/prisma"
import {
  computeObjectiveHealth,
  type ObjectiveInput,
  type StrategicThemeInput as HealthSTInput,
  type DisfunctionInput,
} from "@/lib/agents/objective-health"
import {
  extractPatterns,
  type KBEntryInput,
  type BrainstormIdeaInput,
  type ClientMemoryInput,
} from "@/lib/agents/pattern-extractor"
import {
  observeStrategically,
  type StrategicExternalSignalInput,
} from "@/lib/agents/strategic-observer"
import {
  generateAutoProposals,
  type ObjectiveHealthInput,
  type StrategicThemeInput,
  type AgentInfoInput,
  type ExistingPatchInput,
} from "@/lib/agents/auto-action-rules"

export const dynamic = "force-dynamic"

/**
 * POST /api/v1/behavior-patches/auto-propose
 *
 * B2 — Auto-Action Rules Engine. Scanează starea curentă (ObjectiveHealth +
 * StrategicThemes + AgentDefinitions + existing patches) și propune
 * BehaviorPatches noi ca PROPOSED. Owner aprobă prin PATCH lifecycle.
 *
 * Body:
 *  - businessId (required)
 *  - dryRun (optional, default false)
 *
 * Callable de cron (ex: la fiecare 12h) sau manual.
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

  const body = await req.json().catch(() => ({}))
  const businessId = body?.businessId
  const dryRun = body?.dryRun === true
  if (!businessId) {
    return NextResponse.json({ error: "missing_businessId" }, { status: 400 })
  }

  const emergentSince = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const signalsSince = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)

  // Fetch everything in parallel
  const [
    objRows,
    signalRows,
    kbRows,
    biRows,
    cmRows,
    disfRows,
    agentRows,
    patchRows,
  ] = await Promise.all([
    prisma.organizationalObjective.findMany({
      where: { businessId, status: { notIn: ["ARCHIVED", "DRAFT"] } },
    }),
    prisma.externalSignal.findMany({
      where: { capturedAt: { gte: signalsSince } },
      select: { id: true, source: true, category: true, title: true, rawContent: true, capturedAt: true, publishedAt: true },
      take: 5000,
    }),
    prisma.kBEntry.findMany({
      where: { createdAt: { gte: emergentSince } },
      select: { id: true, agentRole: true, tags: true, createdAt: true },
      take: 5000,
    }),
    prisma.brainstormIdea.findMany({
      where: { createdAt: { gte: emergentSince }, category: { not: null } },
      select: { id: true, generatedBy: true, category: true, createdAt: true },
      take: 5000,
    }),
    prisma.clientMemory.findMany({
      where: { createdAt: { gte: emergentSince } },
      select: { id: true, source: true, tags: true, createdAt: true },
      take: 5000,
    }),
    prisma.disfunctionEvent.findMany({
      where: { status: { in: ["OPEN", "ESCALATED"] } },
      select: { id: true, status: true, severity: true, targetType: true, targetId: true, signal: true },
      take: 1000,
    }),
    prisma.agentDefinition.findMany({
      where: { isActive: true },
      select: { agentRole: true, activityMode: true, cycleIntervalHours: true, isActive: true },
    }),
    prisma.agentBehaviorPatch.findMany({
      where: { businessId, status: { in: ["PROPOSED", "APPROVED", "ACTIVE", "CONFIRMED"] } },
      select: { targetRole: true, patchType: true, status: true },
    }),
  ])

  // Compute strategic themes pipeline
  const emergentThemes = extractPatterns(
    {
      kbEntries: kbRows as KBEntryInput[],
      brainstormIdeas: biRows as BrainstormIdeaInput[],
      clientMemories: cmRows as ClientMemoryInput[],
    },
    {
      windowDays: 7, minDistinctAgents: 3, minPerAgent: 1,
      excludeTokens: ["broadcast", "brainstorm_insight"],
      excludeTokenPrefixes: ["from:"],
    },
  )

  const strategicThemes = observeStrategically(
    {
      externalSignals: signalRows as StrategicExternalSignalInput[],
      emergentThemes: emergentThemes.map((t) => ({
        token: t.token, distinctAgents: t.distinctAgents, agents: t.agents,
        sources: t.sources, totalOccurrences: t.totalOccurrences,
        firstSeenAt: t.firstSeenAt, lastSeenAt: t.lastSeenAt,
      })),
    },
    { windowHours: 24, baselineDays: 7 },
  )

  // Compute objective health
  const objectives: ObjectiveInput[] = objRows.map((o) => ({
    id: o.id, code: o.code, title: o.title, businessId: o.businessId,
    metricName: o.metricName, metricUnit: o.metricUnit, targetValue: o.targetValue,
    currentValue: o.currentValue, direction: o.direction, startDate: o.startDate,
    deadlineAt: o.deadlineAt, completedAt: o.completedAt, priority: o.priority,
    status: o.status, ownerRoles: o.ownerRoles, contributorRoles: o.contributorRoles,
    tags: o.tags,
  }))

  const healthReports = computeObjectiveHealth({
    objectives,
    strategicThemes: strategicThemes.map((t) => ({
      id: t.id, title: t.title, confidence: t.confidence,
      severity: t.severity, rule: t.rule, evidence: t.evidence,
    })) as HealthSTInput[],
    disfunctions: disfRows as DisfunctionInput[],
  })

  // Map health reports to auto-action input format (include objective data)
  const ohInputs: ObjectiveHealthInput[] = healthReports.map((r) => {
    const obj = objectives.find((o) => o.id === r.objectiveId)!
    return {
      ...r,
      priority: obj.priority,
      status: obj.status,
      ownerRoles: obj.ownerRoles,
      contributorRoles: obj.contributorRoles,
      tags: obj.tags,
    }
  })

  const stInputs: StrategicThemeInput[] = strategicThemes.map((t) => ({
    id: t.id, title: t.title, rule: t.rule, confidence: t.confidence,
    severity: t.severity, evidence: t.evidence,
  }))

  const agentInputs: AgentInfoInput[] = agentRows.map((a) => ({
    agentRole: a.agentRole, activityMode: a.activityMode,
    cycleIntervalHours: a.cycleIntervalHours, isActive: a.isActive,
  }))

  const existingInputs: ExistingPatchInput[] = patchRows.map((p) => ({
    targetRole: p.targetRole, patchType: p.patchType, status: p.status,
  }))

  // Run rules engine
  const proposals = generateAutoProposals({
    objectiveHealth: ohInputs,
    strategicThemes: stInputs,
    agents: agentInputs,
    existingPatches: existingInputs,
  })

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      businessId,
      proposalCount: proposals.length,
      proposals,
    })
  }

  // Write proposals as PROPOSED patches
  let created = 0
  const results: Array<{ id: string; targetRole: string; patchType: string; rule: string }> = []

  for (const p of proposals) {
    const patch = await prisma.agentBehaviorPatch.create({
      data: {
        businessId,
        targetRole: p.targetRole,
        patchType: p.patchType as PatchType,
        patchSpec: p.patchSpec as unknown as import("@/generated/prisma").Prisma.InputJsonValue,
        triggeredBy: p.triggeredBy,
        triggerSourceId: p.triggerSourceId,
        rationale: p.rationale,
        status: "PROPOSED",
      },
    })
    created++
    results.push({
      id: patch.id,
      targetRole: p.targetRole,
      patchType: p.patchType,
      rule: p.rule,
    })
  }

  return NextResponse.json({
    dryRun: false,
    businessId,
    proposalCount: proposals.length,
    created,
    results,
  })
}
