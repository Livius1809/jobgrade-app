/**
 * resource-taxonomy.ts — Taxonomia resurselor teritoriale
 *
 * Trei roduri fundamentale:
 * 1. Rodul pământului (suprateran + subteran)
 * 2. Rodul evoluției speciei/națiunii/culturii
 * 3. Rodul evoluției individului
 *
 * Fiecare rod produce MULTIPLE resurse (nimic nu e deșeu).
 * Fiecare resursă intră într-un pipeline de transformare (spirală).
 * Outputul unui nivel = inputul altuia.
 */

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type ResourceOrigin = "PAMANT" | "CULTURA" | "INDIVID"

export interface ResourceCategory {
  id: string
  origin: ResourceOrigin
  name: string
  description: string
  subcategories: Array<{
    id: string
    name: string
    examples: string[]
    /** Cum se detectează din date crawlate */
    detectFrom: string[]
  }>
}

export interface TransformationLevel {
  level: number
  name: string
  description: string
  valueAdded: string
  jobsCreated: string
}

export interface ResourceInstance {
  categoryId: string
  subcategoryId: string
  name: string
  origin: ResourceOrigin
  territory: string
  available: boolean
  abundance: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN"
  currentTransformLevel: number
  maxPotentialLevel: number
  derivatives: string[] // subproduse/derivate care sunt resurse separate
  evidence: string // de unde știm (sursă date)
}

export interface TransformationGap {
  resource: string
  currentLevel: number
  nextLevel: number
  nextLevelName: string
  opportunity: string
  requiredInvestment: string
  potentialRevenue: string
  jobsEstimate: string
}

// ═══════════════════════════════════════════════════════════════
// CATALOGUL RESURSELOR — cele 3 roduri
// ═══════════════════════════════════════════════════════════════

