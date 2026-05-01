/**
 * POST /api/v1/crawl — Trigger crawling manual sau pe sursă specifică
 * GET  /api/v1/crawl — Status surse + ultimele rezultate
 *
 * Auth: internal key sau Owner/SUPER_ADMIN
 */

import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"
import { crawlSource, crawlAllDue } from "@/lib/crawl/engine"

export const dynamic = "force-dynamic"
export const maxDuration = 120

// GET — status surse
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Neautorizat" }, { status: 401 })

  const sources = await prisma.crawlSource.findMany({
    orderBy: { lastCrawlAt: "desc" },
    include: {
      results: { take: 3, orderBy: { crawledAt: "desc" } },
    },
  })

  const territorialStats = await prisma.territorialData.groupBy({
    by: ["territory", "category"],
    _count: true,
  })

  const entityStats = await prisma.localEntity.groupBy({
    by: ["territory", "type"],
    _count: true,
  })

  return NextResponse.json({
    sources: sources.map(s => ({
      name: s.name,
      displayName: s.displayName,
      enabled: s.enabled,
      schedule: s.schedule,
      lastCrawlAt: s.lastCrawlAt,
      lastSuccessAt: s.lastSuccessAt,
      lastError: s.lastError,
      totalCrawls: s.totalCrawls,
      totalRecords: s.totalRecords,
      recentResults: s.results.map(r => ({
        status: r.status,
        recordsNew: r.recordsNew,
        recordsUpdated: r.recordsUpdated,
        durationMs: r.durationMs,
        crawledAt: r.crawledAt,
      })),
    })),
    territorialData: territorialStats.map(s => ({
      territory: s.territory,
      category: s.category,
      count: s._count,
    })),
    localEntities: entityStats.map(s => ({
      territory: s.territory,
      type: s.type,
      count: s._count,
    })),
  })
}

// POST — trigger crawl
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Neautorizat" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const sourceName = body.source as string | undefined

  if (sourceName) {
    // Crawl sursă specifică
    const report = await crawlSource(sourceName)
    return NextResponse.json(report)
  }

  // Crawl toate sursele due
  const reports = await crawlAllDue()
  return NextResponse.json({
    ok: true,
    crawled: reports.length,
    reports,
  })
}
