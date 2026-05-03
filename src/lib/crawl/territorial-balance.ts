/**
 * territorial-balance.ts — Balanță teritorială + consum real din date crawlate
 *
 * Balanță = câți bani rămân în teritoriu vs. câți pleacă.
 *
 * Formula:
 *   INTRĂRI = CA firme locale + salarii angajați locali + pensii + subvenții + turism incoming
 *   IEȘIRI  = import bunuri/servicii + naveta out + achiziții extra-teritoriu + taxe centrale
 *   BALANȚĂ = (INTRĂRI - IEȘIRI) / INTRĂRI × 100
 *
 * Pozitiv = teritoriul reține valoare. Negativ = banii se scurg.
 *
 * Consumul real se calculează din:
 *   1. Date INS (cheltuieli medii per decilă venituri per județ)
 *   2. Entități locale (ce furnizori EXISTĂ vs. ce LIPSEȘTE)
 *   3. CAEN-uri prezente (ce se PRODUCE local)
 *   4. Diferența = ce se importă
 */

import { prisma } from "@/lib/prisma"
import { CONSUMPTION_CATEGORIES } from "./consumption-analysis"

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface TerritorialBalance {
  territory: string

  /** Intrări estimate (RON/an) */
  inflows: {
    localBusinessRevenue: number    // CA firme locale
    estimatedWages: number          // salarii (din angajați × salariu mediu județean)
    estimatedPensions: number       // pensii (din vârstnici × pensie medie)
    estimatedSubsidies: number      // subvenții agricole + UE
    estimatedTourism: number        // venituri turism incoming
    total: number
  }

  /** Ieșiri estimate (RON/an) */
  outflows: {
    importedGoods: number           // bunuri cumpărate din afară
    importedServices: number        // servicii din afară (medici, educație)
    commuteOut: number              // navetă — salarii câștigate dar cheltuite în altă parte
    centralTaxes: number            // taxe plătite la bugetul central
    total: number
  }

  /** Balanța netă (%) — pozitiv = retenție, negativ = scurgere */
  balancePct: number

  /** Consum detaliat per categorie */
  consumption: ConsumptionDetail[]

  /** Nivel de auto-suficiență per sector */
  selfSufficiency: SelfSufficiencyScore[]
}

export interface ConsumptionDetail {
  category: string
  /** Cheltuieli totale estimate per an (RON) */
  totalSpend: number
  /** Procent satisfăcut local */
  localPct: number
  /** Procent importat */
  importPct: number
  /** Ar PUTEA fi satisfăcut local? */
  localizable: boolean
  /** Gap concret (ce lipsește) */
  gap: string
  /** Entități locale care acoperă (parțial) */
  localProviders: number
}

export interface SelfSufficiencyScore {
  sector: string
  /** Ce se produce local (din CAEN) */
  localProduction: number
  /** Ce se consumă local (estimat) */
  localConsumption: number
  /** Scor auto-suficiență 0-100% */
  sufficiencyPct: number
  /** Direcția: EXPORTATOR, ECHILIBRAT, IMPORTATOR */
  direction: "EXPORTATOR" | "ECHILIBRAT" | "IMPORTATOR"
}

// ═══════════════════════════════════════════════════════════════
// DATE REFERINȚĂ INS (per județ, actualizabile din crawl)
// ═══════════════════════════════════════════════════════════════

/** Cheltuieli medii lunare per persoană per județ (RON, 2024 — INS) */
const AVG_MONTHLY_SPEND_BY_COUNTY: Record<string, number> = {
  CONSTANTA: 2350, BUCURESTI: 3200, CLUJ: 2800, TIMIS: 2600,
  IASI: 2100, BRASOV: 2500, SIBIU: 2400, ARGES: 2200,
  DOLJ: 1900, GALATI: 2000, PRAHOVA: 2300, MURES: 2100,
  // Default pentru județe nemapate
  DEFAULT: 2100,
}

/** Salariul mediu net per județ (RON/lună, 2024 — INS) */
const AVG_NET_SALARY_BY_COUNTY: Record<string, number> = {
  CONSTANTA: 3800, BUCURESTI: 5200, CLUJ: 4800, TIMIS: 4400,
  IASI: 3600, BRASOV: 4200, SIBIU: 4000, ARGES: 3900,
  DOLJ: 3200, GALATI: 3400, PRAHOVA: 3800, MURES: 3500,
  DEFAULT: 3500,
}

/** Pensia medie per județ (RON/lună, 2024 — INS) */
const AVG_PENSION_BY_COUNTY: Record<string, number> = {
  CONSTANTA: 2200, BUCURESTI: 2800, CLUJ: 2500, TIMIS: 2400,
  DEFAULT: 2100,
}

