/**
 * territorial-analysis.ts — Motorul celor 3 axe
 *
 * Axa 1: RESURSE — ce EXISTĂ (naturale, umane, firme, infrastructură)
 * Axa 2: CONSUM ACTUAL — ce se CONSUMĂ (per vârste, per firme)
 * Axa 3: NEVOI DE CONSUM — ce AR TREBUI consumat (Maslow × Psihologia vârstelor)
 *
 * Gap = Axa 3 - Axa 2 = oportunitate de punte = business nou
 */

import { prisma } from "@/lib/prisma"

// ═══════════════════════════════════════════════════════════════
// AXA 3: NEVOI DE CONSUM — Maslow × Psihologia vârstelor
// ═══════════════════════════════════════════════════════════════

/**
 * Piramida nevoilor mapată pe grupe de vârstă.
 * Fiecare grupă de vârstă are nevoi predominante diferite.
 * Intensitatea e 0-1 (cât de puternică e nevoia pentru acea grupă).
 */
interface NeedProfile {
  ageGroup: string
  population: number
  needs: Array<{
    level: string        // nivelul din piramidă
    category: string     // categorie concretă
    intensity: number    // 0-1
    examples: string[]   // exemple concrete de bunuri/servicii
  }>
}

// Nivelurile piramidei cu nevoi concrete per grupă de vârstă
const NEEDS_BY_AGE: Record<string, Array<{ level: string; category: string; intensity: number; examples: string[] }>> = {
  "0-9": [
    { level: "FIZIOLOGIC", category: "Alimentație copii", intensity: 1.0, examples: ["lapte", "alimente copii", "suplimente"] },
    { level: "FIZIOLOGIC", category: "Îmbrăcăminte copii", intensity: 0.9, examples: ["haine", "încălțăminte", "echipament"] },
    { level: "SIGURANTA", category: "Sănătate pediatrică", intensity: 1.0, examples: ["pediatru", "vaccinuri", "urgențe"] },
    { level: "SIGURANTA", category: "Siguranță fizică", intensity: 1.0, examples: ["locuri de joacă sigure", "zone pietonale"] },
    { level: "APARTENENTA", category: "Socializare", intensity: 0.7, examples: ["grădiniță", "loc de joacă", "activități grup"] },
    { level: "DEZVOLTARE", category: "Educație timpurie", intensity: 0.9, examples: ["grădiniță", "afterschool", "activități creative"] },
  ],
  "10-19": [
    { level: "FIZIOLOGIC", category: "Alimentație adolescenți", intensity: 0.8, examples: ["alimentație echilibrată", "sport nutrition"] },
    { level: "SIGURANTA", category: "Mediu școlar sigur", intensity: 0.9, examples: ["anti-bullying", "consiliere", "siguranță"] },
    { level: "APARTENENTA", category: "Grup social", intensity: 1.0, examples: ["activități extracurriculare", "sport", "cluburi"] },
    { level: "APARTENENTA", category: "Identitate", intensity: 0.9, examples: ["orientare vocațională", "mentorat", "modele"] },
    { level: "DEZVOLTARE", category: "Educație formală", intensity: 1.0, examples: ["liceu", "meditații", "cursuri"] },
    { level: "DEZVOLTARE", category: "Competențe digitale", intensity: 0.8, examples: ["IT", "programare", "digital literacy"] },
  ],
  "20-29": [
    { level: "FIZIOLOGIC", category: "Locuință", intensity: 1.0, examples: ["chirie", "credit imobiliar", "utilități"] },
    { level: "SIGURANTA", category: "Stabilitate financiară", intensity: 0.9, examples: ["loc de muncă stabil", "asigurări", "economii"] },
    { level: "APARTENENTA", category: "Relații parteneriale", intensity: 0.9, examples: ["socializare", "dating", "comunitate"] },
    { level: "STIMA", category: "Carieră profesională", intensity: 1.0, examples: ["job", "formare profesională", "CV", "interviuri"] },
    { level: "STIMA", category: "Recunoaștere profesională", intensity: 0.8, examples: ["certificări", "avansare", "salariu competitiv"] },
    { level: "DEZVOLTARE", category: "Educație continuă", intensity: 0.7, examples: ["master", "cursuri specializare", "limbi străine"] },
  ],
  "30-39": [
    { level: "FIZIOLOGIC", category: "Locuință familie", intensity: 0.9, examples: ["casă", "apartament", "mobilier"] },
    { level: "SIGURANTA", category: "Stabilitate familială", intensity: 1.0, examples: ["asigurări familie", "fond urgență", "sănătate"] },
    { level: "APARTENENTA", category: "Comunitate părinți", intensity: 0.8, examples: ["asociații părinți", "activități familie", "suport parental"] },
    { level: "STIMA", category: "Avansare profesională", intensity: 1.0, examples: ["management", "leadership", "antreprenoriat"] },
    { level: "STIMA", category: "Statut social", intensity: 0.7, examples: ["proprietate", "mașină", "vacanțe"] },
    { level: "AUTOREALIZARE", category: "Dezvoltare personală", intensity: 0.5, examples: ["coaching", "mentorat", "pasiuni"] },
  ],
  "40-49": [
    { level: "SIGURANTA", category: "Sănătate preventivă", intensity: 0.9, examples: ["control medical", "sport", "nutriție"] },
    { level: "SIGURANTA", category: "Securitate financiară", intensity: 1.0, examples: ["investiții", "pensie privată", "imobiliare"] },
    { level: "STIMA", category: "Mentorat", intensity: 0.8, examples: ["transfer cunoștințe", "coordonare echipe", "consultanță"] },
    { level: "STIMA", category: "Impact profesional", intensity: 0.9, examples: ["proiecte strategice", "inovare", "vizibilitate"] },
    { level: "AUTOREALIZARE", category: "Sens și scop", intensity: 0.7, examples: ["voluntariat", "cauze sociale", "creație"] },
    { level: "AUTOREALIZARE", category: "Echilibru viață", intensity: 0.8, examples: ["work-life balance", "hobby", "călătorii"] },
  ],
  "50-59": [
    { level: "SIGURANTA", category: "Sănătate", intensity: 1.0, examples: ["medic specialist", "tratamente", "recuperare"] },
    { level: "SIGURANTA", category: "Planificare pensie", intensity: 1.0, examples: ["fond pensie", "investiții sigure", "asigurări"] },
    { level: "APARTENENTA", category: "Comunitate", intensity: 0.8, examples: ["asociații", "cluburi", "rețea socială"] },
    { level: "STIMA", category: "Legacy profesional", intensity: 0.7, examples: ["transmitere afacere", "mentorat", "publicații"] },
    { level: "AUTOREALIZARE", category: "Contribuție socială", intensity: 0.9, examples: ["voluntariat", "consiliere tineri", "proiecte comunitare"] },
    { level: "AUTOREALIZARE", category: "Dezvoltare spirituală", intensity: 0.6, examples: ["introspecție", "practici contemplative", "natură"] },
  ],
  "60-69": [
    { level: "FIZIOLOGIC", category: "Sănătate activă", intensity: 1.0, examples: ["medicamente", "kinetoterapie", "nutriție adaptată"] },
    { level: "SIGURANTA", category: "Venituri pensie", intensity: 1.0, examples: ["pensie", "venituri pasive", "ajutor social"] },
    { level: "APARTENENTA", category: "Familia extinsă", intensity: 0.9, examples: ["nepoți", "reuniuni familiale", "tradiții"] },
    { level: "APARTENENTA", category: "Comunitate locală", intensity: 0.8, examples: ["vecinătate", "biserică", "asociații pensionari"] },
    { level: "AUTOREALIZARE", category: "Transmitere cunoștințe", intensity: 0.8, examples: ["povestit", "artizanat", "grădinărit", "voluntariat"] },
  ],
  "70-79": [
    { level: "FIZIOLOGIC", category: "Asistență medicală", intensity: 1.0, examples: ["medic de familie", "medicamente cronice", "îngrijire"] },
    { level: "FIZIOLOGIC", category: "Asistență zilnică", intensity: 0.7, examples: ["cumpărături", "curățenie", "gătit", "transport"] },
    { level: "SIGURANTA", category: "Siguranță locuință", intensity: 0.9, examples: ["adaptări domiciliu", "alarma", "asistență urgență"] },
    { level: "APARTENENTA", category: "Combatere izolare", intensity: 1.0, examples: ["vizite", "telefon", "activități sociale", "centre de zi"] },
  ],
  "80+": [
    { level: "FIZIOLOGIC", category: "Îngrijire permanentă", intensity: 1.0, examples: ["îngrijire la domiciliu", "cămin", "asistență medicală"] },
    { level: "SIGURANTA", category: "Protecție", intensity: 1.0, examples: ["supraveghere", "asistență juridică", "protecție socială"] },
    { level: "APARTENENTA", category: "Demnitate", intensity: 1.0, examples: ["respect", "companie umană", "spiritualitate"] },
  ],
}

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface TerritorialAnalysis {
  territory: string
  timestamp: string

  resources: {
    population: { total: number; byAge: Array<{ group: string; count: number; pct: number }> }
    businesses: { total: number; employees: number; revenue: number; topSectors: Array<{ name: string; count?: number; revenue?: number }> }
    infrastructure: Array<{ key: string; value: string; available: boolean }>
    entities: Record<string, number>
  }

  currentConsumption: {
    byAgeGroup: Array<{
      group: string
      population: number
      estimatedMonthlySpend: number
      categories: Array<{ name: string; estimatedPct: number }>
    }>
    byBusiness: {
      totalRevenue: number
      avgRevenuePerFirm: number
      avgEmployeesPerFirm: number
    }
  }

  needs: {
    byAgeGroup: NeedProfile[]
    totalNeedIntensity: number
    topUnmetNeeds: Array<{ category: string; intensity: number; ageGroups: string[]; gap: string }>
  }

  gaps: Array<{
    need: string
    currentSupply: string
    gapType: "MISSING" | "INSUFFICIENT" | "OVERSERVED"
    intensity: number
    opportunity: string
    affectedPopulation: number
  }>
}

