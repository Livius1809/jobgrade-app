/**
 * GET /api/v1/crawl/feed?agent=ACEA&territory=MEDGIDIA
 *
 * Feed de date crawlate, filtrat per agent.
 * Fiecare agent primește doar ce e relevant pentru atribuțiile lui.
 */

import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

// Ce categorii sunt relevante per agent
const AGENT_INTERESTS: Record<string, string[]> = {
  // Conducere
  COG: ["POPULATION", "BUSINESS", "ECONOMY", "LABOR", "INFRASTRUCTURE"],
  ACEA: ["POPULATION", "ECONOMY", "LABOR", "INFRASTRUCTURE"], // Analist context extern
  // Comercial
  CIA: ["BUSINESS", "ECONOMY"], // Competitive intelligence
  CCIA: ["BUSINESS"], // Counter competitive
  SOA: ["BUSINESS", "ECONOMY", "POPULATION"], // Sales
  MKA: ["POPULATION", "ECONOMY", "BUSINESS"], // Marketing
  // Legal
  CJA: ["INFRASTRUCTURE", "LABOR"], // Juridic — legislație, obligații
  DPO: ["INFRASTRUCTURE"], // Data protection
  // HR
  HR_COUNSELOR: ["LABOR", "POPULATION"], // Piața muncii, demografie
  // Financiar
  CFO: ["ECONOMY", "BUSINESS"], // Date financiare
  // Tehnic
  COA: ["INFRASTRUCTURE"], // Infra tech
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Neautorizat" }, { status: 401 })

  const url = new URL(req.url)
  const agent = url.searchParams.get("agent")?.toUpperCase() || "COG"
  const territory = url.searchParams.get("territory") || "MEDGIDIA"
  const category = url.searchParams.get("category") // opțional — filtrare specifică

  // Categorii relevante per agent
  const interests = AGENT_INTERESTS[agent] || ["POPULATION", "BUSINESS", "ECONOMY"]

  // Filtrare date teritoriale
  const where: any = { territory }
  if (category) {
    where.category = category
  } else {
    where.category = { in: interests }
  }

  const [territorialData, localEntities, sources] = await Promise.all([
    prisma.territorialData.findMany({
      where,
      orderBy: [{ category: "asc" }, { key: "asc" }],
    }),
    prisma.localEntity.findMany({
      where: { territory, isActive: true },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    }),
    prisma.crawlSource.findMany({
      where: { territory },
      select: { name: true, lastSuccessAt: true, totalRecords: true },
    }),
  ])

  // Grupare per categorie
  const byCategory: Record<string, any[]> = {}
  for (const td of territorialData) {
    if (!byCategory[td.category]) byCategory[td.category] = []
    byCategory[td.category].push({
      key: td.key,
      value: td.numericValue ?? td.value,
      unit: td.unit,
      subcategory: td.subcategory,
      periodYear: td.periodYear,
      confidence: td.confidence,
      updatedAt: td.updatedAt,
    })
  }

  // Grupare entități per tip
  const entitiesByType: Record<string, any[]> = {}
  for (const le of localEntities) {
    if (!entitiesByType[le.type]) entitiesByType[le.type] = []
    entitiesByType[le.type].push({
      name: le.name,
      category: le.category,
      address: le.address,
      lat: le.latitude,
      lon: le.longitude,
      employees: le.employees,
      revenue: le.revenue,
    })
  }

  return NextResponse.json({
    agent,
    territory,
    interests,
    lastCrawl: sources.reduce((latest, s) => {
      if (!s.lastSuccessAt) return latest
      return !latest || s.lastSuccessAt > latest ? s.lastSuccessAt : latest
    }, null as Date | null),
    data: byCategory,
    entities: entitiesByType,
    stats: {
      totalDataPoints: territorialData.length,
      totalEntities: localEntities.length,
      categories: Object.keys(byCategory),
      entityTypes: Object.keys(entitiesByType),
    },
  })
}
