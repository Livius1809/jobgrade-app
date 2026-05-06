/**
 * adaptive-spiral.ts — Adaptive Communication Runtime (Spiral Model)
 *
 * PRINCIPIU: Fiecare tur de conversație calibrează complexitatea limbajului,
 * tonul și formalitatea pe baza feedback-ului implicit al utilizatorului.
 *
 * Spirala: cu fiecare iterație, comunicarea se adaptează:
 *   - Dacă utilizatorul răspunde cu mesaje scurte → simplifică
 *   - Dacă pune întrebări tehnice → crește complexitatea
 *   - Dacă arată frustrare → coboară formalitatea, crește empatia
 *   - Dacă repetă aceeași întrebare → recunoaște eșecul anterior
 *
 * Integrare:
 *   - adaptive-parameters.ts: parametri globali de calibrare
 *   - cultural-calibration-ro.ts: specific cultural România
 *   - sentiment-detector.ts: detecție emoții fast-path
 *   - CPU Gateway: pentru escalare (cpuCall)
 *
 * Frustrare "vreau un om":
 *   - Detectează semnale de frustrare crescândă
 *   - Protocol: acknowledge → offer → confirm → ticket
 *   - NU insistă pe AI dacă utilizatorul vrea om
 */

import { analyzeSentiment, type SentimentAnalysis } from "@/lib/agents/sentiment-detector"
import { ROMANIAN_PSYCHOLOGY } from "@/lib/agents/cultural-calibration-ro"
import { cpuCall } from "@/lib/cpu/gateway"

// ── Types ──────────────────────────────────────────────────────────────────

export interface SpiralState {
  sessionId: string
  userId: string
  messageCount: number
  sentimentTrajectory: SentimentAnalysis[]
  frustrationScore: number // 0-100
  currentCalibration: CommunicationCalibration
  escalationRequested: boolean
  escalationConfirmed: boolean
  lastActivity: Date
}

export interface CommunicationCalibration {
  /** 1=copil, 5=expert tehnic */
  complexityLevel: number
  /** 1=foarte formal, 5=colocvial */
  formalityLevel: number
  /** 1=neutru/distant, 5=foarte empatic */
  empathyLevel: number
  /** 1=verbose, 5=telegrafic */
  concisenessLevel: number
  /** Limba dominantă detectată */
  language: "ro" | "en"
  /** Stil preferat detectat */
  preferredStyle: "storytelling" | "bullet-points" | "conversational" | "technical"
}

export interface EscalationTicket {
  sessionId: string
  userId: string
  reason: string
  conversationSummary: string
  frustrationScore: number
  createdAt: Date
  priority: "NORMAL" | "HIGH"
}

export type SpiralMiddlewareResult = {
  /** Calibrarea curentă pe care agentul trebuie să o aplice */
  calibration: CommunicationCalibration
  /** Dacă true, agentul NU trebuie să răspundă — intervine escalarea */
  blocked: boolean
  /** Mesaj de escalare (dacă blocked=true) */
  escalationMessage?: string
  /** Instrucțiuni suplimentare pentru prompt */
  promptInjection: string
}

// ── Constants ──────────────────────────────────────────────────────────────

const FRUSTRATION_THRESHOLD_ACKNOWLEDGE = 40
const FRUSTRATION_THRESHOLD_OFFER = 60
const FRUSTRATION_THRESHOLD_BLOCK = 80

/** Fraze care indică direct dorința de a vorbi cu un om */
const HUMAN_REQUEST_PATTERNS = [
  /vreau\s+(un\s+)?om/i,
  /vreau\s+să\s+vorbesc\s+cu\s+(un\s+)?(om|cineva|o\s+persoană)/i,
  /lasă-mă/i,
  /lasa-ma/i,
  /nu\s+înțelegi/i,
  /nu\s+intelegi/i,
  /nu\s+mă\s+ajut(ă|i|a)/i,
  /vorbesc\s+cu\s+(un\s+)?om/i,
  /vreau\s+suport\s+uman/i,
  /operator\s+uman/i,
  /want\s+a\s+human/i,
  /speak\s+to\s+(a\s+)?(human|person|someone)/i,
  /talk\s+to\s+(a\s+)?(real\s+)?(person|human)/i,
]

