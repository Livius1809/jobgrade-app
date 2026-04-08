/**
 * CSRF Protection (VUL-031)
 *
 * Origin/Referer validation pe mutating requests.
 * Next.js API routes acceptă doar JSON (nu form submissions),
 * dar CSRF e posibil via fetch() de pe domenii malițioase.
 */

import type { NextRequest } from "next/server"

// ── Allowed origins ───────────────────────────────────────────────────────────

function getAllowedOrigins(): string[] {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const origins = [
    appUrl,
    "http://localhost:3000",
    "http://localhost:3001",
  ]

  // Production domains
  if (appUrl.includes("jobgrade.ro")) {
    origins.push("https://jobgrade.ro", "https://www.jobgrade.ro")
  }

  return origins
}

// ── CSRF check ────────────────────────────────────────────────────────────────

export interface CSRFCheckResult {
  allowed: boolean
  reason?: string
}

export function checkCSRF(req: NextRequest): CSRFCheckResult {
  const method = req.method.toUpperCase()

  // Safe methods don't need CSRF protection
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return { allowed: true }
  }

  // Internal API calls (from n8n, cron) use API key — skip CSRF
  const internalKey = req.headers.get("x-internal-key")
  if (internalKey && internalKey === process.env.INTERNAL_API_KEY) {
    return { allowed: true }
  }

  // Stripe webhooks have their own signature verification
  const stripeSignature = req.headers.get("stripe-signature")
  if (stripeSignature) {
    return { allowed: true }
  }

  const origin = req.headers.get("origin")
  const referer = req.headers.get("referer")
  const allowedOrigins = getAllowedOrigins()

  // Origin header present — validate it
  if (origin) {
    const isAllowed = allowedOrigins.some((allowed) => origin === allowed)
    if (!isAllowed) {
      return { allowed: false, reason: `Origin rejected: ${origin}` }
    }
    return { allowed: true }
  }

  // No origin but referer present — validate referer
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin
      const isAllowed = allowedOrigins.some((allowed) => refererOrigin === allowed)
      if (!isAllowed) {
        return { allowed: false, reason: `Referer rejected: ${referer}` }
      }
      return { allowed: true }
    } catch {
      return { allowed: false, reason: "Invalid referer URL" }
    }
  }

  // No origin, no referer — could be server-to-server or curl
  // Allow if Content-Type is application/json (browsers always send origin on fetch)
  const contentType = req.headers.get("content-type")
  if (contentType?.includes("application/json")) {
    return { allowed: true }
  }

  // Form submissions without origin — block
  return { allowed: false, reason: "Missing origin/referer on mutating request" }
}
