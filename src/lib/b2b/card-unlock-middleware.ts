/**
 * card-unlock-middleware.ts — Middleware API pentru enforcing card unlock
 *
 * Pattern:
 *   - READ access (GET) = permis mereu (clientul vede ce ofera cardul)
 *   - WRITE/EXECUTE (POST, PUT, PATCH, DELETE) = blocat daca cardul e locked
 *   - Returneaza 403 cu mesaj clar despre ce trebuie deblocat
 *
 * Utilizare in API routes:
 *   import { withCardGuard } from "@/lib/b2b/card-unlock-middleware"
 *
 *   export const POST = withCardGuard(3, async (req) => {
 *     // Logica C3 — ajunge aici doar daca C3 e deblocat
 *   })
 */

import { NextRequest, NextResponse } from "next/server"
import { isCardUnlocked, getUnlockRequirements, CARD_LABELS } from "./card-unlock-guard"
import type { CardNumber } from "./card-unlock-guard"

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────

type RouteHandler = (
  req: NextRequest,
  context?: { params?: Record<string, string> }
) => Promise<NextResponse> | NextResponse

interface CardGuardOptions {
  /** Permite GET chiar daca cardul e locked (default: true) */
  allowReadWhenLocked?: boolean
  /** Mesaj custom pentru 403 */
  customMessage?: string
}

interface CardGuardErrorResponse {
  error: string
  code: "CARD_LOCKED"
  card: CardNumber
  cardLabel: string
  purchaseRequired: boolean
  prerequisitesRequired: boolean
  missingRequirements: Array<{
    key: string
    label: string
    description: string
  }>
  reason: string
}

// ─────────────────────────────────────────
// TENANT EXTRACTION
// ─────────────────────────────────────────

/**
 * Extrage tenantId din request.
 * Cauta in: header x-tenant-id, query param, sau path segment.
 */
function extractTenantId(req: NextRequest): string | null {
  // 1. Header explicit (setat de auth middleware)
  const headerTenantId = req.headers.get("x-tenant-id")
  if (headerTenantId) return headerTenantId

  // 2. Query parameter
  const url = new URL(req.url)
  const queryTenantId = url.searchParams.get("tenantId")
  if (queryTenantId) return queryTenantId

  // 3. Path segment: /api/v1/tenants/{tenantId}/...
  const pathMatch = url.pathname.match(/\/tenants\/([a-zA-Z0-9_-]+)/)
  if (pathMatch) return pathMatch[1]

  return null
}

// ─────────────────────────────────────────
// MIDDLEWARE FACTORY
// ─────────────────────────────────────────

/**
 * Wrapper HOF care protejeaza un route handler cu card guard.
 *
 * @param cardNumber - Cardul necesar (1-4)
 * @param handler - Handler-ul original
 * @param options - Optiuni suplimentare
 *
 * @example
 *   // In route.ts:
 *   export const POST = withCardGuard(2, async (req) => {
 *     // Ajunge aici doar daca C2 e deblocat
 *     return NextResponse.json({ ok: true })
 *   })
 */
export function withCardGuard(
  cardNumber: CardNumber,
  handler: RouteHandler,
  options: CardGuardOptions = {}
): RouteHandler {
  const { allowReadWhenLocked = true } = options

  return async (req: NextRequest, context?) => {
    // C1 nu are guard — e mereu disponibil
    if (cardNumber === 1) {
      return handler(req, context)
    }

    // Permite GET daca optiunea e activa
    if (allowReadWhenLocked && req.method === "GET") {
      return handler(req, context)
    }

    // Extrage tenantId
    const tenantId = extractTenantId(req)
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant ID lipsă. Autentificarea este necesară.", code: "MISSING_TENANT" },
        { status: 401 }
      )
    }

    // Verifica unlock status
    const unlockResult = await isCardUnlocked(tenantId, cardNumber)

    if (unlockResult.unlocked) {
      return handler(req, context)
    }

    // Card blocat — construieste raspunsul 403
    const missingRequirements = await getUnlockRequirements(tenantId, cardNumber)

    const errorResponse: CardGuardErrorResponse = {
      error: options.customMessage ?? `Cardul ${CARD_LABELS[cardNumber].ro} nu este disponibil.`,
      code: "CARD_LOCKED",
      card: cardNumber,
      cardLabel: CARD_LABELS[cardNumber].ro,
      purchaseRequired: !unlockResult.purchaseAllows,
      prerequisitesRequired: !unlockResult.prerequisitesMet,
      missingRequirements: missingRequirements.map((r) => ({
        key: r.key,
        label: r.label,
        description: r.description,
      })),
      reason: unlockResult.reason ?? "Card blocat",
    }

    return NextResponse.json(errorResponse, { status: 403 })
  }
}

/**
 * Varianta care blocheaza si GET (pentru resurse sensibile).
 */
export function withStrictCardGuard(
  cardNumber: CardNumber,
  handler: RouteHandler,
  options: Omit<CardGuardOptions, "allowReadWhenLocked"> = {}
): RouteHandler {
  return withCardGuard(cardNumber, handler, { ...options, allowReadWhenLocked: false })
}

/**
 * Utility: verifica programatic in orice context (nu doar route handler).
 * Returneaza null daca e deblocat, sau NextResponse 403 daca nu.
 */
export async function checkCardAccess(
  tenantId: string,
  cardNumber: CardNumber
): Promise<NextResponse | null> {
  if (cardNumber === 1) return null

  const unlockResult = await isCardUnlocked(tenantId, cardNumber)
  if (unlockResult.unlocked) return null

  const missingRequirements = await getUnlockRequirements(tenantId, cardNumber)

  const errorResponse: CardGuardErrorResponse = {
    error: `Cardul ${CARD_LABELS[cardNumber].ro} nu este disponibil.`,
    code: "CARD_LOCKED",
    card: cardNumber,
    cardLabel: CARD_LABELS[cardNumber].ro,
    purchaseRequired: !unlockResult.purchaseAllows,
    prerequisitesRequired: !unlockResult.prerequisitesMet,
    missingRequirements: missingRequirements.map((r) => ({
      key: r.key,
      label: r.label,
      description: r.description,
    })),
    reason: unlockResult.reason ?? "Card blocat",
  }

  return NextResponse.json(errorResponse, { status: 403 })
}