// ═══════════════════════════════════════════════════════════════
// CALCUL BALANȚĂ TERITORIALĂ
// ═══════════════════════════════════════════════════════════════

export async function calculateTerritorialBalance(
  territory: string,
  county: string = "CONSTANTA"
): Promise<TerritorialBalance> {
  const [allData, allEntities] = await Promise.all([
    prisma.territorialData.findMany({ where: { territory } }),
    prisma.localEntity.findMany({ where: { territory, isActive: true } }),
  ])

  const getData = (cat: string, key: string) => allData.find(d => d.category === cat && d.key === key)

  // Date de bază
  const popTotal = getData("POPULATION", "total")?.numericValue || 0
  const firmsTotal = getData("BUSINESS", "firms_total")?.numericValue || 0
  const employeesTotal = getData("BUSINESS", "employees_total")?.numericValue || 0
  const revenueTotal = getData("ECONOMY", "revenue_total")?.numericValue || 0

  // Date demografice
  const ageGroups = allData
    .filter(d => d.subcategory === "AGE_GROUPS")
    .map(d => ({ group: d.key.replace("age_", ""), count: d.numericValue || 0 }))

  const elderlyCount = ageGroups
    .filter(a => parseInt(a.group) >= 60)
    .reduce((s, a) => s + a.count, 0)

  const workingAgeCount = ageGroups
    .filter(a => { const age = parseInt(a.group); return age >= 20 && age < 60 })
    .reduce((s, a) => s + a.count, 0)

  // Referințe per județ
  const avgSalary = AVG_NET_SALARY_BY_COUNTY[county] || AVG_NET_SALARY_BY_COUNTY.DEFAULT
  const avgPension = AVG_PENSION_BY_COUNTY[county] || AVG_PENSION_BY_COUNTY.DEFAULT
  const avgSpend = AVG_MONTHLY_SPEND_BY_COUNTY[county] || AVG_MONTHLY_SPEND_BY_COUNTY.DEFAULT

  // ═══ INTRĂRI ═══
  const localBusinessRevenue = revenueTotal
  const estimatedWages = employeesTotal * avgSalary * 12
  const estimatedPensions = elderlyCount * avgPension * 12
  // Subvenții agricole (APIA) — estimare 200€/ha × ha estimate din date)
  const hasAgriculture = allData.some(d => d.key.includes("agri") || d.key.includes("caen_01"))
  const estimatedSubsidies = hasAgriculture ? popTotal * 50 * 12 : 0  // aproximare
  const estimatedTourism = allEntities.filter(e => e.type === "HOTEL" || e.type === "RESTAURANT").length * 50000  // 50K/unitate/an

  const totalInflows = localBusinessRevenue + estimatedWages + estimatedPensions + estimatedSubsidies + estimatedTourism

  // ═══ CONSUM ═══
  const totalAnnualConsumption = popTotal * avgSpend * 12

  // Consum detaliat per categorie
  const consumption = calculateDetailedConsumption(allEntities, allData, popTotal, avgSpend, county)

  // ═══ IEȘIRI ═══
  const avgImportPct = consumption.reduce((s, c) => s + c.importPct, 0) / Math.max(1, consumption.length) / 100
  const importedGoods = totalAnnualConsumption * 0.35 * avgImportPct * 2  // bunuri importate
  const importedServices = totalAnnualConsumption * 0.25 * avgImportPct * 1.5  // servicii din afară

  // Navetă — estimare: 20% din populația activă navetează
  const commutersPct = 0.20
  const commuteOut = workingAgeCount * commutersPct * avgSalary * 12 * 0.3  // 30% din salariu cheltuiesc în alt oraș

  // Taxe centrale: ~40% din venituri brute
  const centralTaxes = (estimatedWages + estimatedPensions) * 0.15  // contribuții nete (după redistribuire)

  const totalOutflows = importedGoods + importedServices + commuteOut + centralTaxes

  // ═══ BALANȚĂ ═══
  const balancePct = totalInflows > 0
    ? Math.round(((totalInflows - totalOutflows) / totalInflows) * 100)
    : 0

  // ═══ AUTO-SUFICIENȚĂ PER SECTOR ═══
  const selfSufficiency = calculateSelfSufficiency(allData, allEntities, totalAnnualConsumption)

  return {
    territory,
    inflows: {
      localBusinessRevenue, estimatedWages, estimatedPensions,
      estimatedSubsidies, estimatedTourism, total: totalInflows,
    },
    outflows: {
      importedGoods, importedServices, commuteOut,
      centralTaxes, total: totalOutflows,
    },
    balancePct,
    consumption,
    selfSufficiency,
  }
}

