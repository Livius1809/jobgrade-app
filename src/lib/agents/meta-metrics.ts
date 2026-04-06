import { prisma } from "@/lib/prisma"

/**
 * Meta-metrici — măsoară calitatea adaptării organismului ca întreg.
 *
 * Nu sunt metrici ale componentelor (alea sunt AgentMetric),
 * ci metrici ale RELAȚIEI dintre componente și mediu.
 *
 * 7 dimensiuni:
 * 1. Sensing Freshness — cât de proaspete sunt datele din mediu
 * 2. Response Latency — cât de repede reacționează la semnale
 * 3. Knowledge Density — cât de compactă e cunoașterea acumulată
 * 4. Cross-pollination Index — cât de conectate sunt domeniile
 * 5. Outcome Achievement Rate — câte obiective sunt pe target
 * 6. Self-healing Rate — câte disfuncții se rezolvă automat
 * 7. Resource Efficiency — raport output/input pe resurse consumate
 */

export interface MetaMetricsSnapshot {
  timestamp: string
  dimensions: {
    sensingFreshness: MetricValue
    responseLatency: MetricValue
    knowledgeDensity: MetricValue
    crossPollinationIndex: MetricValue
    outcomeAchievementRate: MetricValue
    selfHealingRate: MetricValue
    resourceEfficiency: MetricValue
  }
  overallHealth: number // 0-100
  trend: "IMPROVING" | "STABLE" | "DECLINING"
}

interface MetricValue {
  value: number
  unit: string
  status: "HEALTHY" | "WARNING" | "CRITICAL"
  detail: string
}

