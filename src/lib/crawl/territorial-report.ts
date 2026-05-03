/**
 * territorial-report.ts — Generator raport teritorial complet
 *
 * Produce un raport structurat per teritoriu:
 * - Scor vitalitate teritorială
 * - Nivel mediu transformare
 * - Balanță teritorială
 * - Resurse (4 categorii)
 * - Consum (6 categorii)
 * - Top gap-uri
 * - Top oportunități (cu L1 + L3)
 * - Lanț valoric per nișă recomandată
 */

import { prisma } from "@/lib/prisma"
import { analyzeTerritory } from "./territorial-analysis"
import { calculateTerritorialBalance } from "./territorial-balance"
import {
  SECTOR_TAXONOMY,
  getAllNichesFlat,
  calculateNicheRawScore,
} from "./sector-niche-taxonomy"
import {
  evaluateAllOpportunities,
  type EvaluatedOpportunity,
} from "./opportunity-filters"

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface TerritorialReport {
  territory: string
  generatedAt: string

  /** Scor global 0-10 */
  vitalityScore: number
  /** Nivel mediu transformare 0-7 */
  avgTransformLevel: number
  /** Balanță teritorială: % diferență (negativ = banii ies) */
  territorialBalance: number

  /** Resurse per categorie (0-100%) */
  resources: {
    natural: ResourceScore
    cultural: ResourceScore
    human: ResourceScore
    infrastructure: ResourceScore
  }

  /** Consum per categorie */
  consumption: ConsumptionCategory[]

  /** Top gap-uri ordonate per criticitate */
  topGaps: GapReport[]

  /** Sectoare cu nișele lor evaluate */
  sectors: SectorReport[]

  /** Lanțuri valorice pentru nișele recomandate */
  valueChains: ValueChainReport[]

  /** Punți recomandate imediat */
  recommendedBridges: BridgeRecommendation[]
}

interface ResourceScore {
  score: number         // 0-100
  label: string         // descriptiv
  details: string[]     // ce compune scorul
}

interface ConsumptionCategory {
  category: string
  localPct: number      // % satisfăcut local
  importPct: number     // % import din afară
  localizable: boolean  // AR PUTEA fi satisfăcut local?
  gap: string           // oportunitate
}

interface GapReport {
  name: string
  severity: "CRITIC" | "RIDICAT" | "MODERAT" | "SCAZUT"
  description: string
  affectedPopulation: number
  sectorId: string
}

interface SectorReport {
  sectorId: string
  sectorName: string
  sectorScore: number
  niches: NicheReport[]
}

interface NicheReport {
  nicheId: string
  nicheName: string
  rawScore: number
  finalScore: number
  ethicalScore: number
  status: string
  entryBarrier: string
  propagation: string
  references: string[]
}

interface ValueChainReport {
  nicheId: string
  nicheName: string
  sectorName: string
  /** Niveluri 0-7, fiecare cu status */
  levels: Array<{
    level: number
    name: string
    status: "EXISTA" | "PARTIAL" | "LIPSESTE"
    detail: string
  }>
  /** De la ce nivel trebuie punte */
  bridgeFromLevel: number
  investmentEstimate: string
  timeToResults: string
}

interface BridgeRecommendation {
  nicheId: string
  nicheName: string
  sectorName: string
  what: string
  why: string
  investment: string
  timeframe: string
  ethicalScore: number
  propagation: string
}

// ═══════════════════════════════════════════════════════════════
// GENERATOR RAPORT
// ═══════════════════════════════════════════════════════════════

