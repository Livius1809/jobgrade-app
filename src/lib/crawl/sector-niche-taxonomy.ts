/**
 * sector-niche-taxonomy.ts — Taxonomie Sector → Nișe → Sub-nișe
 *
 * Fiecare oportunitate teritorială aparține unui SECTOR (domeniu general)
 * care conține NIȘE (oportunități concrete) care pot avea SUB-NIȘE.
 *
 * Motorul evaluează fiecare nișă pe: cerere, ofertă existentă, resurse,
 * barieră de intrare, nivel transformare, potențial de creștere.
 */

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface Sector {
  id: string
  name: string
  description: string
  /** CAEN-uri asociate sectorului */
  caenCodes: string[]
  niches: Niche[]
}

export interface Niche {
  id: string
  name: string
  description: string
  /** Sub-nișe (ex: Turism medical → Stomatologie, Oftalmologie) */
  subNiches?: SubNiche[]
  /** Referințe internaționale — cine face asta bine */
  references?: string[]
  /** CAEN-uri specifice nișei */
  caenCodes?: string[]
}

export interface SubNiche {
  id: string
  name: string
  description: string
  references?: string[]
}

export interface NicheScore {
  nicheId: string
  sectorId: string
  /** Cerere locală (0-10) — câți oameni au nevoie */
  demand: number
  /** Ofertă existentă (0-10) — câți furnizori sunt (invers: 10 = zero furnizori) */
  supplyGap: number
  /** Resurse disponibile (0-10) — materie primă, competențe, infra */
  resourceAvailability: number
  /** Barieră de intrare (0-10, invers: 10 = barieră mică) */
  entryEase: number
  /** Nivel transformare curent (0-7) — unde se oprește lanțul valoric */
  currentTransformLevel: number
  /** Potențial de creștere (0-10) — tendință cerere + trend */
  growthPotential: number
  /** Scor agregat brut (înainte de filtrele L1/L3) */
  rawScore: number
  /** Populația afectată */
  affectedPopulation: number
  /** Estimare investiție necesară */
  investmentLevel: "MICA" | "MEDIE" | "MARE" | "FOARTE_MARE"
  /** Timp estimat până la primele rezultate */
  timeToResults: string
}

// ═══════════════════════════════════════════════════════════════
// TAXONOMIE SECTOARE + NIȘE (România)
// ═══════════════════════════════════════════════════════════════

