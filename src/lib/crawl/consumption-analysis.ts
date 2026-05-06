/**
 * consumption-analysis.ts — Axa 2: Consumul actual
 *
 * Ce se consumă, de cine, cât, și de unde vine.
 * Conexiunea cu Axa 1: consum local din resurse locale vs import.
 * Gap: se consumă dar nu se produce local = oportunitate producție/servicii.
 *
 * Persoane: consum pe grupe vârstă × categorii bunuri/servicii
 * Firme: consum pe profil CAEN × nevoi operaționale
 */

// ═══════════════════════════════════════════════════════════════
// CATEGORII DE CONSUM — exhaustive
// ═══════════════════════════════════════════════════════════════

export interface ConsumptionCategory {
  id: string
  name: string
  type: "BUNE" | "SERVICII"
  subcategories: Array<{
    id: string
    name: string
    /** Cine consumă predominant (grupe vârstă) */
    primaryConsumers: string[]
    /** Pct estimat din cheltuieli pentru consumatorul primar */
    avgPctOfSpend: number
    /** Poate fi produs/oferit local? */
    localizable: boolean
    /** Exemple concrete */
    examples: string[]
  }>
}

export const CONSUMPTION_CATEGORIES: ConsumptionCategory[] = [
  // ═══ BUNURI ═══
  {
    id: "ALIM", name: "Alimentație", type: "BUNE",
    subcategories: [
      { id: "ALIM_BAZA", name: "Alimente de bază", primaryConsumers: ["*"], avgPctOfSpend: 18, localizable: true, examples: ["pâine", "lapte", "carne", "legume", "fructe"] },
      { id: "ALIM_PROCESATE", name: "Alimente procesate", primaryConsumers: ["20-29", "30-39", "40-49"], avgPctOfSpend: 8, localizable: true, examples: ["conserve", "semipreparate", "mezeluri", "lactate procesate"] },
      { id: "ALIM_COPII", name: "Alimentație copii", primaryConsumers: ["0-9"], avgPctOfSpend: 5, localizable: false, examples: ["formule lapte", "cereale copii", "suplimente"] },
      { id: "ALIM_BAUTURI", name: "Băuturi", primaryConsumers: ["20-29", "30-39", "40-49", "50-59"], avgPctOfSpend: 4, localizable: true, examples: ["apă", "sucuri", "bere", "vin", "cafea"] },
    ],
  },
  {
    id: "LOCUINTA", name: "Locuință și utilități", type: "BUNE",
    subcategories: [
      { id: "LOC_CHIRIE", name: "Chirie / rată credit", primaryConsumers: ["20-29", "30-39"], avgPctOfSpend: 20, localizable: false, examples: ["chirie", "credit ipotecar", "asigurare locuință"] },
      { id: "LOC_UTILITATI", name: "Utilități", primaryConsumers: ["*"], avgPctOfSpend: 8, localizable: false, examples: ["electricitate", "gaz", "apă", "canalizare", "gunoi"] },
      { id: "LOC_INTRETINERE", name: "Întreținere și reparații", primaryConsumers: ["30-39", "40-49", "50-59"], avgPctOfSpend: 3, localizable: true, examples: ["instalații", "zugrăveli", "mobilier", "electrocasnice"] },
    ],
  },
  {
    id: "IMBRAC", name: "Îmbrăcăminte și încălțăminte", type: "BUNE",
    subcategories: [
      { id: "IMBRAC_ADULT", name: "Adulți", primaryConsumers: ["20-29", "30-39", "40-49"], avgPctOfSpend: 4, localizable: false, examples: ["haine", "încălțăminte", "accesorii"] },
      { id: "IMBRAC_COPII", name: "Copii", primaryConsumers: ["0-9", "10-19"], avgPctOfSpend: 3, localizable: false, examples: ["uniformă", "haine copii", "încălțăminte copii"] },
    ],
  },
  {
    id: "TRANSPORT", name: "Transport", type: "BUNE",
    subcategories: [
      { id: "TR_AUTO", name: "Auto (combustibil, întreținere)", primaryConsumers: ["20-29", "30-39", "40-49", "50-59"], avgPctOfSpend: 8, localizable: true, examples: ["benzină", "motorină", "service auto", "piese"] },
      { id: "TR_PUBLIC", name: "Transport public", primaryConsumers: ["10-19", "60-69", "70-79"], avgPctOfSpend: 2, localizable: true, examples: ["autobuz", "taxi", "tren"] },
    ],
  },
  {
    id: "TECH", name: "Tehnologie și comunicații", type: "BUNE",
    subcategories: [
      { id: "TECH_TELEFONIE", name: "Telefonie și internet", primaryConsumers: ["*"], avgPctOfSpend: 3, localizable: false, examples: ["abonament telefon", "internet", "cablu TV"] },
      { id: "TECH_ECHIPAMENTE", name: "Echipamente IT", primaryConsumers: ["10-19", "20-29", "30-39"], avgPctOfSpend: 2, localizable: false, examples: ["telefon", "laptop", "tabletă"] },
    ],
  },

  // ═══ SERVICII ═══
  {
    id: "SANATATE", name: "Sănătate", type: "SERVICII",
    subcategories: [
      { id: "SAN_MEDIC", name: "Consultații medicale", primaryConsumers: ["*"], avgPctOfSpend: 3, localizable: true, examples: ["medic familie", "specialist", "urgențe"] },
      { id: "SAN_MEDICAMENTE", name: "Medicamente", primaryConsumers: ["50-59", "60-69", "70-79", "80+"], avgPctOfSpend: 5, localizable: true, examples: ["farmacii", "tratamente cronice", "suplimente"] },
      { id: "SAN_DENTAR", name: "Stomatologie", primaryConsumers: ["*"], avgPctOfSpend: 2, localizable: true, examples: ["control", "tratamente", "ortodonție", "implant"] },
      { id: "SAN_RECUPERARE", name: "Recuperare și wellness", primaryConsumers: ["40-49", "50-59", "60-69"], avgPctOfSpend: 1, localizable: true, examples: ["kinetoterapie", "masaj", "piscină", "spa"] },
    ],
  },
  {
    id: "EDUCATIE", name: "Educație", type: "SERVICII",
    subcategories: [
      { id: "EDU_FORMAL", name: "Educație formală", primaryConsumers: ["0-9", "10-19"], avgPctOfSpend: 5, localizable: true, examples: ["rechizite", "cărți", "uniforme", "taxe"] },
      { id: "EDU_EXTRASCOLAR", name: "Activități extracurriculare", primaryConsumers: ["0-9", "10-19"], avgPctOfSpend: 3, localizable: true, examples: ["sport", "muzică", "limbi străine", "programare"] },
      { id: "EDU_ADULT", name: "Educație continuă adulți", primaryConsumers: ["20-29", "30-39", "40-49"], avgPctOfSpend: 2, localizable: true, examples: ["cursuri", "certificări", "masterat", "formare profesională"] },
    ],
  },
  {
    id: "RECREERE", name: "Recreere și cultură", type: "SERVICII",
    subcategories: [
      { id: "REC_RESTAURANT", name: "Restaurante și cafenele", primaryConsumers: ["20-29", "30-39", "40-49"], avgPctOfSpend: 4, localizable: true, examples: ["restaurant", "cafenea", "fast-food", "livrare"] },
      { id: "REC_CULTURA", name: "Cultură și entertainment", primaryConsumers: ["*"], avgPctOfSpend: 2, localizable: true, examples: ["cinema", "teatru", "muzeu", "concerte", "evenimente"] },
      { id: "REC_SPORT", name: "Sport și fitness", primaryConsumers: ["10-19", "20-29", "30-39", "40-49"], avgPctOfSpend: 2, localizable: true, examples: ["sală fitness", "bazin", "teren sport", "echipament"] },
      { id: "REC_TURISM", name: "Turism și vacanțe", primaryConsumers: ["30-39", "40-49", "50-59"], avgPctOfSpend: 3, localizable: false, examples: ["vacanțe", "excursii", "weekend-uri"] },
    ],
  },
  {
    id: "FINANCIAR", name: "Servicii financiare", type: "SERVICII",
    subcategories: [
      { id: "FIN_BANCAR", name: "Servicii bancare", primaryConsumers: ["20-29", "30-39", "40-49", "50-59"], avgPctOfSpend: 1, localizable: true, examples: ["cont", "card", "transfer", "credit"] },
      { id: "FIN_ASIGURARI", name: "Asigurări", primaryConsumers: ["30-39", "40-49", "50-59"], avgPctOfSpend: 2, localizable: false, examples: ["auto", "viață", "sănătate", "locuință"] },
    ],
  },
  {
    id: "PROFESIONAL", name: "Servicii profesionale", type: "SERVICII",
    subcategories: [
      { id: "PROF_JURIDIC", name: "Juridice și notariale", primaryConsumers: ["30-39", "40-49", "50-59"], avgPctOfSpend: 1, localizable: true, examples: ["avocat", "notar", "consultanță juridică"] },
      { id: "PROF_CONTABIL", name: "Contabilitate", primaryConsumers: ["30-39", "40-49", "50-59"], avgPctOfSpend: 1, localizable: true, examples: ["contabil", "expert fiscal", "audit"] },
      { id: "PROF_CONSULTING", name: "Consultanță business", primaryConsumers: ["30-39", "40-49"], avgPctOfSpend: 0.5, localizable: true, examples: ["consultanță HR", "management", "strategie — JOBGRADE"] },
    ],
  },
  {
    id: "INGRIJIRE", name: "Îngrijire personală", type: "SERVICII",
    subcategories: [
      { id: "INGR_COAFURA", name: "Coafură și cosmetică", primaryConsumers: ["20-29", "30-39", "40-49", "50-59"], avgPctOfSpend: 2, localizable: true, examples: ["frizer", "coafor", "cosmetică", "manichiură"] },
      { id: "INGR_VARSTNICI", name: "Îngrijire vârstnici", primaryConsumers: ["70-79", "80+"], avgPctOfSpend: 5, localizable: true, examples: ["asistent personal", "îngrijire domiciliu", "centru de zi"] },
    ],
  },
]

