/**
 * E1 — Resource Meter (Metabolism Layer)
 *
 * Funcții pure pentru calculul consumului de resurse per agent
 * și verificarea bugetelor.
 *
 * Livrat: 06.04.2026, Stratul E1 "Living Organization".
 */

// ── Tipuri ────────────────────────────────────────────────────────────────────

export interface ResourceUsageInput {
  agentRole: string
  actionType: string
  llmTokensIn: number
  llmTokensOut: number
  llmCostUsd: number
  dbQueries: number
  durationMs: number
  measuredAt: Date | string
}

export interface ResourceBudgetInput {
  agentRole: string
  maxLlmTokensPerDay: number
  maxLlmCostPerDay: number
  maxCyclesPerDay: number
  maxDurationMsPerDay: number
  usedLlmTokens: number
  usedLlmCost: number
  usedCycles: number
  usedDurationMs: number
  lastResetAt: Date | string
  priority: number
}

export interface AgentResourceSummary {
  agentRole: string
  totalTokens: number
  totalCostUsd: number
  totalCycles: number
  totalDurationMs: number
  avgCostPerCycle: number
  avgDurationPerCycle: number
  topActionTypes: Array<{ actionType: string; count: number; totalCost: number }>
}

export interface BudgetCheck {
  agentRole: string
  withinBudget: boolean
  tokensUsedPct: number
  costUsedPct: number
  cyclesUsedPct: number
  durationUsedPct: number
  limitReached: string[]  // care limite sunt atinse
  priority: number
}

export interface ResourceNegotiationProposal {
  requestorRole: string
  donorRole: string | null
  resourceType: string
  amountRequested: number
  reason: string
}

// ── Agregare ─────────────────────────────────────────────────────────────────

export function aggregateUsage(
  usages: ResourceUsageInput[],
  windowMs: number = 24 * 60 * 60 * 1000, // 24h
): AgentResourceSummary[] {
  const now = Date.now()
  const cutoff = now - windowMs

  const filtered = usages.filter((u) => {
    const t = typeof u.measuredAt === "string" ? new Date(u.measuredAt).getTime() : u.measuredAt.getTime()
    return t >= cutoff
  })

  const byAgent = new Map<string, ResourceUsageInput[]>()
  for (const u of filtered) {
    const arr = byAgent.get(u.agentRole) || []
    arr.push(u)
    byAgent.set(u.agentRole, arr)
  }

  const summaries: AgentResourceSummary[] = []
  for (const [role, entries] of byAgent) {
    const totalTokens = entries.reduce((s, e) => s + e.llmTokensIn + e.llmTokensOut, 0)
    const totalCostUsd = entries.reduce((s, e) => s + e.llmCostUsd, 0)
    const totalCycles = entries.length
    const totalDurationMs = entries.reduce((s, e) => s + e.durationMs, 0)

    // Top action types
    const actionMap = new Map<string, { count: number; totalCost: number }>()
    for (const e of entries) {
      const prev = actionMap.get(e.actionType) || { count: 0, totalCost: 0 }
      actionMap.set(e.actionType, { count: prev.count + 1, totalCost: prev.totalCost + e.llmCostUsd })
    }
    const topActionTypes = [...actionMap.entries()]
      .map(([actionType, v]) => ({ actionType, ...v }))
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 5)

    summaries.push({
      agentRole: role,
      totalTokens,
      totalCostUsd: Math.round(totalCostUsd * 10000) / 10000,
      totalCycles,
      totalDurationMs,
      avgCostPerCycle: totalCycles > 0 ? Math.round((totalCostUsd / totalCycles) * 10000) / 10000 : 0,
      avgDurationPerCycle: totalCycles > 0 ? Math.round(totalDurationMs / totalCycles) : 0,
      topActionTypes,
    })
  }

  return summaries.sort((a, b) => b.totalCostUsd - a.totalCostUsd)
}

// ── Budget check ─────────────────────────────────────────────────────────────

export function checkBudgets(budgets: ResourceBudgetInput[]): BudgetCheck[] {
  return budgets.map((b) => {
    const tokensUsedPct = b.maxLlmTokensPerDay > 0
      ? Math.round((b.usedLlmTokens / b.maxLlmTokensPerDay) * 1000) / 10
      : 0
    const costUsedPct = b.maxLlmCostPerDay > 0
      ? Math.round((b.usedLlmCost / b.maxLlmCostPerDay) * 1000) / 10
      : 0
    const cyclesUsedPct = b.maxCyclesPerDay > 0
      ? Math.round((b.usedCycles / b.maxCyclesPerDay) * 1000) / 10
      : 0
    const durationUsedPct = b.maxDurationMsPerDay > 0
      ? Math.round((b.usedDurationMs / b.maxDurationMsPerDay) * 1000) / 10
      : 0

    const limitReached: string[] = []
    if (tokensUsedPct >= 100) limitReached.push("llm_tokens")
    if (costUsedPct >= 100) limitReached.push("llm_cost")
    if (cyclesUsedPct >= 100) limitReached.push("cycles")
    if (durationUsedPct >= 100) limitReached.push("duration")

    return {
      agentRole: b.agentRole,
      withinBudget: limitReached.length === 0,
      tokensUsedPct,
      costUsedPct,
      cyclesUsedPct,
      durationUsedPct,
      limitReached,
      priority: b.priority,
    }
  }).sort((a, b) => {
    // Sortare: over-budget first, apoi by priority descending
    if (a.withinBudget !== b.withinBudget) return a.withinBudget ? 1 : -1
    return b.priority - a.priority
  })
}

// ── Auto-negotiation proposals ───────────────────────────────────────────────

export function proposeNegotiations(
  checks: BudgetCheck[],
  budgets: ResourceBudgetInput[],
): ResourceNegotiationProposal[] {
  const proposals: ResourceNegotiationProposal[] = []
  const overBudget = checks.filter((c) => !c.withinBudget)
  const underBudget = checks.filter((c) => c.withinBudget && c.tokensUsedPct < 30)

  for (const over of overBudget) {
    const budget = budgets.find((b) => b.agentRole === over.agentRole)
    if (!budget) continue

    for (const limit of over.limitReached) {
      // Caută donor cu cel mai mic usage pe resursa respectivă
      const donor = underBudget[0]
      const donorBudget = donor ? budgets.find((b) => b.agentRole === donor.agentRole) : null

      let amountRequested = 0
      if (limit === "llm_tokens") amountRequested = Math.round(budget.maxLlmTokensPerDay * 0.2)
      else if (limit === "llm_cost") amountRequested = Math.round(budget.maxLlmCostPerDay * 0.2 * 100) / 100
      else if (limit === "cycles") amountRequested = Math.round(budget.maxCyclesPerDay * 0.2)
      else if (limit === "duration") amountRequested = Math.round(budget.maxDurationMsPerDay * 0.2)

      proposals.push({
        requestorRole: over.agentRole,
        donorRole: donorBudget?.agentRole ?? null,
        resourceType: limit,
        amountRequested,
        reason: `${over.agentRole} a atins limita ${limit} (${
          limit === "llm_tokens" ? over.tokensUsedPct
          : limit === "llm_cost" ? over.costUsedPct
          : limit === "cycles" ? over.cyclesUsedPct
          : over.durationUsedPct
        }%), priority=${over.priority}`,
      })
    }
  }

  return proposals
}
