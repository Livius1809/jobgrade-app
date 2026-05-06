/**
 * market-intelligence.ts — Inteligență de piață din Motorul Teritorial
 *
 * Furnizor de date pentru:
 * - B2B C3 (Competitivitate): competiție, piață, nișe, poziționare
 * - B2B C4 (Dezvoltare): trenduri teritoriale, adaptare, oportunități
 * - B2C Card 5 (Antreprenoriat): unde e cerere, ce lipsește, cum intri
 *
 * Preia date din crawl + analiza teritorială + supply chain map
 * și le formatează per context (B2B vs B2C).
 *
 * PRINCIPIU: motorul teritorial = sursă de inteligență, nu business separat.
 * Inteligența e aceeași — prezentarea se adaptează per destinatar.
 */

import { prisma } from "@/lib/prisma"
import { analyzeTerritory } from "@/lib/crawl/territorial-analysis"
import { calculateTerritorialBalance } from "@/lib/crawl/territorial-balance"
import { generateSupplyChainMap } from "@/lib/bridge/supply-chain-map"
import {
  SECTOR_TAXONOMY,
  getAllNichesFlat,
  calculateNicheRawScore,
} from "@/lib/crawl/sector-niche-taxonomy"
import { evaluateAllOpportunities } from "@/lib/crawl/opportunity-filters"

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

/** Inteligență de piață pentru B2B C3 (Competitivitate) */
export interface C3MarketIntelligence {
  territory: string
  sector: string
  /** Competiția directă (firme cu CAEN similar) */
  competition: {
    directCompetitors: number
    totalEmployees: number
    totalRevenue: number
    avgRevenuePerFirm: number
    topCompetitors: Array<{ name: string; employees: number; revenue: number }>
    marketConcentration: "FRAGMENTATA" | "MODERATA" | "CONCENTRATA"
  }
  /** Piața de desfacere */
  market: {
    estimatedSize: number        // RON/an
    localDemandPoints: number    // cereri înregistrate
    demographicDemand: number    // cerere estimată din demografie
    growthTrend: "CRESTERE" | "STABIL" | "SCADERE"
    unmetNeeds: string[]         // nevoi neacoperite = oportunități
  }
  /** Poziționare */
  positioning: {
    supplyGapScore: number       // 0-10 — cât de mare e gap-ul
    nicheOpportunities: Array<{
      niche: string
      score: number
      description: string
      entryBarrier: string
    }>
    differentiators: string[]    // ce te-ar diferenția
  }
  /** Lanțul valoric */
  valueChain: {
    chainCompleteness: number    // 0-100%
    missingLinks: string[]       // ce lipsește
    intermediaries: number       // servicii intermediare disponibile
  }
  /** Recomandări strategice */
  recommendations: string[]
}

/** Inteligență de piață pentru B2B C4 (Dezvoltare) */
export interface C4DevelopmentIntelligence {
  territory: string
  /** Trenduri teritoriale care afectează organizația */
  territorialTrends: Array<{
    indicator: string
    direction: "CRESTERE" | "STABIL" | "SCADERE"
    impact: string             // ce înseamnă pentru organizație
    adaptation: string         // ce trebuie să facă organizația
  }>
  /** Evoluția forței de muncă locale */
  workforceEvolution: {
    youngPopulationTrend: string
    skillsAvailable: string[]
    skillsGap: string[]
    migrationRisk: string
  }
  /** Oportunități de dezvoltare din piață */
  marketDrivenDevelopment: Array<{
    area: string
    opportunity: string
    investmentRequired: string
    timeframe: string
  }>
  /** Riscuri teritoriale */
  risks: Array<{
    risk: string
    severity: "RIDICAT" | "MODERAT" | "SCAZUT"
    mitigation: string
  }>
  /** Recomandări pentru plan de dezvoltare */
  recommendations: string[]
}

/** Inteligență de piață pentru B2C Card 5 (Antreprenoriat) */
export interface Card5EntrepreneurIntelligence {
  territory: string
  participantProfile: string
  /** Top oportunități personalizate */
  opportunities: Array<{
    sector: string
    niche: string
    whyForYou: string          // de ce se potrivește cu profilul tău
    marketSize: number         // RON/an
    competitors: number
    entryBarrier: string
    investmentEstimate: string
    timeToFirstRevenue: string
    ethicalScore: number
    propagation: string        // cum se auto-propagă Binele
  }>
  /** Supply chain gata — ce există deja ca suport */
  existingSupport: {
    intermediaries: number     // servicii logistică/distribuție deja prezente
    potentialPartners: number  // furnizori complementari
    gaps: string[]             // ce lipsește (oportunitate și risc)
  }
  /** Pași concreți */
  actionPlan: Array<{
    step: number
    action: string
    detail: string
    estimatedCost: string
    estimatedTime: string
  }>
  /** Avertismente etice */
  ethicalWarnings: string[]
  /** Resurse JobGrade disponibile */
  jobgradeResources: string[]
}

