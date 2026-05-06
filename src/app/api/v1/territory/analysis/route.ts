/**
 * GET /api/v1/territory/analysis?territory=MEDGIDIA
 *
 * Analiză completă pe cele 3 axe: resurse × consum × nevoi.
 * Returnează gap-urile (oportunități de punți/afaceri).
 */

import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { analyzeTerritory } from "@/lib/crawl/territorial-analysis"
import { analyzeResources } from "@/lib/crawl/resource-taxonomy"
import { analyzeConsumption } from "@/lib/crawl/consumption-analysis"
import { analyzeNeeds } from "@/lib/crawl/needs-analysis"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Neautorizat" }, { status: 401 })

  const url = new URL(req.url)
  const territory = url.searchParams.get("territory") || "MEDGIDIA"

  // Analiză standard (3 axe)
  const analysis = await analyzeTerritory(territory)

  // Analiză resurse extinsă (taxonomie 3 roduri + pipeline transformare)
  const [allData, allEntities] = await Promise.all([
    prisma.territorialData.findMany({ where: { territory } }),
    prisma.localEntity.findMany({ where: { territory, isActive: true } }),
  ])

  const resourceAnalysis = analyzeResources(
    allData.map(d => ({ category: d.category, subcategory: d.subcategory, key: d.key, value: d.value })),
    allEntities.map(e => ({ type: e.type, name: e.name, category: e.category, metadata: e.metadata })),
    territory
  )

  // Analiză consum extinsă
  const consumptionAnalysis = analyzeConsumption(
    analysis.resources.population.byAge,
    analysis.resources.businesses,
    analysis.resources.entities,
    territory
  )

  // Analiză nevoi (Axa 3 — stadii dezvoltare × Maslow × spirală)
  const needsAnalysis = analyzeNeeds(
    analysis.resources.population.byAge,
    analysis.resources.businesses,
    analysis.resources.entities,
    analysis.resources.population.total
  )

  return NextResponse.json({
    ...analysis,
    resourceTaxonomy: resourceAnalysis,
    consumption: consumptionAnalysis,
    needsDetailed: needsAnalysis,
  })
}
