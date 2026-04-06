import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { exploreWildCards, summarizeWildCards, type WildCardInput } from "@/lib/agents/wild-card-explorer"

export const dynamic = "force-dynamic"

/**
 * GET /api/v1/wild-card-explorer
 *
 * Increment #7 — Generează conexiuni neașteptate între semnale din surse diferite.
 * Complementar la /wild-cards (provocări per agent) și /strategic-themes (corelații logice).
 *
 * Consumă: ExternalSignal + KBEntry.tags + BrainstormIdea.category + ServiceOutcome.
 * Produce: perechi token cross-source cu scor de surpriză + întrebări generative.
 *
 * Query params:
 *  - windowDays: fereastra de observare (default 7)
 *  - maxResults: câte wild cards (default 5)
 *  - seed: seed PRNG (default 42, schimbă-l pentru alt set de rezultate)
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

  const url = new URL(req.url)
  const windowDays = Number(url.searchParams.get("windowDays") ?? "7")
  const maxResults = Number(url.searchParams.get("maxResults") ?? "5")
  const seed = Number(url.searchParams.get("seed") ?? "42")
  const now = new Date()

  const windowStart = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000)

  // Colectare date din 4 surse paralel
  const [externalSignals, kbEntries, brainstormIdeas, outcomes] = await Promise.all([
    prisma.externalSignal.findMany({
      where: { capturedAt: { gte: windowStart } },
      select: { id: true, source: true, category: true, title: true, capturedAt: true },
    }),
    prisma.kBEntry.findMany({
      where: { createdAt: { gte: windowStart }, tags: { isEmpty: false } },
      select: { id: true, agentRole: true, tags: true, createdAt: true },
    }),
    prisma.brainstormIdea.findMany({
      where: { createdAt: { gte: windowStart }, category: { not: null } },
      select: { id: true, generatedBy: true, category: true, createdAt: true },
    }),
    prisma.serviceOutcome.findMany({
      where: { isActive: true, currentValue: { not: null } },
      select: { serviceCode: true, serviceName: true, metricName: true, updatedAt: true },
    }),
  ])

  // Transformare în WildCardInput[]
  const inputs: WildCardInput[] = []

  // External signals → categorii + keywords din titlu
  for (const sig of externalSignals) {
    inputs.push({
      token: sig.category.toLowerCase().replace(/_/g, "-"),
      source: "external",
      category: sig.category,
      timestamp: sig.capturedAt,
      detail: sig.title,
    })
    const words = sig.title
      .toLowerCase()
      .replace(/[^a-zăâîșțşţé\s-]/g, "")
      .split(/\s+/)
      .filter(w => w.length > 7)
    for (const w of words.slice(0, 2)) {
      inputs.push({
        token: w,
        source: "external",
        timestamp: sig.capturedAt,
        detail: sig.title,
      })
    }
  }

  // KB entries → tags
  for (const kb of kbEntries) {
    for (const tag of kb.tags) {
      inputs.push({
        token: tag,
        source: "internal_kb",
        timestamp: kb.createdAt,
      })
    }
  }

  // Brainstorm ideas → category
  for (const idea of brainstormIdeas) {
    if (idea.category) {
      inputs.push({
        token: idea.category,
        source: "internal_brainstorm",
        timestamp: idea.createdAt,
      })
    }
  }

  // Outcomes → metricName
  for (const outcome of outcomes) {
    inputs.push({
      token: outcome.metricName.replace(/_/g, "-"),
      source: "outcome",
      timestamp: outcome.updatedAt,
      detail: outcome.serviceName,
    })
  }

  const wildCards = exploreWildCards(inputs, {
    windowDays,
    maxResults,
    seed,
    now,
  })

  const summary = summarizeWildCards(wildCards)

  return NextResponse.json({
    generatedAt: now.toISOString(),
    inputStats: {
      externalSignals: externalSignals.length,
      kbEntries: kbEntries.length,
      brainstormIdeas: brainstormIdeas.length,
      outcomes: outcomes.length,
      totalInputTokens: inputs.length,
    },
    summary,
    wildCards,
    params: { windowDays, maxResults, seed },
  })

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: "internal_error", message }, { status: 500 })
  }
}
