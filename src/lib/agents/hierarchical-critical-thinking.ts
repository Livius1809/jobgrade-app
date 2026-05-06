/**
 * hierarchical-critical-thinking.ts — Critical thinking in hierarchical context (06.05.2026)
 *
 * Critical thinking in hierarchical context.
 *
 * Just as COG can contest Claude's response,
 * ANY agent can critically evaluate what their manager tells them.
 *
 * EMA can contest PMA: "this objective doesn't make sense given the current evaluation data"
 * QLA can contest COG: "this priority conflicts with quality standards we've established"
 * SOA can contest COCSA: "this client interaction approach contradicts what we learned from last session"
 *
 * This is NOT insubordination — it's CONSTRUCTIVE contestation.
 * The manager BENEFITS from subordinates who think critically.
 *
 * Implementation: ALL heuristic checks (KB queries + text analysis), ZERO extra Claude calls.
 * Mirrors the design of critical-thinker.ts but applied to manager→subordinate directives.
 */

import { prisma } from "@/lib/prisma"

// ── Types ──────────────────────────────────────────────────────────────────

export interface HierarchicalContestResult {
  verdict: "ACCEPT" | "CONTEST" | "SUGGEST_ALTERNATIVE"
  reasoning: string
  contestPoints?: string[]       // specific points of disagreement
  suggestedAlternative?: string  // what the agent would do instead
  kbEvidence?: string[]          // KB entries supporting the contestation
}

export interface ManagerDirectiveContext {
  recentKB: string[]          // agent's own validated knowledge
  activeObjectives: string[]  // what the agent is currently pursuing
  recentExperience: string[]  // recent task results
}

// ── Main evaluation function ──────────────────────────────────────────────

/**
 * Evaluates a manager's directive before executing it.
 *
 * FAST: all checks are heuristic (KB queries + text analysis).
 * ZERO additional Claude calls.
 *
 * Steps:
 * 1. Load agent's KB (validated knowledge in their domain)
 * 2. Check if directive contradicts any validated knowledge
 * 3. Check if directive conflicts with active objectives
 * 4. Check if recent experience suggests the directive won't work
 * 5. If issues found -> CONTEST with specific points + evidence from KB
 * 6. If agent has a better idea based on domain knowledge -> SUGGEST_ALTERNATIVE
 * 7. If no issues -> ACCEPT
 */
export async function evaluateManagerDirective(
  directive: string,
  agentRole: string,
  managerRole: string,
  agentContext: ManagerDirectiveContext,
): Promise<HierarchicalContestResult> {
  const contestPoints: string[] = []
  const kbEvidence: string[] = []

  // ── 1. Load agent's validated KB knowledge ──────────────────────────
  const agentKB = await loadAgentKB(agentRole)

  // ── 2. Check KB contradiction ──────────────────────────────────────
  const kbIssues = checkKBContradiction(directive, agentKB)
  for (const issue of kbIssues) {
    contestPoints.push(issue.point)
    if (issue.evidence) kbEvidence.push(issue.evidence)
  }

  // ── 3. Check objective conflict ────────────────────────────────────
  const objectiveIssues = checkObjectiveConflict(
    directive,
    agentContext.activeObjectives,
  )
  contestPoints.push(...objectiveIssues)

  // ── 4. Check recent experience ─────────────────────────────────────
  const experienceIssues = checkRecentExperience(
    directive,
    agentContext.recentExperience,
  )
  contestPoints.push(...experienceIssues)

  // ── 5. Check from inline KB context ────────────────────────────────
  const contextIssues = checkContextKB(directive, agentContext.recentKB)
  for (const issue of contextIssues) {
    contestPoints.push(issue.point)
    if (issue.evidence) kbEvidence.push(issue.evidence)
  }

  // ── 6. Determine verdict ───────────────────────────────────────────

  if (contestPoints.length === 0) {
    return {
      verdict: "ACCEPT",
      reasoning: `Directiva de la ${managerRole} este consistenta cu cunostintele, obiectivele si experienta ${agentRole}.`,
    }
  }

  // Check if agent has an alternative based on KB
  const alternative = findAlternative(directive, agentKB, agentContext)

  if (alternative) {
    return {
      verdict: "SUGGEST_ALTERNATIVE",
      reasoning: `${agentRole} contesta ${contestPoints.length} punct(e) din directiva ${managerRole} si propune o alternativa bazata pe cunostintele din domeniu.`,
      contestPoints,
      suggestedAlternative: alternative,
      kbEvidence: kbEvidence.length > 0 ? kbEvidence : undefined,
    }
  }

  return {
    verdict: "CONTEST",
    reasoning: `${agentRole} contesta ${contestPoints.length} punct(e) din directiva ${managerRole} pe baza cunostintelor validate si experientei recente.`,
    contestPoints,
    kbEvidence: kbEvidence.length > 0 ? kbEvidence : undefined,
  }
}

