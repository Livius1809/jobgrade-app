/**
 * NARRATIVE PROFILE — Profilul narativ integrat cu dual view
 *
 * Transformă profilul tehnic N2 într-o narațiune accesibilă individului,
 * păstrând trasabilitatea completă a fiecărei afirmații (layer consultant).
 *
 * Două moduri de consum:
 * - SINCRON: sesiune live consultant↔subiect, scroll sincronizat
 * - ASINCRON: MBook HTML/PDF cu link-uri expandabile
 *
 * ⚠️ AMENDAMENT: Fine tuning-ul narațiunii = după încărcarea manualelor testelor.
 * Acum se construiește scheletul tehnic (structuri, componente, mecanica).
 */

import type { IndividualProfile, DimensionalProfile } from "./n2-individual"

// ═══════════════════════════════════════════════════════════════
// TYPES — Structura documentului narativ
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// ROLE-BASED LAYER SYSTEM
// ═══════════════════════════════════════════════════════════════

/** Roluri disponibile — fiecare vede alt layer din același document */
export type ViewerRole =
  | "CONSULTANT"      // Inferențe complete + note + drill-down
  | "SUBJECT"         // Narațiune caldă + scale expandabile
  | "CEO"             // Impact business, cost, decizii strategice
  | "HR_DIRECTOR"     // Date operaționale, conformitate, acțiuni
  | "CFO"             // Buget, ROI, scenarii financiare
  | "MANAGER"         // Echipă, oameni, dinamici, recomandări acțiune
  | "OWNER"           // Vede tot (debug/admin)

/** Configurare per rol — ce vede, ce nu vede, ce ton */
export interface RoleLayerConfig {
  role: ViewerRole
  label: string                   // "Director HR" | "CEO" | etc.

  /** Ce secțiuni sunt vizibile pentru acest rol */
  visibleSections: SectionId[] | "ALL"

  /** Nivelul de detaliu al inferențelor */
  inferenceDepth: "NONE" | "SUMMARY" | "DETAILED" | "FULL"

  /** Ce vede în lateral (panel consultant / panel sumar / nimic) */
  sidePanel: "INFERENCE" | "ACTIONS" | "IMPACT" | "BUDGET" | "NONE"

  /** Tonul narațiunii (poate fi adaptat per rol) */
  narrativeTone: "WARM" | "PROFESSIONAL" | "EXECUTIVE" | "TECHNICAL"

  /** Informații suplimentare afișate per afirmație */
  extraInfo: Array<"COST" | "RISK" | "TIMELINE" | "COMPLIANCE" | "ROI" | "TEAM_IMPACT">

  /** Poate exporta? */
  canExport: boolean

  /** Poate vedea simulatorul? */
  canSimulate: boolean
}

