/**
 * org-analysis.ts — Motor de analiză organizațională
 *
 * COG folosește acest modul pentru a identifica:
 * 1. Gap-uri: obiective fără agent dedicat
 * 2. Redundanțe: agenți cu atribuții suprapuse
 * 3. Acoperire: agenți inactivi, fără KB, ierarhie prea adâncă
 *
 * Analizele sunt injectate în ciclul proactiv al COG și pot genera
 * propuneri de restructurare (OrgProposal).
 */

import Anthropic from "@anthropic-ai/sdk"
import type { PrismaClient } from "@/generated/prisma"

const MODEL = "claude-sonnet-4-20250514"

// ── Types ────────────────────────────────────────────────────────────────────

export interface GapItem {
  managerRole: string
  objective: string
  severity: "HIGH" | "MEDIUM" | "LOW"
  suggestion: string
}

export interface GapReport {
  uncoveredObjectives: GapItem[]
  suggestedAgents: Array<{
    role: string
    description: string
    parentRole: string
    reason: string
  }>
  analyzedManagers: number
  totalObjectives: number
}

export interface RedundancyItem {
  agentA: string
  agentB: string
  overlapDescription: string
  severity: "HIGH" | "MEDIUM" | "LOW"
  suggestion: string
}

export interface RedundancyReport {
  overlaps: RedundancyItem[]
  pairsAnalyzed: number
}

export interface CoverageReport {
  coveragePercent: number
  agentsWithoutKB: string[]
  agentsIdle: string[]
  agentsBlocked: string[]
  hierarchyDepth: number
  maxDepthAllowed: number
  totalAgents: number
  activeAgents: number
  recommendations: string[]
}

export interface OrgAnalysisReport {
  gaps: GapReport
  redundancies: RedundancyReport
  coverage: CoverageReport
  analyzedAt: string
  durationMs: number
}

// ── Gap Detection ────────────────────────────────────────────────────────────

export async function analyzeGaps(prisma: PrismaClient): Promise<GapReport> {
  // Load managers with objectives
  const managers = await (prisma as any).agentDefinition.findMany({
    where: { isManager: true, isActive: true },
    include: {
      childRelations: {
        where: { isActive: true },
        include: { child: true },
      },
    },
  })

  const allObjectives: Array<{ manager: string; objective: string; subordinates: string[] }> = []

  for (const m of managers) {
    if (!m.objectives?.length) continue
    const subs = m.childRelations.map((r: any) => ({
      role: r.child.agentRole,
      description: r.child.description,
    }))

    for (const obj of m.objectives) {
      allObjectives.push({
        manager: m.agentRole,
        objective: obj,
        subordinates: subs.map((s: any) => `${s.role}: ${s.description}`),
      })
    }
  }

  if (allObjectives.length === 0) {
    return { uncoveredObjectives: [], suggestedAgents: [], analyzedManagers: 0, totalObjectives: 0 }
  }

  // Batch analyze via Claude
  const client = new Anthropic()
  const prompt = `Analizează următoarele obiective ale managerilor și subordonații lor.
Identifică obiective care NU au un agent dedicat care le acoperă direct.

${allObjectives.map((o, i) => `${i + 1}. Manager: ${o.manager}
   Obiectiv: ${o.objective}
   Subordonați: ${o.subordinates.join("; ")}`).join("\n\n")}

Răspunde STRICT în format JSON:
{
  "uncovered": [
    {
      "managerRole": "...",
      "objective": "obiectivul neacoperit",
      "severity": "HIGH|MEDIUM|LOW",
      "suggestion": "ce agent ar trebui creat sau ce reorganizare"
    }
  ],
  "suggestedAgents": [
    {
      "role": "ACRONYM",
      "description": "descriere scurtă",
      "parentRole": "manager care l-ar superviza",
      "reason": "de ce e necesar"
    }
  ]
}

Dacă toate obiectivele sunt acoperite, returnează arrays goale.
Fii conservator — sugerează doar dacă gap-ul e real, nu ipotetic.`

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    })

    const text = response.content[0].type === "text" ? response.content[0].text : ""
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return { uncoveredObjectives: [], suggestedAgents: [], analyzedManagers: managers.length, totalObjectives: allObjectives.length }
    }

    const parsed = JSON.parse(jsonMatch[0])
    return {
      uncoveredObjectives: parsed.uncovered || [],
      suggestedAgents: parsed.suggestedAgents || [],
      analyzedManagers: managers.length,
      totalObjectives: allObjectives.length,
    }
  } catch (e: any) {
    console.error("[ORG-ANALYSIS] Gap analysis error:", e.message)
    return { uncoveredObjectives: [], suggestedAgents: [], analyzedManagers: managers.length, totalObjectives: allObjectives.length }
  }
}

// ── Redundancy Detection ─────────────────────────────────────────────────────

