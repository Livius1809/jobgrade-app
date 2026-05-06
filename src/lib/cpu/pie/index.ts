/**
 * PIE — Profiler Integration Engine ("Capo dei Capi")
 *
 * Componenta CPU care INTEGREAZĂ profiluri din engine-uri diferite.
 * PIE se activează DOAR la puncte de intersecție:
 *   - Profil singular → un singur engine (B2B sau B2C), PIE NU intervine
 *   - Integrare Om × Post → PIE activat
 *   - Integrare Om × Post × Organizație → PIE activat
 *   - Integrare Post × Org → NU trece prin PIE (exclusiv Profiler Engine B2B)
 *
 * Ierarhie: Profiler_Frontdesk (agent) → PIE → Profiler Engine B2B + Profiler Engine B2C + Score Normalizer
 *
 * Utilizare:
 *   - B2B Card 3: evaluare compatibilitate angajat × post
 *   - B2B Card 4: evaluare angajat × post × cultură organizațională
 *   - B2C Card 3: matching candidat × post (cu dezvoltare individuală opțională)
 *
 * Destinatari output:
 *   - B2B: persoana evaluată, superiori (HR + ierarhic), Consultant Uman, HR Counselor agent
 *   - B2C: Card 3 Counselor (doar dacă persoana optează pentru dezvoltare individuală)
 */

import { cpuCall } from "../gateway"
import {
  calculateGapAnalysis,
  calculateCulturalGaps,
  classifyPersonScores,
  calculateCognitiveFit,
  calculateRetentionPrognosis,
} from "./score-normalizer"

import type {
  PIERequest,
  PIEOutput,
  PersonProfile,
  PositionProfile,
  OrganizationProfile,
  PersonPositionResult,
  PersonPositionOrgResult,
  OutputDestination,
  GapAnalysis,
  GapItem,
} from "./types"

// Re-export types
export type {
  PIERequest,
  PIEOutput,
  PersonProfile,
  PositionProfile,
  OrganizationProfile,
  PersonPositionResult,
  PersonPositionOrgResult,
  OutputDestination,
  GapAnalysis,
  GapItem,
}

// Re-export score normalizer functions
export {
  calculateGapAnalysis,
  calculateCulturalGaps,
  classifyPersonScores,
  calculateCognitiveFit,
  calculateRetentionPrognosis,
} from "./score-normalizer"

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const PIE_AGENT_ROLE = "PIE"

/** Praguri compatibilitate → nivel */
const COMPATIBILITY_LEVELS = {
  EXCELENT: 85,
  BUN: 70,
  ACCEPTABIL: 55,
  MARGINAL: 40,
  // sub 40 = INADECVAT
} as const

/** Ponderi integrare triple (Om × Post × Org) */
const TRIPLE_WEIGHTS = {
  positionFit: 0.50,
  cultureFit: 0.30,
  leadershipFit: 0.20,
} as const

// ═══════════════════════════════════════════════════════════════
// MAIN PIE ENGINE
// ═══════════════════════════════════════════════════════════════

/**
 * Punct de intrare principal PIE.
 * Dispatchează la integrarea corectă pe baza tipului cerut.
 */
export async function integrate(request: PIERequest): Promise<PIEOutput[]> {
  let result: PersonPositionResult | PersonPositionOrgResult

  switch (request.integrationType) {
    case "PERSON_POSITION":
      result = await integratePersonPosition(request.person, request.position, request.language)
      break
    case "PERSON_POSITION_ORG":
      if (!request.organization) {
        throw new Error("[PIE] PERSON_POSITION_ORG necesită organizationProfile. Verifică request-ul.")
      }
      result = await integratePersonPositionOrg(
        request.person,
        request.position,
        request.organization,
        request.language,
      )
      break
    default:
      throw new Error(`[PIE] IntegrationType "${request.integrationType}" nu e suportată. Post×Org nu trece prin PIE.`)
  }

  // Generăm output-uri filtrate per destinatar
  return request.outputDestinations.map(dest =>
    buildOutputForDestination(dest, result, request.businessContext)
  )
}

