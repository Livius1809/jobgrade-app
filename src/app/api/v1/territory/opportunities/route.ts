/**
 * GET /api/v1/territory/opportunities?territory=MEDGIDIA&sector=TURISM&deep=true
 *
 * Returnează oportunități evaluate complet: economic + L3 (legal) + L1 (etic).
 * Parametri:
 *   territory (obligatoriu) — teritoriul de analizat
 *   sector (opțional) — filtrare per sector
 *   status (opțional) — APROBATA | CONDITIONATA | toate (default)
 *   includeRejected (opțional) — include și respinsele (default: false)
 *   deep (opțional) — analiză subtilă Claude pe top 5 (default: false)
 *   synergies (opțional) — detectare sinergii cross-sector via Claude (default: false)
 */

export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  SECTOR_TAXONOMY,
  getAllNichesFlat,
  calculateNicheRawScore,
} from "@/lib/crawl/sector-niche-taxonomy"
import {
  evaluateAllOpportunities,
  type EvaluatedOpportunity,
} from "@/lib/crawl/opportunity-filters"
import {
  analyzeTopOpportunitiesWithClaude,
  analyzeTerritorialSynergies,
  type TerritoryContext,
  type ClaudeOpportunityAnalysis,
} from "@/lib/crawl/claude-opportunity-analysis"