/** Fraze de neîncredere sau rezistență repetitivă */
const DISTRUST_PATTERNS = [
  /nu\s+ai\s+înțeles\s+nimic/i,
  /tot\s+greșit/i,
  /iar\s+la\s+fel/i,
  /de\s+câte\s+ori\s+trebuie\s+să/i,
  /repet\s+pentru\s+a\s+\d+-a\s+oară/i,
  /ești\s+(un\s+)?robot/i,
  /nu\s+ești\s+capabil/i,
  /ridicol/i,
  /absurd/i,
  /prostii/i,
  /inutil/i,
]

/** Capitalizare excesivă (indicator de frustrare) */
const CAPS_RATIO_THRESHOLD = 0.5

/** Punctuație repetitivă (indicator de frustrare) */
const REPETITIVE_PUNCTUATION = /[!?]{3,}/

// ── Session Store (in-memory, per-instance) ────────────────────────────────

const sessionStore = new Map<string, SpiralState>()
const SESSION_TTL_MS = 60 * 60 * 1000 // 1 oră

function getOrCreateSession(sessionId: string, userId: string): SpiralState {
  const existing = sessionStore.get(sessionId)
  if (existing) {
    existing.lastActivity = new Date()
    return existing
  }

  const state: SpiralState = {
    sessionId,
    userId,
    messageCount: 0,
    sentimentTrajectory: [],
    frustrationScore: 0,
    currentCalibration: {
      complexityLevel: 3,
      formalityLevel: 3,
      empathyLevel: 3,
      concisenessLevel: 3,
      language: "ro",
      preferredStyle: "conversational",
    },
    escalationRequested: false,
    escalationConfirmed: false,
    lastActivity: new Date(),
  }

  sessionStore.set(sessionId, state)
  return state
}

/** Cleanup sesiuni expirate */
function cleanupExpiredSessions(): void {
  const now = Date.now()
  for (const [key, state] of sessionStore.entries()) {
    if (now - state.lastActivity.getTime() > SESSION_TTL_MS) {
      sessionStore.delete(key)
    }
  }
}

// Run cleanup every 10 minutes
if (typeof setInterval !== "undefined") {
  setInterval(cleanupExpiredSessions, 10 * 60 * 1000)
}

// ── Frustration Detection ──────────────────────────────────────────────────

function detectDirectHumanRequest(message: string): boolean {
  return HUMAN_REQUEST_PATTERNS.some(p => p.test(message))
}

function detectDistrust(message: string): boolean {
  return DISTRUST_PATTERNS.some(p => p.test(message))
}

function detectCapsRage(message: string): boolean {
  const letters = message.replace(/[^a-zA-ZăîâșțĂÎÂȘȚ]/g, "")
  if (letters.length < 10) return false
  const caps = letters.replace(/[^A-ZĂÎÂȘȚ]/g, "")
  return caps.length / letters.length > CAPS_RATIO_THRESHOLD
}

function detectRepetitivePunctuation(message: string): boolean {
  return REPETITIVE_PUNCTUATION.test(message)
}

function detectRepetitiveQuestion(state: SpiralState, message: string): boolean {
  if (state.messageCount < 3) return false
  // Simplistic: dacă mesajul e o întrebare și ultimele 2 analize arată CONFUSION
  const lastTwo = state.sentimentTrajectory.slice(-2)
  const isQuestion = /\?/.test(message)
  const recentConfusion = lastTwo.filter(s =>
    s.emotions.some(e => e.emotion === "CONFUSION")
  ).length
  return isQuestion && recentConfusion >= 2
}

function computeFrustrationDelta(message: string, state: SpiralState): number {
  let delta = 0

  if (detectDirectHumanRequest(message)) delta += 40
  if (detectDistrust(message)) delta += 20
  if (detectCapsRage(message)) delta += 15
  if (detectRepetitivePunctuation(message)) delta += 10
  if (detectRepetitiveQuestion(state, message)) delta += 15

  // Sentiment-based
  const sentiment = analyzeSentiment(message)
  if (sentiment.sentiment === "NEGATIVE") delta += 10
  if (sentiment.emotions.some(e => e.emotion === "FRUSTRATION" && e.strength > 0.6)) delta += 15
  if (sentiment.emotions.some(e => e.emotion === "ANGER")) delta += 20

  // Natural decay: fiecare mesaj calm reduce frustrarea
  if (delta === 0 && sentiment.sentiment !== "NEGATIVE") {
    delta = -5
  }

  return delta
}