/** Configurări default per rol */
export const ROLE_LAYER_CONFIGS: Record<ViewerRole, RoleLayerConfig> = {
  CONSULTANT: {
    role: "CONSULTANT",
    label: "Consultant",
    visibleSections: "ALL",
    inferenceDepth: "FULL",
    sidePanel: "INFERENCE",
    narrativeTone: "TECHNICAL",
    extraInfo: ["RISK", "COMPLIANCE"],
    canExport: true,
    canSimulate: true,
  },
  SUBJECT: {
    role: "SUBJECT",
    label: "Subiect evaluat",
    visibleSections: "ALL",
    inferenceDepth: "SUMMARY",
    sidePanel: "NONE",
    narrativeTone: "WARM",
    extraInfo: ["TIMELINE"],
    canExport: true,
    canSimulate: true,
  },
  CEO: {
    role: "CEO",
    label: "CEO / Director General",
    visibleSections: ["opening", "strengths", "scope-requirements", "distance", "path", "simulator", "closing"],
    inferenceDepth: "SUMMARY",
    sidePanel: "IMPACT",
    narrativeTone: "EXECUTIVE",
    extraInfo: ["COST", "ROI", "RISK"],
    canExport: true,
    canSimulate: true,
  },
  HR_DIRECTOR: {
    role: "HR_DIRECTOR",
    label: "Director HR",
    visibleSections: "ALL",
    inferenceDepth: "DETAILED",
    sidePanel: "ACTIONS",
    narrativeTone: "PROFESSIONAL",
    extraInfo: ["COMPLIANCE", "TIMELINE", "TEAM_IMPACT"],
    canExport: true,
    canSimulate: true,
  },
  CFO: {
    role: "CFO",
    label: "Director Financiar",
    visibleSections: ["opening", "scope-requirements", "distance", "simulator", "closing"],
    inferenceDepth: "NONE",
    sidePanel: "BUDGET",
    narrativeTone: "EXECUTIVE",
    extraInfo: ["COST", "ROI"],
    canExport: true,
    canSimulate: true,
  },
  MANAGER: {
    role: "MANAGER",
    label: "Manager departament",
    visibleSections: ["opening", "who-you-are", "how-you-work", "strengths", "blind-spots", "path", "closing"],
    inferenceDepth: "SUMMARY",
    sidePanel: "ACTIONS",
    narrativeTone: "PROFESSIONAL",
    extraInfo: ["TEAM_IMPACT", "TIMELINE"],
    canExport: false,
    canSimulate: false,
  },
  OWNER: {
    role: "OWNER",
    label: "Owner platformă",
    visibleSections: "ALL",
    inferenceDepth: "FULL",
    sidePanel: "INFERENCE",
    narrativeTone: "TECHNICAL",
    extraInfo: ["COST", "RISK", "TIMELINE", "COMPLIANCE", "ROI", "TEAM_IMPACT"],
    canExport: true,
    canSimulate: true,
  },
}

/** Registru narativ — marchează tonul fiecărui bloc */
export type NarrativeRegister = "CALAUZA" | "OGLINDA" | "POVESTE"

/** Referință la o scală dintr-un instrument */
export interface ScaleReference {
  instrumentId: string        // "cpi260" | "ami" | "esq2" | "hbdi" | "mbti" | "co"
  instrumentName: string      // "CPI 260" | "AMI" | etc.
  scaleName: string           // "Ostilitate" | "Dominanța" | etc.
  rawScore: number | string   // Scorul brut
  normalizedT: number         // T-score normalizat
  percentile: number          // Percentila
  level: string               // "SCAZUT" | "MEDIU" | "RIDICAT" | etc.
  referenceNorm: string       // "Etalon RO N=1600 feminin"
  isInverse?: boolean         // Scala inversă (scor mare = risc)
}

/** Mecanismul inferențial pentru o afirmație */
export interface InferenceBlock {
  /** Afirmația din narațiune la care se referă */
  statementId: string

  /** Sursele directe (scale + scoruri) */
  sources: ScaleReference[]

  /** Cum interacționează sursele între ele */
  composition: string

  /** Logica: date → concluzie */
  mechanism: string

  /** Nivel de încredere (nr surse convergente) */
  convergence: number           // 1-5 (câte surse confirmă)

  /** Note pentru consultant (atenționări, nuanțe, reframing) */
  consultantNotes?: string

  /** Ce vede subiectul ca explicație accesibilă */
  subjectExplanation: {
    /** Descriere scurtă a scalei, pe înțelesul individului */
    scaleDescription: string
    /** Unde se situează ("Te situezi pe treapta 7 din 9") */
    position: string
    /** Ce înseamnă limitele ("Majoritatea se află între 4 și 6") */
    normExplanation: string
    /** Ce înseamnă pentru el ("Asta înseamnă că...") */
    personalMeaning: string
  }
}

