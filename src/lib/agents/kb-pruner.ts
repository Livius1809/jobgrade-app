/**
 * F1 — KB Pruner (Evolution Layer)
 *
 * Funcție pură care identifică candidați la pruning din KB entries.
 * Bazat pe usage, success rate, vârstă, redundanță.
 *
 * Livrat: 06.04.2026, Stratul F1 "Living Organization".
 */

// ── Tipuri ────────────────────────────────────────────────────────────────────

export type PruneReason = "UNUSED_90D" | "LOW_SUCCESS_RATE" | "SUPERSEDED" | "CONTRADICTED" | "EXPIRED"

export interface KBEntryForPruning {
  id: string
  title: string
  agentRole: string
  tags: string[]
  usageCount: number
  successRate: number | null  // 0-100, null = necunoscut
  createdAt: Date | string
  lastUsedAt: Date | string | null
  validatedAt: Date | string | null
  status: string
}

export interface PruneCandidateOutput {
  entityType: "kb_entry"
  entityId: string
  entityTitle: string
  reason: PruneReason
  score: number  // 0-100, mai mare = mai candidat la ștergere
  metrics: {
    usageCount: number
    daysSinceUsed: number | null
    daysSinceCreated: number
    successRate: number | null
    hasNewerWithSameTags: boolean
  }
}

export interface PruneConfig {
  unusedDays: number          // default 90
  lowSuccessThreshold: number // default 20 (%)
  minAgeForPruning: number    // default 30 (zile) — nu prune-ui entry-uri noi
}

const DEFAULT_CONFIG: PruneConfig = {
  unusedDays: 90,
  lowSuccessThreshold: 20,
  minAgeForPruning: 30,
}

// ── Scoring ──────────────────────────────────────────────────────────────────

function daysBetween(from: Date | string, to: Date): number {
  const f = typeof from === "string" ? new Date(from) : from
  return Math.floor((to.getTime() - f.getTime()) / (24 * 60 * 60 * 1000))
}

function computePruneScore(
  reason: PruneReason,
  daysSinceUsed: number | null,
  daysSinceCreated: number,
  usageCount: number,
  successRate: number | null,
): number {
  let score = 0

  switch (reason) {
    case "UNUSED_90D":
      // Baza: 60 puncte + bonus per fiecare 30 zile extra
      score = 60 + Math.min(40, Math.floor(((daysSinceUsed ?? daysSinceCreated) - 90) / 30) * 10)
      break
    case "LOW_SUCCESS_RATE":
      // Inversul success rate-ului: 0% → 80, 20% → 60
      score = 80 - (successRate ?? 0) * 1
      break
    case "SUPERSEDED":
      // Fix 70 (confirmabil de Owner)
      score = 70
      break
    case "CONTRADICTED":
      score = 75
      break
    case "EXPIRED":
      score = 85
      break
  }

  // Bonus dacă usage count = 0
  if (usageCount === 0) score += 10

  return Math.min(100, Math.max(0, score))
}

// ── Detector principal ───────────────────────────────────────────────────────

export function detectPruneCandidates(
  entries: KBEntryForPruning[],
  config: Partial<PruneConfig> = {},
): PruneCandidateOutput[] {
  const cfg = { ...DEFAULT_CONFIG, ...config }
  const now = new Date()
  const candidates: PruneCandidateOutput[] = []

  // Index tags → entries (pentru detectare superseded)
  const tagIndex = new Map<string, KBEntryForPruning[]>()
  for (const e of entries) {
    for (const tag of e.tags) {
      const arr = tagIndex.get(tag) || []
      arr.push(e)
      tagIndex.set(tag, arr)
    }
  }

  for (const entry of entries) {
    const daysSinceCreated = daysBetween(entry.createdAt, now)
    if (daysSinceCreated < cfg.minAgeForPruning) continue

    const daysSinceUsed = entry.lastUsedAt ? daysBetween(entry.lastUsedAt, now) : null
    const effectiveDaysSinceUsed = daysSinceUsed ?? daysSinceCreated

    // Check: entry-uri mai noi cu aceleași tags?
    const hasNewerWithSameTags = entry.tags.some((tag) => {
      const peers = tagIndex.get(tag) || []
      return peers.some((p) =>
        p.id !== entry.id &&
        new Date(p.createdAt).getTime() > new Date(entry.createdAt).getTime() &&
        (p.usageCount > entry.usageCount || (p.successRate ?? 0) > (entry.successRate ?? 0)),
      )
    })

    let reason: PruneReason | null = null

    // R1: Unused 90 days
    if (effectiveDaysSinceUsed >= cfg.unusedDays && entry.usageCount === 0) {
      reason = "UNUSED_90D"
    }
    // R2: Low success rate (doar dacă au suficiente utilizări)
    else if (
      entry.successRate !== null &&
      entry.successRate < cfg.lowSuccessThreshold &&
      entry.usageCount >= 3
    ) {
      reason = "LOW_SUCCESS_RATE"
    }
    // R3: Superseded (entry mai vechi cu aceleași tags, entry mai nou mai performant)
    else if (hasNewerWithSameTags && effectiveDaysSinceUsed >= 30) {
      reason = "SUPERSEDED"
    }

    if (!reason) continue

    const score = computePruneScore(
      reason,
      daysSinceUsed,
      daysSinceCreated,
      entry.usageCount,
      entry.successRate,
    )

    candidates.push({
      entityType: "kb_entry",
      entityId: entry.id,
      entityTitle: entry.title,
      reason,
      score,
      metrics: {
        usageCount: entry.usageCount,
        daysSinceUsed,
        daysSinceCreated,
        successRate: entry.successRate,
        hasNewerWithSameTags,
      },
    })
  }

  return candidates.sort((a, b) => b.score - a.score)
}

// ── Propagare selectivă (F2) ─────────────────────────────────────────────────

export interface PropagationCandidate {
  sourceRole: string
  sourceType: "kb_entry" | "behavior_patch"
  sourceId: string
  targetRoles: string[]
  successMetric: string
  improvementPct: number
}

export function detectPropagationCandidates(
  entries: KBEntryForPruning[],
  agentRoles: string[],
  config: { minSuccessRate: number; minUsageCount: number } = { minSuccessRate: 80, minUsageCount: 5 },
): PropagationCandidate[] {
  const candidates: PropagationCandidate[] = []

  // Găsește entries cu success rate ridicat, folosite des
  const highPerformers = entries.filter(
    (e) =>
      e.successRate !== null &&
      e.successRate >= config.minSuccessRate &&
      e.usageCount >= config.minUsageCount,
  )

  for (const entry of highPerformers) {
    // Target: agenți cu aceleași tags care NU au deja entry-ul
    const targetRoles = agentRoles.filter(
      (role) =>
        role !== entry.agentRole &&
        !entries.some(
          (other) =>
            other.agentRole === role &&
            other.tags.some((t) => entry.tags.includes(t)) &&
            (other.successRate ?? 0) >= config.minSuccessRate,
        ),
    )

    if (targetRoles.length > 0) {
      candidates.push({
        sourceRole: entry.agentRole,
        sourceType: "kb_entry",
        sourceId: entry.id,
        targetRoles,
        successMetric: "success_rate",
        improvementPct: entry.successRate!,
      })
    }
  }

  return candidates.sort((a, b) => b.improvementPct - a.improvementPct)
}