// ═══════════════════════════════════════════════════════════════
// INTEGRATION TYPE 1: OM × POST
// ═══════════════════════════════════════════════════════════════

/**
 * Integrare persoană × post.
 * Folosit în B2C Card 3 (matching) și B2B Card 3 (evaluare pe post).
 */
export async function integratePersonPosition(
  person: PersonProfile,
  position: PositionProfile,
  language: "ro" | "en" = "ro",
): Promise<PersonPositionResult> {
  // 1. Gap analysis (calcul determinist, fără AI)
  const gapAnalysis = calculateGapAnalysis(person, position)

  // 2. Clasificare scoruri
  const classifiedScores = classifyPersonScores(person)

  // 3. Fit cognitiv
  const cognitiveFit = calculateCognitiveFit(person, position)

  // 4. Compatibilitate globală
  const compatibilityScore = gapAnalysis.overallFitScore
  const compatibilityLevel = scoreToCompatibilityLevel(compatibilityScore)

  // 5. Recomandare (folosim AI pentru narativ integrat)
  const recommendation = await generateRecommendation(
    person, position, gapAnalysis, cognitiveFit, compatibilityScore, language,
  )

  return {
    integrationType: "PERSON_POSITION",
    personId: person.personId,
    positionId: position.positionId,
    compatibilityScore,
    compatibilityLevel,
    gapAnalysis,
    classifiedScores,
    cognitiveStyleFit: { fit: cognitiveFit.fit, detail: cognitiveFit.detail },
    recommendation,
    generatedAt: new Date().toISOString(),
  }
}

// ═══════════════════════════════════════════════════════════════
// INTEGRATION TYPE 2: OM × POST × ORGANIZAȚIE
// ═══════════════════════════════════════════════════════════════

/**
 * Integrare persoană × post × organizație.
 * Folosit în B2B Card 3 (evaluare completă) și Card 4 (dezvoltare organizațională).
 */
export async function integratePersonPositionOrg(
  person: PersonProfile,
  position: PositionProfile,
  organization: OrganizationProfile,
  language: "ro" | "en" = "ro",
): Promise<PersonPositionOrgResult> {
  // 1. Integrare Om × Post (refolosim)
  const positionFit = await integratePersonPosition(person, position, language)

  // 2. Gap-uri culturale
  const culturalGaps = calculateCulturalGaps(person, organization)
  const cultureFitScore = calculateCultureFitScore(culturalGaps, organization)
  const cultureFitLevel = cultureFitScore >= 80 ? "EXCELENT" as const
    : cultureFitScore >= 65 ? "BUN" as const
    : cultureFitScore >= 50 ? "ACCEPTABIL" as const
    : cultureFitScore >= 35 ? "TENSIUNE" as const
    : "CONFLICT" as const

  // 3. Aliniere valori
  const { alignedValues, conflictingValues } = analyzeValueAlignment(person, organization)

  // 4. Fit leadership
  const leadershipFit = position.leadershipRequired
    ? analyzeLeadershipFit(person, organization)
    : undefined

  // 5. Scor integrat final
  const leadershipScore = leadershipFit?.compatible ? 80 : leadershipFit ? 40 : 60
  const integratedScore = Math.round(
    positionFit.compatibilityScore * TRIPLE_WEIGHTS.positionFit +
    cultureFitScore * TRIPLE_WEIGHTS.cultureFit +
    leadershipScore * TRIPLE_WEIGHTS.leadershipFit
  )
  const integratedLevel = scoreToCompatibilityLevel(integratedScore)

  // 6. Prognoza retenție
  const retentionPrognosis = calculateRetentionPrognosis(
    positionFit.compatibilityScore,
    cultureFitScore,
    person,
  )

  // 7. Recomandare finală (cu context organizațional)
  const recommendation = await generateOrgRecommendation(
    person, position, organization, positionFit, cultureFitScore, leadershipFit, language,
  )

  return {
    integrationType: "PERSON_POSITION_ORG",
    personId: person.personId,
    positionId: position.positionId,
    tenantId: organization.tenantId,
    positionFit,
    cultureFit: {
      score: cultureFitScore,
      level: cultureFitLevel,
      alignedValues,
      conflictingValues,
      culturalGaps,
    },
    leadershipFit,
    integratedScore,
    integratedLevel,
    retentionPrognosis,
    recommendation,
    generatedAt: new Date().toISOString(),
  }
}

