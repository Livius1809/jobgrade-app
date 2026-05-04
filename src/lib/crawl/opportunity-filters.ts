/**
 * opportunity-filters.ts — Filtrele L1 (Binele) și L3 (Legal)
 *
 * Fiecare oportunitate teritorială trece prin două filtre:
 *
 * L3 (LEGAL) — primul filtru, binar:
 *   Este legal? Există reglementări specifice? Ce licențe/autorizații trebuie?
 *   Dacă NU e legal → oportunitatea e RESPINSĂ (nu ajunge la L1).
 *
 * L1 (BINELE) — al doilea filtru, scoring:
 *   Susține Binele? Se auto-propagă? Creează dependență sau autonomie?
 *   Scorare separată pe dimensiuni etice → ajustează scorul final.
 *
 * Pipeline: Oportunitate brută → L3 (legal) → L1 (etic) → Scor final
 */

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

/** Rezultatul filtrului L3 (Legal) */
export interface L3LegalAssessment {
  /** Este legal? */
  isLegal: boolean
  /** Nivel de reglementare (cât de reglementat e sectorul) */
  regulationLevel: "NEREGLEMENTAT" | "REGLEMENTAT" | "STRICT_REGLEMENTAT" | "INTERZIS"
  /** Licențe/autorizații necesare */
  requiredLicenses: string[]
  /** Organisme de autorizare */
  authorizingBodies: string[]
  /** Conformitate UE necesară (directive, regulamente) */
  euCompliance: string[]
  /** Riscuri legale identificate */
  legalRisks: string[]
  /** Note explicative */
  notes: string
}

/** Rezultatul filtrului L1 (Binele) — scoring pe dimensiuni */
export interface L1EthicalAssessment {
  /** Scor global etic (0-10) */
  overallScore: number
  /** Dimensiuni individuale */
  dimensions: {
    /** Susține bunăstarea comunității? (nu doar profit individual) */
    communityWellbeing: number
    /** Respectă demnitatea umană? (nu exploatează vulnerabilități) */
    humanDignity: number
    /** Protejează mediul? (sau cel puțin nu dăunează) */
    environmentalCare: number
    /** Creează autonomie? (vs. dependență) */
    autonomyCreation: number
    /** Se auto-propagă? (Binele generat produce mai mult Bine) */
    selfPropagation: number
    /** Este transparent? (procesul, prețul, calitatea sunt vizibile) */
    transparency: number
    /** Contribuie la educație/cunoaștere? (ridică nivelul, nu exploatează ignoranța) */
    knowledgeContribution: number
    /** Respectă echitatea? (acces egal, fără discriminare) */
    equity: number
  }
  /** Factori pozitivi identificați */
  positiveFactors: string[]
  /** Factori negativi / riscuri etice */
  negativeFactors: string[]
  /** Condiții pentru ca oportunitatea să rămână etică */
  ethicalConditions: string[]
  /** Notă: cum se auto-propagă Binele în acest caz */
  propagationMechanism: string
}

/** Oportunitate evaluată complet (brut + L3 + L1) */
export interface EvaluatedOpportunity {
  /** Identificator nișă */
  nicheId: string
  sectorId: string
  sectorName: string
  nicheName: string
  /** Scor brut (economic) */
  rawScore: number
  /** Filtrul L3 */
  legal: L3LegalAssessment
  /** Filtrul L1 (null dacă L3 a respins) */
  ethical: L1EthicalAssessment | null
  /** Scorul final ajustat (rawScore × factorEtic) */
  finalScore: number
  /** Status final */
  status: "APROBATA" | "CONDITIONATA" | "RESPINSA_LEGAL" | "RESPINSA_ETIC"
  /** Motivul respingerii (dacă e cazul) */
  rejectionReason?: string
}

// ═══════════════════════════════════════════════════════════════
// L3 — FILTRUL LEGAL
// ═══════════════════════════════════════════════════════════════

/**
 * Mapare sector/nișă → cadru legal aplicabil în România.
 * Crawlerul L3 actualizează periodic (Monitor Oficial, EUR-Lex).
 * Aici e knowledge de bază — Claude rafinează per caz.
 */
const LEGAL_FRAMEWORK: Record<string, Partial<L3LegalAssessment>> = {
  // TURISM
  "TURISM": {
    regulationLevel: "REGLEMENTAT",
    requiredLicenses: ["Licență turism (MEAT)", "Certificat clasificare"],
    authorizingBodies: ["Ministerul Economiei, Antreprenoriatului și Turismului"],
    euCompliance: ["Directiva 2015/2302 (pachete turistice)"],
  },
  "TURISM_MEDICAL": {
    regulationLevel: "STRICT_REGLEMENTAT",
    requiredLicenses: ["Autorizare sanitară (DSP)", "Licență turism", "Autorizare unitate medicală"],
    authorizingBodies: ["DSP", "Colegiul Medicilor", "MEAT"],
    euCompliance: ["Directiva 2011/24/UE (drepturi pacienți transfrontalieri)"],
    legalRisks: ["Răspundere medicală", "Asigurare malpraxis obligatorie"],
  },

  // AGRICULTURĂ
  "AGRICULTURA": {
    regulationLevel: "REGLEMENTAT",
    requiredLicenses: ["Înregistrare APIA", "Autorizare DSVSA (procesare)"],
    authorizingBodies: ["APIA", "DSVSA", "MADR"],
    euCompliance: ["PAC (Politica Agricolă Comună)", "Regulament 178/2002 (siguranță alimentară)"],
  },
  "AGRI_BIO_ORGANIC": {
    regulationLevel: "STRICT_REGLEMENTAT",
    requiredLicenses: ["Certificare bio (organism acreditat)", "Înregistrare MADR"],
    authorizingBodies: ["Organisme certificare bio acreditate", "MADR"],
    euCompliance: ["Regulament 2018/848 (producția ecologică)"],
    legalRisks: ["Pierdere certificare la neconformitate", "Controale periodice obligatorii"],
  },

  // SĂNĂTATE
  "SANATATE": {
    regulationLevel: "STRICT_REGLEMENTAT",
    requiredLicenses: ["Autorizare sanitară (DSP)", "Înregistrare Colegiul Medicilor"],
    authorizingBodies: ["DSP", "Colegiul Medicilor", "Ministerul Sănătății"],
    euCompliance: ["Directiva 2005/36/CE (calificări profesionale)"],
    legalRisks: ["Malpraxis", "GDPR date medicale (categorie specială)"],
  },
  "SAN_TELEMEDICINA": {
    regulationLevel: "REGLEMENTAT",
    requiredLicenses: ["Autorizare telemedicină (MS)", "Certificare platformă"],
    authorizingBodies: ["Ministerul Sănătății", "ANSPDCP (GDPR)"],
    euCompliance: ["Regulamentul AI Act (sisteme medicale = high-risk)", "GDPR Art. 9"],
    legalRisks: ["Răspundere la distanță", "Securitate date pacienți"],
  },

  // EDUCAȚIE
  "EDUCATIE": {
    regulationLevel: "REGLEMENTAT",
    requiredLicenses: ["Autorizare/acreditare ARACIP (formal)", "Autorizare ANC (formare adulți)"],
    authorizingBodies: ["ARACIP", "ANC (Autoritatea Națională pentru Calificări)", "ISJ"],
    euCompliance: ["Cadrul European al Calificărilor (EQF)"],
  },

  // PRODUCȚIE
  "PRODUCTIE": {
    regulationLevel: "REGLEMENTAT",
    requiredLicenses: ["Autorizare funcționare", "Autorizare DSVSA (alimentar)", "Autorizare mediu (APM)"],
    authorizingBodies: ["Primăria (urbanism)", "DSVSA", "APM", "ISU (PSI)"],
    euCompliance: ["Regulamente sectoriale UE", "Directiva emisii industriale"],
  },

  // ENERGIE
  "ENERGIE": {
    regulationLevel: "STRICT_REGLEMENTAT",
    requiredLicenses: ["Licență ANRE (producție/distribuție)", "Autorizare racordare"],
    authorizingBodies: ["ANRE", "Transelectrica", "Distribuitor local"],
    euCompliance: ["Directiva 2018/2001 (energii regenerabile)", "Green Deal"],
    legalRisks: ["Birocrație racordare", "Schimbări legislative frecvente"],
  },
  "ENRG_COMUNITATI": {
    regulationLevel: "REGLEMENTAT",
    requiredLicenses: ["Statut comunitate energetică (ANRE)", "Autorizare prosumator"],
    authorizingBodies: ["ANRE"],
    euCompliance: ["Directiva UE 2018/2001 Art. 22", "Legea 199/2024 (RO)"],
    notes: "Legislație nouă favorabilă — cadru în formare, oportunitate timpurie",
  },

  // IMOBILIAR
  "IMOBILIAR": {
    regulationLevel: "REGLEMENTAT",
    requiredLicenses: ["Autorizație construire", "Certificat urbanism", "Avize (mediu, ISU, rețele)"],
    authorizingBodies: ["Primăria", "ISC", "APM", "ISU"],
    euCompliance: ["Directiva performanță energetică clădiri (EPBD)"],
  },

  // SERVICII
  "SERVICII": {
    regulationLevel: "NEREGLEMENTAT",
    requiredLicenses: ["Înregistrare ONRC"],
    authorizingBodies: ["ONRC"],
  },
  "SERV_PROFESIONALE": {
    regulationLevel: "REGLEMENTAT",
    requiredLicenses: ["Autorizare profesională specifică"],
    authorizingBodies: ["CECCAR (contabilitate)", "Baroul (juridic)", "ANEVAR (evaluare)"],
  },
}