// ── Spiral Calibration Engine ──────────────────────────────────────────────

function recalibrate(state: SpiralState, message: string): void {
  const cal = state.currentCalibration
  const sentiment = state.sentimentTrajectory[state.sentimentTrajectory.length - 1]
  if (!sentiment) return

  // Language detection
  const roSignals = /[ăîâșț]/i.test(message) || /\b(sunt|este|vreau|cum|unde|când|de ce)\b/i.test(message)
  const enSignals = /\b(the|is|are|want|how|where|when|why)\b/i.test(message)
  if (roSignals && !enSignals) cal.language = "ro"
  else if (enSignals && !roSignals) cal.language = "en"

  // Complexity: mesaje scurte = simplificăm, mesaje lungi tehnice = complicăm
  const wordCount = message.split(/\s+/).length
  if (wordCount < 5 && state.messageCount > 2) {
    cal.complexityLevel = Math.max(1, cal.complexityLevel - 0.3)
  } else if (wordCount > 30 && sentiment.communicationStyle === "TECHNICAL") {
    cal.complexityLevel = Math.min(5, cal.complexityLevel + 0.3)
  }

  // Formality: frustrare crescândă → scade formalitatea (devenim mai umani)
  if (state.frustrationScore > 30) {
    cal.formalityLevel = Math.max(1, cal.formalityLevel - 0.5)
  }

  // Empathy: crește proporțional cu frustrarea
  cal.empathyLevel = Math.min(5, 3 + (state.frustrationScore / 30))

  // Conciseness: mesaje scurte ale userului = vrea răspunsuri scurte
  if (wordCount < 8) {
    cal.concisenessLevel = Math.min(5, cal.concisenessLevel + 0.3)
  } else if (wordCount > 40) {
    cal.concisenessLevel = Math.max(1, cal.concisenessLevel - 0.2)
  }

  // Preferred style
  if (sentiment.communicationStyle === "TECHNICAL") {
    cal.preferredStyle = "technical"
  } else if (wordCount < 10 && state.messageCount > 3) {
    cal.preferredStyle = "bullet-points"
  } else if (state.frustrationScore > 20) {
    cal.preferredStyle = "conversational"
  }

  // Clamp all values to integer-ish ranges
  cal.complexityLevel = Math.round(cal.complexityLevel * 10) / 10
  cal.formalityLevel = Math.round(cal.formalityLevel * 10) / 10
  cal.empathyLevel = Math.round(cal.empathyLevel * 10) / 10
  cal.concisenessLevel = Math.round(cal.concisenessLevel * 10) / 10
}

// ── Escalation Messages ────────────────────────────────────────────────────

function getAcknowledgeMessage(language: "ro" | "en"): string {
  if (language === "ro") {
    return "Observ că experiența nu corespunde așteptărilor tale. " +
      "Îmi pare rău pentru inconvenient. Vreau să te ajut cât mai bine — " +
      "dacă preferi, te pot conecta cu un coleg din echipa noastră."
  }
  return "I notice this experience isn't meeting your expectations. " +
    "I'm sorry for the inconvenience. I want to help you as best I can — " +
    "if you prefer, I can connect you with a team member."
}

function getOfferMessage(language: "ro" | "en"): string {
  if (language === "ro") {
    return "Înțeleg. Dorești să vorbești cu un membru al echipei noastre? " +
      "Voi crea o solicitare și vei fi contactat în cel mai scurt timp. " +
      "Spune-mi 'da' sau 'vreau un om' și mă ocup imediat."
  }
  return "I understand. Would you like to speak with a team member? " +
    "I'll create a request and someone will contact you shortly. " +
    "Just say 'yes' or 'I want a human' and I'll arrange it right away."
}

function getConfirmationMessage(language: "ro" | "en"): string {
  if (language === "ro") {
    return "Am înregistrat solicitarea ta. Un coleg din echipă te va contacta " +
      "în cel mai scurt timp posibil. Mulțumesc pentru răbdare și îmi cer scuze " +
      "pentru experiența de până acum."
  }
  return "I've registered your request. A team member will contact you " +
    "as soon as possible. Thank you for your patience and I apologize " +
    "for the experience so far."
}

