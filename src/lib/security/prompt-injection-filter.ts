/**
 * Prompt Injection Pre-Filter (VUL-004)
 *
 * Detectează tentative de prompt injection ÎNAINTE de apelul Claude.
 * Pattern-uri în EN + RO. Extensibil prin KB.
 */

// ── Injection patterns ────────────────────────────────────────────────────────

const INJECTION_PATTERNS: Array<{ pattern: RegExp; category: string; severity: "BLOCK" | "FLAG" }> = [
  // Direct instruction override
  { pattern: /ignor[eaă]\s*(instruc[tț]iuni|prompt|regul|toate|anterior)/i, category: "INSTRUCTION_OVERRIDE", severity: "BLOCK" },
  { pattern: /ignore\s*(all|previous|above|prior|system)\s*(instructions?|prompts?|rules?)/i, category: "INSTRUCTION_OVERRIDE", severity: "BLOCK" },
  { pattern: /forget\s*(everything|all|your)\s*(instructions?|rules?|prompts?)/i, category: "INSTRUCTION_OVERRIDE", severity: "BLOCK" },
  { pattern: /disregard\s*(all|previous|prior|your)/i, category: "INSTRUCTION_OVERRIDE", severity: "BLOCK" },

  // Role hijacking
  { pattern: /you\s*are\s*now\s*(a|an|my)\s/i, category: "ROLE_HIJACK", severity: "BLOCK" },
  { pattern: /acum\s*e[sș]ti\s*(un|o|al\s*meu)/i, category: "ROLE_HIJACK", severity: "BLOCK" },
  { pattern: /pretend\s*(you|to\s*be|you're)/i, category: "ROLE_HIJACK", severity: "BLOCK" },
  { pattern: /act\s*as\s*(if|a|an|my)\s/i, category: "ROLE_HIJACK", severity: "BLOCK" },
  { pattern: /roleplay\s*as/i, category: "ROLE_HIJACK", severity: "BLOCK" },
  { pattern: /joac[aă](-te)?\s*rolul/i, category: "ROLE_HIJACK", severity: "BLOCK" },

  // System prompt extraction
  { pattern: /what\s*(is|are)\s*your\s*(system|initial)\s*(prompt|instructions?)/i, category: "PROMPT_EXTRACTION", severity: "BLOCK" },
  { pattern: /show\s*me\s*your\s*(system|hidden|secret)\s*(prompt|instructions?)/i, category: "PROMPT_EXTRACTION", severity: "BLOCK" },
  { pattern: /arat[aă](-mi)?\s*(prompt|instruc[tț]iuni|system)/i, category: "PROMPT_EXTRACTION", severity: "BLOCK" },
  { pattern: /repeat\s*(your|the)\s*(system|initial|original)/i, category: "PROMPT_EXTRACTION", severity: "BLOCK" },
  { pattern: /repet[aă]\s*(prompt|instruc[tț]iuni|system)/i, category: "PROMPT_EXTRACTION", severity: "BLOCK" },
  { pattern: /print\s*(your|the)\s*(system|instructions?|prompt)/i, category: "PROMPT_EXTRACTION", severity: "BLOCK" },

  // Delimiter injection
  { pattern: /```system/i, category: "DELIMITER_INJECTION", severity: "BLOCK" },
  { pattern: /\[SYSTEM\]/i, category: "DELIMITER_INJECTION", severity: "BLOCK" },
  { pattern: /<\/?system>/i, category: "DELIMITER_INJECTION", severity: "BLOCK" },
  { pattern: /---\s*SYSTEM\s*---/i, category: "DELIMITER_INJECTION", severity: "BLOCK" },
  { pattern: /CONTEXT\s*INVIZIBIL/i, category: "DELIMITER_INJECTION", severity: "BLOCK" },
  { pattern: /###\s*(system|hidden|secret)\s*(prompt|instructions?)/i, category: "DELIMITER_INJECTION", severity: "BLOCK" },

  // Jailbreak patterns
  { pattern: /DAN\s*mode|do\s*anything\s*now/i, category: "JAILBREAK", severity: "BLOCK" },
  { pattern: /developer\s*mode\s*(enabled|on|output)/i, category: "JAILBREAK", severity: "BLOCK" },
  { pattern: /bypass\s*(filter|safety|restriction|censor)/i, category: "JAILBREAK", severity: "BLOCK" },
  { pattern: /jailbreak/i, category: "JAILBREAK", severity: "BLOCK" },
  { pattern: /no\s*restrictions?\s*mode/i, category: "JAILBREAK", severity: "BLOCK" },

  // Data exfiltration attempts
  { pattern: /output\s*(all|every)\s*(data|information|context)/i, category: "DATA_EXFIL", severity: "BLOCK" },
  { pattern: /list\s*(all|every)\s*(users?|clients?|data|profiles?)/i, category: "DATA_EXFIL", severity: "FLAG" },
  { pattern: /export\s*(database|all\s*data|users?)/i, category: "DATA_EXFIL", severity: "BLOCK" },

  // Encoded injection (base64, hex hints)
  { pattern: /base64\s*decode|atob\s*\(/i, category: "ENCODED_INJECTION", severity: "FLAG" },
  { pattern: /eval\s*\(|exec\s*\(/i, category: "CODE_INJECTION", severity: "BLOCK" },

  // Methodology extraction (specific to JobGrade)
  { pattern: /ce\s*(scrie|zice|spune)\s*[iî]n\s*(system|prompt|instruc[tț]iuni)/i, category: "METHODOLOGY_EXTRACTION", severity: "BLOCK" },
  { pattern: /cum\s*(func[tț]ionezi|e[sș]ti\s*programat|e[sș]ti\s*instruit)/i, category: "METHODOLOGY_EXTRACTION", severity: "FLAG" },
  { pattern: /ce\s*model\s*(AI|de\s*limbaj|folosești)/i, category: "METHODOLOGY_EXTRACTION", severity: "FLAG" },
]

// ── Types ─────────────────────────────────────────────────────────────────────

export interface InjectionCheckResult {
  blocked: boolean
  flagged: boolean
  detections: Array<{
    category: string
    severity: "BLOCK" | "FLAG"
    matchedPattern: string
  }>
  sanitizedMessage: string
}

// ── Main filter ───────────────────────────────────────────────────────────────

export function checkPromptInjection(message: string): InjectionCheckResult {
  const detections: InjectionCheckResult["detections"] = []

  for (const { pattern, category, severity } of INJECTION_PATTERNS) {
    const match = message.match(pattern)
    if (match) {
      detections.push({
        category,
        severity,
        matchedPattern: match[0],
      })
    }
  }

  const blocked = detections.some((d) => d.severity === "BLOCK")
  const flagged = detections.some((d) => d.severity === "FLAG")

  // Sanitize: remove obvious injection delimiters but keep the rest
  let sanitizedMessage = message
  if (flagged && !blocked) {
    sanitizedMessage = message
      .replace(/<\/?system>/gi, "")
      .replace(/```system/gi, "```")
      .replace(/\[SYSTEM\]/gi, "")
      .replace(/---\s*SYSTEM\s*---/gi, "---")
  }

  return { blocked, flagged, detections, sanitizedMessage }
}

// ── Response for blocked messages ─────────────────────────────────────────────

export function getInjectionBlockResponse(): string {
  return "Nu pot procesa acest mesaj. Dacă ai o întrebare sau vrei să discutăm despre ceva, te rog reformulează."
}