export async function GET(req: NextRequest) {
  const territory = req.nextUrl.searchParams.get("territory")
  if (!territory) {
    return NextResponse.json({ error: "territory parameter required" }, { status: 400 })
  }

  const sectorFilter = req.nextUrl.searchParams.get("sector")
  const statusFilter = req.nextUrl.searchParams.get("status")
  const includeRejected = req.nextUrl.searchParams.get("includeRejected") === "true"
  const deepAnalysis = req.nextUrl.searchParams.get("deep") === "true"
  const detectSynergies = req.nextUrl.searchParams.get("synergies") === "true"

  // Citim date teritoriale din DB pentru scoring contextual
  const [territorialData, localEntities] = await Promise.all([
    prisma.territorialData.findMany({ where: { territory } }),
    prisma.localEntity.findMany({ where: { territory, isActive: true } }),
  ])

  const popTotal = territorialData.find(d => d.category === "POPULATION" && d.key === "total")?.numericValue || 0

  // Numărăm entități per tip/categorie pentru supply gap
  const entityCounts: Record<string, number> = {}
  for (const e of localEntities) {
    const key = `${e.type}:${e.category || "GENERAL"}`
    entityCounts[key] = (entityCounts[key] || 0) + 1
    entityCounts[e.type] = (entityCounts[e.type] || 0) + 1
  }

  // Numărăm firme per CAEN
  const firmsByCaen: Record<string, number> = {}
  for (const e of localEntities) {
    if (e.type === "BUSINESS" && e.category) {
      firmsByCaen[e.category] = (firmsByCaen[e.category] || 0) + 1
    }
  }

  // Generăm scoring pentru fiecare nișă
  const allNiches = getAllNichesFlat()
  const filteredNiches = sectorFilter
    ? allNiches.filter(n => n.sectorId === sectorFilter)
    : allNiches

  const rawOpportunities = filteredNiches.map(niche => {
    // Estimare cerere bazată pe populație
    const demand = estimateDemand(niche.sectorId, niche.id, popTotal)

    // Supply gap — câți furnizori există pentru nișa asta
    const existingSupply = countSupplyForNiche(niche.sectorId, niche.id, entityCounts, firmsByCaen)
    const supplyGap = Math.max(0, Math.min(10, 10 - existingSupply * 2)) // 0 furnizori = gap 10

    // Resurse disponibile
    const resources = estimateResources(niche.sectorId, territory, territorialData)

    // Barieră de intrare
    const entryEase = estimateEntryEase(niche.sectorId, niche.id)

    // Nivel transformare curent
    const transformLevel = estimateTransformLevel(niche.sectorId, niche.id, entityCounts)

    // Potențial creștere
    const growth = estimateGrowth(niche.sectorId, niche.id)

    const rawScore = calculateNicheRawScore({
      demand,
      supplyGap,
      resourceAvailability: resources,
      entryEase,
      currentTransformLevel: transformLevel,
      growthPotential: growth,
    })

    return {
      nicheId: niche.id,
      sectorId: niche.sectorId,
      sectorName: niche.sectorName,
      nicheName: niche.name,
      rawScore,
      parentNicheId: niche.parentNicheId,
      scoring: { demand, supplyGap, resourceAvailability: resources, entryEase, currentTransformLevel: transformLevel, growthPotential: growth },
    }
  })

  // Evaluare completă (L3 + L1)
  let evaluated = evaluateAllOpportunities(rawOpportunities)

  // Filtrare pe status
  if (!includeRejected) {
    evaluated = evaluated.filter(e => e.status !== "RESPINSA_LEGAL" && e.status !== "RESPINSA_ETIC")
  }
  if (statusFilter) {
    evaluated = evaluated.filter(e => e.status === statusFilter)
  }

  // Grupare per sector pentru raport
  const bySector: Record<string, {
    sector: string
    sectorScore: number
    niches: EvaluatedOpportunity[]
  }> = {}

  for (const opp of evaluated) {
    if (!bySector[opp.sectorId]) {
      bySector[opp.sectorId] = { sector: opp.sectorName, sectorScore: 0, niches: [] }
    }
    bySector[opp.sectorId].niches.push(opp)
  }

  // Scor sector = medie nișe aprobate
  for (const s of Object.values(bySector)) {
    const approved = s.niches.filter(n => n.status === "APROBATA")
    s.sectorScore = approved.length > 0
      ? Math.round((approved.reduce((sum, n) => sum + n.finalScore, 0) / approved.length) * 10) / 10
      : 0
  }

  const sectors = Object.values(bySector).sort((a, b) => b.sectorScore - a.sectorScore)

  // Rezumat
  const summary = {
    territory,
    population: popTotal,
    totalOpportunities: evaluated.length,
    approved: evaluated.filter(e => e.status === "APROBATA").length,
    conditional: evaluated.filter(e => e.status === "CONDITIONATA").length,
    rejectedLegal: includeRejected ? evaluated.filter(e => e.status === "RESPINSA_LEGAL").length : undefined,
    rejectedEthical: includeRejected ? evaluated.filter(e => e.status === "RESPINSA_ETIC").length : undefined,
    topSectors: sectors.slice(0, 5).map(s => ({ name: s.sector, score: s.sectorScore, niches: s.niches.length })),
    topOpportunities: evaluated.slice(0, 10).map(e => ({
      niche: e.nicheName,
      sector: e.sectorName,
      finalScore: e.finalScore,
      ethicalScore: e.ethical?.overallScore,
      status: e.status,
      propagation: e.ethical?.propagationMechanism?.substring(0, 100),
    })),
  }

  // ═══ ANALIZĂ CLAUDE (opțional — deep=true / synergies=true) ═══
  let claudeAnalyses: Record<string, ClaudeOpportunityAnalysis> | undefined
  let synergyClusters: Awaited<ReturnType<typeof analyzeTerritorialSynergies>> | undefined

  if (deepAnalysis || detectSynergies) {
    // Construim context teritorial din datele crawlate
    const ethnicData = territorialData
      .filter(d => d.subcategory === "ETHNICITY")
      .map(d => `${d.key}: ${d.numericValue}`)

    const infraData = territorialData
      .filter(d => d.category === "INFRASTRUCTURE")
      .slice(0, 10)
      .map(d => d.key.replace(/_/g, " "))

    const topSectors = territorialData
      .filter(d => d.subcategory === "SECTORS")
      .slice(0, 5)
      .map(d => d.key)

    const knownGaps = evaluated
      .filter(e => e.status === "APROBATA")
      .slice(0, 5)
      .map(e => e.nicheName)

    const context: TerritoryContext = {
      territory,
      population: popTotal,
      ethnicGroups: ethnicData.length > 0 ? ethnicData : undefined,
      topBusinessSectors: topSectors.length > 0 ? topSectors : undefined,
      infrastructure: infraData.length > 0 ? infraData : undefined,
      knownGaps: knownGaps.length > 0 ? knownGaps : undefined,
    }

    if (deepAnalysis) {
      const analyses = await analyzeTopOpportunitiesWithClaude(evaluated, context, 5)
      claudeAnalyses = Object.fromEntries(analyses)

      // Ajustăm scorurile finale cu evaluarea Claude
      for (const opp of evaluated) {
        const claudeResult = analyses.get(opp.nicheId)
        if (claudeResult) {
          opp.ethical = claudeResult.ethical
          opp.finalScore = claudeResult.adjustedFinalScore
        }
      }

      // Re-sortăm după scorurile ajustate
      evaluated.sort((a, b) => {
        const statusOrder = { APROBATA: 0, CONDITIONATA: 1, RESPINSA_ETIC: 2, RESPINSA_LEGAL: 3 }
        const statusDiff = (statusOrder[a.status] || 9) - (statusOrder[b.status] || 9)
        if (statusDiff !== 0) return statusDiff
        return b.finalScore - a.finalScore
      })

      // Recalculăm summary cu scoruri ajustate
      summary.topOpportunities = evaluated.slice(0, 10).map(e => ({
        niche: e.nicheName,
        sector: e.sectorName,
        finalScore: e.finalScore,
        ethicalScore: e.ethical?.overallScore,
        status: e.status,
        propagation: e.ethical?.propagationMechanism?.substring(0, 100),
      }))
    }

    if (detectSynergies) {
      synergyClusters = await analyzeTerritorialSynergies(evaluated, context)
    }
  }

  return NextResponse.json({
    summary,
    sectors,
    ...(claudeAnalyses && { claudeAnalyses }),
    ...(synergyClusters && { synergies: synergyClusters }),
    analysisMode: deepAnalysis ? "deep (Claude L1+L3)" : "static",
    timestamp: new Date().toISOString(),
  })
}