/** O afirmație narativă — unitatea atomică a raportului */
export interface NarrativeStatement {
  id: string                    // Unique ID (pentru scroll sync + linking)
  register: NarrativeRegister   // Tonul acestui bloc
  text: string                  // Textul narativ (ce vede subiectul)
  inference?: InferenceBlock    // Mecanismul inferențial (ce vede consultantul)
  expandable: boolean           // Poate fi expandat în modul asincron (HTML)
}

/** O secțiune din raport (cele 10 definite) */
export interface NarrativeSection {
  id: string
  order: number                 // 1-10
  title: string                 // "Cine ești" | "Cum funcționezi" | etc.
  subtitle?: string             // Subtitlu descriptiv
  statements: NarrativeStatement[]
}

/** Documentul narativ complet */
export interface NarrativeDocument {
  /** Metadata */
  id: string
  generatedAt: string
  version: number

  /** Subiectul */
  subjectId: string
  subjectAlias: string

  /** Scopul definit */
  scope: {
    type: "JOB" | "RELATIONSHIP" | "PERSONAL_GROWTH" | "CUSTOM"
    description: string         // "Team Leader în departamentul meu"
    requirements?: Record<string, number>  // Cerințe traduse în T-score per dimensiune
  }

  /** Profilul sursă (N2) */
  sourceProfile: IndividualProfile

  /** Secțiunile narative (cele 10) */
  sections: NarrativeSection[]

  /** Simulatorul — dimensiuni cu slider */
  simulator: SimulatorConfig

  /** Anexe tehnice (pentru PDF/consultant) */
  annexes: {
    rawScores: DimensionalProfile[]
    instruments: InstrumentSummary[]
    norms: NormReference[]
  }
}

// ═══════════════════════════════════════════════════════════════
// SIMULATOR TYPES
// ═══════════════════════════════════════════════════════════════

/** Configurare per dimensiune simulabilă */
export interface SimulatorDimension {
  dimensionId: string
  label: string                 // "Empatie" | "Toleranță" | etc.
  currentValue: number          // T-score actual
  minRealistic: number          // Minim realist de atins
  maxRealistic: number          // Maxim realist de atins
  impactOnScope: number         // Cât influențează compatibilitatea globală (0-1)

  /** Ce apare în lateral per valoare slider */
  milestones: SimulatorMilestone[]
}

export interface SimulatorMilestone {
  targetValue: number           // T-score țintit
  conditions: string[]          // Ce trebuie să facă
  timeHorizon: string           // "3-4 luni" | "6-9 luni" | etc.
  determination: "SCAZUTA" | "MEDIE" | "RIDICATA" | "FOARTE_RIDICATA"
  effect: string                // Ce se întâmplă dacă atinge valoarea
}

export interface SimulatorConfig {
  dimensions: SimulatorDimension[]
  overallCompatibility: number  // Compatibilitate curentă globală (0-100%)
  calculateCompatibility: (values: Record<string, number>) => number
}

// ═══════════════════════════════════════════════════════════════
// DUAL VIEW SESSION TYPES
// ═══════════════════════════════════════════════════════════════

/** Starea sesiunii de feedback sincron */
export interface DualViewSession {
  sessionId: string
  documentId: string            // NarrativeDocument.id
  consultantId: string
  subjectId: string
  mode: "LIVE" | "ASYNC"
  startedAt?: string
  currentScrollPosition?: string  // ID-ul statement-ului vizibil curent

  /** Starea sesiunii */
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"

  /** Rezultatul sesiunii (după completare) */
  outcome?: {
    actionPlan: ActionDirection[]
    consultantNotes: string
    nextSessionDate?: string
  }
}

/** Direcție de acțiune (rezultat feedback) */
export interface ActionDirection {
  direction: "SELF" | "EMPLOYER" | "B2C"  // Ce face EL | Ce solicită angajatorului | Ce oferă B2C
  description: string
  priority: "CRITICA" | "IMPORTANTA" | "OPTIONALA"
  timeframe: string
}

// ═══════════════════════════════════════════════════════════════
// SUPPORT TYPES
// ═══════════════════════════════════════════════════════════════

