/**
 * Security module index — centralized exports
 *
 * VUL-004: Prompt injection filter
 * VUL-005: Escalation detector (sliding window)
 * VUL-009: B2C authentication
 * VUL-015: CORS protection
 * VUL-031: CSRF protection
 * VUL-032: File upload validation
 * VUL-034: Secrets audit (env validation)
 * VUL-038: Redis-backed rate limiting
 */

export { checkPromptInjection, getInjectionBlockResponse } from "./prompt-injection-filter"
export { checkEscalation, resetEscalation, getEscalationBlockResponse } from "./escalation-detector"
export { generateB2CToken, verifyB2CToken, extractB2CAuth, verifyB2COwnership } from "./b2c-auth"
export { checkRateLimit, rateLimitHeaders } from "./rate-limiter"
export { checkCSRF } from "./csrf-guard"
export { handleCORSPreflight, setCORSHeaders } from "./cors-guard"
export { validateUpload, MAX_FILE_SIZE } from "./upload-validator"
export { sanitizeB2CResponse, auditIdentityLeaks, type ViewerRole } from "./pseudonym-guard"

// ── Secrets Audit (VUL-034) ───────────────────────────────────────────────────

/**
 * Runtime check: verifică dacă variabilele critice sunt setate.
 * Apelat la startup sau health check.
 */
export function auditSecrets(): { ok: boolean; missing: string[] } {
  const REQUIRED_SECRETS = [
    "NEXTAUTH_SECRET",
    "DATABASE_URL",
    "ANTHROPIC_API_KEY",
    "INTERNAL_API_KEY",
  ]

  const RECOMMENDED_SECRETS = [
    "UPSTASH_REDIS_URL",
    "UPSTASH_REDIS_TOKEN",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
  ]

  const missing = REQUIRED_SECRETS.filter((key) => !process.env[key])
  const missingRecommended = RECOMMENDED_SECRETS.filter((key) => !process.env[key])

  if (missingRecommended.length > 0) {
    console.warn(`[Security] Recommended secrets missing: ${missingRecommended.join(", ")}`)
  }

  return {
    ok: missing.length === 0,
    missing,
  }
}
