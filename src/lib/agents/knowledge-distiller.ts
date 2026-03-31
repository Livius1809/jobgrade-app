/**
 * knowledge-distiller.ts — Distilare cunoaștere pe nivel ierarhic
 *
 * Managerul colectează informații de la subordonați → procesează →
 * generează CUNOAȘTERE (puzzle de nivel superior).
 * Piesele componente dispar ca identitate — rămâne doar insight-ul.
 *
 * Apoi puzzle-ul se îmbogățește cu:
 * - Ce primește de la colegi (lateral, același nivel ierarhic)
 * - Ce primește de la superior (nivel ierarhic mai sus)
 *
 * Înlocuiește propagarea directă (care crea duplicate).
 */

import Anthropic from "@anthropic-ai/sdk"
import type { PrismaClient } from "@/generated/prisma"

const MODEL = "claude-sonnet-4-20250514"

export interface DistillationResult {
  managerRole: string
  inputCount: number        // câte informații a colectat
  distilledInsight: string  // puzzle-ul generat
  sourcesAbsorbed: string[] // piesele care au dispărut ca identitate
  enrichedWith: string[]    // colegi/superior care au contribuit
  kbEntryId?: string
  durationMs: number
}

/**
 * Pasul 1: Managerul colectează și distilează informațiile de la subordonați.
 * Informațiile componente dispar ca identitate → devine un singur insight.
 */
async function collectAndDistill(
  managerRole: string,
  prisma: PrismaClient
): Promise<{ insight: string; sources: string[]; inputCount: number } | null> {
  const p = prisma as any
  const client = new Anthropic()

  // Get subordinates
  const rels = await p.agentRelationship.findMany({
    where: { parentRole: managerRole, isActive: true, relationType: "REPORTS_TO" },
    select: { childRole: true },
  })
  const subordinates = rels.map((r: any) => r.childRole)
  if (subordinates.length === 0) return null

  // Collect recent KB entries from subordinates (last 24h, not yet distilled)
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const subEntries = await p.kBEntry.findMany({
    where: {
      agentRole: { in: subordinates },
      status: "PERMANENT",
      createdAt: { gte: since },
      tags: { hasNone: ["distilled-by-manager"] },
    },
    orderBy: { confidence: "desc" },
    take: 20,
    select: { id: true, agentRole: true, content: true, tags: true },
  })

  if (subEntries.length === 0) return null

  // Get manager's description for context
  const manager = await p.agentDefinition.findUnique({
    where: { agentRole: managerRole },
    select: { displayName: true, description: true },
  })

  // Distill via Claude
  const inputText = subEntries
    .map((e: any) => `[${e.agentRole}] ${e.content.substring(0, 200)}`)
    .join("\n")

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 800,
    messages: [{
      role: "user",
      content: `Ești ${manager?.displayName || managerRole} (${manager?.description || ""}).

Subordonații tăi au generat aceste informații recent:

${inputText}

SARCINA TA: Distilează toate aceste informații într-un SINGUR INSIGHT de nivel superior.
- Extrage ESENȚA — ce pattern, ce tendință, ce concluzie se desprinde din ansamblu
- Piesele componente trebuie să DISPARĂ ca identitate — rămâne doar puzzle-ul
- Insight-ul trebuie să fie mai valoros decât suma pieselor
- Formulează concis (2-3 propoziții), acționabil, la nivelul tău de responsabilitate

Răspunde DOAR cu insight-ul, fără explicații suplimentare.`,
    }],
  })

  const insight = response.content[0].type === "text" ? response.content[0].text : ""

  // Mark source entries as distilled (dispar ca identitate)
  for (const e of subEntries) {
    try {
      await p.kBEntry.update({
        where: { id: e.id },
        data: { tags: [...e.tags, "distilled-by-manager"] },
      })
    } catch {}
  }

  return {
    insight,
    sources: subordinates.filter((s: string) => subEntries.some((e: any) => e.agentRole === s)),
    inputCount: subEntries.length,
  }
}

/**
 * Pasul 2: Îmbogățire cu input lateral (colegi) și de sus (superior).
 */
