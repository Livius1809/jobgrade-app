/**
 * daily-report.ts — Raport zilnic evoluție agenți
 *
 * Agregă toate datele din ultimele 24h:
 * - KB: entries adăugate, propagate, per agent
 * - Metrici: performance scores, trend
 * - Brainstorming: sesiuni, idei, propuneri
 * - Cicluri proactive: acțiuni, escaladări
 * - Reflecții: insights, auto-acțiuni
 * - Sentinel: semnale detectate
 * - Cross-pollination: connections create
 * - Propuneri: create, review, aprobate, executate
 *
 * Output: raport structurat + notificare Owner
 */

import type { PrismaClient } from "@/generated/prisma"
import { notifyProposalForOwner } from "./owner-notify"

const NTFY_URL = process.env.NTFY_URL || "https://ntfy.sh"

export interface DailyReport {
  date: string
  period: { from: string; to: string }

  // KB Evolution
  kb: {
    totalEntries: number
    addedToday: number
    propagatedToday: number
    topGrowthAgents: Array<{ role: string; added: number }>
    totalAgentsWithKB: number
  }

  // Agent Performance
  performance: {
    avgScore: number
    topPerformers: Array<{ role: string; score: number }>
    underPerformers: Array<{ role: string; score: number }>
    agentsEvaluated: number
  }

  // Brainstorming
  brainstorming: {
    sessionsToday: number
    ideasGenerated: number
    topIdea: { title: string; score: number; by: string } | null
    proposalsGenerated: number
  }

  // Proactive Cycles
  cycles: {
    cyclesRun: number
    interventions: number
    escalations: number
    resolved: number
  }

  // Reflections & Sentinel
  intelligence: {
    reflectionInsights: number
    sentinelSignals: number
    sentinelAlerts: number
    crossPollinationInsights: number
  }

  // Proposals Pipeline
  proposals: {
    created: number
    cogReviewed: number
    ownerPending: number
    approved: number
    executed: number
    rejected: number
  }

  // Org Structure
  orgStructure: {
    totalAgents: number
    activeAgents: number
    managers: number
    newAgentsToday: number
  }

  // Summary (AI-generated)
  summary: string
  actionItems: string[]
}

