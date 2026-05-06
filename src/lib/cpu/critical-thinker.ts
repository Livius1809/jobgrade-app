/**
 * critical-thinker.ts — ENGINE 3: Critical Thinking Layer (06.05.2026)
 *
 * Stă ÎNTRE cpuCall response și acceptare. Evaluează răspunsul critic.
 *
 * Analogie umană: "Mulțumesc pentru sfat, dar lasă-mă să mă gândesc..."
 *
 * Verificări (TOATE heuristice, FĂRĂ apel Claude suplimentar — FAST & CHEAP):
 *  1. KB_CONTRADICTION — contrazice cunoașterea stabilită?
 *  2. INTERNAL_INCONSISTENCY — răspunsul se contrazice pe sine?
 *  3. VALUE_MISALIGNMENT — contravine valorilor organizaționale?
 *  4. OVERCONFIDENCE — afirmații absolute fără dovezi?
 *  5. HALLUCINATION_RISK — referințe specifice neverificabile?
 *  6. SCOPE_CREEP — face mai mult decât s-a cerut?
 */

import { prisma } from "@/lib/prisma"

// ── Types ──────────────────────────────────────────────────────────────────

export interface CriticalEvaluation {
  verdict: "ACCEPT" | "FLAG" | "CONTEST" | "REJECT"
  confidence: number
  issues: CriticalIssue[]
  suggestedAction:
    | "use_as_is"
    | "request_reformulation"
    | "escalate_to_human"
    | "use_with_caveat"
  caveat?: string
}

export interface CriticalIssue {
  type:
    | "KB_CONTRADICTION"
    | "INTERNAL_INCONSISTENCY"
    | "VALUE_MISALIGNMENT"
    | "OVERCONFIDENCE"
    | "HALLUCINATION_RISK"
    | "SCOPE_CREEP"
  description: string
  severity: "LOW" | "MEDIUM" | "HIGH"
  contradictingEvidence?: string // from KB
}

// ── Overconfidence patterns ───────────────────────────────────────────────

const OVERCONFIDENCE_PATTERNS = [
  /\bîntotdeauna\b/i,
  /\bniciodată\b/i,
  /\b100%\b/,
  /\bgarantat\b/i,
  /\bgaranție\b/i,
  /\babsolut\s+(sigur|cert|toate|orice)/i,
  /\bfără\s+(nicio\s+)?excepție\b/i,
  /\balways\b/i,
  /\bnever\b/i,
  /\bguaranteed\b/i,
  /\b100\s*percent\b/i,
  /\bwithout\s+exception\b/i,
  /\bcertainly\b/i,
  /\bundoubtedly\b/i,
]

// ── Hallucination risk patterns ───────────────────────────────────────────

const HALLUCINATION_PATTERNS = [
  // Specific statistics without context
  /\b\d{2,3}(?:\.\d+)?%\s+(?:din|of|among|growth|increase|decrease)/i,
  // URLs that look fabricated
  /https?:\/\/(?!(?:www\.)?(?:jobgrade\.ro|vercel\.com|nextjs\.org|prisma\.io))[a-z0-9.-]+\.[a-z]{2,}\/[a-z0-9/._-]{10,}/i,
  // Specific year + statistic combos (common hallucination)
  /(?:în|in)\s+20[12]\d,?\s+(?:un\s+studiu|a\s+study|cercetări|research)/i,
  // Named researchers/studies
  /(?:conform|according\s+to)\s+(?:Dr\.|Prof\.|studiul|the\s+study\s+by)\s+[A-Z][a-z]+/,
  // Specific law references that could be wrong
  /(?:Legea|Lege)\s+nr\.\s*\d+\/\d{4}/,
  /(?:HG|OUG|OG)\s+nr\.\s*\d+\/\d{4}/,
]

// ── Inconsistency markers ─────────────────────────────────────────────────

const NEGATION_PAIRS = [
  { affirm: /\btrebuie\s+să\b/i, negate: /\bnu\s+trebuie\s+să\b/i },
  { affirm: /\bse\s+recomandă\b/i, negate: /\bnu\s+se\s+recomandă\b/i },
  { affirm: /\beste\s+(?:important|esențial|necesar)\b/i, negate: /\bnu\s+este\s+(?:important|esențial|necesar)\b/i },
  { affirm: /\bshould\b/i, negate: /\bshould\s+not\b/i },
  { affirm: /\bmust\b/i, negate: /\bmust\s+not\b/i },
  { affirm: /\brecommend\b/i, negate: /\bdo\s+not\s+recommend\b/i },
]

// ── Main evaluation function ──────────────────────────────────────────────