// ── KB loading ────────────────────────────────────────────────────────────

interface KBSnippet {
  content: string
  rule?: string
  antiPattern?: string
  confidence: number
}

async function loadAgentKB(agentRole: string): Promise<KBSnippet[]> {
  try {
    // Load validated KB entries for this specific agent
    const kbEntries = await prisma.kBEntry.findMany({
      where: {
        agentRole,
        status: "PERMANENT",
        confidence: { gte: 0.7 },
      },
      orderBy: { confidence: "desc" },
      take: 20,
      select: { content: true, confidence: true },
    })

    // Also load learning artifacts where this agent learned something
    const artifacts = await prisma.learningArtifact.findMany({
      where: {
        OR: [{ studentRole: agentRole }, { teacherRole: agentRole }],
        validated: true,
        effectivenessScore: { gte: 0.7 },
      },
      orderBy: { effectivenessScore: "desc" },
      take: 10,
      select: { rule: true, antiPattern: true, effectivenessScore: true },
    })

    const results: KBSnippet[] = [
      ...kbEntries.map((e) => ({
        content: e.content,
        confidence: e.confidence,
      })),
      ...artifacts.map((a) => ({
        content: a.rule,
        rule: a.rule,
        antiPattern: a.antiPattern ?? undefined,
        confidence: a.effectivenessScore,
      })),
    ]

    return results
  } catch {
    return []
  }
}

// ── Check functions ───────────────────────────────────────────────────────

interface KBIssue {
  point: string
  evidence?: string
}

/**
 * Check if the directive contradicts the agent's validated knowledge.
 */
function checkKBContradiction(
  directive: string,
  agentKB: KBSnippet[],
): KBIssue[] {
  const issues: KBIssue[] = []
  const directiveLower = directive.toLowerCase()

  for (const kb of agentKB) {
    // Check anti-patterns: if directive matches a known anti-pattern
    if (kb.antiPattern) {
      const antiLower = kb.antiPattern.toLowerCase()
      const phrases = antiLower
        .split(/[.,;]/)
        .map((p) => p.trim())
        .filter((p) => p.length > 10)

      for (const phrase of phrases) {
        if (directiveLower.includes(phrase)) {
          issues.push({
            point: `Directiva contine un anti-pattern cunoscut: "${phrase.slice(0, 80)}"`,
            evidence: `Regula KB (conf=${kb.confidence.toFixed(2)}): ${(kb.rule ?? kb.content).slice(0, 200)}`,
          })
          break
        }
      }
    }

    // Check if directive directly contradicts known rules
    const contentLower = kb.content.toLowerCase()
    const negations = contentLower.match(/\bnu\s+\w+/g) ?? []
    for (const neg of negations) {
      const affirm = neg.replace(/^nu\s+/, "")
      if (
        affirm.length > 4 &&
        directiveLower.includes(affirm) &&
        !directiveLower.includes(neg)
      ) {
        const idx = directiveLower.indexOf(affirm)
        const surrounding = directiveLower.slice(
          Math.max(0, idx - 20),
          idx + affirm.length + 20,
        )
        if (!surrounding.includes("nu ") && !surrounding.includes("fara")) {
          issues.push({
            point: `Posibila contradictie: directiva afirma "${affirm}" dar KB-ul agentului spune "${neg}"`,
            evidence: `KB (conf=${kb.confidence.toFixed(2)}): ${kb.content.slice(0, 200)}`,
          })
          break
        }
      }
    }
  }

  return issues
}