export async function generateDailyReport(prisma: PrismaClient): Promise<DailyReport> {
  const p = prisma as any
  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  // ── KB Evolution ───────────────────────────────────────────────────────────
  const totalKB = await p.kBEntry.count({ where: { status: "PERMANENT" } })
  const addedToday = await p.kBEntry.count({
    where: { createdAt: { gte: yesterday } },
  })
  const propagatedToday = await p.kBEntry.count({
    where: { source: "PROPAGATED", createdAt: { gte: yesterday } },
  })

  const kbGrowthByAgent = await p.kBEntry.groupBy({
    by: ["agentRole"],
    where: { createdAt: { gte: yesterday } },
    _count: true,
    orderBy: { _count: { agentRole: "desc" } },
    take: 5,
  })

  const agentsWithKB = await p.kBEntry.groupBy({
    by: ["agentRole"],
    where: { status: "PERMANENT" },
  })

  // ── Performance ────────────────────────────────────────────────────────────
  const latestMetrics = await p.agentMetric.findMany({
    orderBy: { periodEnd: "desc" },
    distinct: ["agentRole"],
  })

  const scores = latestMetrics
    .filter((m: any) => m.performanceScore !== null)
    .map((m: any) => ({ role: m.agentRole, score: m.performanceScore }))
    .sort((a: any, b: any) => b.score - a.score)

  const avgScore = scores.length > 0
    ? Math.round(scores.reduce((s: number, m: any) => s + m.score, 0) / scores.length)
    : 0

  // ── Brainstorming ──────────────────────────────────────────────────────────
  const sessionsToday = await p.brainstormSession.count({
    where: { createdAt: { gte: yesterday } },
  })
  const ideasToday = await p.brainstormIdea.count({
    where: { createdAt: { gte: yesterday } },
  })
  const topIdea = await p.brainstormIdea.findFirst({
    where: { createdAt: { gte: yesterday }, compositeScore: { not: null } },
    orderBy: { compositeScore: "desc" },
    select: { title: true, compositeScore: true, generatedBy: true },
  })

  // ── Cycles ─────────────────────────────────────────────────────────────────
  const cyclesRun = await p.cycleLog.count({ where: { createdAt: { gte: yesterday } } })
  const interventions = await p.cycleLog.count({
    where: { actionType: "INTERVENE", createdAt: { gte: yesterday } },
  })
  const escalationsToday = await p.escalation.count({
    where: { createdAt: { gte: yesterday } },
  })
  const resolvedToday = await p.cycleLog.count({
    where: { resolved: true, resolvedAt: { gte: yesterday } },
  })

  // ── Intelligence ───────────────────────────────────────────────────────────
  const reflectionKB = await p.kBEntry.count({
    where: { tags: { has: "reflection" }, createdAt: { gte: yesterday } },
  })
  const sentinelKB = await p.kBEntry.count({
    where: { tags: { has: "intuition" }, createdAt: { gte: yesterday } },
  })
  const sentinelAlerts = await p.kBEntry.count({
    where: { tags: { hasSome: ["alert"] }, createdAt: { gte: yesterday } },
  })
  const crossPollKB = await p.kBEntry.count({
    where: { tags: { has: "cross-pollination" }, createdAt: { gte: yesterday } },
  })

  // ── Proposals ──────────────────────────────────────────────────────────────
  const proposalsCreated = await p.orgProposal.count({ where: { createdAt: { gte: yesterday } } })
  const proposalsCogReviewed = await p.orgProposal.count({
    where: { status: "COG_REVIEWED", updatedAt: { gte: yesterday } },
  })
  const proposalsOwnerPending = await p.orgProposal.count({
    where: { status: { in: ["COG_REVIEWED", "OWNER_PENDING"] }, ownerDecision: null },
  })
  const proposalsDeferred = await p.orgProposal.count({
    where: { ownerDecision: "DEFERRED" },
  })
  const proposalsApproved = await p.orgProposal.count({
    where: { status: "APPROVED", updatedAt: { gte: yesterday } },
  })
  const proposalsExecuted = await p.orgProposal.count({
    where: { status: "EXECUTED", executedAt: { gte: yesterday } },
  })
  const proposalsRejected = await p.orgProposal.count({
    where: { status: "REJECTED", updatedAt: { gte: yesterday } },
  })

  // ── Org Structure ──────────────────────────────────────────────────────────
  const totalAgents = await p.agentDefinition.count()
  const activeAgents = await p.agentDefinition.count({ where: { isActive: true } })
  const managers = await p.agentDefinition.count({ where: { isManager: true, isActive: true } })
  const newAgents = await p.agentDefinition.count({ where: { createdAt: { gte: yesterday } } })

  // ── Build summary ──────────────────────────────────────────────────────────
  const actionItems: string[] = []
  if (proposalsOwnerPending > 0) actionItems.push(`${proposalsOwnerPending} propuneri așteaptă decizia Owner`)
  if (proposalsDeferred > 0) actionItems.push(`${proposalsDeferred} propuneri amânate (DEFERRED — revenim după plan marketing)`)
  if (sentinelAlerts > 0) actionItems.push(`${sentinelAlerts} alerte sentinel necesită atenție`)
  if (scores.filter((s: any) => s.score < 30).length > 0) actionItems.push(`${scores.filter((s: any) => s.score < 30).length} agenți cu performanță critică (<30)`)

  const summary = [
    `Echipa: ${activeAgents} agenți activi (${managers} manageri).`,
    `KB: ${totalKB} total (+${addedToday} azi, ${propagatedToday} propagate).`,
    `Performanță medie: ${avgScore}/100.`,
    addedToday > 0 ? `Învățare activă: ${addedToday} entries noi.` : "Fără KB growth azi.",
    sessionsToday > 0 ? `Brainstorming: ${sessionsToday} sesiuni, ${ideasToday} idei.` : "",
    escalationsToday > 0 ? `Escaladări: ${escalationsToday} noi, ${resolvedToday} rezolvate.` : "Fără escaladări.",
    actionItems.length > 0 ? `⚠ ${actionItems.length} acțiuni necesare.` : "✅ Fără acțiuni urgente.",
  ].filter(Boolean).join(" ")

  return {
    date: now.toISOString().split("T")[0],
    period: { from: yesterday.toISOString(), to: now.toISOString() },
    kb: {
      totalEntries: totalKB,
      addedToday,
      propagatedToday,
      topGrowthAgents: kbGrowthByAgent.map((g: any) => ({ role: g.agentRole, added: g._count })),
      totalAgentsWithKB: agentsWithKB.length,
    },
    performance: {
      avgScore,
      topPerformers: scores.slice(0, 5),
      underPerformers: scores.slice(-3).reverse(),
      agentsEvaluated: scores.length,
    },
    brainstorming: {
      sessionsToday,
      ideasGenerated: ideasToday,
      topIdea: topIdea ? { title: topIdea.title, score: topIdea.compositeScore, by: topIdea.generatedBy } : null,
      proposalsGenerated: proposalsCreated,
    },
    cycles: { cyclesRun, interventions, escalations: escalationsToday, resolved: resolvedToday },
    intelligence: {
      reflectionInsights: reflectionKB,
      sentinelSignals: sentinelKB,
      sentinelAlerts,
      crossPollinationInsights: crossPollKB,
    },
    proposals: {
      created: proposalsCreated,
      cogReviewed: proposalsCogReviewed,
      ownerPending: proposalsOwnerPending,
      deferred: proposalsDeferred,
      approved: proposalsApproved,
      executed: proposalsExecuted,
      rejected: proposalsRejected,
    },
    orgStructure: { totalAgents, activeAgents, managers, newAgentsToday: newAgents },
    summary,
    actionItems,
  }
}

/**
 * Format report for ntfy notification (concise).
 */
export function formatReportForNotification(report: DailyReport): string {
  return [
    `📊 Raport zilnic ${report.date}`,
    `Echipa: ${report.orgStructure.activeAgents} agenți | KB: +${report.kb.addedToday} entries | Performanță: ${report.performance.avgScore}/100`,
    report.brainstorming.sessionsToday > 0 ? `💡 ${report.brainstorming.ideasGenerated} idei din ${report.brainstorming.sessionsToday} brainstorm-uri` : "",
    report.intelligence.sentinelAlerts > 0 ? `⚠️ ${report.intelligence.sentinelAlerts} alerte sentinel` : "",
    report.proposals.ownerPending > 0 ? `📋 ${report.proposals.ownerPending} propuneri așteaptă decizia ta` : "",
    report.actionItems.length > 0 ? `\nAcțiuni: ${report.actionItems.join("; ")}` : "✅ Fără acțiuni urgente",
  ].filter(Boolean).join("\n")
}
