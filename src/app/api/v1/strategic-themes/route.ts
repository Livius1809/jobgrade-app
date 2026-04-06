import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  extractPatterns,
  type KBEntryInput,
  type BrainstormIdeaInput,
  type ClientMemoryInput,
} from "@/lib/agents/pattern-extractor"
import {
  observeStrategically,
  summarizeStrategicThemes,
  type StrategicExternalSignalInput,
  type StrategicEmergentThemeInput,
} from "@/lib/agents/strategic-observer"

export const dynamic = "force-dynamic"

/**
 * GET /api/v1/strategic-themes
 *
 * COSO — Observator Strategic. Consumă simultan:
 *  - ExternalSignal (#1+#2) din DB
 *  - EmergentTheme computed on-the-fly din KBEntry/BrainstormIdea/ClientMemory (#6)
 * și produce StrategicTheme-uri cu direcție, confidence și acțiune propusă.
 *
 * Livrat: 05.04.2026, Increment #3 "Living Organization" roadmap.
 *
 * Query params:
 *  - windowHours            (default 24, min 1, max 168) — fereastra principală
 *  - baselineDays           (default 7, min 1, max 30)
 *  - surgeMultiplier        (default 2, min 1.5, max 10)
 *  - surgeMinCount          (default 5, min 2, max 50)
 *  - multiSourceWindowHours (default 6, min 1, max 48)
 *  - multiSourceMinSources  (default 3, min 2, max 10)
 *  - bridgeMinMatches       (default 2, min 2, max 10)
 *  - emergentWindowDays     (default 7, min 1, max 90) — pentru extractPatterns
 *  - emergentMinAgents      (default 3, min 2, max 10)
 *
 * Principiu: on-demand, zero persistent storage. Rezultatele sunt recomputate
 * la fiecare apel din datele curente.
 */

function verifyInternalAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

function clampInt(
  raw: string | null,
  def: number,
  min: number,
  max: number,
): number {
  const parsed = parseInt(raw ?? "", 10)
  if (!Number.isFinite(parsed)) return def
  return Math.min(Math.max(parsed, min), max)
}

function clampFloat(
  raw: string | null,
  def: number,
  min: number,
  max: number,
): number {
  const parsed = parseFloat(raw ?? "")
  if (!Number.isFinite(parsed)) return def
  return Math.min(Math.max(parsed, min), max)
}

export async function GET(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const windowHours = clampInt(url.searchParams.get("windowHours"), 24, 1, 168)
  const baselineDays = clampInt(url.searchParams.get("baselineDays"), 7, 1, 30)
  const surgeMultiplier = clampFloat(
    url.searchParams.get("surgeMultiplier"),
    2,
    1.5,
    10,
  )
  const surgeMinCount = clampInt(
    url.searchParams.get("surgeMinCount"),
    5,
    2,
    50,
  )
  const multiSourceWindowHours = clampInt(
    url.searchParams.get("multiSourceWindowHours"),
    6,
    1,
    48,
  )
  const multiSourceMinSources = clampInt(
    url.searchParams.get("multiSourceMinSources"),
    3,
    2,
    10,
  )
  const bridgeMinMatches = clampInt(
    url.searchParams.get("bridgeMinMatches"),
    2,
    2,
    10,
  )
  const emergentWindowDays = clampInt(
    url.searchParams.get("emergentWindowDays"),
    7,
    1,
    90,
  )
  const emergentMinAgents = clampInt(
    url.searchParams.get("emergentMinAgents"),
    3,
    2,
    10,
  )

  // Fereastra totală de lookback pentru ExternalSignal = windowHours + baselineDays
  // (ca R1 să poată calcula baseline-ul corect)
  const totalLookbackHours = windowHours + baselineDays * 24
  const signalsSince = new Date(
    Date.now() - totalLookbackHours * 60 * 60 * 1000,
  )
  // Pentru EmergentTheme (KB/brainstorm/clientMemory) folosim fereastra proprie
  const emergentSince = new Date(
    Date.now() - emergentWindowDays * 24 * 60 * 60 * 1000,
  )

  // Fetch paralel
  const [signalRows, kbRows, biRows, cmRows] = await Promise.all([
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
      orderBy: { capturedAt: "desc" },
      take: 5000,
    }),
    prisma.kBEntry.findMany({
      where: { createdAt: { gte: emergentSince } },
      select: { id: true, agentRole: true, tags: true, createdAt: true },
      orderBy: { createdAt: "desc" },
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
      orderBy: { createdAt: "desc" },
      take: 5000,
    }),
    prisma.clientMemory.findMany({
      where: { createdAt: { gte: emergentSince } },
      select: { id: true, source: true, tags: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5000,
    }),
  ])

  // ExternalSignal input pentru observer
  const externalSignals: StrategicExternalSignalInput[] = signalRows.map(
    (r) => ({
      id: r.id,
      source: r.source,
      category: r.category,
      title: r.title,
      rawContent: r.rawContent,
      capturedAt: r.capturedAt,
      publishedAt: r.publishedAt,
    }),
  )

  // EmergentTheme — computed on-the-fly cu aceleași reguli ca /emergent-themes
  // (inclusiv filtrul de cross-pollination markers)
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

  const rawEmergentThemes = extractPatterns(
    { kbEntries, brainstormIdeas, clientMemories },
    {
      windowDays: emergentWindowDays,
      minDistinctAgents: emergentMinAgents,
      minPerAgent: 1,
      // Același filtru default ca /api/v1/emergent-themes — exclude markerii
      // de cross-pollination care produc convergență falsă
      excludeTokens: ["broadcast", "brainstorm_insight"],
      excludeTokenPrefixes: ["from:"],
    },
  )

  const emergentThemes: StrategicEmergentThemeInput[] = rawEmergentThemes.map(
    (t) => ({
      token: t.token,
      distinctAgents: t.distinctAgents,
      agents: t.agents,
      sources: t.sources,
      totalOccurrences: t.totalOccurrences,
      firstSeenAt: t.firstSeenAt,
      lastSeenAt: t.lastSeenAt,
    }),
  )

  const strategicThemes = observeStrategically(
    { externalSignals, emergentThemes },
    {
      windowHours,
      baselineDays,
      surgeMultiplier,
      surgeMinCount,
      multiSourceWindowHours,
      multiSourceMinSources,
      bridgeMinMatches,
    },
  )
  const summary = summarizeStrategicThemes(strategicThemes)

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    config: {
      windowHours,
      baselineDays,
      surgeMultiplier,
      surgeMinCount,
      multiSourceWindowHours,
      multiSourceMinSources,
      bridgeMinMatches,
      emergentWindowDays,
      emergentMinAgents,
    },
    inputCounts: {
      externalSignals: externalSignals.length,
      emergentThemes: emergentThemes.length,
      kbEntries: kbEntries.length,
      brainstormIdeas: brainstormIdeas.length,
      clientMemories: clientMemories.length,
    },
    summary,
    themes: strategicThemes,
  })
}
