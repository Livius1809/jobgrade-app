/**
 * claude-opportunity-analysis.ts — Analiză subtilă Claude pe oportunități teritoriale
 *
 * Parte din AI de Continuitate (CPU).
 * Claude NU colectează date (crawlerul face asta).
 * Claude ANALIZEAZĂ, INTERPRETEAZĂ, CORELEAZĂ, RECOMANDĂ.
 *
 * Integrare:
 * - Primește date crawlate + scoruri statice din taxonomie
 * - Evaluează prin prisma L1 (Câmpul) — principii, valori, Bine
 * - Evaluează prin prisma L3 (Legislație) — cadru legal actual
 * - Detectează sinergii cross-sector pe care scorurile statice nu le văd
 * - Generează mecanismul de auto-propagare a Binelui per oportunitate
 * - Returnează evaluare rafinată + recomandări
 */

import { anthropic, AI_MODEL } from "@/lib/ai/client"
import type { L1EthicalAssessment, L3LegalAssessment, EvaluatedOpportunity } from "./opportunity-filters"

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface ClaudeOpportunityAnalysis {
  /** Evaluare L1 rafinată (8 dimensiuni + propagare) */
  ethical: L1EthicalAssessment
  /** Evaluare L3 rafinată (legal + riscuri specifice) */
  legal: L3LegalAssessment
  /** Sinergii detectate cu alte nișe/sectoare */
  synergies: Array<{
    withNicheId: string
    withNicheName: string
    type: "CROSS_SECTOR" | "CROSS_ROD" | "CROSS_TERITORIU" | "CROSS_GENERATIE"
    description: string
    combinedValue: string
  }>
  /** Lanț valoric detaliat — unde se oprește și de ce */
  valueChainAnalysis: string
  /** Mecanismul concret de auto-propagare a Binelui */
  propagationDetail: string
  /** Riscuri subtile pe care scorul static nu le vede */
  hiddenRisks: string[]
  /** Condiții etice specifice contextului local */
  localEthicalConditions: string[]
  /** Recomandare finală (narativ) */
  recommendation: string
  /** Scor final ajustat de Claude (poate diferi de cel static) */
  adjustedFinalScore: number
}

export interface TerritoryContext {
  territory: string
  population: number
  ethnicGroups?: string[]
  topBusinessSectors?: string[]
  infrastructure?: string[]
  knownGaps?: string[]
  culturalAssets?: string[]
}

// ═══════════════════════════════════════════════════════════════
// SYSTEM PROMPTS — L1 + L3 ENCODED
// ═══════════════════════════════════════════════════════════════

const L1_SYSTEM_PROMPT = `Ești componenta L1 (Câmpul) a AI de Continuitate — stratul de principii și valori universale al organismului mamă.

PRINCIPII L1 (nu se negociază):
- ONESTITATE: nu exagerăm, nu minimizăm, nu manipulăm
- TRANSPARENȚĂ: procesul, costul, beneficiul sunt vizibile
- BINELE: fiecare acțiune trebuie să producă Bine net (nu doar profit)
- SPIRALA: Binele generat trebuie să producă mai mult Bine (auto-propagare)
- RESPECTUL: demnitatea umană e non-negociabilă
- AUTONOMIA: creăm independență, nu dependență
- ECHITATEA: acces egal, fără discriminare
- SUSTENABILITATEA: nu sacrificăm viitorul pentru prezent

Când evaluezi o oportunitate economică, judeci NU dacă activitatea e bună/rea în abstract, ci CUM se implementează. Aceeași activitate poate fi etică sau nu.

Evaluezi pe 8 dimensiuni (0-10):
1. communityWellbeing — beneficiul net pentru comunitate
2. humanDignity — respect demnitate, zero exploatare
3. environmentalCare — impact mediu (pozitiv sau cel puțin neutru)
4. autonomyCreation — creează autonomie vs. dependență
5. selfPropagation — Binele generat produce mai mult Bine
6. transparency — vizibilitate proces/preț/calitate
7. knowledgeContribution — contribuie la cunoaștere
8. equity — acces echitabil

IMPORTANT: dimensiunea 5 (selfPropagation) e CEA MAI IMPORTANTĂ.
Descrie CONCRET cum se auto-propagă Binele: A → B → C → spirala crește.

Sub 3 pe ORICE dimensiune = RESPINSĂ ETIC (explică de ce).
Medie sub 5 = CONDIȚIONATĂ (spune ce trebuie schimbat).`

const L3_SYSTEM_PROMPT = `Ești componenta L3 (Legislație) a AI de Continuitate — stratul de cadru legal al organismului mamă.

Evaluezi conformitatea legală în România + UE:
- Licențe și autorizații necesare (specifice, nu generice)
- Organisme de autorizare (instituții concrete)
- Directive UE aplicabile
- Riscuri legale specifice
- Timeline estimat pentru obținere autorizații

IMPORTANT:
- Nu inventa reglementări — dacă nu ești sigur, spune "de verificat cu CJA"
- Legislația se schimbă — crawlerul L3 actualizează periodic
- Evaluarea ta e un punct de pornire, nu un aviz juridic final`