// ═══════════════════════════════════════════════════════════════
// ANALIZĂ
// ═══════════════════════════════════════════════════════════════

/**
 * Analiză completă pe cele 3 axe pentru un teritoriu.
 */
export async function analyzeTerritory(territory: string): Promise<TerritorialAnalysis> {
  // Citim datele crawlate
  const [allData, allEntities] = await Promise.all([
    prisma.territorialData.findMany({ where: { territory } }),
    prisma.localEntity.findMany({ where: { territory, isActive: true } }),
  ])

  const getData = (cat: string, key: string) => allData.find(d => d.category === cat && d.key === key)
  const getDataByCat = (cat: string) => allData.filter(d => d.category === cat)

  // ═══ AXA 1: RESURSE ═══

  const popTotal = getData("POPULATION", "total")?.numericValue || 0
  const ageGroups = getDataByCat("POPULATION")
    .filter(d => d.subcategory === "AGE_GROUPS")
    .map(d => ({
      group: d.key.replace("age_", ""),
      count: d.numericValue || 0,
      pct: popTotal > 0 ? Math.round(((d.numericValue || 0) / popTotal) * 100) : 0,
    }))
    .sort((a, b) => {
      const aNum = parseInt(a.group)
      const bNum = parseInt(b.group)
      return aNum - bNum
    })

  const firmsTotal = getData("BUSINESS", "firms_total")?.numericValue || 0
  const employeesTotal = getData("BUSINESS", "employees_total")?.numericValue || 0
  const revenueTotal = getData("ECONOMY", "revenue_total")?.numericValue || 0

  const sectors = getDataByCat("ECONOMY")
    .filter(d => d.subcategory === "SECTORS")
    .map(d => {
      try { return JSON.parse(d.value) } catch { return { name: d.key, revenue: d.numericValue } }
    })

  const infrastructure = getDataByCat("INFRASTRUCTURE")
    .filter(d => !d.subcategory?.includes("STRATEGIC") && !d.subcategory?.includes("POI"))
    .map(d => ({
      key: d.key.replace(/_/g, " "),
      value: d.value,
      available: d.value === "true" || d.numericValue === 1,
    }))

  const entityCounts: Record<string, number> = {}
  for (const e of allEntities) {
    entityCounts[e.type] = (entityCounts[e.type] || 0) + 1
  }

  // ═══ AXA 2: CONSUM ACTUAL (estimat din date disponibile) ═══

  // Estimare consum per grupă de vârstă (bazat pe statistici INS medii naționale)
  // Cheltuieli medii lunare per persoană per grupă (RON, estimare 2024)
  const AVG_MONTHLY_SPEND: Record<string, number> = {
    "0-9": 800,   // alimentație + îmbrăcăminte + educație copii
    "10-19": 1200, // educație + socializare + tehnologie
    "20-29": 2500, // locuință + transport + socializare + carieră
    "30-39": 3500, // familie + locuință + copii + carieră
    "40-49": 3000, // familie + sănătate + investiții
    "50-59": 2500, // sănătate + planificare pensie + echilibru
    "60-69": 1800, // sănătate + familie + comunitate
    "70-79": 1500, // sănătate + asistență + baza
    "80+": 1200,   // îngrijire + medicamente + baza
  }

  const consumptionByAge = ageGroups.map(ag => {
    const spend = AVG_MONTHLY_SPEND[ag.group] || 2000
    return {
      group: ag.group,
      population: ag.count,
      estimatedMonthlySpend: spend,
      categories: [
        { name: "Alimentație", estimatedPct: ag.group.startsWith("0") || ag.group.startsWith("7") || ag.group.startsWith("8") ? 40 : 30 },
        { name: "Locuință + utilități", estimatedPct: 25 },
        { name: "Sănătate", estimatedPct: parseInt(ag.group) >= 50 ? 20 : 8 },
        { name: "Educație", estimatedPct: parseInt(ag.group) <= 19 ? 15 : 3 },
        { name: "Transport", estimatedPct: 10 },
        { name: "Servicii + altele", estimatedPct: parseInt(ag.group) >= 50 ? 5 : 24 },
      ],
    }
  })

  // ═══ AXA 3: NEVOI DE CONSUM ═══

  const needProfiles: NeedProfile[] = ageGroups.map(ag => ({
    ageGroup: ag.group,
    population: ag.count,
    needs: NEEDS_BY_AGE[ag.group] || [],
  }))

  // Calculăm intensitatea totală a nevoilor
  const totalNeedIntensity = needProfiles.reduce((sum, np) =>
    sum + np.needs.reduce((s, n) => s + n.intensity * np.population, 0), 0
  )

  // Top nevoi nesatisfăcute — comparăm nevoile cu ce există (entități locale)
  const topUnmetNeeds = identifyUnmetNeeds(needProfiles, allEntities, entityCounts)

  // ═══ GAPS ═══
  const gaps = calculateGaps(needProfiles, allEntities, entityCounts, popTotal)

  return {
    territory,
    timestamp: new Date().toISOString(),
    resources: {
      population: { total: popTotal, byAge: ageGroups },
      businesses: { total: firmsTotal, employees: employeesTotal, revenue: revenueTotal, topSectors: sectors },
      infrastructure,
      entities: entityCounts,
    },
    currentConsumption: {
      byAgeGroup: consumptionByAge,
      byBusiness: {
        totalRevenue: revenueTotal,
        avgRevenuePerFirm: firmsTotal > 0 ? Math.round(revenueTotal / firmsTotal) : 0,
        avgEmployeesPerFirm: firmsTotal > 0 ? Math.round((employeesTotal / firmsTotal) * 100) / 100 : 0,
      },
    },
    needs: {
      byAgeGroup: needProfiles,
      totalNeedIntensity: Math.round(totalNeedIntensity),
      topUnmetNeeds,
    },
    gaps,
  }
}