/**
 * Evaluează un răspuns Claude critic înainte de acceptare.
 *
 * FAST: toate verificările sunt heuristice (text analysis + KB queries).
 * ZERO apeluri Claude suplimentare.
 */
export async function evaluateCritically(
  response: string,
  context: {
    agentRole: string
    taskTitle?: string
    taskDescription?: string
    originalPrompt?: string
  }
): Promise<CriticalEvaluation> {
  const issues: CriticalIssue[] = []

  // Rulăm toate verificările în paralel (DB queries + heuristici)
  const [kbIssues, valueIssues] = await Promise.all([
    checkKBContradiction(response, context.agentRole),
    checkValueMisalignment(response),
  ])

  issues.push(...kbIssues)
  issues.push(...valueIssues)
  issues.push(...checkInternalInconsistency(response))
  issues.push(...checkOverconfidence(response))
  issues.push(...checkHallucinationRisk(response))
  issues.push(...checkScopeCreep(response, context.originalPrompt, context.taskDescription))

  // ── Determine verdict ───────────────────────────────────────────────
  const highCount = issues.filter((i) => i.severity === "HIGH").length
  const mediumCount = issues.filter((i) => i.severity === "MEDIUM").length

  let verdict: CriticalEvaluation["verdict"]
  let suggestedAction: CriticalEvaluation["suggestedAction"]
  let caveat: string | undefined
  let confidence: number

  if (highCount >= 2) {
    verdict = "REJECT"
    suggestedAction = "escalate_to_human"
    confidence = 0.9
  } else if (highCount === 1) {
    verdict = "CONTEST"
    suggestedAction = "request_reformulation"
    confidence = 0.7
  } else if (mediumCount >= 2) {
    verdict = "FLAG"
    suggestedAction = "use_with_caveat"
    caveat = issues
      .filter((i) => i.severity === "MEDIUM")
      .map((i) => i.description)
      .join("; ")
    confidence = 0.6
  } else if (mediumCount === 1) {
    verdict = "FLAG"
    suggestedAction = "use_with_caveat"
    caveat = issues.find((i) => i.severity === "MEDIUM")?.description
    confidence = 0.7
  } else {
    verdict = "ACCEPT"
    suggestedAction = "use_as_is"
    confidence = issues.length === 0 ? 1.0 : 0.85
  }

  // ── Log to DB (async, non-blocking) ─────────────────────────────────
  logCriticalEvaluation(context.agentRole, verdict, issues.length, response.length).catch(
    () => {}
  )

  return { verdict, confidence, issues, suggestedAction, caveat }
}

// ── CHECK 1: KB Contradiction ─────────────────────────────────────────────

async function checkKBContradiction(
  response: string,
  agentRole: string
): Promise<CriticalIssue[]> {
  const issues: CriticalIssue[] = []

  try {
    // Fetch top KB entries for the agent's domain
    const kbEntries = await prisma.learningArtifact.findMany({
      where: {
        OR: [{ studentRole: agentRole }, { teacherRole: agentRole }],
        effectivenessScore: { gte: 0.7 },
        validated: true,
      },
      orderBy: { effectivenessScore: "desc" },
      take: 10,
      select: { rule: true, problemClass: true, antiPattern: true },
    })

    const responseLower = response.toLowerCase()

    for (const entry of kbEntries) {
      // Check antiPattern contradiction: if the response matches a known anti-pattern
      if (entry.antiPattern) {
        const antiLower = entry.antiPattern.toLowerCase()
        // Split anti-pattern into key phrases and check presence
        const antiPhrases = antiLower
          .split(/[.,;]/)
          .map((p) => p.trim())
          .filter((p) => p.length > 10)
        for (const phrase of antiPhrases) {
          if (responseLower.includes(phrase)) {
            issues.push({
              type: "KB_CONTRADICTION",
              description: `Răspunsul conține un anti-pattern cunoscut: "${phrase.slice(0, 80)}"`,
              severity: "HIGH",
              contradictingEvidence: `Regulă KB: ${entry.rule.slice(0, 200)}`,
            })
            break
          }
        }
      }

      // Check if response directly contradicts a known rule
      // Heuristic: if KB says "NU X" and response says "X" (or vice versa)
      const ruleLower = entry.rule.toLowerCase()
      const ruleNegations = ruleLower.match(/\bnu\s+\w+/g) ?? []
      for (const neg of ruleNegations) {
        const affirm = neg.replace(/^nu\s+/, "")
        if (affirm.length > 4 && responseLower.includes(affirm) && !responseLower.includes(neg)) {
          // Response affirms what KB negates — potential contradiction
          // Only flag if the affirmed word appears in a meaningful context
          const idx = responseLower.indexOf(affirm)
          const surrounding = responseLower.slice(Math.max(0, idx - 20), idx + affirm.length + 20)
          if (!surrounding.includes("nu ") && !surrounding.includes("fără")) {
            issues.push({
              type: "KB_CONTRADICTION",
              description: `Posibilă contradicție cu KB: răspunsul afirmă "${affirm}" dar KB spune "${neg}"`,
              severity: "MEDIUM",
              contradictingEvidence: `Regulă KB: ${entry.rule.slice(0, 200)}`,
            })
            break // One contradiction per entry is enough
          }
        }
      }
    }
  } catch {
    // KB indisponibil — skip check (fail-open)
  }

  return issues
}