// ═══════════════════════════════════════════════════════════════
// B2B C3 — COMPETITIVITATE
// ═══════════════════════════════════════════════════════════════

/**
 * Generează inteligență de piață pentru un client B2B.
 * Input: teritoriul clientului + sectorul/CAEN-ul principal.
 */
export async function generateC3Intelligence(
  territory: string,
  companyCaen: string,
  companyName?: string
): Promise<C3MarketIntelligence> {
  const sectorId = caenToSector(companyCaen)

  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

  const [entities, territorialData, supplyChain, currentEntityCount, pastEntityCount] = await Promise.all([
    prisma.localEntity.findMany({ where: { territory, isActive: true } }),
    prisma.territorialData.findMany({ where: { territory } }),
    generateSupplyChainMap(territory, sectorId),
    prisma.localEntity.count({
      where: { territory, isActive: true, type: "BUSINESS" },
    }),
    prisma.localEntity.count({
      where: { territory, isActive: true, type: "BUSINESS", crawledAt: { lt: threeMonthsAgo } },
    }),
  ])

  const popTotal = territorialData.find(d => d.category === "POPULATION" && d.key === "total")?.numericValue || 0

  // Competiție directă (firme cu CAEN similar)
  const caen2 = companyCaen.substring(0, 2)
  const competitors = entities.filter(e =>
    e.type === "BUSINESS" && e.category?.startsWith(caen2) &&
    e.name !== companyName
  )

  const totalCompRevenue = competitors.reduce((s, c) => s + (c.revenue ? Number(c.revenue) : 0), 0)
  const totalCompEmployees = competitors.reduce((s, c) => s + (c.employees || 0), 0)

  const topCompetitors = competitors
    .sort((a, b) => (b.employees || 0) - (a.employees || 0))
    .slice(0, 5)
    .map(c => ({ name: c.name, employees: c.employees || 0, revenue: c.revenue ? Number(c.revenue) : 0 }))

  const marketConcentration =
    competitors.length <= 3 ? "CONCENTRATA" :
    competitors.length <= 10 ? "MODERATA" :
    "FRAGMENTATA"

  // Piața
  const estimatedMarketSize = popTotal * getPerCapitaSpend(sectorId)
  const localDemandPoints = await prisma.bridgeNeed.count({
    where: { sectorId, isActive: true, isSatisfied: false },
  })

  const unmetNeeds = supplyChain.chainGaps.map(g => g.opportunity)

  // Nișe disponibile
  const allNiches = getAllNichesFlat().filter(n => n.sectorId === sectorId)
  const nicheScores = allNiches.map(n => ({
    niche: n.name,
    score: calculateNicheRawScore({
      demand: Math.min(10, popTotal / 5000),
      supplyGap: 7,
      resourceAvailability: 5,
      entryEase: 5,
      currentTransformLevel: 2,
      growthPotential: 6,
    }),
    description: n.description,
    entryBarrier: "Medie",
  })).sort((a, b) => b.score - a.score).slice(0, 5)

  // Diferențiatori
  const differentiators: string[] = []
  if (competitors.length < 3) differentiators.push("Piață cu competiție redusă — avantaj de primă mișcare")
  if (supplyChain.stats.chainCompleteness < 50) differentiators.push("Lanț valoric incomplet — poți fi cel care completează")
  if (unmetNeeds.length > 0) differentiators.push(`${unmetNeeds.length} nevoi neacoperite — specializare pe nișă descoperită`)

  // Recomandări
  const recommendations: string[] = []
  if (marketConcentration === "FRAGMENTATA") {
    recommendations.push("Piață fragmentată — diferențierea prin calitate și servicii post-vânzare e cheia")
  }
  if (localDemandPoints > 0) {
    recommendations.push(`${localDemandPoints} cereri active pe platformă — conectare directă posibilă`)
  }
  if (supplyChain.chainGaps.length > 0) {
    recommendations.push(`Gap-uri în lanțul valoric: ${supplyChain.chainGaps[0].opportunity}`)
  }
  recommendations.push("Monitorizează trendurile teritoriale trimestrial — piața se schimbă")

  return {
    territory,
    sector: sectorId,
    competition: {
      directCompetitors: competitors.length,
      totalEmployees: totalCompEmployees,
      totalRevenue: totalCompRevenue,
      avgRevenuePerFirm: competitors.length > 0 ? Math.round(totalCompRevenue / competitors.length) : 0,
      topCompetitors,
      marketConcentration,
    },
    market: {
      estimatedSize: estimatedMarketSize,
      localDemandPoints,
      demographicDemand: popTotal,
      growthTrend: calculateGrowthTrend(currentEntityCount, pastEntityCount),
      unmetNeeds,
    },
    positioning: {
      supplyGapScore: Math.min(10, Math.max(0, 10 - competitors.length)),
      nicheOpportunities: nicheScores,
      differentiators,
    },
    valueChain: {
      chainCompleteness: supplyChain.stats.chainCompleteness,
      missingLinks: supplyChain.chainGaps.map(g => g.description),
      intermediaries: supplyChain.stats.totalIntermediaries,
    },
    recommendations,
  }
}

