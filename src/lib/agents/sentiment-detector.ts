/**
 * sentiment-detector.ts — Analiză sentiment și ton din comunicarea text
 *
 * Compensează lipsa canalului non-verbal:
 * - Detectează: frustrare, urgență, entuziasm, dezamăgire, confuzie, sarcasm
 * - Oferă "reading" emoțional al interacțiunii
 * - Alimentează Client Memory cu observații de stil
 * - Integrare cu PSYCHOLINGUIST agent (KB)
 *
 * Cost: lightweight — regex + heuristici, fără apel Claude (fast path)
 * Opțional: Claude call pentru analiză profundă (slow path)
 */

export type Sentiment = "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "MIXED"
export type Emotion = "FRUSTRATION" | "URGENCY" | "ENTHUSIASM" | "DISAPPOINTMENT" | "CONFUSION" | "SARCASM" | "SATISFACTION" | "ANGER" | "NONE"

export interface SentimentAnalysis {
  sentiment: Sentiment
  confidence: number
  emotions: Array<{ emotion: Emotion; strength: number; evidence: string }>
  communicationStyle: "FORMAL" | "INFORMAL" | "TECHNICAL" | "EMOTIONAL"
  urgencyLevel: number // 0-10
  suggestions: string[] // cum să răspunzi
}

// ── Pattern-based detection (fast, no API) ───────────────────────────────────

const FRUSTRATION_PATTERNS = [
  /nu funcționează/i, /nu merge/i, /iar\b/i, /din nou/i, /de [3-9]+ ori/i,
  /doesn'?t work/i, /broken/i, /again/i, /still not/i,
  /!!+/, /\?{2,}/, /CAPS[A-Z ]{5,}/,
]

const URGENCY_PATTERNS = [
  /urgent/i, /asap/i, /imediat/i, /acum/i, /cât mai repede/i,
  /deadline/i, /blocat/i, /blocked/i, /critical/i, /azi/i, /astăzi/i,
]

const ENTHUSIASM_PATTERNS = [
  /excelent/i, /perfect/i, /genial/i, /super/i, /minunat/i, /fantastic/i,
  /great/i, /amazing/i, /awesome/i, /love it/i,
  /!{1,2}$/, /😊|👍|🎉|💪|🙌/,
]

const DISAPPOINTMENT_PATTERNS = [
  /dezamăgi/i, /disappointing/i, /mă așteptam/i, /expected/i,
  /nu e ce/i, /păcat/i, /unfortunately/i, /din păcate/i,
]

const CONFUSION_PATTERNS = [
  /nu înțeleg/i, /confuz/i, /don'?t understand/i, /ce înseamnă/i,
  /cum funcționează/i, /how does/i, /what do you mean/i,
  /\?{1,}.*\?/,
]

const SARCASM_PATTERNS = [
  /sigur că da/i, /evident/i, /clar\.\.\./i, /bravo/i,
  /minunat\.\.\./i, /great\.\.\./i, /sure\.\.\./i, /oh well/i,
]