function calculateDetailedConsumption(
  entities: Array<{ type: string; category: string | null }>,
  data: Array<{ category: string; subcategory: string | null; key: string; numericValue: number | null }>,
  population: number,
  avgMonthlySpend: number,
  county: string
): ConsumptionDetail[] {
  const totalAnnual = population * avgMonthlySpend * 12

  // Contor entități per tip
  const entityCounts: Record<string, number> = {}
  for (const e of entities) {
    entityCounts[e.type] = (entityCounts[e.type] || 0) + 1
  }

  // CAEN-uri prezente
  const caenPresent = new Set(
    data.filter(d => d.subcategory === "CAEN_DETAIL" || d.subcategory === "SECTORS")
      .map(d => d.key.replace("caen_", ""))
  )

  const categories: ConsumptionDetail[] = [
    {
      category: "Alimentar",
      totalSpend: Math.round(totalAnnual * 0.30),
      localPct: calculateLocalFood(entityCounts, caenPresent),
      importPct: 0, localizable: true,
      gap: caenPresent.has("10") || caenPresent.has("11")
        ? "Procesare locală parțială — potențial de creștere"
        : "Zero procesare alimentară locală — tot ce se consumă vine din afară",
      localProviders: (entityCounts["RESTAURANT"] || 0) + (entityCounts["SHOP"] || 0) + (entityCounts["SUPERMARKET"] || 0),
    },
    {
      category: "Sănătate",
      totalSpend: Math.round(totalAnnual * 0.10),
      localPct: calculateLocalHealth(entityCounts),
      importPct: 0, localizable: true,
      gap: (entityCounts["HOSPITAL"] || 0) > 0
        ? "Spital prezent dar specialiști lipsesc — naveta la " + (county === "CONSTANTA" ? "Constanța" : "orașul mare")
        : "Zero servicii medicale locale — naveta completă",
      localProviders: (entityCounts["HOSPITAL"] || 0) + (entityCounts["DOCTOR"] || 0) + (entityCounts["PHARMACY"] || 0),
    },
    {
      category: "Educație/Formare",
      totalSpend: Math.round(totalAnnual * 0.06),
      localPct: calculateLocalEducation(entityCounts),
      importPct: 0, localizable: true,
      gap: (entityCounts["SCHOOL"] || 0) > 3
        ? "Educație formală acoperită — formare profesională lipsește"
        : "Infrastructură educațională sub-dimensionată",
      localProviders: (entityCounts["SCHOOL"] || 0) + (entityCounts["KINDERGARTEN"] || 0),
    },
    {
      category: "Energie",
      totalSpend: Math.round(totalAnnual * 0.08),
      localPct: caenPresent.has("35") ? 30 : 5,
      importPct: 0, localizable: true,
      gap: "Energie importată din rețea națională — potențial solar/eolian neexploatat",
      localProviders: 0,
    },
    {
      category: "Produse finite (non-alimentare)",
      totalSpend: Math.round(totalAnnual * 0.15),
      localPct: calculateLocalProducts(caenPresent),
      importPct: 0, localizable: true,
      gap: "Producție locală minimă — se importă produse finite",
      localProviders: entities.filter(e => e.type === "BUSINESS" && e.category?.startsWith("1")).length,
    },
    {
      category: "Transport",
      totalSpend: Math.round(totalAnnual * 0.12),
      localPct: 40, // benzinării/service locale
      importPct: 0, localizable: false,
      gap: "Transport public limitat — dependență de mașina personală",
      localProviders: entities.filter(e => e.type === "SERVICE" && e.category?.startsWith("45")).length,
    },
    {
      category: "Servicii profesionale",
      totalSpend: Math.round(totalAnnual * 0.05),
      localPct: calculateLocalProfServices(entityCounts, caenPresent),
      importPct: 0, localizable: true,
      gap: "Contabilitate/juridic adesea externalizat la oraș mare",
      localProviders: entities.filter(e => e.category?.startsWith("69") || e.category?.startsWith("70")).length,
    },
    {
      category: "Servicii digitale",
      totalSpend: Math.round(totalAnnual * 0.04),
      localPct: 5,
      importPct: 0, localizable: false,
      gap: "Normal — servicii digitale sunt globale",
      localProviders: 0,
    },
    {
      category: "Recreere/cultură",
      totalSpend: Math.round(totalAnnual * 0.05),
      localPct: (entityCounts["RESTAURANT"] || 0) + (entityCounts["CAFE"] || 0) > 3 ? 30 : 10,
      importPct: 0, localizable: true,
      gap: "Ofertă culturală/recreativă limitată — migrație spre oraș pentru divertisment",
      localProviders: (entityCounts["RESTAURANT"] || 0) + (entityCounts["CAFE"] || 0),
    },
    {
      category: "Locuință/utilități",
      totalSpend: Math.round(totalAnnual * 0.25),
      localPct: 70, // chiriile/utilitățile se plătesc local
      importPct: 0, localizable: false,
      gap: "Locuințe — stoc vechi, reabilitare necesară",
      localProviders: 0,
    },
  ]

  // Calculăm importPct = 100 - localPct
  for (const c of categories) {
    c.importPct = 100 - c.localPct
  }

  return categories
}