// ═══════════════════════════════════════════════════════════════
// CONSUM FIRME — ce cumpără firmele per profil
// ═══════════════════════════════════════════════════════════════

export interface BusinessConsumption {
  caenCategory: string
  name: string
  typicalNeeds: Array<{
    category: string
    description: string
    localizable: boolean
    examples: string[]
  }>
}

export const BUSINESS_CONSUMPTION: BusinessConsumption[] = [
  {
    caenCategory: "retail", name: "Comerț",
    typicalNeeds: [
      { category: "Aprovizionare marfă", description: "Furnizori de produse pentru revânzare", localizable: true, examples: ["producători locali", "en-gros", "import"] },
      { category: "Logistică", description: "Transport și depozitare", localizable: true, examples: ["transport marfă", "depozite", "curierat"] },
      { category: "Personal", description: "Angajați vânzări și suport", localizable: true, examples: ["vânzători", "casieri", "gestionar"] },
      { category: "Conformitate", description: "Contabilitate, juridic, HR", localizable: true, examples: ["contabil", "avocat", "consultant HR — JOBGRADE"] },
    ],
  },
  {
    caenCategory: "productie", name: "Producție",
    typicalNeeds: [
      { category: "Materii prime", description: "Inputuri pentru producție", localizable: true, examples: ["materiale", "componente", "energie"] },
      { category: "Echipamente", description: "Utilaje și mentenanță", localizable: false, examples: ["mașini", "piese schimb", "service"] },
      { category: "Personal calificat", description: "Operatori, ingineri, tehnicieni", localizable: true, examples: ["operatori CNC", "sudori", "electricieni"] },
      { category: "Certificări", description: "ISO, calitate, mediu", localizable: false, examples: ["ISO 9001", "audit calitate", "certificare produs"] },
      { category: "Structurare HR", description: "Evaluare posturi, grilă salarială", localizable: true, examples: ["evaluare posturi — JOBGRADE", "pay gap", "conformitate"] },
    ],
  },
  {
    caenCategory: "servicii", name: "Servicii",
    typicalNeeds: [
      { category: "Spații", description: "Birouri, spații de lucru", localizable: true, examples: ["chirie birou", "coworking", "utilități"] },
      { category: "IT și digital", description: "Software, site, marketing digital", localizable: false, examples: ["website", "CRM", "social media", "publicitate"] },
      { category: "Dezvoltare personal", description: "Training, evaluare, motivare", localizable: true, examples: ["formare profesională — edu4life", "evaluare — JOBGRADE", "team building"] },
    ],
  },
  {
    caenCategory: "agricultura", name: "Agricultură",
    typicalNeeds: [
      { category: "Inputuri agricole", description: "Semințe, îngrășăminte, fitosanitare", localizable: false, examples: ["semințe", "pesticide", "îngrășăminte"] },
      { category: "Utilaje agricole", description: "Tractoare, combine, echipamente", localizable: false, examples: ["utilaje", "piese", "service agricol"] },
      { category: "Depozitare", description: "Silozuri, depozite frigorifice", localizable: true, examples: ["siloz", "depozit", "frigorific"] },
      { category: "Vânzare producție", description: "Canale de desfacere", localizable: true, examples: ["piață locală", "en-gros", "procesare", "export"] },
    ],
  },
]