export const RESOURCE_CATEGORIES: ResourceCategory[] = [
  // ════════════ RODUL PĂMÂNTULUI ════════════
  {
    id: "SOL", origin: "PAMANT",
    name: "Sol și agricultură",
    description: "Fertilitatea solului, suprafețe arabile, sisteme irigații",
    subcategories: [
      { id: "SOL_ARABIL", name: "Terenuri arabile", examples: ["cereale", "legume", "viță de vie", "pomi fructiferi"], detectFrom: ["agricol", "arabil", "ferma", "cultivat"] },
      { id: "SOL_PASUNE", name: "Pășuni și fânețe", examples: ["creștere animale", "lapte", "lână", "carne"], detectFrom: ["pasune", "zootehnic", "animale"] },
      { id: "SOL_PADURE", name: "Păduri și silvicultură", examples: ["lemn", "ciuperci", "fructe pădure", "vânat"], detectFrom: ["padure", "silvic", "forestier"] },
      { id: "SOL_IRIGAT", name: "Sisteme irigații", examples: ["agricultură intensivă", "sere", "solarii"], detectFrom: ["irigat", "irigatii", "canal"] },
    ],
  },
  {
    id: "SUBSOL", origin: "PAMANT",
    name: "Subsol și resurse minerale",
    description: "Resurse subterane, cariere, zăcăminte",
    subcategories: [
      { id: "SUBSOL_PIATRA", name: "Piatră și materiale construcții", examples: ["calcar", "granit", "nisip", "pietriș"], detectFrom: ["cariera", "piatra", "calcar", "ciment"] },
      { id: "SUBSOL_MINERAL", name: "Minerale și metale", examples: ["cupru", "fier", "aur", "sare"], detectFrom: ["mina", "mineral", "zacamant"] },
      { id: "SUBSOL_ENERGIE", name: "Resurse energetice", examples: ["gaze", "petrol", "cărbune", "geotermal"], detectFrom: ["petrol", "gaze", "energie", "geotermal"] },
    ],
  },
  {
    id: "APA", origin: "PAMANT",
    name: "Apă și ecosisteme acvatice",
    description: "Râuri, lacuri, ape subterane, mare",
    subcategories: [
      { id: "APA_RAURI", name: "Râuri și cursuri de apă", examples: ["pescuit", "energie hidro", "irigații", "transport"], detectFrom: ["rau", "fluviu", "curs de apa"] },
      { id: "APA_LACURI", name: "Lacuri și bălți", examples: ["pescuit", "turism", "biodiversitate"], detectFrom: ["lac", "balta", "iaz"] },
      { id: "APA_MARE", name: "Mare și litoral", examples: ["pescuit maritim", "turism", "transport naval", "alge"], detectFrom: ["mare", "litoral", "port", "plaja"] },
      { id: "APA_SUBTERAN", name: "Ape subterane", examples: ["apă potabilă", "termale", "băi"], detectFrom: ["izvor", "subteran", "termal", "foraj"] },
    ],
  },
  {
    id: "CLIMA", origin: "PAMANT",
    name: "Climă și energie naturală",
    description: "Soare, vânt, precipitații, potențial energetic",
    subcategories: [
      { id: "CLIMA_SOLAR", name: "Potențial solar", examples: ["panouri fotovoltaice", "solar termic", "uscare naturală"], detectFrom: ["solar", "fotovoltaic", "insolatie"] },
      { id: "CLIMA_EOLIAN", name: "Potențial eolian", examples: ["turbine eoliene", "ventilare naturală"], detectFrom: ["eolian", "vant", "turbina"] },
      { id: "CLIMA_TERMIC", name: "Climat favorabil", examples: ["turism sezonier", "agricultură specifică", "sănătate"], detectFrom: ["climat", "temperatura", "sezon"] },
    ],
  },
  {
    id: "RELIEF", origin: "PAMANT",
    name: "Relief și peisaj",
    description: "Forme de relief, peisaj, potențial turistic natural",
    subcategories: [
      { id: "RELIEF_MUNTE", name: "Zone montane", examples: ["turism montan", "schi", "drumeții", "ape minerale"], detectFrom: ["munte", "altitudine", "varf"] },
      { id: "RELIEF_CAMPIE", name: "Câmpii și podișuri", examples: ["agricultură extensivă", "energie eoliană", "transport"], detectFrom: ["campie", "podis", "platou", "ses"] },
      { id: "RELIEF_DELTA", name: "Deltă și zone umede", examples: ["ecoturism", "biodiversitate", "pescuit"], detectFrom: ["delta", "zona umeda", "mlastina", "stufaris"] },
    ],
  },

  // ════════════ RODUL CULTURII ════════════
  {
    id: "PATRIMONIU", origin: "CULTURA",
    name: "Patrimoniu construit",
    description: "Monumente, situri, clădiri istorice, arhitectură",
    subcategories: [
      { id: "PATRIM_MONUMENTE", name: "Monumente și situri", examples: ["turism cultural", "educație", "cercetare"], detectFrom: ["monument", "sit", "arheologic", "istoric", "muzeu"] },
      { id: "PATRIM_ARHITECTURA", name: "Arhitectură locală", examples: ["turism arhitectural", "restaurare", "identitate"], detectFrom: ["arhitectura", "cladire istorica", "cetate", "biserica veche"] },
      { id: "PATRIM_INDUSTRIAL", name: "Patrimoniu industrial", examples: ["reconversie", "muzeu tehnic", "loft", "artă"], detectFrom: ["fabrica veche", "industrial", "uzina", "reconversie"] },
    ],
  },
  {
    id: "TRADITII", origin: "CULTURA",
    name: "Tradiții și obiceiuri",
    description: "Meșteșuguri, obiceiuri, ritualuri, sărbători locale",
    subcategories: [
      { id: "TRAD_MESTESUG", name: "Meșteșuguri tradiționale", examples: ["artizanat", "produse handmade", "ateliere creative"], detectFrom: ["mestesug", "artizanat", "traditional", "handmade", "atelier"] },
      { id: "TRAD_OBICEIURI", name: "Obiceiuri și sărbători", examples: ["festivaluri", "turism eveniment", "identitate"], detectFrom: ["obicei", "sarbatoare", "festival", "traditie", "ritual"] },
      { id: "TRAD_GASTRONOMIE", name: "Gastronomie locală", examples: ["restaurante tradiționale", "produse locale", "turism culinar"], detectFrom: ["gastronomie", "reteta", "bucatarie", "local", "traditional"] },
    ],
  },
  {
    id: "DIVERSITATE", origin: "CULTURA",
    name: "Diversitate etnică și culturală",
    description: "Comunități etnice, sinteză culturală, multilingvism",
    subcategories: [
      { id: "DIV_ETNICA", name: "Comunități etnice", examples: ["turism multicultural", "gastronomie diversă", "artizanat specific"], detectFrom: ["etnic", "comunitate", "minoritate", "tatar", "turc", "roma"] },
      { id: "DIV_RELIGIOASA", name: "Diversitate religioasă", examples: ["turism religios", "dialog intercultural", "patrimoniu sacru"], detectFrom: ["biserica", "moschee", "sinagoga", "cult", "religie"] },
      { id: "DIV_LINGVISTICA", name: "Multilingvism", examples: ["traduceri", "turism lingvistic", "educație bilingvă"], detectFrom: ["limba", "bilingv", "dialect"] },
    ],
  },
  {
    id: "IDENTITATE", origin: "CULTURA",
    name: "Identitate și brand local",
    description: "Ce face locul unic, marca teritorială",
    subcategories: [
      { id: "ID_BRAND", name: "Brand teritorial", examples: ["marketing local", "produse cu indicație geografică", "turism"], detectFrom: ["brand", "marca", "identitate", "specific local"] },
      { id: "ID_POVESTE", name: "Narativ și poveste locală", examples: ["turism narativ", "ghidaje tematice", "experiențe imersive"], detectFrom: ["legenda", "poveste", "istorie locala"] },
    ],
  },

  // ════════════ RODUL INDIVIDULUI ════════════
  {
    id: "COMPETENTE", origin: "INDIVID",
    name: "Competențe profesionale",
    description: "Meserii, profesii, specializări ale populației locale",
    subcategories: [
      { id: "COMP_TEHNICE", name: "Competențe tehnice", examples: ["industrie", "IT", "inginerie", "construcții"], detectFrom: ["inginer", "tehnic", "it", "programator", "constructor"] },
      { id: "COMP_SERVICII", name: "Competențe servicii", examples: ["comerț", "turism", "sănătate", "educație"], detectFrom: ["servicii", "comert", "turism", "medic", "profesor"] },
      { id: "COMP_AGRICOLE", name: "Competențe agricole", examples: ["fermieri", "viticultori", "crescători"], detectFrom: ["fermier", "agricultor", "viticultor"] },
      { id: "COMP_CREATIVE", name: "Competențe creative", examples: ["artiști", "designeri", "meșteșugari", "muzicieni"], detectFrom: ["artist", "designer", "creator", "muzician"] },
    ],
  },
  {
    id: "CAPITAL_SOCIAL", origin: "INDIVID",
    name: "Capital social",
    description: "Rețele de relații, încredere, reputație, comunitate",
    subcategories: [
      { id: "CS_RETELE", name: "Rețele profesionale", examples: ["asociații", "cluburi", "camere comerț"], detectFrom: ["asociatie", "club", "retea", "camera de comert"] },
      { id: "CS_DIASPORA", name: "Diaspora", examples: ["remitențe", "transfer cunoștințe", "investiții"], detectFrom: ["diaspora", "plecat", "strainatate", "intors"] },
      { id: "CS_VOLUNTARIAT", name: "Voluntariat și civic", examples: ["ONG-uri", "inițiative locale", "participare"], detectFrom: ["ong", "voluntar", "civic", "comunitar"] },
    ],
  },
  {
    id: "CAPITAL_INTELECTUAL", origin: "INDIVID",
    name: "Capital intelectual",
    description: "Idei, brevete, cercetare, inovare locală",
    subcategories: [
      { id: "CI_EDUCATIE", name: "Instituții educație", examples: ["universități", "centre cercetare", "biblioteci"], detectFrom: ["universitate", "facultate", "cercetare", "scoala", "liceu"] },
      { id: "CI_INOVARE", name: "Inovare locală", examples: ["startup-uri", "brevete", "incubatoare"], detectFrom: ["startup", "inovare", "brevet", "incubator", "accelerator"] },
      { id: "CI_EXPERIENTA", name: "Experiență acumulată", examples: ["mentori", "pensionari activi", "maeștri meseriași"], detectFrom: ["experienta", "mentor", "maestru", "senior"] },
    ],
  },
]