function identifyUnmetNeeds(
  profiles: NeedProfile[],
  entities: any[],
  entityCounts: Record<string, number>
): Array<{ category: string; intensity: number; ageGroups: string[]; gap: string }> {
  // Agregăm nevoile pe categorii
  const needMap: Record<string, { intensity: number; population: number; ageGroups: string[] }> = {}

  for (const profile of profiles) {
    for (const need of profile.needs) {
      if (!needMap[need.category]) {
        needMap[need.category] = { intensity: 0, population: 0, ageGroups: [] }
      }
      needMap[need.category].intensity += need.intensity * profile.population
      needMap[need.category].population += profile.population
      if (!needMap[need.category].ageGroups.includes(profile.ageGroup)) {
        needMap[need.category].ageGroups.push(profile.ageGroup)
      }
    }
  }

  // Comparăm cu ce există
  const unmet: Array<{ category: string; intensity: number; ageGroups: string[]; gap: string }> = []

  for (const [category, data] of Object.entries(needMap)) {
    // Verificăm dacă există entități care acoperă nevoia
    const hasHospital = (entityCounts["HOSPITAL"] || 0) > 0
    const hasDoctors = (entityCounts["DOCTOR"] || 0) + (entityCounts["CLINIC"] || 0) > 0
    const hasSchools = (entityCounts["SCHOOL"] || 0) + (entityCounts["KINDERGARTEN"] || 0) > 0
    const hasPharmacy = (entityCounts["PHARMACY"] || 0) > 0

    let gap = ""
    if (category.includes("Sănătate") || category.includes("medicală") || category.includes("pediatrică")) {
      gap = hasHospital ? (hasDoctors ? "Parțial acoperită" : "Lipsesc cabinete specializate") : "Lipsă servicii medicale"
    } else if (category.includes("Educație") || category.includes("formală") || category.includes("timpurie")) {
      gap = hasSchools ? "Acoperită parțial — de verificat capacitate" : "Lipsă unități educaționale"
    } else if (category.includes("Carieră") || category.includes("profesională")) {
      gap = "Lipsă servicii orientare și dezvoltare profesională"
    } else if (category.includes("Locuință")) {
      gap = "De evaluat stoc locuințe vs cerere"
    } else if (category.includes("Comunitate") || category.includes("Socializare") || category.includes("izolare")) {
      gap = "De evaluat spații de socializare și centre comunitare"
    } else {
      gap = "De evaluat — date insuficiente"
    }

    unmet.push({ category, intensity: Math.round(data.intensity), ageGroups: data.ageGroups, gap })
  }

  return unmet.sort((a, b) => b.intensity - a.intensity).slice(0, 15)
}

