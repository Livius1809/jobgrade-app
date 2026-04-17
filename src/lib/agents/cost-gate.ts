/**
 * cost-gate.ts — Componenta E: Cost-Aware Execution Gate
 *
 * Principiul P4 (discriminare model) + P5 (control cost):
 * - Operații simple → Haiku (cel mai ieftin)
 * - Complexitate reală → Sonnet sau Opus
 * - Verifică budget ÎNAINTE de execuție
 * - Estimează cost și alege model optimal
 */

import { checkBudgetAvailable } from "./execution-telemetry"

export interface CostGateResult {
  allowed: boolean
  recommendedModel: string // "claude-haiku-4-5-20251001" | "claude-sonnet-4-6" | "claude-opus-4-6"
  estimatedTokens: number
  estimatedCostUSD: number
  reason?: string // dacă NU e allowed
}

// Estimări tokens per tip task (calibrate din experiență)
const TOKEN_ESTIMATES: Record<string, { input: number; output: number }> = {
  KB_RESEARCH: { input: 5000, output: 3000 },
  KB_VALIDATION: { input: 3000, output: 2000 },
  DATA_ANALYSIS: { input: 15000, output: 10000 },
  CONTENT_CREATION: { input: 10000, output: 15000 },
  PROCESS_EXECUTION: { input: 20000, output: 15000 },
  REVIEW: { input: 10000, output: 5000 },
  INVESTIGATION: { input: 20000, output: 10000 },
  OUTREACH: { input: 5000, output: 8000 },
}

// Prețuri per model (USD per 1K tokens)
const MODEL_PRICES: Record<string, { input: number; output: number }> = {
  "claude-haiku-4-5-20251001": { input: 0.0008, output: 0.004 },
  "claude-sonnet-4-6": { input: 0.003, output: 0.015 },
  "claude-opus-4-6": { input: 0.015, output: 0.075 },
}

// Complexitate per tip task → model recomandat
const COMPLEXITY_MAP: Record<string, string> = {
  KB_RESEARCH: "claude-haiku-4-5-20251001",
  KB_VALIDATION: "claude-haiku-4-5-20251001",
  DATA_ANALYSIS: "claude-sonnet-4-6",
  CONTENT_CREATION: "claude-sonnet-4-6",
  PROCESS_EXECUTION: "claude-sonnet-4-6",
  REVIEW: "claude-haiku-4-5-20251001",
  INVESTIGATION: "claude-sonnet-4-6",
  OUTREACH: "claude-haiku-4-5-20251001",
}

// Override pe prioritate: CRITICAL → Sonnet minim
const PRIORITY_MODEL_FLOOR: Record<string, string> = {
  CRITICAL: "claude-sonnet-4-6",
  HIGH: "claude-haiku-4-5-20251001", // Haiku e suficient pt HIGH dacă task-ul nu e complex
  MEDIUM: "claude-haiku-4-5-20251001",
  LOW: "claude-haiku-4-5-20251001",
}

/**
 * Evaluează dacă execuția e permisă și alege modelul optimal.
 */
export async function evaluateCostGate(
  agentRole: string,
  taskType: string,
  priority: string,
  tags: string[] = []
): Promise<CostGateResult> {
  // 1. Alege modelul pe baza complexității
  let model = COMPLEXITY_MAP[taskType] ?? "claude-haiku-4-5-20251001"

  // 2. Override dacă prioritatea cere mai mult
  const floor = PRIORITY_MODEL_FLOOR[priority]
  if (floor && MODEL_PRICES[floor]) {
    const floorPrice = MODEL_PRICES[floor].input + MODEL_PRICES[floor].output
    const modelPrice = MODEL_PRICES[model].input + MODEL_PRICES[model].output
    if (floorPrice > modelPrice) {
      model = floor
    }
  }

  // 3. Override pe tags specifice
  if (tags.includes("legal") || tags.includes("client-facing") || tags.includes("strategy")) {
    // Task-uri sensibile: minim Sonnet
    if (model === "claude-haiku-4-5-20251001") {
      model = "claude-sonnet-4-6"
    }
  }

  // 4. Estimare tokens
  const estimate = TOKEN_ESTIMATES[taskType] ?? { input: 10000, output: 5000 }
  const totalTokens = estimate.input + estimate.output

  // 5. Estimare cost
  const prices = MODEL_PRICES[model]
  const costUSD = (estimate.input / 1000) * prices.input + (estimate.output / 1000) * prices.output

  // 6. Verifică budget
  const budgetCheck = await checkBudgetAvailable(agentRole, totalTokens)

  if (!budgetCheck.allowed) {
    return {
      allowed: false,
      recommendedModel: model,
      estimatedTokens: totalTokens,
      estimatedCostUSD: costUSD,
      reason: budgetCheck.reason,
    }
  }

  return {
    allowed: true,
    recommendedModel: model,
    estimatedTokens: totalTokens,
    estimatedCostUSD: costUSD,
  }
}
