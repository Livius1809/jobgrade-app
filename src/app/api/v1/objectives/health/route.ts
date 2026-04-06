import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  computeObjectiveHealth,
  summarizeHealth,
  type ObjectiveInput,
  type StrategicThemeInput,
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

export const dynamic = "force-dynamic"

/**
 * GET /api/v1/objectives/health
 *
 * A2 — ObjectiveHealth monitor. Calculează sănătatea fiecărui obiectiv
 * organizațional combinând:
 *  - starea obiectivelor (progress, deadline, priority)
 *  - StrategicTheme[] (converge thematic cu tags-urile obiectivelor?)
 *  - DisfunctionEvent OPEN/ESCALATED (pe rolurile owner/contributor)
 *
 * Query params:
 *  - businessId (required)
 *  - includeNonActive (default false) — include DRAFT/SUSPENDED/ARCHIVED
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
  const businessId = url.searchParams.get("businessId")
  if (!businessId) {
    return NextResponse.json(
      { error: "missing_businessId_query_param" },
      { status: 400 },
    )
  }
  const includeNonActive =
    url.searchParams.get("includeNonActive") === "true"

  // Fetch paralel: objectives + awareness data
  const statusFilter = includeNonActive
    ? {}
    : { status: { notIn: ["ARCHIVED" as const] } }

  const emergentSince = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const signalsSince = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) // 24h window + 7d baseline

  const [objRows, signalRows, kbRows, biRows, cmRows, disfRows] =
    await Promise.all([
      prisma.organizationalObjective.findMany({
        where: { businessId, ...statusFilter },
        orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
      }),
      prisma.externalSignal.findMany({
        where: { capturedAt: { gte: signalsSince } },
        select: {
          id: true,
          source: true,
          category: true,
          title: true,
          rawContent: true,
          capturedAt: true,
          publishedAt: true,
        },
        take: 5000,
      }),
      prisma.kBEntry.findMany({
        where: { createdAt: { gte: emergentSince } },
        select: { id: true, agentRole: true, tags: true, createdAt: true },
        take: 5000,
      }),
      prisma.brainstormIdea.findMany({
        where: { createdAt: { gte: emergentSince }, category: { not: null } },
        select: {
          id: true,
          generatedBy: true,
          category: true,
          createdAt: true,
        },
        take: 5000,
      }),
      prisma.clientMemory.findMany({
        where: { createdAt: { gte: emergentSince } },
        select: { id: true, source: true, tags: true, createdAt: true },
        take: 5000,
      }),
      prisma.disfunctionEvent.findMany({
        where: { status: { in: ["OPEN", "ESCALATED"] } },
        select: {
          id: true,
          status: true,
          severity: true,
          targetType: true,
          targetId: true,
          signal: true,
        },
        take: 1000,
      }),
    ])

  // Compute strategic themes (reusing existing pure functions)
  const emergentThemes = extractPatterns(
    {
      kbEntries: kbRows.map((r) => ({
        id: r.id,
        agentRole: r.agentRole,
        tags: r.tags,
        createdAt: r.createdAt,
      })) as KBEntryInput[],
      brainstormIdeas: biRows.map((r) => ({
        id: r.id,
        generatedBy: r.generatedBy,
        category: r.category,
        createdAt: r.createdAt,
      })) as BrainstormIdeaInput[],
      clientMemories: cmRows.map((r) => ({
        id: r.id,
        source: r.source,
        tags: r.tags,
        createdAt: r.createdAt,
      })) as ClientMemoryInput[],
    },
    {
      windowDays: 7,
      minDistinctAgents: 3,
      minPerAgent: 1,
      excludeTokens: ["broadcast", "brainstorm_insight"],
      excludeTokenPrefixes: ["from:"],
    },
  )

  const strategicThemes = observeStrategically(
    {
      externalSignals: signalRows.map((r) => ({
        id: r.id,
        source: r.source,
        category: r.category,
        title: r.title,
        rawContent: r.rawContent,
        capturedAt: r.capturedAt,
        publishedAt: r.publishedAt,
      })) as StrategicExternalSignalInput[],
      emergentThemes: emergentThemes.map((t) => ({
        token: t.token,
        distinctAgents: t.distinctAgents,
        agents: t.agents,
        sources: t.sources,
        totalOccurrences: t.totalOccurrences,
        firstSeenAt: t.firstSeenAt,
        lastSeenAt: t.lastSeenAt,
      })),
    },
    { windowHours: 24, baselineDays: 7 },
  )

  // Map to health inputs
  const objectives: ObjectiveInput[] = objRows.map((o) => ({
    id: o.id,
    code: o.code,
    title: o.title,
    businessId: o.businessId,
    metricName: o.metricName,
    metricUnit: o.metricUnit,
    targetValue: o.targetValue,
    currentValue: o.currentValue,
    direction: o.direction,
    startDate: o.startDate,
    deadlineAt: o.deadlineAt,
    completedAt: o.completedAt,
    priority: o.priority,
    status: o.status,
    ownerRoles: o.ownerRoles,
    contributorRoles: o.contributorRoles,
    tags: o.tags,
  }))

  const stInputs: StrategicThemeInput[] = strategicThemes.map((t) => ({
    id: t.id,
    title: t.title,
    confidence: t.confidence,
    severity: t.severity,
    rule: t.rule,
    evidence: t.evidence,
  }))

  const disfInputs: DisfunctionInput[] = disfRows.map((d) => ({
    id: d.id,
    status: d.status,
    severity: d.severity,
    targetType: d.targetType,
    targetId: d.targetId,
    signal: d.signal,
  }))

  const reports = computeObjectiveHealth(
    { objectives, strategicThemes: stInputs, disfunctions: disfInputs },
  )
  const summary = summarizeHealth(reports)

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    businessId,
    inputCounts: {
      objectives: objectives.length,
      strategicThemes: strategicThemes.length,
      openDisfunctions: disfRows.length,
    },
    summary,
    reports,
  })
}
