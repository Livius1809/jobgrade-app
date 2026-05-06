/**
 * learning-hooks.ts — Hook-uri de ingestie automată în pâlnia de învățare
 *
 * PRINCIPIU: Orice proces sau agent care produce cunoaștere validată
 * alimentează automat pâlnia. Nimic nu se pierde.
 *
 * 8 surse conectate:
 * 1. Obiectiv îndeplinit + validat de manager
 * 2. Prestație cu feedback de la client
 * 3. Reclamație rezolvată
 * 4. Feedback procesat și soluționat
 * 5. Evaluare JE completată
 * 6. Raport generat
 * 7. Interacțiune SOA pre-sales
 * 8. Onboarding client complet
 *
 * Fiecare hook:
 * - Primește datele specifice sursei
 * - Le transformă în AgentEvent
 * - Le trimite la learningFunnel()
 * - Returnează rezultatul (cunoștințe create/actualizate)
 *
 * ARHITECTURA: Hook-urile trăiesc în CPU (BUILD layer).
 * Sunt apelate de orice business (PRODUCTION) când produce cunoaștere validată.
 */

import { learningFunnel, type AgentEvent } from "./learning-funnel"

// ── Tipuri comune ──────────────────────────────────────────────────────────

interface HookResult {
  ingested: boolean
  knowledgeCreated: number
  knowledgeUpdated: number
  antiPatternsFound: number
  error?: string
}