export async function computeMetaMetrics(): Promise<MetaMetricsSnapshot> {
  const p = prisma as any
  const now = new Date()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  // 1. Sensing Freshness — most recent external signal age in hours
  const [latestSignal] = await p.$queryRaw`
    SELECT MAX("createdAt") as latest FROM external_signals
  ` as [{ latest: Date | null }]
  const signalAgeHours = latestSignal.latest
    ? (now.getTime() - new Date(latestSignal.latest).getTime()) / (1000 * 60 * 60)
    : 999
  const sensingFreshness: MetricValue = {
    value: Math.round(signalAgeHours * 10) / 10,
    unit: "hours since last signal",
    status: signalAgeHours < 12 ? "HEALTHY" : signalAgeHours < 24 ? "WARNING" : "CRITICAL",
    detail: latestSignal.latest
      ? `Ultimul semnal: ${new Date(latestSignal.latest).toISOString()}`
      : "Niciun semnal extern",
  }

  // 2. Response Latency — avg time from disfunction detect to remediate (last 7 days)
  const [latency] = await p.$queryRaw`
    SELECT AVG(EXTRACT(EPOCH FROM ("resolvedAt" - "detectedAt")) / 60) as avg_min
    FROM disfunction_events
    WHERE status = 'RESOLVED' AND "resolvedAt" > ${sevenDaysAgo}
  ` as [{ avg_min: number | null }]
  const avgLatencyMin = latency.avg_min ?? 0
  const responseLatency: MetricValue = {
    value: Math.round(avgLatencyMin),
    unit: "minutes avg resolution",
    status: avgLatencyMin < 30 ? "HEALTHY" : avgLatencyMin < 120 ? "WARNING" : "CRITICAL",
    detail: `Media pe 7 zile: ${Math.round(avgLatencyMin)} min`,
  }

  // 3. Knowledge Density — KB entries per agent (avg), plus embedding coverage
  const [kbStats] = await p.$queryRaw`
    SELECT count(*) as total,
           count(DISTINCT "agentRole") as agents,
           count(embedding) as with_emb
    FROM kb_entries WHERE status = 'PERMANENT'::"KBStatus"
  ` as [{ total: bigint; agents: bigint; with_emb: bigint }]
  const entriesPerAgent = Number(kbStats.agents) > 0
    ? Number(kbStats.total) / Number(kbStats.agents)
    : 0
  const embCoverage = Number(kbStats.total) > 0
    ? Number(kbStats.with_emb) / Number(kbStats.total)
    : 0
  const knowledgeDensity: MetricValue = {
    value: Math.round(entriesPerAgent),
    unit: `entries/agent (${(embCoverage * 100).toFixed(0)}% embedded)`,
    status: entriesPerAgent > 50 ? "HEALTHY" : entriesPerAgent > 20 ? "WARNING" : "CRITICAL",
    detail: `${Number(kbStats.total)} total, ${Number(kbStats.agents)} agents, ${(embCoverage * 100).toFixed(0)}% embeddings`,
  }

  // 4. Cross-pollination Index — KB entries with propagatedFrom (shared knowledge)
  const [propagated] = await p.$queryRaw`
    SELECT count(*) as c FROM kb_entries
    WHERE "propagatedFrom" IS NOT NULL AND status = 'PERMANENT'::"KBStatus"
  ` as [{ c: bigint }]
  const propRate = Number(kbStats.total) > 0
    ? Number(propagated.c) / Number(kbStats.total)
    : 0
  const crossPollinationIndex: MetricValue = {
    value: Math.round(propRate * 100),
    unit: "% cross-pollinated",
    status: propRate > 0.15 ? "HEALTHY" : propRate > 0.05 ? "WARNING" : "CRITICAL",
    detail: `${Number(propagated.c)} entries propagate din ${Number(kbStats.total)} total`,
  }

  // 5. Outcome Achievement Rate
  const outcomes = await p.serviceOutcome.findMany({
    where: { isActive: true },
    select: { currentValue: true, targetValue: true },
  })
  const onTarget = outcomes.filter(
    (o: any) => o.currentValue != null && o.targetValue != null && o.currentValue >= o.targetValue
  ).length
  const achievementRate = outcomes.length > 0 ? onTarget / outcomes.length : 0
  const outcomeAchievementRate: MetricValue = {
    value: Math.round(achievementRate * 100),
    unit: "% on target",
    status: achievementRate > 0.7 ? "HEALTHY" : achievementRate > 0.4 ? "WARNING" : "CRITICAL",
    detail: `${onTarget}/${outcomes.length} outcomes on target`,
  }

  // 6. Self-healing Rate — auto-resolved / total resolved (last 7 days)
  const [healing] = await p.$queryRaw`
    SELECT
      count(*) FILTER (WHERE "remediationOk" = true) as auto_resolved,
      count(*) as total_resolved
    FROM disfunction_events
    WHERE status = 'RESOLVED' AND "resolvedAt" > ${sevenDaysAgo}
  ` as [{ auto_resolved: bigint; total_resolved: bigint }]
  const healingRate = Number(healing.total_resolved) > 0
    ? Number(healing.auto_resolved) / Number(healing.total_resolved)
    : 1 // no events = healthy
  const selfHealingRate: MetricValue = {
    value: Math.round(healingRate * 100),
    unit: "% auto-resolved",
    status: healingRate > 0.6 ? "HEALTHY" : healingRate > 0.3 ? "WARNING" : "CRITICAL",
    detail: `${Number(healing.auto_resolved)}/${Number(healing.total_resolved)} auto-remediate (7 zile)`,
  }

  // 7. Resource Efficiency — cycles with actual actions vs total cycles (last 7 days)
  const [cycles] = await p.$queryRaw`
    SELECT count(*) as total,
           count(*) FILTER (WHERE description NOT LIKE '%skip%' AND description NOT LIKE '%no action%') as productive
    FROM cycle_logs
    WHERE "createdAt" > ${sevenDaysAgo}
  ` as [{ total: bigint; productive: bigint }]
  const efficiency = Number(cycles.total) > 0
    ? Number(cycles.productive) / Number(cycles.total)
    : 0
  const resourceEfficiency: MetricValue = {
    value: Math.round(efficiency * 100),
    unit: "% productive cycles",
    status: efficiency > 0.5 ? "HEALTHY" : efficiency > 0.2 ? "WARNING" : "CRITICAL",
    detail: `${Number(cycles.productive)}/${Number(cycles.total)} cicluri productive (7 zile)`,
  }

  // Overall health — weighted average
  const statusScore = (s: string) => s === "HEALTHY" ? 100 : s === "WARNING" ? 50 : 0
  const dimensions = [
    sensingFreshness, responseLatency, knowledgeDensity,
    crossPollinationIndex, outcomeAchievementRate, selfHealingRate, resourceEfficiency,
  ]
  const overallHealth = Math.round(
    dimensions.reduce((sum, d) => sum + statusScore(d.status), 0) / dimensions.length
  )

  // Trend — compare with 7-day window (simplified: based on current metrics)
  const healthyCount = dimensions.filter(d => d.status === "HEALTHY").length
  const trend = healthyCount >= 5 ? "IMPROVING" : healthyCount >= 3 ? "STABLE" : "DECLINING"

  return {
    timestamp: now.toISOString(),
    dimensions: {
      sensingFreshness,
      responseLatency,
      knowledgeDensity,
      crossPollinationIndex,
      outcomeAchievementRate,
      selfHealingRate,
      resourceEfficiency,
    },
    overallHealth,
    trend,
  }
}