// ═══════════════════════════════════════════════════════════════
// OUTPUT BUILDER — filtrare per destinatar
// ═══════════════════════════════════════════════════════════════

/**
 * Construiește output-ul filtrat per destinatar.
 * Fiecare rol vede informațiile relevante pentru el.
 */
function buildOutputForDestination(
  destination: OutputDestination,
  result: PersonPositionResult | PersonPositionOrgResult,
  businessContext: "B2B" | "B2C",
): PIEOutput {
  switch (destination) {
    case "EVALUATED_PERSON":
      return {
        destination,
        visibleData: {
          compatibilityScore: result.integrationType === "PERSON_POSITION"
            ? (result as PersonPositionResult).compatibilityScore
            : (result as PersonPositionOrgResult).integratedScore,
          compatibilityLevel: result.integrationType === "PERSON_POSITION"
            ? (result as PersonPositionResult).compatibilityLevel
            : (result as PersonPositionOrgResult).integratedLevel,
          recommendation: result.recommendation,
        },
        roleSpecificRecommendations: buildPersonRecommendations(result),
        detailLevel: "SUMAR",
      }

    case "HR_SUPERVISOR":
      return {
        destination,
        visibleData: result,
        roleSpecificRecommendations: buildHRRecommendations(result),
        detailLevel: "COMPLET",
      }

    case "HIERARCHY_SUPERVISOR":
      return {
        destination,
        visibleData: {
          compatibilityScore: result.integrationType === "PERSON_POSITION"
            ? (result as PersonPositionResult).compatibilityScore
            : (result as PersonPositionOrgResult).integratedScore,
          compatibilityLevel: result.integrationType === "PERSON_POSITION"
            ? (result as PersonPositionResult).compatibilityLevel
            : (result as PersonPositionOrgResult).integratedLevel,
          gapAnalysis: result.integrationType === "PERSON_POSITION"
            ? (result as PersonPositionResult).gapAnalysis
            : (result as PersonPositionOrgResult).positionFit.gapAnalysis,
          recommendation: result.recommendation,
        },
        roleSpecificRecommendations: buildSupervisorRecommendations(result),
        detailLevel: "DETALIAT",
      }

    case "HUMAN_CONSULTANT":
      return {
        destination,
        visibleData: result,
        roleSpecificRecommendations: [
          "Accesați raportul complet cu toate scorurile și gap-urile pentru interpretare clinică.",
          "Validați congruențele/tensiunile identificate automat prin interviu structurat.",
        ],
        detailLevel: "COMPLET",
      }

    case "HR_COUNSELOR_AGENT":
      return {
        destination,
        visibleData: result,
        roleSpecificRecommendations: [
          "Utilizați gap analysis pentru construcția planului de dezvoltare.",
          "Monitorizați progresul pe dimensiunile cu severity SEMNIFICATIV sau CRITIC.",
        ],
        detailLevel: "COMPLET",
      }

    case "B2C_CARD3_COUNSELOR":
      return {
        destination,
        visibleData: {
          compatibilityScore: result.integrationType === "PERSON_POSITION"
            ? (result as PersonPositionResult).compatibilityScore
            : (result as PersonPositionOrgResult).integratedScore,
          recommendation: result.recommendation,
          gapAnalysis: result.integrationType === "PERSON_POSITION"
            ? (result as PersonPositionResult).gapAnalysis
            : (result as PersonPositionOrgResult).positionFit.gapAnalysis,
        },
        roleSpecificRecommendations: buildB2CCounselorRecommendations(result),
        detailLevel: businessContext === "B2C" ? "DETALIAT" : "SUMAR",
      }
  }
}

// ═══════════════════════════════════════════════════════════════
// AI-POWERED RECOMMENDATION GENERATION
// ═══════════════════════════════════════════════════════════════

