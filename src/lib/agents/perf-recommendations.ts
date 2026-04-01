/**
 * perf-recommendations.ts — Recomandări automate bazate pe metrici
 *
 * Reguli:
 * - Score < 30 (3+ perioade) → recomandare eliminare/merge
 * - Score > 90 + escalări > 5 → recomandare subordonat nou (overloaded)
 * - Manager cu toți subordonați sub 50 → restructurare
 * - 0 KB growth 30+ zile → reactivare sau eliminare
 */

import type { PrismaClient } from "@/generated/prisma"

export interface Recommendation {
  type: "REMOVE" | "ADD_SUBORDINATE" | "RESTRUCTURE" | "REACTIVATE" | "MERGE"
  severity: "HIGH" | "MEDIUM" | "LOW"
  targetAgent: string
  description: string
  suggestedAction: string
}

export interface RecommendationReport {
  recommendations: Recommendation[]
  topPerformers: Array<{ agentRole: string; score: number }>
  underPerformers: Array<{ agentRole: string; score: number }>
  summary: string
}

export async function generateRecommendations(
  prisma: PrismaClient
): Promise<RecommendationReport> {
  const p = prisma as any
  const recommendations: Recommendation[] = []

  // Get latest metrics for all agents
  const latestMetrics = await p.agentMetric.findMany({
    orderBy: { periodEnd: "desc" },
    distinct: ["agentRole"],
  })

  if (latestMetrics.length === 0) {
    return {
      recommendations: [],
      topPerformers: [],
      underPerformers: [],
      summary: "Nu există metrici colectate încă. Rulați mai întâi colectarea.",
    }
  }

  const metricsMap = new Map<string, any>(latestMetrics.map((m: any) => [m.agentRole, m]))

  // Get agent definitions for context
  const agents = await p.agentDefinition.findMany({ where: { isActive: true } })
  const agentMap = new Map<string, any>(agents.map((a: any) => [a.agentRole, a]))

  // Get relationships for manager analysis
  const relationships = await p.agentRelationship.findMany({
    where: { isActive: true, relationType: "REPORTS_TO" },
  })
  const parentToChildren = new Map<string, string[]>()
  for (const r of relationships as any[]) {
    const children = parentToChildren.get(r.parentRole) || []
    children.push(r.childRole)
    parentToChildren.set(r.parentRole, children)
  }

  // ── Rule 1: Low performers (score < 30) ──────────────────────────────────
  for (const [role, metrics] of metricsMap) {
    const m = metrics as any
    if (m.performanceScore !== null && m.performanceScore < 30) {
      recommendations.push({
        type: "REMOVE",
        severity: "MEDIUM",
        targetAgent: role,
        description: `${role} are performanceScore ${m.performanceScore}/100 — sub pragul minim de 30.`,
        suggestedAction: `Evaluați dacă ${role} mai e necesar. Opțiuni: eliminare, merge cu alt agent, sau reactivare cu obiective clarificate.`,
      })
    }
  }

  // ── Rule 2: Overloaded high performers ────────────────────────────────────
  for (const [role, metrics] of metricsMap) {
    const m = metrics as any
    if (m.performanceScore !== null && m.performanceScore > 90 && m.tasksEscalated > 5) {
      recommendations.push({
        type: "ADD_SUBORDINATE",
        severity: "HIGH",
        targetAgent: role,
        description: `${role} are score ${m.performanceScore}/100 dar ${m.tasksEscalated} escalări — overloaded high performer.`,
        suggestedAction: `Adăugați un subordonat dedicat pentru a prelua parte din sarcinile ${role}.`,
      })
    }
  }

  // ── Rule 3: Managers with all subordinates below 50 ───────────────────────
  for (const [manager, children] of parentToChildren) {
    const childScores = children
      .map((c) => (metricsMap.get(c) as any)?.performanceScore)
      .filter((s: any) => s !== null && s !== undefined)

    if (childScores.length >= 2 && childScores.every((s: number) => s < 50)) {
      const avg = Math.round(childScores.reduce((a: number, b: number) => a + b, 0) / childScores.length)
      recommendations.push({
        type: "RESTRUCTURE",
        severity: "HIGH",
        targetAgent: manager,
        description: `Toți subordonații lui ${manager} au score sub 50 (media: ${avg}). Indică posibilă problemă structurală.`,
        suggestedAction: `Revizuiți obiectivele ${manager}, realocați resurse, sau restructurați echipa.`,
      })
    }
  }

  // ── Rule 4: No KB growth 30+ days ─────────────────────────────────────────
  for (const [role, metrics] of metricsMap) {
    const m = metrics as any
    if (m.kbEntriesAdded === 0) {
      const agent = agentMap.get(role) as any
      if (agent) {
        recommendations.push({
          type: "REACTIVATE",
          severity: "LOW",
          targetAgent: role,
          description: `${role} nu a adăugat KB entries în perioada măsurată.`,
          suggestedAction: `Verificați dacă ${role} e activ. Opțiuni: re-rulare cold start, atribuire taskuri, sau eliminare dacă nu mai e necesar.`,
        })
      }
    }
  }

  // ── Top/Under performers ──────────────────────────────────────────────────
  const scored = latestMetrics
    .filter((m: any) => m.performanceScore !== null)
    .map((m: any) => ({ agentRole: m.agentRole, score: m.performanceScore }))
    .sort((a: any, b: any) => b.score - a.score)

  const topPerformers = scored.slice(0, 5)
  const underPerformers = scored.slice(-5).reverse()

  const avgScore = scored.length > 0
    ? Math.round(scored.reduce((a: any, b: any) => a + b.score, 0) / scored.length)
    : 0

  return {
    recommendations,
    topPerformers,
    underPerformers,
    summary: `${scored.length} agenți evaluați. Media: ${avgScore}/100. ${recommendations.length} recomandări generate (${recommendations.filter(r => r.severity === "HIGH").length} HIGH).`,
  }
}