export async function generateTerritorialReport(territory: string): Promise<TerritorialReport> {
  // Citim toate datele
  const [analysis, territorialData, entities] = await Promise.all([
    analyzeTerritory(territory),
    prisma.territorialData.findMany({ where: { territory } }),
    prisma.localEntity.findMany({ where: { territory, isActive: true } }),
  ])

  const popTotal = analysis.resources.population.total

  // ═══ RESURSE ═══
  const resources = calculateResourceScores(territorialData, entities)

  // ═══ CONSUM + BALANȚĂ (din date reale crawlate) ═══
  const balance = await calculateTerritorialBalance(territory)
  const consumption = balance.consumption.map(c => ({
    category: c.category,
    localPct: c.localPct,
    importPct: c.importPct,
    localizable: c.localizable,
    gap: c.gap,
  }))

  // ═══ NIVEL MEDIU TRANSFORMARE ═══
  const avgTransformLevel = calculateAvgTransformLevel(entities, territorialData)

  // ═══ BALANȚĂ TERITORIALĂ ═══
  const territorialBalance = balance.balancePct

  // ═══ SCOR VITALITATE ═══
  const resourceAvg = (resources.natural.score + resources.cultural.score + resources.human.score + resources.infrastructure.score) / 4
  const consumptionHealth = consumption.reduce((s, c) => s + c.localPct, 0) / Math.max(1, consumption.length)
  const vitalityScore = Math.round(
    (resourceAvg / 100 * 3 +          // 30% resurse
    consumptionHealth / 100 * 2 +      // 20% consum local
    avgTransformLevel / 7 * 2.5 +      // 25% nivel transformare
    Math.max(0, (50 + territorialBalance) / 100) * 2.5 // 25% balanță
    ) * 10
  ) / 10

  // ═══ GAPS ═══
  const topGaps = extractGaps(analysis, popTotal)

  // ═══ OPORTUNITĂȚI ═══
  const entityCounts: Record<string, number> = {}
  for (const e of entities) {
    entityCounts[e.type] = (entityCounts[e.type] || 0) + 1
  }

  const allNiches = getAllNichesFlat()
  const rawOpps = allNiches.map(niche => ({
    nicheId: niche.id,
    sectorId: niche.sectorId,
    sectorName: niche.sectorName,
    nicheName: niche.name,
    rawScore: calculateNicheRawScore({
      demand: Math.min(10, popTotal / 5000),
      supplyGap: 7, // default — rafinat per nișă în scoring dinamic
      resourceAvailability: resources[sectorToResourceKey(niche.sectorId)]?.score / 10 || 5,
      entryEase: 5,
      currentTransformLevel: avgTransformLevel,
      growthPotential: 6,
    }),
    references: niche.references || [],
  }))

  const evaluated = evaluateAllOpportunities(rawOpps)
  const approved = evaluated.filter(e => e.status === "APROBATA" || e.status === "CONDITIONATA")

  // ═══ SECTOARE ═══
  const sectorMap: Record<string, SectorReport> = {}
  for (const opp of approved) {
    if (!sectorMap[opp.sectorId]) {
      sectorMap[opp.sectorId] = {
        sectorId: opp.sectorId,
        sectorName: opp.sectorName,
        sectorScore: 0,
        niches: [],
      }
    }
    const rawOpp = rawOpps.find(r => r.nicheId === opp.nicheId)
    sectorMap[opp.sectorId].niches.push({
      nicheId: opp.nicheId,
      nicheName: opp.nicheName,
      rawScore: opp.rawScore,
      finalScore: opp.finalScore,
      ethicalScore: opp.ethical?.overallScore || 5,
      status: opp.status,
      entryBarrier: opp.legal.regulationLevel === "STRICT_REGLEMENTAT" ? "Mare" : opp.legal.regulationLevel === "REGLEMENTAT" ? "Medie" : "Mică",
      propagation: opp.ethical?.propagationMechanism?.substring(0, 150) || "",
      references: rawOpp?.references || [],
    })
  }

  for (const s of Object.values(sectorMap)) {
    const scores = s.niches.map(n => n.finalScore).filter(f => f > 0)
    s.sectorScore = scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : 0
  }

  const sectors = Object.values(sectorMap).sort((a, b) => b.sectorScore - a.sectorScore)

  // ═══ LANȚURI VALORICE (top 5 nișe) ═══
  const top5 = approved.slice(0, 5)
  const valueChains = top5.map(opp => buildValueChain(opp, entities, territorialData))

  // ═══ PUNȚI RECOMANDATE ═══
  const recommendedBridges = top5
    .filter(opp => opp.status === "APROBATA")
    .slice(0, 3)
    .map(opp => ({
      nicheId: opp.nicheId,
      nicheName: opp.nicheName,
      sectorName: opp.sectorName,
      what: `Dezvoltare ${opp.nicheName.toLowerCase()} în ${territory}`,
      why: `Scor final ${opp.finalScore}/10, cerere ridicată, gap de ofertă`,
      investment: opp.legal.regulationLevel === "STRICT_REGLEMENTAT" ? "Mare (capital + licențe)" : "Mică-medie (know-how + organizare)",
      timeframe: opp.legal.regulationLevel === "STRICT_REGLEMENTAT" ? "12-18 luni" : "3-6 luni",
      ethicalScore: opp.ethical?.overallScore || 5,
      propagation: opp.ethical?.propagationMechanism || "De definit",
    }))

  return {
    territory,
    generatedAt: new Date().toISOString(),
    vitalityScore,
    avgTransformLevel,
    territorialBalance,
    resources,
    consumption,
    topGaps,
    sectors,
    valueChains,
    recommendedBridges,
  }
}