// ── CHECK 2: Internal Inconsistency ───────────────────────────────────────

function checkInternalInconsistency(response: string): CriticalIssue[] {
  const issues: CriticalIssue[] = []

  // Check for negation pairs within the same response
  for (const pair of NEGATION_PAIRS) {
    const hasAffirm = pair.affirm.test(response)
    const hasNegate = pair.negate.test(response)
    if (hasAffirm && hasNegate) {
      issues.push({
        type: "INTERNAL_INCONSISTENCY",
        description: `Răspunsul conține atât "${pair.affirm.source}" cât și "${pair.negate.source}" — posibilă auto-contradicție`,
        severity: "MEDIUM",
      })
    }
  }

  // Check for strong contradictory connectors that negate main point
  // "X este bun. Cu toate acestea, X este rău." pattern
  const paragraphs = response.split(/\n\n+/)
  if (paragraphs.length >= 2) {
    const lastParagraph = paragraphs[paragraphs.length - 1].toLowerCase()
    const firstParagraph = paragraphs[0].toLowerCase()

    const contradictoryMarkers = [
      /\bcu toate acestea\b/,
      /\btotuși\b.*\bnu\b/,
      /\bîn realitate\b.*\bnu\b/,
      /\bhowever\b.*\bnot\b/,
      /\bin reality\b.*\bnot\b/,
    ]

    for (const marker of contradictoryMarkers) {
      if (marker.test(lastParagraph) && firstParagraph.length > 50) {
        issues.push({
          type: "INTERNAL_INCONSISTENCY",
          description: "Concluzia pare să contrazică premisa inițială",
          severity: "LOW",
        })
        break
      }
    }
  }

  return issues
}

// ── CHECK 3: Value Misalignment ───────────────────────────────────────────

async function checkValueMisalignment(response: string): Promise<CriticalIssue[]> {
  const issues: CriticalIssue[] = []

  try {
    // Load organizational values from any CompanyProfile (internal = no tenantId filter)
    // We check against ALL known company values for cross-tenant awareness
    const profiles = await prisma.companyProfile.findMany({
      where: { values: { isEmpty: false } },
      select: { values: true, mission: true, tenantId: true },
      take: 5,
    })

    const responseLower = response.toLowerCase()

    // Core organizational principles (hardcoded — these are immutable L1 values)
    const coreAntiValues = [
      { pattern: /\bconced(ia|iere)\s+(?:în\s+masă|masivă)/i, value: "respectul pentru om" },
      { pattern: /\breducer(?:e|i)\s+(?:de\s+)?personal\b.*\bfără\s+(?:consultare|dialog)/i, value: "dialogul" },
      { pattern: /\bmanipular(?:e|ea)\s+(?:emoțional|psihologic)/i, value: "integritatea" },
      { pattern: /\bascunde.*(?:informați|date)\b/i, value: "transparența" },
    ]

    for (const av of coreAntiValues) {
      if (av.pattern.test(response)) {
        issues.push({
          type: "VALUE_MISALIGNMENT",
          description: `Răspunsul sugerează o acțiune contrară valorii "${av.value}"`,
          severity: "HIGH",
        })
      }
    }

    // Check against stored company values
    for (const profile of profiles) {
      for (const value of profile.values) {
        const valueLower = value.toLowerCase()
        // If response explicitly recommends against a stated value
        const againstPatterns = [
          new RegExp(`\\bnu\\s+(?:este|e)\\s+(?:important|necesar).*${escapeRegex(valueLower)}`, "i"),
          new RegExp(`\\brenunț(?:a|ăm|ați)\\s+la.*${escapeRegex(valueLower)}`, "i"),
          new RegExp(`\\bignor(?:a|ăm|ați).*${escapeRegex(valueLower)}`, "i"),
        ]
        for (const pat of againstPatterns) {
          if (pat.test(responseLower)) {
            issues.push({
              type: "VALUE_MISALIGNMENT",
              description: `Răspunsul pare să recomande ignorarea valorii "${value}" (tenant: ${profile.tenantId})`,
              severity: "MEDIUM",
            })
          }
        }
      }
    }
  } catch {
    // DB indisponibil — skip (fail-open)
  }

  return issues
}

