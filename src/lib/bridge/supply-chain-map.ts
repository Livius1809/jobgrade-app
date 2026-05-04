/**
 * supply-chain-map.ts — Hartă economică: Furnizori → Servicii intermediare → Piață
 *
 * Per teritoriu + sector, suprapune 3 straturi:
 *
 * 1. SUPPLY (furnizori): cine produce/oferă
 *    - Firme locale per CAEN (din crawl)
 *    - Oferte înregistrate (din BridgeOffer)
 *    - Producători din teritorii vecine (raza extinsă)
 *
 * 2. INTERMEDIARY (servicii intermediare): ce face legătura
 *    - Logistică (CAEN 49, 52): transport, depozitare
 *    - Distribuție (CAEN 46, 47): en-gros, en-detail
 *    - Procesare (CAEN 10-33): transformă materia primă
 *    - Servicii suport (CAEN 69, 70, 73): contabilitate, marketing, consultanță
 *
 * 3. DEMAND (piață de desfacere): cine cumpără/are nevoie
 *    - Nevoi înregistrate (din BridgeNeed)
 *    - Cerere estimată din demografie (din territorial-analysis)
 *    - Firme locale care consumă (CAEN complementare)
 *
 * Output: 3 layere suprapuse pe teritoriu, cu GPS și detalii
 */

import { prisma } from "@/lib/prisma"

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface SupplyChainMap {
  territory: string
  sector: SectorFilter
  boundingBox?: { minLat: number; maxLat: number; minLng: number; maxLng: number }

  /** Stratul 1: furnizori */
  supply: SupplyLayer
  /** Stratul 2: servicii intermediare */
  intermediary: IntermediaryLayer
  /** Stratul 3: piață de desfacere */
  demand: DemandLayer

  /** Lanțuri valorice detectate (furnizor → intermediar → piață) */
  valueChains: ValueChain[]

  /** Gap-uri în lanțul valoric (unde se rupe) */
  chainGaps: ChainGap[]

  /** Statistici agregate */
  stats: {
    totalSuppliers: number
    totalIntermediaries: number
    totalDemandPoints: number
    estimatedMarketSize: number // RON/an
    chainCompleteness: number  // 0-100% — cât din lanț există
  }
}

export interface SectorFilter {
  sectorId: string
  sectorName: string
  nicheId?: string
  nicheName?: string
  /** CAEN-uri asociate */
  supplyCaen: string[]     // producție
  intermediaryCaen: string[] // servicii intermediare
  demandCaen: string[]      // consumatori business
}

export interface SupplyPoint {
  id: string
  type: "ENTITY" | "OFFER"     // firmă crawlată sau ofertă înregistrată
  name: string
  category: string
  subcategory?: string
  latitude?: number | null
  longitude?: number | null
  address?: string
  // Detalii furnizor
  employees?: number
  revenue?: number             // CA anuală
  priceRange?: string
  deliveryType?: string
  qualityScore?: number | null
  isLocal: boolean             // din teritoriul selectat
  distanceKm?: number | null   // de la centrul teritoriului
}

export interface IntermediaryPoint {
  id: string
  name: string
  type: "LOGISTICA" | "DISTRIBUTIE" | "PROCESARE" | "SUPORT"
  category: string
  latitude?: number | null
  longitude?: number | null
  employees?: number
  /** Ce conectează (supply → demand) */
  connectsSupply: string[]     // CAEN-uri supply pe care le servește
  connectsDemand: string[]     // CAEN-uri demand pe care le servește
}

export interface DemandPoint {
  id: string
  type: "NEED" | "BUSINESS" | "DEMOGRAPHIC"
  name: string
  category: string
  latitude?: number | null
  longitude?: number | null
  // Detalii cerere
  employees?: number
  estimatedVolume?: number     // unități/an sau RON/an
  urgency?: string
  budget?: string
  population?: number          // persoane afectate (pt DEMOGRAPHIC)
}

export interface ValueChain {
  supplier: string             // nume furnizor
  intermediaries: string[]     // nume servicii intermediare
  market: string               // segment de piață
  completeness: number         // 0-100%
  description: string
}