function calculateGaps(
  profiles: NeedProfile[],
  entities: any[],
  entityCounts: Record<string, number>,
  totalPop: number
): TerritorialAnalysis["gaps"] {
  const gaps: TerritorialAnalysis["gaps"] = []

  // Sănătate
  const pop60plus = profiles.filter(p => parseInt(p.ageGroup) >= 60).reduce((s, p) => s + p.population, 0)
  const pop0_9 = profiles.find(p => p.ageGroup === "0-9")?.population || 0
  const doctors = (entityCounts["DOCTOR"] || 0) + (entityCounts["CLINIC"] || 0) + (entityCounts["DENTIST"] || 0)

  if (doctors < 5 && totalPop > 10000) {
    gaps.push({
      need: "Cabinete medicale specializate",
      currentSupply: `${doctors} cabinete pentru ${totalPop.toLocaleString()} locuitori`,
      gapType: "INSUFFICIENT",
      intensity: 0.9,
      opportunity: "Deschidere cabinet medical / clinică / laborator analize",
      affectedPopulation: totalPop,
    })
  }

  // Farmacie
  const pharmacies = entityCounts["PHARMACY"] || 0
  if (pharmacies < 3 && totalPop > 15000) {
    gaps.push({
      need: "Farmacii",
      currentSupply: `${pharmacies} farmacii pentru ${totalPop.toLocaleString()} locuitori`,
      gapType: pharmacies === 0 ? "MISSING" : "INSUFFICIENT",
      intensity: 0.8,
      opportunity: "Deschidere farmacie — piață sub-deservită",
      affectedPopulation: totalPop,
    })
  }

  // Educație copii
  const kindergartens = entityCounts["KINDERGARTEN"] || 0
  if (pop0_9 > 2000 && kindergartens < 3) {
    gaps.push({
      need: "Educație timpurie (grădinițe)",
      currentSupply: `${kindergartens} grădinițe pentru ${pop0_9} copii 0-9 ani`,
      gapType: "INSUFFICIENT",
      intensity: 0.85,
      opportunity: "Afterschool, grădiniță privată, centre educaționale copii",
      affectedPopulation: pop0_9,
    })
  }

  // Dezvoltare profesională 20-39
  const pop20_39 = profiles.filter(p => ["20-29", "30-39"].includes(p.ageGroup)).reduce((s, p) => s + p.population, 0)
  gaps.push({
    need: "Servicii dezvoltare profesională",
    currentSupply: "0 centre de formare / orientare profesională identificate",
    gapType: "MISSING",
    intensity: 0.75,
    opportunity: "Centru formare profesională, coaching carieră, coworking — aici intră JobGrade B2C",
    affectedPopulation: pop20_39,
  })

  // Servicii pentru vârstnici
  if (pop60plus > 5000) {
    gaps.push({
      need: "Servicii pentru vârstnici",
      currentSupply: "0 centre de zi / servicii îngrijire la domiciliu identificate",
      gapType: "MISSING",
      intensity: 0.7,
      opportunity: "Centru de zi, asistență domiciliu, socializare vârstnici",
      affectedPopulation: pop60plus,
    })
  }

  // Alimentație — restaurante/cafenele
  const restaurants = (entityCounts["RESTAURANT"] || 0) + (entityCounts["CAFE"] || 0)
  if (restaurants < 5 && totalPop > 20000) {
    gaps.push({
      need: "Servicii alimentație publică",
      currentSupply: `${restaurants} restaurante/cafenele pentru ${totalPop.toLocaleString()} locuitori`,
      gapType: "INSUFFICIENT",
      intensity: 0.5,
      opportunity: "Restaurant, cafenea, food delivery local",
      affectedPopulation: totalPop,
    })
  }

  return gaps.sort((a, b) => b.intensity - a.intensity)
}