export interface InstrumentSummary {
  id: string
  name: string
  scalesCount: number
  normReference: string
  confidence: number
}

export interface NormReference {
  instrumentId: string
  population: string            // "Etalon RO N=1600 feminin"
  sampleSize: number
  year?: number
}

// ═══════════════════════════════════════════════════════════════
// SECTION DEFINITIONS (cele 10 secțiuni)
// ═══════════════════════════════════════════════════════════════

export const NARRATIVE_SECTIONS = [
  { order: 1, id: "opening", title: "De ce ești aici", subtitle: "Scopul și cadrul" },
  { order: 2, id: "who-you-are", title: "Cine ești", subtitle: "Portretul integrat" },
  { order: 3, id: "how-you-work", title: "Cum funcționezi", subtitle: "Pattern-uri în acțiune" },
  { order: 4, id: "strengths", title: "Ce te face puternic", subtitle: "Trăsături diferențiatoare" },
  { order: 5, id: "blind-spots", title: "Unde te sabotezi", subtitle: "Tensiuni și zone oarbe" },
  { order: 6, id: "scope-requirements", title: "Scopul tău", subtitle: "Ce cere el concret" },
  { order: 7, id: "distance", title: "Distanța", subtitle: "Unde ești vs. unde vrei" },
  { order: 8, id: "path", title: "Drumul", subtitle: "Plan concret pas cu pas" },
  { order: 9, id: "simulator", title: "Simulatorul", subtitle: "What-if interactiv" },
  { order: 10, id: "closing", title: "Închidere", subtitle: "Primul pas" },
] as const

export type SectionId = typeof NARRATIVE_SECTIONS[number]["id"]

// ═══════════════════════════════════════════════════════════════
// INFERENCE EVOLUTION — Mecanism auto-perfectibil
// ═══════════════════════════════════════════════════════════════

/**
 * Mecanismul inferențial NU e static. Se auto-perfecționează pe măsură ce
 * primește noi informații despre subiect:
 * - Noi teste (adăugare instrument → recalculare convergență)
 * - Discuții cu Călăuza/FrontDesk → observații noi (Profiler Shadow)
 * - Feedback de la consultant (confirmă/infirmă o inferență)
 * - Tracking real (subiectul a lucrat pe recomandare → rescoring)
 *
 * Principiu: fiecare InferenceBlock are un historicul versiunilor.
 * O inferență poate fi: CONSOLIDATĂ (mai multe surse confirmă),
 * REVIZUITĂ (date noi contrazic), sau EXTINSĂ (noi dimensiuni adăugate).
 */

/** O sursă de date nouă care modifică inferența */
export interface InferenceUpdate {
  /** Ce a declanșat update-ul */
  trigger:
    | "NEW_INSTRUMENT"       // S-a adăugat un test nou
    | "SHADOW_OBSERVATION"   // Profiler Shadow a observat ceva din conversații
    | "CONSULTANT_FEEDBACK"  // Consultantul confirmă/infirmă
    | "SELF_REPORT"          // Subiectul raportează progres/experiență
    | "RESCORING"            // Retestare formală
    | "CONTEXTUAL"           // Context organizațional schimbat (alt rol, altă echipă)

  /** Momentul update-ului */
  timestamp: string

  /** Ce date noi au apărut */
  newData: {
    source: string           // "Conversație Călăuza 15.05.2026" | "CPI retestare" | etc.
    observation?: string     // Observație liberă
    scaleUpdate?: {          // Dacă e un scor nou/modificat
      instrumentId: string
      scaleName: string
      oldValue?: number
      newValue: number
    }
    confidenceAdjustment?: number  // -0.3 ... +0.3 (cât de mult se ajustează încrederea)
  }

  /** Impactul asupra inferenței */
  impact: "CONSOLIDATES" | "REVISES" | "EXTENDS" | "NEUTRAL"
}