// ── Prompt Injection Builder ───────────────────────────────────────────────

function buildPromptInjection(state: SpiralState): string {
  const cal = state.currentCalibration
  const parts: string[] = []

  parts.push("═══ CALIBRARE ADAPTIVĂ SPIRALĂ ═══")
  parts.push(`Mesaj #${state.messageCount} | Frustrare: ${state.frustrationScore}/100`)
  parts.push(`Complexitate: ${cal.complexityLevel}/5 | Formalitate: ${cal.formalityLevel}/5`)
  parts.push(`Empatie: ${cal.empathyLevel}/5 | Concizie: ${cal.concisenessLevel}/5`)
  parts.push(`Stil preferat: ${cal.preferredStyle} | Limba: ${cal.language}`)

  // Directive contextuale
  if (cal.empathyLevel >= 4) {
    parts.push("DIRECTIVĂ: Începe cu recunoașterea emoției. Validează înainte de soluție.")
  }
  if (cal.complexityLevel <= 2) {
    parts.push("DIRECTIVĂ: Limbaj simplu, fraze scurte, zero jargon.")
  }
  if (cal.concisenessLevel >= 4) {
    parts.push("DIRECTIVĂ: Răspuns scurt. Max 3-4 fraze. Bullet points dacă e cazul.")
  }
  if (state.frustrationScore > 30) {
    parts.push("DIRECTIVĂ: NU repeta informații deja oferite. Oferă ceva NOU sau recunoaște limita.")
  }

  // Cultural calibration (RO-specific)
  if (cal.language === "ro") {
    if (state.frustrationScore > 20) {
      parts.push("CULTURAL RO: Validează dificultatea. Nu spune 'e simplu'. Arată înțelegere autentică.")
    }
    if (cal.formalityLevel <= 2) {
      parts.push("CULTURAL RO: Ton cald, direct, uman. Fără corporatisme.")
    }
  }

  return parts.join("\n")
}

// ── Main Middleware Function ───────────────────────────────────────────────

/**
 * Middleware principal — analizează mesajul și returnează calibrarea.
 *
 * Se apelează ÎNAINTE de a trimite mesajul la AI.
 * Rezultatul conține:
 *   - calibration: parametrii de comunicare pentru prompt
 *   - blocked: dacă true, NU lăsa AI-ul să răspundă (escalare activă)
 *   - escalationMessage: mesajul de escalare (dacă blocked)
 *   - promptInjection: text de injectat în system prompt
 */
export async function adaptiveSpiralMiddleware(
  sessionId: string,
  userId: string,
  message: string,
): Promise<SpiralMiddlewareResult> {
  const state = getOrCreateSession(sessionId, userId)
  state.messageCount++

  // Analiză sentiment
  const sentiment = analyzeSentiment(message)
  state.sentimentTrajectory.push(sentiment)
  // Păstrăm doar ultimele 20 de analize
  if (state.sentimentTrajectory.length > 20) {
    state.sentimentTrajectory = state.sentimentTrajectory.slice(-20)
  }

  // Calcul frustration score
  const frustrationDelta = computeFrustrationDelta(message, state)
  state.frustrationScore = Math.max(0, Math.min(100, state.frustrationScore + frustrationDelta))

  // Direct human request — skip gradual escalation
  const directRequest = detectDirectHumanRequest(message)
  if (directRequest && !state.escalationConfirmed) {
    state.escalationRequested = true
  }

  // Dacă escalarea a fost deja confirmată (userul a zis da anterior)
  if (state.escalationRequested && !state.escalationConfirmed) {
    // Verificăm dacă mesajul curent e confirmare
    const isConfirmation = /^(da|yes|ok|sigur|sure|confirm|vreau)/i.test(message.trim())
    if (isConfirmation || directRequest) {
      state.escalationConfirmed = true
      // Creare ticket
      await createEscalationTicket(state, message)
      return {
        calibration: state.currentCalibration,
        blocked: true,
        escalationMessage: getConfirmationMessage(state.currentCalibration.language),
        promptInjection: "",
      }
    }
  }

  // Recalibrare spirala
  recalibrate(state, message)

  // Frustration thresholds
  if (state.frustrationScore >= FRUSTRATION_THRESHOLD_BLOCK && state.escalationRequested) {
    state.escalationConfirmed = true
    await createEscalationTicket(state, message)
    return {
      calibration: state.currentCalibration,
      blocked: true,
      escalationMessage: getConfirmationMessage(state.currentCalibration.language),
      promptInjection: "",
    }
  }

  if (state.frustrationScore >= FRUSTRATION_THRESHOLD_OFFER || state.escalationRequested) {
    state.escalationRequested = true
    return {
      calibration: state.currentCalibration,
      blocked: true,
      escalationMessage: getOfferMessage(state.currentCalibration.language),
      promptInjection: "",
    }
  }

  if (state.frustrationScore >= FRUSTRATION_THRESHOLD_ACKNOWLEDGE) {
    return {
      calibration: state.currentCalibration,
      blocked: false,
      promptInjection: buildPromptInjection(state) +
        "\nATENȚIE: Frustrare crescândă. Următorul mesaj TREBUIE să recunoască emoția.",
    }
  }

  // Normal flow
  return {
    calibration: state.currentCalibration,
    blocked: false,
    promptInjection: buildPromptInjection(state),
  }
}