// ═══════════════════════════════════════════════════════════════
// ANALIZĂ CLAUDE — OPORTUNITATE INDIVIDUALĂ
// ═══════════════════════════════════════════════════════════════

/**
 * Analiză subtilă Claude pe o oportunitate.
 * Folosește L1 + L3 system prompts + context teritorial.
 */
export async function analyzeOpportunityWithClaude(
  opportunity: EvaluatedOpportunity,
  context: TerritoryContext,
  allOpportunities?: EvaluatedOpportunity[]
): Promise<ClaudeOpportunityAnalysis> {
  const otherOpps = (allOpportunities || [])
    .filter(o => o.nicheId !== opportunity.nicheId && o.status !== "RESPINSA_LEGAL")
    .slice(0, 10)
    .map(o => `${o.sectorName} > ${o.nicheName} (scor: ${o.finalScore})`)

  const prompt = `Analizează această oportunitate teritorială prin prisma L1 (Binele) și L3 (Legal).

TERITORIU: ${context.territory}
Populație: ${context.population.toLocaleString()}
${context.ethnicGroups ? `Grupuri etnice: ${context.ethnicGroups.join(", ")}` : ""}
${context.topBusinessSectors ? `Sectoare dominante: ${context.topBusinessSectors.join(", ")}` : ""}
${context.infrastructure ? `Infrastructură: ${context.infrastructure.join(", ")}` : ""}
${context.knownGaps ? `Gap-uri cunoscute: ${context.knownGaps.join(", ")}` : ""}
${context.culturalAssets ? `Active culturale: ${context.culturalAssets.join(", ")}` : ""}

OPORTUNITATE:
Sector: ${opportunity.sectorName}
Nișă: ${opportunity.nicheName}
Scor economic brut: ${opportunity.rawScore}/10
Scor etic static: ${opportunity.ethical?.overallScore || "N/A"}/10
Status curent: ${opportunity.status}

EVALUARE STATICĂ L3 (de rafinat):
${JSON.stringify(opportunity.legal, null, 2)}

EVALUARE STATICĂ L1 (de rafinat):
${opportunity.ethical ? JSON.stringify(opportunity.ethical, null, 2) : "Lipsă — evaluează de la zero."}

ALTE OPORTUNITĂȚI ÎN TERITORIU (pentru sinergii):
${otherOpps.length > 0 ? otherOpps.join("\n") : "Niciuna încă evaluată."}

Răspunde STRICT în format JSON cu structura:
{
  "ethical": {
    "overallScore": number,
    "dimensions": {
      "communityWellbeing": number,
      "humanDignity": number,
      "environmentalCare": number,
      "autonomyCreation": number,
      "selfPropagation": number,
      "transparency": number,
      "knowledgeContribution": number,
      "equity": number
    },
    "positiveFactors": ["..."],
    "negativeFactors": ["..."],
    "ethicalConditions": ["..."],
    "propagationMechanism": "descriere completă spirala de auto-propagare a Binelui"
  },
  "legal": {
    "isLegal": boolean,
    "regulationLevel": "NEREGLEMENTAT|REGLEMENTAT|STRICT_REGLEMENTAT|INTERZIS",
    "requiredLicenses": ["..."],
    "authorizingBodies": ["..."],
    "euCompliance": ["..."],
    "legalRisks": ["..."],
    "notes": "..."
  },
  "synergies": [
    {
      "withNicheId": "...",
      "withNicheName": "...",
      "type": "CROSS_SECTOR|CROSS_ROD|CROSS_TERITORIU|CROSS_GENERATIE",
      "description": "...",
      "combinedValue": "..."
    }
  ],
  "valueChainAnalysis": "unde se oprește lanțul valoric și de ce — concret per acest teritoriu",
  "propagationDetail": "mecanismul COMPLET de auto-propagare: A face X → B primește Y → C generează Z → spirala crește",
  "hiddenRisks": ["riscuri pe care scorul static nu le vede"],
  "localEthicalConditions": ["condiții specifice ACESTUI teritoriu"],
  "recommendation": "recomandare finală — 2-3 propoziții",
  "adjustedFinalScore": number
}`

  try {
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 2000,
      system: `${L1_SYSTEM_PROMPT}\n\n${L3_SYSTEM_PROMPT}`,
      messages: [{ role: "user", content: prompt }],
    })

    const text = response.content
      .filter(c => c.type === "text")
      .map(c => c.text)
      .join("")

    // Extrage JSON din răspuns (poate avea text wrapper)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error("Claude nu a returnat JSON valid")
    }

    const parsed = JSON.parse(jsonMatch[0]) as ClaudeOpportunityAnalysis
    return parsed
  } catch (error) {
    // Fallback la evaluarea statică dacă Claude nu e disponibil
    console.error("[claude-opportunity] Analysis failed, using static fallback:", error)
    return {
      ethical: opportunity.ethical || {
        overallScore: 5,
        dimensions: {
          communityWellbeing: 5, humanDignity: 5, environmentalCare: 5,
          autonomyCreation: 5, selfPropagation: 5, transparency: 5,
          knowledgeContribution: 5, equity: 5,
        },
        positiveFactors: [],
        negativeFactors: ["Evaluare Claude indisponibilă — scor static"],
        ethicalConditions: ["Necesită evaluare L1 completă"],
        propagationMechanism: "De analizat — Claude indisponibil.",
      },
      legal: opportunity.legal,
      synergies: [],
      valueChainAnalysis: "Analiză Claude indisponibilă — fallback la evaluare statică.",
      propagationDetail: "De analizat când Claude e disponibil.",
      hiddenRisks: ["Evaluare incompletă — doar scoruri statice"],
      localEthicalConditions: [],
      recommendation: "Evaluare preliminară pe baza scorurilor statice. Necesită analiză Claude completă.",
      adjustedFinalScore: opportunity.finalScore,
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// ANALIZĂ CLAUDE — TERITORIU COMPLET (batch)
// ═══════════════════════════════════════════════════════════════

/**
 * Analiză Claude pe top N oportunități dintr-un teritoriu.
 * Economisește API calls — trimite batch, nu individual.
 */
export async function analyzeTopOpportunitiesWithClaude(
  opportunities: EvaluatedOpportunity[],
  context: TerritoryContext,
  topN: number = 5
): Promise<Map<string, ClaudeOpportunityAnalysis>> {
  const results = new Map<string, ClaudeOpportunityAnalysis>()
  const topOpps = opportunities
    .filter(o => o.status === "APROBATA" || o.status === "CONDITIONATA")
    .slice(0, topN)

  // Evaluăm secvențial (nu paralel) — controlăm costul Claude
  for (const opp of topOpps) {
    const analysis = await analyzeOpportunityWithClaude(opp, context, opportunities)
    results.set(opp.nicheId, analysis)
  }

  return results
}

// ═══════════════════════════════════════════════════════════════
// ANALIZĂ CLAUDE — SINERGII TERITORIALE
// ═══════════════════════════════════════════════════════════════

/**
 * Detectează sinergii cross-sector pe care scorurile individuale nu le văd.
 * Ex: Turism gastronomic + Agricultură bio + Artizanat = cluster exponențial.
 */
export async function analyzeTerritorialSynergies(
  opportunities: EvaluatedOpportunity[],
  context: TerritoryContext
): Promise<Array<{
  cluster: string[]
  clusterName: string
  description: string
  combinedScore: number
  propagation: string
}>> {
  const approved = opportunities
    .filter(o => o.status === "APROBATA")
    .slice(0, 15)

  if (approved.length < 2) return []

  const prompt = `Analizează aceste oportunități aprobate pentru teritoriul ${context.territory} și detectează SINERGII — combinații care împreună produc mai multă valoare decât individual.

CONTEXT TERITORIAL:
Populație: ${context.population.toLocaleString()}
${context.ethnicGroups ? `Diversitate etnică: ${context.ethnicGroups.join(", ")}` : ""}
${context.culturalAssets ? `Active culturale: ${context.culturalAssets.join(", ")}` : ""}

OPORTUNITĂȚI APROBATE:
${approved.map(o => `- ${o.sectorName} > ${o.nicheName} (economic: ${o.rawScore}, etic: ${o.ethical?.overallScore || "?"}, final: ${o.finalScore})`).join("\n")}

Caută 4 tipuri de sinergii:
1. CROSS_SECTOR: nișe din sectoare diferite care se amplifică reciproc
2. CROSS_ROD: intersecția celor 3 roduri (pământ × cultură × individ)
3. CROSS_TERITORIU: sinergii cu localitățile vecine
4. CROSS_GENERATIE: transfer între generații (meșteșugari bătrâni + tineri)

Pentru fiecare sinergie, descrie mecanismul de auto-propagare a Binelui.

Răspunde STRICT în format JSON:
[
  {
    "cluster": ["NICHE_ID_1", "NICHE_ID_2", ...],
    "clusterName": "Nume scurt cluster",
    "description": "Ce produce combinația",
    "combinedScore": number (0-10),
    "propagation": "Cum se auto-propagă Binele din această combinație"
  }
]`

  try {
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 1500,
      system: L1_SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    })

    const text = response.content
      .filter(c => c.type === "text")
      .map(c => c.text)
      .join("")

    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []

    return JSON.parse(jsonMatch[0])
  } catch (error) {
    console.error("[claude-synergies] Analysis failed:", error)
    return []
  }
}