export interface ChainGap {
  between: string              // "furnizor → procesare" sau "distribuție → piață"
  missingType: "LOGISTICA" | "DISTRIBUTIE" | "PROCESARE" | "SUPORT"
  description: string
  impact: string               // ce se pierde fără acest element
  opportunity: string          // oportunitate de business
}

interface SupplyLayer { total: number; points: SupplyPoint[] }
interface IntermediaryLayer { total: number; points: IntermediaryPoint[] }
interface DemandLayer { total: number; points: DemandPoint[] }

// ═══════════════════════════════════════════════════════════════
// MAPARE SECTOR → CAEN-uri per strat
// ═══════════════════════════════════════════════════════════════

const SECTOR_CAEN_MAP: Record<string, { supply: string[]; intermediary: string[]; demand: string[] }> = {
  AGRICULTURA: {
    supply: ["0111", "0113", "0121", "0141", "0147", "0150"],  // fermieri, crescători
    intermediary: ["1061", "1041", "1071", "4621", "4631", "4941", "5210"],  // morărit, en-gros cereale, transport
    demand: ["1071", "1082", "5610", "4711", "4721"],  // panificație, restaurante, supermarketuri
  },
  TURISM: {
    supply: ["5510", "5520", "5530", "5590", "9102", "9103", "9104", "9311"],  // hoteluri, muzee, grădini botanice, sport
    intermediary: ["7911", "7912", "7990", "4939", "7721"],  // agenții turism, transport pasageri
    demand: [],  // cererea vine din exterior — nu are CAEN specific
    // Turism religios/spiritual: supply include lăcașe de cult (non-CAEN, detectate din OSM: WORSHIP, MONASTERY, SHRINE, SPRING)
  },
  SANATATE: {
    supply: ["8621", "8622", "8623", "8690"],  // cabinete, laboratoare
    intermediary: ["4646", "4773", "8610"],  // distribuție farmaceutice, spitale
    demand: [],  // cererea e universală
  },
  EDUCATIE: {
    supply: ["8531", "8532", "8541", "8542", "8551", "8559"],  // formare profesională
    intermediary: ["7810", "7820"],  // recrutare, plasare forță muncă
    demand: [],  // cererea e din demografie
  },
  PRODUCTIE: {
    supply: ["1011", "1020", "1039", "1413", "1610", "2512", "3109"],  // fabrici diverse
    intermediary: ["4690", "4941", "5210", "5229", "7022"],  // en-gros, transport, depozitare, consultanță
    demand: ["4711", "4719", "4759", "4791"],  // retail, ecommerce
  },
  SERVICII: {
    supply: ["6201", "6202", "6920", "7022", "7111", "7120"],  // IT, contabilitate, consultanță
    intermediary: ["6311", "7310", "7320"],  // portale web, publicitate
    demand: [],  // cererea e din firme + persoane
  },
  ENERGIE: {
    supply: ["3511", "3514"],  // producție energie
    intermediary: ["3521", "3522", "3523", "4222"],  // distribuție, transport, instalații
    demand: [],  // cererea e universală
  },
  IMOBILIAR: {
    supply: ["4120", "4211"],  // construcții
    intermediary: ["6820", "7111", "4331", "4332", "4333"],  // agenții, arhitecți, finisaje
    demand: [],  // cererea din demografie
  },
}

// ═══════════════════════════════════════════════════════════════
// GENERATOR HARTĂ
// ═══════════════════════════════════════════════════════════════