// ═══════════════════════════════════════════════════════════════
// FUNCȚII HELPER
// ═══════════════════════════════════════════════════════════════

function calculateResourceScores(
  data: Array<{ category: string; subcategory: string | null; key: string; numericValue: number | null; value: string }>,
  entities: Array<{ type: string; category: string | null }>
): TerritorialReport["resources"] {
  // Resurse naturale — bazat pe date teritoriale de tip ECONOMY, INFRASTRUCTURE
  const hasAgriculture = data.some(d => d.category === "ECONOMY" && d.key.includes("agri"))
  const hasWater = data.some(d => d.key.includes("water") || d.key.includes("apa"))
  const naturalDetails: string[] = []
  let naturalScore = 50 // bază

  if (hasAgriculture) { naturalScore += 15; naturalDetails.push("Sol agricol fertil") }
  if (hasWater) { naturalScore += 10; naturalDetails.push("Surse de apă") }
  // Dobrogea-specific bonuses
  naturalDetails.push("Iradiere solară ridicată (Dobrogea)")
  naturalDetails.push("Potențial eolian")
  naturalScore += 13

  // Resurse culturale — bazat pe diversitate etnică, patrimoniu
  const ethnicData = data.filter(d => d.subcategory === "ETHNICITY")
  const culturalDetails: string[] = []
  let culturalScore = 30

  if (ethnicData.length > 2) { culturalScore += 20; culturalDetails.push(`Diversitate etnică: ${ethnicData.length} comunități`) }
  culturalDetails.push("Patrimoniu imaterial nevalorizat")
  culturalScore += 5

  // Resurse umane
  const popTotal = data.find(d => d.category === "POPULATION" && d.key === "total")?.numericValue || 0
  const businesses = data.find(d => d.key === "firms_total")?.numericValue || 0
  const humanDetails: string[] = []
  let humanScore = 30

  if (popTotal > 20000) { humanScore += 10; humanDetails.push(`Populație ${popTotal.toLocaleString()}`) }
  if (businesses > 100) { humanScore += 10; humanDetails.push(`${businesses} firme active`) }
  const youngPop = data.filter(d => d.subcategory === "AGE_GROUPS" && (d.key.includes("20") || d.key.includes("30")))
    .reduce((s, d) => s + (d.numericValue || 0), 0)
  if (youngPop > 5000) { humanDetails.push(`${youngPop} persoane 20-39 ani`) }
  else { humanScore -= 10; humanDetails.push("Migrație tineri — deficit forță de muncă") }

  // Infrastructură
  const infraData = data.filter(d => d.category === "INFRASTRUCTURE")
  const infraDetails: string[] = []
  let infraScore = 40

  const hasRailway = infraData.some(d => d.key.includes("rail") || d.key.includes("gara"))
  const hasHighway = infraData.some(d => d.key.includes("autostrada") || d.key.includes("highway"))
  if (hasRailway) { infraScore += 10; infraDetails.push("Nod feroviar") }
  if (hasHighway) { infraScore += 15; infraDetails.push("Acces autostradă") }
  infraDetails.push("Utilități parțiale (de evaluat acoperire)")

  return {
    natural: { score: Math.min(100, naturalScore), label: scoreLabel(naturalScore), details: naturalDetails },
    cultural: { score: Math.min(100, culturalScore), label: scoreLabel(culturalScore), details: culturalDetails },
    human: { score: Math.min(100, humanScore), label: scoreLabel(humanScore), details: humanDetails },
    infrastructure: { score: Math.min(100, infraScore), label: scoreLabel(infraScore), details: infraDetails },
  }
}

function scoreLabel(score: number): string {
  if (score >= 80) return "Excelent"
  if (score >= 60) return "Bun"
  if (score >= 40) return "Moderat"
  if (score >= 20) return "Slab"
  return "Critic"
}

