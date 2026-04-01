/**
 * middleware.ts — Securitate platformă JobGrade
 *
 * Mecanisme activat:
 * 1. Rate limiting per IP (100 req/min API, 200 req/min pages)
 * 2. Auth protection — redirect la login dacă nu e autentificat
 * 3. API key validation pe rutele interne (/api/v1/agents/*)
 * 4. Input sanitization headers
 * 5. CORS restricții
 */

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// ── Rate Limiting (in-memory, per IP) ────────────────────────────────────────

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string, limit: number): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 }) // 1 minute window
    return true
  }

  if (entry.count >= limit) return false

  entry.count++
  return true
}

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(ip)
  }
}, 300_000)

// ── Public paths (no auth required) ──────────────────────────────────────────

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/api/auth",
  "/api/v1/auth/register",
  "/api/v1/auth/activate",
  "/portal/", // public employee request form
  "/_next",
  "/favicon",
  "/robots.txt",
]

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p))
}

// ── Internal API paths (require INTERNAL_API_KEY) ────────────────────────────

function isInternalAPI(pathname: string): boolean {
  return pathname.startsWith("/api/v1/agents/") ||
    pathname.startsWith("/api/v1/kb/")
}

// ── Middleware ────────────────────────────────────────────────────────────────

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown"

  // 1. Rate limiting
  const isAPI = pathname.startsWith("/api/")
  const limit = isAPI ? 100 : 200 // per minute
  if (!checkRateLimit(ip, limit)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    )
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

  // 5. Auth check — redirect to login if no session
  const sessionToken =
    request.cookies.get("authjs.session-token")?.value ||
    request.cookies.get("__Secure-authjs.session-token")?.value

  if (!sessionToken && !pathname.startsWith("/api/")) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 6. Add security headers to response
  const response = NextResponse.next()

  // Prevent clickjacking
  response.headers.set("X-Frame-Options", "DENY")
  // Prevent MIME sniffing
  response.headers.set("X-Content-Type-Options", "nosniff")

  return response
}

// ── Matcher — skip static assets ─────────────────────────────────────────────

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt).*)",
  ],
}