export async function generateSupplyChainMap(
  territory: string,
  sectorId: string,
  nicheId?: string,
  includeNeighbors: boolean = true
): Promise<SupplyChainMap> {
  const caenMap = SECTOR_CAEN_MAP[sectorId] || { supply: [], intermediary: [], demand: [] }

  // Teritorii de căutat (principal + vecine)
  const territories = [territory.toUpperCase()]
  // TODO: adaugă teritorii vecine dacă includeNeighbors

  const [entities, bridgeOffers, bridgeNeeds, territorialData] = await Promise.all([
    prisma.localEntity.findMany({
      where: { territory: { in: territories }, isActive: true },
    }),
    prisma.bridgeOffer.findMany({
      where: { isActive: true, sectorId },
      include: { participant: { select: { alias: true, territory: true, latitude: true, longitude: true } } },
    }),
    prisma.bridgeNeed.findMany({
      where: { isActive: true, isSatisfied: false, sectorId },
      include: { participant: { select: { alias: true, territory: true, latitude: true, longitude: true } } },
    }),
    prisma.territorialData.findMany({
      where: { territory: territory.toUpperCase() },
    }),
  ])

  // Sector info
  const sectorName = getSectorName(sectorId)
  const sector: SectorFilter = {
    sectorId, sectorName,
    nicheId, nicheName: nicheId || undefined,
    supplyCaen: caenMap.supply,
    intermediaryCaen: caenMap.intermediary,
    demandCaen: caenMap.demand,
  }

  // ═══ SUPPLY LAYER ═══
  const supplyEntities = entities.filter(e =>
    e.category && caenMap.supply.some(c => e.category!.startsWith(c.substring(0, 2)))
  )
  const supplyOffers = bridgeOffers.filter(o =>
    o.participant.territory === territory.toUpperCase()
  )

  const supplyPoints: SupplyPoint[] = [
    ...supplyEntities.map(e => ({
      id: e.id,
      type: "ENTITY" as const,
      name: e.name,
      category: e.category || "",
      subcategory: e.subcategory || undefined,
      latitude: e.latitude,
      longitude: e.longitude,
      address: e.address || undefined,
      employees: e.employees || undefined,
      revenue: e.revenue ? Number(e.revenue) : undefined,
      isLocal: e.territory === territory.toUpperCase(),
      qualityScore: null,
    })),
    ...supplyOffers.map(o => ({
      id: o.id,
      type: "OFFER" as const,
      name: o.participant.alias,
      category: o.category,
      subcategory: o.description || undefined,
      latitude: o.participant.latitude,
      longitude: o.participant.longitude,
      priceRange: o.priceRange || undefined,
      deliveryType: o.deliveryType,
      qualityScore: o.qualityScore,
      isLocal: true,
    })),
  ]

  // ═══ INTERMEDIARY LAYER ═══
  const intermediaryEntities = entities.filter(e =>
    e.category && caenMap.intermediary.some(c => e.category!.startsWith(c.substring(0, 2)))
  )
  // Adăugăm servicii generice (logistică, transport) care servesc orice sector
  const genericIntermediaries = entities.filter(e =>
    e.category && ["49", "52", "46", "47", "69", "70"].some(c => e.category!.startsWith(c))
  )
  const allIntermediaries = [...new Map([...intermediaryEntities, ...genericIntermediaries].map(e => [e.id, e])).values()]

  const intermediaryPoints: IntermediaryPoint[] = allIntermediaries.map(e => ({
    id: e.id,
    name: e.name,
    type: classifyIntermediary(e.category || ""),
    category: e.category || "",
    latitude: e.latitude,
    longitude: e.longitude,
    employees: e.employees || undefined,
    connectsSupply: caenMap.supply,
    connectsDemand: caenMap.demand,
  }))

  // ═══ DEMAND LAYER ═══
  const demandPoints: DemandPoint[] = []

  // Din nevoi înregistrate
  for (const need of bridgeNeeds) {
    demandPoints.push({
      id: need.id,
      type: "NEED",
      name: need.participant.alias,
      category: need.category,
      latitude: need.participant.latitude,
      longitude: need.participant.longitude,
      urgency: need.urgency,
      budget: need.budget || undefined,
    })
  }

  // Din firme consumatoare (CAEN demand)
  if (caenMap.demand.length > 0) {
    const demandEntities = entities.filter(e =>
      e.category && caenMap.demand.some(c => e.category!.startsWith(c.substring(0, 2)))
    )
    for (const e of demandEntities) {
      demandPoints.push({
        id: e.id,
        type: "BUSINESS",
        name: e.name,
        category: e.category || "",
        latitude: e.latitude,
        longitude: e.longitude,
        employees: e.employees || undefined,
        estimatedVolume: e.revenue ? Number(e.revenue) * 0.3 : undefined, // ~30% din CA e achiziție materie primă
      })
    }
  }

  // Din demografie (cerere estimată)
  const popTotal = territorialData.find(d => d.category === "POPULATION" && d.key === "total")?.numericValue || 0
  if (popTotal > 0 && caenMap.demand.length === 0) {
    // Sectoare cu cerere universală (sănătate, educație, energie)
    demandPoints.push({
      id: `DEMO_${territory}_${sectorId}`,
      type: "DEMOGRAPHIC",
      name: `Cerere ${sectorName.toLowerCase()} — ${territory}`,
      category: sectorName,
      population: popTotal,
      estimatedVolume: estimateMarketSize(sectorId, popTotal),
    })
  }

  // ═══ VALUE CHAINS ═══
  const valueChains = detectValueChains(supplyPoints, intermediaryPoints, demandPoints, sectorId)

  // ═══ CHAIN GAPS ═══
  const chainGaps = detectChainGaps(supplyPoints, intermediaryPoints, demandPoints, sectorId)

  // ═══ STATS ═══
  const estimatedMarketSize = estimateMarketSize(sectorId, popTotal)
  const chainCompleteness = calculateChainCompleteness(supplyPoints, intermediaryPoints, demandPoints)

  // Bounding box
  const allLats = [...supplyPoints, ...intermediaryPoints, ...demandPoints]
    .map(p => p.latitude).filter((l): l is number => l !== null && l !== undefined)
  const allLngs = [...supplyPoints, ...intermediaryPoints, ...demandPoints]
    .map(p => p.longitude).filter((l): l is number => l !== null && l !== undefined)

  const boundingBox = allLats.length > 0 ? {
    minLat: Math.min(...allLats) - 0.02,
    maxLat: Math.max(...allLats) + 0.02,
    minLng: Math.min(...allLngs) - 0.02,
    maxLng: Math.max(...allLngs) + 0.02,
  } : undefined

  return {
    territory: territory.toUpperCase(),
    sector,
    boundingBox,
    supply: { total: supplyPoints.length, points: supplyPoints },
    intermediary: { total: intermediaryPoints.length, points: intermediaryPoints },
    demand: { total: demandPoints.length, points: demandPoints },
    valueChains,
    chainGaps,
    stats: {
      totalSuppliers: supplyPoints.length,
      totalIntermediaries: intermediaryPoints.length,
      totalDemandPoints: demandPoints.length,
      estimatedMarketSize,
      chainCompleteness,
    },
  }
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function getSectorName(sectorId: string): string {
  const names: Record<string, string> = {
    AGRICULTURA: "Agricultură", TURISM: "Turism", SANATATE: "Sănătate",
    EDUCATIE: "Educație", PRODUCTIE: "Producție", SERVICII: "Servicii",
    ENERGIE: "Energie", IMOBILIAR: "Imobiliar",
  }
  return names[sectorId] || sectorId
}

function classifyIntermediary(caen: string): IntermediaryPoint["type"] {
  if (caen.startsWith("49") || caen.startsWith("52")) return "LOGISTICA"
  if (caen.startsWith("46") || caen.startsWith("47")) return "DISTRIBUTIE"
  if (parseInt(caen) >= 10 && parseInt(caen) <= 33) return "PROCESARE"
  return "SUPORT"
}

function estimateMarketSize(sectorId: string, population: number): number {
  // Cheltuieli medii per persoană per an per sector (RON)
  const perCapita: Record<string, number> = {
    AGRICULTURA: 8400,   // alimentație ~700/lună
    SANATATE: 2400,      // sănătate ~200/lună
    EDUCATIE: 1800,      // educație ~150/lună
    ENERGIE: 2400,       // energie ~200/lună
    TURISM: 1200,        // turism ~100/lună (include și cerere externă)
    SERVICII: 3600,      // servicii diverse ~300/lună
    PRODUCTIE: 4800,     // produse non-alimentare ~400/lună
    IMOBILIAR: 7200,     // locuire ~600/lună
  }
  return Math.round(population * (perCapita[sectorId] || 3000))
}

function detectValueChains(
  supply: SupplyPoint[],
  intermediary: IntermediaryPoint[],
  demand: DemandPoint[],
  sectorId: string
): ValueChain[] {
  const chains: ValueChain[] = []

  if (supply.length > 0 && demand.length > 0) {
    const hasLogistics = intermediary.some(i => i.type === "LOGISTICA")
    const hasDistribution = intermediary.some(i => i.type === "DISTRIBUTIE")
    const hasProcessing = intermediary.some(i => i.type === "PROCESARE")

    const intermediaryNames = intermediary.slice(0, 3).map(i => i.name)
    const completeness = [
      supply.length > 0, hasLogistics || hasDistribution, demand.length > 0
    ].filter(Boolean).length / 3 * 100

    chains.push({
      supplier: supply.slice(0, 3).map(s => s.name).join(", "),
      intermediaries: intermediaryNames,
      market: demand.length > 0 ? `${demand.length} puncte de cerere` : "Cerere estimată din demografie",
      completeness: Math.round(completeness),
      description: `${supply.length} furnizori → ${intermediary.length} intermediari → ${demand.length} consumatori`,
    })
  }

  return chains
}

function detectChainGaps(
  supply: SupplyPoint[],
  intermediary: IntermediaryPoint[],
  demand: DemandPoint[],
  sectorId: string
): ChainGap[] {
  const gaps: ChainGap[] = []

  // Gap: furnizori fără logistică
  if (supply.length > 0 && !intermediary.some(i => i.type === "LOGISTICA")) {
    gaps.push({
      between: "furnizor → piață",
      missingType: "LOGISTICA",
      description: "Nu există servicii de transport/logistică locale",
      impact: "Furnizorul nu poate livra eficient către consumatori",
      opportunity: "Serviciu de curierat/transport local — conectare directă furnizor↔client",
    })
  }

  // Gap: furnizori fără distribuție
  if (supply.length > 0 && !intermediary.some(i => i.type === "DISTRIBUTIE")) {
    gaps.push({
      between: "furnizor → distribuție",
      missingType: "DISTRIBUTIE",
      description: "Nu există distribuitor local (en-gros sau retail specializat)",
      impact: "Produsele furnizorilor nu ajung în magazine locale",
      opportunity: "Magazin/platformă care agregă producția locală — marketplace local",
    })
  }

  // Gap: materie primă fără procesare (specific agricultură)
  if (sectorId === "AGRICULTURA" && supply.length > 0 && !intermediary.some(i => i.type === "PROCESARE")) {
    gaps.push({
      between: "materie primă → produs finit",
      missingType: "PROCESARE",
      description: "Materie primă exportată brut — nu există procesare locală",
      impact: "Valoarea adăugată pleacă din teritoriu (grâu exportat vs. pâine vândută)",
      opportunity: "Unitate de procesare (moară, brutărie, conserve) — multiplică valoarea 3-10x",
    })
  }

  // Gap: servicii fără suport business
  if (supply.length > 3 && !intermediary.some(i => i.type === "SUPORT")) {
    gaps.push({
      between: "furnizor → scalare",
      missingType: "SUPORT",
      description: "Lipsesc servicii suport (contabilitate, marketing, consultanță)",
      impact: "Furnizorii nu pot scala — rămân la nivel de subsistență",
      opportunity: "Servicii profesionale pentru IMM-uri locale — pachete accesibile",
    })
  }

  // Gap: cerere fără ofertă
  if (demand.length > 0 && supply.length === 0) {
    gaps.push({
      between: "cerere → zero furnizori",
      missingType: "LOGISTICA", // placeholder
      description: `${demand.length} puncte de cerere, zero furnizori locali`,
      impact: "Consumatorii sunt forțați să importe sau să se deplaseze",
      opportunity: "Primul furnizor local în acest sector — piață necontestată",
    })
  }

  return gaps
}

function calculateChainCompleteness(
  supply: SupplyPoint[],
  intermediary: IntermediaryPoint[],
  demand: DemandPoint[]
): number {
  let score = 0
  const maxScore = 5

  if (supply.length > 0) score += 1
  if (supply.length > 3) score += 0.5
  if (intermediary.some(i => i.type === "LOGISTICA")) score += 0.5
  if (intermediary.some(i => i.type === "DISTRIBUTIE")) score += 0.5
  if (intermediary.some(i => i.type === "PROCESARE")) score += 0.5
  if (intermediary.some(i => i.type === "SUPORT")) score += 0.5
  if (demand.length > 0) score += 1
  if (demand.length > 5) score += 0.5

  return Math.round(Math.min(100, (score / maxScore) * 100))
}