/**
 * Check if the directive conflicts with the agent's active objectives.
 */
function checkObjectiveConflict(
  directive: string,
  activeObjectives: string[],
): string[] {
  const issues: string[] = []
  const directiveLower = directive.toLowerCase()

  // Detect contradictory direction indicators
  const directiveAsks = {
    increase: /\b(creste|mareste|amplifica|accelereaza|increase|boost|grow)\b/i,
    decrease: /\b(reduce|scade|micsoreaza|limiteaza|decrease|cut|lower)\b/i,
    stop: /\b(opreste|anuleaza|renunta|abandoneaza|stop|cancel|abandon)\b/i,
    start: /\b(incepe|lanseaza|initializeaza|start|launch|begin)\b/i,
  }

  for (const obj of activeObjectives) {
    const objLower = obj.toLowerCase()

    // If directive says "stop X" but objective says "start/increase X" (or vice versa)
    for (const [action, pattern] of Object.entries(directiveAsks)) {
      if (pattern.test(directiveLower)) {
        const opposites: Record<string, string[]> = {
          increase: ["decrease", "reduce", "scade"],
          decrease: ["increase", "creste", "mareste"],
          stop: ["start", "incepe", "lanseaza"],
          start: ["stop", "opreste", "anuleaza"],
        }
        const opp = opposites[action] ?? []
        for (const oppWord of opp) {
          if (objLower.includes(oppWord)) {
            // Extract the subject being acted upon
            const directiveSubject = directiveLower.slice(
              directiveLower.search(pattern),
            ).slice(0, 60)
            const objSubject = objLower.slice(0, 60)

            // Check if they refer to similar subjects (keyword overlap)
            const directiveWords = new Set(directiveSubject.split(/\s+/).filter((w) => w.length > 3))
            const objWords = objSubject.split(/\s+/).filter((w) => w.length > 3)
            const overlap = objWords.filter((w) => directiveWords.has(w))

            if (overlap.length > 0) {
              issues.push(
                `Conflict cu obiectivul activ: directiva cere "${action}" dar obiectivul meu cere opusul (${opp.join("/")}). Overlap: ${overlap.join(", ")}`,
              )
            }
          }
        }
      }
    }
  }

  return issues
}

/**
 * Check if recent experience suggests the directive won't work.
 */
function checkRecentExperience(
  directive: string,
  recentExperience: string[],
): string[] {
  const issues: string[] = []
  const directiveLower = directive.toLowerCase()

  // Look for failure markers in recent experience that relate to the directive
  const failureMarkers = [
    /\bfailed\b/i,
    /\besuat\b/i,
    /\bnu\s+a\s+functionat\b/i,
    /\bblocked\b/i,
    /\bblocat\b/i,
    /\bimpossib\w+\b/i,
    /\berror\b/i,
    /\beroare\b/i,
    /\brejected\b/i,
    /\brespins\b/i,
  ]

  for (const exp of recentExperience) {
    const expLower = exp.toLowerCase()

    // Check if recent experience had failures related to similar tasks
    const hasFailed = failureMarkers.some((m) => m.test(expLower))
    if (!hasFailed) continue

    // Check keyword overlap between directive and failed experience
    const directiveWords = new Set(
      directiveLower.split(/\s+/).filter((w) => w.length > 4),
    )
    const expWords = expLower.split(/\s+/).filter((w) => w.length > 4)
    const overlap = expWords.filter((w) => directiveWords.has(w))

    if (overlap.length >= 2) {
      issues.push(
        `Experienta recenta arata ca o sarcina similara a esuat (cuvinte comune: ${overlap.slice(0, 5).join(", ")}). Experienta: "${exp.slice(0, 150)}"`,
      )
    }
  }

  return issues
}

