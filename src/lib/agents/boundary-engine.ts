/**
 * D1 — Boundary Engine (Immune Layer)
 *
 * Funcție pură care evaluează input-uri contra regulilor de graniță.
 * Zero I/O — primește reguli + input, returnează verdictul.
 *
 * Livrat: 06.04.2026, Stratul D "Living Organization".
 */

// ── Tipuri ────────────────────────────────────────────────────────────────────

export type BoundaryRuleType = "MORAL_CORE" | "SCOPE_VIOLATION" | "CONSISTENCY" | "DATA_INTEGRITY" | "PRIVACY"
export type BoundarySeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
export type BoundaryAction = "BLOCK" | "QUARANTINE" | "WARN" | "LOG"

export interface BoundaryRuleInput {
  id: string
  code: string
  name: string
  ruleType: BoundaryRuleType
  severity: BoundarySeverity
  condition: BoundaryCondition
  action: BoundaryAction
  notifyRoles: string[]
  escalateToOwner: boolean
  isActive: boolean
}

export interface BoundaryCondition {
  keywords?: string[]
  context?: string     // "client_input" | "agent_action" | "data_import" | "directive"
  roleScope?: string   // agentRole restricționat
  forbiddenActions?: string[]
  maxValue?: number
  minValue?: number
  fieldName?: string
  regex?: string
}

export interface BoundaryCheckInput {
  sourceType: string   // "client_input" | "agent_action" | "data_import" | "directive"
  sourceRole?: string
  content: string
  metadata?: Record<string, unknown>
}

export interface BoundaryVerdict {
  passed: boolean
  violations: ViolationDetail[]
  highestSeverity: BoundarySeverity | null
  highestAction: BoundaryAction | null
  shouldEscalateToOwner: boolean
  notifyRoles: string[]
}

export interface ViolationDetail {
  ruleId: string
  ruleCode: string
  ruleName: string
  ruleType: BoundaryRuleType
  severity: BoundarySeverity
  action: BoundaryAction
  matchedKeywords: string[]
  description: string
}

// ── Ordine de severitate ─────────────────────────────────────────────────────

const SEVERITY_ORDER: Record<BoundarySeverity, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
}

const ACTION_ORDER: Record<BoundaryAction, number> = {
  BLOCK: 4,
  QUARANTINE: 3,
  WARN: 2,
  LOG: 1,
}

// ── Engine ───────────────────────────────────────────────────────────────────