// ═══════════════════════════════════════════════════════════════
// B2B C4 — DEZVOLTARE
// ═══════════════════════════════════════════════════════════════

/**
 * Inteligență teritorială pentru planul de dezvoltare organizațional.
 */
export async function generateC4Intelligence(
  territory: string,
  companyCaen: string
): Promise<C4DevelopmentIntelligence> {
  const [territorialData, balance] = await Promise.all([
    prisma.territorialData.findMany({ where: { territory } }),
    calculateTerritorialBalance(territory),
  ])

  const popTotal = territorialData.find(d => d.category === "POPULATION" && d.key === "total")?.numericValue || 0

  // Grupe vârstă
  const ageGroups = territorialData
    .filter(d => d.subcategory === "AGE_GROUPS")
    .map(d => ({ group: d.key.replace("age_", ""), count: d.numericValue || 0 }))

  const young = ageGroups.filter(a => ["20-29", "30-39"].includes(a.group)).reduce((s, a) => s + a.count, 0)
  const elderly = ageGroups.filter(a => parseInt(a.group) >= 60).reduce((s, a) => s + a.count, 0)

  // Trenduri teritoriale
  const trends: C4DevelopmentIntelligence["territorialTrends"] = []

  if (young < popTotal * 0.15) {
    trends.push({
      indicator: "Populație tânără în scădere",
      direction: "SCADERE",
      impact: "Dificultăți de recrutare pe termen mediu",
      adaptation: "Investiți în retenție, formare internă și remote work pentru a atrage talent din alte zone",
    })
  }

  if (elderly > popTotal * 0.25) {
    trends.push({
      indicator: "Îmbătrânirea populației",
      direction: "CRESTERE",
      impact: "Pierdere expertiză (pensionări) + creștere cerere servicii vârstnici",
      adaptation: "Programe de transfer cunoaștere senior→junior, documentare know-how",
    })
  }

  if (balance.balancePct < -10) {
    trends.push({
      indicator: "Balanță teritorială negativă",
      direction: "SCADERE",
      impact: "Banii pleacă din teritoriu — puterea de cumpărare locală scade",
      adaptation: "Diversificați clienții (nu doar locali) sau contribuiți la procesare locală care reține valoare",
    })
  }

  // Forța de muncă
  const laborData = territorialData.filter(d => d.category === "LABOR")
  const unemployment = laborData.find(d => d.key === "unemployment_rate")?.numericValue

  const workforceEvolution = {
    youngPopulationTrend: young > popTotal * 0.2 ? "Stabilă" : young > popTotal * 0.15 ? "În scădere ușoară" : "Critică — risc de depopulare",
    skillsAvailable: detectAvailableSkills(territorialData),
    skillsGap: detectSkillsGap(companyCaen, territorialData),
    migrationRisk: young < popTotal * 0.15 ? "Ridicat — tinerii pleacă" : "Moderat",
  }

  // Oportunități de dezvoltare din piață
  const marketDriven: C4DevelopmentIntelligence["marketDrivenDevelopment"] = []

  for (const sector of balance.selfSufficiency) {
    if (sector.direction === "IMPORTATOR" && sector.sufficiencyPct < 50) {
      marketDriven.push({
        area: sector.sector,
        opportunity: `Teritoriul importă ${100 - sector.sufficiencyPct}% din ${sector.sector.toLowerCase()} — puteți prelua intern`,
        investmentRequired: "Medie",
        timeframe: "6-12 luni",
      })
    }
  }

  // Riscuri
  const risks: C4DevelopmentIntelligence["risks"] = []
  if (workforceEvolution.migrationRisk.includes("Ridicat")) {
    risks.push({ risk: "Pierdere forță de muncă calificată", severity: "RIDICAT", mitigation: "Pachet retenție + remote work + reconversie locală" })
  }
  if (balance.balancePct < -20) {
    risks.push({ risk: "Economie locală în contracție", severity: "RIDICAT", mitigation: "Diversificare piață + export + servicii online" })
  }

  // Recomandări
  const recommendations: string[] = []
  recommendations.push("Integrați datele teritoriale în planificarea strategică trimestrială")
  if (marketDriven.length > 0) {
    recommendations.push(`${marketDriven.length} oportunități de internalizare detectate — analizați fezabilitatea`)
  }
  if (workforceEvolution.skillsGap.length > 0) {
    recommendations.push(`Gap competențe: ${workforceEvolution.skillsGap.join(", ")} — plan formare profesională`)
  }

  return {
    territory,
    territorialTrends: trends,
    workforceEvolution,
    marketDrivenDevelopment: marketDriven,
    risks,
    recommendations,
  }
}