// ═══════════════════════════════════════════════════════════════
// ANALIZĂ CONSUM
// ═══════════════════════════════════════════════════════════════

export interface ConsumptionAnalysis {
  territory: string

  /** Consum persoane fizice */
  personalConsumption: {
    totalMonthly: number
    totalAnnual: number
    byCategory: Array<{
      category: string
      type: "BUNE" | "SERVICII"
      monthlyEstimate: number
      annualEstimate: number
      localizable: boolean
      locallySatisfied: boolean
      gap: string
    }>
    byAgeGroup: Array<{
      ageGroup: string
      population: number
      monthlyPerCapita: number
      totalMonthly: number
      topCategories: string[]
    }>
  }

  /** Consum firme */
  businessConsumption: {
    totalFirms: number
    totalEmployees: number
    needs: Array<{
      category: string
      description: string
      localizable: boolean
      currentlyLocal: boolean
      opportunity: string
    }>
  }

  /** Cauze nivel consum — de ce se consumă cât se consumă */
  consumptionDrivers: {
    purchasingPower: {
      avgMonthlyIncome: number
      avgMonthlySpend: number
      savingsRate: number
      description: string
    }
    macroIndicators: {
      gdpPerCapitaLocal: number
      gdpPerCapitaNational: number
      localVsNationalPct: number
      unemploymentEstimate: number
      avgPension: number
      minWage: number
      description: string
    }
    gapCauses: Array<{
      cause: "NU_SE_POATE" | "NU_SE_STIE" | "NU_SE_VREA"
      label: string
      description: string
      affectedCategories: string[]
      solution: string
      solutionBusiness: string
    }>
  }

