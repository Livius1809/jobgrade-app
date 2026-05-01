/**
 * needs-analysis.ts — Axa 3: Nevoi de consum (starea dorită)
 *
 * Nevoile nu sunt statice — se ridică pe spirala evoluției:
 * - Individ: vârstă × Maslow × stadiu dezvoltare personală (B2C Card 1-5)
 * - Firmă: dimensiune × stadiu organizațional (B2B C1-C4)
 * - Comunitate: agregare indivizi + firme + nevoi colective
 *
 * Starea dorită e dinamică — cu fiecare nevoie satisfăcută,
 * apare o nevoie de nivel superior pe spirală.
 *
 * Gap = stare dorită - consum actual
 * Cauza gap-ului: nu se poate / nu se știe / nu se vrea
 * Soluția gap-ului: puntea (business-ul care se naște)
 */

// ═══════════════════════════════════════════════════════════════
// STADII DEZVOLTARE INDIVID (B2C JobGrade)
// ═══════════════════════════════════════════════════════════════

export interface DevelopmentStage {
  id: string
  name: string
  description: string
  /** Ce nevoi predomină la acest stadiu */
  dominantNeeds: string[]
  /** Ce oferă individul la acest stadiu */
  canOffer: string[]
  /** Ce punte îl duce la stadiul următor */
  bridgeToNext: string
  /** Mapare pe grupe vârstă predominante (orientativ, nu exclusiv) */
  typicalAgeGroups: string[]
}

export const INDIVIDUAL_STAGES: DevelopmentStage[] = [
  {
    id: "DESCOPERIRE",
    name: "Descoperire de sine (Card 1)",
    description: "Individul explorează cine este, ce îl motivează, care sunt valorile lui reale",
    dominantNeeds: [
      "Siguranță psihologică (spațiu fără judecată)",
      "Ghidaj în auto-cunoaștere",
      "Validare identitate",
      "Comunitate de sprijin",
    ],
    canOffer: ["Autenticitate", "Disponibilitate de a învăța", "Energie de explorare"],
    bridgeToNext: "Profilare, chestionare, reflecție ghidată — B2C JobGrade Card 1",
    typicalAgeGroups: ["10-19", "20-29"],
  },
  {
    id: "RELATIE",
    name: "Relație cu ceilalți (Card 2)",
    description: "Individul învață să construiască relații sănătoase, să comunice, să colaboreze",
    dominantNeeds: [
      "Competențe de comunicare",
      "Inteligență emoțională",
      "Rețea socială de calitate",
      "Rezolvare conflicte",
    ],
    canOffer: ["Empatie emergentă", "Disponibilitate relațională", "Feedback onest"],
    bridgeToNext: "Comunități tematice, exerciții relaționale — B2C JobGrade Card 2",
    typicalAgeGroups: ["20-29", "30-39"],
  },
  {
    id: "ROL_PROFESIONAL",
    name: "Asumarea unui rol profesional (Card 3)",
    description: "Individul își identifică competențele și caută un rol care i se potrivește",
    dominantNeeds: [
      "Claritate vocațională",
      "Competențe profesionale validate",
      "Acces la piața muncii",
      "Matching cu organizații potrivite",
      "Salariu echitabil",
    ],
    canOffer: ["Competențe specifice", "Forță de muncă", "Inovare în rol"],
    bridgeToNext: "Evaluare competențe, matching B2B↔B2C, orientare — JobGrade Card 3",
    typicalAgeGroups: ["20-29", "30-39"],
  },
  {
    id: "VALOARE",
    name: "Crearea de valoare (Card 4)",
    description: "Individul contribuie activ, creează impact, caută sens dincolo de rol",
    dominantNeeds: [
      "Recunoaștere meritocratică",
      "Impact vizibil al muncii",
      "Mentorat și dezvoltare continuă",
      "Echilibru viață-muncă",
      "Contribuție la comunitate",
    ],
    canOffer: ["Experiență", "Mentorat", "Leadership", "Inovare"],
    bridgeToNext: "Programe leadership, voluntariat strategic — JobGrade Card 4",
    typicalAgeGroups: ["30-39", "40-49", "50-59"],
  },
  {
    id: "ANTREPRENORIAT",
    name: "Antreprenoriat transformațional (Card 5)",
    description: "Individul creează o afacere/inițiativă care rezolvă un gap real din piață",
    dominantNeeds: [
      "Identificare gap de piață (Motor Teritorial!)",
      "Resurse de pornire (capital, competențe, rețea)",
      "Mentorat antreprenorial",
      "Infrastructură (spații, digital, logistică)",
      "Piață de desfacere",
    ],
    canOffer: ["Locuri de muncă", "Produse/servicii noi", "Inovare socială", "Punte nouă pe ecosistem"],
    bridgeToNext: "Motor Teritorial (gap analysis) + edu4life (formare) + JobGrade (structurare) — Business #2 Card 5",
    typicalAgeGroups: ["30-39", "40-49", "50-59"],
  },
]