// ═══════════════════════════════════════════════════════════════
// FUNCȚII DE ESTIMARE (contextuale per teritoriu)
// ═══════════════════════════════════════════════════════════════

function estimateDemand(sectorId: string, nicheId: string, population: number): number {
  // Baza: populație determină cerere generală
  const popFactor = Math.min(10, population / 5000) // 50.000+ = cerere 10

  // Ajustări per sector
  const sectorMultipliers: Record<string, number> = {
    SANATATE: 1.2,       // toată lumea are nevoie de sănătate
    EDUCATIE: 1.1,        // cerere universală
    AGRICULTURA: 0.9,     // cerere există dar nu toți sunt consumatori direcți
    TURISM: 0.7,          // cererea vine și din exterior
    SERVICII: 1.0,
    PRODUCTIE: 0.8,
    ENERGIE: 0.9,
    IMOBILIAR: 0.8,
  }

  return Math.min(10, Math.round(popFactor * (sectorMultipliers[sectorId] || 1.0) * 10) / 10)
}

function countSupplyForNiche(
  sectorId: string,
  _nicheId: string,
  entityCounts: Record<string, number>,
  firmsByCaen: Record<string, number>
): number {
  // Mapare sector → tipuri de entitate relevante
  const sectorEntityMap: Record<string, string[]> = {
    SANATATE: ["HOSPITAL", "DOCTOR", "CLINIC", "PHARMACY", "DENTIST"],
    EDUCATIE: ["SCHOOL", "KINDERGARTEN"],
    TURISM: ["RESTAURANT", "CAFE", "HOTEL"],
    SERVICII: ["SERVICE"],
    PRODUCTIE: ["BUSINESS"],
  }

  const relevantTypes = sectorEntityMap[sectorId] || ["BUSINESS"]
  let count = 0
  for (const type of relevantTypes) {
    count += entityCounts[type] || 0
  }

  return count
}

function estimateResources(
  sectorId: string,
  _territory: string,
  data: Array<{ category: string; key: string; numericValue: number | null }>
): number {
  // Baza per sector — cât de disponibile sunt resursele necesare
  const baseResources: Record<string, number> = {
    AGRICULTURA: 8,      // Dobrogea = sol fertil, climat bun
    ENERGIE: 8,          // iradiere solară, vânt
    TURISM: 6,           // patrimoniu există dar nevalorizat
    SANATATE: 4,         // trebuie specialiști din afară
    EDUCATIE: 5,         // infra există parțial
    PRODUCTIE: 6,        // materie primă locală
    SERVICII: 5,         // neutru
    IMOBILIAR: 6,        // teren disponibil
  }

  return baseResources[sectorId] || 5
}

function estimateEntryEase(sectorId: string, _nicheId: string): number {
  // Invers: 10 = foarte ușor, 0 = foarte greu
  const ease: Record<string, number> = {
    SERVICII: 8,         // capital mic, fără licențe speciale
    TURISM: 7,           // relativ ușor de pornit
    EDUCATIE: 6,         // necesită acreditare dar nu capital mare
    AGRICULTURA: 5,      // teren + echipament
    PRODUCTIE: 4,        // capital mediu + autorizații
    SANATATE: 3,         // strict reglementat, capital mare
    ENERGIE: 3,          // birocrație + capital mare
    IMOBILIAR: 3,        // capital mare + autorizații
  }

  return ease[sectorId] || 5
}

function estimateTransformLevel(
  sectorId: string,
  _nicheId: string,
  entityCounts: Record<string, number>
): number {
  // Estimare: la ce nivel de transformare se oprește teritoriul acum
  // 0 = rod brut, 7 = cunoaștere/brand
  const baseLevels: Record<string, number> = {
    AGRICULTURA: 1,      // exportă brut
    TURISM: 1,           // există dar fără pachete, brand
    PRODUCTIE: 2,        // procesare parțială
    SERVICII: 3,         // servicii de bază
    EDUCATIE: 3,         // educație formală dar nu formare specializată
    SANATATE: 2,         // medicină de bază
    ENERGIE: 1,          // producție dar nu distribuție locală
    IMOBILIAR: 2,        // construcții dar nu dezvoltare urbanistică
  }

  return baseLevels[sectorId] || 2
}

function estimateGrowth(sectorId: string, _nicheId: string): number {
  // Tendință de creștere a cererii (bazată pe trenduri naționale/europene)
  const growth: Record<string, number> = {
    ENERGIE: 9,          // tranziție verde, subsidii UE
    TURISM: 8,           // creștere post-pandemie, RO subevaluat
    EDUCATIE: 7,         // reconversie profesională, digital skills
    SANATATE: 8,         // îmbătrânire, conștientizare
    SERVICII: 6,         // stabil
    AGRICULTURA: 6,      // farm-to-table, bio — creștere moderată
    PRODUCTIE: 5,        // relocare supply chain din Asia
    IMOBILIAR: 5,        // ciclic
  }

  return growth[sectorId] || 5
}