// ── Escalation Ticket Creation ─────────────────────────────────────────────

async function createEscalationTicket(state: SpiralState, lastMessage: string): Promise<void> {
  const ticket: EscalationTicket = {
    sessionId: state.sessionId,
    userId: state.userId,
    reason: state.frustrationScore >= FRUSTRATION_THRESHOLD_BLOCK
      ? "Frustrare ridicată + confirmare escalare"
      : "Solicitare directă om",
    conversationSummary: `Mesaje: ${state.messageCount}, Frustrare finală: ${state.frustrationScore}/100, ` +
      `Ultimul mesaj: "${lastMessage.slice(0, 200)}"`,
    frustrationScore: state.frustrationScore,
    createdAt: new Date(),
    priority: state.frustrationScore >= 70 ? "HIGH" : "NORMAL",
  }

  try {
    const { prisma } = await import("@/lib/prisma")
    await prisma.agentTask.create({
      data: {
        title: `[ESCALARE] Sesiune ${state.sessionId.slice(0, 8)} — utilizator solicită om`,
        description: JSON.stringify(ticket, null, 2),
        status: "ASSIGNED",
        priority: ticket.priority === "HIGH" ? "CRITICAL" : "HIGH",
        assignedTo: "SUPPORT_COORDINATOR",
        assignedBy: "ADAPTIVE_SPIRAL",
        businessId: "default",
        taskType: "INVESTIGATION",
        tags: ["escalation", "human-request", "b2c", `session:${state.sessionId}`],
      },
    })
    console.log(`[SPIRAL] Escalation ticket created for session ${state.sessionId}`)
  } catch (error) {
    console.error(`[SPIRAL] Failed to create escalation ticket:`, error)
  }
}

// ── Utility Exports ────────────────────────────────────────────────────────

/**
 * Obține starea curentă a unei sesiuni (pentru debugging/dashboard).
 */
export function getSessionState(sessionId: string): SpiralState | null {
  return sessionStore.get(sessionId) ?? null
}

/**
 * Resetează manual o sesiune (ex: după escalare rezolvată).
 */
export function resetSession(sessionId: string): void {
  sessionStore.delete(sessionId)
}

/**
 * Obține toate sesiunile active cu frustrare > threshold (pentru monitoring).
 */
export function getHighFrustrationSessions(threshold = 40): SpiralState[] {
  const results: SpiralState[] = []
  for (const state of sessionStore.values()) {
    if (state.frustrationScore >= threshold) {
      results.push(state)
    }
  }
  return results.sort((a, b) => b.frustrationScore - a.frustrationScore)
}

/**
 * Forțează calibrarea manuală (pentru override admin).
 */
export function overrideCalibration(
  sessionId: string,
  partial: Partial<CommunicationCalibration>,
): void {
  const state = sessionStore.get(sessionId)
  if (state) {
    Object.assign(state.currentCalibration, partial)
  }
}
