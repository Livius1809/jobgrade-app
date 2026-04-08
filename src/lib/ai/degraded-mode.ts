/**
 * Degraded Mode for Anthropic API Unavailability (VUL-028, BUILD-003)
 *
 * Option B: degraded mode with honest message to client.
 * - Health check with 60s cache
 * - Per-agent-role degraded responses (RO/EN)
 * - Wrapper that catches failures and returns degraded response
 * - In-memory cache for frequent commercial knowledge responses
 */

import Anthropic from "@anthropic-ai/sdk"
import { anthropic, AI_MODEL } from "./client"

// ── Types ──────────────────────────────────────────────────────────────────

export interface HealthStatus {
  available: boolean
  lastCheck: Date
  consecutiveFailures: number
}

export interface ClaudeCallParams {
  model?: string
  max_tokens: number
  system: string
  messages: Array<{ role: "user" | "assistant"; content: string }>
  agentRole: string
  language?: "ro" | "en"
}

export interface ClaudeCallResult {
  text: string
  degraded: boolean
  fromCache?: boolean
}

interface CachedResponse {
  text: string
  cachedAt: number
}

// ── Constants ──────────────────────────────────────────────────────────────

const HEALTH_CHECK_TTL_MS = 60_000 // 60 seconds
const CIRCUIT_BREAKER_THRESHOLD = 3 // consecutive failures before circuit opens
const CIRCUIT_BREAKER_COOLDOWN_MS = 5 * 60_000 // 5 minutes
const COMMERCIAL_CACHE_TTL_MS = 24 * 60 * 60_000 // 24 hours
const SUPPORT_EMAIL = "suport@jobgrade.ro"

// ── State (module-level singletons) ────────────────────────────────────────

let healthStatus: HealthStatus = {
  available: true,
  lastCheck: new Date(0), // force first check
  consecutiveFailures: 0,
}

let circuitOpenedAt: number | null = null

const commercialCache = new Map<string, CachedResponse>()

// ── 1. Anthropic Health Check ──────────────────────────────────────────────

/**
 * Quick health check against the Anthropic API.
 * Result is cached for 60 seconds to avoid hammering the API.
 */
export async function checkAnthropicHealth(): Promise<HealthStatus> {
  const now = Date.now()

  // Return cached result if still fresh
  if (now - healthStatus.lastCheck.getTime() < HEALTH_CHECK_TTL_MS) {
    return { ...healthStatus }
  }

  try {
    // Minimal API call — 1 token, cheapest possible
    await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 1,
      messages: [{ role: "user", content: "ping" }],
    })

    healthStatus = {
      available: true,
      lastCheck: new Date(),
      consecutiveFailures: 0,
    }
    circuitOpenedAt = null

    console.log("[DegradedMode] Anthropic health check: OK")
  } catch (error) {
    healthStatus = {
      available: false,
      lastCheck: new Date(),
      consecutiveFailures: healthStatus.consecutiveFailures + 1,
    }

    const errorName = error instanceof Error ? error.constructor.name : "Unknown"
    console.error(
      `[DegradedMode] Anthropic health check FAILED (${errorName}), ` +
      `consecutive failures: ${healthStatus.consecutiveFailures}`
    )
  }

  return { ...healthStatus }
}

// ── 2. Degraded Mode Responses ─────────────────────────────────────────────

interface DegradedMessages {
  ro: string
  en: string
}

const BASE_MESSAGES: DegradedMessages = {
  ro: `Serviciul funcționează momentan cu capacitate redusă. Revenim cât de curând la capacitate completă. Te rugăm să încerci din nou în câteva minute. Dacă ai nevoie urgentă de ajutor, contactează-ne la ${SUPPORT_EMAIL}.`,
  en: `The service is currently running at reduced capacity. We will return to full capacity as soon as possible. Please try again in a few minutes. If you need urgent help, contact us at ${SUPPORT_EMAIL}.`,
}