/**
 * Evaluează conformitatea legală a unei oportunități.
 * Caută mai întâi nișa specifică, apoi sectorul, apoi default.
 */
export function assessLegal(nicheId: string, sectorId: string): L3LegalAssessment {
  // Caută specific → general
  const specific = LEGAL_FRAMEWORK[nicheId]
  const general = LEGAL_FRAMEWORK[sectorId]
  const base = specific || general || {}

  return {
    isLegal: base.regulationLevel !== "INTERZIS",
    regulationLevel: base.regulationLevel || "NEREGLEMENTAT",
    requiredLicenses: base.requiredLicenses || [],
    authorizingBodies: base.authorizingBodies || [],
    euCompliance: base.euCompliance || [],
    legalRisks: base.legalRisks || [],
    notes: base.notes || "",
  }
}

// ═══════════════════════════════════════════════════════════════
// L1 — FILTRUL BINELUI
// ═══════════════════════════════════════════════════════════════

/**
 * Principiile L1 (Câmpul) aplicate pe oportunități economice.
 *
 * Nu evaluăm dacă o activitate e "bună" sau "rea" în abstract.
 * Evaluăm CUM se face — aceeași activitate poate fi etică sau nu
 * în funcție de implementare.
 *
 * Scorare: 0 = dăunător activ, 5 = neutru, 10 = exemplar.
 * Sub 3 pe orice dimensiune = RESPINSĂ ETIC.
 * Media sub 5 = CONDIȚIONATĂ (necesită ajustări).
 */