// ═══════════════════════════════════════════════════════════════
// STADII DEZVOLTARE FIRMĂ (B2B JobGrade)
// ═══════════════════════════════════════════════════════════════

export interface FirmDevelopmentStage {
  id: string
  card: number
  name: string
  description: string
  needs: string[]
  serviceProvider: string
}

export const FIRM_STAGES: FirmDevelopmentStage[] = [
  {
    id: "ORGANIZARE", card: 1,
    name: "Organizare internă (C1)",
    description: "Firma își structurează posturile, evaluează, ierarhizează",
    needs: [
      "Fișe de post clare",
      "Evaluare obiectivă a posturilor",
      "Ierarhizare și clase salariale",
      "Stat de funcții actualizat",
    ],
    serviceProvider: "JobGrade C1",
  },
  {
    id: "CONFORMITATE", card: 2,
    name: "Conformitate (C2)",
    description: "Firma se conformează legislației muncii și transparenței salariale",
    needs: [
      "Grilă salarială conformă",
      "Analiza pay gap",
      "Calendar obligații legale",
      "Audit contract muncă",
    ],
    serviceProvider: "JobGrade C2",
  },
  {
    id: "COMPETITIVITATE", card: 3,
    name: "Competitivitate (C3)",
    description: "Firma își optimizează procesele și devine competitivă",
    needs: [
      "KPI per post",
      "Benchmark salarial piață",
      "Pachete compensații competitive",
      "Manual calitate și procese",
      "Sociogramă echipe",
    ],
    serviceProvider: "JobGrade C3",
  },
  {
    id: "DEZVOLTARE", card: 4,
    name: "Dezvoltare organizațională (C4)",
    description: "Firma evoluează cultural, inovează, se transformă",
    needs: [
      "Audit cultural",
      "Plan intervenție strategică",
      "Simulator tranziție HU-AI",
      "Monitorizare puls organizațional",
      "Dezvoltare leadership",
    ],
    serviceProvider: "JobGrade C4",
  },
]

// ═══════════════════════════════════════════════════════════════
// NEVOI COMUNITATE (agregate)
// ═══════════════════════════════════════════════════════════════

export interface CommunityNeed {
  category: string
  description: string
  affectedPopulation: number
  affectedFirms: number
  urgency: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
  currentlySatisfied: boolean
  gapCause: "NU_SE_POATE" | "NU_SE_STIE" | "NU_SE_VREA" | "MIXED"
  gapCauseDetail: string
  solutionType: string
  bridge: string
  /** Starea dorită se ridică — ce apare DUPĂ ce nevoia asta e satisfăcută */
  nextLevelNeed: string
}

// ═══════════════════════════════════════════════════════════════
// ANALIZĂ NEVOI COMPLETĂ
// ═══════════════════════════════════════════════════════════════

export interface NeedsAnalysis {
  territory: string

  /** Nevoi indivizi per stadiu dezvoltare */
  individualNeeds: Array<{
    stage: DevelopmentStage
    estimatedPopulation: number
    pctOfTotal: number
    topUnmetNeeds: string[]
    bridge: string
  }>

  /** Nevoi firme per stadiu */
  firmNeeds: Array<{
    stage: FirmDevelopmentStage
    estimatedFirms: number
    pctOfTotal: number
    bridge: string
  }>

  /** Nevoi comunitate (agregate) */
  communityNeeds: CommunityNeed[]

  /** Spirala: ce apare după satisfacerea nevoilor actuale */
  nextSpiralLevel: {
    description: string
    emergingNeeds: string[]
    newOpportunities: string[]
  }
}

/**
 * Analizează nevoile unui teritoriu — indivizi + firme + comunitate.
 */
