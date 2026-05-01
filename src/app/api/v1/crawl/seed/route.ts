/**
 * POST /api/v1/crawl/seed — Seed surse de crawling
 * Auth: internal key only
 */

import { NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

const SOURCES = [
  { name: "INS_TEMPO", displayName: "INS TEMPO Online", url: "http://statistici.insse.ro:8077/tempo-online/", type: "API", schedule: "MONTHLY", territory: "MEDGIDIA" },
  { name: "TOPFIRME", displayName: "TopFirme", url: "https://www.topfirme.com/judet/constanta/localitate/medgidia/", type: "HTML_SCRAPER", schedule: "WEEKLY", territory: "MEDGIDIA" },
  { name: "PRIMARIE_MEDGIDIA", displayName: "Primaria Medgidia", url: "https://primaria-medgidia.ro/", type: "HTML_SCRAPER", schedule: "DAILY", territory: "MEDGIDIA" },
  { name: "AJOFM_CONSTANTA", displayName: "AJOFM Constanta", url: "http://www.constanta.anofm.ro/", type: "HTML_SCRAPER", schedule: "DAILY", territory: "MEDGIDIA" },
  { name: "OSM_OVERPASS", displayName: "OpenStreetMap POI", url: "https://overpass-api.de/api/interpreter", type: "API", schedule: "WEEKLY", territory: "MEDGIDIA" },
]

export async function POST() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Neautorizat" }, { status: 401 })

  const results = []
  for (const src of SOURCES) {
    await prisma.crawlSource.upsert({ where: { name: src.name }, update: src, create: src })
    results.push(src.name)
  }

  return NextResponse.json({ ok: true, seeded: results })
}
