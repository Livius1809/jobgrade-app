/**
 * Unit tests pentru patch-lifecycle.
 *
 * Rulare:
 *   npx ts-node --project tsconfig.test.json src/lib/agents/__tests__/patch-lifecycle.test.ts
 */

import { test } from "node:test"
import assert from "node:assert/strict"
import {
  canTransition,
  getValidTransitions,
  checkExpired,
  computeExpiresAt,
  describePatch,
  summarizePatches,
  type PatchInput,
} from "../patch-lifecycle"

const NOW = new Date("2026-04-06T12:00:00Z")
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 60 * 60 * 1000)

function patch(overrides: Partial<PatchInput> = {}): PatchInput {
  return {
    id: "patch-1",
    targetRole: "CCO",
    patchType: "PRIORITY_SHIFT",
    patchSpec: { from: "MEDIUM", to: "CRITICAL" },
    triggeredBy: "COSO",
    rationale: "Obiectivul b2b-first-client e AT_RISK",
    status: "ACTIVE",
    appliedAt: hoursAgo(12),
    expiresAt: null,
    confirmedAt: null,
    ...overrides,
  }
}

// ── canTransition ─────────────────────────────────────────────────────────────

test("PROPOSED → APPROVED e valid", () => {
  assert.equal(canTransition("PROPOSED", "APPROVED"), true)
})

test("PROPOSED → REJECTED e valid", () => {
  assert.equal(canTransition("PROPOSED", "REJECTED"), true)
})

test("PROPOSED → ACTIVE e INVALID (trebuie aprobat întâi)", () => {
  assert.equal(canTransition("PROPOSED", "ACTIVE"), false)
})

test("ACTIVE → CONFIRMED e valid", () => {
  assert.equal(canTransition("ACTIVE", "CONFIRMED"), true)
})

test("ACTIVE → EXPIRED e valid", () => {
  assert.equal(canTransition("ACTIVE", "EXPIRED"), true)
})

test("EXPIRED → orice e INVALID (terminal)", () => {
  assert.equal(canTransition("EXPIRED", "ACTIVE"), false)
  assert.equal(canTransition("EXPIRED", "PROPOSED"), false)
})

test("CONFIRMED → REVERTED e valid (Owner poate revoca oricând)", () => {
  assert.equal(canTransition("CONFIRMED", "REVERTED"), true)
})

test("REJECTED → orice e INVALID (terminal)", () => {
  assert.deepEqual(getValidTransitions("REJECTED"), [])
})

// ── checkExpired ──────────────────────────────────────────────────────────────

test("Patch ACTIVE cu expiresAt depășit → shouldExpire=true", () => {
  const results = checkExpired(
    [patch({ expiresAt: hoursAgo(2) })], // expirat cu 2h
    NOW,
  )
  assert.equal(results.length, 1)
  assert.equal(results[0].shouldExpire, true)
  assert.ok(results[0].minutesPastExpiry >= 119) // ~120 min
})

test("Patch ACTIVE cu expiresAt în viitor → shouldExpire=false", () => {
  const results = checkExpired(
    [patch({ expiresAt: new Date(NOW.getTime() + 60 * 60 * 1000) })],
    NOW,
  )
  assert.equal(results[0].shouldExpire, false)
})

test("Patch ACTIVE fără expiresAt → shouldExpire=false (nu expiră singur)", () => {
  const results = checkExpired([patch({ expiresAt: null })], NOW)
  assert.equal(results[0].shouldExpire, false)
})

test("Patch ACTIVE confirmat → shouldExpire=false (chiar dacă expiresAt e trecut)", () => {
  const results = checkExpired(
    [
      patch({
        expiresAt: hoursAgo(5),
        confirmedAt: hoursAgo(10),
      }),
    ],
    NOW,
  )
  assert.equal(results[0].shouldExpire, false)
})

test("Doar patches ACTIVE sunt verificate (PROPOSED/APPROVED/etc ignorat)", () => {
  const results = checkExpired(
    [
      patch({ status: "PROPOSED", expiresAt: hoursAgo(5) }),
      patch({ status: "APPROVED", expiresAt: hoursAgo(5) }),
      patch({ status: "EXPIRED", expiresAt: hoursAgo(5) }),
    ],
    NOW,
  )
  assert.equal(results.length, 0)
})

// ── computeExpiresAt ──────────────────────────────────────────────────────────

test("computeExpiresAt default (24h) → appliedAt + 24h", () => {
  const applied = new Date("2026-04-06T10:00:00Z")
  const expires = computeExpiresAt(applied)
  assert.equal(expires.toISOString(), "2026-04-07T10:00:00.000Z")
})

test("computeExpiresAt custom TTL (4h)", () => {
  const applied = new Date("2026-04-06T10:00:00Z")
  const expires = computeExpiresAt(applied, 4)
  assert.equal(expires.toISOString(), "2026-04-06T14:00:00.000Z")
})

// ── describePatch ─────────────────────────────────────────────────────────────

test("describePatch produce text uman", () => {
  const desc = describePatch(patch())
  assert.ok(desc.includes("CCO"))
  assert.ok(desc.includes("schimbare prioritate"))
})

// ── summarizePatches ──────────────────────────────────────────────────────────

test("summarizePatches numără corect pe status", () => {
  const patches = [
    patch({ id: "1", status: "PROPOSED" }),
    patch({ id: "2", status: "PROPOSED" }),
    patch({ id: "3", status: "ACTIVE" }),
    patch({ id: "4", status: "CONFIRMED" }),
    patch({ id: "5", status: "EXPIRED" }),
  ]
  const s = summarizePatches(patches)
  assert.equal(s.total, 5)
  assert.equal(s.proposed, 2)
  assert.equal(s.active, 1)
  assert.equal(s.confirmed, 1)
  assert.equal(s.expiredRecently, 1)
})
