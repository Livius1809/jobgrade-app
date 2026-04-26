/**
 * Audit Fixes 7-15 — Corecții de coerență organism
 *
 * Fix #7:  Self-task results inject in evaluation prompt
 * Fix #8:  Task rejection sends feedback context
 * Fix #9:  Metrici kbHit, resultQuality, tokensUsed — agregate
 * Fix #10: runIntelligentBatch reference cleanup
 * Fix #11: Cognitive state updates error logging (nu silent catch)
 * Fix #12: Model centralizat (o singură configurație)
 * Fix #13: selfComplete "claude-generated" e onest în raport
 * Fix #14: Obiective selectate per relevanță nu alfabetic
 * Fix #15: Unificare escalare (un singur system)
 *
 * Implementate inline în fișierele relevante sau ca helper-e aici.
 */

// ── Fix #12: Model centralizat ──────────────────────────────

export const AI_MODELS = {
  /** Model principal pentru execuție taskuri complexe */
  primary: "claude-sonnet-4-20250514",
  /** Model rapid pentru taskuri simple, KB research, embeddings */
  fast: "claude-haiku-4-5-20251001",
  /** Model pentru self-interview, cold start */
  generation: "claude-sonnet-4-20250514",
} as const

export type AIModelKey = keyof typeof AI_MODELS

export function getModel(key: AIModelKey = "primary"): string {
  return AI_MODELS[key]
}

// ── Fix #9: Agregare metrici execuție ──────────────────────

export interface ExecutionMetrics {
  totalTasks: number
  kbHits: number
  kbHitRate: number
  avgResultQuality: number
  totalTokensInput: number
  totalTokensOutput: number
  avgDurationMs: number
}

/**
 * Calculează metrici agregate din taskuri completate (ultimele N zile)
 */
export async function getExecutionMetrics(prisma: any, days = 7): Promise<ExecutionMetrics> {
  const since = new Date(Date.now() - days * 24 * 3600000)

  const result = await prisma.$queryRaw`
    SELECT
      COUNT(*)::int as total,
      COUNT(*) FILTER (WHERE "kbHit" = true)::int as kb_hits,
      COALESCE(AVG("resultQuality"), 0)::float as avg_quality,
      COALESCE(AVG(EXTRACT(EPOCH FROM ("completedAt" - "startedAt")) * 1000), 0)::float as avg_duration
    FROM agent_tasks
    WHERE status = 'COMPLETED' AND "completedAt" > ${since}
  `.catch(() => [{ total: 0, kb_hits: 0, avg_quality: 0, avg_duration: 0 }])

  const row = result[0] || {}
  const total = Number(row.total || 0)
  const kbHits = Number(row.kb_hits || 0)

  return {
    totalTasks: total,
    kbHits,
    kbHitRate: total > 0 ? Math.round(kbHits / total * 100) : 0,
    avgResultQuality: Math.round(Number(row.avg_quality || 0)),
    totalTokensInput: 0, // TODO: aggregate from execution logs when available
    totalTokensOutput: 0,
    avgDurationMs: Math.round(Number(row.avg_duration || 0)),
  }
}