function calculateLocalFood(entityCounts: Record<string, number>, caen: Set<string>): number {
  let local = 10 // baza — piețe informale, gospodării
  if (entityCounts["SHOP"] > 0 || entityCounts["SUPERMARKET"] > 0) local += 15
  if (entityCounts["RESTAURANT"] > 0) local += 5
  if (caen.has("10") || caen.has("11")) local += 15 // procesare alimentară locală
  if (caen.has("01")) local += 10 // agricultură locală
  return Math.min(80, local)
}

function calculateLocalHealth(entityCounts: Record<string, number>): number {
  let local = 5
  if (entityCounts["HOSPITAL"] > 0) local += 20
  if ((entityCounts["DOCTOR"] || 0) > 3) local += 15
  if (entityCounts["PHARMACY"] > 0) local += 10
  if (entityCounts["DENTIST"] > 0) local += 5
  return Math.min(70, local)
}

function calculateLocalEducation(entityCounts: Record<string, number>): number {
  let local = 10
  if ((entityCounts["SCHOOL"] || 0) > 3) local += 30
  if (entityCounts["KINDERGARTEN"] > 0) local += 15
  return Math.min(80, local)
}

function calculateLocalProducts(caen: Set<string>): number {
  let local = 5
  // Verificăm CAEN-uri de producție (10-33)
  for (let i = 10; i <= 33; i++) {
    if (caen.has(String(i))) local += 5
  }
  return Math.min(50, local)
}

function calculateLocalProfServices(entityCounts: Record<string, number>, caen: Set<string>): number {
  let local = 10
  if (caen.has("69")) local += 20 // contabilitate/juridic
  if (caen.has("70")) local += 15 // consultanță
  if (caen.has("68")) local += 10 // imobiliare
  return Math.min(60, local)
}

function calculateSelfSufficiency(
  data: Array<{ category: string; subcategory: string | null; key: string; numericValue: number | null }>,
  entities: Array<{ type: string; category: string | null }>,
  totalConsumption: number
): SelfSufficiencyScore[] {
  const sectors = [
    { sector: "Alimentar", caenPrefix: ["01", "10", "11"], consumptionPct: 0.30 },
    { sector: "Producție", caenPrefix: ["14", "16", "23", "25", "31"], consumptionPct: 0.15 },
    { sector: "Energie", caenPrefix: ["35"], consumptionPct: 0.08 },
    { sector: "Construcții", caenPrefix: ["41", "42", "43"], consumptionPct: 0.05 },
    { sector: "Servicii profesionale", caenPrefix: ["62", "69", "70", "71"], consumptionPct: 0.05 },
    { sector: "Comerț", caenPrefix: ["46", "47"], consumptionPct: 0.12 },
    { sector: "Sănătate", caenPrefix: ["86", "87"], consumptionPct: 0.10 },
    { sector: "Educație", caenPrefix: ["85"], consumptionPct: 0.06 },
  ]

  // CA per sector din CAEN-uri
  const caenRevenue: Record<string, number> = {}
  for (const d of data) {
    if (d.subcategory === "SECTORS" && d.numericValue) {
      const caen = d.key.replace("caen_", "")
      caenRevenue[caen] = d.numericValue
    }
  }

  return sectors.map(s => {
    // Producție locală (CA firme cu CAEN-ul respectiv)
    let localProduction = 0
    for (const [caen, revenue] of Object.entries(caenRevenue)) {
      if (s.caenPrefix.some(p => caen.startsWith(p))) {
        localProduction += revenue
      }
    }

    // Consum local (estimat din total)
    const localConsumption = totalConsumption * s.consumptionPct

    const sufficiencyPct = localConsumption > 0
      ? Math.min(200, Math.round((localProduction / localConsumption) * 100))
      : 0

    const direction: SelfSufficiencyScore["direction"] =
      sufficiencyPct > 120 ? "EXPORTATOR" :
      sufficiencyPct > 80 ? "ECHILIBRAT" :
      "IMPORTATOR"

    return {
      sector: s.sector,
      localProduction: Math.round(localProduction),
      localConsumption: Math.round(localConsumption),
      sufficiencyPct,
      direction,
    }
  })
}
