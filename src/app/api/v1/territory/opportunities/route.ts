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

  // Pre-procesăm date pentru scoring dinamic
  const ageGroups = territorialData
    .filter(d => d.subcategory === "AGE_GROUPS")
    .map(d => ({ group: d.key.replace("age_", ""), count: d.numericValue || 0 }))

  const laborData = territorialData
    .filter(d => d.category === "LABOR")

  const infraData = territorialData
    .filter(d => d.category === "INFRASTRUCTURE")
    .map(d => ({ key: d.key, value: d.value }))

  // Generăm scoring pentru fiecare nișă
  const allNiches = getAllNichesFlat()
  const filteredNiches = sectorFilter
    ? allNiches.filter(n => n.sectorId === sectorFilter)
    : allNiches

  const rawOpportunities = filteredNiches.map(niche => {
    // Cerere din date demografice reale
    const demand = estimateDemand(niche.sectorId, niche.id, popTotal, ageGroups, laborData)

    // Supply gap — contor real din entități + CAEN
    const existingSupply = countSupplyForNiche(niche.sectorId, niche.id, entityCounts, firmsByCaen)
    const supplyGap = Math.max(0, Math.min(10, 10 - existingSupply * 2))

    // Resurse din date teritoriale crawlate
    const resources = estimateResources(niche.sectorId, territory, territorialData)

    // Barieră de intrare + ajustare din infra locală
    const entryEase = estimateEntryEase(niche.sectorId, niche.id, infraData)

    // Nivel transformare detectat din CAEN-uri prezente
    const transformLevel = estimateTransformLevel(niche.sectorId, niche.id, entityCounts, firmsByCaen)

    // Potențial creștere ajustat din demografie
    const growth = estimateGrowth(niche.sectorId, niche.id, ageGroups, popTotal)

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
// FUNCȚII DE SCORING DINAMIC (bazate pe date crawlate reale)
// ═══════════════════════════════════════════════════════════════

/**
 * Cerere per sector — calculată din date demografice reale + structura CAEN.
 * Sector multiplier-urile rămân (sunt universale), dar baza vine din DB.
 */
function estimateDemand(
  sectorId: string,
  nicheId: string,
  population: number,
  ageGroups?: Array<{ group: string; count: number }>,
  laborData?: Array<{ key: string; numericValue: number | null }>
): number {
  const popFactor = Math.min(10, population / 5000)

  // Ajustări din date reale (dacă există)
  let demographicBonus = 0

  if (ageGroups && ageGroups.length > 0) {
    const young = ageGroups.filter(a => ["20-29", "30-39"].includes(a.group)).reduce((s, a) => s + a.count, 0)
    const elderly = ageGroups.filter(a => parseInt(a.group) >= 60).reduce((s, a) => s + a.count, 0)
    const children = ageGroups.filter(a => parseInt(a.group) <= 19).reduce((s, a) => s + a.count, 0)

    // Ajustări demografice per sector
    if (sectorId === "SANATATE" && elderly > population * 0.25) demographicBonus = 2  // populație îmbătrânită
    if (sectorId === "EDUCATIE" && children > population * 0.2) demographicBonus = 1.5
    if (sectorId === "EDUCATIE" && young > population * 0.15) demographicBonus = Math.max(demographicBonus, 1) // NEET potențial
    if (sectorId === "IMOBILIAR" && young > population * 0.2) demographicBonus = 1.5 // tineri care au nevoie de locuință
  }

  // Bonus din date de muncă
  if (laborData && laborData.length > 0) {
    const unemployment = laborData.find(d => d.key === "unemployment_rate")?.numericValue
    if (unemployment && unemployment > 8) {
      if (sectorId === "EDUCATIE") demographicBonus += 1.5  // formare necesară
      if (sectorId === "SERVICII") demographicBonus += 1     // servicii lipsă
    }
  }

  const sectorMultipliers: Record<string, number> = {
    SANATATE: 1.2, EDUCATIE: 1.1, AGRICULTURA: 0.9, TURISM: 0.7,
    SERVICII: 1.0, PRODUCTIE: 0.8, ENERGIE: 0.9, IMOBILIAR: 0.8,
  }

  return Math.min(10, Math.round((popFactor * (sectorMultipliers[sectorId] || 1.0) + demographicBonus) * 10) / 10)
}

/**
 * Supply gap — contor real din entități locale + firme per CAEN.
 * Mapare nișă → tipuri entitate + CAEN-uri relevante.
 */
function countSupplyForNiche(
  sectorId: string,
  nicheId: string,
  entityCounts: Record<string, number>,
  firmsByCaen: Record<string, number>
): number {
  // Mapare detaliată: nișă → tipuri entitate + CAEN-uri
  const nicheEntityMap: Record<string, { entityTypes: string[]; caenPrefixes: string[] }> = {
    // Sănătate
    SAN_PRIMARA:       { entityTypes: ["DOCTOR", "CLINIC"], caenPrefixes: ["8621"] },
    SAN_SPECIALITATI:  { entityTypes: ["DOCTOR", "CLINIC", "DENTIST"], caenPrefixes: ["8622", "8623"] },
    SAN_RECUPERARE:    { entityTypes: ["CLINIC"], caenPrefixes: ["8690"] },
    SAN_MINTALA:       { entityTypes: ["CLINIC"], caenPrefixes: ["8690"] },
    SAN_TELEMEDICINA:  { entityTypes: [], caenPrefixes: ["8621", "6201"] },
    SAN_VARSTNICI:     { entityTypes: [], caenPrefixes: ["8710", "8730", "8790"] },
    SAN_LABORATOR:     { entityTypes: ["CLINIC"], caenPrefixes: ["8690"] },
    // Educație
    EDU_FORMARE_PROF:  { entityTypes: ["SCHOOL"], caenPrefixes: ["8532", "8559"] },
    EDU_RECONVERSIE:   { entityTypes: [], caenPrefixes: ["8559", "8542"] },
    EDU_ANTREPRENORIAT: { entityTypes: [], caenPrefixes: ["8559"] },
    EDU_LIMBA:         { entityTypes: [], caenPrefixes: ["8559"] },
    EDU_TIMPURIE:      { entityTypes: ["KINDERGARTEN"], caenPrefixes: ["8510"] },
    EDU_DIGITAL_AVANSATA: { entityTypes: [], caenPrefixes: ["8559", "6201"] },
    // Turism
    TURISM_CULTURAL:   { entityTypes: ["MUSEUM", "MONUMENT"], caenPrefixes: ["7990", "9102"] },
    TURISM_GASTRONOMIC: { entityTypes: ["RESTAURANT", "CAFE"], caenPrefixes: ["5610", "5630"] },
    TURISM_MEDICAL:    { entityTypes: ["HOSPITAL", "CLINIC", "HOTEL"], caenPrefixes: ["8610", "5510"] },
    TURISM_RURAL:      { entityTypes: ["HOTEL", "GUESTHOUSE"], caenPrefixes: ["5520"] },
    TURISM_EDUCATIONAL: { entityTypes: [], caenPrefixes: ["8551", "7990"] },
    TURISM_INDUSTRIAL: { entityTypes: [], caenPrefixes: ["7990"] },
    TURISM_EVENTOS:    { entityTypes: [], caenPrefixes: ["9329", "8230"] },
    // Agricultură
    AGRI_CULTURA_MARE: { entityTypes: ["BUSINESS"], caenPrefixes: ["0111", "0113"] },
    AGRI_PROCESARE_PRIMARA: { entityTypes: ["BUSINESS"], caenPrefixes: ["1061", "1041"] },
    AGRI_PROCESARE_SECUNDARA: { entityTypes: ["BUSINESS"], caenPrefixes: ["1071", "1082", "1051"] },
    AGRI_BIO_ORGANIC:  { entityTypes: ["BUSINESS"], caenPrefixes: ["0111"] }, // same CAEN, different cert
    AGRI_NISA_PREMIUM: { entityTypes: ["BUSINESS"], caenPrefixes: ["0128", "0113"] },
    AGRI_ZOOTEHNIE:    { entityTypes: ["BUSINESS"], caenPrefixes: ["0141", "0147", "0150"] },
    // Producție
    PROD_ALIMENTARA:   { entityTypes: ["BUSINESS"], caenPrefixes: ["1011", "1013", "1020", "1039", "1051"] },
    PROD_CONSTRUCTII:  { entityTypes: ["BUSINESS"], caenPrefixes: ["2361", "2363", "2369"] },
    PROD_TEXTILE:      { entityTypes: ["BUSINESS"], caenPrefixes: ["1413", "1414", "1419"] },
    PROD_LEMN:         { entityTypes: ["BUSINESS"], caenPrefixes: ["1610", "3101", "3109"] },
    PROD_ARTIZANAT:    { entityTypes: ["BUSINESS"], caenPrefixes: ["3299", "2341"] },
    // Servicii
    SERV_LOGISTICA:    { entityTypes: ["BUSINESS"], caenPrefixes: ["4941", "5210", "5229"] },
    SERV_IT_REMOTE:    { entityTypes: ["BUSINESS"], caenPrefixes: ["6201", "6202", "6311"] },
    SERV_REPARATII:    { entityTypes: ["SERVICE"], caenPrefixes: ["9522", "4520", "4321"] },
    SERV_PROFESIONALE: { entityTypes: ["SERVICE"], caenPrefixes: ["6920", "6910", "7022"] },
    SERV_ECOMMERCE:    { entityTypes: [], caenPrefixes: ["4791"] },
    // Energie
    ENRG_SOLAR:        { entityTypes: ["BUSINESS"], caenPrefixes: ["3511"] },
    ENRG_EOLIAN:       { entityTypes: ["BUSINESS"], caenPrefixes: ["3511"] },
    ENRG_BIOMASA:      { entityTypes: ["BUSINESS"], caenPrefixes: ["3511", "3530"] },
    ENRG_COMUNITATI:   { entityTypes: [], caenPrefixes: ["3511"] },
    ENRG_EFICIENTA:    { entityTypes: ["BUSINESS"], caenPrefixes: ["4321", "7112"] },
    // Imobiliar
    IMOB_REZIDENTIAL:  { entityTypes: ["BUSINESS"], caenPrefixes: ["4120"] },
    IMOB_COMERCIAL:    { entityTypes: ["BUSINESS"], caenPrefixes: ["6820"] },
    IMOB_REABILITARE:  { entityTypes: ["BUSINESS"], caenPrefixes: ["4120", "4299"] },
  }

  // Fallback pe sector dacă nișa nu e mapată
  const sectorEntityMap: Record<string, { entityTypes: string[]; caenPrefixes: string[] }> = {
    SANATATE:   { entityTypes: ["HOSPITAL", "DOCTOR", "CLINIC", "PHARMACY", "DENTIST"], caenPrefixes: ["86"] },
    EDUCATIE:   { entityTypes: ["SCHOOL", "KINDERGARTEN"], caenPrefixes: ["85"] },
    TURISM:     { entityTypes: ["RESTAURANT", "CAFE", "HOTEL"], caenPrefixes: ["55", "56", "79"] },
    AGRICULTURA: { entityTypes: ["BUSINESS"], caenPrefixes: ["01", "10"] },
    PRODUCTIE:  { entityTypes: ["BUSINESS"], caenPrefixes: ["10", "14", "16", "23", "25", "31"] },
    SERVICII:   { entityTypes: ["SERVICE", "BUSINESS"], caenPrefixes: ["62", "69", "70", "71"] },
    ENERGIE:    { entityTypes: ["BUSINESS"], caenPrefixes: ["35"] },
    IMOBILIAR:  { entityTypes: ["BUSINESS"], caenPrefixes: ["41", "68"] },
  }

  const mapping = nicheEntityMap[nicheId] || sectorEntityMap[sectorId] || { entityTypes: ["BUSINESS"], caenPrefixes: [] }

  let count = 0

  // Contor din entități locale
  for (const type of mapping.entityTypes) {
    count += entityCounts[type] || 0
  }

  // Contor din firme per CAEN (mai precis)
  for (const [caen, firms] of Object.entries(firmsByCaen)) {
    if (mapping.caenPrefixes.some(prefix => caen.startsWith(prefix))) {
      count += firms
    }
  }

  return count
}

/**
 * Resurse disponibile — calculat din date teritoriale reale.
 * Verifică prezența resurselor concrete, nu hardcodat per regiune.
 */
function estimateResources(
  sectorId: string,
  territory: string,
  data: Array<{ category: string; subcategory: string | null; key: string; numericValue: number | null; value: string }>
): number {
  let score = 3 // bază neutră

  // Date demografice
  const popTotal = data.find(d => d.category === "POPULATION" && d.key === "total")?.numericValue || 0
  if (popTotal > 10000) score += 1

  // Resurse specifice per sector din datele crawlate
  const hasByKey = (keyword: string) => data.some(d =>
    d.key.toLowerCase().includes(keyword) || d.value.toLowerCase().includes(keyword)
  )
  const countByCategory = (cat: string) => data.filter(d => d.category === cat).length

  switch (sectorId) {
    case "AGRICULTURA":
      if (hasByKey("agricol") || hasByKey("arabil") || hasByKey("ferma")) score += 3
      if (hasByKey("apa") || hasByKey("iriga")) score += 1
      if (countByCategory("ECONOMY") > 3) score += 1 // diversitate economică
      break

    case "ENERGIE":
      if (hasByKey("solar") || hasByKey("iradiere")) score += 3
      if (hasByKey("eolian") || hasByKey("vant") || hasByKey("wind")) score += 2
      if (hasByKey("geotermal") || hasByKey("termal")) score += 2
      break

    case "TURISM":
      if (hasByKey("monument") || hasByKey("patrimoniu") || hasByKey("muzeu")) score += 2
      if (hasByKey("etnic") || hasByKey("tatar") || hasByKey("turc") || hasByKey("diversitate")) score += 2
      if (hasByKey("peisaj") || hasByKey("natural") || hasByKey("parc")) score += 1
      break

    case "SANATATE":
      // Resursa e LIPSA de ofertă + populația care are nevoie
      const elderly = data.filter(d => d.subcategory === "AGE_GROUPS" && parseInt(d.key.replace("age_", "")) >= 60)
        .reduce((s, d) => s + (d.numericValue || 0), 0)
      if (elderly > popTotal * 0.2) score += 2  // îmbătrânire = cerere
      if (countByCategory("HEALTH") < 3) score -= 1  // infra medicală slabă
      break

    case "EDUCATIE":
      const young = data.filter(d => d.subcategory === "AGE_GROUPS" && parseInt(d.key.replace("age_", "")) <= 29)
        .reduce((s, d) => s + (d.numericValue || 0), 0)
      if (young > popTotal * 0.3) score += 2  // populație tânără = cerere
      if (countByCategory("EDUCATION") > 2) score += 1
      break

    case "PRODUCTIE":
      if (hasByKey("agricol") || hasByKey("materie_prim")) score += 2
      if (countByCategory("BUSINESS") > 5) score += 1
      if (hasByKey("industrial") || hasByKey("zona_ind")) score += 1
      break

    case "SERVICII":
      if (countByCategory("INFRASTRUCTURE") > 5) score += 2  // infra bună = servicii posibile
      if (hasByKey("internet") || hasByKey("fibra") || hasByKey("digital")) score += 1
      break

    case "IMOBILIAR":
      if (hasByKey("teren") || hasByKey("constructi")) score += 1
      if (popTotal > 20000) score += 1
      break
  }

  return Math.min(10, Math.max(1, score))
}

/**
 * Barieră de intrare — rămâne sector-based (e universală, nu depinde de teritoriu).
 * Dar ajustăm dacă avem date despre infra locală.
 */
function estimateEntryEase(
  sectorId: string,
  nicheId: string,
  infraData?: Array<{ key: string; value: string }>
): number {
  const baseEase: Record<string, number> = {
    SERVICII: 8, TURISM: 7, EDUCATIE: 6, AGRICULTURA: 5,
    PRODUCTIE: 4, SANATATE: 3, ENERGIE: 3, IMOBILIAR: 3,
  }

  let ease = baseEase[sectorId] || 5

  // Ajustări din infrastructură locală
  if (infraData && infraData.length > 0) {
    const hasInternet = infraData.some(d => d.key.includes("internet") || d.key.includes("fibra"))
    const hasIndustrial = infraData.some(d => d.key.includes("industrial") || d.key.includes("zona_ind"))
    const hasTransport = infraData.some(d => d.key.includes("gara") || d.key.includes("autostrada") || d.key.includes("port"))

    if (hasInternet && (sectorId === "SERVICII" || sectorId === "EDUCATIE")) ease += 1
    if (hasIndustrial && sectorId === "PRODUCTIE") ease += 1
    if (hasTransport && sectorId === "PRODUCTIE") ease += 1
  }

  return Math.min(10, ease)
}

/**
 * Nivel transformare — detectat din CAEN-urile prezente în teritoriu.
 * CAEN-urile arată CE SE FACE deja: agricultura brută (01), procesare (10-11), retail (47), servicii (55-56).
 */
function estimateTransformLevel(
  sectorId: string,
  nicheId: string,
  entityCounts: Record<string, number>,
  firmsByCaen: Record<string, number>
): number {
  // Mapare CAEN → nivel de transformare
  const caenToLevel: Array<{ prefix: string; level: number; sector: string }> = [
    // Nivel 0-1: Extracție/rod brut
    { prefix: "01", level: 1, sector: "AGRICULTURA" },   // Agricultură
    { prefix: "02", level: 1, sector: "AGRICULTURA" },   // Silvicultură
    { prefix: "03", level: 1, sector: "AGRICULTURA" },   // Pescuit
    { prefix: "05", level: 1, sector: "ENERGIE" },       // Extracție cărbune
    { prefix: "06", level: 1, sector: "ENERGIE" },       // Extracție petrol/gaze
    // Nivel 2: Procesare primară
    { prefix: "10", level: 2, sector: "PRODUCTIE" },     // Industrie alimentară
    { prefix: "11", level: 2, sector: "PRODUCTIE" },     // Fabricare băuturi
    { prefix: "16", level: 2, sector: "PRODUCTIE" },     // Prelucrare lemn
    { prefix: "23", level: 2, sector: "PRODUCTIE" },     // Produse minerale nemetalice
    // Nivel 3: Producție/produs finit
    { prefix: "14", level: 3, sector: "PRODUCTIE" },     // Confecții
    { prefix: "25", level: 3, sector: "PRODUCTIE" },     // Produse metalice
    { prefix: "31", level: 3, sector: "PRODUCTIE" },     // Mobilă
    { prefix: "35", level: 3, sector: "ENERGIE" },       // Energie electrică
    // Nivel 4: Distribuție/comerț
    { prefix: "46", level: 4, sector: "SERVICII" },      // Comerț en-gros
    { prefix: "47", level: 4, sector: "SERVICII" },      // Comerț en-detail
    { prefix: "49", level: 4, sector: "SERVICII" },      // Transport
    // Nivel 5: Servicii
    { prefix: "55", level: 5, sector: "TURISM" },        // Hoteluri
    { prefix: "56", level: 5, sector: "TURISM" },        // Restaurante
    { prefix: "62", level: 5, sector: "SERVICII" },      // IT
    { prefix: "69", level: 5, sector: "SERVICII" },      // Contabilitate/juridic
    { prefix: "85", level: 5, sector: "EDUCATIE" },      // Educație
    { prefix: "86", level: 5, sector: "SANATATE" },      // Sănătate
    // Nivel 6: Experiență
    { prefix: "79", level: 6, sector: "TURISM" },        // Agenții turism
    { prefix: "90", level: 6, sector: "TURISM" },        // Activități creative
    { prefix: "91", level: 6, sector: "TURISM" },        // Biblioteci, muzee
    // Nivel 7: Cunoaștere/export
    { prefix: "72", level: 7, sector: "SERVICII" },      // Cercetare-dezvoltare
  ]

  // Găsim cel mai înalt nivel de CAEN prezent pentru sectorul respectiv
  let maxLevel = 0
  let hasCaenForSector = false

  for (const [caen, count] of Object.entries(firmsByCaen)) {
    if (count <= 0) continue
    for (const mapping of caenToLevel) {
      if (caen.startsWith(mapping.prefix)) {
        if (mapping.sector === sectorId || sectorId === "PRODUCTIE") {
          hasCaenForSector = true
          maxLevel = Math.max(maxLevel, mapping.level)
        }
      }
    }
  }

  // Fallback dacă nu avem date CAEN
  if (!hasCaenForSector) {
    const baseLevels: Record<string, number> = {
      AGRICULTURA: 1, TURISM: 1, PRODUCTIE: 2, SERVICII: 3,
      EDUCATIE: 3, SANATATE: 2, ENERGIE: 1, IMOBILIAR: 2,
    }
    return baseLevels[sectorId] || 2
  }

  return maxLevel
}

/**
 * Potențial de creștere — bază sectorială (trenduri naționale/UE)
 * + ajustare din date locale (demographics, infrastructure).
 */
function estimateGrowth(
  sectorId: string,
  nicheId: string,
  ageGroups?: Array<{ group: string; count: number }>,
  population?: number
): number {
  // Trenduri naționale/UE (acestea rămân — sunt macro)
  const baseGrowth: Record<string, number> = {
    ENERGIE: 9, TURISM: 8, EDUCATIE: 7, SANATATE: 8,
    SERVICII: 6, AGRICULTURA: 6, PRODUCTIE: 5, IMOBILIAR: 5,
  }

  let growth = baseGrowth[sectorId] || 5

  // Ajustări din date demografice locale
  if (ageGroups && population && population > 0) {
    const youngPct = ageGroups
      .filter(a => ["20-29", "30-39"].includes(a.group))
      .reduce((s, a) => s + a.count, 0) / population

    const elderlyPct = ageGroups
      .filter(a => parseInt(a.group) >= 60)
      .reduce((s, a) => s + a.count, 0) / population

    // Populație tânără = mai mult potențial pentru educație, IT, antreprenoriat
    if (youngPct > 0.2 && (sectorId === "EDUCATIE" || sectorId === "SERVICII")) growth += 1
    // Populație îmbătrânită = creștere sănătate, servicii vârstnici
    if (elderlyPct > 0.25 && sectorId === "SANATATE") growth += 1
    // Populație în scădere = imobiliare în scădere
    if (youngPct < 0.12 && sectorId === "IMOBILIAR") growth -= 1
  }

  return Math.min(10, Math.max(1, growth))
}