// ═══════════════════════════════════════════════════════════════
// PIPELINE TRANSFORMARE — nivelurile spiralei
// ═══════════════════════════════════════════════════════════════

export const TRANSFORMATION_LEVELS: TransformationLevel[] = [
  { level: 0, name: "Rod brut", description: "Resursă în starea naturală / existență latentă", valueAdded: "Existență", jobsCreated: "0" },
  { level: 1, name: "Recoltare / Extracție", description: "Culegere, extracție, identificare, descoperire", valueAdded: "Accesibilitate", jobsCreated: "Primar (fermieri, mineri, cercetători)" },
  { level: 2, name: "Procesare primară", description: "Transformare de bază, curățare, sortare, documentare", valueAdded: "Utilizabilitate", jobsCreated: "Procesatori (morari, ateliere, studio)" },
  { level: 3, name: "Producție", description: "Produs concret, fabricat, creat, construit", valueAdded: "Funcționalitate", jobsCreated: "Producători (fabrici, ateliere, studiouri)" },
  { level: 4, name: "Distribuție", description: "Vânzare, transport, logistică, disponibilizare", valueAdded: "Accesibilitate largă", jobsCreated: "Comercianți, logistică, online" },
  { level: 5, name: "Servicii", description: "Serviciu bazat pe produs, valoare adăugată prin competență", valueAdded: "Experiență utilizare", jobsCreated: "Servicii (restaurante, consultanți)" },
  { level: 6, name: "Experiență", description: "Experiență memorabilă, turism, brand, identitate", valueAdded: "Emoție și memorie", jobsCreated: "Turism, evenimente, brand management" },
  { level: 7, name: "Cunoaștere", description: "Export know-how, educație, formare, franciză", valueAdded: "Replicabilitate", jobsCreated: "Educație, consultanță, franciză" },
]