export function analyzeNeeds(
  ageGroups: Array<{ group: string; count: number }>,
  businessData: { total: number; employees: number },
  entityCounts: Record<string, number>,
  totalPop: number
): NeedsAnalysis {
  const territory = "MEDGIDIA"

  // ═══ NEVOI INDIVIZI PER STADIU ═══
  // Estimăm distribuția populației pe stadii de dezvoltare
  // (funcție de vârstă, dar nu exclusiv)
  const pop10_29 = ageGroups.filter(g => ["10-19", "20-29"].includes(g.group)).reduce((s, g) => s + g.count, 0)
  const pop20_39 = ageGroups.filter(g => ["20-29", "30-39"].includes(g.group)).reduce((s, g) => s + g.count, 0)
  const pop30_59 = ageGroups.filter(g => ["30-39", "40-49", "50-59"].includes(g.group)).reduce((s, g) => s + g.count, 0)

  const individualNeeds = INDIVIDUAL_STAGES.map(stage => {
    let estPop = 0
    switch (stage.id) {
      case "DESCOPERIRE": estPop = Math.round(pop10_29 * 0.6); break
      case "RELATIE": estPop = Math.round(pop20_39 * 0.3); break
      case "ROL_PROFESIONAL": estPop = Math.round(pop20_39 * 0.5); break
      case "VALOARE": estPop = Math.round(pop30_59 * 0.3); break
      case "ANTREPRENORIAT": estPop = Math.round(pop30_59 * 0.1); break
    }

    return {
      stage,
      estimatedPopulation: estPop,
      pctOfTotal: totalPop > 0 ? Math.round((estPop / totalPop) * 100) : 0,
      topUnmetNeeds: stage.dominantNeeds.slice(0, 3),
      bridge: stage.bridgeToNext,
    }
  })

  // ═══ NEVOI FIRME PER STADIU ═══
  // Estimăm distribuția firmelor pe stadii (majoritatea sunt la C1)
  const totalFirms = businessData.total
  const firmNeeds = FIRM_STAGES.map(stage => {
    let estFirms = 0
    switch (stage.id) {
      case "ORGANIZARE": estFirms = Math.round(totalFirms * 0.60); break // 60% firme nu au structură
      case "CONFORMITATE": estFirms = Math.round(totalFirms * 0.25); break
      case "COMPETITIVITATE": estFirms = Math.round(totalFirms * 0.10); break
      case "DEZVOLTARE": estFirms = Math.round(totalFirms * 0.05); break
    }

    return {
      stage,
      estimatedFirms: estFirms,
      pctOfTotal: totalFirms > 0 ? Math.round((estFirms / totalFirms) * 100) : 0,
      bridge: stage.serviceProvider,
    }
  })

  // ═══ NEVOI COMUNITATE ═══
  const hasHospital = (entityCounts["HOSPITAL"] || 0) > 0
  const hasDoctors = (entityCounts["DOCTOR"] || 0) + (entityCounts["CLINIC"] || 0) > 0
  const hasSchools = (entityCounts["SCHOOL"] || 0) > 0
  const hasPharmacy = (entityCounts["PHARMACY"] || 0) > 0
  const pop60plus = ageGroups.filter(g => parseInt(g.group) >= 60).reduce((s, g) => s + g.count, 0)
  const pop0_19 = ageGroups.filter(g => parseInt(g.group) <= 19).reduce((s, g) => s + g.count, 0)

  const communityNeeds: CommunityNeed[] = [
    {
      category: "Sănătate specializată",
      description: "Cabinete medicale de specialitate (lipsă acută în municipiu)",
      affectedPopulation: totalPop,
      affectedFirms: 0,
      urgency: "CRITICAL",
      currentlySatisfied: hasDoctors,
      gapCause: "NU_SE_POATE",
      gapCauseDetail: "Lipsă investiție în cabinete specializate + migrarea medicilor spre Constanța",
      solutionType: "Investiție + stimulente retenție medici",
      bridge: "Clinică privată sau parteneriat public-privat",
      nextLevelNeed: "Sănătate preventivă (după ce acces de bază e rezolvat → programele de screening devin prioritate)",
    },
    {
      category: "Dezvoltare profesională",
      description: "Centru formare profesională, orientare carieră, coaching",
      affectedPopulation: pop20_39,
      affectedFirms: totalFirms,
      urgency: "HIGH",
      currentlySatisfied: false,
      gapCause: "NU_SE_STIE",
      gapCauseDetail: "Populația nu cunoaște beneficiile dezvoltării profesionale structurate; firmele nu știu că există evaluare posturi",
      solutionType: "Informare + prima experiență gratuită",
      bridge: "JobGrade sandbox + edu4life + centru formare locală",
      nextLevelNeed: "Antreprenoriat local (după ce oamenii se dezvoltă profesional → unii vor să creeze propriile afaceri)",
    },
    {
      category: "Servicii vârstnici",
      description: "Centru de zi, asistență la domiciliu, socializare, transport adaptat",
      affectedPopulation: pop60plus,
      affectedFirms: 0,
      urgency: "HIGH",
      currentlySatisfied: false,
      gapCause: "NU_SE_POATE",
      gapCauseDetail: "Pensii mici + lipsă investiție publică în servicii sociale + migrare tineri (suport familial redus)",
      solutionType: "Servicii sociale + voluntariat + economie socială",
      bridge: "Întreprindere socială / ONG servicii vârstnici + program voluntariat inter-generațional",
      nextLevelNeed: "Transmitere cunoștințe (vârstnicii activi devin mentori → capital social crește)",
    },
    {
      category: "Educație extracurriculară copii",
      description: "Afterschool, sport, arte, STEM, limbi străine",
      affectedPopulation: pop0_19,
      affectedFirms: 0,
      urgency: "MEDIUM",
      currentlySatisfied: false,
      gapCause: "MIXED",
      gapCauseDetail: "Parțial nu se poate (cost), parțial nu se știe (nu există ofertă locală vizibilă), parțial trăsături culturale (prioritizare studii formale vs dezvoltare personală)",
      solutionType: "Ofertă accesibilă + informare părinți + modele de succes locale",
      bridge: "edu4life + centre educaționale locale + parteneriate școli-firme",
      nextLevelNeed: "Tineri cu competențe diverse (după educație extracurriculară → forță de muncă mai calificată → firme cresc)",
    },
    {
      category: "Structurare organizațională firme",
      description: "Evaluare posturi, grile salariale, conformitate EU 2023/970",
      affectedPopulation: businessData.employees,
      affectedFirms: Math.round(totalFirms * 0.8),
      urgency: "HIGH",
      currentlySatisfied: false,
      gapCause: "NU_SE_STIE",
      gapCauseDetail: "Firmele mici nu știu că au obligații de transparență salarială și nu cunosc beneficiile evaluării posturilor",
      solutionType: "Informare + demonstrare valoare (sandbox) + conformitate ca motivator",
      bridge: "JobGrade — exact pentru asta există platforma",
      nextLevelNeed: "Competitivitate (după structurare → firmele pot compara cu piața, atrage talent, reduce fluctuația)",
    },
    {
      category: "Valorificarea diversității culturale",
      description: "Turism cultural multicultural (RO + tătară + turcă), gastronomie, festival",
      affectedPopulation: totalPop,
      affectedFirms: Math.round(totalFirms * 0.05),
      urgency: "MEDIUM",
      currentlySatisfied: false,
      gapCause: "NU_SE_STIE",
      gapCauseDetail: "Potențialul cultural unic (sinteză 3 culturi) nu e conștientizat ca resursă economică",
      solutionType: "Brand teritorial + festival multicultural + traseu gastronomic + artizanat",
      bridge: "Motor Teritorial (identificare resursă) + antreprenori locali (execuție) + administrație (susținere)",
      nextLevelNeed: "Identitate locală puternică (după valorificarea diversității → Medgidia devine brand → atrage investiții și turiști)",
    },
  ]

  // ═══ SPIRALA — ce apare după satisfacere ═══
  const nextSpiral = {
    description: "Satisfacerea nevoilor actuale nu e un punct final — e un stadiu pe spirală. Fiecare nevoie satisfăcută deschide o nevoie de nivel superior.",
    emergingNeeds: [
      "Sănătate de bază satisfăcută → apare nevoia de prevenție și wellness",
      "Formare profesională satisfăcută → apare nevoia de antreprenoriat",
      "Structurare firme satisfăcută → apare nevoia de competitivitate și inovare",
      "Servicii vârstnici satisfăcute → apare nevoia de mentorat inter-generațional",
      "Diversitate culturală valorificată → apare nevoia de export cultural (franciză experiențială)",
    ],
    newOpportunities: [
      "Centru wellness și medicină preventivă",
      "Incubator de afaceri locale alimentat de Motor Teritorial",
      "Export consultanță structurare organizațională (JobGrade franciză)",
      "Academie de mentorat (vârstnici activi → tineri)",
      "Brand turistic Medgidia multicultural (pachet experiențe)",
    ],
  }

  return {
    territory,
    individualNeeds,
    firmNeeds,
    communityNeeds,
    nextSpiralLevel: nextSpiral,
  }
}