/** Istoricul complet al unei inferențe (cum a evoluat în timp) */
export interface InferenceHistory {
  /** ID-ul afirmației */
  statementId: string

  /** Versiunea curentă a inferenței */
  currentVersion: number

  /** Toate versiunile (de la prima generare la acum) */
  versions: InferenceVersion[]

  /** Scor de maturitate: cât de "sigură" e inferența (0-1) */
  maturity: number

  /** Ultima actualizare */
  lastUpdated: string
}

export interface InferenceVersion {
  version: number
  timestamp: string
  inference: InferenceBlock
  trigger: InferenceUpdate["trigger"]
  changeDescription: string   // "Adăugat ESQ-2 → convergența crește de la 2 la 3"
}

/** Profilul narativ ca document VIU (nu snapshot) */
export interface LivingNarrativeProfile {
  /** Documentul narativ curent (ultima versiune) */
  current: NarrativeDocument

  /** Istoricul fiecărei inferențe */
  inferenceHistories: Map<string, InferenceHistory>

  /** Date noi neprocesate (buffer de update-uri) */
  pendingUpdates: InferenceUpdate[]

  /** Pragul de re-generare: când se acumulează suficiente update-uri → regenerare narațiune */
  regenerationThreshold: {
    minUpdates: number           // Minim N update-uri înainte de regenerare
    minMaturityChange: number   // Sau dacă maturitatea medie se schimbă cu X
    maxAge: string              // Sau dacă a trecut X timp de la ultima generare
  }

  /** Dimensiuni noi descoperite din interacțiuni (nu din teste formale) */
  emergentDimensions: EmergentDimension[]
}

/** Dimensiune descoperită din conversații/observații, nu din teste formale */
export interface EmergentDimension {
  id: string
  label: string                 // "Reziliență la feedback negativ" | "Pattern evitare conflict"
  source: "SHADOW" | "CONSULTANT" | "SELF_REPORT"
  confidence: number            // 0-1 (crește cu fiecare observație care confirmă)
  observations: Array<{
    timestamp: string
    context: string             // "Conversație Card 1, min 23"
    observation: string         // "A reacționat defensiv la sugestia de..."
  }>
  /** Când confidence > 0.7, poate deveni sursă în InferenceBlock */
  promotedToSource: boolean
}

// ═══════════════════════════════════════════════════════════════
// INFERENCE ENGINE — Funcții de evoluție
// ═══════════════════════════════════════════════════════════════

/** Calculează maturitatea unei inferențe pe baza istoricului */
export function calculateInferenceMaturity(history: InferenceHistory): number {
  const { versions } = history
  if (versions.length === 0) return 0

  const currentInference = versions[versions.length - 1].inference

  // Factori de maturitate:
  // 1. Convergență (câte surse confirmă) — max 0.4
  const convergenceFactor = Math.min(currentInference.convergence / 5, 1) * 0.4

  // 2. Stabilitate (câte versiuni consecutive fără REVISES) — max 0.3
  let stableVersions = 0
  for (let i = versions.length - 1; i >= 0; i--) {
    if (versions[i].trigger === "CONSULTANT_FEEDBACK" || versions[i].trigger === "RESCORING") {
      stableVersions++
    } else {
      break
    }
  }
  const stabilityFactor = Math.min(stableVersions / 3, 1) * 0.3

  // 3. Vechime (de cât timp există inferența fără a fi contrazisă) — max 0.2
  const ageMs = Date.now() - new Date(versions[0].timestamp).getTime()
  const ageDays = ageMs / (1000 * 60 * 60 * 24)
  const ageFactor = Math.min(ageDays / 90, 1) * 0.2 // Maxim la 90 zile

  // 4. Diversitate surse (câte instrumente diferite) — max 0.1
  const uniqueInstruments = new Set(currentInference.sources.map((s) => s.instrumentId))
  const diversityFactor = Math.min(uniqueInstruments.size / 4, 1) * 0.1

  return convergenceFactor + stabilityFactor + ageFactor + diversityFactor
}

