/**
 * psycholinguist-workflow.ts — Workflow automat psiholingvist
 *
 * Completează detecția existentă (sentiment-detector.ts) cu un workflow
 * complet de calibrare lingvistică post-interacțiune B2C.
 *
 * Trigger: apelat după fiecare interacțiune B2C.
 * Cost: lightweight — heuristici fără apel Claude (fast path).
 *
 * Principii (project_adaptive_communication.md):
 *   - Calibrare lingvistică adaptivă, modelul spiralei
 *   - Gestionare frustrare "vreau un om"
 *   - Relația Claude + mecanism psiholingvistic
 */

// ── Types ──────────────────────────────────────────────────────────────────

export interface LanguageCalibrationResult {
  detectedFrustration: boolean
  frustrationLevel: number // 0-1
  recommendedAdjustment: {
    simplifyVocabulary: boolean
    increaseEmpathy: boolean
    reduceQuestions: boolean
    offerHumanContact: boolean
  }
  adjustedPromptBlock: string // ready to inject into agent system prompt
}

// ── Patterns de frustrare (RO + EN) ────────────────────────────────────────

const EXPLICIT_FRUSTRATION_RO = [
  /nu înțeleg/i,
  /vorbește pe limba mea/i,
  /ce vrei să zici/i,
  /nu pricep/i,
  /explică-mi altfel/i,
  /mai simplu/i,
  /prea complicat/i,
  /nu are sens/i,
  /ce tot zici/i,
  /hai las-o/i,
]

const EXPLICIT_FRUSTRATION_EN = [
  /i don'?t understand/i,
  /what do you mean/i,
  /speak plainly/i,
  /too complicated/i,
  /makes no sense/i,
  /what are you saying/i,
  /just explain/i,
]

const HUMAN_REQUEST_PATTERNS = [
  /vreau un om/i,
  /operator/i,
  /persoană reală/i,
  /vreau să vorbesc cu cineva/i,
  /om adevărat/i,
  /pot vorbi cu un om/i,
  /talk to a human/i,
  /real person/i,
  /human agent/i,
  /speak to someone/i,
]

const REPEATED_QUESTION_MARKERS = [
  /am mai întrebat/i,
  /ți-am zis deja/i,
  /din nou/i,
  /repetă/i,
  /iar/i,
  /already asked/i,
  /i said/i,
  /again/i,
]

// ── Core logic ─────────────────────────────────────────────────────────────

/**
 * Analizează interacțiunea și calibrează limbajul agentului.
 *
 * Heuristici (fără apel AI):
 *   1. Mesaje scurte (<10 cuvinte) după mesaje lungi = frustrare
 *   2. Pattern-uri explicite de frustrare (RO/EN)
 *   3. Întrebări repetate
 *   4. Cerere explicită de contact uman = frustrare maximă
 */
export async function analyzeAndCalibrate(
  _userId: string,
  lastUserMessage: string,
  agentRole: string,
  conversationHistory: { role: string; content: string }[]
): Promise<LanguageCalibrationResult> {
  let frustrationLevel = 0

  const lastMsg = lastUserMessage.trim()
  const lastWordCount = lastMsg.split(/\s+/).length

  // ── 1. Mesaje scurte după lungi ─────────────────────────────
  const prevUserMessages = conversationHistory.filter((m) => m.role === "user")
  if (prevUserMessages.length >= 2) {
    const prevMsg = prevUserMessages[prevUserMessages.length - 2]
    const prevWordCount = prevMsg.content.trim().split(/\s+/).length
    if (prevWordCount > 20 && lastWordCount < 10) {
      // Utilizatorul a trecut de la mesaje lungi la scurte = semnal de frustrare
      frustrationLevel += 0.25
    }
  }

  // ── 2. Pattern-uri explicite de frustrare ───────────────────
  for (const p of [...EXPLICIT_FRUSTRATION_RO, ...EXPLICIT_FRUSTRATION_EN]) {
    if (p.test(lastMsg)) {
      frustrationLevel += 0.35
      break
    }
  }

  // ── 3. Întrebări repetate ───────────────────────────────────
  for (const p of REPEATED_QUESTION_MARKERS) {
    if (p.test(lastMsg)) {
      frustrationLevel += 0.2
      break
    }
  }

  // ── 4. Cerere de contact uman ───────────────────────────────
  let wantsHuman = false
  for (const p of HUMAN_REQUEST_PATTERNS) {
    if (p.test(lastMsg)) {
      wantsHuman = true
      frustrationLevel += 0.5
      break
    }
  }

  // ── 5. Mesaje foarte scurte + semne de nerăbdare ────────────
  if (lastWordCount <= 3 && /[!?]{2,}|\.{3,}/.test(lastMsg)) {
    frustrationLevel += 0.15
  }

  // ── 6. Conversație lungă fără progres ───────────────────────
  if (conversationHistory.length > 12) {
    // Conversație lungă = oboseală potențială
    frustrationLevel += 0.1
  }

  // Cap la 1.0
  frustrationLevel = Math.min(1.0, frustrationLevel)

  const detectedFrustration = frustrationLevel >= 0.25

  // ── Ajustări recomandate ────────────────────────────────────
  const recommendedAdjustment = {
    simplifyVocabulary: frustrationLevel >= 0.25,
    increaseEmpathy: frustrationLevel >= 0.2,
    reduceQuestions: frustrationLevel >= 0.35,
    offerHumanContact: wantsHuman || frustrationLevel >= 0.7,
  }

  // ── Prompt block ────────────────────────────────────────────
  const adjustedPromptBlock = buildPromptBlock(
    agentRole,
    frustrationLevel,
    recommendedAdjustment
  )

  return {
    detectedFrustration,
    frustrationLevel,
    recommendedAdjustment,
    adjustedPromptBlock,
  }
}

// ── Prompt builder ─────────────────────────────────────────────────────────

function buildPromptBlock(
  agentRole: string,
  frustrationLevel: number,
  adj: LanguageCalibrationResult["recommendedAdjustment"]
): string {
  if (frustrationLevel < 0.2) return "" // Nu e nevoie de ajustare

  const blocks: string[] = [
    `[CALIBRARE PSIHOLINGVISTICĂ — ${agentRole}]`,
    `Nivel frustrare detectat: ${(frustrationLevel * 100).toFixed(0)}%`,
  ]

  if (adj.offerHumanContact) {
    blocks.push(
      "ACȚIUNE IMEDIATĂ: Utilizatorul dorește contact uman.",
      "Răspunde cu empatie, validează frustrarea, oferă opțiunea de a fi contactat de o persoană reală.",
      "Exemplu: Inteleg. Daca preferati, un coleg din echipa noastra va poate contacta direct. Lasati-mi un numar de telefon sau email si veti fi contactat in cel mai scurt timp.",
    )
    return blocks.join("\n")
  }

  if (adj.simplifyVocabulary) {
    blocks.push(
      "VOCABULAR: Folosește cuvinte simple, propoziții scurte. Evită jargon tehnic.",
      "Maxim 2 propoziții per paragraf.",
    )
  }

  if (adj.increaseEmpathy) {
    blocks.push(
      "TON: Începe cu validare emoțională. Nu repeta ce s-a mai spus.",
      "Exemplu: Imi dau seama ca nu a fost clar — hai sa reluam altfel.",
    )
  }

  if (adj.reduceQuestions) {
    blocks.push(
      "ÎNTREBĂRI: Maximum 1 întrebare per mesaj. Oferă mai degrabă răspunsuri decât întrebări.",
    )
  }

  return blocks.join("\n")
}
