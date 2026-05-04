/**
 * PEER REVIEW ENGINE — A doua opinie obligatorie pe inferențe
 *
 * Principiu: orice interpretare trece prin cel puțin un peer cu
 * competențe similare. Nu pentru aprobare — pentru ÎMBOGĂȚIRE.
 * Perspectiva peer-ului poate produce un nivel SUPERIOR de cunoaștere.
 *
 * Workflow:
 *   Agent primar produce InferenceBlock draft
 *     → Peer primește draft + date sursă
 *       → Peer returnează PeerReviewResult
 *         → Document final integrează ambele perspective
 */

import type { InferenceBlock } from "./narrative-profile"

// OrgInferenceBlock is a specialization of InferenceBlock for organizational context
type OrgInferenceBlock = InferenceBlock

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

/** Roluri de agenți cu competență de interpretare */
export type InferenceAgent =
  | "PSEC"              // PsihoSocioEconomist
  | "SDO"              // Specialist Dezvoltare Organizațională
  | "SSED"             // Specialist Științele Educației
  | "JDM"              // Jurist Dreptul Muncii
  | "AET"              // Analist Economic Teritorial
  | "PPMO"             // Psiholog Psihometrician
  | "PSIHOLINGVIST"    // Specialist Psiholingvistică
  | "L3"              // Cadru Legal generic

/** Perechile de peer review definite */
export interface PeerPair {
  primary: InferenceAgent
  peer: InferenceAgent
  /** Ce perspectivă aduce peer-ul */
  peerContribution: string
  /** Bidirecțional — peer-ul poate fi și el reviewed de primary */
  bidirectional: boolean
}

/** Configurarea perechilor */
export const PEER_PAIRS: PeerPair[] = [
  {
    primary: "PSEC",
    peer: "SDO",
    peerContribution: "Complexitatea mecanismului de remediere + fezabilitate intervenție",
    bidirectional: true,
  },
  {
    primary: "SDO",
    peer: "PSEC",
    peerContribution: "ROI real incluzând costuri ascunse + cuantificare impact",
    bidirectional: true,
  },
  {
    primary: "SSED",
    peer: "PSIHOLINGVIST",
    peerContribution: "Adecvare lingvistică per vârstă + accesibilitate formulare",
    bidirectional: true,
  },
  {
    primary: "JDM",
    peer: "L3",
    peerContribution: "Context legislativ mai larg + jurisprudență recentă + directive UE",
    bidirectional: false,
  },
  {
    primary: "AET",
    peer: "PSEC",
    peerContribution: "Capital uman necesar + cost formare + disponibilitate resurse umane",
    bidirectional: false,
  },
  {
    primary: "PPMO",
    peer: "PSEC",
    peerContribution: "Interpretarea scorurilor în context organizațional + impact",
    bidirectional: false,
  },
  {
    primary: "PPMO",
    peer: "SDO",
    peerContribution: "Implicațiile profilului pentru intervenții de dezvoltare",
    bidirectional: false,
  },
]

/** Rezultatul peer review-ului */
export interface PeerReviewResult {
  /** Cine a făcut review */
  reviewerAgent: InferenceAgent
  /** Momentul review-ului */
  timestamp: string
  /** Tipul de rezultat */
  outcome: "CONFIRMED_ENRICHED" | "NUANCED" | "CHALLENGED"
  /** Perspectiva adăugată de peer */
  enrichment: string
  /** Detalii specifice */
  details: {
    /** Ce a confirmat */
    confirmed?: string
    /** Ce a adăugat nou */
    added?: string
    /** Ce a nuanțat/condiționat */
    nuance?: string
    /** Ce a provocat/contestat (doar la CHALLENGED) */
    challenge?: string
    /** Impact asupra cuantificării (dacă există) */
    quantificationAdjustment?: {
      original: string        // "cost estimat: 50K RON/an"
      adjusted: string        // "cost estimat: 35-65K RON/an (interval extins)"
      reason: string          // "Peer consideră că factorul X reduce impactul"
    }
  }
  /** Nivel de încredere al peer-ului în propria contribuție */
  confidence: number          // 0-1
}

/** Inferența îmbogățită (după peer review) */
export interface EnrichedInference {
  /** Inferența originală */
  original: InferenceBlock
  /** Agentul primar */
  primaryAgent: InferenceAgent
  /** Review-urile primite */
  peerReviews: PeerReviewResult[]
  /** Inferența finală (integrează ambele perspective) */
  final: InferenceBlock
  /** Ce s-a schimbat față de original */
  enrichmentSummary: string
  /** Status publicare */
  publishReady: boolean       // false dacă un CHALLENGED nu e rezolvat
}

// ═══════════════════════════════════════════════════════════════
// GOVERNANCE RULES
// ═══════════════════════════════════════════════════════════════

/** Reguli de când e OBLIGATORIU peer review */
export interface PeerReviewPolicy {
  /** Convergență sub pragul ăsta → peer review obligatoriu */
  convergenceThreshold: number    // default: 3

  /** Orice output client-facing → peer review obligatoriu */
  clientFacingAlways: boolean     // default: true

  /** Cuantificări (RON, %, timeline) → peer review obligatoriu */
  quantificationsAlways: boolean  // default: true

  /** Regenerare living profile → peer review obligatoriu */
  regenerationAlways: boolean     // default: true

  /** Solo permis doar pentru: */
  soloAllowedFor: SoloAllowedAction[]
}