function calculateConsumption(
  entities: Array<{ type: string; category: string | null }>,
  population: number
): ConsumptionCategory[] {
  const restaurants = entities.filter(e => e.type === "RESTAURANT" || e.type === "CAFE").length
  const shops = entities.filter(e => e.type === "SHOP" || e.type === "SUPERMARKET").length
  const doctors = entities.filter(e => e.type === "HOSPITAL" || e.type === "DOCTOR" || e.type === "CLINIC").length
  const schools = entities.filter(e => e.type === "SCHOOL" || e.type === "KINDERGARTEN").length

  return [
    {
      category: "Alimentar",
      localPct: Math.min(100, shops > 5 ? 40 : 20),
      importPct: shops > 5 ? 60 : 80,
      localizable: true,
      gap: "Procesare locală ar reduce importul cu 20-30%",
    },
    {
      category: "Servicii medicale",
      localPct: Math.min(100, doctors > 3 ? 40 : 15),
      importPct: doctors > 3 ? 60 : 85,
      localizable: true,
      gap: "Specialiști lipsesc — naveta la oraș mare",
    },
    {
      category: "Educație/Formare",
      localPct: Math.min(100, schools > 5 ? 60 : 30),
      importPct: schools > 5 ? 40 : 70,
      localizable: true,
      gap: "Formare profesională lipsește complet",
    },
    {
      category: "Energie",
      localPct: 10,  // majoritatea importată din rețea
      importPct: 90,
      localizable: true,
      gap: "Potențial solar + eolian neexploatat — prosumator/comunități energetice",
    },
    {
      category: "Produse finite",
      localPct: 15,
      importPct: 85,
      localizable: true,
      gap: "Se exportă materie primă, se importă produs finit — pierdere valoare",
    },
    {
      category: "Servicii digitale",
      localPct: 5,
      importPct: 95,
      localizable: false,
      gap: "Normal — servicii digitale sunt globale. Dar ecommerce local e oportunitate",
    },
  ]
}

function calculateAvgTransformLevel(
  entities: Array<{ type: string; category: string | null }>,
  data: Array<{ category: string; key: string; numericValue: number | null }>
): number {
  // Estimare: dacă sunt doar firme de producție primară → nivel 1
  // Dacă sunt și servicii, restaurante, turism → nivel 3+
  const businesses = entities.filter(e => e.type === "BUSINESS").length
  const services = entities.filter(e => e.type === "SERVICE" || e.type === "RESTAURANT").length
  const hasProcessing = data.some(d => d.key.includes("procesare") || d.key.includes("manufacturing"))

  if (services > 10 && hasProcessing) return 3.5
  if (services > 5) return 2.5
  if (businesses > 20) return 2.0
  return 1.5
}

function estimateTerritorialBalance(
  consumption: ConsumptionCategory[],
  entities: Array<{ type: string }>,
  analysis: Awaited<ReturnType<typeof analyzeTerritory>>
): number {
  // Balanță = ce se produce local - ce se importă
  // Simplist: media localPct - 50 (echilibru = 0)
  const avgLocal = consumption.reduce((s, c) => s + c.localPct, 0) / Math.max(1, consumption.length)
  return Math.round(avgLocal - 50)
}

function extractGaps(
  analysis: Awaited<ReturnType<typeof analyzeTerritory>>,
  popTotal: number
): GapReport[] {
  return analysis.gaps.map(g => ({
    name: g.need,
    severity: g.intensity >= 0.8 ? "CRITIC" : g.intensity >= 0.6 ? "RIDICAT" : g.intensity >= 0.4 ? "MODERAT" : "SCAZUT",
    description: `${g.currentSupply}. Oportunitate: ${g.opportunity}`,
    affectedPopulation: g.affectedPopulation,
    sectorId: gapToSector(g.need),
  }))
}

function gapToSector(need: string): string {
  if (need.includes("medicat") || need.includes("Sănătate") || need.includes("Farma")) return "SANATATE"
  if (need.includes("Educație") || need.includes("formare")) return "EDUCATIE"
  if (need.includes("aliment") || need.includes("restaur")) return "AGRICULTURA"
  if (need.includes("vârstnic")) return "SANATATE"
  if (need.includes("profesional")) return "EDUCATIE"
  return "SERVICII"
}

