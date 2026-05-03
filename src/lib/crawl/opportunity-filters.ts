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

  // Exemple de nișe cu scoruri etice mai scăzute (atenție)

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