/**
 * Check agent's inline KB context for contradictions with the directive.
 */
function checkContextKB(
  directive: string,
  recentKB: string[],
): KBIssue[] {
  const issues: KBIssue[] = []
  const directiveLower = directive.toLowerCase()

  for (const kb of recentKB) {
    const kbLower = kb.toLowerCase()

    // Simple contradiction detection: KB says "nu X" but directive says "X"
    const negations = kbLower.match(/\bnu\s+\w+/g) ?? []
    for (const neg of negations) {
      const affirm = neg.replace(/^nu\s+/, "")
      if (
        affirm.length > 4 &&
        directiveLower.includes(affirm) &&
        !directiveLower.includes(neg)
      ) {
        issues.push({
          point: `Cunostinta recenta spune "${neg}" dar directiva implica "${affirm}"`,
          evidence: kb.slice(0, 200),
        })
        break
      }
    }
  }

  return issues
}

// ── Alternative finder ────────────────────────────────────────────────────

/**
 * Try to find an alternative approach based on the agent's domain knowledge.
 * Returns null if no clear alternative exists.
 */
function findAlternative(
  directive: string,
  agentKB: KBSnippet[],
  context: ManagerDirectiveContext,
): string | null {
  // Look for KB entries with high confidence that suggest a different approach
  // for the subject matter of the directive
  const directiveLower = directive.toLowerCase()
  const directiveWords = new Set(
    directiveLower.split(/\s+/).filter((w) => w.length > 4),
  )

  const relevantKB = agentKB
    .filter((kb) => {
      const kbWords = kb.content.toLowerCase().split(/\s+/).filter((w) => w.length > 4)
      const overlap = kbWords.filter((w) => directiveWords.has(w))
      return overlap.length >= 2 && kb.confidence >= 0.8
    })
    .sort((a, b) => b.confidence - a.confidence)

  if (relevantKB.length === 0) return null

  // If we found highly relevant KB with high confidence, it suggests an alternative
  const bestKB = relevantKB[0]
  return `Pe baza cunostintelor validate (conf=${bestKB.confidence.toFixed(2)}): ${bestKB.content.slice(0, 300)}`
}

// ── Build context from DB ─────────────────────────────────────────────────

/**
 * Builds agent context from DB for use in evaluateManagerDirective.
 * Call this before evaluateManagerDirective when context is not available.
 */
export async function buildAgentContext(
  agentRole: string,
): Promise<ManagerDirectiveContext> {
  try {
    const [kbEntries, objectives, recentTasks] = await Promise.all([
      // Recent KB entries for this agent
      prisma.kBEntry.findMany({
        where: { agentRole, status: "PERMANENT" },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { content: true },
      }),
      // Active objectives — find those linked to this agent via tasks
      prisma.organizationalObjective.findMany({
        where: { completedAt: null },
        take: 10,
        select: { title: true, description: true },
      }),
      // Recent completed tasks
      prisma.agentTask.findMany({
        where: { assignedTo: agentRole, status: "COMPLETED" },
        orderBy: { completedAt: "desc" },
        take: 10,
        select: { title: true, result: true },
      }),
    ])

    return {
      recentKB: kbEntries.map((e) => e.content),
      activeObjectives: objectives.map(
        (o) => `${o.title}: ${(o.description ?? "").slice(0, 100)}`,
      ),
      recentExperience: recentTasks.map(
        (t) => `${t.title}: ${(t.result ?? "").slice(0, 100)}`,
      ),
    }
  } catch {
    return { recentKB: [], activeObjectives: [], recentExperience: [] }
  }
}