async function generateRecommendation(
  person: PersonProfile,
  position: PositionProfile,
  gapAnalysis: GapAnalysis,
  cognitiveFit: { fit: boolean; score: number; detail: string },
  compatibilityScore: number,
  language: "ro" | "en",
): Promise<PersonPositionResult["recommendation"]> {
  // Decizie deterministă pe baza scorurilor
  const decision = determineDecision(compatibilityScore, gapAnalysis)

  // Generăm narativ prin CPU
  const systemPrompt = language === "ro"
    ? `Ești expert în evaluarea compatibilității persoană-post. Generează un paragraf concis (3-5 propoziții) care explică decizia de evaluare. Menționează punctele forte, gap-urile principale și riscurile. Fii direct și profesional. Nu folosi formule de politețe excesivă.`
    : `You are an expert in person-position fit assessment. Generate a concise paragraph (3-5 sentences) explaining the evaluation decision. Mention strengths, main gaps, and risks. Be direct and professional.`

  const userMessage = JSON.stringify({
    decision,
    compatibilityScore,
    criticalGaps: gapAnalysis.gaps.filter(g => g.severity === "CRITIC" || g.severity === "SEMNIFICATIV"),
    strengths: gapAnalysis.gaps.filter(g => g.delta > 5),
    cognitiveStyleFit: cognitiveFit.fit,
    positionTitle: position.title,
    personMaturity: person.maturityLevel,
  })

  const cpuResult = await cpuCall({
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
    max_tokens: 500,
    agentRole: PIE_AGENT_ROLE,
    operationType: "integration-recommendation",
    skipObjectiveCheck: true,
    skipKBFirst: true,
    language,
  })

  const reasoning = cpuResult.degraded
    ? buildFallbackReasoning(decision, gapAnalysis, position.title, language)
    : cpuResult.text

  const developmentPlan = gapAnalysis.gaps
    .filter(g => g.developable && g.severity !== "ALINIAT")
    .sort((a, b) => a.delta - b.delta)
    .map(g => `${g.dimension}: ${g.interpretation} (estimat ${g.estimatedDevelopmentMonths ?? "N/A"} luni)`)

  const risks = gapAnalysis.gaps
    .filter(g => g.severity === "CRITIC" || g.severity === "SEMNIFICATIV")
    .map(g => g.interpretation)

  return {
    decision,
    reasoning,
    developmentPlan: developmentPlan.length > 0 ? developmentPlan : undefined,
    risks: risks.length > 0 ? risks : undefined,
  }
}