const AGENT_SUFFIXES: Record<string, DegradedMessages> = {
  SOA: {
    ro: " Poți solicita și un callback — te vom contacta noi când serviciul revine.",
    en: " You can also request a callback — we will contact you when the service is back.",
  },
  CSA: {
    ro: " Alternativ, deschide un ticket de suport și vom reveni cu un răspuns cât de curând.",
    en: " Alternatively, open a support ticket and we will get back to you as soon as possible.",
  },
  CALAUZA: {
    ro: " Îți mulțumim pentru răbdare. Drumul tău nu se oprește aici — revino curând și continuăm împreună.",
    en: " Thank you for your patience. Your journey does not stop here — come back soon and we will continue together.",
  },
  PROFILER: {
    ro: " Profilul tău rămâne salvat. Poți reveni oricând pentru a continua.",
    en: " Your profile is saved. You can come back anytime to continue.",
  },
}

/**
 * Returns an appropriate degraded-mode message based on agent role and language.
 */
export function getDegradedModeResponse(
  agentRole: string,
  language: "ro" | "en" = "ro"
): string {
  const base = BASE_MESSAGES[language]
  const suffix = AGENT_SUFFIXES[agentRole]?.[language] ?? ""
  return base + suffix
}

// ── 3. Circuit Breaker Logic ───────────────────────────────────────────────

function isCircuitOpen(): boolean {
  if (healthStatus.consecutiveFailures < CIRCUIT_BREAKER_THRESHOLD) {
    return false
  }

  // Open circuit if threshold reached
  if (circuitOpenedAt === null) {
    circuitOpenedAt = Date.now()
    console.warn(
      `[DegradedMode] Circuit OPEN after ${healthStatus.consecutiveFailures} consecutive failures. ` +
      `Skipping Anthropic calls for ${CIRCUIT_BREAKER_COOLDOWN_MS / 1000}s.`
    )
  }

  // Check if cooldown period has elapsed
  const elapsed = Date.now() - circuitOpenedAt
  if (elapsed >= CIRCUIT_BREAKER_COOLDOWN_MS) {
    console.log("[DegradedMode] Circuit cooldown elapsed, allowing next attempt (half-open).")
    circuitOpenedAt = null
    // Keep consecutiveFailures — will be reset on success
    return false
  }

  return true
}

/**
 * Wraps an Anthropic API call with health check, circuit breaker, and degraded fallback.
 *
 * - If circuit is open (3+ consecutive failures within 5 min): returns degraded response immediately.
 * - If call fails: increments failure counter, returns degraded response.
 * - If call succeeds: resets failure counter, returns result.
 */
export async function callClaudeWithFallback(
  params: ClaudeCallParams
): Promise<ClaudeCallResult> {
  const language = params.language ?? "ro"

  // Circuit breaker — skip API call entirely if too many recent failures
  if (isCircuitOpen()) {
    console.warn(`[DegradedMode] Circuit open — returning degraded response for ${params.agentRole}`)
    logFailure(params.agentRole, "CIRCUIT_OPEN", "Circuit breaker active")
    return {
      text: getDegradedModeResponse(params.agentRole, language),
      degraded: true,
    }
  }

  // Try the actual Anthropic call
  try {
    const response = await anthropic.messages.create({
      model: params.model ?? AI_MODEL,
      max_tokens: params.max_tokens,
      system: params.system,
      messages: params.messages,
    })

    const text =
      response.content[0]?.type === "text" ? response.content[0].text : ""

    // Success — reset failure counter
    healthStatus.consecutiveFailures = 0
    circuitOpenedAt = null

    return { text, degraded: false }
  } catch (error) {
    // Increment failure counter
    healthStatus.consecutiveFailures += 1
    healthStatus.available = false
    healthStatus.lastCheck = new Date()

    const errorName = error instanceof Error ? error.constructor.name : "Unknown"
    const errorMessage = error instanceof Error ? error.message : String(error)

    console.error(
      `[DegradedMode] Anthropic call FAILED for ${params.agentRole}: ${errorName} — ${errorMessage}. ` +
      `Consecutive failures: ${healthStatus.consecutiveFailures}`
    )

    logFailure(params.agentRole, errorName, errorMessage)

    return {
      text: getDegradedModeResponse(params.agentRole, language),
      degraded: true,
    }
  }
}

