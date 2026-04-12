/**
 * proxy.ts — Securitate platformă JobGrade (Next.js 16 proxy)
 *
 * Mecanisme:
 * 1. CSRF protection — Origin/Referer validation pe mutating requests
 * 2. Rate limiting per IP (Redis-backed cu fallback in-memory)
 * 3. Auth protection — redirect la login dacă nu e autentificat
 * 4. API key validation pe rutele interne (/api/v1/agents/*, /api/v1/kb/*)
 * 5. Security headers
 */

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { checkCSRF } from "@/lib/security/csrf-guard"
import { checkRateLimit, rateLimitHeaders, type RateLimitTier } from "@/lib/security/rate-limiter"
import { handleCORSPreflight, setCORSHeaders } from "@/lib/security/cors-guard"

// ── Public paths (no auth required) ──────────────────────────────────────────

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/api/auth",
  "/api/v1/auth/register",
  "/api/v1/auth/activate",
  "/portal/",
  "/personal",
  "/_next",
  "/favicon",
  "/robots.txt",
  "/b2b",
  "/api/demo-request",
  "/api/health",
  "/api/v1/b2c/onboarding",
  // AI Act + GDPR transparency — obligatoriu public (10.04.2026)
  "/transparenta-ai",
  "/gdpr",
  "/termeni",
  // Media Books — conținut public, produs de structura organismului
  "/media-books",
  // Auth flow — reset password
  "/reset-password",
]

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p))
}

// ── Internal API paths (require INTERNAL_API_KEY) ────────────────────────────

function isInternalAPI(pathname: string): boolean {
  return pathname.startsWith("/api/v1/agents/") ||
    pathname.startsWith("/api/v1/kb/") ||
    pathname.startsWith("/api/v1/admin/")
}

// ── Rate limit tier detection ────────────────────────────────────────────────

function detectRateLimitTier(pathname: string): RateLimitTier {
  // Chat endpoints (Claude API calls — most expensive)
  if (pathname.includes("/chat/") || pathname.includes("/chat")) {
    return "CHAT"
  }
  // B2C endpoints
  if (pathname.startsWith("/api/v1/b2c/")) {
    return "B2C_API"
  }
  // B2B endpoints
  if (pathname.startsWith("/api/v1/")) {
    return "B2B_API"
  }
  return "GENERAL"
}

// ── Proxy (Next.js 16 format) ────────────────────────────────────────────────

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"

  // 0a. CORS preflight (VUL-015)
  if (pathname.startsWith("/api/")) {
    const preflightResponse = handleCORSPreflight(request)
    if (preflightResponse) return preflightResponse
  }

  // 0b. CSRF protection on mutating requests
  if (pathname.startsWith("/api/")) {
    const csrfResult = checkCSRF(request)
    if (!csrfResult.allowed) {
      return NextResponse.json(
        { error: "Request blocked — invalid origin" },
        { status: 403 }
      )
    }
  }

  // 1. Rate limiting (Redis-backed)
  if (pathname.startsWith("/api/")) {
    const tier = detectRateLimitTier(pathname)
    const result = await checkRateLimit(ip, tier)
    if (!result.allowed) {
      return NextResponse.json(
        { error: "Prea multe cereri. Te rog așteaptă un minut." },
        {
          status: 429,
          headers: rateLimitHeaders(result, tier),
        }
      )
    }
  }

  // 2. Skip public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  // 3. Static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next()
  }

  // 4. Internal API — check INTERNAL_API_KEY
  if (isInternalAPI(pathname)) {
    const apiKey = request.headers.get("x-internal-key")
    const expectedKey = process.env.INTERNAL_API_KEY
    if (!expectedKey || apiKey !== expectedKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.next()
  }

  // 5. Hidden routes — return 404 for unauthenticated users (don't reveal existence)
  const HIDDEN_ROUTES = ["/owner"]
  if (HIDDEN_ROUTES.some((r) => pathname.startsWith(r))) {
    const sessionToken =
      request.cookies.get("authjs.session-token")?.value ||
      request.cookies.get("__Secure-authjs.session-token")?.value
    if (!sessionToken) {
      return new NextResponse("Not Found", { status: 404 })
    }
  }

  // 6. B2C API routes — require B2C token (except onboarding)
  if (pathname.startsWith("/api/v1/b2c/") && !pathname.startsWith("/api/v1/b2c/onboarding")) {
    const authHeader = request.headers.get("authorization")
    const cookieToken = request.cookies.get("b2c-token")?.value
    if (!authHeader?.startsWith("Bearer ") && !cookieToken) {
      return NextResponse.json({ error: "B2C token lipsește" }, { status: 401 })
    }
  }

  // 7. Auth check — redirect to login if no session
  const sessionToken =
    request.cookies.get("authjs.session-token")?.value ||
    request.cookies.get("__Secure-authjs.session-token")?.value

  if (!sessionToken && !pathname.startsWith("/api/")) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 8. Security headers + CORS (VUL-015)
  const response = NextResponse.next()
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-Content-Type-Options", "nosniff")

  // CORS headers pe API responses
  if (pathname.startsWith("/api/")) {
    setCORSHeaders(request, response)
  }

  return response
}

// ── Matcher — skip static assets ─────────────────────────────────────────────

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt).*)",
  ],
}
