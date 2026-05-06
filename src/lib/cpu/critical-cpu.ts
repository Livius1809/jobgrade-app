/**
 * critical-cpu.ts — cpuCall cu Critical Thinking Layer (06.05.2026)
 *
 * Wrapper peste cpuCall care adaugă evaluare critică ÎNAINTE de acceptare.
 *
 * Folosește-l în loc de cpuCall brut când răspunsul va fi ACȚIONAT
 * (nu pentru interogări informaționale sau distilare).
 *
 * Flux:
 *  1. cpuCall() → răspuns brut
 *  2. evaluateCritically() → verdict
 *  3. Dacă CONTEST → reformulare automată (un retry cu feedback)
 *  4. Dacă REJECT → returnează cu escalare
 *  5. Dacă ACCEPT/FLAG → returnează cu metadata
 */

import { cpuCall, type CPUCallParams, type CPUCallResult } from "./gateway"
import { evaluateCritically, type CriticalEvaluation } from "./critical-thinker"
import { enrichMessagesWithContext } from "./contextual-enrichment"

// ── Types ──────────────────────────────────────────────────────────────────

export interface CriticalCpuResult extends CPUCallResult {
  evaluation: CriticalEvaluation
  reformulated: boolean
}

// ── Skip patterns for cheap/internal operations ───────────────────────────

const SKIP_CRITICAL_OPS = new Set([
  "distill",
  "distill-session",
  "internal",
  "internal-sync",
  "alignment-check",
  "kb-save",
  "learning",
  "learning-funnel",
  "health-check",
  "metric-collect",
])

function shouldSkipCritical(operationType?: string): boolean {
  if (!operationType) return false
  return SKIP_CRITICAL_OPS.has(operationType) ||
    operationType.includes("distill") ||
    operationType.includes("internal")
}

// ── criticalCpuCall ───────────────────────────────────────────────────────

/**
 * cpuCall cu critical thinking layer.
 *
 * Folosește-l în loc de cpuCall brut când răspunsul va fi ACȚIONAT
 * (nu pentru interogări informaționale sau distilare).
 */
export async function criticalCpuCall(
  params: CPUCallParams
): Promise<CriticalCpuResult> {
  // ── PRE-CALL: Contextual enrichment ────────────────────────────────────
  // Enrich the prompt with agent's context BEFORE sending to Claude.
  // Skip enrichment for cheap/internal operations (same logic as critical eval skip).
  let enrichedParams = params
  if (!shouldSkipCritical(params.operationType) && params.messages?.length > 0) {
    try {
      const enrichedMessages = await enrichMessagesWithContext(
        params.messages,
        params.agentRole,
        params.tenantId,
      )
      enrichedParams = { ...params, messages: enrichedMessages }
    } catch {
      // Enrichment failed — proceed with original params
      enrichedParams = params
    }
  }

  const rawResult = await cpuCall(enrichedParams)

  // Skip critical evaluation for cheap/internal operations or degraded responses
  if (shouldSkipCritical(params.operationType) || rawResult.degraded || !rawResult.text) {
    return {
      ...rawResult,
      evaluation: {
        verdict: "ACCEPT",
        confidence: 1,
        issues: [],
        suggestedAction: "use_as_is",
      },
      reformulated: false,
    }
  }

  const evaluation = await evaluateCritically(rawResult.text, {
    agentRole: params.agentRole,
    originalPrompt: params.messages?.[0]?.content?.toString(),
  })

  // ── CONTEST: try reformulation (one retry with critical feedback) ───
  if (evaluation.verdict === "CONTEST") {
    try {
      const feedbackMessage = evaluation.issues
        .filter((i) => i.severity === "HIGH" || i.severity === "MEDIUM")
        .map((i) => {
          const evidence = i.contradictingEvidence
            ? ` (evidență: ${i.contradictingEvidence.slice(0, 100)})`
            : ""
          return `[${i.type}] ${i.description}${evidence}`
        })
        .join("; ")

      const reformulated = await cpuCall({
        ...params,
        messages: [
          ...params.messages,
          { role: "assistant", content: rawResult.text },
          {
            role: "user",
            content: `Evaluare critică: ${feedbackMessage}. Te rog reformulează ținând cont de aceste obiecții.`,
          },
        ],
      })

      return {
        ...reformulated,
        evaluation,
        reformulated: true,
      }
    } catch {
      // Reformulation failed — return original with evaluation
      return {
        ...rawResult,
        evaluation,
        reformulated: false,
      }
    }
  }

  return {
    ...rawResult,
    evaluation,
    reformulated: false,
  }
}
