/**
 * Patch Lifecycle — logica pură pentru ciclul de viață al AgentBehaviorPatch.
 *
 * Livrat: 06.04.2026, Increment B1 "Living Organization".
 *
 * Lifecycle:
 *   PROPOSED → APPROVED → ACTIVE → CONFIRMED (permanent)
 *                                → EXPIRED (auto-revert)
 *                                → REVERTED (manual)
 *            → REJECTED
 *
 * Funcții pure:
 *  - canTransition(from, to): validare tranziție status
 *  - checkExpired(patches, now): identifică patches ACTIVE care trebuie revert-ate
 *  - computeExpiresAt(appliedAt, ttlHours): calculează momentul de auto-revert
 *  - describePatch(patch): text uman scurt pentru notificare
 */

// ── Tipuri ────────────────────────────────────────────────────────────────────

export type PatchStatus =
  | "PROPOSED"
  | "APPROVED"
  | "ACTIVE"
  | "EXPIRED"
  | "CONFIRMED"
  | "REVERTED"
  | "REJECTED"

export type PatchType =
  | "PRIORITY_SHIFT"
  | "ATTENTION_SHIFT"
  | "SCOPE_EXPAND"
  | "SCOPE_NARROW"
  | "ACTIVITY_MODE"
  | "CYCLE_INTERVAL"

export interface PatchInput {
  id: string
  targetRole: string
  patchType: PatchType
  patchSpec: Record<string, unknown>
  triggeredBy: string
  rationale: string
  status: PatchStatus
  appliedAt?: string | Date | null
  expiresAt?: string | Date | null
  confirmedAt?: string | Date | null
}

export interface ExpiryResult {
  patchId: string
  targetRole: string
  patchType: PatchType
  shouldExpire: boolean
  minutesPastExpiry: number
}

// ── Tranziții valide ──────────────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<PatchStatus, PatchStatus[]> = {
  PROPOSED: ["APPROVED", "REJECTED"],
  APPROVED: ["ACTIVE", "REJECTED", "REVERTED"],
  ACTIVE: ["CONFIRMED", "EXPIRED", "REVERTED"],
  EXPIRED: [], // terminal
  CONFIRMED: ["REVERTED"], // Owner poate revoca chiar și un patch confirmat
  REVERTED: [], // terminal
  REJECTED: [], // terminal
}

export function canTransition(from: PatchStatus, to: PatchStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

export function getValidTransitions(from: PatchStatus): PatchStatus[] {
  return VALID_TRANSITIONS[from] ?? []
}

// ── Expiry check ──────────────────────────────────────────────────────────────

function toDate(v: string | Date | null | undefined): Date | null {
  if (!v) return null
  return v instanceof Date ? v : new Date(v)
}

/**
 * Verifică ce patches ACTIVE au depășit expiresAt și trebuie revert-ate.
 * Nu modifică nimic — doar returnează lista de patches cu shouldExpire=true.
 */
export function checkExpired(
  patches: PatchInput[],
  now?: Date,
): ExpiryResult[] {
  const currentTime = now ?? new Date()
  return patches
    .filter((p) => p.status === "ACTIVE")
    .map((p) => {
      const expiresAt = toDate(p.expiresAt)
      if (!expiresAt || p.confirmedAt) {
        return {
          patchId: p.id,
          targetRole: p.targetRole,
          patchType: p.patchType,
          shouldExpire: false,
          minutesPastExpiry: 0,
        }
      }
      const diff = currentTime.getTime() - expiresAt.getTime()
      return {
        patchId: p.id,
        targetRole: p.targetRole,
        patchType: p.patchType,
        shouldExpire: diff > 0,
        minutesPastExpiry: Math.max(0, Math.round(diff / 60000)),
      }
    })
}

// ── TTL calculation ───────────────────────────────────────────────────────────

const DEFAULT_TTL_HOURS = 24

export function computeExpiresAt(
  appliedAt: Date,
  ttlHours?: number,
): Date {
  const ttl = ttlHours ?? DEFAULT_TTL_HOURS
  return new Date(appliedAt.getTime() + ttl * 60 * 60 * 1000)
}

// ── Describe for notifications ────────────────────────────────────────────────

const PATCH_TYPE_LABELS: Record<PatchType, string> = {
  PRIORITY_SHIFT: "schimbare prioritate",
  ATTENTION_SHIFT: "redirecționare atenție",
  SCOPE_EXPAND: "extindere responsabilități",
  SCOPE_NARROW: "reducere responsabilități",
  ACTIVITY_MODE: "schimbare mod activitate",
  CYCLE_INTERVAL: "schimbare frecvență ciclu",
}

export function describePatch(patch: PatchInput): string {
  const typeLabel = PATCH_TYPE_LABELS[patch.patchType] ?? patch.patchType
  return `[${patch.targetRole}] ${typeLabel} — ${patch.rationale.slice(0, 100)}`
}

/**
 * Sumar patches active/proposed per business — pentru cockpit.
 */
export function summarizePatches(patches: PatchInput[]): {
  total: number
  proposed: number
  active: number
  confirmed: number
  expiredRecently: number
} {
  return {
    total: patches.length,
    proposed: patches.filter((p) => p.status === "PROPOSED").length,
    active: patches.filter((p) => p.status === "ACTIVE").length,
    confirmed: patches.filter((p) => p.status === "CONFIRMED").length,
    expiredRecently: patches.filter((p) => p.status === "EXPIRED").length,
  }
}