/** Caracteristici etice per sector/nișă — baza de evaluare */
const ETHICAL_PROFILES: Record<string, Partial<L1EthicalAssessment>> = {
  // Exemple de evaluări etice per nișă

  "TURISM_CULTURAL": {
    dimensions: {
      communityWellbeing: 8,     // aduce venituri comunității locale
      humanDignity: 9,           // celebrează cultura, nu o exploatează
      environmentalCare: 7,      // impact mic dacă e gestionat
      autonomyCreation: 7,       // comunitatea decide ce arată
      selfPropagation: 9,        // turistul pleacă și povestește, alții vin
      transparency: 8,           // experiența e vizibilă, prețul clar
      knowledgeContribution: 9,  // educă, transmite patrimoniu
      equity: 7,                 // accesibil dacă prețul e rezonabil
    },
    positiveFactors: [
      "Salvează patrimoniu prin valorificare economică",
      "Creează mândrie locală și identitate",
      "Educă vizitatorii și comunitatea",
    ],
    negativeFactors: [
      "Risc de comercializare excesivă (kitsch)",
      "Risc de gentrification dacă nu e controlat",
    ],
    ethicalConditions: [
      "Comunitatea locală trebuie să fie beneficiara principală",
      "Autenticitatea trebuie păstrată — nu inventăm tradiții false",
      "Prețurile trebuie accesibile și pentru localnici",
    ],
    propagationMechanism: "Turistul experimentează autenticitate → povestește → alții vin → comunitatea investește în patrimoniu → patrimoniul se conservă → mai mulți vin. Spirala pozitivă.",
  },

  "TURISM_GASTRONOMIC": {
    dimensions: {
      communityWellbeing: 9,     // bani direct la producători locali
      humanDignity: 9,           // meșteșugul culinar e onorat
      environmentalCare: 7,      // produse locale = amprentă mică
      autonomyCreation: 8,       // producătorul rămâne independent
      selfPropagation: 9,        // gustul bun se propagă natural
      transparency: 9,           // vezi ce mănânci, cine gătește
      knowledgeContribution: 8,  // rețete transmise, educație culinară
      equity: 7,                 // prețul poate exclude — de monitorizat
    },
    positiveFactors: [
      "Valorizează producătorii locali care altfel nu au piață",
      "Conservă rețete tradiționale în pericol de dispariție",
      "Creează lanț valoric complet local (fermier → bucătar → turist)",
    ],
    ethicalConditions: [
      "Producătorii locali primesc prețul corect, nu doar vitrina",
      "Nu se înlocuiesc ingrediente locale cu import ieftin",
    ],
    propagationMechanism: "Turist gustă → producător câștigă → investește în calitate → produs mai bun → mai mulți turiști → mai mulți producători se alătură. Ecosistem viu.",
  },

  "AGRI_BIO_ORGANIC": {
    dimensions: {
      communityWellbeing: 8,
      humanDignity: 8,
      environmentalCare: 10,     // scop explicit de protecție mediu
      autonomyCreation: 7,       // fermierul depinde de certificare
      selfPropagation: 8,        // solul sănătos produce mai mult pe termen lung
      transparency: 9,           // certificarea impune trasabilitate
      knowledgeContribution: 8,  // educă despre agricultură sustenabilă
      equity: 6,                 // prețul premium exclude consumatori cu venituri mici
    },
    ethicalConditions: [
      "Prețul premium trebuie justificat și transparent",
      "Nu doar certificare formală — practici reale sustenabile",
      "Acces la piață și pentru fermierii mici, nu doar mari",
    ],
    propagationMechanism: "Sol sănătos → producție sustenabilă → comunitate sănătoasă → cerere crește → mai mulți fermieri trec la bio → solul regional se recuperează. Spirală de vindecare.",
  },

  "SAN_MINTALA": {
    dimensions: {
      communityWellbeing: 10,    // sănătate mintală = fundament comunitar
      humanDignity: 10,          // respectul pentru suferință e maxim
      environmentalCare: 5,      // neutru
      autonomyCreation: 9,       // scopul = autonomia pacientului
      selfPropagation: 9,        // om sănătos → relații sănătoase → comunitate sănătoasă
      transparency: 7,           // confidențialitate necesară dar proces transparent
      knowledgeContribution: 9,  // educă despre sănătate mintală, reduce stigma
      equity: 8,                 // acces universal de dorit — preț adaptat
    },
    positiveFactors: [
      "Reduce stigma sănătății mintale în comunitate",
      "Previne escaladarea (intervenție timpurie)",
      "Efecte cascadă: părinte sănătos → copil sănătos",
    ],
    ethicalConditions: [
      "Practicieni acreditați — nu pseudo-terapii",
      "Confidențialitate absolută",
      "Acces inclusiv pentru categorii vulnerabile",
    ],
    propagationMechanism: "Om vindecat → relații sănătoase → copii echilibrați → adulți funcționali → comunitate rezistentă. Generații întregi beneficiază.",
  },

  "EDU_FORMARE_PROF": {
    dimensions: {
      communityWellbeing: 9,
      humanDignity: 9,           // oferă demnitatea meseriei
      environmentalCare: 5,      // neutru
      autonomyCreation: 10,      // autonomie maximă — competență = libertate
      selfPropagation: 10,       // om format → formează alții → comunitate competentă
      transparency: 8,           // rezultatele sunt măsurabile (angajare, salariu)
      knowledgeContribution: 10, // esența educației
      equity: 8,                 // accesibil — adesea subvenționat
    },
    positiveFactors: [
      "Rezolvă NEET — tineri fără direcție capătă competențe",
      "Reduce migrația — ai motiv să rămâi dacă ai meserie",
      "Crește valoarea resursei umane locale",
    ],
    propagationMechanism: "Tânăr format → lucrează local → câștigă → consumă local → firmele cresc → angajează → alți tineri se formează. Ciclul economic sănătos.",
  },

  "ENRG_COMUNITATI": {
    dimensions: {
      communityWellbeing: 10,    // beneficiu colectiv prin definiție
      humanDignity: 8,
      environmentalCare: 10,     // energie verde
      autonomyCreation: 10,      // independență energetică locală
      selfPropagation: 10,       // comunitate funcțională → alte comunități copiază
      transparency: 9,           // guvernanță participativă
      knowledgeContribution: 8,  // educă despre energie
      equity: 9,                 // acces egal pentru membrii comunității
    },
    propagationMechanism: "O comunitate energetică funcțională → vecinii văd beneficiul → creează a lor → județul devine independent energetic → model național. Propagare virală a autonomiei.",
  },

  // ═══ TURISM — restul nișelor ═══

  "TURISM_MEDICAL": {
    dimensions: {
      communityWellbeing: 7,
      humanDignity: 8,
      environmentalCare: 5,
      autonomyCreation: 7,       // pacientul alege, dar depinde de specialist
      selfPropagation: 6,        // pacientul vindecat povestește, dar nu e viral
      transparency: 7,           // calitatea trebuie demonstrabilă
      knowledgeContribution: 6,
      equity: 5,                 // accesibil doar celor care pot călători
    },
    positiveFactors: [
      "Aduce servicii medicale în zone sub-deservite",
      "Creează locuri de muncă pentru specialiști",
      "Combinație sănătate + turism = recuperare completă",
    ],
    negativeFactors: [
      "Risc de prioritizare turiști vs. localnici",
    ],
    ethicalConditions: [
      "Localnicii au acces egal la serviciile medicale, nu doar turiștii",
      "Calitate medicală certificată, nu turism low-cost pe sănătate",
    ],
    propagationMechanism: "Pacient vindecat → recomandă → mai mulți vin → clinica crește → angajează mai mulți specialiști → localnicii beneficiază de specialiști rezidenți. Sănătate importată devine sănătate locală.",
  },

  "TURISM_RURAL": {
    dimensions: {
      communityWellbeing: 9,
      humanDignity: 8,
      environmentalCare: 8,      // turismul rural protejează peisajul
      autonomyCreation: 9,       // fermierul diversifică, nu depinde de o singură cultură
      selfPropagation: 8,        // turist fermecat → povestește → alții vin
      transparency: 9,           // totul se vede — ferma, animalele, procesul
      knowledgeContribution: 8,  // educă urban despre rural
      equity: 8,                 // prețuri accesibile, experiență autentică
    },
    positiveFactors: [
      "Fixează populația rurală — alternativă la migrația urbană",
      "Conservă peisajul tradițional care altfel s-ar pierde",
      "Educă generația urbană despre originea alimentelor",
    ],
    ethicalConditions: [
      "Autenticitate — nu fermă de carton pentru turiști",
      "Fermierul primește valoarea, nu intermediarul",
    ],
    propagationMechanism: "Fermier diversifică → venit suplimentar → rămâne pe teren → peisajul se conservă → mai atractiv → mai mulți turiști → mai mulți fermieri diversifică. Satul renaște.",
  },

  "TURISM_EDUCATIONAL": {
    dimensions: {
      communityWellbeing: 8,
      humanDignity: 9,
      environmentalCare: 6,
      autonomyCreation: 9,       // educația = autonomie prin definiție
      selfPropagation: 9,        // cel educat educă pe alții
      transparency: 8,
      knowledgeContribution: 10, // esența educației
      equity: 7,
    },
    positiveFactors: [
      "Combină vacanța cu formarea — eficiență maximă",
      "Creează ambasadori culturali (tineri care se întorc)",
    ],
    propagationMechanism: "Tânăr participă → învață → aplică acasă → povestește → alți tineri vin → comunitatea devine hub educațional. Cunoașterea se propagă exponențial.",
  },

  "TURISM_EVENTOS": {
    dimensions: {
      communityWellbeing: 7,
      humanDignity: 7,
      environmentalCare: 5,      // evenimente mari = amprentă semnificativă
      autonomyCreation: 6,
      selfPropagation: 8,        // festivalul reușit devine tradiție
      transparency: 7,
      knowledgeContribution: 6,
      equity: 6,                 // prețul biletelor poate exclude
    },
    positiveFactors: [
      "Pune teritoriul pe hartă (brand awareness)",
      "Concentrează venituri în perioade scurte",
    ],
    negativeFactors: [
      "Impact ecologic la evenimente mari",
      "Beneficiul e sezonier, nu permanent",
    ],
    ethicalConditions: [
      "Comunitatea locală beneficiază, nu doar organizatorii externi",
      "Impact ecologic compensat activ",
    ],
    propagationMechanism: "Festival reușit → vizibilitate → turiști revin și în afara festivalului → economie locală permanentă. Evenimentul e catalizator, nu scop.",
  },

  // ═══ AGRICULTURĂ — restul nișelor ═══

  "AGRI_CULTURA_MARE": {
    dimensions: {
      communityWellbeing: 7,
      humanDignity: 7,
      environmentalCare: 5,      // monocultura poate degrada solul
      autonomyCreation: 5,       // fermierul depinde de piețe globale
      selfPropagation: 5,        // nu se auto-propagă dacă exportă brut
      transparency: 6,
      knowledgeContribution: 5,
      equity: 6,
    },
    negativeFactors: [
      "Monocultura degradează solul pe termen lung",
      "Export brut = pierdere valoare adăugată",
      "Dependență de prețurile internaționale",
    ],
    ethicalConditions: [
      "Rotația culturilor obligatorie (sustenabilitate sol)",
      "Cel puțin o parte din producție trebuie procesată LOCAL",
    ],
    propagationMechanism: "Condițional: dacă fermierul procesează local → valoare reținută → angajați locali → consum local crește → mai mulți fermieri procesează. Dacă exportă brut → zero propagare.",
  },

  "AGRI_PROCESARE_PRIMARA": {
    dimensions: {
      communityWellbeing: 8,
      humanDignity: 7,
      environmentalCare: 6,
      autonomyCreation: 8,       // teritoriul reține valoare
      selfPropagation: 8,        // procesare locală = locuri de muncă = consum local
      transparency: 7,
      knowledgeContribution: 6,
      equity: 7,
    },
    positiveFactors: [
      "Ridică nivelul de transformare de la 1 la 2",
      "Creează locuri de muncă în procesare",
      "Reține valoare în teritoriu (făină vs. grâu)",
    ],
    propagationMechanism: "Moară locală → făină locală → brutărie locală → pâine locală → bani rămân în comunitate → comunitatea crește → cerere mai mare → mai multă procesare. Lanțul valoric se auto-extinde.",
  },

  "AGRI_PROCESARE_SECUNDARA": {
    dimensions: {
      communityWellbeing: 9,
      humanDignity: 8,
      environmentalCare: 6,
      autonomyCreation: 9,
      selfPropagation: 9,        // produs finit = brand = identitate
      transparency: 8,
      knowledgeContribution: 7,
      equity: 7,
    },
    positiveFactors: [
      "Produs finit cu identitate — teritoriul devine brand",
      "Multiplică valoarea materiei prime de 3-10x",
      "Locuri de muncă diversificate (producție + ambalare + logistică)",
    ],
    propagationMechanism: "Pâine cu specific local → turiștii o descoperă → cerere online → export → brandul crește → mai mulți producători se alătură → cluster alimentar local. De la grâu la brand în 4 pași.",
  },

  "AGRI_NISA_PREMIUM": {
    dimensions: {
      communityWellbeing: 7,
      humanDignity: 8,
      environmentalCare: 8,      // culturi de nișă = mai puțin intensiv
      autonomyCreation: 8,       // piață de nișă = mai puțin dependent de global
      selfPropagation: 7,
      transparency: 8,
      knowledgeContribution: 7,
      equity: 5,                 // produs premium = nu pentru toți
    },
    propagationMechanism: "Producător de nișă reușește → alții din zonă copiază → cluster de nișă → brand regional → turism specializat vine → spirala creativă.",
  },

  "AGRI_ZOOTEHNIE": {
    dimensions: {
      communityWellbeing: 7,
      humanDignity: 6,           // bunăstare animală e critică
      environmentalCare: 5,      // depinde de scară și practici
      autonomyCreation: 7,
      selfPropagation: 6,
      transparency: 6,
      knowledgeContribution: 5,
      equity: 7,
    },
    negativeFactors: [
      "Bunăstarea animală trebuie monitorizată",
      "Impact ecologic la scară mare",
    ],
    ethicalConditions: [
      "Standarde de bunăstare animală respectate riguros",
      "Preferință pentru creștere extensivă, nu industrială",
      "Trasabilitate completă fermă → consumator",
    ],
    propagationMechanism: "Fermier responsabil → produs de calitate → consumator apreciază → plătește corect → fermierul investește în bunăstare animală → calitate și mai bună. Ciclul virtuos al calității.",
  },

  // ═══ SĂNĂTATE — restul nișelor ═══

  "SAN_PRIMARA": {
    dimensions: {
      communityWellbeing: 10,
      humanDignity: 10,
      environmentalCare: 5,
      autonomyCreation: 8,       // sănătatea permite autonomia
      selfPropagation: 9,        // om sănătos = familie sănătoasă = comunitate
      transparency: 8,
      knowledgeContribution: 8,  // educație sanitară preventivă
      equity: 9,                 // medicul de familie = acces universal
    },
    positiveFactors: [
      "Fundament — fără medicină primară, nimic altceva nu funcționează",
      "Prevenție = mai ieftin decât tratamentul",
      "Fixează populație (au motiv să rămână dacă au medic)",
    ],
    propagationMechanism: "Medic de familie prezent → prevenție → mai puțini bolnavi → comunitate mai productivă → atrage alți profesioniști → servicii mai bune → comunitate mai atractivă. Sănătatea atrage sănătate.",
  },

  "SAN_SPECIALITATI": {
    dimensions: {
      communityWellbeing: 9,
      humanDignity: 9,
      environmentalCare: 5,
      autonomyCreation: 8,
      selfPropagation: 7,
      transparency: 7,
      knowledgeContribution: 7,
      equity: 6,                 // accesul la specialiști e inegal
    },
    ethicalConditions: [
      "Priorități medicale, nu comerciale",
      "Acces și pentru pacienți fără asigurare (urgențe)",
    ],
    propagationMechanism: "Specialist disponibil local → zero naveta → economie de timp → productivitate → comunitatea crește → atrage alți specialiști. Concentrare profesională.",
  },

  "SAN_RECUPERARE": {
    dimensions: {
      communityWellbeing: 8,
      humanDignity: 9,
      environmentalCare: 6,      // balneologie = legătură cu natura
      autonomyCreation: 9,       // recuperarea = redobândirea autonomiei
      selfPropagation: 7,
      transparency: 7,
      knowledgeContribution: 7,
      equity: 6,
    },
    propagationMechanism: "Pacient recuperat → revine la muncă → produce → consumă local → economia crește → fonduri pentru mai multă recuperare. Capacitatea de muncă restaurată generează valoare.",
  },

  "SAN_TELEMEDICINA": {
    dimensions: {
      communityWellbeing: 8,
      humanDignity: 7,
      environmentalCare: 7,      // zero deplasare = zero emisii
      autonomyCreation: 8,       // acces de oriunde
      selfPropagation: 8,        // model replicabil instant în alte zone
      transparency: 7,
      knowledgeContribution: 7,
      equity: 8,                 // democratizează accesul la specialist
    },
    positiveFactors: [
      "Rezolvă distanța — specialistul e la un click",
      "Model scalabil exponențial",
      "Reduce presiunea pe spitalele urbane",
    ],
    propagationMechanism: "Un cabinet virtual funcțional → pacienții din alte sate aud → adoptă → platforma crește → mai mulți medici se alătură → acoperire națională din inițiativă locală.",
  },

  "SAN_VARSTNICI": {
    dimensions: {
      communityWellbeing: 10,
      humanDignity: 10,          // demnitatea vârstnicilor = măsura civilizației
      environmentalCare: 5,
      autonomyCreation: 8,       // autonomie maximă posibilă la domiciliu
      selfPropagation: 8,        // model funcțional → alte comunități copiază
      transparency: 8,
      knowledgeContribution: 7,  // vârstnicii transmit cunoaștere dacă sunt activi
      equity: 9,
    },
    positiveFactors: [
      "Vârstnicii activi = resurse (cunoaștere, experiență, stabilitate)",
      "Reduce presiunea pe spitale (prevenție la domiciliu)",
      "Solidaritate intergenerațională",
    ],
    propagationMechanism: "Vârstnic îngrijit cu demnitate → rămâne activ → transmite cunoaștere tinerilor → tinerii apreciază comunitatea → rămân → îngrijesc la rândul lor. Ciclul intergenerațional.",
  },

  "SAN_LABORATOR": {
    dimensions: {
      communityWellbeing: 8,
      humanDignity: 7,
      environmentalCare: 4,      // deșeuri medicale
      autonomyCreation: 7,
      selfPropagation: 6,
      transparency: 9,           // rezultate măsurabile obiectiv
      knowledgeContribution: 7,
      equity: 7,
    },
    propagationMechanism: "Laborator local → diagnostic rapid → tratament la timp → mai puțini bolnavi grav → comunitate mai sănătoasă → atrage mai mulți profesioniști. Diagnosticul previne escaladarea.",
  },

  // ═══ EDUCAȚIE — restul nișelor ═══

  "EDU_RECONVERSIE": {
    dimensions: {
      communityWellbeing: 8,
      humanDignity: 9,           // a doua șansă = demnitate restaurată
      environmentalCare: 5,
      autonomyCreation: 10,      // competență nouă = libertate
      selfPropagation: 8,
      transparency: 8,
      knowledgeContribution: 9,
      equity: 8,
    },
    propagationMechanism: "Adult reconvertit → lucrează în domeniu nou → crește productivitatea → angajator mulțumit → finanțează mai multă reconversie → mai mulți adulți se reconvertesc. Piața muncii se auto-vindecă.",
  },

  "EDU_ANTREPRENORIAT": {
    dimensions: {
      communityWellbeing: 8,
      humanDignity: 9,
      environmentalCare: 5,
      autonomyCreation: 10,      // antreprenoriatul = autonomie maximă
      selfPropagation: 10,       // antreprenor format → creează locuri de muncă → formează alți antreprenori
      transparency: 7,
      knowledgeContribution: 9,
      equity: 6,                 // nu toți au resurse pentru antreprenoriat
    },
    positiveFactors: [
      "Creează locuri de muncă (multiplicator economic)",
      "Punte directă spre Card 5 B2C",
      "Antreprenorul local rezolvă probleme locale",
    ],
    propagationMechanism: "Antreprenor format → creează business → angajează → angajații învață → unii devin antreprenori → creează alte business-uri → ecosistem antreprenorial viu. Propagare exponențială.",
  },

  "EDU_LIMBA": {
    dimensions: {
      communityWellbeing: 6,
      humanDignity: 7,
      environmentalCare: 5,
      autonomyCreation: 8,       // limba = acces la piața globală
      selfPropagation: 7,
      transparency: 8,
      knowledgeContribution: 8,
      equity: 7,
    },
    propagationMechanism: "Comunitate bilingvă → acces la piață internațională → remote work → venituri fără migrație → comunitatea prosperă fără să se golească.",
  },

  "EDU_TIMPURIE": {
    dimensions: {
      communityWellbeing: 10,
      humanDignity: 10,
      environmentalCare: 5,
      autonomyCreation: 8,       // fundament pentru autonomia viitoare
      selfPropagation: 10,       // copil educat = adult competent = părinte care educă
      transparency: 8,
      knowledgeContribution: 10,
      equity: 9,                 // acces universal necesar
    },
    positiveFactors: [
      "Investiția cu cel mai mare ROI social (studii econometrice)",
      "Permite părinților să lucreze → economie locală crește",
      "Previne abandonul școlar pe termen lung",
    ],
    propagationMechanism: "Copil educat de mic → performanță școlară → competent profesional → părinte responsabil → copiii lui educați de mic. Ciclul intergenerațional al educației — cel mai puternic mecanism de propagare a Binelui.",
  },

  "EDU_DIGITAL_AVANSATA": {
    dimensions: {
      communityWellbeing: 7,
      humanDignity: 7,
      environmentalCare: 6,      // digital = mai puțin transport
      autonomyCreation: 9,       // competențe digitale = libertate de locație
      selfPropagation: 8,
      transparency: 7,
      knowledgeContribution: 9,
      equity: 5,                 // necesită bază digitală prealabilă
    },
    propagationMechanism: "Specialist digital format local → lucrează remote → venit urban în zonă rurală → consumă local → alții văd că merge → se formează și ei → hub digital local. Reclădirea economiei de la tastatură.",
  },

  // ═══ PRODUCȚIE — restul nișelor ═══

  "PROD_ALIMENTARA": {
    dimensions: {
      communityWellbeing: 8,
      humanDignity: 7,
      environmentalCare: 6,
      autonomyCreation: 8,       // procesare locală = independență alimentară
      selfPropagation: 8,
      transparency: 7,
      knowledgeContribution: 6,
      equity: 8,                 // alimentele sunt pentru toți
    },
    propagationMechanism: "Producție locală → produse accesibile → sănătate mai bună → productivitate → economie crește → cerere crește → producție crește. Auto-alimentare circulară.",
  },

  "PROD_CONSTRUCTII": {
    dimensions: {
      communityWellbeing: 6,
      humanDignity: 6,
      environmentalCare: 4,      // construcțiile au impact semnificativ
      autonomyCreation: 6,
      selfPropagation: 5,
      transparency: 6,
      knowledgeContribution: 5,
      equity: 6,
    },
    ethicalConditions: [
      "Materiale sustenabile preferate (nu doar cele mai ieftine)",
      "Respectarea normelor de mediu, nu doar minim legal",
    ],
    propagationMechanism: "Materiale locale → cost transport mic → construcții mai ieftine → mai mulți își permit locuință → comunitate stabilă. Pragmatic, nu spectaculos.",
  },

  "PROD_TEXTILE": {
    dimensions: {
      communityWellbeing: 7,
      humanDignity: 7,           // atenție la condițiile de muncă
      environmentalCare: 5,      // textilele pot polua
      autonomyCreation: 7,
      selfPropagation: 6,
      transparency: 6,
      knowledgeContribution: 6,
      equity: 6,
    },
    ethicalConditions: [
      "Condiții de muncă decente — nu atelier de sudoare",
      "Salariu decent, nu doar minim pe economie",
    ],
    propagationMechanism: "Brand local de textile → identitate → turism → cerere → mai mulți meșteri → cluster textil. Dar DOAR dacă condițiile de muncă sunt exemplare.",
  },

  "PROD_LEMN": {
    dimensions: {
      communityWellbeing: 7,
      humanDignity: 8,           // meșteșugul e onorat
      environmentalCare: 6,      // lemn certificat FSC necesar
      autonomyCreation: 8,
      selfPropagation: 7,
      transparency: 7,
      knowledgeContribution: 7,  // transmitere meșteșug
      equity: 6,
    },
    ethicalConditions: [
      "Lemn din surse certificate (FSC/PEFC), nu tăieri ilegale",
      "Replantare activă, nu doar exploatare",
    ],
    propagationMechanism: "Mobilă cu design local → identitate → brand → export → venituri → replantare → pădure sănătoasă → materie primă pe termen lung. Sustenabilitate prin design.",
  },

  "PROD_ARTIZANAT": {
    dimensions: {
      communityWellbeing: 9,
      humanDignity: 10,          // meșteșugul e cea mai demnă muncă
      environmentalCare: 8,      // producție la scară mică = impact mic
      autonomyCreation: 9,       // meșteșugarul e liber profesionist prin excelență
      selfPropagation: 9,        // meșteșugul se transmite maestru → ucenic
      transparency: 9,           // vezi cum se face, cine face
      knowledgeContribution: 10, // conservare patrimoniu viu
      equity: 7,
    },
    positiveFactors: [
      "Salvează meșteșuguri în pericol de dispariție",
      "Fiecare obiect are poveste și identitate",
      "Turism + artizanat = combinație naturală",
    ],
    propagationMechanism: "Meșteșugar bătrân → transmite ucenicului → ucenicul modernizează (online, design) → piață mai mare → mai mulți tineri vor să învețe → meșteșugul trăiește. Transfer intergenerațional vital.",
  },

  // ═══ SERVICII — restul nișelor ═══

  "SERV_LOGISTICA": {
    dimensions: {
      communityWellbeing: 6,
      humanDignity: 6,
      environmentalCare: 4,      // transport = emisii
      autonomyCreation: 6,
      selfPropagation: 5,
      transparency: 6,
      knowledgeContribution: 4,
      equity: 6,
    },
    ethicalConditions: [
      "Vehicule cu emisii reduse preferate",
      "Condiții de muncă decente pentru șoferi/curieri",
    ],
    propagationMechanism: "Logistică eficientă → producătorii locali pot livra → piață mai mare → mai mulți producători → mai multă logistică necesară. Infrastructura deblochează producția.",
  },

  "SERV_IT_REMOTE": {
    dimensions: {
      communityWellbeing: 7,
      humanDignity: 8,
      environmentalCare: 8,      // zero naveta, zero birou fizic
      autonomyCreation: 9,       // lucrezi de oriunde
      selfPropagation: 8,
      transparency: 7,
      knowledgeContribution: 8,
      equity: 5,                 // necesită educație digitală prealabilă
    },
    positiveFactors: [
      "Venituri urbane fără migrație — fix ce trebuie zonelor rurale",
      "Scalabil fără capital fizic",
      "Creează comunitate digitală locală",
    ],
    propagationMechanism: "IT-ist remote → venit bun → consumă local → ceilalți văd că merge → se formează → mai mulți IT-iști → coworking → hub tech local. Digital nomad involuntar care fixează comunitatea.",
  },

  "SERV_REPARATII": {
    dimensions: {
      communityWellbeing: 7,
      humanDignity: 7,
      environmentalCare: 8,      // reparăm, nu aruncăm — economie circulară
      autonomyCreation: 7,
      selfPropagation: 6,
      transparency: 8,           // vezi ce s-a reparat, cât a costat
      knowledgeContribution: 6,
      equity: 8,                 // accesibil tuturor
    },
    positiveFactors: [
      "Economie circulară — prelungește viața produselor",
      "Reduce naveta la oraș pentru reparații simple",
    ],
    propagationMechanism: "Meșter local competent → oamenii nu mai aruncă → economie → meșterul formează ucenic → două ateliere → zona devine self-sufficient pe reparații. Autonomie prin competență.",
  },

  "SERV_ECOMMERCE": {
    dimensions: {
      communityWellbeing: 7,
      humanDignity: 7,
      environmentalCare: 5,      // livrări = emisii, dar reduce deplasări individuale
      autonomyCreation: 8,       // producătorul ajunge direct la client
      selfPropagation: 8,        // platformă funcțională → mai mulți producători vin
      transparency: 8,
      knowledgeContribution: 6,
      equity: 7,
    },
    propagationMechanism: "Platformă locală → 5 producători listați → clienții descoperă → cerere → 20 producători → diversitate → clienți mai mulți → efect de rețea. Piața locală digitalizată.",
  },

  // ═══ ENERGIE — restul nișelor ═══

  "ENRG_SOLAR": {
    dimensions: {
      communityWellbeing: 8,
      humanDignity: 7,
      environmentalCare: 10,
      autonomyCreation: 9,       // energie proprie = independență
      selfPropagation: 8,        // prosumator reușit → vecinul face la fel
      transparency: 8,
      knowledgeContribution: 7,
      equity: 6,                 // investiție inițială mare
    },
    propagationMechanism: "O casă cu panouri → factura scade → vecinul observă → investește și el → comunitatea devine prosumator → se formează comunitate energetică → model pentru alte comunități.",
  },

  "ENRG_EOLIAN": {
    dimensions: {
      communityWellbeing: 6,
      humanDignity: 6,
      environmentalCare: 8,
      autonomyCreation: 4,       // parcurile mari = investitori externi, nu locali
      selfPropagation: 5,
      transparency: 5,           // beneficiul e la investitor, nu la comunitate
      knowledgeContribution: 5,
      equity: 4,                 // comunitatea suportă impactul vizual, investitorul ia profitul
    },
    negativeFactors: [
      "Beneficiul economic rareori rămâne în comunitate",
      "Impact vizual și sonor semnificativ",
    ],
    ethicalConditions: [
      "Comunitatea trebuie să fie co-investitor sau beneficiar direct",
      "Compensații reale, nu doar taxe locale minime",
    ],
    propagationMechanism: "Condițional: dacă comunitatea e co-proprietar → venituri locale → investiție în alte proiecte verzi → independență energetică. Dacă investitor extern → zero propagare locală.",
  },

  "ENRG_BIOMASA": {
    dimensions: {
      communityWellbeing: 7,
      humanDignity: 7,
      environmentalCare: 7,      // valorifică deșeuri, dar arderea are emisii
      autonomyCreation: 8,       // resursa e locală
      selfPropagation: 7,
      transparency: 7,
      knowledgeContribution: 6,
      equity: 7,
    },
    propagationMechanism: "Deșeu agricol → energie → cost zero materie primă → energie ieftină locală → fermierul primește bani pe paie → cultivă mai mult → mai multă biomasă. Ciclul deșeului care devine resursă.",
  },

  "ENRG_EFICIENTA": {
    dimensions: {
      communityWellbeing: 8,
      humanDignity: 7,
      environmentalCare: 9,
      autonomyCreation: 8,       // consum mai mic = dependență mai mică
      selfPropagation: 8,
      transparency: 8,           // economiile sunt măsurabile
      knowledgeContribution: 7,
      equity: 6,                 // investiția e costisitoare
    },
    propagationMechanism: "Casă reabilitată → factura scade 50% → vecinul vede → reabilitează → cartierul întreg economisește → fonduri pentru alte investiții. Eficiența e contagioasă când se vede pe factură.",
  },

  // ═══ IMOBILIAR ═══

  "IMOB_REZIDENTIAL": {
    dimensions: {
      communityWellbeing: 7,
      humanDignity: 8,           // locuința = drept fundamental
      environmentalCare: 4,      // construcția nouă consumă resurse
      autonomyCreation: 8,       // proprietar = stabilitate
      selfPropagation: 6,
      transparency: 6,
      knowledgeContribution: 4,
      equity: 5,                 // accesibil doar celor cu finanțare
    },
    ethicalConditions: [
      "Locuințe accesibile, nu doar premium",
      "Standarde energetice ridicate (NZEB)",
    ],
    propagationMechanism: "Locuințe noi → familii se stabilesc → copii în școli → cerere servicii → economie locală → mai multe locuințe necesare. Locuința fixează populația.",
  },

  "IMOB_COMERCIAL": {
    dimensions: {
      communityWellbeing: 6,
      humanDignity: 6,
      environmentalCare: 4,
      autonomyCreation: 6,
      selfPropagation: 5,
      transparency: 6,
      knowledgeContribution: 4,
      equity: 5,
    },
    propagationMechanism: "Spațiu comercial disponibil → antreprenor local deschide → angajează → servicii noi → alți antreprenori vin. Spațiul fizic deblochează antreprenoriatul.",
  },

  "IMOB_REABILITARE": {
    dimensions: {
      communityWellbeing: 9,
      humanDignity: 8,
      environmentalCare: 8,      // reabilitare > construcție nouă
      autonomyCreation: 7,
      selfPropagation: 8,        // zonă reabilitată → atrage investiții → alte zone se reabilitează
      transparency: 7,
      knowledgeContribution: 7,  // conservare patrimoniu construit
      equity: 7,
    },
    positiveFactors: [
      "Salvează patrimoniu în loc să-l demoleze",
      "Efect de contagiune — o stradă reabilitată ridică tot cartierul",
      "Mai sustenabil decât construcție nouă",
    ],
    propagationMechanism: "O clădire reabilitată → zona devine atractivă → valoarea crește → proprietarii vecini investesc → întreg cartierul se transformă → turism urban → economie locală. Efectul domino al frumuseții.",
  },

  // ═══ TURISM RELIGIOS + SPIRITUAL ═══

  "TURISM_RELIGIOS": {
    dimensions: {
      communityWellbeing: 8,
      humanDignity: 9,           // respectul pentru credință e sacru
      environmentalCare: 7,      // mănăstirile de obicei protejează natura din jur
      autonomyCreation: 7,       // credința e alegere personală
      selfPropagation: 8,        // pelerinul povestește → alții vin → comunitatea monahală prosperă
      transparency: 8,           // locurile sacre sunt deschise
      knowledgeContribution: 9,  // istorie, arhitectură, teologie, valori
      equity: 8,                 // acces universal — credința nu discriminează
    },
    positiveFactors: [
      "Conservă patrimoniu sacru (mănăstiri, biserici, moschei)",
      "Aduce venituri comunităților monahale care altfel nu au surse",
      "Dobrogea = unic în RO: ortodoxie + islam + alte confesiuni în aceeași zonă",
      "Conectează omul cu valorile profunde — dincolo de consum",
    ],
    ethicalConditions: [
      "Respectul pentru sacralitatea locului — turiștii nu sunt clienți, sunt oaspeți",
      "Veniturile rămân în comunitatea religioasă, nu la intermediari",
      "Zero comercializare a credinței — nu vindem binecuvântări",
      "Turismul interconfesional promovează toleranță, nu competiție între confesiuni",
    ],
    propagationMechanism: "Pelerin experimentează sacralitate → se întoarce transformat → povestește cu autenticitate → alții vin → comunitatea monahală investește în conservare → patrimoniul se salvează → mai mulți vin. Spirala sacrului care se protejează prin partajare.",
  },

  "TURISM_SPIRITUAL": {
    dimensions: {
      communityWellbeing: 7,
      humanDignity: 8,
      environmentalCare: 9,      // locurile sacre din natură trebuie protejate
      autonomyCreation: 8,       // căutarea spirituală e act de autonomie
      selfPropagation: 8,        // omul reconectat → relații mai bune → comunitate mai bună
      transparency: 6,           // ATENȚIE: zona cea mai vulnerabilă la șarlatanie
      knowledgeContribution: 7,
      equity: 7,
    },
    positiveFactors: [
      "Răspunde nevoii de transcendență (nucleul Maslow corectat)",
      "Reconectare cu natura — vindecător prin sine",
      "Tradiții vindecătoare românești autentice (fitoterapie, apiterapie, ape minerale)",
      "Punte directă spre Card 1 B2C (nucleul ființei)",
    ],
    negativeFactors: [
      "RISC MAJOR: zona cea mai vulnerabilă la pseudo-vindecători și manipulare",
      "Oameni vulnerabili (bolnavi, disperați) sunt țintă pentru escroci",
      "Confuzia intre 'spiritual' si 'magic' atrage practicieni necalificati",
    ],
    ethicalConditions: [
      "OBLIGATORIU: separare stricta intre atestat/neatestat — izvoare cu analize chimice vs. 'energii' fara dovezi",
      "Zero promisiuni de vindecare — informare, nu manipulare",
      "Practici tradiționale doar de la practicieni cu traseu verificabil",
      "Protecție explicită pentru persoane vulnerabile (bolnavi, doliu, depresie)",
      "SafetyMonitor activ — la orice semn de manipulare, intervenție imediată",
      "Transparență totală: ce e atestat științific vs. ce e tradiție vs. ce e credință personală",
    ],
    propagationMechanism: "CONDIȚIONAL: Dacă e autentic → om reconectat → relații mai sănătoase → comunitate mai echilibrată → locul sacru atrage oameni de calitate → zona se ridică. Dacă e fals → exploatare → suferință → reputația zonei se distruge → spirală descendentă. FILTRUL ONESTITĂȚII e CRITIC aici.",
  },

  // ═══ Nișe cu scoruri etice mai scăzute (atenție) ═══

  "TURISM_INDUSTRIAL": {
    dimensions: {
      communityWellbeing: 5,     // depinde de implementare
      humanDignity: 6,           // risc de voyeurism al tragediei
      environmentalCare: 4,      // situri poluate = risc sănătate vizitatori
      autonomyCreation: 5,       // neutru
      selfPropagation: 4,        // nu generează neapărat Bine în cascadă
      transparency: 7,
      knowledgeContribution: 7,  // educă despre istorie industrială
      equity: 6,
    },
    negativeFactors: [
      "Risc de exploatare a tragediei (Chernobyl tourism = etică discutabilă)",
      "Situri poluate pot fi periculoase pentru vizitatori",
      "Poate romantiza industrializarea dăunătoare",
    ],
    ethicalConditions: [
      "Respectul pentru victimele poluării/accidentelor",
      "Siguranța vizitatorilor garantată",
      "Narativul trebuie educațional, nu senzaționalist",
      "Beneficiile trebuie să revină comunității afectate",
    ],
    propagationMechanism: "Condițional: dacă narativul e educațional → conștientizare → prevenție → comunități mai atente la mediu. Dacă e senzaționalist → doar profit, zero Bine.",
  },
}

