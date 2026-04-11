/**
 * CORS Protection (VUL-015)
 *
 * Restrictive CORS headers pe API routes.
 * Reutilizează allowed origins din csrf-guard.ts.
 */

import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { getAppUrl } from "@/lib/get-app-url"

// ── Allowed origins ───────────────────────────────────────────────────────────

function getAllowedOrigins(): string[] {
  const appUrl = getAppUrl()
  const origins = [
    appUrl,
    "http://localhost:3000",
    "http://localhost:3001",
  ]

  if (appUrl.includes("jobgrade.ro")) {
    origins.push("https://jobgrade.ro", "https://www.jobgrade.ro")
  }

  return [...new Set(origins)]
}

// ── CORS headers ─────────────────────────────────────────────────────────────

const ALLOWED_METHODS = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
const ALLOWED_HEADERS = "Content-Type, Authorization, x-internal-key, b2c-token"
const MAX_AGE = "86400" // 24h preflight cache

/**
 * Handle CORS preflight (OPTIONS) requests.
 * Returns a 204 response with CORS headers if origin is allowed.
 */
export function handleCORSPreflight(req: NextRequest): NextResponse | null {
  if (req.method !== "OPTIONS") return null

  const origin = req.headers.get("origin")
  if (!origin) return new NextResponse(null, { status: 204 })

  const allowedOrigins = getAllowedOrigins()
  const isAllowed = allowedOrigins.includes(origin)

  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": ALLOWED_METHODS,
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Max-Age": MAX_AGE,
  }

  if (isAllowed) {
    headers["Access-Control-Allow-Origin"] = origin
    headers["Vary"] = "Origin"
  }

  return new NextResponse(null, { status: 204, headers })
}

/**
 * Add CORS headers to an existing response.
 * Only sets Access-Control-Allow-Origin for allowed origins.
 */
export function setCORSHeaders(req: NextRequest, response: NextResponse): NextResponse {
  const origin = req.headers.get("origin")
  if (!origin) return response

  const allowedOrigins = getAllowedOrigins()
  if (allowedOrigins.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin)
    response.headers.set("Vary", "Origin")
  }

  return response
}
