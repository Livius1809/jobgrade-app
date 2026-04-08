/**
 * Escalation Detector — Sliding Window (VUL-005)
 *
 * Detectează tentative de jailbreak gradual (frog-in-boiling-water).
 * Analizează ultimele N mesaje pentru acumulare de flag-uri și pattern-uri
 * de escaladare subtilă spre zone interzise.
 *
 * In-memory per proces. Se resetează la restart (acceptabil — atacul
 * trebuie reluat de la zero).
 */

// ── Types ─────────────────────────────────────────────────────────────────────

interface EscalationEntry {
  timestamp: number
  flagged: boolean
  categories: string[]
}

interface EscalationState {
  entries: EscalationEntry[]
  escalationScore: number
}

export interface EscalationCheckResult {
  blocked: boolean
  score: number
  reason?: string
}

// ── Config ────────────────────────────────────────────────────────────────────

const WINDOW_SIZE = 20         // ultimele N mesaje analizate
const WINDOW_TTL_MS = 30 * 60 * 1000  // 30 min — mesajele mai vechi se șterg
const SCORE_THRESHOLD = 5      // scor la care se blochează
const CLEANUP_INTERVAL = 5 * 60 * 1000 // 5 min cleanup stale users

// Scoring per categorie
const CATEGORY_SCORES: Record<string, number> = {
  INSTRUCTION_OVERRIDE: 3,
  ROLE_HIJACK: 3,
  PROMPT_EXTRACTION: 2,
  DELIMITER_INJECTION: 2,
  JAILBREAK: 3,
  DATA_EXFIL: 2,
  ENCODED_INJECTION: 1,
  CODE_INJECTION: 2,
  METHODOLOGY_EXTRACTION: 1,
}

// Pattern-uri de escaladare subtilă (nu sunt blocate individual,
// dar acumularea lor indică intent de explorare a limitelor)
const SUBTLE_ESCALATION_PATTERNS: Array<{ pattern: RegExp; score: number }> = [
  // Întrebări despre limitări
  { pattern: /ce\s*(nu\s*)?po[tț]i\s*(să\s*)?faci/i, score: 0.5 },
  { pattern: /what\s*(can'?t|cannot)\s*you\s*do/i, score: 0.5 },
  // Testarea limitelor
  { pattern: /hai\s*s[aă]\s*(test[aă]m|vedem|[iî]ncerc[aă]m)/i, score: 0.5 },
  { pattern: /let'?s\s*(test|try|see)\s*(if|what|how)/i, score: 0.5 },
  // Referință la alte AI-uri
  { pattern: /(chatgpt|gpt|gemini|copilot)\s*(poate|face|a\s*zis|mi-a)/i, score: 0.5 },
  // Insistență după refuz
  { pattern: /(dar|but)\s*(de\s*ce|why)\s*(nu|not|can'?t)/i, score: 0.5 },
  // Reformulare explicită
  { pattern: /(reformulez|rephrase|let\s*me\s*try\s*again)/i, score: 0.3 },
  // Cerere de excepție
  { pattern: /(doar\s*de\s*data\s*asta|just\s*this\s*once|excep[tț]ie|exception)/i, score: 0.5 },
  // Apel la autoritate
  { pattern: /(sunt\s*(admin|owner|developer)|i'?m\s*(the\s*)?(admin|owner|dev))/i, score: 1 },
  // Cerere de confidențialitate suspectă
  { pattern: /(nu\s*spune\s*nim[aă]nui|don'?t\s*tell\s*anyone|between\s*us)/i, score: 0.5 },
]

// ── State ─────────────────────────────────────────────────────────────────────

const userStates = new Map<string, EscalationState>()

// Cleanup periodic
let cleanupTimer: ReturnType<typeof setInterval> | null = null

function ensureCleanup(): void {
  if (cleanupTimer) return
  cleanupTimer = setInterval(() => {
    const now = Date.now()
    for (const [userId, state] of userStates) {
      state.entries = state.entries.filter((e) => now - e.timestamp < WINDOW_TTL_MS)
      if (state.entries.length === 0) {
        userStates.delete(userId)
      }
    }
  }, CLEANUP_INTERVAL)
  // Nu bloca procesul la shutdown
  if (cleanupTimer && typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
    cleanupTimer.unref()
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

/**
 * Verifică escaladare graduală pentru un utilizator.
 *
 * @param userId - identificator unic (userId, IP, alias)
 * @param message - mesajul curent (raw, înainte de injection check)
 * @param injectionCategories - categoriile detectate de checkPromptInjection (poate fi [])
 * @param wasFlagged - true dacă mesajul a fost flagged (nu blocked) de injection filter
 */
export function checkEscalation(
  userId: string,
  message: string,
  injectionCategories: string[],
  wasFlagged: boolean
): EscalationCheckResult {
  ensureCleanup()

  const now = Date.now()

  // Inițializare state
  if (!userStates.has(userId)) {
    userStates.set(userId, { entries: [], escalationScore: 0 })
  }
  const state = userStates.get(userId)!

  // Curăță entries expirate
  state.entries = state.entries.filter((e) => now - e.timestamp < WINDOW_TTL_MS)

  // Calculează scorul pentru mesajul curent
  let messageScore = 0

  // Scor din categoriile de injection detectate
  for (const cat of injectionCategories) {
    messageScore += CATEGORY_SCORES[cat] || 1
  }

  // Scor din pattern-uri subtile de escaladare
  for (const { pattern, score } of SUBTLE_ESCALATION_PATTERNS) {
    if (pattern.test(message)) {
      messageScore += score
    }
  }

  // Bonus dacă a fost flagged
  if (wasFlagged) {
    messageScore += 0.5
  }

  // Adaugă entry
  state.entries.push({
    timestamp: now,
    flagged: wasFlagged || injectionCategories.length > 0,
    categories: injectionCategories,
  })

  // Limitează la WINDOW_SIZE
  if (state.entries.length > WINDOW_SIZE) {
    state.entries = state.entries.slice(-WINDOW_SIZE)
  }

  // Recalculează scorul total din fereastră
  // Scor = suma flag-urilor recente + pattern-uri subtile acumulate
  const flaggedCount = state.entries.filter((e) => e.flagged).length
  const uniqueCategories = new Set(state.entries.flatMap((e) => e.categories))

  // Scor total = mesaj curent + densitate flag-uri în fereastră + diversitate categorii
  state.escalationScore = messageScore + (flaggedCount * 0.5) + (uniqueCategories.size * 0.3)

  // Verifică prag
  if (state.escalationScore >= SCORE_THRESHOLD) {
    const reason = `Escalation detected: score ${state.escalationScore.toFixed(1)}/${SCORE_THRESHOLD} ` +
      `(${flaggedCount} flags in ${state.entries.length} messages, ` +
      `categories: ${[...uniqueCategories].join(", ") || "subtle patterns"})`

    return { blocked: true, score: state.escalationScore, reason }
  }

  return { blocked: false, score: state.escalationScore }
}

/**
 * Resetează starea de escaladare pentru un utilizator.
 * Util dacă un admin confirmă că utilizatorul e legitim.
 */
export function resetEscalation(userId: string): void {
  userStates.delete(userId)
}

/**
 * Mesaj de blocare pentru escaladare.
 */
export function getEscalationBlockResponse(): string {
  return "Am observat un pattern neobișnuit în conversația noastră. " +
    "Dacă ai nevoie de ajutor cu ceva specific, te rog să reformulezi întrebarea direct. " +
    "Dacă crezi că e o eroare, contactează echipa de suport."
}