/** Determină dacă un document narativ trebuie regenerat */
export function shouldRegenerate(living: LivingNarrativeProfile): boolean {
  const { pendingUpdates, regenerationThreshold, current } = living

  // Condiția 1: prea multe update-uri neprocesate
  if (pendingUpdates.length >= regenerationThreshold.minUpdates) return true

  // Condiția 2: maturitatea medie s-a schimbat semnificativ
  const avgMaturity = Array.from(living.inferenceHistories.values())
    .reduce((sum, h) => sum + h.maturity, 0) / living.inferenceHistories.size
  // (comparăm cu maturitatea de la ultima generare — stored in current.version metadata)

  // Condiția 3: a trecut prea mult timp
  const generatedAt = new Date(current.generatedAt).getTime()
  const maxAgeMs = parseTimeString(regenerationThreshold.maxAge)
  if (Date.now() - generatedAt > maxAgeMs) return true

  return false
}

/** Aplică un update și returnează noua versiune a inferenței */
export function applyInferenceUpdate(
  current: InferenceBlock,
  update: InferenceUpdate,
  history: InferenceHistory
): InferenceVersion {
  const newInference = { ...current }

  switch (update.impact) {
    case "CONSOLIDATES":
      // Adăugăm sursa nouă, creștem convergența
      if (update.newData.scaleUpdate) {
        newInference.sources = [
          ...current.sources,
          {
            instrumentId: update.newData.scaleUpdate.instrumentId,
            instrumentName: update.newData.source,
            scaleName: update.newData.scaleUpdate.scaleName,
            rawScore: update.newData.scaleUpdate.newValue,
            normalizedT: update.newData.scaleUpdate.newValue, // Needs normalization
            percentile: 0, // Needs calculation
            level: "MEDIU", // Needs calculation
            referenceNorm: "",
          },
        ]
        newInference.convergence = Math.min(5, current.convergence + 1)
      }
      break

    case "REVISES":
      // Modificăm mecanismul — datele noi contrazic
      newInference.mechanism = `[REVIZUIT ${update.timestamp}] ${current.mechanism}`
      if (update.newData.confidenceAdjustment) {
        newInference.convergence = Math.max(1, current.convergence - 1)
      }
      break

    case "EXTENDS":
      // Adăugăm nuanță — observație nouă care nu contrazice dar adaugă
      newInference.composition = `${current.composition} | [+${update.timestamp}]: ${update.newData.observation || ""}`
      break
  }

  return {
    version: history.currentVersion + 1,
    timestamp: new Date().toISOString(),
    inference: newInference,
    trigger: update.trigger,
    changeDescription: describeChange(update),
  }
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function parseTimeString(timeStr: string): number {
  const match = timeStr.match(/^(\d+)\s*(days?|weeks?|months?)$/i)
  if (!match) return 30 * 24 * 60 * 60 * 1000 // default 30 days

  const value = parseInt(match[1])
  switch (match[2].toLowerCase().replace(/s$/, "")) {
    case "day": return value * 24 * 60 * 60 * 1000
    case "week": return value * 7 * 24 * 60 * 60 * 1000
    case "month": return value * 30 * 24 * 60 * 60 * 1000
    default: return 30 * 24 * 60 * 60 * 1000
  }
}

function describeChange(update: InferenceUpdate): string {
  const triggerLabels: Record<string, string> = {
    NEW_INSTRUMENT: "Test nou adăugat",
    SHADOW_OBSERVATION: "Observație din conversații",
    CONSULTANT_FEEDBACK: "Feedback consultant",
    SELF_REPORT: "Auto-raportare subiect",
    RESCORING: "Retestare",
    CONTEXTUAL: "Schimbare context",
  }
  return `${triggerLabels[update.trigger] || update.trigger}: ${update.newData.observation || update.newData.source}`
}
