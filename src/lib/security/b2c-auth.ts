/**
 * B2C Authentication (VUL-009)
 *
 * Token-based auth pentru clienții B2C.
 * La onboarding se generează un JWT simplu.
 * Toate rutele B2C (mai puțin onboarding) verifică token-ul.
 */

import jwt from "jsonwebtoken"
import type { NextRequest } from "next/server"

const B2C_SECRET = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || ""
const TOKEN_EXPIRY = "30d" // 30 zile — sesiune lungă B2C

// ── Types ─────────────────────────────────────────────────────────────────────

export interface B2CTokenPayload {
  sub: string      // userId
  alias: string
  type: "b2c"
  iat?: number
  exp?: number
}

// ── Generate token (la onboarding) ────────────────────────────────────────────

export function generateB2CToken(userId: string, alias: string): string {
  return jwt.sign(
    { sub: userId, alias, type: "b2c" } satisfies Omit<B2CTokenPayload, "iat" | "exp">,
    B2C_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  )
}

// ── Verify token (pe fiecare request B2C) ─────────────────────────────────────

export function verifyB2CToken(token: string): B2CTokenPayload | null {
  try {
    const payload = jwt.verify(token, B2C_SECRET) as B2CTokenPayload
    if (payload.type !== "b2c") return null
    return payload
  } catch {
    return null
  }
}

// ── Extract from request ──────────────────────────────────────────────────────

export function extractB2CAuth(req: NextRequest): B2CTokenPayload | null {
  // Check Authorization header first
  const authHeader = req.headers.get("authorization")
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7)
    return verifyB2CToken(token)
  }

  // Check cookie fallback
  const cookieToken = req.cookies.get("b2c-token")?.value
  if (cookieToken) {
    return verifyB2CToken(cookieToken)
  }

  return null
}

// ── Middleware helper — verifică ownership ─────────────────────────────────────

export function verifyB2COwnership(
  tokenPayload: B2CTokenPayload,
  requestedUserId: string
): boolean {
  return tokenPayload.sub === requestedUserId
}
