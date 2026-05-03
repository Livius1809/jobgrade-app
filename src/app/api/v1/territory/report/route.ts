/**
 * GET /api/v1/territory/report?territory=MEDGIDIA&fresh=true
 *
 * Raport teritorial complet cu cache 24h.
 * Parametri:
 *   territory (obligatoriu)
 *   fresh (opțional) — ignoră cache-ul și regenerează
 */

export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { generateTerritorialReport } from "@/lib/crawl/territorial-report"

// Cache simplu in-memory (24h TTL)
const reportCache = new Map<string, { data: any; generatedAt: number }>()
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24h

export async function GET(req: NextRequest) {
  const territory = req.nextUrl.searchParams.get("territory")
  if (!territory) {
    return NextResponse.json({ error: "territory parameter required" }, { status: 400 })
  }

  const fresh = req.nextUrl.searchParams.get("fresh") === "true"
  const cacheKey = territory.toUpperCase()

  // Verificăm cache
  if (!fresh) {
    const cached = reportCache.get(cacheKey)
    if (cached && Date.now() - cached.generatedAt < CACHE_TTL_MS) {
      return NextResponse.json({
        ...cached.data,
        _cache: { hit: true, generatedAt: new Date(cached.generatedAt).toISOString(), ttlRemaining: Math.round((CACHE_TTL_MS - (Date.now() - cached.generatedAt)) / 60000) + " min" },
      })
    }
  }

  const report = await generateTerritorialReport(territory)

  // Salvăm în cache
  reportCache.set(cacheKey, { data: report, generatedAt: Date.now() })

  // Cleanup cache vechi (max 50 rapoarte)
  if (reportCache.size > 50) {
    const oldest = [...reportCache.entries()].sort((a, b) => a[1].generatedAt - b[1].generatedAt)
    for (let i = 0; i < oldest.length - 50; i++) {
      reportCache.delete(oldest[i][0])
    }
  }

  return NextResponse.json({
    ...report,
    _cache: { hit: false, generatedAt: new Date().toISOString(), ttlRemaining: "24h" },
  })
}