function matchesKeywords(content: string, keywords: string[]): string[] {
  const lower = content.toLowerCase()
  return keywords.filter((kw) => {
    const kwLower = kw.toLowerCase()
    // whole-word match (Unicode-aware)
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegex(kwLower)}(?![\\p{L}\\p{N}])`, "iu")
    return re.test(lower)
  })
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function checkRule(rule: BoundaryRuleInput, input: BoundaryCheckInput): ViolationDetail | null {
  const cond = rule.condition

  // Context filter: dacă regula e pentru un context specific, verifică match
  if (cond.context && cond.context !== input.sourceType) return null

  // Role scope: dacă regula restricționează un rol specific
  if (cond.roleScope && input.sourceRole !== cond.roleScope) return null

  // Keyword match
  if (cond.keywords && cond.keywords.length > 0) {
    const matched = matchesKeywords(input.content, cond.keywords)
    if (matched.length > 0) {
      return {
        ruleId: rule.id,
        ruleCode: rule.code,
        ruleName: rule.name,
        ruleType: rule.ruleType,
        severity: rule.severity,
        action: rule.action,
        matchedKeywords: matched,
        description: `${rule.name}: cuvinte cheie detectate [${matched.join(", ")}]`,
      }
    }
  }

  // Forbidden actions
  if (cond.forbiddenActions && cond.forbiddenActions.length > 0 && input.metadata) {
    const action = input.metadata.action as string | undefined
    if (action && cond.forbiddenActions.includes(action)) {
      return {
        ruleId: rule.id,
        ruleCode: rule.code,
        ruleName: rule.name,
        ruleType: rule.ruleType,
        severity: rule.severity,
        action: rule.action,
        matchedKeywords: [],
        description: `${rule.name}: acțiune interzisă "${action}" pentru ${input.sourceRole ?? "unknown"}`,
      }
    }
  }

  // Regex match
  if (cond.regex) {
    try {
      const re = new RegExp(cond.regex, "iu")
      if (re.test(input.content)) {
        return {
          ruleId: rule.id,
          ruleCode: rule.code,
          ruleName: rule.name,
          ruleType: rule.ruleType,
          severity: rule.severity,
          action: rule.action,
          matchedKeywords: [],
          description: `${rule.name}: pattern regex detectat`,
        }
      }
    } catch {
      // regex invalid — skip
    }
  }

  // Value bounds
  if (cond.fieldName && input.metadata) {
    const val = input.metadata[cond.fieldName] as number | undefined
    if (val !== undefined) {
      if (cond.maxValue !== undefined && val > cond.maxValue) {
        return {
          ruleId: rule.id,
          ruleCode: rule.code,
          ruleName: rule.name,
          ruleType: rule.ruleType,
          severity: rule.severity,
          action: rule.action,
          matchedKeywords: [],
          description: `${rule.name}: ${cond.fieldName}=${val} depășește max=${cond.maxValue}`,
        }
      }
      if (cond.minValue !== undefined && val < cond.minValue) {
        return {
          ruleId: rule.id,
          ruleCode: rule.code,
          ruleName: rule.name,
          ruleType: rule.ruleType,
          severity: rule.severity,
          action: rule.action,
          matchedKeywords: [],
          description: `${rule.name}: ${cond.fieldName}=${val} sub min=${cond.minValue}`,
        }
      }
    }
  }

  return null
}

// ── Export principal ──────────────────────────────────────────────────────────

export function checkBoundaries(
  rules: BoundaryRuleInput[],
  input: BoundaryCheckInput,
): BoundaryVerdict {
  const activeRules = rules.filter((r) => r.isActive)
  const violations: ViolationDetail[] = []

  for (const rule of activeRules) {
    const v = checkRule(rule, input)
    if (v) violations.push(v)
  }

  if (violations.length === 0) {
    return {
      passed: true,
      violations: [],
      highestSeverity: null,
      highestAction: null,
      shouldEscalateToOwner: false,
      notifyRoles: [],
    }
  }

  // Sortează: CRITICAL first, apoi HIGH, etc.
  violations.sort((a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity])

  const highestSeverity = violations[0].severity
  const highestAction = violations.reduce<BoundaryAction>(
    (max, v) => (ACTION_ORDER[v.action] > ACTION_ORDER[max] ? v.action : max),
    violations[0].action,
  )

  const shouldEscalateToOwner = activeRules
    .filter((r) => violations.some((v) => v.ruleId === r.id))
    .some((r) => r.escalateToOwner)

  const notifyRoles = [
    ...new Set(
      activeRules
        .filter((r) => violations.some((v) => v.ruleId === r.id))
        .flatMap((r) => r.notifyRoles),
    ),
  ]

  return {
    passed: highestAction === "LOG" || highestAction === "WARN",
    violations,
    highestSeverity,
    highestAction,
    shouldEscalateToOwner,
    notifyRoles,
  }
}

// ── Immune Pattern Detection ─────────────────────────────────────────────────

export interface ImmunePatternInput {
  patternType: string
  patternKey: string
  occurrenceCount: number
  threshold: number
  autoBlock: boolean
}

export interface ImmuneCheckResult {
  isKnownPattern: boolean
  shouldAutoBlock: boolean
  patternKey: string
  occurrenceCount: number
}

export function checkImmuneMemory(
  patterns: ImmunePatternInput[],
  violationKeywords: string[],
  sourceType: string,
): ImmuneCheckResult[] {
  const results: ImmuneCheckResult[] = []

  for (const p of patterns) {
    // Match pe keywords sau sourceType
    const keyLower = p.patternKey.toLowerCase()
    const matchesKw = violationKeywords.some((kw) => kw.toLowerCase() === keyLower)
    const matchesSrc = keyLower === sourceType.toLowerCase()

    if (matchesKw || matchesSrc) {
      results.push({
        isKnownPattern: true,
        shouldAutoBlock: p.autoBlock && p.occurrenceCount >= p.threshold,
        patternKey: p.patternKey,
        occurrenceCount: p.occurrenceCount,
      })
    }
  }

  return results
}
