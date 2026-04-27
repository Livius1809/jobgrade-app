import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { computeOwnerCockpit, type CockpitInputs } from "@/lib/owner/cockpit-aggregator"
import { evaluateHomeostasis } from "@/lib/agents/homeostasis-monitor"
import { computeObjectiveHealth } from "@/lib/agents/objective-health"
import { getAppUrl } from "@/lib/get-app-url"

export const dynamic = "force-dynamic"

/**
 * GET /api/v1/owner/cockpit
 *
 * Endpoint unic care agregă starea completă a organismului:
 * - 8 straturi arhitecturale cu sub-factori și alarme
 * - Inbox decizii cu lanțuri cauzale (event → roluri → fluxuri → obiective)
 *
 * Consumat de Owner Dashboard v2.
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

  try {
    const businessId = "biz_jobgrade" // single business for now
    const now = new Date()
    const h24 = new Date(now.getTime() - 24 * 3600000)
    const d7 = new Date(now.getTime() - 7 * 86400000)

    // ── Promise.all: toate datele în paralel ──────────────────────────────────

    const [
      // AWARENESS
      signalCount24h,
      strategicThemesRaw,

      // GOALS
      objectivesRaw,

      // ACTION
      patchesRaw,

      // HOMEOSTASIS
      homeoTargetsRaw,

      // IMMUNE
      recentViolationsRaw,
      quarantinedCount,

      // METABOLISM
      budgetsRaw,
      businessRaw,

      // EVOLUTION
      pruneFlaggedCount,

      // RHYTHM
      outcomesRaw,
      ritualsRaw,
      wildcardsPendingCount,

      // CAUZALITATE
      disfunctionsRaw,
      fluxStepRolesRaw,
      allObjectivesRaw,
      agentRelationshipsRaw,
    ] = await Promise.all([
      // AWARENESS
      prisma.externalSignal.count({ where: { capturedAt: { gte: h24 } } }).catch(() => 0),
      fetchStrategicThemes(),

      // GOALS — fetch objectives + compute health
      prisma.organizationalObjective.findMany({
        where: { businessId, status: { notIn: ["ARCHIVED"] } },
        select: {
          id: true, code: true, title: true, businessId: true,
          metricName: true, metricUnit: true, targetValue: true, currentValue: true,
          direction: true, startDate: true, deadlineAt: true, completedAt: true,
          priority: true, status: true, ownerRoles: true, contributorRoles: true, tags: true,
        },
      }).catch(() => []),

      // ACTION
      prisma.agentBehaviorPatch.findMany({
        where: { businessId, status: { in: ["PROPOSED", "APPROVED", "ACTIVE"] } },
        select: { status: true, targetRole: true, createdAt: true },
      }).catch(() => []),

      // HOMEOSTASIS
      prisma.homeostaticTarget.findMany({
        where: { businessId, isActive: true },
        select: {
          id: true, code: true, name: true, metricName: true, metricUnit: true,
          targetType: true, targetEntityId: true,
          minValue: true, maxValue: true, optimalValue: true,
          warningPct: true, criticalPct: true, lastReading: true, autoCorrect: true,
        },
      }).catch(() => []),

      // IMMUNE
      prisma.boundaryViolation.findMany({
        where: { createdAt: { gte: h24 } },
        select: { id: true, rule: { select: { severity: true, code: true } } },
      }).catch(() => []),
      prisma.quarantineEntry.count({ where: { status: "QUARANTINED" } }).catch(() => 0),

      // METABOLISM
      prisma.resourceBudget.findMany({
        where: { businessId, isActive: true },
        select: {
          agentRole: true,
          maxLlmCostPerDay: true, usedLlmCost: true,
        },
      }).catch(() => []),
      prisma.business.findUnique({
        where: { id: businessId },
        select: { lifecyclePhase: true },
      }).catch(() => null),

      // EVOLUTION
      prisma.pruneCandidate.count({ where: { status: "FLAGGED" } }).catch(() => 0),

      // RHYTHM
      prisma.serviceOutcome.findMany({
        where: { businessId, isActive: true },
        select: { serviceCode: true, currentValue: true, targetValue: true, collectionFrequency: true },
      }).catch(() => []),
      prisma.ritual.findMany({
        where: { businessId, isActive: true },
        select: { code: true, cronExpression: true, lastRunAt: true },
      }).catch(() => []),
      prisma.wildCard.count({
        where: { businessId, respondedAt: null },
      }).catch(() => 0),

      // CAUZALITATE
      prisma.disfunctionEvent.findMany({
        where: { status: { in: ["OPEN", "REMEDIATING", "ESCALATED"] } },
        select: {
          id: true, class: true, severity: true, status: true,
          targetType: true, targetId: true, signal: true,
          detectedAt: true, resolvedAt: true, remediationOk: true,
          detectorSource: true, durationMs: true,
        },
      }).catch(() => []),
      prisma.fluxStepRole.findMany({
        select: { fluxId: true, stepId: true, roleCode: true, raci: true, isCritical: true },
      }).catch(() => []),
      prisma.organizationalObjective.findMany({
        where: { businessId },
        select: { code: true, title: true, priority: true, status: true, ownerRoles: true, contributorRoles: true },
      }).catch(() => []),
      prisma.agentRelationship.findMany({
        where: { relationType: "REPORTS_TO", isActive: true },
        select: { childRole: true, parentRole: true },
      }).catch(() => []),
    ])

    // ── Post-processing ──────────────────────────────────────────────────────

    // Strategic themes via internal API
    const strategicThemes = Array.isArray(strategicThemesRaw)
      ? (strategicThemesRaw as Record<string, string>[]).map((t) => ({
          severity: t.severity ?? "LOW",
          confidence: t.confidence ?? "LOW",
          title: t.title ?? "",
        }))
      : []

    // Homeostasis: evaluate targets
    const homeoInputs = homeoTargetsRaw.map((t: Record<string, unknown>) => ({
      id: t.id as string, code: t.code as string, name: t.name as string,
      metricName: t.metricName as string, metricUnit: (t.metricUnit ?? null) as string | null,
      targetType: t.targetType as "SERVICE" | "ROLE" | "SYSTEM",
      targetEntityId: (t.targetEntityId ?? null) as string | null,
      minValue: t.minValue as number | null, maxValue: t.maxValue as number | null,
      optimalValue: t.optimalValue as number | null,
      warningPct: t.warningPct as number, criticalPct: t.criticalPct as number,
      lastReading: t.lastReading as number | null, autoCorrect: t.autoCorrect as boolean,
    }))
    const homeoEvaluations = evaluateHomeostasis(homeoInputs)

    // Objectives: compute health
    const disfForHealth = disfunctionsRaw.map((d: Record<string, unknown>) => ({
      id: d.id as string, targetType: d.targetType as string, targetId: d.targetId as string,
      signal: d.signal as string, severity: d.severity as string, status: d.status as string,
    }))
    const objHealthReports = computeObjectiveHealth({
      objectives: objectivesRaw.map((o: Record<string, unknown>) => ({
        id: o.id as string, code: o.code as string, title: o.title as string,
        businessId: o.businessId as string,
        metricName: o.metricName as string, metricUnit: (o.metricUnit ?? null) as string | null,
        targetValue: o.targetValue as number, currentValue: o.currentValue as number | null,
        direction: o.direction as "INCREASE" | "DECREASE" | "MAINTAIN" | "REACH",
        startDate: o.startDate as string, deadlineAt: (o.deadlineAt ?? null) as string | null,
        completedAt: (o.completedAt ?? null) as string | null,
        priority: o.priority as "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
        status: o.status as string,
        ownerRoles: o.ownerRoles as string[], contributorRoles: o.contributorRoles as string[],
        tags: o.tags as string[],
      })),
      strategicThemes: strategicThemes.map((t: Record<string, unknown>, i: number) => ({
        id: `st-${i}`,
        title: (t.title ?? "") as string,
        confidence: (t.confidence ?? "LOW") as string,
        severity: (t.severity ?? "LOW") as string,
        rule: (t.rule ?? "unknown") as string,
        evidence: {
          emergentThemeTokens: Array.isArray((t.evidence as Record<string, unknown>)?.emergentThemeTokens)
            ? (t.evidence as Record<string, unknown>).emergentThemeTokens as string[]
            : [],
          categoryBreakdown: ((t.evidence as Record<string, unknown>)?.categoryBreakdown ?? {}) as Record<string, number>,
        },
      })),
      disfunctions: disfForHealth,
    })

    // Budgets: compute costUsedPct
    const budgets = budgetsRaw.map((b: Record<string, unknown>) => ({
      agentRole: b.agentRole as string,
      withinBudget: (b.usedLlmCost as number) <= (b.maxLlmCostPerDay as number),
      costUsedPct: (b.maxLlmCostPerDay as number) > 0
        ? Math.round(((b.usedLlmCost as number) / (b.maxLlmCostPerDay as number)) * 100)
        : 0,
    }))

    // Rituals: compute overdue using cron-based heuristic thresholds
    let overdueRituals = 0
    for (const r of ritualsRaw as Array<{ cronExpression: string | null; lastRunAt: Date | null }>) {
      if (!r.lastRunAt) { overdueRituals++; continue }
      const ageMs = now.getTime() - new Date(r.lastRunAt).getTime()
      // Determine threshold based on cron expression
      let thresholdMs = 14 * 86400000 // default: 14 days
      if (r.cronExpression) {
        if (r.cronExpression.includes("0 0 * * 0")) {
          thresholdMs = 10 * 86400000 // weekly → 10 days
        } else if (r.cronExpression.includes("0 0 1 * *")) {
          thresholdMs = 45 * 86400000 // monthly → 45 days
        }
      }
      if (ageMs > thresholdMs) overdueRituals++
    }

    // Measurement gaps
    const measurementGaps = (outcomesRaw as Array<{ currentValue: number | null }>)
      .filter(o => o.currentValue === null).length

    // ── Build cockpit inputs ─────────────────────────────────────────────────

    const inputs: CockpitInputs = {
      signalCount24h: signalCount24h as number,
      strategicThemes,

      objectives: objHealthReports.map(r => ({
        code: r.objectiveCode, title: r.objectiveTitle,
        priority: objectivesRaw.find((o: Record<string, unknown>) => o.code === r.objectiveCode)?.priority as string ?? "MEDIUM",
        status: r.recommendedStatus,
        ownerRoles: objectivesRaw.find((o: Record<string, unknown>) => o.code === r.objectiveCode)?.ownerRoles as string[] ?? [],
        contributorRoles: objectivesRaw.find((o: Record<string, unknown>) => o.code === r.objectiveCode)?.contributorRoles as string[] ?? [],
        healthScore: r.healthScore,
        riskLevel: r.riskLevel,
      })),

      patches: patchesRaw as CockpitInputs["patches"],

      homeoEvaluations: homeoEvaluations.map(e => ({
        status: e.status, targetCode: e.targetCode, targetName: e.targetName,
      })),

      recentViolations: (recentViolationsRaw as Array<{ rule: { severity: string; code: string } }>).map(v => ({
        severity: v.rule.severity, ruleCode: v.rule.code,
      })),
      quarantinedCount: quarantinedCount as number,

      budgets,
      lifecyclePhase: (businessRaw as { lifecyclePhase: string } | null)?.lifecyclePhase ?? "GROWTH",

      pruneCandidatesFlagged: pruneFlaggedCount as number,

      outcomes: outcomesRaw as CockpitInputs["outcomes"],
      overdueRituals,
      unansweredWildCards: wildcardsPendingCount as number,
      measurementGaps,

      disfunctionEvents: disfunctionsRaw as CockpitInputs["disfunctionEvents"],
      fluxStepRoles: fluxStepRolesRaw as CockpitInputs["fluxStepRoles"],
      allObjectives: (allObjectivesRaw as Array<Record<string, unknown>>).map(o => {
        const healthReport = objHealthReports.find(r => r.objectiveCode === o.code)
        return {
          code: o.code as string, title: o.title as string, priority: o.priority as string,
          ownerRoles: o.ownerRoles as string[], contributorRoles: o.contributorRoles as string[],
          healthScore: healthReport?.healthScore ?? null,
          riskLevel: healthReport?.riskLevel,
        }
      }),
      agentRelationships: agentRelationshipsRaw as CockpitInputs["agentRelationships"],
    }

    const result = computeOwnerCockpit(inputs)

    // ═══ EXTENSIE: 5 axe unificate (fara query-uri redundante) ═══
    // Reutilizam datele deja incarcate + adaugam doar ce lipseste

    const d30 = new Date(now.getTime() - 30 * 86400000)

    const [
      // CUNOASTERE
      kbTotal, kbValidated, kbAvgScore, kbCreated24h, kbCreated7d,
      kbBySource7d, maturitySnapshot, orchestratorLastRun,
      // OPERATIV
      tasksByStatus, tasksCompleted24h, tasksKbHit24h, tasksCost7d,
      staleBlocked, staleAssigned, cancelledRecent, activeTenants, completedSessions, supportTasks7d,
      // DECIZII
      decisionsRequested, decisionsResponded, tasksBlockedOwner, autoResolved,
      totalCompleted30d,
      // INTERACTIUNI
      cogTasks7d, cogDirectReportsData, lateralTasks7d, brainstormSessions7d,
      fbTotalExec, fbWithLearning, fbWithPropagation,
    ] = await Promise.all([
      // CUNOASTERE
      prisma.learningArtifact.count(),
      prisma.learningArtifact.count({ where: { validated: true } }),
      prisma.learningArtifact.aggregate({ _avg: { effectivenessScore: true } }),
      prisma.learningArtifact.count({ where: { createdAt: { gte: h24 } } }),
      prisma.learningArtifact.count({ where: { createdAt: { gte: d7 } } }),
      prisma.learningArtifact.groupBy({ by: ["sourceType"], where: { createdAt: { gte: d7 } }, _count: true }),
      prisma.systemConfig.findUnique({ where: { key: "AGENT_MATURITY_SNAPSHOT" } }).catch(() => null),
      prisma.systemConfig.findUnique({ where: { key: "LEARNING_ORCHESTRATOR_LAST_DAILY" } }).catch(() => null),
      // OPERATIV
      prisma.agentTask.groupBy({ by: ["status"], _count: true }),
      prisma.agentTask.count({ where: { completedAt: { gte: h24 }, status: "COMPLETED" } }),
      prisma.agentTask.count({ where: { completedAt: { gte: h24 }, status: "COMPLETED", kbHit: true } }),
      prisma.agentTask.aggregate({ where: { completedAt: { gte: d7 } }, _sum: { costUsd: true } }).catch(() => ({ _sum: { costUsd: null } })),
      prisma.agentTask.count({ where: { status: "BLOCKED", blockedAt: { lt: d7 } } }),
      prisma.agentTask.count({ where: { status: "ASSIGNED", createdAt: { lt: d7 } } }),
      prisma.agentTask.count({ where: { status: "CANCELLED", updatedAt: { gte: d7 } } }),
      prisma.tenant.count({ where: { status: "ACTIVE" } }).catch(() => 0),
      prisma.evaluationSession.count({ where: { status: "COMPLETED" } }).catch(() => 0),
      prisma.agentTask.count({ where: { tags: { hasSome: ["support-response"] }, createdAt: { gte: d7 } } }).catch(() => 0),
      // DECIZII
      (prisma as any).notification?.count({ where: { requestKind: "DECISION", createdAt: { gte: d30 } } }).catch(() => 0),
      (prisma as any).notification?.count({ where: { requestKind: "DECISION", respondedAt: { not: null }, createdAt: { gte: d30 } } }).catch(() => 0),
      prisma.agentTask.count({ where: { status: "BLOCKED", blockerType: "OWNER_DECISION", createdAt: { gte: d30 } } }).catch(() => 0),
      prisma.agentTask.count({ where: { status: "COMPLETED", createdAt: { gte: d30 }, kbHit: true } }).catch(() => 0),
      prisma.agentTask.count({ where: { completedAt: { gte: d30 }, status: "COMPLETED" } }).catch(() => 0),
      // INTERACTIUNI
      prisma.agentTask.findMany({ where: { createdBy: "cog-agent", createdAt: { gte: d7 } }, select: { assignedTo: true } }),
      (prisma as any).agentRelationship?.findMany({ where: { parentRole: "cog-agent", isActive: true, relationType: "REPORTS_TO" }, select: { childRole: true } }).catch(() => []),
      prisma.agentTask.count({ where: { tags: { hasSome: ["lateral-collaboration"] }, createdAt: { gte: d7 } } }).catch(() => 0),
      (prisma as any).brainstormSession?.count({ where: { createdAt: { gte: d7 } } }).catch(() => 0),
      // Feedback loops
      prisma.agentTask.count({ where: { completedAt: { gte: d7 }, status: "COMPLETED" } }),
      prisma.learningArtifact.count({ where: { createdAt: { gte: d7 }, sourceType: "POST_EXECUTION" } }),
      prisma.learningArtifact.count({ where: { createdAt: { gte: d7 }, teacherRole: "learning-funnel-propagated" } }),
    ])

    // Cunoastere
    const sourceMap: Record<string, number> = {}
    for (const s of kbBySource7d) sourceMap[s.sourceType] = s._count
    const adaptiveSrc = (sourceMap["ESCALATION"] || 0) + (sourceMap["EXTRAPOLATION"] || 0)
    const evolutiveSrc = (sourceMap["POST_EXECUTION"] || 0) + (sourceMap["SELF_INTERVIEW"] || 0)

    let maturity = null
    if (maturitySnapshot) { try { maturity = JSON.parse(maturitySnapshot.value) } catch {} }

    // COG delegation
    const dirRoles = new Set((cogDirectReportsData ?? []).map((r: any) => r.childRole))
    const cogToDirs = cogTasks7d.filter((t: any) => dirRoles.has(t.assignedTo)).length

    // Status map
    const sMap: Record<string, number> = {}
    for (const s of tasksByStatus) sMap[s.status] = s._count

    const axes = {
      // AXA 1: ORGANISM — deja in result.layers + result.vitalSigns
      organism: {
        verdict: result.vitalSigns.verdict,
        layersSummary: Object.values(result.layers).map((l: any) => ({
          key: l.key, status: l.status, alarms: l.alarmCount,
        })),
      },
      // AXA 2: CUNOASTERE
      knowledge: {
        evolutionary: {
          totalArtifacts: kbTotal, validated: kbValidated,
          validatedPct: kbTotal > 0 ? Math.round((kbValidated / kbTotal) * 100) : 0,
          avgEffectiveness: Math.round((kbAvgScore._avg.effectivenessScore || 0) * 100) / 100,
          created24h: kbCreated24h, created7d: kbCreated7d, evolutiveSources: evolutiveSrc,
        },
        adaptive: {
          signalsProcessed7d: signalCount24h * 7, // aproximare
          adaptiveSources: adaptiveSrc,
          adaptiveRatio: kbCreated7d > 0 ? Math.round((adaptiveSrc / kbCreated7d) * 100) : 0,
          supportFeedback7d: supportTasks7d,
        },
        maturity: maturity ? {
          lastUpdated: maturity.timestamp, summary: maturity.summary,
          topAgents: (maturity.agents || []).sort((a: any, b: any) => b.score - a.score).slice(0, 5),
          bottomAgents: (maturity.agents || []).sort((a: any, b: any) => a.score - b.score).slice(0, 5),
        } : null,
        orchestrator: {
          lastDailyRun: orchestratorLastRun?.value || null,
          status: orchestratorLastRun?.value
            ? (Date.now() - new Date(orchestratorLastRun.value).getTime()) < 25 * 3600000 ? "ON_SCHEDULE" : "OVERDUE"
            : "NEVER_RUN",
        },
      },
      // AXA 3: OPERATIV
      operations: {
        internal: {
          tasksByStatus: sMap,
          completed24h: tasksCompleted24h, kbHit24h: tasksKbHit24h,
          kbHitPct: tasksCompleted24h > 0 ? Math.round((tasksKbHit24h / tasksCompleted24h) * 100) : 0,
          costUsd7d: Math.round(((tasksCost7d as any)._sum?.costUsd || 0) * 100) / 100,
          hygiene: { staleBlocked, staleAssigned, cancelledRecent7d: cancelledRecent,
            verdict: staleBlocked === 0 && staleAssigned < 10 ? "CURAT" : "ATENTIE" },
        },
        external: { activeTenants, completedSessions, supportTickets7d: supportTasks7d },
      },
      // AXA 4: DECIZII
      decisions: {
        requested30d: decisionsRequested || 0, responded30d: decisionsResponded || 0,
        pending: (decisionsRequested || 0) - (decisionsResponded || 0),
        responseRate: (decisionsRequested || 0) > 0 ? Math.round(((decisionsResponded || 0) / (decisionsRequested || 0)) * 100) : 100,
        blockedByOwner: tasksBlockedOwner,
        autoResolved30d: autoResolved || 0,
        autonomyPct: totalCompleted30d > 0 ? Math.round(((autoResolved || 0) / totalCompleted30d) * 100) : 0,
      },
      // AXA 5: INTERACTIUNI
      interactions: {
        cogDelegation: {
          total7d: cogTasks7d.length, toDirectors: cogToDirs, toOthers: cogTasks7d.length - cogToDirs,
          pctViaDirectors: cogTasks7d.length > 0 ? Math.round((cogToDirs / cogTasks7d.length) * 100) : 0,
          verdict: cogTasks7d.length === 0 ? "N/A"
            : cogToDirs / cogTasks7d.length >= 0.8 ? "BINE"
            : cogToDirs / cogTasks7d.length >= 0.5 ? "PARTIAL" : "SLAB",
        },
        lateralCollaboration7d: lateralTasks7d,
        brainstormSessions7d: brainstormSessions7d || 0,
        feedbackLoops: {
          totalExecutions: fbTotalExec, withLearning: fbWithLearning, withPropagation: fbWithPropagation,
          closedLoopPct: fbTotalExec > 0 ? Math.round((fbWithLearning / fbTotalExec) * 100) : 0,
        },
      },
    }

    return NextResponse.json({ ...result, axes })

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: "internal_error", message }, { status: 500 })
  }
}

// ── Helper: fetch strategic themes via internal API ──────────────────────────

async function fetchStrategicThemes(): Promise<unknown[]> {
  try {
    const base = process.env.NEXTAUTH_URL || getAppUrl()
    const key = process.env.INTERNAL_API_KEY!
    const res = await fetch(`${base}/api/v1/strategic-themes?windowHours=168`, {
      headers: { "x-internal-key": key },
      cache: "no-store",
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.themes ?? []
  } catch {
    return []
  }
}