export function analyzeSentiment(text: string): SentimentAnalysis {
  const emotions: SentimentAnalysis["emotions"] = []
  let urgencyLevel = 0

  // Check each pattern set
  for (const p of FRUSTRATION_PATTERNS) {
    const match = text.match(p)
    if (match) {
      emotions.push({ emotion: "FRUSTRATION", strength: 0.7, evidence: match[0] })
      break
    }
  }

  for (const p of URGENCY_PATTERNS) {
    const match = text.match(p)
    if (match) {
      urgencyLevel = Math.min(10, urgencyLevel + 3)
      emotions.push({ emotion: "URGENCY", strength: Math.min(1, urgencyLevel / 10), evidence: match[0] })
      break
    }
  }

  for (const p of ENTHUSIASM_PATTERNS) {
    const match = text.match(p)
    if (match) {
      emotions.push({ emotion: "ENTHUSIASM", strength: 0.7, evidence: match[0] })
      break
    }
  }

  for (const p of DISAPPOINTMENT_PATTERNS) {
    const match = text.match(p)
    if (match) {
      emotions.push({ emotion: "DISAPPOINTMENT", strength: 0.6, evidence: match[0] })
      break
    }
  }

  for (const p of CONFUSION_PATTERNS) {
    const match = text.match(p)
    if (match) {
      emotions.push({ emotion: "CONFUSION", strength: 0.6, evidence: match[0] })
      break
    }
  }

  for (const p of SARCASM_PATTERNS) {
    const match = text.match(p)
    if (match) {
      emotions.push({ emotion: "SARCASM", strength: 0.5, evidence: match[0] })
      break
    }
  }

  if (emotions.length === 0) {
    emotions.push({ emotion: "NONE", strength: 0, evidence: "" })
  }

  // Determine overall sentiment
  const negativeEmotions = ["FRUSTRATION", "DISAPPOINTMENT", "ANGER", "SARCASM"]
  const positiveEmotions = ["ENTHUSIASM", "SATISFACTION"]
  const hasNeg = emotions.some(e => negativeEmotions.includes(e.emotion))
  const hasPos = emotions.some(e => positiveEmotions.includes(e.emotion))

  let sentiment: Sentiment = "NEUTRAL"
  if (hasNeg && hasPos) sentiment = "MIXED"
  else if (hasNeg) sentiment = "NEGATIVE"
  else if (hasPos) sentiment = "POSITIVE"

  // Communication style
  const isAllCaps = (text.match(/[A-Z]{3,}/g) || []).length > 2
  const hasEmoji = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]/u.test(text)
  const hasTechnical = /API|DB|SQL|CSS|JSON|HTTP|regex/i.test(text)
  const hasExclamation = (text.match(/!/g) || []).length > 2

  let communicationStyle: SentimentAnalysis["communicationStyle"] = "FORMAL"
  if (hasTechnical) communicationStyle = "TECHNICAL"
  else if (hasEmoji || hasExclamation || isAllCaps) communicationStyle = "EMOTIONAL"
  else if (text.length < 50 || /ok|da|nu|sure|yep/i.test(text.trim())) communicationStyle = "INFORMAL"

  // Response suggestions
  const suggestions: string[] = []
  if (hasNeg) suggestions.push("Acknowledge frustrarea înainte de soluție")
  if (emotions.some(e => e.emotion === "CONFUSION")) suggestions.push("Explică simplu, pas cu pas")
  if (urgencyLevel >= 5) suggestions.push("Răspunde cu urgență, soluție imediată")
  if (emotions.some(e => e.emotion === "FRUSTRATION")) suggestions.push("Nu repeta ce s-a mai spus — oferă soluție nouă")
  if (hasPos) suggestions.push("Continuă pe aceeași tonalitate pozitivă")
  if (communicationStyle === "INFORMAL") suggestions.push("Adaptează-ți tonul — fii concis și direct")

  return {
    sentiment,
    confidence: emotions.length > 1 ? 0.7 : 0.5,
    emotions,
    communicationStyle,
    urgencyLevel,
    suggestions,
  }
}

/**
 * Format for prompt injection.
 */
export function formatSentimentForPrompt(analysis: SentimentAnalysis): string {
  if (analysis.sentiment === "NEUTRAL" && analysis.urgencyLevel < 3) return ""

  const parts = [`TONALITATE DETECTATĂ: ${analysis.sentiment}`]
  if (analysis.emotions.filter(e => e.emotion !== "NONE").length > 0) {
    parts.push(`Emoții: ${analysis.emotions.filter(e => e.emotion !== "NONE").map(e => e.emotion).join(", ")}`)
  }
  if (analysis.urgencyLevel >= 5) parts.push(`Urgență: ${analysis.urgencyLevel}/10`)
  if (analysis.suggestions.length > 0) parts.push(`Recomandări: ${analysis.suggestions.join("; ")}`)

  return parts.join(" | ")
}