/**
 * Evaluează dimensiunea etică (L1) a unei oportunități.
 * Dacă nu există profil specific, generează evaluare neutră (5/10).
 */
export function assessEthical(nicheId: string, sectorId: string): L1EthicalAssessment {
  const profile = ETHICAL_PROFILES[nicheId] || ETHICAL_PROFILES[sectorId]

  if (!profile || !profile.dimensions) {
    // Fără profil specific — evaluare neutră, necesită analiză Claude
    return {
      overallScore: 5,
      dimensions: {
        communityWellbeing: 5,
        humanDignity: 5,
        environmentalCare: 5,
        autonomyCreation: 5,
        selfPropagation: 5,
        transparency: 5,
        knowledgeContribution: 5,
        equity: 5,
      },
      positiveFactors: [],
      negativeFactors: ["Profil etic nespecificat — necesită analiză detaliată"],
      ethicalConditions: ["Evaluare L1 detaliată necesară înainte de implementare"],
      propagationMechanism: "De analizat — mecanismul de auto-propagare a Binelui nu e încă definit pentru această nișă.",
    }
  }

  const dims = profile.dimensions
  const values = Object.values(dims)
  const overallScore = Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10

  return {
    overallScore,
    dimensions: dims,
    positiveFactors: profile.positiveFactors || [],
    negativeFactors: profile.negativeFactors || [],
    ethicalConditions: profile.ethicalConditions || [],
    propagationMechanism: profile.propagationMechanism || "De definit.",
  }
}