export async function analyzeRedundancies(prisma: PrismaClient): Promise<RedundancyReport> {
  const agents = await (prisma as any).agentDefinition.findMany({
    where: { isActive: true },
    select: { agentRole: true, description: true, objectives: true },
  })

  if (agents.length < 2) {
    return { overlaps: [], pairsAnalyzed: 0 }
  }

  // Group by parent to only compare siblings (agents under same manager)
  const relationships = await (prisma as any).agentRelationship.findMany({
    where: { isActive: true, relationType: "REPORTS_TO" },
  })

  const siblingGroups = new Map<string, string[]>()
  for (const r of relationships) {
    const existing = siblingGroups.get(r.parentRole) || []
    existing.push(r.childRole)
    siblingGroups.set(r.parentRole, existing)
  }

  // Build comparison pairs (only siblings)
  const pairs: Array<{ a: any; b: any }> = []
  const agentMap = new Map<string, any>(agents.map((a: any) => [a.agentRole, a]))

  for (const [, siblings] of siblingGroups) {
    for (let i = 0; i < siblings.length; i++) {
      for (let j = i + 1; j < siblings.length; j++) {
        const a = agentMap.get(siblings[i])
        const b = agentMap.get(siblings[j])
        if (a && b) pairs.push({ a, b })
      }
    }
  }

  if (pairs.length === 0) {
    return { overlaps: [], pairsAnalyzed: 0 }
  }

  // Batch analyze — limit to first 20 pairs to control API cost
  const batchPairs = pairs.slice(0, 20)

  const client = new Anthropic()
  const prompt = `Compară următoarele perechi de agenți (subordonați ai aceluiași manager).
Identifică suprapuneri SEMNIFICATIVE de atribuții.

${batchPairs.map((p, i) => `${i + 1}. ${p.a.agentRole} ("${p.a.description}") vs ${p.b.agentRole} ("${p.b.description}")`).join("\n")}

Răspunde STRICT JSON:
{
  "overlaps": [
    {
      "agentA": "ROLE_A",
      "agentB": "ROLE_B",
      "overlapDescription": "ce se suprapune",
      "severity": "HIGH|MEDIUM|LOW",
      "suggestion": "cum se rezolvă (merge, redelimitare, etc.)"
    }
  ]
}

Raportează doar suprapuneri REALE și semnificative, nu similarități vagi.
Dacă nu există suprapuneri, returnează array gol.`

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    })

    const text = response.content[0].type === "text" ? response.content[0].text : ""
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return { overlaps: [], pairsAnalyzed: batchPairs.length }
    }

    const parsed = JSON.parse(jsonMatch[0])
    return {
      overlaps: parsed.overlaps || [],
      pairsAnalyzed: batchPairs.length,
    }
  } catch (e: any) {
    console.error("[ORG-ANALYSIS] Redundancy analysis error:", e.message)
    return { overlaps: [], pairsAnalyzed: batchPairs.length }
  }
}

// ── Coverage Analysis ────────────────────────────────────────────────────────

export async function analyzeCoverage(prisma: PrismaClient): Promise<CoverageReport> {
  const agents = await (prisma as any).agentDefinition.findMany({
    where: { isActive: true },
  })

  const totalAgents = agents.length
  const agentRoles = agents.map((a: any) => a.agentRole)

  // Check KB entries per agent
  const kbCounts = await (prisma as any).kBEntry.groupBy({
    by: ["agentRole"],
    where: { status: "PERMANENT" },
    _count: true,
  })
  const kbMap = new Map<string, number>(kbCounts.map((k: any) => [k.agentRole, k._count]))

  const agentsWithoutKB = agentRoles.filter((r: string) => !kbMap.has(r) || kbMap.get(r) === 0)

  // Check last activity (KB entries created recently)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const recentActivity = await (prisma as any).kBEntry.groupBy({
    by: ["agentRole"],
    where: { createdAt: { gte: thirtyDaysAgo } },
    _count: true,
  })
  const recentMap = new Map<string, any>(recentActivity.map((r: any) => [r.agentRole, r._count]))
  const agentsIdle = agentRoles.filter(
    (r: string) => kbMap.has(r) && !recentMap.has(r)
  )

  // Check blocked (active escalations about them)
  const blockedEscalations = await (prisma as any).escalation.findMany({
    where: { status: { in: ["OPEN", "TIMEOUT"] } },
    select: { aboutRole: true },
    distinct: ["aboutRole"],
  })
  const agentsBlocked = blockedEscalations.map((e: any) => e.aboutRole)

  // Hierarchy depth (BFS from roots)
  const relationships = await (prisma as any).agentRelationship.findMany({
    where: { isActive: true, relationType: "REPORTS_TO" },
  })
  const childToParent = new Map<string, string>(relationships.map((r: any) => [r.childRole, r.parentRole]))

  let maxDepth = 0
  for (const role of agentRoles) {
    let depth = 0
    let current = role
    const visited = new Set<string>()
    while (childToParent.has(current) && !visited.has(current)) {
      visited.add(current)
      current = childToParent.get(current)!
      depth++
    }
    if (depth > maxDepth) maxDepth = depth
  }

  // Coverage percent: agents with KB / total
  const withKB = agentRoles.filter((r: string) => kbMap.has(r) && kbMap.get(r)! > 0)
  const coveragePercent = Math.round((withKB.length / totalAgents) * 100)

  // Recommendations
  const recommendations: string[] = []
  if (agentsWithoutKB.length > 0)
    recommendations.push(`${agentsWithoutKB.length} agenți fără KB — rulați cold start: ${agentsWithoutKB.join(", ")}`)
  if (agentsIdle.length > 0)
    recommendations.push(`${agentsIdle.length} agenți inactivi 30+ zile: ${agentsIdle.join(", ")}`)
  if (agentsBlocked.length > 0)
    recommendations.push(`${agentsBlocked.length} agenți blocați (escaladări nerezolvate): ${agentsBlocked.join(", ")}`)
  if (maxDepth > 4)
    recommendations.push(`Ierarhie prea adâncă (${maxDepth + 1} niveluri) — maxim recomandat: 5`)
  if (coveragePercent === 100 && agentsBlocked.length === 0 && agentsIdle.length === 0)
    recommendations.push("Toate sistemele funcționale — nu sunt necesare intervenții structurale")

  return {
    coveragePercent,
    agentsWithoutKB,
    agentsIdle,
    agentsBlocked,
    hierarchyDepth: maxDepth + 1, // +1 for OWNER level
    maxDepthAllowed: 5,
    totalAgents,
    activeAgents: withKB.length,
    recommendations,
  }
}

