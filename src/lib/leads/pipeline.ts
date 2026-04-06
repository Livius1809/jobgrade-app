/**
 * Lead Pipeline — funcții pure pentru state machine sales.
 *
 * Livrat: 06.04.2026, Pas 2 "Primul Client".
 *
 * Zero I/O — testabil direct.
 */

// ── Tipuri ────────────────────────────────────────────────────────────────────

export type LeadStage =
  | "NEW"
  | "QUALIFIED"
  | "DEMO_SCHEDULED"
  | "DEMO_DONE"
  | "PROPOSAL"
  | "NEGOTIATION"
  | "CLOSED_WON"
  | "ONBOARDING"
  | "ACTIVE"
  | "CLOSED_LOST"

// ── Tranziții valide ──────────────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<LeadStage, LeadStage[]> = {
  NEW: ["QUALIFIED", "CLOSED_LOST"],
  QUALIFIED: ["DEMO_SCHEDULED", "CLOSED_LOST"],
  DEMO_SCHEDULED: ["DEMO_DONE", "CLOSED_LOST"],
  DEMO_DONE: ["PROPOSAL", "CLOSED_LOST"],
  PROPOSAL: ["NEGOTIATION", "CLOSED_WON", "CLOSED_LOST"],
  NEGOTIATION: ["CLOSED_WON", "CLOSED_LOST"],
  CLOSED_WON: ["ONBOARDING"],
  ONBOARDING: ["ACTIVE"],
  ACTIVE: [],
  CLOSED_LOST: [],
}

export function validateTransition(from: LeadStage, to: LeadStage): { valid: boolean; reason?: string } {
  const allowed = VALID_TRANSITIONS[from]
  if (!allowed || allowed.length === 0) {
    return { valid: false, reason: `Stage ${from} este terminal — nu permite tranziții.` }
  }
  if (!allowed.includes(to)) {
    return { valid: false, reason: `Tranziție invalidă: ${from} → ${to}. Permise: ${allowed.join(", ")}.` }
  }
  return { valid: true }
}

// ── BANT Score ─────────────────────────────────────────────────────────────────

export function calculateBANTScore(lead: {
  bantBudget?: boolean | null
  bantAuthority?: boolean | null
  bantNeed?: boolean | null
  bantTimeline?: boolean | null
}): number {
  let score = 0
  if (lead.bantBudget) score += 25
  if (lead.bantAuthority) score += 25
  if (lead.bantNeed) score += 25
  if (lead.bantTimeline) score += 25
  return score
}

// ── Transition requirements ───────────────────────────────────────────────────

export function checkTransitionRequirements(
  from: LeadStage,
  to: LeadStage,
  lead: { score: number; demoAt?: Date | string | null; proposalSentAt?: Date | string | null; lostReason?: string | null },
): { met: boolean; missing?: string } {
  if (to === "QUALIFIED" && lead.score < 50) {
    return { met: false, missing: `BANT score ${lead.score} < 50. Trebuie cel puțin 2 din 4 criterii.` }
  }
  if (to === "DEMO_SCHEDULED" && !lead.demoAt) {
    return { met: false, missing: "Lipsește data demo-ului (demoAt)." }
  }
  if (to === "CLOSED_LOST" && !lead.lostReason) {
    return { met: false, missing: "Lipsește motivul pierderii (lostReason)." }
  }
  return { met: true }
}

// ── Next action ───────────────────────────────────────────────────────────────

export function getNextAction(stage: LeadStage): string {
  const actions: Record<LeadStage, string> = {
    NEW: "Califică lead-ul: verifică BANT (Budget, Authority, Need, Timeline).",
    QUALIFIED: "Programează demo de 20 min cu decizia factorului relevant.",
    DEMO_SCHEDULED: "Pregătește demo-ul personalizat pe industria clientului.",
    DEMO_DONE: "Trimite oferta comercială în max 24h.",
    PROPOSAL: "Urmărește răspunsul. Follow-up la 3 zile dacă nu răspunde.",
    NEGOTIATION: "Negociază termenii. Max 20% discount fără escalare la CCO.",
    CLOSED_WON: "Inițiază onboarding: creare cont, training admin, pilot evaluare.",
    ONBOARDING: "Urmărește planul de 14 zile. Check-in la Day 7.",
    ACTIVE: "Handoff la CSSA. Monitorizează satisfacția.",
    CLOSED_LOST: "Înregistrează motivul. Analizează pentru îmbunătățire proces.",
  }
  return actions[stage]
}

// ── Follow-up logic ───────────────────────────────────────────────────────────

export function shouldAutoFollowUp(lead: {
  stage: LeadStage
  emailSequenceStep: number
  nextFollowUpAt?: Date | string | null
  lastEmailSentAt?: Date | string | null
}): { should: boolean; reason?: string } {
  // Nu follow-up pe stages terminale sau post-vânzare
  const noFollowUpStages: LeadStage[] = ["CLOSED_WON", "ONBOARDING", "ACTIVE", "CLOSED_LOST"]
  if (noFollowUpStages.includes(lead.stage)) {
    return { should: false, reason: "Stage nu necesită follow-up automat." }
  }

  // Max 3 email-uri în secvență (outreach + 2 follow-ups)
  if (lead.emailSequenceStep >= 3) {
    return { should: false, reason: "Secvența de 3 email-uri completă. Evaluează manual." }
  }

  if (!lead.nextFollowUpAt) {
    return { should: false, reason: "Nu are follow-up programat." }
  }

  const followUpDate = new Date(lead.nextFollowUpAt)
  if (followUpDate > new Date()) {
    return { should: false, reason: `Follow-up programat la ${followUpDate.toISOString()}, încă nu e timpul.` }
  }

  return { should: true }
}

// ── Follow-up intervals ───────────────────────────────────────────────────────

/** Returnează nr de zile până la următorul follow-up, pe baza step-ului curent */
export function getFollowUpIntervalDays(currentStep: number): number {
  // Step 1 (outreach trimis) → follow-up 1 la +3 zile
  // Step 2 (follow-up 1 trimis) → follow-up 2 la +5 zile
  // Step 3+ → nu mai trimitem
  if (currentStep <= 0) return 3
  if (currentStep === 1) return 3
  if (currentStep === 2) return 5
  return 0
}