async function enrichInsight(
  managerRole: string,
  baseInsight: string,
  prisma: PrismaClient
): Promise<{ enrichedInsight: string; enrichedWith: string[] }> {
  const p = prisma as any
  const client = new Anthropic()

  // Find peers (same parent)
  const myParent = await p.agentRelationship.findFirst({
    where: { childRole: managerRole, isActive: true, relationType: "REPORTS_TO" },
    select: { parentRole: true },
  })

  const enrichedWith: string[] = []
  let lateralContext = ""
  let superiorContext = ""

  if (myParent) {
    // Get peers' recent distilled insights
    const peers = await p.agentRelationship.findMany({
      where: { parentRole: myParent.parentRole, isActive: true, relationType: "REPORTS_TO", childRole: { not: managerRole } },
      select: { childRole: true },
    })

    const peerRoles = peers.map((p: any) => p.childRole)
    const peerInsights = await p.kBEntry.findMany({
      where: {
        agentRole: { in: peerRoles },
        tags: { has: "manager-distilled" },
        createdAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { agentRole: true, content: true },
    })

    if (peerInsights.length > 0) {
      lateralContext = peerInsights.map((e: any) => `[${e.agentRole}] ${e.content.substring(0, 150)}`).join("\n")
      enrichedWith.push(...peerInsights.map((e: any) => e.agentRole))
    }

    // Get superior's recent insight
    const superiorInsight = await p.kBEntry.findFirst({
      where: {
        agentRole: myParent.parentRole,
        tags: { has: "manager-distilled" },
        createdAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: "desc" },
      select: { agentRole: true, content: true },
    })

    if (superiorInsight) {
      superiorContext = `[${superiorInsight.agentRole}] ${superiorInsight.content.substring(0, 150)}`
      enrichedWith.push(superiorInsight.agentRole)
    }
  }

  // If nothing to enrich with, return base
  if (!lateralContext && !superiorContext) {
    return { enrichedInsight: baseInsight, enrichedWith: [] }
  }

  // Enrich via Claude
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 600,
    messages: [{
      role: "user",
      content: `Ai distilat acest insight din echipa ta:
"${baseInsight}"

${lateralContext ? `Colegii tăi de la același nivel au observat:\n${lateralContext}\n` : ""}
${superiorContext ? `Superiorul tău a observat:\n${superiorContext}\n` : ""}

Îmbogățește-ți insight-ul integrând aceste perspective. Nu le adăuga mecanic — sintetizează într-o viziune mai completă. 2-3 propoziții.`,
    }],
  })

  const enrichedInsight = response.content[0].type === "text" ? response.content[0].text : baseInsight
  return { enrichedInsight, enrichedWith }
}

/**
 * Flow complet pentru un manager: colectare → distilare → îmbogățire → stocare.
 */
export async function distillForManager(
  managerRole: string,
  prisma: PrismaClient
): Promise<DistillationResult | null> {
  const start = Date.now()
  const p = prisma as any

  // Pasul 1: Colectare și distilare
  const distilled = await collectAndDistill(managerRole, prisma)
  if (!distilled) return null

  // Pasul 2: Îmbogățire
  const { enrichedInsight, enrichedWith } = await enrichInsight(
    managerRole, distilled.insight, prisma
  )

  // Pasul 3: Stocare insight final
  let kbEntryId: string | undefined
  try {
    const entry = await p.kBEntry.create({
      data: {
        agentRole: managerRole,
        kbType: "SHARED_DOMAIN",
        content: `[Distilat manager] ${enrichedInsight}`,
        source: "DISTILLED_INTERACTION",
        confidence: 0.80,
        status: "PERMANENT",
        tags: ["manager-distilled", "puzzle", `sources:${distilled.sources.join(",")}`],
        usageCount: 0,
        validatedAt: new Date(),
      },
    })
    kbEntryId = entry.id
  } catch {}

  return {
    managerRole,
    inputCount: distilled.inputCount,
    distilledInsight: enrichedInsight,
    sourcesAbsorbed: distilled.sources,
    enrichedWith,
    kbEntryId,
    durationMs: Date.now() - start,
  }
}

/**
 * Rulare bottom-up: operațional → tactic → strategic.
 * Managerii de jos procesează primii, apoi cei de sus au material distilat.
 */
export async function runDistillationCycle(
  prisma: PrismaClient
): Promise<{ processed: number; results: DistillationResult[] }> {
  const p = prisma as any

  // Get all managers ordered by level (operational first)
  const managers = await p.agentDefinition.findMany({
    where: { isManager: true, isActive: true },
    select: { agentRole: true, level: true },
  })

  const levelOrder = { OPERATIONAL: 1, TACTICAL: 2, STRATEGIC: 3 }
  managers.sort((a: any, b: any) =>
    (levelOrder[a.level as keyof typeof levelOrder] || 9) -
    (levelOrder[b.level as keyof typeof levelOrder] || 9)
  )

  const results: DistillationResult[] = []
  for (const m of managers) {
    try {
      const result = await distillForManager(m.agentRole, prisma)
      if (result) {
        results.push(result)
        console.log(`[DISTILL] ${m.agentRole}: ${result.inputCount} inputs → 1 insight (enriched by: ${result.enrichedWith.join(", ") || "none"})`)
      }
    } catch (e: any) {
      console.warn(`[DISTILL] ${m.agentRole} failed: ${e.message}`)
    }
    await new Promise(r => setTimeout(r, 1000))
  }

  return { processed: results.length, results }
}