// ═══════════════════════════════════════════════════════════════
// PIPELINE COMPLET: Oportunitate brută → L3 → L1 → Scor final
// ═══════════════════════════════════════════════════════════════

/**
 * Evaluează complet o oportunitate: scor economic + legal + etic.
 *
 * Reguli:
 * 1. L3 INTERZIS → RESPINSĂ LEGAL (nu ajunge la L1)
 * 2. L1 sub 3 pe orice dimensiune → RESPINSĂ ETIC
 * 3. L1 medie sub 5 → CONDIȚIONATĂ (necesită ajustări)
 * 4. L1 medie >= 5 → APROBATĂ (scorul brut se ajustează cu factorul etic)
 *
 * Scor final = rawScore × (ethicalScore / 10)
 * Adică: o oportunitate economică de 9 cu etică de 5 = 4.5 final
 * O oportunitate economică de 6 cu etică de 9 = 5.4 final (etică > economic)
 */
export function evaluateOpportunity(params: {
  nicheId: string
  sectorId: string
  sectorName: string
  nicheName: string
  rawScore: number
}): EvaluatedOpportunity {
  // Pas 1: Filtru L3 (Legal)
  const legal = assessLegal(params.nicheId, params.sectorId)

  if (!legal.isLegal) {
    return {
      ...params,
      legal,
      ethical: null,
      finalScore: 0,
      status: "RESPINSA_LEGAL",
      rejectionReason: `Activitate interzisă legal: ${legal.notes}`,
    }
  }

  // Pas 2: Filtru L1 (Etic)
  const ethical = assessEthical(params.nicheId, params.sectorId)

  // Verificare dimensiuni critice (sub 3 = respinsă)
  const criticalDims = Object.entries(ethical.dimensions)
  const criticalFailure = criticalDims.find(([, val]) => val < 3)

  if (criticalFailure) {
    return {
      ...params,
      legal,
      ethical,
      finalScore: 0,
      status: "RESPINSA_ETIC",
      rejectionReason: `Dimensiunea "${criticalFailure[0]}" are scor ${criticalFailure[1]}/10 — sub pragul minim de 3. ${ethical.negativeFactors.join(". ")}`,
    }
  }

  // Pas 3: Calcul scor final
  const ethicalFactor = ethical.overallScore / 10  // 0-1
  const finalScore = Math.round(params.rawScore * ethicalFactor * 10) / 10

  // Status: condiționată dacă media etică < 5
  const status: EvaluatedOpportunity["status"] = ethical.overallScore < 5 ? "CONDITIONATA" : "APROBATA"

  return {
    ...params,
    legal,
    ethical,
    finalScore,
    status,
    rejectionReason: status === "CONDITIONATA"
      ? `Scor etic ${ethical.overallScore}/10 — necesită: ${ethical.ethicalConditions.join("; ")}`
      : undefined,
  }
}

/**
 * Evaluează un set complet de oportunități pentru un teritoriu.
 * Returnează sortate după scorul final (cele mai bune primele).
 */
export function evaluateAllOpportunities(
  opportunities: Array<{
    nicheId: string
    sectorId: string
    sectorName: string
    nicheName: string
    rawScore: number
  }>
): EvaluatedOpportunity[] {
  return opportunities
    .map(evaluateOpportunity)
    .sort((a, b) => {
      // Mai întâi aprobate, apoi condiționate, apoi respinse
      const statusOrder = { APROBATA: 0, CONDITIONATA: 1, RESPINSA_ETIC: 2, RESPINSA_LEGAL: 3 }
      const statusDiff = statusOrder[a.status] - statusOrder[b.status]
      if (statusDiff !== 0) return statusDiff
      // În cadrul aceluiași status, după scor final descrescător
      return b.finalScore - a.finalScore
    })
}