// ═══════════════════════════════════════════════════════════════
// B2C CARD 5 — ANTREPRENORIAT TRANSFORMAȚIONAL
// ═══════════════════════════════════════════════════════════════

/**
 * Ghid personalizat de antreprenoriat pentru un participant B2C.
 * Preia inteligența teritorială + profilul personal → oportunități concrete.
 */
export async function generateCard5Intelligence(
  participantId: string,
  preferredTerritory?: string
): Promise<Card5EntrepreneurIntelligence> {
  const participant = await prisma.bridgeParticipant.findUnique({
    where: { id: participantId },
    include: { offers: true, needs: true },
  })

  if (!participant) throw new Error("Participant not found")

  const territory = (preferredTerritory || participant.territory).toUpperCase()

  // Profil
  const profile = `${participant.status}, ${participant.ageRange || "vârstă nedeclarată"}, ${territory}`

  // Analiză teritorială
  const [analysis, supplyChain, territorialData, allEntities] = await Promise.all([
    analyzeTerritory(territory),
    generateSupplyChainMap(territory, "SERVICII"), // default — rafinăm per oportunitate
    prisma.territorialData.findMany({ where: { territory } }),
    prisma.localEntity.findMany({ where: { territory, isActive: true, type: "BUSINESS" } }),
  ])

  const popTotal = analysis.resources.population.total

  // Evaluăm TOATE oportunitățile și le filtrăm pentru profilul participantului
  const allNiches = getAllNichesFlat()
  const rawOpps = allNiches.map(n => ({
    nicheId: n.id,
    sectorId: n.sectorId,
    sectorName: n.sectorName,
    nicheName: n.name,
    rawScore: calculateNicheRawScore({
      demand: Math.min(10, popTotal / 5000),
      supplyGap: 7,
      resourceAvailability: 5,
      entryEase: 5,
      currentTransformLevel: 2,
      growthPotential: 6,
    }),
  }))

  const evaluated = evaluateAllOpportunities(rawOpps)
  const approved = evaluated.filter(e => e.status === "APROBATA").slice(0, 10)

  // Personalizare per profil
  const opportunities = approved.map(opp => {
    const whyForYou = generateWhyForYou(opp, participant)
    const estimateInvestment = opp.legal.regulationLevel === "STRICT_REGLEMENTAT"
      ? "50.000-200.000 RON (capital + licențe)"
      : opp.legal.regulationLevel === "REGLEMENTAT"
        ? "10.000-50.000 RON (echipament + autorizații)"
        : "2.000-10.000 RON (minim, servicii)"

    return {
      sector: opp.sectorName,
      niche: opp.nicheName,
      whyForYou,
      marketSize: popTotal * getPerCapitaSpend(opp.sectorId),
      competitors: countLocalCompetitors(allEntities, opp.sectorId),
      entryBarrier: opp.legal.regulationLevel === "STRICT_REGLEMENTAT" ? "Mare" : opp.legal.regulationLevel === "REGLEMENTAT" ? "Medie" : "Mică",
      investmentEstimate: estimateInvestment,
      timeToFirstRevenue: opp.legal.regulationLevel === "STRICT_REGLEMENTAT" ? "6-12 luni" : "1-3 luni",
      ethicalScore: opp.ethical?.overallScore || 5,
      propagation: opp.ethical?.propagationMechanism?.substring(0, 200) || "",
    }
  })

  // Suport existent
  const existingSupport = {
    intermediaries: supplyChain.stats.totalIntermediaries,
    potentialPartners: supplyChain.supply.total,
    gaps: supplyChain.chainGaps.map(g => g.description),
  }

  // Plan de acțiune generic (personalizat de Claude în sesiunea de coaching)
  const actionPlan = [
    { step: 1, action: "Validare idee", detail: "Verifică dacă nevoia pe care o acoperi e reală — vorbește cu 10 potențiali clienți", estimatedCost: "0 RON", estimatedTime: "1-2 săptămâni" },
    { step: 2, action: "Plan de afaceri minimal", detail: "O pagină: ce oferi, cui, la ce preț, cum ajungi la ei", estimatedCost: "0 RON", estimatedTime: "2-3 zile" },
    { step: 3, action: "Aspecte legale", detail: "Înregistrare PFA/SRL, autorizații specifice sectorului", estimatedCost: "500-2.000 RON", estimatedTime: "2-4 săptămâni" },
    { step: 4, action: "Primul client", detail: "Oferă serviciul/produsul la preț redus sau gratuit primului client — validare reală", estimatedCost: "Variabil", estimatedTime: "1-2 săptămâni" },
    { step: 5, action: "Feedback și ajustare", detail: "Ce a funcționat? Ce nu? Ajustează înainte să scalezi", estimatedCost: "0 RON", estimatedTime: "1 săptămână" },
    { step: 6, action: "Primii 5 clienți", detail: "Repetă cu ajustările. La 5 clienți mulțumiți ai un business viabil", estimatedCost: "Variabil", estimatedTime: "1-3 luni" },
  ]

  // Avertismente etice
  const ethicalWarnings: string[] = []
  for (const opp of opportunities) {
    if (opp.ethicalScore < 7) {
      ethicalWarnings.push(`${opp.niche}: scor etic ${opp.ethicalScore}/10 — verifică condițiile etice înainte de a investi`)
    }
  }
  ethicalWarnings.push("Nu vindem iluzii: antreprenoriatul e greu. Datele te ajută să alegi inteligent, nu garantează succesul.")

  // Resurse JobGrade
  const jobgradeResources = [
    "Card 3 (Rol profesional) — validare competențe pe care le aduci în afacere",
    "C1 (Organizare) — structurare business de la zero cu JobGrade pe propria firmă",
    "C2 (Conformitate) — grilă salarială corectă de la primul angajat",
    "Matching platform — conectare directă cu primii clienți din teritoriu",
    "Raport teritorial — monitorizare piață în timp real",
  ]

  return {
    territory,
    participantProfile: profile,
    opportunities,
    existingSupport,
    actionPlan,
    ethicalWarnings,
    jobgradeResources,
  }
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Count entities in the same territory with a category matching the sector's CAEN prefix.
 */
function countLocalCompetitors(
  entities: Array<{ category: string | null }>,
  sectorId: string
): number {
  const sectorCaenPrefixes: Record<string, string[]> = {
    AGRICULTURA: ["01", "02", "03"],
    SANATATE: ["86", "87", "88"],
    EDUCATIE: ["85"],
    ENERGIE: ["05", "06", "35", "36", "37", "38", "39"],
    TURISM: ["55", "56", "90", "91", "92", "93"],
    SERVICII: ["45", "46", "47", "49", "50", "51", "52", "53", "58", "59", "60", "61", "62", "63", "69", "70", "71", "72", "73", "74", "75", "77", "78", "79", "80", "81", "82"],
    PRODUCTIE: ["10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31", "32", "33"],
    IMOBILIAR: ["41", "42", "43", "68"],
  }
  const prefixes = sectorCaenPrefixes[sectorId] || []
  if (prefixes.length === 0) return 0
  return entities.filter(e =>
    e.category && prefixes.some(p => e.category!.startsWith(p))
  ).length
}

/**
 * Compare current entity count vs count from 3 months ago.
 * If new entities appeared (current > past), market is growing.
 */
function calculateGrowthTrend(
  currentCount: number,
  pastCount: number
): "CRESTERE" | "STABIL" | "SCADERE" {
  if (pastCount === 0) return currentCount > 0 ? "CRESTERE" : "STABIL"
  const ratio = currentCount / pastCount
  if (ratio > 1.05) return "CRESTERE"
  if (ratio < 0.95) return "SCADERE"
  return "STABIL"
}

function caenToSector(caen: string): string {
  const c2 = parseInt(caen.substring(0, 2))
  if (c2 >= 1 && c2 <= 3) return "AGRICULTURA"
  if (c2 >= 5 && c2 <= 9) return "ENERGIE"
  if (c2 >= 10 && c2 <= 33) return "PRODUCTIE"
  if (c2 >= 35 && c2 <= 39) return "ENERGIE"
  if (c2 >= 41 && c2 <= 43) return "IMOBILIAR"
  if (c2 >= 45 && c2 <= 47) return "SERVICII"
  if (c2 >= 49 && c2 <= 53) return "SERVICII"
  if (c2 >= 55 && c2 <= 56) return "TURISM"
  if (c2 >= 58 && c2 <= 63) return "SERVICII"
  if (c2 >= 69 && c2 <= 75) return "SERVICII"
  if (c2 >= 77 && c2 <= 82) return "SERVICII"
  if (c2 === 85) return "EDUCATIE"
  if (c2 >= 86 && c2 <= 88) return "SANATATE"
  if (c2 >= 90 && c2 <= 93) return "TURISM"
  return "SERVICII"
}

function getPerCapitaSpend(sectorId: string): number {
  const spend: Record<string, number> = {
    AGRICULTURA: 8400, SANATATE: 2400, EDUCATIE: 1800, ENERGIE: 2400,
    TURISM: 1200, SERVICII: 3600, PRODUCTIE: 4800, IMOBILIAR: 7200,
  }
  return spend[sectorId] || 3000
}

function detectAvailableSkills(data: Array<{ category: string; subcategory: string | null; key: string }>): string[] {
  const skills: string[] = []
  const sectors = data.filter(d => d.subcategory === "SECTORS").map(d => d.key.replace("caen_", ""))

  if (sectors.some(s => s.startsWith("01"))) skills.push("Agricultură")
  if (sectors.some(s => s.startsWith("10") || s.startsWith("11"))) skills.push("Procesare alimentară")
  if (sectors.some(s => s.startsWith("41") || s.startsWith("42"))) skills.push("Construcții")
  if (sectors.some(s => s.startsWith("62"))) skills.push("IT")
  if (sectors.some(s => s.startsWith("85"))) skills.push("Educație")
  if (sectors.some(s => s.startsWith("86"))) skills.push("Sănătate")

  return skills.length > 0 ? skills : ["Date insuficiente — crawling necesar"]
}

function detectSkillsGap(companyCaen: string, data: Array<{ category: string; key: string }>): string[] {
  const gaps: string[] = []
  const sectorId = caenToSector(companyCaen)

  // Verificăm dacă sectorul companiei are suficientă forță de muncă locală
  const laborData = data.filter(d => d.category === "LABOR")
  if (laborData.length === 0) {
    gaps.push("Date forță de muncă insuficiente — recomandăm crawling AJOFM")
  }

  // Gap-uri generice per sector
  if (sectorId === "SERVICII" || sectorId === "PRODUCTIE") {
    gaps.push("Competențe digitale (IT, ecommerce, automatizare)")
  }
  if (sectorId === "SANATATE") {
    gaps.push("Specialiști medicali (deficit național)")
  }

  return gaps
}

function generateWhyForYou(opp: any, participant: any): string {
  const reasons: string[] = []

  if (participant.status === "ANTREPRENOR") {
    reasons.push("Ai experiență antreprenorială — diversificare naturală")
  }
  if (participant.status === "LIBER_PROFESIONIST") {
    reasons.push("Deja independent — trecere la business e pasul următor")
  }
  if (participant.status === "ANGAJAT" && participant.hierarchy === "TOP") {
    reasons.push("Experiență de management — știi să conduci echipe")
  }
  if (participant.status === "SOMER") {
    reasons.push("Oportunitate de a crea propriul loc de muncă")
  }

  // Competențe din ofertele existente
  if (participant.offers?.length > 0) {
    const hasRelated = participant.offers.some((o: any) => o.sectorId === opp.sectorId)
    if (hasRelated) reasons.push("Ai competențe directe în acest sector")
  }

  if (reasons.length === 0) {
    reasons.push("Oportunitate identificată în teritoriul tău — barieră de intrare accesibilă")
  }

  return reasons.join(". ") + "."
}
