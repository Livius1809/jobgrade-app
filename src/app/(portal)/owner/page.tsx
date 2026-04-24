import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import CogChat from "@/components/chat/CogChat"
import { getOrganismTelemetryOverview } from "@/lib/agents/execution-telemetry"
import { getLearningStats } from "@/lib/agents/learning-pipeline"
import LayerCardInteractive from "./LayerCardInteractive"
import OrganismPulse from "./OrganismPulse"
import OwnerInbox from "@/components/owner/OwnerInbox"
import type { OwnerCockpitResult, LayerStatus, DecisionItem, DecisionOption } from "@/lib/owner/cockpit-aggregator"
import DecisionButtons from "./DecisionButtons"
import PilotToggle from "@/components/owner/PilotToggle"
import OrganismControls from "@/components/owner/OrganismControls"

export const metadata = { title: "Owner Dashboard — JobGrade" }

// Force SSR per request — page hits Prisma in fetchCockpit() and reads
// docs/vital-signs/ from filesystem. Both fail at build-time prerendering
// (build cluster has no DB connection guaranteed and no docs/vital-signs/),
// causing the page to be marked as error → 404 hard on runtime.
export const dynamic = "force-dynamic"

// ── Data fetching ───────────────────────────────────────────────────────────

async function fetchCockpit(): Promise<OwnerCockpitResult | null> {
  try {
    // Import direct — evită self-fetch HTTP care eșuează în SSR Next.js 16
    const { prisma } = await import("@/lib/prisma")
    const { computeOwnerCockpit } = await import("@/lib/owner/cockpit-aggregator")
    const { evaluateHomeostasis } = await import("@/lib/agents/homeostasis-monitor")
    const { computeObjectiveHealth } = await import("@/lib/agents/objective-health")

    const businessId = "biz_jobgrade"
    const now = new Date()
    const h24 = new Date(now.getTime() - 24 * 3600000)

    const [
      signalCount24h, objectivesRaw, patchesRaw, homeoTargetsRaw,
      recentViolationsRaw, quarantinedCount, budgetsRaw, businessRaw,
      pruneFlaggedCount, outcomesRaw, ritualsRaw, wildcardsPendingCount,
      disfunctionsRaw, fluxStepRolesRaw, allObjectivesRaw, agentRelationshipsRaw,
      // NEW 10.04.2026 — organism metrics
      tasksExecutedRaw, signalsPendingCount, reactiveTasksCount,
      proactiveCyclesCount, selfTasksCount,
    ] = await Promise.all([
      prisma.externalSignal.count({ where: { capturedAt: { gte: h24 } } }).catch(() => 0),
      prisma.organizationalObjective.findMany({
        where: { businessId, status: { notIn: ["ARCHIVED"] } },
        select: {
          id: true, code: true, title: true, businessId: true,
          metricName: true, metricUnit: true, targetValue: true, currentValue: true,
          direction: true, startDate: true, deadlineAt: true, completedAt: true,
          priority: true, status: true, ownerRoles: true, contributorRoles: true, tags: true,
        },
      }).catch(() => []),
      prisma.agentBehaviorPatch.findMany({
        where: { businessId, status: { in: ["PROPOSED", "APPROVED", "ACTIVE"] } },
        select: { status: true, targetRole: true, createdAt: true },
      }).catch(() => []),
      prisma.homeostaticTarget.findMany({
        where: { businessId, isActive: true },
        select: {
          id: true, code: true, name: true, metricName: true, metricUnit: true,
          targetType: true, targetEntityId: true,
          minValue: true, maxValue: true, optimalValue: true,
          warningPct: true, criticalPct: true, lastReading: true, autoCorrect: true,
        },
      }).catch(() => []),
      prisma.boundaryViolation.findMany({
        where: { createdAt: { gte: h24 } },
        select: { id: true, rule: { select: { severity: true, code: true } } },
      }).catch(() => []),
      prisma.quarantineEntry.count({ where: { status: "QUARANTINED" } }).catch(() => 0),
      prisma.resourceBudget.findMany({
        where: { businessId, isActive: true },
        select: { agentRole: true, maxLlmCostPerDay: true, usedLlmCost: true },
      }).catch(() => []),
      prisma.business.findUnique({
        where: { id: businessId },
        select: { lifecyclePhase: true },
      }).catch(() => null),
      prisma.pruneCandidate.count({ where: { status: "FLAGGED" } }).catch(() => 0),
      prisma.serviceOutcome.findMany({
        where: { businessId, isActive: true },
        select: { serviceCode: true, currentValue: true, targetValue: true, collectionFrequency: true },
      }).catch(() => []),
      prisma.ritual.findMany({
        where: { businessId, isActive: true },
        select: { code: true, cronExpression: true, lastRunAt: true },
      }).catch(() => []),
      prisma.wildCard.count({ where: { businessId, respondedAt: null } }).catch(() => 0),
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

      // NEW 10.04.2026: Task executor — grouped by status ultimele 24h
      prisma.agentTask.groupBy({
        by: ["status"],
        where: { updatedAt: { gte: h24 } },
        _count: { _all: true },
      }).catch(() => [] as any[]),

      // NEW: Semnale pending (neprocesate)
      prisma.externalSignal.count({ where: { processedAt: null } }).catch(() => 0),

      // NEW: Taskuri reactive create 24h (signal→task pipeline)
      prisma.agentTask.count({
        where: {
          assignedBy: "COSO",
          tags: { has: "signal-reactive" },
          createdAt: { gte: h24 },
        },
      }).catch(() => 0),

      // NEW: Cicluri proactive rulate 24h
      prisma.cycleLog.count({ where: { createdAt: { gte: h24 } } }).catch(() => 0),

      // NEW: Self-tasks executate 24h (OWNER→manager completate)
      prisma.agentTask.count({
        where: {
          assignedBy: "OWNER",
          status: "COMPLETED",
          completedAt: { gte: h24 },
        },
      }).catch(() => 0),
    ])

    // Post-processing
    const homeoInputs = (homeoTargetsRaw as any[]).map((t: any) => ({
      id: t.id, code: t.code, name: t.name,
      metricName: t.metricName, metricUnit: t.metricUnit ?? null,
      targetType: t.targetType, targetEntityId: t.targetEntityId ?? null,
      minValue: t.minValue, maxValue: t.maxValue, optimalValue: t.optimalValue,
      warningPct: t.warningPct, criticalPct: t.criticalPct,
      lastReading: t.lastReading, autoCorrect: t.autoCorrect,
    }))
    const homeoEvaluations = evaluateHomeostasis(homeoInputs)

    const disfForHealth = (disfunctionsRaw as any[]).map((d: any) => ({
      id: d.id, targetType: d.targetType, targetId: d.targetId,
      signal: d.signal, severity: d.severity, status: d.status,
    }))
    const objHealthReports = computeObjectiveHealth({
      objectives: (objectivesRaw as any[]).map((o: any) => ({
        id: o.id, code: o.code, title: o.title, businessId: o.businessId,
        metricName: o.metricName, metricUnit: o.metricUnit ?? null,
        targetValue: o.targetValue, currentValue: o.currentValue,
        direction: o.direction, startDate: o.startDate, deadlineAt: o.deadlineAt,
        completedAt: o.completedAt, priority: o.priority, status: o.status,
        ownerRoles: o.ownerRoles, contributorRoles: o.contributorRoles, tags: o.tags,
      })),
      strategicThemes: [],
      disfunctions: disfForHealth,
    })

    const budgets = (budgetsRaw as any[]).map((b: any) => ({
      agentRole: b.agentRole,
      withinBudget: b.usedLlmCost <= b.maxLlmCostPerDay,
      costUsedPct: b.maxLlmCostPerDay > 0 ? Math.round((b.usedLlmCost / b.maxLlmCostPerDay) * 100) : 0,
    }))

    let overdueRituals = 0
    for (const r of ritualsRaw as any[]) {
      if (!r.lastRunAt) { overdueRituals++; continue }
      const ageMs = now.getTime() - new Date(r.lastRunAt).getTime()
      let thresholdMs = 14 * 86400000
      if (r.cronExpression?.includes("0 0 * * 0")) thresholdMs = 10 * 86400000
      else if (r.cronExpression?.includes("0 0 1 * *")) thresholdMs = 45 * 86400000
      if (ageMs > thresholdMs) overdueRituals++
    }

    const measurementGaps = (outcomesRaw as any[]).filter((o: any) => o.currentValue === null).length

    // NEW 10.04.2026: Agregare task executor metrics din groupBy
    const taskStatusMap: Record<string, number> = {}
    for (const row of (tasksExecutedRaw as any[])) {
      taskStatusMap[row.status] = row._count?._all ?? 0
    }
    const tasksExecuted24h = {
      completed: taskStatusMap["COMPLETED"] || 0,
      blocked: taskStatusMap["BLOCKED"] || 0,
      failed: (taskStatusMap["FAILED"] || 0) + (taskStatusMap["CANCELLED"] || 0),
      assigned: taskStatusMap["ASSIGNED"] || 0,
    }

    // NEW: Cron state
    const executorCronEnabled = process.env.EXECUTOR_CRON_ENABLED === "true"

    // Cost 24h — din telemetry reală (dacă există), altfel estimare conservatoare
    let estimatedCost24hUsd = 0
    try {
      const costData = await prisma.$queryRaw`
        SELECT COALESCE(SUM("estimatedCostUSD"), 0) as total_cost
        FROM execution_telemetry
        WHERE "createdAt" > ${new Date(Date.now() - 24 * 60 * 60 * 1000)}
      ` as any[]
      estimatedCost24hUsd = Math.round(Number(costData[0]?.total_cost || 0) * 100) / 100
    } catch {
      // Fallback: Haiku ~$0.003/task, Sonnet ~$0.02/task, medie ~$0.005
      const totalExecTasks = tasksExecuted24h.completed + tasksExecuted24h.blocked
      estimatedCost24hUsd = Math.round(totalExecTasks * 0.005 * 100) / 100
    }

    // Vital signs — citire din DB (salvat de GitHub Actions via /api/v1/vital-signs)
    let vitalSignsLatest: any = undefined
    try {
      const vsConfig = await prisma.systemConfig.findUnique({ where: { key: "VITAL_SIGNS_LATEST" } })
      if (vsConfig) {
        const latest = JSON.parse(vsConfig.value)
        vitalSignsLatest = {
          verdict: latest.overallStatus || "UNKNOWN",
          pass: latest.summary?.pass || 0,
          warn: latest.summary?.warn || 0,
          fail: latest.summary?.fail || 0,
          skip: latest.summary?.skip || 0,
          runAt: latest.reportDate || null,
          tests: Array.isArray(latest.tests)
            ? latest.tests.map((t: any) => ({
                name: t.name,
                status: t.status,
                notes: t.notes || "",
                metrics: t.metrics || {},
              }))
            : [],
        }
      }
    } catch {
      // Vital signs absent — ok, rămâne undefined
    }

    // #10: Signal funnel — de la semnale la execuție
    const signalFunnel = {
      received: signalCount24h as number,
      pending: signalsPendingCount as number,
      convertedToTasks: reactiveTasksCount as number,
      executed: tasksExecuted24h.completed,
      conversionRate: (signalCount24h as number) > 0
        ? Math.round(((reactiveTasksCount as number) / (signalCount24h as number)) * 100)
        : 0,
    }

    // #12: Measurement gaps penalizare — objectives fără metrici scad health
    const totalObjectives = (outcomesRaw as any[]).length
    const gapRatio = totalObjectives > 0 ? measurementGaps / totalObjectives : 0
    const healthPenalty = Math.round(gapRatio * 30) // max 30% penalizare

    const inputs: any = {
      signalCount24h, strategicThemes: [],
      signalFunnel,
      healthPenalty,
      // NEW: signal pipeline metrics
      signalsPending: signalsPendingCount,
      reactiveTasksCreated24h: reactiveTasksCount,
      // NEW: task executor metrics
      tasksExecuted24h,
      proactiveCycles24h: proactiveCyclesCount,
      selfTasksExecuted24h: selfTasksCount,
      // NEW: metabolism enrichment
      executorCronEnabled,
      estimatedCost24hUsd,
      // NEW: vital signs
      vitalSignsLatest,
      objectives: objHealthReports.map((r: any) => ({
        code: r.objectiveCode, title: r.objectiveTitle,
        priority: (objectivesRaw as any[]).find((o: any) => o.code === r.objectiveCode)?.priority ?? "MEDIUM",
        status: r.recommendedStatus,
        ownerRoles: (objectivesRaw as any[]).find((o: any) => o.code === r.objectiveCode)?.ownerRoles ?? [],
        contributorRoles: (objectivesRaw as any[]).find((o: any) => o.code === r.objectiveCode)?.contributorRoles ?? [],
        healthScore: r.healthScore, riskLevel: r.riskLevel,
      })),
      patches: patchesRaw,
      homeoEvaluations: homeoEvaluations.map((e: any) => ({
        status: e.status, targetCode: e.targetCode, targetName: e.targetName,
      })),
      recentViolations: (recentViolationsRaw as any[]).map((v: any) => ({
        severity: v.rule.severity, ruleCode: v.rule.code,
      })),
      quarantinedCount,
      budgets,
      lifecyclePhase: (businessRaw as any)?.lifecyclePhase ?? "GROWTH",
      pruneCandidatesFlagged: pruneFlaggedCount,
      outcomes: outcomesRaw,
      overdueRituals,
      unansweredWildCards: wildcardsPendingCount,
      measurementGaps,
      disfunctionEvents: disfunctionsRaw,
      fluxStepRoles: fluxStepRolesRaw,
      allObjectives: (allObjectivesRaw as any[]).map((o: any) => {
        const hr = objHealthReports.find((r: any) => r.objectiveCode === o.code)
        return {
          code: o.code, title: o.title, priority: o.priority,
          ownerRoles: o.ownerRoles, contributorRoles: o.contributorRoles,
          healthScore: hr?.healthScore ?? null, riskLevel: hr?.riskLevel,
        }
      }),
      agentRelationships: agentRelationshipsRaw,
    }

    return computeOwnerCockpit(inputs)
  } catch {
    return null
  }
}