function sectorToResourceKey(sectorId: string): keyof TerritorialReport["resources"] {
  const map: Record<string, keyof TerritorialReport["resources"]> = {
    AGRICULTURA: "natural",
    ENERGIE: "natural",
    TURISM: "cultural",
    SANATATE: "human",
    EDUCATIE: "human",
    PRODUCTIE: "natural",
    SERVICII: "infrastructure",
    IMOBILIAR: "infrastructure",
  }
  return map[sectorId] || "infrastructure"
}

function buildValueChain(
  opp: EvaluatedOpportunity,
  entities: Array<{ type: string; category: string | null }>,
  data: Array<{ category: string; key: string }>
): ValueChainReport {
  // Pipeline spirală de transformare per nișă
  const LEVEL_NAMES = [
    "Rod brut / materie primă",
    "Recoltare / extracție",
    "Procesare primară",
    "Producție / produs finit",
    "Distribuție / vânzare",
    "Servicii / experiență directă",
    "Brand / experiență memorabilă",
    "Cunoaștere / export know-how",
  ]

  // Default: primele 2 niveluri există, restul lipsește
  const levels = LEVEL_NAMES.map((name, i) => ({
    level: i,
    name,
    status: (i <= 1 ? "EXISTA" : i === 2 ? "PARTIAL" : "LIPSESTE") as "EXISTA" | "PARTIAL" | "LIPSESTE",
    detail: getValueChainDetail(opp.sectorId, opp.nicheId, i),
  }))

  // Ajustări per sector
  if (opp.sectorId === "SANATATE") {
    levels[0].status = "PARTIAL" // trebuie specialiști
    levels[0].detail = "Nevoie există, resurse umane insuficiente"
  }
  if (opp.sectorId === "TURISM") {
    levels[0].status = "EXISTA"
    levels[0].detail = "Patrimoniu/resurse naturale disponibile"
    levels[1].status = "PARTIAL"
    levels[1].detail = "Documentare parțială, nu sistematică"
  }

  const bridgeFromLevel = levels.findIndex(l => l.status === "LIPSESTE")

  return {
    nicheId: opp.nicheId,
    nicheName: opp.nicheName,
    sectorName: opp.sectorName,
    levels,
    bridgeFromLevel: bridgeFromLevel >= 0 ? bridgeFromLevel : 7,
    investmentEstimate: opp.legal.regulationLevel === "STRICT_REGLEMENTAT" ? "Mare" : "Mică-medie",
    timeToResults: opp.legal.regulationLevel === "STRICT_REGLEMENTAT" ? "12-18 luni" : "3-6 luni",
  }
}

function getValueChainDetail(sectorId: string, nicheId: string, level: number): string {
  // Detalii contextuale per sector + nivel
  const details: Record<string, string[]> = {
    TURISM: [
      "Patrimoniu natural și cultural existent",
      "Documentare și inventariere parțială",
      "Pachete turistice de bază",
      "Produse turistice structurate",
      "Vizibilitate pe platforme (Booking, TripAdvisor)",
      "Experiență turistică completă",
      "Brand teritorial recunoscut",
      "Franciză / export model turistic",
    ],
    AGRICULTURA: [
      "Sol fertil, climă favorabilă, cultură tradițională",
      "Recoltare mecanizată / manuală",
      "Morărit, presare ulei, descojire",
      "Panificație, conserve, produse finite",
      "Rețea de distribuție (piețe, magazine, online)",
      "Restaurant / turism culinar / degustări",
      "Brand regional (IGP, DOC, organic)",
      "Export know-how agricol / școală de fermieri",
    ],
    SANATATE: [
      "Nevoia de sănătate — universală",
      "Identificare specialiști, recrutare",
      "Cabinet / clinică funcțională",
      "Servicii medicale complete",
      "Acces la distanță (telemedicină)",
      "Program prevenție / screening",
      "Centru medical regional de referință",
      "Model replicabil în alte localități",
    ],
    EDUCATIE: [
      "Nevoia de formare — tineri NEET, adulți",
      "Inventariere competențe necesare pe piață",
      "Curriculum adaptat / formare formatori",
      "Centru formare funcțional",
      "Parteneriate angajatori (practică, angajare)",
      "Mentorat + plasare profesională",
      "Centru de excelență / certificare regională",
      "Franciză educațională / export model",
    ],
  }

  return (details[sectorId] || details["SERVICII"])?.[level] || `Nivel ${level} — de definit`
}
