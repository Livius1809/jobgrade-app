/**
 * cross-pollination.ts — "Cafea virtuală" între agenți din departamente diferite
 *
 * Simulează serendipitatea: perechi aleatoriu 2 agenți care nu comunică
 * normal, le pune un topic de conectare, și extrage insight-uri cross-domain.
 *
 * Cost: ~2 apeluri Claude per pereche
 * Frecvență: zilnic, 2-3 perechi (cron 04:00, după reflecție)
 * Extensibil: poate deveni trigger reflexiv când un agent primește KB nou.
 */

import Anthropic from "@anthropic-ai/sdk"
import type { PrismaClient } from "@/generated/prisma"
import { buildAgentPrompt } from "./agent-prompt-builder"

const MODEL = "claude-sonnet-4-20250514"

export interface CrossPollinationResult {
  agentA: string
  agentB: string
  topic: string
  insights: Array<{
    content: string
    relevantTo: string  // which agent benefits
    tags: string[]
  }>
  kbEntriesAdded: number
  durationMs: number
}

// ── Select random pairs from different departments ───────────────────────────

async function selectPairs(
  prisma: PrismaClient,
  count: number = 3
): Promise<Array<{ a: any; b: any }>> {
  const p = prisma as any

  // Get all active agents with their parent (department proxy)
  const agents = await p.agentDefinition.findMany({
    where: { isActive: true },
    select: { agentRole: true, displayName: true, description: true },
  })

  const relationships = await p.agentRelationship.findMany({
    where: { isActive: true, relationType: "REPORTS_TO" },
    select: { childRole: true, parentRole: true },
  })

  const parentMap = new Map<string, string>(relationships.map((r: any) => [r.childRole, r.parentRole]))

  // Group by parent (department)
  const departments = new Map<string, any[]>()
  for (const agent of agents) {
    const parent = parentMap.get(agent.agentRole) || "ROOT"
    const dept = departments.get(parent) || []
    dept.push(agent)
    departments.set(parent, dept)
  }

  const deptKeys = [...departments.keys()]
  if (deptKeys.length < 2) return []

  // Generate random cross-department pairs
  const pairs: Array<{ a: any; b: any }> = []
  const used = new Set<string>()

  for (let attempt = 0; attempt < count * 5 && pairs.length < count; attempt++) {
    const deptA = deptKeys[Math.floor(Math.random() * deptKeys.length)]
    const deptB = deptKeys[Math.floor(Math.random() * deptKeys.length)]
    if (deptA === deptB) continue

    const agentsA = departments.get(deptA)!
    const agentsB = departments.get(deptB)!
    const a = agentsA[Math.floor(Math.random() * agentsA.length)]
    const b = agentsB[Math.floor(Math.random() * agentsB.length)]

    const pairKey = [a.agentRole, b.agentRole].sort().join("-")
    if (used.has(pairKey)) continue
    used.add(pairKey)

    pairs.push({ a, b })
  }

  return pairs
}

// ── Run single cross-pollination ─────────────────────────────────────────────

async function pollinatePair(
  a: any,
  b: any,
  prisma: PrismaClient
): Promise<CrossPollinationResult> {
  const start = Date.now()
  const p = prisma as any
  const client = new Anthropic()

  // Get top KB entries for each agent
  const kbA = await p.kBEntry.findMany({
    where: { agentRole: a.agentRole, status: "PERMANENT" },
    orderBy: { confidence: "desc" },
    take: 3,
    select: { content: true },
  })

  const kbB = await p.kBEntry.findMany({
    where: { agentRole: b.agentRole, status: "PERMANENT" },
    orderBy: { confidence: "desc" },
    take: 3,
    select: { content: true },
  })

  const topic = `Întâlnire cross-domain: ${a.displayName} × ${b.displayName}`

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: buildAgentPrompt(a.agentRole, a.description),
      messages: [{
        role: "user",
        content: `Simulează o "cafea virtuală" între tine și un coleg din alt departament.

AGENT A: ${a.displayName} (${a.description})
Top cunoștințe A:
${kbA.map((e: any) => "- " + e.content.substring(0, 120)).join("\n") || "- KB gol"}

AGENT B: ${b.displayName} (${b.description})
Top cunoștințe B:
${kbB.map((e: any) => "- " + e.content.substring(0, 120)).join("\n") || "- KB gol"}

Identifică 2-3 conexiuni NEAȘTEPTATE între domeniile lor care ar putea genera valoare:
- Ce știe A care l-ar ajuta pe B?
- Ce știe B care l-ar ajuta pe A?
- Ce idee nouă apare din combinarea perspectivelor?

Răspunde STRICT JSON:
[
  {
    "content": "Insight concret și acționabil (2-3 propoziții)",
    "relevantTo": "${a.agentRole}|${b.agentRole}",
    "tags": ["tag1", "tag2"]
  }
]

Doar insight-uri cu valoare reală, nu generalități.`,
      }],
    })

    const text = response.content[0].type === "text" ? response.content[0].text : "[]"
    const match = text.match(/\[[\s\S]*\]/)
    const insights: any[] = match ? JSON.parse(match[0]) : []

    // Store insights as KB entries
    let kbEntriesAdded = 0
    for (const insight of insights) {
      try {
        await p.kBEntry.create({
          data: {
            agentRole: insight.relevantTo,
            kbType: "SHARED_DOMAIN",
            content: `[Cross-pollination cu ${insight.relevantTo === a.agentRole ? b.agentRole : a.agentRole}] ${insight.content}`,
            source: "DISTILLED_INTERACTION",
            confidence: 0.55, // lower than direct experience, higher than cold start
            status: "PERMANENT",
            tags: [...(insight.tags || []), "cross-pollination", "serendipity"],
            usageCount: 0,
            validatedAt: new Date(),
          },
        })
        kbEntriesAdded++
      } catch { /* duplicate */ }
    }

    return {
      agentA: a.agentRole,
      agentB: b.agentRole,
      topic,
      insights,
      kbEntriesAdded,
      durationMs: Date.now() - start,
    }
  } catch (e: any) {
    console.warn(`[CROSS-POLLINATION] ${a.agentRole}×${b.agentRole} failed: ${e.message}`)
    return { agentA: a.agentRole, agentB: b.agentRole, topic, insights: [], kbEntriesAdded: 0, durationMs: Date.now() - start }
  }
}

// ── Batch run ────────────────────────────────────────────────────────────────

export async function runCrossPollination(
  prisma: PrismaClient,
  pairCount: number = 3
): Promise<{
  pairs: number
  totalInsights: number
  totalKBEntries: number
  results: CrossPollinationResult[]
}> {
  const pairs = await selectPairs(prisma, pairCount)

  const results: CrossPollinationResult[] = []
  let totalInsights = 0
  let totalKBEntries = 0

  for (const pair of pairs) {
    const result = await pollinatePair(pair.a, pair.b, prisma)
    results.push(result)
    totalInsights += result.insights.length
    totalKBEntries += result.kbEntriesAdded

    // Rate limit
    await new Promise((r) => setTimeout(r, 1500))
  }

  console.log(`[CROSS-POLLINATION] ${pairs.length} pairs, ${totalInsights} insights, ${totalKBEntries} KB entries`)

  return { pairs: pairs.length, totalInsights, totalKBEntries, results }
}