async function safeIngest(event: AgentEvent): Promise<HookResult> {
  try {
    const result = await learningFunnel(event)
    return {
      ingested: true,
      ...result,
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error(`[LEARNING-HOOK] Ingestie eșuată pentru ${event.agentRole}/${event.type}: ${msg}`)
    return {
      ingested: false,
      knowledgeCreated: 0,
      knowledgeUpdated: 0,
      antiPatternsFound: 0,
      error: msg,
    }
  }
}

// ═══ HOOK 1: Obiectiv îndeplinit + validat ═══

/**
 * Apelat când un obiectiv organizațional este marcat completat
 * și validat de managerul responsabil.
 */
export async function onObjectiveCompleted(params: {
  objectiveId: string
  objectiveTitle: string
  ownerRoles: string[]
  contributorRoles: string[]
  result: string
  validatedBy: string
  durationDays: number
  businessId?: string
}): Promise<HookResult> {
  const primaryRole = params.ownerRoles[0] ?? "COG"
  return safeIngest({
    agentRole: primaryRole,
    type: "DECISION",
    input: `Obiectiv: ${params.objectiveTitle}`,
    output: `Rezultat: ${params.result}. Validat de ${params.validatedBy}. Durată: ${params.durationDays} zile. Contributori: ${params.contributorRoles.join(", ")}`,
    success: true,
    metadata: {
      source: "objective_completed",
      objectiveId: params.objectiveId,
      allRoles: [...params.ownerRoles, ...params.contributorRoles],
      businessId: params.businessId,
    },
  })
}

// ═══ HOOK 2: Prestație cu feedback client ═══

/**
 * Apelat după orice sesiune B2B sau B2C în care clientul oferă feedback
 * (explicit sau implicit prin comportament).
 */
export async function onClientFeedback(params: {
  sessionId: string
  agentRole: string
  feedbackType: "explicit_rating" | "implicit_behavior" | "nps" | "comment"
  feedbackValue: string
  sentiment: "positive" | "neutral" | "negative"
  sessionContext: string
  businessId?: string
}): Promise<HookResult> {
  return safeIngest({
    agentRole: params.agentRole,
    type: "FEEDBACK",
    input: `Sesiune ${params.sessionId}: ${params.sessionContext}`,
    output: `Feedback ${params.feedbackType} (${params.sentiment}): ${params.feedbackValue}`,
    success: params.sentiment !== "negative",
    metadata: {
      source: "client_feedback",
      sessionId: params.sessionId,
      feedbackType: params.feedbackType,
      sentiment: params.sentiment,
      businessId: params.businessId,
    },
  })
}

// ═══ HOOK 3: Reclamație rezolvată ═══

/**
 * Apelat când un ticket de suport (reclamație) este rezolvat.
 * Cunoașterea: ce a mers prost + cum s-a rezolvat = pattern de prevenție.
 */
export async function onComplaintResolved(params: {
  ticketId: string
  category: string
  originalComplaint: string
  resolution: string
  resolvedBy: string
  resolutionTimeHours: number
  preventable: boolean
  businessId?: string
}): Promise<HookResult> {
  return safeIngest({
    agentRole: params.resolvedBy,
    type: "TASK",
    input: `Reclamație [${params.category}]: ${params.originalComplaint}`,
    output: `Rezolvare (${params.resolutionTimeHours}h): ${params.resolution}. Prevenibilă: ${params.preventable ? "da" : "nu"}.`,
    success: true,
    metadata: {
      source: "complaint_resolved",
      ticketId: params.ticketId,
      category: params.category,
      preventable: params.preventable,
      businessId: params.businessId,
    },
  })
}

// ═══ HOOK 4: Feedback procesat și soluționat ═══

/**
 * Apelat când feedback intern (de la agenți sau Owner) este procesat
 * și rezultă într-o acțiune sau decizie.
 */
export async function onFeedbackProcessed(params: {
  feedbackId: string
  sourceRole: string
  targetRole: string
  feedbackContent: string
  actionTaken: string
  outcome: "improvement" | "no_change" | "rejected_with_reason"
  reason?: string
  businessId?: string
}): Promise<HookResult> {
  return safeIngest({
    agentRole: params.targetRole,
    type: "FEEDBACK",
    input: `Feedback de la ${params.sourceRole}: ${params.feedbackContent}`,
    output: `Acțiune: ${params.actionTaken}. Rezultat: ${params.outcome}${params.reason ? `. Motiv: ${params.reason}` : ""}.`,
    success: params.outcome === "improvement",
    metadata: {
      source: "feedback_processed",
      feedbackId: params.feedbackId,
      sourceRole: params.sourceRole,
      outcome: params.outcome,
      businessId: params.businessId,
    },
  })
}

// ═══ HOOK 5: Evaluare JE completată ═══

/**
 * Apelat când o sesiune de evaluare Job Evaluation este finalizată
 * (scoruri calculate, grade atribuite, raport generat).
 */
export async function onEvaluationCompleted(params: {
  sessionId: string
  tenantId: string
  positionsEvaluated: number
  gradesAssigned: number
  evaluationMode: "AI" | "COMITET" | "MIXT"
  consensusReached: boolean
  adjustmentsOwner: number
  keyInsights: string
  businessId?: string
}): Promise<HookResult> {
  return safeIngest({
    agentRole: "DOA",
    type: "TASK",
    input: `Sesiune JE ${params.sessionId}: ${params.positionsEvaluated} poziții, mod ${params.evaluationMode}`,
    output: `${params.gradesAssigned} grade atribuite. Consens: ${params.consensusReached ? "da" : "nu"}. Ajustări Owner: ${params.adjustmentsOwner}. Insight-uri: ${params.keyInsights}`,
    success: params.consensusReached,
    metadata: {
      source: "evaluation_completed",
      sessionId: params.sessionId,
      tenantId: params.tenantId,
      evaluationMode: params.evaluationMode,
      positionsEvaluated: params.positionsEvaluated,
      businessId: params.businessId,
    },
  })
}

// ═══ HOOK 6: Raport generat ═══

/**
 * Apelat când orice raport este generat (pay gap, 3C, master report, etc.).
 * Meta-learning: ce a învățat organismul din procesul de generare.
 */
export async function onReportGenerated(params: {
  reportType: string
  tenantId: string
  agentRole: string
  reportSummary: string
  dataPointsUsed: number
  anomaliesDetected: number
  recommendationsGenerated: number
  businessId?: string
}): Promise<HookResult> {
  return safeIngest({
    agentRole: params.agentRole,
    type: "TASK",
    input: `Raport ${params.reportType} pentru tenant ${params.tenantId}`,
    output: `${params.dataPointsUsed} date procesate, ${params.anomaliesDetected} anomalii, ${params.recommendationsGenerated} recomandări. Sumar: ${params.reportSummary}`,
    success: true,
    metadata: {
      source: "report_generated",
      reportType: params.reportType,
      tenantId: params.tenantId,
      anomaliesDetected: params.anomaliesDetected,
      businessId: params.businessId,
    },
  })
}

// ═══ HOOK 7: Interacțiune SOA pre-sales ═══

/**
 * Apelat după fiecare conversație SOA cu un potential client.
 * Cunoaștere: ce întreabă piața, ce obiecții are, ce convertește.
 */
export async function onSOAInteraction(params: {
  conversationId: string
  leadQualified: boolean
  questionsAsked: string[]
  objectionsRaised: string[]
  interestAreas: string[] // C1/C2/C3/C4
  outcome: "demo_scheduled" | "info_sent" | "not_interested" | "follow_up" | "converted"
  businessId?: string
}): Promise<HookResult> {
  return safeIngest({
    agentRole: "SOA",
    type: "CONVERSATION",
    input: `Lead ${params.leadQualified ? "calificat" : "necalificat"}. Întrebări: ${params.questionsAsked.join("; ")}. Obiecții: ${params.objectionsRaised.join("; ")}`,
    output: `Interes: ${params.interestAreas.join(", ")}. Rezultat: ${params.outcome}.`,
    success: params.outcome !== "not_interested",
    metadata: {
      source: "soa_interaction",
      conversationId: params.conversationId,
      leadQualified: params.leadQualified,
      outcome: params.outcome,
      interestAreas: params.interestAreas,
      businessId: params.businessId,
    },
  })
}

// ═══ HOOK 8: Onboarding client complet ═══

/**
 * Apelat când un client B2B finalizează procesul de onboarding
 * (companie creată, posturi definite, prima sesiune lansată).
 */
export async function onOnboardingComplete(params: {
  tenantId: string
  companyName: string
  positionsCount: number
  employeesCount: number
  servicesActivated: string[] // C1, C2, etc.
  onboardingDurationDays: number
  frictionPoints: string[] // ce a fost dificil
  businessId?: string
}): Promise<HookResult> {
  return safeIngest({
    agentRole: "COCSA",
    type: "TASK",
    input: `Onboarding ${params.companyName}: ${params.positionsCount} poziții, ${params.employeesCount} angajați`,
    output: `Servicii activate: ${params.servicesActivated.join(", ")}. Durată: ${params.onboardingDurationDays} zile. Fricțiuni: ${params.frictionPoints.length > 0 ? params.frictionPoints.join("; ") : "niciuna"}.`,
    success: true,
    metadata: {
      source: "onboarding_complete",
      tenantId: params.tenantId,
      servicesActivated: params.servicesActivated,
      frictionPoints: params.frictionPoints,
      onboardingDurationDays: params.onboardingDurationDays,
      businessId: params.businessId,
    },
  })
}

// ═══ UTILITAR: Ingestie batch ═══

/**
 * Ingestează mai multe evenimente simultan (pentru batch processing).
 */
export async function ingestBatch(events: AgentEvent[]): Promise<{
  total: number
  ingested: number
  failed: number
}> {
  let ingested = 0
  let failed = 0

  for (const event of events) {
    const result = await safeIngest(event)
    if (result.ingested) ingested++
    else failed++
  }

  return { total: events.length, ingested, failed }
}