export const SECTOR_TAXONOMY: Sector[] = [
  {
    id: "TURISM",
    name: "Turism",
    description: "Sector cu potențial major în România — patrimoniu natural și cultural subexploatat",
    caenCodes: ["5510", "5520", "5530", "5590", "7911", "7912", "7990"],
    niches: [
      {
        id: "TURISM_CULTURAL",
        name: "Turism cultural",
        description: "Valorificarea patrimoniului construit și imaterial — monumente, muzee, rute culturale",
        references: ["Plovdiv (BG)", "Brașov (RO)", "Sibiu (RO)"],
        subNiches: [
          { id: "TURISM_CULTURAL_ETNIC", name: "Turism etno-cultural", description: "Experiențe centrate pe diversitatea etnică locală (tradiții, gastronomie, meșteșug)" },
          { id: "TURISM_CULTURAL_RELIGIOS", name: "Turism religios", description: "Mănăstiri, lăcașuri, pelerinaje, rute spirituale" },
          { id: "TURISM_CULTURAL_PATRIMONIU", name: "Turism de patrimoniu", description: "Cetăți, fortificații, situri arheologice, monumente istorice" },
        ],
      },
      {
        id: "TURISM_GASTRONOMIC",
        name: "Turism gastronomic",
        description: "Rute culinare, experiențe de gătit, produse locale, degustări",
        references: ["Toscana (IT)", "Lyon (FR)", "San Sebastián (ES)"],
        subNiches: [
          { id: "TURISM_GASTRO_RUTE", name: "Rute culinare", description: "Trasee tematice cu opriri la producători, restaurante, pivnițe" },
          { id: "TURISM_GASTRO_ATELIERE", name: "Ateliere de gătit", description: "Experiențe hands-on cu rețete tradiționale locale" },
          { id: "TURISM_GASTRO_VINURI", name: "Enoturism", description: "Degustări, vizite la crame, rute viticole" },
        ],
      },
      {
        id: "TURISM_MEDICAL",
        name: "Turism medical",
        description: "Servicii medicale + recuperare + wellness pentru pacienți din alte zone/țări",
        references: ["Bodrum (TR)", "Budapest (HU)", "Bangkok (TH)"],
        subNiches: [
          { id: "TURISM_MED_STOMA", name: "Stomatologie", description: "Tratamente dentare la prețuri competitive + vacanță" },
          { id: "TURISM_MED_RECUPERARE", name: "Recuperare/balneo", description: "Stațiuni balneare, ape termale, kinetoterapie" },
          { id: "TURISM_MED_WELLNESS", name: "Wellness/spa", description: "Relaxare, detox, sănătate preventivă" },
          { id: "TURISM_MED_OFTALMO", name: "Oftalmologie", description: "Chirurgie oculară, laser, consultații specializate" },
        ],
      },
      {
        id: "TURISM_RURAL",
        name: "Turism rural/agro",
        description: "Experiențe la fermă, recoltare, viață rurală autentică",
        references: ["Maramureș (RO)", "Provence (FR)", "Tirol (AT)"],
        subNiches: [
          { id: "TURISM_RURAL_FERMA", name: "Agro-turism", description: "Cazare la fermă, participare la activități agricole" },
          { id: "TURISM_RURAL_ECO", name: "Eco-turism", description: "Observare natură, drumeții, biodiversitate" },
          { id: "TURISM_RURAL_AVENTURA", name: "Turism de aventură", description: "Ciclism, echitație, caiac, off-road" },
        ],
      },
      {
        id: "TURISM_EDUCATIONAL",
        name: "Turism educațional",
        description: "Tabere, programe formare, experiențe de învățare",
        references: ["Finlanda (edu-tourism)", "Japonia (cultural exchange)"],
      },
      {
        id: "TURISM_RELIGIOS",
        name: "Turism religios",
        description: "Pelerinaje, mănăstiri, lăcașe de cult, rute spirituale — experiență de credință",
        references: ["Camino de Santiago (ES)", "Muntele Athos (GR)", "Mănăstirile din Bucovina (RO)"],
        subNiches: [
          { id: "TURISM_REL_PELERINAJ", name: "Pelerinaje", description: "Trasee sacre, hramuri, procesiuni, sărbători religioase" },
          { id: "TURISM_REL_MANASTIRI", name: "Mănăstiri și lăcașe", description: "Vizitare, cazare monahală, retrageri spirituale" },
          { id: "TURISM_REL_INTERFAITH", name: "Turism interconfesional", description: "Experiențe multi-religioase — moschei, biserici, sinagogi în aceeași zonă (ex: Dobrogea)" },
        ],
      },
      {
        id: "TURISM_SPIRITUAL",
        name: "Turism spiritual și vindecător",
        description: "Locuri cu proprietăți vindecătoare, energii sacre, retrageri contemplative — dincolo de religia organizată",
        references: ["Sedona (US)", "Glastonbury (UK)", "Rishikesh (IN)", "Peștera Sfântului Andrei (RO)"],
        subNiches: [
          { id: "TURISM_SPIR_IZVOARE", name: "Izvoare tămăduitoare", description: "Izvoare cu proprietăți vindecătoare atestate de tradiție și/sau analize chimice" },
          { id: "TURISM_SPIR_ENERGETICE", name: "Locuri energetice", description: "Zone cu energii tellurice, vortexuri, locuri de meditație naturale" },
          { id: "TURISM_SPIR_RETRAGERI", name: "Retrageri contemplative", description: "Retreat-uri de meditație, tăcere, yoga, reconectare cu natura" },
          { id: "TURISM_SPIR_VINDECATOARE", name: "Practici vindecătoare tradiționale", description: "Fitoterapie, apiterapie, practici tradiționale locale de vindecare" },
        ],
      },
      {
        id: "TURISM_INDUSTRIAL",
        name: "Turism industrial",
        description: "Vizitare situri industriale active sau dezafectate — curiozitate, istorie",
        references: ["Chernobyl tour (UA)", "Ruhr Valley (DE)", "Wieliczka (PL)"],
      },
      {
        id: "TURISM_EVENTOS",
        name: "Turism de evenimente",
        description: "Festivaluri, conferințe, team building, târguri",
        references: ["Edinburgh Fringe (UK)", "Untold/Electric Castle (RO)"],
      },
    ],
  },
  {
    id: "AGRICULTURA",
    name: "Agricultură și procesare alimentară",
    description: "De la cultură mare la produse finite — lanțul valoric complet",
    caenCodes: ["0111", "0113", "0121", "0141", "1011", "1020", "1051", "1061", "1071", "1082"],
    niches: [
      {
        id: "AGRI_CULTURA_MARE",
        name: "Cultură mare",
        description: "Grâu, porumb, floarea-soarelui, rapiță — export materie primă",
        subNiches: [
          { id: "AGRI_CM_CEREALE", name: "Cereale", description: "Grâu, porumb, orz, ovăz" },
          { id: "AGRI_CM_OLEAGINOASE", name: "Oleaginoase", description: "Floarea-soarelui, rapiță, soia" },
          { id: "AGRI_CM_LEGUMINOASE", name: "Leguminoase", description: "Mazăre, fasole, linte, năut" },
        ],
      },
      {
        id: "AGRI_PROCESARE_PRIMARA",
        name: "Procesare primară",
        description: "Morărit, ulei, descojire — transformare nivel 2",
        references: ["Bunge (globali)", "cooperative locale (AT, FR)"],
      },
      {
        id: "AGRI_PROCESARE_SECUNDARA",
        name: "Procesare secundară",
        description: "Panificație, paste, conserve — produs finit nivel 3",
        references: ["Barilla (IT)", "cooperative artizanale (FR)"],
      },
      {
        id: "AGRI_BIO_ORGANIC",
        name: "Bio/organic",
        description: "Certificare bio, produse premium, piață urbană în creștere",
        references: ["Bioland (DE)", "piețe fermier București/Cluj"],
      },
      {
        id: "AGRI_NISA_PREMIUM",
        name: "Culturi de nișă premium",
        description: "Lavandă, șofran, plante medicinale, fructe de pădure cultivate",
        references: ["Provence lavandă (FR)", "Saffron Valley (ES)"],
        subNiches: [
          { id: "AGRI_NISA_PLANTE_MED", name: "Plante medicinale", description: "Cultivare, uscare, extracte, ceaiuri" },
          { id: "AGRI_NISA_AROMATICE", name: "Plante aromatice", description: "Lavandă, rozmarin, mentă, busuioc" },
          { id: "AGRI_NISA_FRUCTE_PAD", name: "Fructe de pădure", description: "Afine, mure, zmeură — cultivate sau colectate" },
        ],
      },
      {
        id: "AGRI_ZOOTEHNIE",
        name: "Zootehnie",
        description: "Creșterea animalelor — lapte, carne, ouă, lână, miere",
        subNiches: [
          { id: "AGRI_ZOO_APICULTURA", name: "Apicultură", description: "Miere, propolis, polen, ceară — export + piață internă" },
          { id: "AGRI_ZOO_LACTATE", name: "Produse lactate", description: "Brânzeturi, iaurturi artizanale, unt" },
          { id: "AGRI_ZOO_AVICULTURA", name: "Avicultură", description: "Ouă, carne de pasăre, pene" },
        ],
      },
    ],
  },
  {
    id: "SANATATE",
    name: "Sănătate",
    description: "Servicii medicale, recuperare, sănătate mintală — gap cronic în România rurală și semi-urbană",
    caenCodes: ["8610", "8621", "8622", "8623", "8690", "8710", "8720", "8730", "8790"],
    niches: [
      {
        id: "SAN_PRIMARA",
        name: "Medicină primară",
        description: "Cabinete medicină de familie, pediatrie, ginecologie",
      },
      {
        id: "SAN_SPECIALITATI",
        name: "Specialități medicale",
        description: "Stomatologie, oftalmologie, ORL, dermatologie, ortopedie",
        subNiches: [
          { id: "SAN_SPEC_STOMA", name: "Stomatologie", description: "Cabinete dentare, ortodonție, implantologie" },
          { id: "SAN_SPEC_OFTALMO", name: "Oftalmologie", description: "Consultații, ochelari, laser" },
          { id: "SAN_SPEC_DERMATO", name: "Dermatologie", description: "Consultații, tratamente, estetică medicală" },
        ],
      },
      {
        id: "SAN_RECUPERARE",
        name: "Recuperare/fizioterapie",
        description: "Kinetoterapie, balneologie, recuperare post-operatorie",
        references: ["Sovata, Băile Felix (RO)", "Piešťany (SK)"],
      },
      {
        id: "SAN_MINTALA",
        name: "Sănătate mintală",
        description: "Psihologi, psihoterapeuți, consiliere, grupuri suport",
      },
      {
        id: "SAN_TELEMEDICINA",
        name: "Telemedicină",
        description: "Consultații online, monitorizare la distanță, prescripții digitale",
        references: ["Doctoranytime (GR/RO)", "Babylon Health (UK)"],
      },
      {
        id: "SAN_VARSTNICI",
        name: "Servicii pentru vârstnici",
        description: "Centre de zi, îngrijire la domiciliu, asistenți personali",
      },
      {
        id: "SAN_LABORATOR",
        name: "Analize medicale/laborator",
        description: "Recoltare analize, diagnostic, screening populațional",
        references: ["Synevo, MedLife (RO)"],
      },
    ],
  },
  {
    id: "EDUCATIE",
    name: "Educație și formare",
    description: "De la educație timpurie la reconversie profesională — gap major în formarea practică",
    caenCodes: ["8510", "8520", "8531", "8532", "8541", "8542", "8551", "8552", "8553", "8559"],
    niches: [
      {
        id: "EDU_FORMARE_PROF",
        name: "Formare profesională",
        description: "Meserii, calificări, certificări — acoperirea gap-ului NEET",
        references: ["Dual system (DE/AT)", "CNFPA acreditări (RO)"],
        subNiches: [
          { id: "EDU_FP_MESERII", name: "Meserii tehnice", description: "Sudură, electrician, instalator, mecanic" },
          { id: "EDU_FP_SERVICII", name: "Servicii", description: "Ospătar, bucătar, coafor, cosmetician" },
          { id: "EDU_FP_DIGITAL", name: "Competențe digitale", description: "IT de bază, programare, ecommerce, marketing digital" },
        ],
      },
      {
        id: "EDU_RECONVERSIE",
        name: "Reconversie profesională",
        description: "Adulți care schimbă domeniul — industrie în transformare",
      },
      {
        id: "EDU_ANTREPRENORIAT",
        name: "Educație antreprenorială",
        description: "Business planning, finanțare, mentorat — punte spre Card 5 B2C",
      },
      {
        id: "EDU_LIMBA",
        name: "Limbi străine",
        description: "Engleză, germană, franceză — cerere permanentă",
      },
      {
        id: "EDU_TIMPURIE",
        name: "Educație timpurie",
        description: "Grădinițe, afterschool, centre educaționale copii",
      },
      {
        id: "EDU_DIGITAL_AVANSATA",
        name: "Educație digitală avansată",
        description: "AI, data science, cybersecurity, cloud — competențe ale viitorului",
        references: ["Codecool (HU/RO)", "42 (FR)", "bootcamp-uri"],
      },
    ],
  },
  {
    id: "PRODUCTIE",
    name: "Producție și manufacturare",
    description: "De la materie primă la produs finit — creșterea nivelului de transformare locală",
    caenCodes: ["1011", "1020", "1039", "1051", "1071", "1082", "1520", "2512", "2562", "3109"],
    niches: [
      {
        id: "PROD_ALIMENTARA",
        name: "Producție alimentară",
        description: "Mezeluri, lactate, conserve, dulciuri — materie primă locală",
        subNiches: [
          { id: "PROD_ALIM_MEZELURI", name: "Mezeluri/carmangerie", description: "Produse tradiționale din carne locală" },
          { id: "PROD_ALIM_LACTATE", name: "Lactate artizanale", description: "Brânzeturi, iaurturi cu specific local" },
          { id: "PROD_ALIM_CONSERVE", name: "Conserve/murături", description: "Procesare legume/fructe sezonier" },
          { id: "PROD_ALIM_PANIFICATIE", name: "Panificație/patiserie", description: "Pâine, covrigi, baclava (specific local)" },
        ],
      },
      {
        id: "PROD_CONSTRUCTII",
        name: "Materiale construcții",
        description: "Cărămidă, beton, prefabricate — resurse locale disponibile",
      },
      {
        id: "PROD_TEXTILE",
        name: "Textile/confecții",
        description: "Micro-nișă premium — artizanat, design local, brand",
      },
      {
        id: "PROD_LEMN",
        name: "Prelucrare lemn/mobilă",
        description: "Mobilier, tâmplărie, obiecte decorative — meșteșug + design",
      },
      {
        id: "PROD_ARTIZANAT",
        name: "Artizanat/meșteșuguri",
        description: "Ceramică, țesătură, împletituri — patrimoniu viu + valoare comercială",
        references: ["Corund (RO)", "Sasaki (JP)", "Murano (IT)"],
      },
    ],
  },
  {
    id: "SERVICII",
    name: "Servicii",
    description: "De la logistică la IT — servicii care rețin valoare în teritoriu",
    caenCodes: ["4941", "5210", "6201", "6202", "6311", "6920", "7022", "7111", "7120", "8121"],
    niches: [
      {
        id: "SERV_LOGISTICA",
        name: "Logistică și transport",
        description: "Hub logistic, curierat local, depozitare — poziție geografică strategică",
      },
      {
        id: "SERV_IT_REMOTE",
        name: "IT/BPO remote",
        description: "Servicii digitale livrate de la distanță — cost redus, calitate competitivă",
        subNiches: [
          { id: "SERV_IT_DEV", name: "Dezvoltare software", description: "Programare, web dev, mobile" },
          { id: "SERV_IT_BPO", name: "Business Process Outsourcing", description: "Suport clienți, data entry, contabilitate" },
          { id: "SERV_IT_MKTG", name: "Marketing digital", description: "Social media, SEO, content, campanii" },
        ],
      },
      {
        id: "SERV_REPARATII",
        name: "Reparații/mentenanță",
        description: "Electrocasnice, auto, instalații — gap local = naveta la oraș mare",
      },
      {
        id: "SERV_PROFESIONALE",
        name: "Servicii profesionale",
        description: "Contabilitate, juridic, consultanță, notariat — adesea sub-deservite",
        subNiches: [
          { id: "SERV_PROF_CONTAB", name: "Contabilitate", description: "Contabilitate firme mici, PFA, declarații" },
          { id: "SERV_PROF_JURIDIC", name: "Servicii juridice", description: "Consultanță, acte, reprezentare" },
          { id: "SERV_PROF_IMOBILIAR", name: "Imobiliare", description: "Evaluare, intermediere, cadastru" },
        ],
      },
      {
        id: "SERV_ECOMMERCE",
        name: "Ecommerce local",
        description: "Platforme și servicii care aduc producătorii locali online",
      },
    ],
  },
  {
    id: "ENERGIE",
    name: "Energie",
    description: "Surse regenerabile + eficiență energetică — potențial ridicat în Dobrogea (solar, eolian)",
    caenCodes: ["3511", "3514", "3521", "3530", "4222"],
    niches: [
      {
        id: "ENRG_SOLAR",
        name: "Energie solară",
        description: "Ferme fotovoltaice, panouri prosumator, comunități energetice",
        references: ["Dobrogea — iradiere maximă RO", "Spania, Grecia"],
      },
      {
        id: "ENRG_EOLIAN",
        name: "Energie eoliană",
        description: "Parcuri eoliene — investiții deja existente în zonă",
      },
      {
        id: "ENRG_BIOMASA",
        name: "Biomasă",
        description: "Deșeuri agricole (paie, coceni) → energie — resursă ignorată",
      },
      {
        id: "ENRG_COMUNITATI",
        name: "Comunități energetice",
        description: "Prosumatori, micro-rețele, stocare locală — legislație nouă favorabilă",
        references: ["Energiegemeinschaften (AT)", "Directiva UE 2018/2001"],
      },
      {
        id: "ENRG_EFICIENTA",
        name: "Eficiență energetică",
        description: "Reabilitare termică, pompe de căldură, audit energetic",
      },
    ],
  },
  {
    id: "IMOBILIAR",
    name: "Imobiliar și construcții",
    description: "Locuințe, spații comerciale, reabilitare — cerere legată de demografie și migrație",
    caenCodes: ["4120", "4211", "4299", "6810", "6820"],
    niches: [
      {
        id: "IMOB_REZIDENTIAL",
        name: "Rezidențial",
        description: "Locuințe noi, reabilitare vechi, ANL, credit ipotecar",
      },
      {
        id: "IMOB_COMERCIAL",
        name: "Spații comerciale",
        description: "Magazine, birouri, coworking — în funcție de cerere",
      },
      {
        id: "IMOB_REABILITARE",
        name: "Reabilitare urbană",
        description: "Regenerare zone degradate, centre istorice, spații publice",
        references: ["Sibiu centru vechi (RO)", "Leipzig (DE)"],
      },
    ],
  },
]