export type SoloAllowedAction =
  | "MEASUREMENT"           // Colectare date, scorare, normalizare
  | "CRAWLING"             // Colectare date externe
  | "AGGREGATION"          // Agregare fără interpretare
  | "EXECUTION_VALIDATED"  // Execuție pe sarcini validate anterior

export const DEFAULT_PEER_REVIEW_POLICY: PeerReviewPolicy = {
  convergenceThreshold: 3,
  clientFacingAlways: true,
  quantificationsAlways: true,
  regenerationAlways: true,
  soloAllowedFor: ["MEASUREMENT", "CRAWLING", "AGGREGATION", "EXECUTION_VALIDATED"],
}

// ═══════════════════════════════════════════════════════════════
// ENGINE FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/** Determină peer-ul potrivit pentru un agent primar */
export function findPeers(primaryAgent: InferenceAgent): PeerPair[] {
  return PEER_PAIRS.filter((p) => p.primary === primaryAgent)
}

/** Verifică dacă o inferență necesită peer review conform policy */
export function requiresPeerReview(
  inference: InferenceBlock,
  context: {
    isClientFacing: boolean
    hasQuantification: boolean
    isRegeneration: boolean
  },
  policy: PeerReviewPolicy = DEFAULT_PEER_REVIEW_POLICY
): boolean {
  if (context.isClientFacing && policy.clientFacingAlways) return true
  if (context.hasQuantification && policy.quantificationsAlways) return true
  if (context.isRegeneration && policy.regenerationAlways) return true
  if (inference.convergence < policy.convergenceThreshold) return true
  return false
}

/** Integrează peer review în inferența finală */
export function integrateReview(
  original: InferenceBlock,
  review: PeerReviewResult
): InferenceBlock {
  const enriched = { ...original }

  switch (review.outcome) {
    case "CONFIRMED_ENRICHED":
      // Adăugăm perspectiva, creștem convergența
      enriched.composition = `${original.composition}\n[Peer ${review.reviewerAgent}]: ${review.details.added || review.enrichment}`
      enriched.convergence = Math.min(5, original.convergence + 1)
      break

    case "NUANCED":
      // Adăugăm nuanța, ajustăm mecanismul
      enriched.mechanism = `${original.mechanism}\n[Nuanță ${review.reviewerAgent}]: ${review.details.nuance || review.enrichment}`
      if (review.details.quantificationAdjustment) {
        enriched.consultantNotes = `${original.consultantNotes || ""}\n⚠️ Cuantificare ajustată peer: ${review.details.quantificationAdjustment.adjusted} (${review.details.quantificationAdjustment.reason})`
      }
      break

    case "CHALLENGED":
      // Marcare ca necesitând rezoluție
      enriched.consultantNotes = `${original.consultantNotes || ""}\n🔴 CHALLENGED de ${review.reviewerAgent}: ${review.details.challenge}. Necesită rezoluție înainte de publicare.`
      // NU creștem convergența — scădem
      enriched.convergence = Math.max(1, original.convergence - 1)
      break
  }

  return enriched
}

/** Verifică dacă inferența e publicabilă (nu are CHALLENGED nerezolvat) */
export function isPublishReady(reviews: PeerReviewResult[]): boolean {
  const hasChallenged = reviews.some((r) => r.outcome === "CHALLENGED")
  if (!hasChallenged) return true

  // TODO: verificare dacă challenged a fost rezolvat într-un review ulterior
  return false
}

/** Generează prompt-ul de peer review pentru Claude (agentul peer) */
export function buildPeerReviewPrompt(
  primaryAgent: InferenceAgent,
  peerAgent: InferenceAgent,
  inference: InferenceBlock,
  sourceData: Record<string, unknown>
): string {
  const pair = PEER_PAIRS.find(
    (p) => p.primary === primaryAgent && p.peer === peerAgent
  )

  return `Ești ${peerAgent} și faci peer review pe o inferență produsă de ${primaryAgent}.

ROLUL TĂU: ${pair?.peerContribution || "Oferă o a doua perspectivă pe baza competențelor tale."}

INFERENȚA DE REVIEW-UIT:
- Afirmație: [legată de statementId: ${inference.statementId}]
- Surse: ${JSON.stringify(inference.sources.map(s => `${s.instrumentId}/${s.scaleName}=T${s.normalizedT}`))}
- Compoziție: ${inference.composition}
- Mecanism: ${inference.mechanism}
- Convergență actuală: ${inference.convergence}/5

DATE SURSĂ DISPONIBILE:
${JSON.stringify(sourceData, null, 2)}

ÎNTREBARE: Din perspectiva ta de ${peerAgent}, ce vezi?
- Confirmi și îmbogățești? (ce adaugi din unghiul tău)
- Nuanțezi? (ce condiție sau ajustare e necesară)
- Provoci? (vezi altceva din datele disponibile)

Răspunde cu structura:
{
  "outcome": "CONFIRMED_ENRICHED" | "NUANCED" | "CHALLENGED",
  "enrichment": "perspectiva ta într-o propoziție",
  "details": {
    "confirmed": "ce confirmi",
    "added": "ce adaugi nou",
    "nuance": "ce condiționezi",
    "challenge": "ce contești (doar dacă CHALLENGED)",
    "quantificationAdjustment": { "original": "...", "adjusted": "...", "reason": "..." }
  },
  "confidence": 0.0-1.0
}`
}
