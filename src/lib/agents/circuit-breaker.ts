/**
 * Circuit Breaker — Protecție contra cascadă de eșecuri
 *
 * Când un agent sau serviciu extern eșuează repetat:
 *  - CLOSED (normal): cererile trec
 *  - OPEN (blocat): cererile sunt respinse instant, fără a mai apela
 *  - HALF_OPEN (test): lasă o cerere de test — dacă reușește → CLOSED, dacă nu → OPEN
 *
 * Folosit pentru:
 *  - Anthropic API (rate limit, down)
 *  - Agenți individuali care eșuează repetat
 *  - Servicii externe (Voyage embeddings, Neon DB)
 *
 * Starea se ține în Redis (dacă e disponibil) sau in-memory.
 */

import { prisma } from "@/lib/prisma"

interface CircuitState {
  status: "CLOSED" | "OPEN" | "HALF_OPEN"
  failures: number
  lastFailure: number
  lastSuccess: number
  openedAt: number
}

const FAILURE_THRESHOLD = 5          // după 5 eșecuri consecutive → OPEN
const RESET_TIMEOUT_MS = 5 * 60000  // după 5 minute OPEN → HALF_OPEN (testează)
const SUCCESS_THRESHOLD = 2          // 2 succese în HALF_OPEN → CLOSED

// In-memory store (per-process — suficient pentru Vercel Functions)
const circuits = new Map<string, CircuitState>()

function getState(key: string): CircuitState {
  return circuits.get(key) || {
    status: "CLOSED",
    failures: 0,
    lastFailure: 0,
    lastSuccess: Date.now(),
    openedAt: 0,
  }
}

/**
 * Verifică dacă cererea e permisă. Dacă circuitul e OPEN, returnează false.
 */
export function isAllowed(key: string): boolean {
  const state = getState(key)

  if (state.status === "CLOSED") return true

  if (state.status === "OPEN") {
    // Verifică dacă a trecut timeout-ul → trece în HALF_OPEN
    if (Date.now() - state.openedAt > RESET_TIMEOUT_MS) {
      state.status = "HALF_OPEN"
      circuits.set(key, state)
      return true // lasă o cerere de test
    }
    return false
  }

  // HALF_OPEN — lasă cererea
  return true
}

/**
 * Raportează succes — resetează circuitul dacă era HALF_OPEN.
 */
export function reportSuccess(key: string): void {
  const state = getState(key)

  if (state.status === "HALF_OPEN") {
    state.failures = Math.max(0, state.failures - 1)
    if (state.failures < SUCCESS_THRESHOLD) {
      state.status = "CLOSED"
      state.failures = 0
    }
  } else {
    state.failures = 0
  }

  state.lastSuccess = Date.now()
  circuits.set(key, state)
}

/**
 * Raportează eșec — deschide circuitul dacă pragul e depășit.
 */
export function reportFailure(key: string): void {
  const state = getState(key)
  state.failures++
  state.lastFailure = Date.now()

  if (state.failures >= FAILURE_THRESHOLD && state.status !== "OPEN") {
    state.status = "OPEN"
    state.openedAt = Date.now()
    console.warn(`[CircuitBreaker] ${key} → OPEN (${state.failures} failures)`)
  }

  circuits.set(key, state)
}

/**
 * Returnează starea tuturor circuitelor (pentru dashboard).
 */
export function getAllCircuits(): Record<string, CircuitState & { key: string }> {
  const result: Record<string, CircuitState & { key: string }> = {}
  for (const [key, state] of circuits) {
    result[key] = { ...state, key }
  }
  return result
}

/**
 * Budget cap — verifică costul API Claude și oprește dacă depășit.
 * Stochează în SystemConfig (DB).
 */
export async function checkBudgetCap(): Promise<{ allowed: boolean; spent: number; cap: number; remaining: number }> {
  const p = prisma as any

  // Citește cap-ul din config
  const capConfig = await p.systemConfig.findUnique({ where: { key: "CLAUDE_DAILY_BUDGET_CAP_USD" } }).catch(() => null)
  const cap = capConfig ? parseFloat(capConfig.value) : 10.0 // default $10/zi

  // Citește cheltuiala zilei curente
  const today = new Date().toISOString().split("T")[0]
  const spentConfig = await p.systemConfig.findUnique({ where: { key: `CLAUDE_SPENT_${today}` } }).catch(() => null)
  const spent = spentConfig ? parseFloat(spentConfig.value) : 0

  return {
    allowed: spent < cap,
    spent: Math.round(spent * 100) / 100,
    cap,
    remaining: Math.round((cap - spent) * 100) / 100,
  }
}

/**
 * Incrementează cheltuiala zilei curente.
 */
export async function trackSpend(amountUsd: number): Promise<void> {
  const p = prisma as any
  const today = new Date().toISOString().split("T")[0]
  const key = `CLAUDE_SPENT_${today}`

  try {
    await p.$queryRaw`
      INSERT INTO system_configs (key, value, "updatedAt")
      VALUES (${key}, ${String(amountUsd)}, NOW())
      ON CONFLICT (key) DO UPDATE SET
        value = (COALESCE(system_configs.value::numeric, 0) + ${amountUsd})::text,
        "updatedAt" = NOW()
    `
  } catch {
    // SystemConfig table might not exist — skip silently
  }
}