// ═══════════════════════════════════════════════════════════════
// SCORING NIȘE
// ═══════════════════════════════════════════════════════════════

/**
 * Calculează scorul brut al unei nișe pentru un teritoriu.
 * Scorul brut = medie ponderată din 6 criterii.
 * După calculare, trece prin filtrele L1 (Binele) și L3 (Legal).
 */
export function calculateNicheRawScore(params: {
  demand: number
  supplyGap: number
  resourceAvailability: number
  entryEase: number
  currentTransformLevel: number
  growthPotential: number
}): number {
  // Ponderi — cererea și gap-ul contează cel mai mult
  const weights = {
    demand: 0.25,
    supplyGap: 0.20,
    resourceAvailability: 0.15,
    entryEase: 0.15,
    transformGap: 0.10,  // 7 - currentLevel = cât mai e de urcat
    growthPotential: 0.15,
  }

  const transformGap = Math.min(10, (7 - params.currentTransformLevel) * 1.43) // normalizat la 0-10

  return Math.round((
    params.demand * weights.demand +
    params.supplyGap * weights.supplyGap +
    params.resourceAvailability * weights.resourceAvailability +
    params.entryEase * weights.entryEase +
    transformGap * weights.transformGap +
    params.growthPotential * weights.growthPotential
  ) * 10) / 10
}

/**
 * Găsește toate nișele unui sector.
 * Returnează flat list (nișe + sub-nișe) pentru iterare.
 */
export function flattenNiches(sector: Sector): Array<Niche & { sectorId: string; parentNicheId?: string }> {
  const result: Array<Niche & { sectorId: string; parentNicheId?: string }> = []

  for (const niche of sector.niches) {
    result.push({ ...niche, sectorId: sector.id })

    if (niche.subNiches) {
      for (const sub of niche.subNiches) {
        result.push({
          ...sub,
          subNiches: undefined,
          sectorId: sector.id,
          parentNicheId: niche.id,
        })
      }
    }
  }

  return result
}

/**
 * Returnează toate nișele din toate sectoarele — flat.
 */
export function getAllNichesFlat(): Array<Niche & { sectorId: string; sectorName: string; parentNicheId?: string }> {
  const result: Array<Niche & { sectorId: string; sectorName: string; parentNicheId?: string }> = []

  for (const sector of SECTOR_TAXONOMY) {
    for (const item of flattenNiches(sector)) {
      result.push({ ...item, sectorName: sector.name })
    }
  }

  return result
}