  /** Ce se consumă dar NU se produce local */
  importDependencies: Array<{
    category: string
    estimatedValue: number
    unit: string
    reason: string
    localizationPotential: "HIGH" | "MEDIUM" | "LOW"
    opportunity: string
  }>
}

/**
 * Analizează consumul actual al unui teritoriu.
 */
export function analyzeConsumption(
  ageGroups: Array<{ group: string; count: number }>,
  businessData: { total: number; employees: number; revenue: number; topSectors: any[] },
  entityCounts: Record<string, number>,
  territory: string = "MEDGIDIA"
): ConsumptionAnalysis {

  // ═══ CONSUM PERSOANE ═══
  // Cheltuieli medii lunare per persoană (RON, estimare 2024-2025 din INS)
  const SPEND_PER_AGE: Record<string, number> = {
    "0-9": 800, "10-19": 1200, "20-29": 2500, "30-39": 3500,
    "40-49": 3000, "50-59": 2500, "60-69": 1800, "70-79": 1500, "80+": 1200,
  }

  const byAgeGroup = ageGroups.map(ag => {
    const spend = SPEND_PER_AGE[ag.group] || 2000
    const topCats = CONSUMPTION_CATEGORIES
      .flatMap(c => c.subcategories)
      .filter(sc => sc.primaryConsumers.includes(ag.group) || sc.primaryConsumers.includes("*"))
      .sort((a, b) => b.avgPctOfSpend - a.avgPctOfSpend)
      .slice(0, 5)
      .map(sc => sc.name)

    return {
      ageGroup: ag.group,
      population: ag.count,
      monthlyPerCapita: spend,
      totalMonthly: ag.count * spend,
      topCategories: topCats,
    }
  })

  const totalMonthly = byAgeGroup.reduce((s, g) => s + g.totalMonthly, 0)

  // Consum per categorie mare
  const byCategory = CONSUMPTION_CATEGORIES.map(cat => {
    const avgPct = cat.subcategories.reduce((s, sc) => s + sc.avgPctOfSpend, 0)
    const monthly = Math.round(totalMonthly * avgPct / 100)
    const localizable = cat.subcategories.some(sc => sc.localizable)

    // Verificăm dacă există furnizori locali
    let locallySatisfied = false
    let gap = ""
    if (cat.id === "SANATATE") {
      locallySatisfied = (entityCounts["HOSPITAL"] || 0) > 0
      gap = locallySatisfied ? "Parțial — lipsesc specialiști" : "Deficit major servicii medicale"
    } else if (cat.id === "EDUCATIE") {
      locallySatisfied = (entityCounts["SCHOOL"] || 0) > 2
      gap = locallySatisfied ? "Educație formală acoperită, extracurricular slab" : "Deficit educație"
    } else if (cat.id === "RECREERE") {
      const restaurants = (entityCounts["RESTAURANT"] || 0) + (entityCounts["CAFE"] || 0)
      locallySatisfied = restaurants > 3
      gap = restaurants < 3 ? "Deficit servicii recreere — restaurante, cafenele, sport" : "Parțial acoperit"
    } else if (cat.id === "ALIM") {
      const shops = (entityCounts["SUPERMARKET"] || 0) + (entityCounts["SHOP"] || 0)
      locallySatisfied = shops > 2
      gap = locallySatisfied ? "Retail alimentar acoperit, producție locală de evaluat" : "Deficit magazine"
    } else if (cat.id === "INGRIJIRE") {
      gap = "De evaluat — date insuficiente despre servicii locale"
    } else {
      gap = localizable ? "Potențial localizare — de evaluat oferta" : "Predominant import — greu localizabil"
    }

    return {
      category: cat.name,
      type: cat.type,
      monthlyEstimate: monthly,
      annualEstimate: monthly * 12,
      localizable,
      locallySatisfied,
      gap,
    }
  }).sort((a, b) => b.monthlyEstimate - a.monthlyEstimate)

  // ═══ CONSUM FIRME ═══
  const firmSectors = businessData.topSectors.map((s: any) => s.name?.toLowerCase() || "").join(" ")
  const relevantBizConsumption = BUSINESS_CONSUMPTION.filter(bc =>
    firmSectors.includes(bc.caenCategory) || bc.caenCategory === "servicii" // servicii e universal
  )

  const entityCountKeys = Object.keys(entityCounts)
  const businessNeeds = relevantBizConsumption.flatMap(bc =>
    bc.typicalNeeds.map(need => {
      // Check if any entity type matches this need category (case-insensitive partial match)
      const needKey = need.category.toUpperCase().replace(/\s+/g, "_")
      const currentlyLocal = entityCountKeys.some(k => {
        const upperK = k.toUpperCase()
        return (upperK.includes(needKey) || needKey.includes(upperK)) && (entityCounts[k] || 0) > 0
      })

      return {
        category: `${bc.name}: ${need.category}`,
        description: need.description,
        localizable: need.localizable,
        currentlyLocal,
        opportunity: need.localizable
          ? `Furnizor local ${need.category.toLowerCase()} pentru ${businessData.total} firme`
          : `Intermediar/distribuitor ${need.category.toLowerCase()}`,
      }
    })
  )

  // ═══ DEPENDENȚE IMPORT ═══
  const importDeps = byCategory
    .filter(c => c.localizable && !c.locallySatisfied && c.monthlyEstimate > 500000)
    .map(c => ({
      category: c.category,
      estimatedValue: c.monthlyEstimate,
      unit: "RON/lună",
      reason: c.gap,
      localizationPotential: c.monthlyEstimate > 5000000 ? "HIGH" as const : c.monthlyEstimate > 1000000 ? "MEDIUM" as const : "LOW" as const,
      opportunity: `Producție/servicii locale ${c.category.toLowerCase()} — piață estimată ${Math.round(c.annualEstimate / 1000000)}M RON/an`,
    }))

  // ═══ CAUZE NIVEL CONSUM ═══
  const totalPop = ageGroups.reduce((s, g) => s + g.count, 0)
  const avgMonthlySpendPerCapita = totalPop > 0 ? Math.round(totalMonthly / totalPop) : 0

  // Estimări macro (INS medii naționale + corecție local)
  // PIB/cap RO 2024: ~15.800 EUR, zonă Dobrogea ~80% din media națională
  const gdpPerCapitaNational = 78500 // RON/an (~15.800 EUR)
  const localFactor = 0.75 // Medgidia ~75% din media națională (zonă industrială în declin)
  const gdpPerCapitaLocal = Math.round(gdpPerCapitaNational * localFactor)
  const avgMonthlyIncome = Math.round(gdpPerCapitaLocal / 12 * 0.6) // ~60% din PIB/cap e venit disponibil
  const savingsRate = avgMonthlyIncome > avgMonthlySpendPerCapita
    ? Math.round(((avgMonthlyIncome - avgMonthlySpendPerCapita) / avgMonthlyIncome) * 100)
    : 0

  const consumptionDrivers: ConsumptionAnalysis["consumptionDrivers"] = {
    purchasingPower: {
      avgMonthlyIncome,
      avgMonthlySpend: avgMonthlySpendPerCapita,
      savingsRate,
      description: savingsRate > 15
        ? "Putere de cumpărare moderată — există potențial de consum nesatisfăcut"
        : savingsRate > 0
        ? "Putere de cumpărare limitată — consumul e aproape de plafonul venitului"
        : "Putere de cumpărare insuficientă — cheltuielile depășesc veniturile medii",
    },
    macroIndicators: {
      gdpPerCapitaLocal,
      gdpPerCapitaNational,
      localVsNationalPct: Math.round(localFactor * 100),
      unemploymentEstimate: 6.5, // estimare zonă Dobrogea
      avgPension: 2200, // RON, media județ Constanța
      minWage: 3700, // RON brut 2025
      description: `Economia locală la ${Math.round(localFactor * 100)}% din media națională. Zonă cu potențial agricol și industrial dar în tranziție.`,
    },
    gapCauses: [
      {
        cause: "NU_SE_POATE",
        label: "Nu se poate",
        description: "Puterea de cumpărare nu permite accesul la servicii/produse necesare",
        affectedCategories: [
          "Sănătate (consultații private, stomatologie)",
          "Educație (activități extracurriculare, cursuri adulți)",
          "Recuperare și wellness",
          "Turism și vacanțe",
        ],
        solution: "Creșterea veniturilor prin locuri de muncă mai bine plătite, calificare profesională",
        solutionBusiness: "JobGrade (evaluare posturi → grile salariale corecte → salarii mai bune) + Centre formare profesională",
      },
      {
        cause: "NU_SE_STIE",
        label: "Nu se știe",
        description: "Serviciul/produsul există dar consumatorul nu știe de el sau nu înțelege beneficiul",
        affectedCategories: [
          "Consultanță business (HR, management, strategie)",
          "Educație continuă adulți (certificări, formare)",
          "Servicii financiare avansate (investiții, planificare)",
          "Dezvoltare personală (coaching, mentorat)",
        ],
        solution: "Informare, educație, demonstrare valoare, prima experiență gratuită",
        solutionBusiness: "edu4life (educație) + JobGrade sandbox (demonstrare) + Marketing local (informare)",
      },
      {
        cause: "NU_SE_VREA",
        label: "Nu se vrea",
        description: "Rezultantă între: inconștiența individului (nu înțelege consecințele), cadrul de reglementare (restricții/permisiuni acces), alegerea conștientă (decizie informată) și trăsături culturale (valori, tradiții, identitate)",
        affectedCategories: [
          "Sport și fitness (inconștiența impactului pe sănătate pe termen lung)",
          "Alimentație sănătoasă (inconștiența nutrițională + acces la fast-food nereglementat)",
          "Educație continuă (inconștiența valorii dezvoltării profesionale)",
          "Prevenție medicală (inconștiența riscurilor + bariere acces screening)",
        ],
        solution: "Unde e inconștiență → conștientizare (educare, nu manipulare). Unde e reglementare → respectăm cadrul legal. Unde e alegere conștientă → respectăm decizia. Unde sunt trăsături culturale → respectăm diversitatea și valorificăm (turism cultural, gastronomie specifică).",
        solutionBusiness: "edu4life (conștientizare) + produse/servicii adaptate cultural (halal, tradițional, etc.) + comunități locale (inspirație nu presiune)",
      },
    ],
  }

  return {
    territory,
    personalConsumption: { totalMonthly, totalAnnual: totalMonthly * 12, byCategory, byAgeGroup },
    businessConsumption: { totalFirms: businessData.total, totalEmployees: businessData.employees, needs: businessNeeds },
    consumptionDrivers,
    importDependencies: importDeps,
  }
}
