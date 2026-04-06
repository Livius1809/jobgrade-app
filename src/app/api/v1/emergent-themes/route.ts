import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  extractPatterns,
  summarizePatterns,
  type KBEntryInput,
  type BrainstormIdeaInput,
  type ClientMemoryInput,
} from "@/lib/agents/pattern-extractor"

export const dynamic = "force-dynamic"

/**
 * GET /api/v1/emergent-themes
 *
 * Detectează teme care emerg transversal între agenți — semnal real când ≥N
 * agenți distincți ating aceeași temă independent în fereastra dată.
 *
 * Livrat: 05.04.2026, Increment #6 "Living Organization" roadmap.
 *
 * Query params:
 *  - windowDays         (default 7, min 1, max 90)
 *  - minDistinctAgents  (default 3, min 2, max 10)
 *  - minPerAgent        (default 1, min 1, max 10)
 *  - includePropagation (default false) — dacă true, nu filtrează marker-ii
 *    de cross-pollination (broadcast, brainstorm_insight, from:X). Util pentru
 *    debug al mecanismului de propagare, nu pentru teme reale.
 *
 * Response:
 *  {
 *    generatedAt: ISO,
 *    config: { windowDays, minDistinctAgents, minPerAgent },
 *    inputCounts: { kbEntries, brainstormIdeas, clientMemories },
 *    summary: { total, multiSource, avgAgentsPerTheme, topTheme },
 *    themes: EmergentTheme[]
 *  }
 *
 * Principiu: zero conținut semantic. Consumă DOAR metadate discrete
 * (tags, category) din KBEntry / BrainstormIdea / ClientMemory.
 */

function verifyInternalAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

function clampInt(raw: string | null, def: number, min: number, max: number): number {
  const parsed = parseInt(raw ?? "", 10)
  if (!Number.isFinite(parsed)) return def
  return Math.min(Math.max(parsed, min), max)
}

export async function GET(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const windowDays = clampInt(url.searchParams.get("windowDays"), 7, 1, 90)
  const minDistinctAgents = clampInt(
    url.searchParams.get("minDistinctAgents"),
    3,
    2,
    10,
  )
  const minPerAgent = clampInt(url.searchParams.get("minPerAgent"), 1, 1, 10)
  const includePropagation =
    url.searchParams.get("includePropagation") === "true"

  // Default: filtrează marker-ii de cross-pollination care produc convergență
  // falsă pe toți agenții (artefacte tehnice, nu teme emergente reale).
  // Descoperite la validarea #6 pe 05.04.2026: top-10 teme erau toate
  // "broadcast", "brainstorm_insight", "from:coa" etc. — nu semnale reale.
  const PROPAGATION_EXCLUDE_TOKENS = ["broadcast", "brainstorm_insight"]
  const PROPAGATION_EXCLUDE_PREFIXES = ["from:"]
  const excludeTokens = includePropagation ? [] : PROPAGATION_EXCLUDE_TOKENS
  const excludeTokenPrefixes = includePropagation
    ? []
    : PROPAGATION_EXCLUDE_PREFIXES

  const windowStart = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000)

  // Citim paralel cele 3 surse, filtrând în fereastra cerută.
  // Cap defensiv 5000 per sursă — la scale mai mare ar trebui pagination, dar
  // pentru MVP e suficient (nu avem încă volume de ordinea aia).
  const [kbRows, biRows, cmRows] = await Promise.all([
    prisma.kBEntry.findMany({
      where: { createdAt: { gte: windowStart } },
      select: { id: true, agentRole: true, tags: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5000,
    }),
    prisma.brainstormIdea.findMany({
      where: { createdAt: { gte: windowStart }, category: { not: null } },
      select: {
        id: true,
        generatedBy: true,
        category: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5000,
    }),
    prisma.clientMemory.findMany({
      where: { createdAt: { gte: windowStart } },
      select: { id: true, source: true, tags: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5000,
    }),
  ])

  const kbEntries: KBEntryInput[] = kbRows.map((r) => ({
    id: r.id,
    agentRole: r.agentRole,
    tags: r.tags,
    createdAt: r.createdAt,
  }))

  const brainstormIdeas: BrainstormIdeaInput[] = biRows.map((r) => ({
    id: r.id,
    generatedBy: r.generatedBy,
    category: r.category,
    createdAt: r.createdAt,
  }))

  const clientMemories: ClientMemoryInput[] = cmRows.map((r) => ({
    id: r.id,
    source: r.source,
    tags: r.tags,
    createdAt: r.createdAt,
  }))

  const themes = extractPatterns(
    { kbEntries, brainstormIdeas, clientMemories },
    {
      windowDays,
      minDistinctAgents,
      minPerAgent,
      excludeTokens,
      excludeTokenPrefixes,
    },
  )
  const summary = summarizePatterns(themes)

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    config: {
      windowDays,
      minDistinctAgents,
      minPerAgent,
      includePropagation,
      excludedTokens: excludeTokens,
      excludedPrefixes: excludeTokenPrefixes,
    },
    inputCounts: {
      kbEntries: kbEntries.length,
      brainstormIdeas: brainstormIdeas.length,
      clientMemories: clientMemories.length,
    },
    summary,
    themes,
  })
}