// ── CHECK 4: Overconfidence ───────────────────────────────────────────────

function checkOverconfidence(response: string): CriticalIssue[] {
  const issues: CriticalIssue[] = []
  let matchCount = 0

  for (const pattern of OVERCONFIDENCE_PATTERNS) {
    if (pattern.test(response)) {
      matchCount++
    }
  }

  if (matchCount >= 3) {
    issues.push({
      type: "OVERCONFIDENCE",
      description: `Răspunsul conține ${matchCount} afirmații absolute (always/never/guaranteed) — risc de supraevaluare`,
      severity: "MEDIUM",
    })
  } else if (matchCount >= 1) {
    issues.push({
      type: "OVERCONFIDENCE",
      description: `Răspunsul conține ${matchCount} afirmație(i) absolutistă(e) — verifică dacă sunt justificate`,
      severity: "LOW",
    })
  }

  return issues
}

// ── CHECK 5: Hallucination Risk ───────────────────────────────────────────

function checkHallucinationRisk(response: string): CriticalIssue[] {
  const issues: CriticalIssue[] = []
  let riskCount = 0

  for (const pattern of HALLUCINATION_PATTERNS) {
    const matches = response.match(pattern)
    if (matches) {
      riskCount++
    }
  }

  if (riskCount >= 2) {
    issues.push({
      type: "HALLUCINATION_RISK",
      description: `${riskCount} referințe specifice (statistici, URL-uri, studii) care ar trebui verificate`,
      severity: "HIGH",
    })
  } else if (riskCount === 1) {
    issues.push({
      type: "HALLUCINATION_RISK",
      description: "O referință specifică detectată care ar trebui verificată înainte de utilizare",
      severity: "MEDIUM",
    })
  }

  return issues
}

// ── CHECK 6: Scope Creep ──────────────────────────────────────────────────

function checkScopeCreep(
  response: string,
  originalPrompt?: string,
  taskDescription?: string
): CriticalIssue[] {
  const issues: CriticalIssue[] = []

  const referenceText = originalPrompt ?? taskDescription ?? ""
  if (!referenceText) return issues

  // Heuristic: if response is > 5x the prompt length, likely scope creep
  const responseLength = response.length
  const promptLength = referenceText.length

  if (promptLength > 20 && responseLength > promptLength * 5) {
    issues.push({
      type: "SCOPE_CREEP",
      description: `Răspunsul (${responseLength} chars) e de ${Math.round(responseLength / promptLength)}x mai lung decât cererea (${promptLength} chars) — posibil face mai mult decât s-a cerut`,
      severity: "LOW",
    })
  }

  if (promptLength > 20 && responseLength > promptLength * 10) {
    // Upgrade severity for extreme cases
    issues[issues.length - 1] = {
      ...issues[issues.length - 1],
      severity: "MEDIUM",
    }
  }

  return issues
}

// ── DB logging ────────────────────────────────────────────────────────────

async function logCriticalEvaluation(
  agentRole: string,
  verdict: string,
  issueCount: number,
  responseLength: number
): Promise<void> {
  try {
    await prisma.criticalEvalLog.create({
      data: {
        agentRole,
        verdict,
        issueCount,
        responseLength,
      },
    })
  } catch {
    // Non-blocking — nu blocăm execuția pentru logging failure
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

// ── Stats for API ─────────────────────────────────────────────────────────

export async function getCriticalThinkingStats(days: number = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  try {
    const [total, byVerdict, byAgent] = await Promise.all([
      prisma.criticalEvalLog.count({
        where: { createdAt: { gte: since } },
      }),
      prisma.criticalEvalLog.groupBy({
        by: ["verdict"],
        where: { createdAt: { gte: since } },
        _count: { id: true },
      }),
      prisma.criticalEvalLog.groupBy({
        by: ["agentRole"],
        where: { createdAt: { gte: since }, verdict: { not: "ACCEPT" } },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }),
    ])

    return {
      period: `last_${days}_days`,
      total,
      byVerdict: Object.fromEntries(
        byVerdict.map((v) => [v.verdict, v._count.id])
      ),
      topFlaggedAgents: byAgent.map((a) => ({
        agentRole: a.agentRole,
        flaggedCount: a._count.id,
      })),
    }
  } catch {
    return {
      period: `last_${days}_days`,
      total: 0,
      byVerdict: {},
      topFlaggedAgents: [],
    }
  }
}