// ── 4. Commercial Knowledge Cache ──────────────────────────────────────────

/**
 * Simple category-based hash for cache keys.
 * Groups similar questions to increase cache hit rate.
 */
function computeCacheKey(category: string): string {
  return category.toLowerCase().trim().replace(/\s+/g, "_")
}

/**
 * Store a commercial knowledge response in the in-memory cache.
 * TTL: 24 hours.
 */
export function cacheCommercialResponse(
  category: string,
  text: string
): void {
  const key = computeCacheKey(category)
  commercialCache.set(key, {
    text,
    cachedAt: Date.now(),
  })
}

/**
 * Retrieve a cached commercial knowledge response, if available and not expired.
 */
export function getCachedCommercialResponse(
  category: string
): string | null {
  const key = computeCacheKey(category)
  const entry = commercialCache.get(key)

  if (!entry) return null

  // Check TTL
  if (Date.now() - entry.cachedAt > COMMERCIAL_CACHE_TTL_MS) {
    commercialCache.delete(key)
    return null
  }

  return entry.text
}

/**
 * Clear expired entries from the commercial cache.
 * Call periodically (e.g., from a cron or at startup).
 */
export function pruneCommercialCache(): number {
  const now = Date.now()
  let pruned = 0

  const keys = Array.from(commercialCache.keys())
  for (const key of keys) {
    const entry = commercialCache.get(key)
    if (entry && now - entry.cachedAt > COMMERCIAL_CACHE_TTL_MS) {
      commercialCache.delete(key)
      pruned++
    }
  }

  if (pruned > 0) {
    console.log(`[DegradedMode] Pruned ${pruned} expired commercial cache entries.`)
  }

  return pruned
}

/**
 * Get the current number of cached commercial responses.
 */
export function getCommercialCacheSize(): number {
  return commercialCache.size
}

// ── 5. Failure Logging ─────────────────────────────────────────────────────

interface FailureLogEntry {
  timestamp: Date
  agentRole: string
  errorType: string
  errorMessage: string
}

const failureLog: FailureLogEntry[] = []
const MAX_FAILURE_LOG_SIZE = 500

function logFailure(
  agentRole: string,
  errorType: string,
  errorMessage: string
): void {
  failureLog.push({
    timestamp: new Date(),
    agentRole,
    errorType,
    errorMessage: errorMessage.substring(0, 500), // truncate long messages
  })

  // Keep log bounded
  if (failureLog.length > MAX_FAILURE_LOG_SIZE) {
    failureLog.splice(0, failureLog.length - MAX_FAILURE_LOG_SIZE)
  }
}

/**
 * Get recent failure log entries for monitoring/debugging.
 */
export function getFailureLog(limit = 50): ReadonlyArray<FailureLogEntry> {
  return failureLog.slice(-limit)
}

// ── 6. Status Summary (for Owner Dashboard / monitoring) ───────────────────

export interface DegradedModeStatus {
  health: HealthStatus
  circuitOpen: boolean
  circuitOpenedAt: Date | null
  commercialCacheSize: number
  recentFailures: number
}

/**
 * Returns a summary of the current degraded mode status.
 * Useful for the Owner Dashboard or monitoring endpoints.
 */
export function getDegradedModeStatus(): DegradedModeStatus {
  const fiveMinAgo = Date.now() - 5 * 60_000
  const recentFailures = failureLog.filter(
    (f) => f.timestamp.getTime() > fiveMinAgo
  ).length

  return {
    health: { ...healthStatus },
    circuitOpen: isCircuitOpen(),
    circuitOpenedAt: circuitOpenedAt ? new Date(circuitOpenedAt) : null,
    commercialCacheSize: commercialCache.size,
    recentFailures,
  }
}

// ── 7. Reset (for testing) ─────────────────────────────────────────────────

/**
 * Reset all internal state. For testing only.
 */
export function _resetForTesting(): void {
  healthStatus = {
    available: true,
    lastCheck: new Date(0),
    consecutiveFailures: 0,
  }
  circuitOpenedAt = null
  commercialCache.clear()
  failureLog.length = 0
}
