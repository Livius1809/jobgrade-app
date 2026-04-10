/**
 * boundary-guard.ts — Wrapper convenabil pentru chat routes
 *
 * Încarcă regulile active din DB, apelează checkBoundaries (funcție pură),
 * persistă violațiile și returnează verdictul.
 *
 * Folosit în chat client-facing pentru a wire-ui sistemul imun (A3 audit).
 */

import type { PrismaClient } from "@/generated/prisma"
import {
  checkBoundaries,
  type BoundaryRuleInput,
  type BoundaryCheckInput,
  type BoundaryVerdict,
  type BoundaryCondition,
  type BoundaryAction,
} from "./boundary-engine"

// Cache reguli (TTL 5 min) — evită query DB la fiecare mesaj
let cachedRules: BoundaryRuleInput[] | null = null
let cachedAt = 0
const CACHE_TTL_MS = 5 * 60 * 1000

async function loadActiveRules(prisma: PrismaClient): Promise<BoundaryRuleInput[]> {
  const now = Date.now()
  if (cachedRules && now - cachedAt < CACHE_TTL_MS) {
    return cachedRules
  }

  try {
    const rules = await prisma.boundaryRule.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        ruleType: true,
        severity: true,
        condition: true,
        action: true,
        notifyRoles: true,
        escalateToOwner: true,
        isActive: true,
      },
    })

    cachedRules = rules.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      ruleType: r.ruleType as BoundaryRuleInput["ruleType"],
      severity: r.severity as BoundaryRuleInput["severity"],
      condition: r.condition as unknown as BoundaryCondition,
      action: r.action as BoundaryAction,
      notifyRoles: r.notifyRoles,
      escalateToOwner: r.escalateToOwner,
      isActive: r.isActive,
    }))
    cachedAt = now
    return cachedRules
  } catch (e) {
    console.error(`[boundary-guard] Failed to load rules: ${e instanceof Error ? e.message : "unknown"}`)
    return []
  }
}

/**
 * Verifică un input contra regulilor de graniță active.
 * Apelat din chat routes ÎNAINTE de procesarea mesajului.
 *
 * Comportament:
 * - Returnează verdict + persistă violațiile în DB
 * - Non-blocking: dacă DB eșuează, returnează passed=true (fail open)
 *   pentru a nu bloca conversațiile valide din cauza unui bug
 *
 * @param prisma - Prisma client
 * @param input - input de verificat (sourceType, sourceRole, content)
 * @param businessId - opțional, pentru tenant isolation pe violations
 */
export async function guardBoundaries(
  prisma: PrismaClient,
  input: BoundaryCheckInput,
  businessId?: string | null
): Promise<BoundaryVerdict> {
  const rules = await loadActiveRules(prisma)

  // Dacă nu există reguli active, totul trece
  if (rules.length === 0) {
    return {
      passed: true,
      violations: [],
      highestSeverity: null,
      highestAction: null,
      shouldEscalateToOwner: false,
      notifyRoles: [],
    }
  }

  const verdict = checkBoundaries(rules, input)

  // Persistă violațiile (non-blocking)
  if (verdict.violations.length > 0) {
    try {
      for (const v of verdict.violations) {
        await prisma.boundaryViolation.create({
          data: {
            ruleId: v.ruleId,
            businessId: businessId ?? null,
            sourceType: input.sourceType,
            sourceRole: input.sourceRole,
            inputSnapshot: input.content.slice(0, 5000),
            actionTaken: v.action as BoundaryAction,
          },
        }).catch(async (e) => {
          console.error(`[boundary-guard] Failed to persist violation: ${e.message}`)
          try {
            const Sentry = await import("@sentry/nextjs").catch(() => null)
            if (Sentry) Sentry.captureException(e, { tags: { module: "boundary-guard" } })
          } catch {}
        })
      }
    } catch (e) {
      console.error(`[boundary-guard] Persistence error: ${e instanceof Error ? e.message : "unknown"}`)
    }
  }

  return verdict
}

/**
 * Mesaj user-facing când un input e blocat de o boundary.
 */
export function getBoundaryBlockResponse(verdict: BoundaryVerdict, language: "ro" | "en" = "ro"): string {
  if (language === "en") {
    return "Your message contains content that doesn't comply with our usage policy. Please rephrase or contact support if you believe this is an error."
  }
  return "Mesajul tău conține conținut care nu corespunde politicii noastre de utilizare. Te rog reformulează sau contactează suportul dacă consideri că este o eroare."
}

/**
 * Reset cache reguli (pentru teste sau după update reguli din admin).
 */
export function resetBoundaryCache(): void {
  cachedRules = null
  cachedAt = 0
}