// ── Full Analysis ────────────────────────────────────────────────────────────

export async function runFullAnalysis(prisma: PrismaClient): Promise<OrgAnalysisReport> {
  const start = Date.now()

  // Run coverage first (no API call, fast)
  const coverage = await analyzeCoverage(prisma)

  // Run gaps and redundancies in parallel (both use Claude API)
  const [gaps, redundancies] = await Promise.all([
    analyzeGaps(prisma),
    analyzeRedundancies(prisma),
  ])

  return {
    gaps,
    redundancies,
    coverage,
    analyzedAt: new Date().toISOString(),
    durationMs: Date.now() - start,
  }
}

// ── Summary for COG prompt injection ─────────────────────────────────────────

export function formatAnalysisForPrompt(report: OrgAnalysisReport): string {
  const lines: string[] = ["ORG ANALYSIS (evaluare structură echipă):"]

  // Coverage
  lines.push(`  Acoperire KB: ${report.coverage.coveragePercent}% (${report.coverage.activeAgents}/${report.coverage.totalAgents} agenți)`)
  lines.push(`  Adâncime ierarhie: ${report.coverage.hierarchyDepth}/${report.coverage.maxDepthAllowed} niveluri`)

  if (report.coverage.agentsWithoutKB.length > 0)
    lines.push(`  ⚠ Fără KB: ${report.coverage.agentsWithoutKB.join(", ")}`)
  if (report.coverage.agentsIdle.length > 0)
    lines.push(`  ⚠ Inactivi 30+ zile: ${report.coverage.agentsIdle.join(", ")}`)
  if (report.coverage.agentsBlocked.length > 0)
    lines.push(`  🔴 Blocați: ${report.coverage.agentsBlocked.join(", ")}`)

  // Gaps
  if (report.gaps.uncoveredObjectives.length > 0) {
    lines.push(`  Gap-uri (${report.gaps.uncoveredObjectives.length}):`)
    for (const g of report.gaps.uncoveredObjectives) {
      lines.push(`    - [${g.severity}] ${g.managerRole}: "${g.objective}" → ${g.suggestion}`)
    }
  }

  // Redundancies
  if (report.redundancies.overlaps.length > 0) {
    lines.push(`  Redundanțe (${report.redundancies.overlaps.length}):`)
    for (const r of report.redundancies.overlaps) {
      lines.push(`    - [${r.severity}] ${r.agentA} ↔ ${r.agentB}: ${r.overlapDescription}`)
    }
  }

  // Suggested agents
  if (report.gaps.suggestedAgents.length > 0) {
    lines.push(`  Agenți sugerați:`)
    for (const s of report.gaps.suggestedAgents) {
      lines.push(`    - ${s.role} (sub ${s.parentRole}): ${s.description} — ${s.reason}`)
    }
  }

  if (report.coverage.recommendations.length > 0) {
    lines.push(`  Recomandări:`)
    for (const r of report.coverage.recommendations) {
      lines.push(`    - ${r}`)
    }
  }

  return lines.join("\n")
}