async function generateOrgRecommendation(
  person: PersonProfile,
  position: PositionProfile,
  organization: OrganizationProfile,
  positionFit: PersonPositionResult,
  cultureFitScore: number,
  leadershipFit: { personStyle: string; orgExpectation: string; compatible: boolean; detail: string } | undefined,
  language: "ro" | "en",
): Promise<PersonPositionOrgResult["recommendation"]> {
  const positionScore = positionFit.compatibilityScore
  const decision = determineTripleDecision(positionScore, cultureFitScore, leadershipFit?.compatible ?? true)

  const systemPrompt = language === "ro"
    ? `Ești expert în evaluarea integrată persoană-post-organizație. Generează un paragraf concis (4-6 propoziții) care explică decizia finală. Include: fit cu postul, fit cultural, fit leadership (dacă relevant). Menționează prognoză retenție. Fii direct.`
    : `You are an expert in integrated person-position-organization assessment. Generate a concise paragraph (4-6 sentences) explaining the final decision. Include: position fit, cultural fit, leadership fit (if relevant). Mention retention prognosis. Be direct.`

  const userMessage = JSON.stringify({
    decision,
    positionFitScore: positionScore,
    cultureFitScore,
    leadershipFit,
    orgName: organization.orgName,
    positionTitle: position.title,
    serviceMode: organization.serviceMode,
    personMaturity: person.maturityLevel,
  })

  const cpuResult = await cpuCall({
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
    max_tokens: 600,
    agentRole: PIE_AGENT_ROLE,
    operationType: "integration-recommendation-org",
    skipObjectiveCheck: true,
    skipKBFirst: true,
    language,
  })

  const reasoning = cpuResult.degraded
    ? buildFallbackOrgReasoning(decision, positionScore, cultureFitScore, language)
    : cpuResult.text

  const onboardingNotes: string[] = []
  if (cultureFitScore < 65) onboardingNotes.push("Program onboarding cultural intensiv recomandat")
  if (leadershipFit && !leadershipFit.compatible) onboardingNotes.push("Mentorat leadership pe primele 3 luni")
  if (person.maturityLevel === "NEWCOMER" || person.maturityLevel === "EXPLORING") {
    onboardingNotes.push("Buddy system pentru primele 6 săptămâni")
  }

  const developmentPlan = positionFit.gapAnalysis.gaps
    .filter(g => g.developable && g.severity !== "ALINIAT")
    .sort((a, b) => a.delta - b.delta)
    .slice(0, 5) // top 5 priorități
    .map(g => `${g.dimension}: ${g.estimatedDevelopmentMonths ?? "?"} luni — ${g.interpretation}`)

  return {
    decision,
    reasoning,
    onboardingNotes: onboardingNotes.length > 0 ? onboardingNotes : undefined,
    developmentPlan: developmentPlan.length > 0 ? developmentPlan : undefined,
  }
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function scoreToCompatibilityLevel(score: number): "EXCELENT" | "BUN" | "ACCEPTABIL" | "MARGINAL" | "INADECVAT" {
  if (score >= COMPATIBILITY_LEVELS.EXCELENT) return "EXCELENT"
  if (score >= COMPATIBILITY_LEVELS.BUN) return "BUN"
  if (score >= COMPATIBILITY_LEVELS.ACCEPTABIL) return "ACCEPTABIL"
  if (score >= COMPATIBILITY_LEVELS.MARGINAL) return "MARGINAL"
  return "INADECVAT"
}

function determineDecision(
  compatibilityScore: number,
  gapAnalysis: GapAnalysis,
): PersonPositionResult["recommendation"]["decision"] {
  if (gapAnalysis.criticalGaps >= 2) return "NERECOMANDAT"
  if (compatibilityScore >= 80 && gapAnalysis.criticalGaps === 0) return "RECOMANDAT"
  if (compatibilityScore >= 60) return "RECOMANDAT_CU_DEZVOLTARE"
  if (compatibilityScore >= 45) return "RECOMANDAT_CU_REZERVE"
  return "NERECOMANDAT"
}

function determineTripleDecision(
  positionScore: number,
  cultureScore: number,
  leadershipCompatible: boolean,
): PersonPositionOrgResult["recommendation"]["decision"] {
  const integrated = positionScore * 0.5 + cultureScore * 0.3 + (leadershipCompatible ? 80 : 40) * 0.2
  if (integrated >= 75 && leadershipCompatible) return "RECOMANDAT"
  if (integrated >= 60) return "RECOMANDAT_CU_DEZVOLTARE"
  if (integrated >= 45) return "RECOMANDAT_CU_REZERVE"
  return "NERECOMANDAT"
}

function calculateCultureFitScore(culturalGaps: GapItem[], organization: OrganizationProfile): number {
  if (culturalGaps.length === 0) return 75 // Nu avem date suficiente, scor neutru-pozitiv

  const penaltyMap: Record<string, number> = {
    CRITIC: 30,
    SEMNIFICATIV: 20,
    MODERAT: 10,
    MINOR: 4,
    ALINIAT: 0,
  }
  const totalPenalty = culturalGaps.reduce((sum, g) => sum + penaltyMap[g.severity], 0)
  return Math.max(0, Math.min(100, 100 - totalPenalty))
}

function analyzeValueAlignment(
  person: PersonProfile,
  organization: OrganizationProfile,
): { alignedValues: string[]; conflictingValues: string[] } {
  const alignedValues: string[] = []
  const conflictingValues: string[] = []

  // Mapăm valori declarate ale organizației pe trăsături persoană
  const valueTraitMap: Record<string, { category: string; minScore: number }> = {
    "integritate": { category: "INTEGRITATE", minScore: 55 },
    "inovare": { category: "COGNITIV", minScore: 55 },
    "excelență": { category: "MOTIVATIONAL", minScore: 60 },
    "colaborare": { category: "SOCIAL", minScore: 50 },
    "respect": { category: "SOCIAL", minScore: 45 },
    "responsabilitate": { category: "INTEGRITATE", minScore: 50 },
    "performanță": { category: "MOTIVATIONAL", minScore: 55 },
    "leadership": { category: "LEADERSHIP", minScore: 55 },
    "dezvoltare": { category: "COGNITIV", minScore: 50 },
    "echitate": { category: "INTEGRITATE", minScore: 55 },
  }

  for (const value of organization.declaredValues) {
    const normalized = value.toLowerCase().trim()
    const mapping = valueTraitMap[normalized]
    if (!mapping) {
      alignedValues.push(value) // Nu putem evalua, presupunem aliniere
      continue
    }

    const relevantTraits = person.traits.filter(t => t.category === mapping.category)
    if (relevantTraits.length === 0) continue

    const avgScore = relevantTraits.reduce((s, t) => s + t.score, 0) / relevantTraits.length
    if (avgScore >= mapping.minScore) {
      alignedValues.push(value)
    } else {
      conflictingValues.push(value)
    }
  }

  return { alignedValues, conflictingValues }
}

function analyzeLeadershipFit(
  person: PersonProfile,
  organization: OrganizationProfile,
): { personStyle: string; orgExpectation: string; compatible: boolean; detail: string } {
  const leadershipTraits = person.traits.filter(t => t.category === "LEADERSHIP")
  const avgLeadership = leadershipTraits.length > 0
    ? leadershipTraits.reduce((s, t) => s + t.score, 0) / leadershipTraits.length
    : 50

  // Determinăm stilul persoanei din profil
  let personStyle: string
  if (avgLeadership >= 65) personStyle = "Directiv-Transformațional"
  else if (avgLeadership >= 55) personStyle = "Participativ"
  else if (avgLeadership >= 45) personStyle = "Colaborativ"
  else personStyle = "Executant"

  const orgExpectation = organization.leadershipStyle ?? "Nedefinit"

  // Compatibilitate simplificată (în producție, ar fi mai nuanțat)
  const compatible = avgLeadership >= 50 || !organization.leadershipStyle

  const detail = compatible
    ? `Stil ${personStyle} compatibil cu așteptarea organizațională (${orgExpectation}). Scor leadership: T=${Math.round(avgLeadership)}.`
    : `Stil ${personStyle} diferit de așteptarea organizațională (${orgExpectation}). Decalaj de adaptat prin mentorat. Scor leadership: T=${Math.round(avgLeadership)}.`

  return { personStyle, orgExpectation, compatible, detail }
}

// ═══════════════════════════════════════════════════════════════
// ROLE-SPECIFIC RECOMMENDATIONS
// ═══════════════════════════════════════════════════════════════

function buildPersonRecommendations(result: PersonPositionResult | PersonPositionOrgResult): string[] {
  const recs: string[] = []
  const decision = result.recommendation.decision

  if (decision === "RECOMANDAT") {
    recs.push("Profilul dumneavoastră se potrivește bine cu cerințele postului.")
  } else if (decision === "RECOMANDAT_CU_DEZVOLTARE") {
    recs.push("Există potrivire, cu oportunități de dezvoltare pe anumite dimensiuni.")
    if (result.recommendation.developmentPlan) {
      recs.push("Consultați planul de dezvoltare pentru detalii.")
    }
  } else if (decision === "RECOMANDAT_CU_REZERVE") {
    recs.push("Potrivirea necesită atenție pe câteva dimensiuni importante.")
  } else {
    recs.push("Postul nu se aliniază cu profilul dumneavoastră actual. Explorați alte opțiuni.")
  }
  return recs
}

function buildHRRecommendations(result: PersonPositionResult | PersonPositionOrgResult): string[] {
  const recs: string[] = []
  const gapAnalysis = result.integrationType === "PERSON_POSITION"
    ? (result as PersonPositionResult).gapAnalysis
    : (result as PersonPositionOrgResult).positionFit.gapAnalysis

  if (gapAnalysis.criticalGaps > 0) {
    recs.push(`Atenție: ${gapAnalysis.criticalGaps} gap-uri critice/semnificative identificate. Evaluare risc obligatorie.`)
  }
  if (gapAnalysis.strengths > 0) {
    recs.push(`${gapAnalysis.strengths} puncte forte peste cerințe — potențial de creștere pe post.`)
  }
  recs.push(`Scor overall fit: ${gapAnalysis.overallFitScore}/100.`)

  if (result.integrationType === "PERSON_POSITION_ORG") {
    const orgResult = result as PersonPositionOrgResult
    recs.push(`Fit cultural: ${orgResult.cultureFit.score}/100 (${orgResult.cultureFit.level}).`)
    recs.push(`Prognoză retenție: ~${orgResult.retentionPrognosis.estimatedMonths} luni.`)
  }
  return recs
}

function buildSupervisorRecommendations(result: PersonPositionResult | PersonPositionOrgResult): string[] {
  const recs: string[] = []
  const decision = result.recommendation.decision

  if (decision === "RECOMANDAT" || decision === "RECOMANDAT_CU_DEZVOLTARE") {
    recs.push("Candidatul poate performa pe post. Monitorizare standard.")
    if (result.recommendation.developmentPlan && result.recommendation.developmentPlan.length > 0) {
      recs.push(`Plan dezvoltare: ${result.recommendation.developmentPlan.length} dimensiuni de susținut.`)
    }
  } else {
    recs.push("Candidatul prezintă riscuri semnificative pe post. Discuție cu HR recomandată.")
  }
  return recs
}

function buildB2CCounselorRecommendations(result: PersonPositionResult | PersonPositionOrgResult): string[] {
  const recs: string[] = []
  const gapAnalysis = result.integrationType === "PERSON_POSITION"
    ? (result as PersonPositionResult).gapAnalysis
    : (result as PersonPositionOrgResult).positionFit.gapAnalysis

  const developableGaps = gapAnalysis.gaps.filter(g => g.developable && g.severity !== "ALINIAT")
  if (developableGaps.length > 0) {
    recs.push(`${developableGaps.length} arii de dezvoltare identificate. Construiți traseu personalizat.`)
    const topGap = developableGaps.sort((a, b) => a.delta - b.delta)[0]
    if (topGap) {
      recs.push(`Prioritate: ${topGap.dimension} (delta ${topGap.delta}, estimat ${topGap.estimatedDevelopmentMonths ?? "?"} luni).`)
    }
  }
  recs.push("Ghidați persoana spre înțelegerea gap-urilor ca oportunități, nu deficiențe.")
  return recs
}

// ═══════════════════════════════════════════════════════════════
// FALLBACK REASONING (când AI e indisponibil)
// ═══════════════════════════════════════════════════════════════

function buildFallbackReasoning(
  decision: string,
  gapAnalysis: GapAnalysis,
  positionTitle: string,
  language: "ro" | "en",
): string {
  if (language === "en") {
    return `Assessment for position "${positionTitle}": ${decision}. Overall fit score: ${gapAnalysis.overallFitScore}/100. Critical gaps: ${gapAnalysis.criticalGaps}. Strengths: ${gapAnalysis.strengths}. Total dimensions evaluated: ${gapAnalysis.totalGaps}.`
  }
  return `Evaluare pentru postul „${positionTitle}": ${decision}. Scor compatibilitate: ${gapAnalysis.overallFitScore}/100. Gap-uri critice: ${gapAnalysis.criticalGaps}. Puncte forte: ${gapAnalysis.strengths}. Total dimensiuni evaluate: ${gapAnalysis.totalGaps}.`
}

function buildFallbackOrgReasoning(
  decision: string,
  positionScore: number,
  cultureScore: number,
  language: "ro" | "en",
): string {
  if (language === "en") {
    return `Integrated assessment: ${decision}. Position fit: ${positionScore}/100. Cultural fit: ${cultureScore}/100. Combined weighted score determines final recommendation.`
  }
  return `Evaluare integrată: ${decision}. Fit post: ${positionScore}/100. Fit cultural: ${cultureScore}/100. Scorul ponderat combinat determină recomandarea finală.`
}