// ═══════════════════════════════════════════════════════════════
// ANALIZĂ RESURSE — detectare din date crawlate
// ═══════════════════════════════════════════════════════════════

/**
 * Analizează resursele unui teritoriu din datele crawlate.
 * Detectează ce resurse există și la ce nivel de transformare sunt.
 */
export function analyzeResources(
  territorialData: Array<{ category: string; subcategory?: string | null; key: string; value: string }>,
  localEntities: Array<{ type: string; name: string; category?: string | null; metadata?: any }>,
  territory: string
): {
  resources: ResourceInstance[]
  transformationGaps: TransformationGap[]
  summary: {
    byOrigin: Record<ResourceOrigin, number>
    byLevel: Record<number, number>
    totalResources: number
    avgTransformLevel: number
  }
} {
  const resources: ResourceInstance[] = []

  // Combinăm toate textele din date crawlate pentru matching
  const allTexts = [
    ...territorialData.map(d => `${d.key} ${d.value} ${d.subcategory || ""}`),
    ...localEntities.map(e => `${e.name} ${e.type} ${e.category || ""}`),
  ].join(" ").toLowerCase()

  // Detectăm resurse din taxonomie
  for (const cat of RESOURCE_CATEGORIES) {
    for (const sub of cat.subcategories) {
      const matches = sub.detectFrom.filter(kw => allTexts.includes(kw.toLowerCase()))

      if (matches.length > 0) {
        // Determinăm nivelul de transformare curent
        let currentLevel = 0
        const hasEntities = localEntities.some(e =>
          sub.detectFrom.some(kw => (e.name + " " + (e.category || "")).toLowerCase().includes(kw))
        )

        if (hasEntities) {
          // Dacă există entități locale (firme, instituții) → minimum nivel 3-4
          const hasBusiness = localEntities.some(e =>
            e.type === "BUSINESS" && sub.detectFrom.some(kw => (e.name + " " + (e.category || "")).toLowerCase().includes(kw))
          )
          currentLevel = hasBusiness ? 4 : 3
        } else {
          // Doar mențiuni în date → nivel 0-1
          currentLevel = 1
        }

        // Derivate (subproduse)
        const derivatives: string[] = []
        if (cat.id === "SOL") derivatives.push("compost", "biomasă", "peisaj agricol")
        if (cat.id === "SUBSOL") derivatives.push("praf mineral", "material construcții", "relief modelat")
        if (cat.id === "TRADITII") derivatives.push("identitate locală", "capital social", "turism experiențial")
        if (cat.id === "COMPETENTE") derivatives.push("mentorat", "formare profesională", "consultanță")

        resources.push({
          categoryId: cat.id,
          subcategoryId: sub.id,
          name: sub.name,
          origin: cat.origin,
          territory,
          available: true,
          abundance: matches.length >= 3 ? "HIGH" : matches.length >= 2 ? "MEDIUM" : "LOW",
          currentTransformLevel: currentLevel,
          maxPotentialLevel: 7,
          derivatives,
          evidence: `Detectat din: ${matches.join(", ")}`,
        })
      }
    }
  }

  // Calculăm gap-urile de transformare
  const transformationGaps: TransformationGap[] = resources
    .filter(r => r.currentTransformLevel < 6) // pot evolua
    .map(r => {
      const nextLevel = r.currentTransformLevel + 1
      const levelInfo = TRANSFORMATION_LEVELS[nextLevel]
      return {
        resource: r.name,
        currentLevel: r.currentTransformLevel,
        nextLevel,
        nextLevelName: levelInfo?.name || "Necunoscut",
        opportunity: `${r.name}: de la "${TRANSFORMATION_LEVELS[r.currentTransformLevel]?.name}" la "${levelInfo?.name}"`,
        requiredInvestment: nextLevel <= 2 ? "Mic" : nextLevel <= 4 ? "Mediu" : "Mare",
        potentialRevenue: nextLevel <= 2 ? "Subsistență" : nextLevel <= 4 ? "Piață locală" : "Piață regională/națională",
        jobsEstimate: levelInfo?.jobsCreated || "De evaluat",
      }
    })
    .sort((a, b) => a.currentLevel - b.currentLevel) // resursele cele mai brute au prioritate

  // Summary
  const byOrigin: Record<ResourceOrigin, number> = { PAMANT: 0, CULTURA: 0, INDIVID: 0 }
  const byLevel: Record<number, number> = {}
  for (const r of resources) {
    byOrigin[r.origin]++
    byLevel[r.currentTransformLevel] = (byLevel[r.currentTransformLevel] || 0) + 1
  }
  const avgLevel = resources.length > 0
    ? Math.round((resources.reduce((s, r) => s + r.currentTransformLevel, 0) / resources.length) * 10) / 10
    : 0

  return {
    resources,
    transformationGaps,
    summary: {
      byOrigin,
      byLevel,
      totalResources: resources.length,
      avgTransformLevel: avgLevel,
    },
  }
}