// ── Limite furnizori ─────────────────────────────────────────────────────────

interface SupplierLimit {
  name: string
  metric: string
  current: number | string
  limit: number | string
  usage: number // 0-100%
  status: "ok" | "warn" | "critical"
  detail?: string
}

async function fetchSupplierLimits(): Promise<SupplierLimit[]> {
  const limits: SupplierLimit[] = []

  try {
    // Anthropic — cost și erori API limit
    const [costData, failedApiLimit, callCount] = await Promise.all([
      prisma.$queryRaw`
        SELECT COALESCE(SUM("estimatedCostUSD"), 0) as cost_month,
          COALESCE(SUM("estimatedCostUSD") FILTER (WHERE "createdAt" > NOW() - interval '24 hours'), 0) as cost_day
        FROM execution_telemetry
        WHERE "createdAt" > date_trunc('month', NOW())
      ` as Promise<any[]>,
      prisma.agentTask.count({
        where: { failureReason: { contains: "API usage limits" } },
      }).catch(() => 0),
      prisma.$queryRaw`
        SELECT count(*) as cnt FROM execution_telemetry WHERE "createdAt" > NOW() - interval '24 hours'
      ` as Promise<any[]>,
    ])

    const monthCost = Number(costData[0]?.cost_month || 0)
    const dayCost = Number(costData[0]?.cost_day || 0)
    const dailyCalls = Number(callCount[0]?.cnt || 0)

    // Anthropic API — plafon setat de Owner pe console.anthropic.com
    const monthlyBudget = 500 // setat 24.04.2026
    const usagePct = Math.round(monthCost / monthlyBudget * 100)

    limits.push({
      name: "Anthropic Claude",
      metric: "Cost lunar",
      current: `$${monthCost.toFixed(2)}`,
      limit: `~$${monthlyBudget}`,
      usage: Math.min(usagePct, 100),
      status: failedApiLimit > 0 ? "critical" : usagePct > 80 ? "warn" : "ok",
      detail: failedApiLimit > 0
        ? `${failedApiLimit} task-uri eșuate. Mărește plafonul API pe console.anthropic.com → Settings → Limits`
        : usagePct > 80
          ? `$${dayCost.toFixed(2)}/zi · ${dailyCalls} apeluri. Aproape de limită — redu frecvența cron sau mărește bugetul`
          : `$${dayCost.toFixed(2)}/zi · ${dailyCalls} apeluri/zi`,
    })

    // Neon DB — dimensiune
    const dbSize = await prisma.$queryRaw`SELECT pg_database_size(current_database()) as size` as any[]
    const dbMB = Math.round(Number(dbSize[0]?.size || 0) / 1024 / 1024)
    const dbLimitMB = 10 * 1024 // Neon Launch: 10 GB
    const dbUsage = Math.round(dbMB / dbLimitMB * 100)

    limits.push({
      name: "Neon Postgres",
      metric: "Stocare",
      current: `${dbMB} MB`,
      limit: `${dbLimitMB} MB`,
      usage: dbUsage,
      status: dbUsage > 90 ? "critical" : dbUsage > 70 ? "warn" : "ok",
      detail: dbUsage > 90
        ? `Stocare aproape plină. Curăță: execution_telemetry vechi, external_signals procesate, sau upgrade plan Neon`
        : dbUsage > 70
          ? `Se apropie de limită. Activează cleanup automat sau monitorizează creșterea`
          : `${dbUsage}% din capacitate`,
    })

    // Vercel Pro — 1M invocations/lună, 1TB bandwidth
    const monthlyInvocations = dailyCalls * 30
    const vercelLimit = 1000000
    const vercelUsage = Math.round(monthlyInvocations / vercelLimit * 100)
    limits.push({
      name: "Vercel Pro",
      metric: "Execuții funcții / lună",
      current: monthlyInvocations.toLocaleString("ro-RO"),
      limit: vercelLimit.toLocaleString("ro-RO"),
      usage: vercelUsage,
      status: vercelUsage > 80 ? "warn" : "ok",
      detail: vercelUsage > 80
        ? `~${dailyCalls}/zi. Aproape de limită — optimizează cron-ul sau upgrade plan`
        : `~${dailyCalls} execuții/zi`,
    })

    // Redis/Upstash — verificăm dacă e configurat
    const hasRedis = !!process.env.UPSTASH_REDIS_REST_URL
    limits.push({
      name: "Upstash Redis",
      metric: "Status",
      current: hasRedis ? "Configurat" : "Neconfigurat",
      limit: "10.000 cmd/zi (free)",
      usage: hasRedis ? 20 : 0,
      status: hasRedis ? "ok" : "warn",
      detail: hasRedis
        ? "Rate limiting activ"
        : "Adaugă UPSTASH_REDIS_REST_URL și UPSTASH_REDIS_REST_TOKEN în Vercel → Settings → Environment Variables",
    })

  } catch (e) {
    console.error("[supplier-limits]", (e as Error).message?.slice(0, 80))
  }

  return limits
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function OwnerDashboard() {
  const session = await auth()
  if (!session) redirect("/login")

  const role = session.user.role
  if (role !== "SUPER_ADMIN" && role !== "OWNER") {
    redirect("/portal")
  }

  const [data, supplierLimits] = await Promise.all([
    fetchCockpit(),
    fetchSupplierLimits(),
  ])
  const firstName = session.user.name?.split(" ")[0] ?? "Owner"

  // Filtrare decizii Owner (doar strategice)
  const COG_COA_PATTERNS = /no_activity|no_cycles|no_actions|monotony|dormant|error|bug|fix|deploy|config|cron|timeout|crash|memory|cpu|disk|latency|cache|migration|schema|build|test.*fail|refactor|endpoint|api.*error|database|redis|queue/i
  const ownerDecisions = (data?.decisions || []).filter(
    (d: any) => (d.severity === "CRITICAL" || d.severity === "HIGH") &&
      !COG_COA_PATTERNS.test(d.title || "") &&
      !COG_COA_PATTERNS.test(d.cause || "") &&
      !COG_COA_PATTERNS.test(d.classification || "")
  )

  return (
    <div>
      <div className="max-w-4xl mx-auto" style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
        <meta httpEquiv="refresh" content="3600" />

        {/* ═══ HEADER + CUPRINS ═══ */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm" style={{ padding: "28px" }}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Bună, {firstName}.</h1>
              <div style={{ height: "4px" }} />
              <p className="text-sm text-slate-500">
                Actualizat {data ? new Date(data.generatedAt).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" }) : "—"}
              </p>
            </div>
          </div>
          <div style={{ height: "20px" }} />
          <nav className="flex gap-3 text-xs flex-wrap">
            <a href="#interna" className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg font-medium hover:bg-indigo-100 transition-colors">I. Situație internă</a>
            <a href="#externa" className="bg-violet-50 text-violet-700 px-3 py-1.5 rounded-lg font-medium hover:bg-violet-100 transition-colors">II. Situație externă</a>
            <a href="#decizii" className="bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg font-medium hover:bg-amber-100 transition-colors">
              III. Decizii
              {ownerDecisions.length > 0 && <span className="ml-1 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">{ownerDecisions.length}</span>}
            </a>
            <a href="#interactiune" className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg font-medium hover:bg-emerald-100 transition-colors">IV. Interacțiune</a>
          </nav>
        </div>

        {/* ═══ LIMITE FURNIZORI ═══ */}
        {supplierLimits.length > 0 && supplierLimits.some(l => l.status !== "ok") && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm" style={{ padding: "20px" }}>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Limite furnizori — atenție necesară</h2>
            <div className="space-y-2">
              {supplierLimits.filter(l => l.status !== "ok").map(l => (
                <div key={l.name} className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
                  l.status === "critical" ? "bg-red-50 border border-red-200" : "bg-amber-50 border border-amber-200"
                }`}>
                  <span className={`w-2 h-2 rounded-full shrink-0 ${l.status === "critical" ? "bg-red-500" : "bg-amber-400"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${l.status === "critical" ? "text-red-700" : "text-amber-700"}`}>{l.name}</span>
                      <span className="text-[10px] text-slate-500">{l.current} / {l.limit}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div className={`h-full rounded-full ${l.status === "critical" ? "bg-red-500" : "bg-amber-400"}`} style={{ width: `${Math.min(l.usage, 100)}%` }} />
                      </div>
                      <span className="text-[9px] text-slate-400 shrink-0">{l.usage}%</span>
                    </div>
                    {l.detail && <p className={`text-[10px] mt-0.5 ${l.status === "critical" ? "text-red-600" : "text-amber-600"}`}>{l.detail}</p>}
                  </div>
                </div>
              ))}
            </div>
            {supplierLimits.every(l => l.status === "ok") ? null : (
              <div className="mt-3 flex gap-3">
                {supplierLimits.filter(l => l.status === "ok").map(l => (
                  <span key={l.name} className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                    {l.name}: OK
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Toate OK — sumă compactă */}
        {supplierLimits.length > 0 && supplierLimits.every(l => l.status === "ok") && (
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-xl border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-emerald-700 font-medium">Toți furnizorii OK</span>
            <span className="text-[10px] text-emerald-500 ml-auto">
              {supplierLimits.map(l => `${l.name}: ${l.current}`).join(" · ")}
            </span>
          </div>
        )}

        {!data ? (
          <div className="rounded-xl border border-red-200 bg-red-50" style={{ padding: "28px" }}>
            <p className="text-sm text-red-600">Nu se pot încărca datele. Verifică dacă app-ul rulează.</p>
          </div>
        ) : (
          <>
            {/* ═══ I. SITUAȚIE INTERNĂ ═══ */}
            <div id="interna" className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl border border-indigo-100" style={{ padding: "28px" }}>
              <h2 className="text-lg font-bold text-slate-900">I. Situație internă</h2>
              <div style={{ height: "4px" }} />
              <p className="text-xs text-slate-500">Sănătatea organismului, performanță, straturi</p>
            </div>

            <OrganismPulse
              verdict={data.vitalSigns.verdict}
              summary={data.vitalSigns.summary}
              runAt={data.vitalSigns.runAt}
              tests={data.vitalSigns.tests}
            />

            <PipelineTelemetrySection />

            <div className="bg-white rounded-2xl border border-slate-200" style={{ padding: "28px" }}>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Straturi organism</p>
              <div style={{ height: "16px" }} />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <LayerCardInteractive layer={data.layers.awareness} icon="A" />
                <LayerCardInteractive layer={data.layers.goals} icon="G" />
                <LayerCardInteractive layer={data.layers.action} icon="Ac" />
                <LayerCardInteractive layer={data.layers.homeostasis} icon="H" />
                <LayerCardInteractive layer={data.layers.immune} icon="Im" />
                <LayerCardInteractive layer={data.layers.metabolism} icon="M" />
                <LayerCardInteractive layer={data.layers.evolution} icon="Ev" />
                <LayerCardInteractive layer={data.layers.rhythm} icon="R" />
              </div>
            </div>

            {/* Rapoarte interne — creștere sănătoasă */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <ReportLink href="/owner/insights" title="Experiențe de învățare" description="Feedback loops, autonomie" icon="🧠" />
              <ReportLink href="/owner/reports/agents" title="Evoluție agenți" description="Maturitate, KB hit" icon="📊" />
              <ReportLink href="/owner/reports/daily" title="Raport zilnic" description="Performanță, cicluri" icon="📅" />
            </div>

            {/* ═══ II. SITUAȚIE EXTERNĂ ═══ */}
            <div id="externa" className="bg-gradient-to-br from-violet-50 to-fuchsia-50 rounded-2xl border border-violet-100" style={{ padding: "28px" }}>
              <h2 className="text-lg font-bold text-slate-900">II. Situație externă</h2>
              <div style={{ height: "4px" }} />
              <p className="text-xs text-slate-500">Mediul în care operează: obiective, costuri, legislație, competiție</p>
            </div>

            {/* Rapoarte externe — constrângeri mediu */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <ReportLink href="/owner/reports/business-plan" title="Business Plan" description="Obiective, strategie, termene" icon="📈" />
              <ReportLink href="/owner/reports/costs" title="Costuri operare" description="LLM, infra, per agent" icon="💰" />
              <ReportLink href="/owner/reports/evolution" title="Evoluție Owner" description="Aliniere, pattern-uri" icon="🪞" />
            </div>

            {/* ═══ III. DECIZII ═══ */}
            <div id="decizii" className="bg-amber-50 rounded-2xl border border-amber-200" style={{ padding: "28px" }}>
              <h2 className="text-lg font-bold text-slate-900">III. Decizii</h2>
              <div style={{ height: "4px" }} />
              <p className="text-xs text-slate-500">Ce necesită atenția ta — doar strategic, nu tehnic</p>
            </div>

            <OwnerInbox />

            {/* Task-uri alocate de Owner/Claude — tracking */}
            <OwnerTasksSection />

            {ownerDecisions.length > 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200" style={{ padding: "28px" }}>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-amber-700 font-bold uppercase tracking-wide">
                    Decizii strategice
                    <span className="ml-2 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">{ownerDecisions.length}</span>
                  </p>
                  <Link href="/owner/situations" className="text-[10px] text-indigo-600 hover:underline">Toate situațiile →</Link>
                </div>
                <div style={{ height: "16px" }} />
                <div className="space-y-3">
                  {ownerDecisions.slice(0, 3).map((d: any, i: number) => (
                    <DecisionCard key={d.situationId ?? i} decision={d} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-emerald-50 rounded-2xl border border-emerald-200 text-center" style={{ padding: "28px" }}>
                <p className="text-sm text-emerald-700 font-medium">Nicio decizie strategică în așteptare.</p>
                <div style={{ height: "4px" }} />
                <p className="text-xs text-emerald-500">Organismul gestionează autonom situațiile curente.</p>
              </div>
            )}

            {/* ═══ IV. INTERACȚIUNE ═══ */}
            <div id="interactiune" className="bg-emerald-50 rounded-2xl border border-emerald-200" style={{ padding: "28px" }}>
              <h2 className="text-lg font-bold text-slate-900">IV. Interacțiune</h2>
              <div style={{ height: "4px" }} />
              <p className="text-xs text-slate-500">Comunică cu echipa și controlează organismul</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link href="/owner/team" className="block rounded-2xl border border-indigo-100 bg-white hover:bg-indigo-50 transition-all" style={{ padding: "20px" }}>
                <span className="text-xl">💬</span>
                <div style={{ height: "8px" }} />
                <h3 className="text-sm font-bold text-slate-900">Discută cu echipa</h3>
                <div style={{ height: "4px" }} />
                <p className="text-[10px] text-slate-400">Nivel ierarhic, departament, individual</p>
              </Link>
              <Link href="/owner/docs" className="block rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition-all" style={{ padding: "20px" }}>
                <span className="text-xl">📚</span>
                <div style={{ height: "8px" }} />
                <h3 className="text-sm font-bold text-slate-900">Biblioteca echipei</h3>
                <div style={{ height: "4px" }} />
                <p className="text-[10px] text-slate-400">Documente partajate, KB automat</p>
              </Link>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200" style={{ padding: "28px" }}>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Control organism</p>
              <div style={{ height: "16px" }} />
              <OrganismControls />
            </div>

            <PilotSection />

            <div className="bg-white rounded-2xl border border-slate-200" style={{ padding: "28px" }}>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Acces rapid</p>
              <div style={{ height: "16px" }} />
              <div className="flex flex-wrap gap-3">
                <QuickLink href="/media-books" label="Media Books" />
                <QuickLink href="/portal" label="Portal B2B" />
                <QuickLink href="/jobs" label="Fișe de post" />
                <QuickLink href="/sessions" label="Sesiuni" />
                <QuickLink href="/owner/payroll" label="Payroll" />
                <QuickLink href="/owner/situations" label="Situații" />
                <QuickLink href="/settings/users" label="Utilizatori" />
                <QuickLink href="/settings/billing" label="Facturare" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* COG Chat scos — redundant cu "Discută cu echipa" */}
    </div>
  )
}

// ── Pilot Section ───────────────────────────────────────────────────────────

async function PilotSection() {
  const { prisma } = await import("@/lib/prisma")
  const tenants = await prisma.tenant.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true, isPilot: true, slug: true },
    orderBy: { name: "asc" },
  }).catch(() => [])

  if (tenants.length === 0) return null

  return (
    <div>
      <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-text-secondary/80 mb-4">
        Conturi pilot
      </h2>
      <div className="space-y-2">
        {tenants.map(t => (
          <PilotToggle
            key={t.id}
            tenantId={t.id}
            tenantName={`${t.name} (${t.slug})`}
            initialValue={t.isPilot}
          />
        ))}
      </div>
    </div>
  )
}

// ── Pipeline Telemetry Section ───────────────────────────────────────────────

async function PipelineTelemetrySection() {
  try {
    const [telemetry, learning] = await Promise.all([
      getOrganismTelemetryOverview(24),
      getLearningStats(),
    ])

    const fmt = (n: number) => new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 2 }).format(n)

    return (
      <section>
        <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-text-secondary/80 mb-4">
          Pipeline inteligent — ultimele 24h
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-[9px] uppercase tracking-wider text-slate-500 font-medium">Task-uri procesate</p>
            <p className="text-2xl font-bold text-indigo-700 mt-1">{telemetry.totalTasks}</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-[9px] uppercase tracking-wider text-slate-500 font-medium">KB Hit Rate</p>
            <p className={`text-2xl font-bold mt-1 ${telemetry.kbHitRate > 20 ? "text-emerald-600" : "text-slate-400"}`}>
              {telemetry.kbHitRate}%
            </p>
            <p className="text-[9px] text-slate-400">execuții evitate prin KB</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-[9px] uppercase tracking-wider text-slate-500 font-medium">Cost total</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">${fmt(telemetry.totalCostUSD)}</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-[9px] uppercase tracking-wider text-slate-500 font-medium">Artefacte create</p>
            <p className="text-2xl font-bold text-violet-600 mt-1">{learning.createdLast7Days}</p>
            <p className="text-[9px] text-slate-400">din {learning.totalArtifacts} total</p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-[9px] uppercase tracking-wider text-slate-500 font-medium mb-2">Eficiență threshold</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${telemetry.thresholdEfficiency > 60 ? "bg-emerald-500" : "bg-amber-400"}`}
                style={{ width: `${telemetry.thresholdEfficiency}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-slate-700">{telemetry.thresholdEfficiency}%</span>
            <span className="text-[9px] text-slate-400">cron runs utile</span>
          </div>
        </div>
      </section>
    )
  } catch {
    return null
  }
}

// ── Componente auxiliare ─────────────────────────────────────────────────────

const STATUS_DOT: Record<string, string> = {
  HEALTHY: "bg-emerald-500",
  WARNING: "bg-amber-400",
  CRITICAL: "bg-red-500 animate-pulse",
}

const STATUS_BORDER: Record<string, string> = {
  HEALTHY: "border-emerald-500/30",
  WARNING: "border-amber-400/40",
  CRITICAL: "border-red-500/40",
}

const STATUS_BG: Record<string, string> = {
  HEALTHY: "bg-white",
  WARNING: "bg-amber-50/50",
  CRITICAL: "bg-red-50/50",
}

async function OwnerTasksSection() {
  try {
    const { prisma } = await import("@/lib/prisma")
    const tasks = await prisma.agentTask.findMany({
      where: { assignedBy: { in: ["claude", "owner", "OWNER"] } },
      select: { id: true, title: true, assignedTo: true, status: true, priority: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    })

    const active = tasks.filter(t => t.status !== "COMPLETED")
    const completed = tasks.filter(t => t.status === "COMPLETED")

    if (tasks.length === 0) return null

    const STATUS_DOT_TASK: Record<string, string> = {
      ASSIGNED: "bg-amber-400",
      ACCEPTED: "bg-indigo-400",
      IN_PROGRESS: "bg-indigo-500 animate-pulse",
      COMPLETED: "bg-emerald-500",
      BLOCKED: "bg-red-400",
      FAILED: "bg-red-500",
    }

    return (
      <div className="bg-white rounded-2xl border border-slate-200" style={{ padding: "28px" }}>
        <p className="text-[10px] text-amber-700 font-bold uppercase tracking-wide">Task-uri alocate de tine</p>
        <div style={{ height: "16px" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {active.map(t => (
            <div key={t.id} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/50" style={{ padding: "12px" }}>
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_DOT_TASK[t.status] || "bg-slate-300"}`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-800 truncate">{t.title}</p>
                <p className="text-[9px] text-slate-400">{t.assignedTo} · {t.status}</p>
              </div>
              {t.priority === "CRITICAL" && <span className="text-[9px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">CRITIC</span>}
            </div>
          ))}
          {completed.length > 0 && (
            <p className="text-[9px] text-emerald-500 text-center">+ {completed.length} realizate</p>
          )}
        </div>
      </div>
    )
  } catch {
    return null
  }
}

function LayerCard({ layer, icon }: { layer: LayerStatus; icon: string }) {
  return (
    <div className={`rounded-xl border ${STATUS_BORDER[layer.status]} ${STATUS_BG[layer.status]} p-3.5 shadow-sm hover:shadow-md transition-shadow cursor-pointer`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-[10px] font-bold text-indigo bg-indigo/10 rounded px-1.5 py-0.5 uppercase tracking-wider">
          {icon}
        </span>
        <span className="text-xs font-semibold text-slate-800 flex-1 truncate">{layer.label}</span>
        <span className={`w-2 h-2 rounded-full ${STATUS_DOT[layer.status]}`} />
      </div>

      {/* Sub-factors */}
      <div className="space-y-1">
        {layer.subFactors.map((sf, i) => (
          <div key={i} className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500 truncate">{sf.name}</span>
            <span className={`font-mono font-medium ${
              sf.status === "CRITICAL" ? "text-red-600" :
              sf.status === "WARNING" ? "text-amber-600" :
              "text-slate-700"
            }`}>{sf.value}</span>
          </div>
        ))}
      </div>

      {/* Alarms badge */}
      {layer.alarmCount > 0 && (
        <div className="mt-2 text-[10px] text-red-500 bg-red-50 rounded px-2 py-1 truncate">
          {layer.alarms[0]?.message}
        </div>
      )}
    </div>
  )
}

const SEV_COLORS: Record<string, string> = {
  CRITICAL: "border-l-red-500 bg-red-50",
  HIGH: "border-l-coral bg-orange-50",
  MEDIUM: "border-l-amber-400 bg-amber-50/50",
  LOW: "border-l-slate-300 bg-white",
}

const SEV_BADGE: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-700",
  HIGH: "bg-orange-100 text-orange-700",
  MEDIUM: "bg-amber-100 text-amber-700",
  LOW: "bg-slate-100 text-slate-600",
}

function DecisionCard({ decision }: { decision: DecisionItem }) {
  const d = decision
  return (
    <div className={`rounded-xl border-l-4 border border-border ${SEV_COLORS[d.severity]} p-4`}>
      {/* Title row */}
      <div className="flex items-start gap-2 mb-2">
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${SEV_BADGE[d.severity]} uppercase`}>
          {d.severity}
        </span>
        <h3 className="text-sm font-semibold text-foreground flex-1 leading-tight">{d.title}</h3>
        <span className="text-[10px] text-text-secondary font-mono shrink-0">{d.eventCount}ev</span>
      </div>

      {/* Cause */}
      <p className="text-xs text-text-secondary mb-3 leading-relaxed">{d.cause}</p>

      {/* Causality chain */}
      <div className="flex flex-wrap items-center gap-1.5 text-[10px] mb-3">
        {/* Roles */}
        {d.affectedRoles.length > 0 && (
          <>
            <span className="text-text-secondary/50 uppercase font-bold tracking-wider">Roluri</span>
            {d.affectedRoles.map(r => (
              <span key={r} className="bg-indigo/10 text-indigo border border-indigo/20 rounded px-1.5 py-0.5 font-mono">{r}</span>
            ))}
          </>
        )}

        {/* Arrow */}
        {d.affectedFluxes.length > 0 && (
          <>
            <span className="text-text-secondary/30 mx-0.5">→</span>
            <span className="text-text-secondary/50 uppercase font-bold tracking-wider">Fluxuri</span>
            {d.affectedFluxes.map(f => (
              <span key={f.fluxId} className="bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded px-1.5 py-0.5 font-mono">
                {f.fluxId.replace("FLUX-", "F")}
                {f.criticalSteps > 0 && <span className="text-red-400 ml-0.5">({f.criticalSteps}c)</span>}
              </span>
            ))}
          </>
        )}

        {/* Arrow */}
        {d.impactedObjectives.length > 0 && (
          <>
            <span className="text-text-secondary/30 mx-0.5">→</span>
            <span className="text-text-secondary/50 uppercase font-bold tracking-wider">Obiective</span>
            {d.impactedObjectives.slice(0, 4).map(o => (
              <span key={o.code} className={`border rounded px-1.5 py-0.5 font-mono ${
                o.riskLevel === "CRITICAL" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                o.riskLevel === "HIGH" ? "bg-coral/10 text-coral border-coral/20" :
                "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              }`}>
                {o.code}
                {o.healthScore !== null && <span className="ml-0.5 opacity-70">{o.healthScore}hp</span>}
              </span>
            ))}
            {d.impactedObjectives.length > 4 && (
              <span className="text-text-secondary/40">+{d.impactedObjectives.length - 4}</span>
            )}
          </>
        )}
      </div>

      {/* Action required */}
      <div className="text-xs text-foreground/80 bg-surface/50 border border-border rounded-lg px-3 py-2 mb-3">
        <span className="font-semibold text-text-secondary mr-1">Context:</span>
        {d.actionRequired}
      </div>

      {/* Decision options — interactive */}
      {d.options && d.options.length > 0 && (
        <DecisionButtons
          situationId={d.situationId}
          options={d.options}
          affectedRoles={d.affectedRoles}
          eventIds={d.eventIds ?? []}
        />
      )}

      {/* Escalation paths — per rol */}
      {d.escalationPaths && d.escalationPaths.some((p: { chain: string[] }) => p.chain.length > 0) && (
        <div className="mt-2 space-y-0.5">
          {d.escalationPaths.map((p: { role: string; chain: string[] }) => p.chain.length > 0 && (
            <div key={p.role} className="text-[10px] text-text-secondary/40">
              {p.role} → {p.chain.join(" → ")}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MiniStat({ label, value, accent }: { label: string; value: number; accent: "coral" | "indigo" | "slate" }) {
  const colors = { coral: "text-coral", indigo: "text-indigo", slate: "text-text-secondary" }
  return (
    <div className="rounded-xl border border-border bg-surface p-3 text-center">
      <p className={`text-xl font-bold ${colors[accent]}`}>{value}</p>
      <p className="text-[10px] text-text-secondary uppercase tracking-wider mt-0.5">{label}</p>
    </div>
  )
}

function ReportLink({ href, title, description, icon }: { href: string; title: string; description: string; icon: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-border bg-surface p-5 hover:border-indigo/20 hover:shadow-md transition-all group block"
    >
      <div className="flex items-start gap-3">
        <span className="text-xl">{icon}</span>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground mb-1 group-hover:text-indigo transition-colors">{title}</h3>
          <p className="text-xs text-text-secondary leading-relaxed">{description}</p>
        </div>
        <span className="text-text-secondary/30 group-hover:translate-x-1 transition-transform mt-1">→</span>
      </div>
    </Link>
  )
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="text-sm text-indigo bg-indigo/5 border border-indigo/10 rounded-lg px-4 py-2 hover:bg-indigo/10 hover:border-indigo/20 transition-all"
    >
      {label}
    </Link>
  )
}
