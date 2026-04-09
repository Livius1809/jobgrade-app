/**
 * Unit tests pentru degraded-mode.
 *
 * Rulare:
 *   npx ts-node --project tsconfig.test.json src/lib/ai/__tests__/degraded-mode.test.ts
 *
 * Testează doar funcțiile pure/sincrone (getDegradedModeResponse, getDegradedModeStatus).
 * Funcțiile async (callClaudeWithFallback, checkAnthropicHealth) necesită mock Anthropic.
 */

import { test, beforeEach } from "node:test"
import assert from "node:assert/strict"
import {
  getDegradedModeResponse,
  getDegradedModeStatus,
  _resetForTesting,
} from "../degraded-mode"

beforeEach(() => {
  _resetForTesting()
})

// ── getDegradedModeResponse — per agent role ─────────────────────────────────

test("getDegradedModeResponse returns base message for unknown agent role", () => {
  const response = getDegradedModeResponse("UNKNOWN_ROLE", "ro")
  assert.ok(response.includes("capacitate redusă"), "Should contain base degraded message in RO")
  assert.ok(response.includes("suport@jobgrade.ro"), "Should contain support email")
})

test("getDegradedModeResponse returns SOA-specific suffix", () => {
  const response = getDegradedModeResponse("SOA", "ro")
  assert.ok(response.includes("capacitate redusă"), "Should contain base message")
  assert.ok(response.includes("callback"), "SOA should mention callback option")
})

test("getDegradedModeResponse returns CSA-specific suffix", () => {
  const response = getDegradedModeResponse("CSA", "ro")
  assert.ok(response.includes("capacitate redusă"), "Should contain base message")
  assert.ok(response.includes("ticket"), "CSA should mention ticket option")
})

test("getDegradedModeResponse returns CALAUZA-specific suffix", () => {
  const response = getDegradedModeResponse("CALAUZA", "ro")
  assert.ok(response.includes("capacitate redusă"), "Should contain base message")
  assert.ok(response.includes("Drumul tău"), "CALAUZA should have empathetic message")
})

test("getDegradedModeResponse returns PROFILER-specific suffix", () => {
  const response = getDegradedModeResponse("PROFILER", "ro")
  assert.ok(response.includes("capacitate redusă"), "Should contain base message")
  assert.ok(response.includes("Profilul tău"), "PROFILER should mention saved profile")
})

// ── getDegradedModeResponse — language support ───────────────────────────────

test("getDegradedModeResponse supports 'ro' language", () => {
  const response = getDegradedModeResponse("SOA", "ro")
  assert.ok(response.includes("capacitate redusă"), "RO message should be in Romanian")
  assert.ok(response.includes("callback"), "RO SOA should have Romanian callback message")
})

test("getDegradedModeResponse supports 'en' language", () => {
  const response = getDegradedModeResponse("SOA", "en")
  assert.ok(response.includes("reduced capacity"), "EN message should be in English")
  assert.ok(response.includes("callback"), "EN SOA should mention callback")
})

test("getDegradedModeResponse EN — unknown role gets base only", () => {
  const response = getDegradedModeResponse("UNKNOWN", "en")
  assert.ok(response.includes("reduced capacity"))
  assert.ok(response.includes("suport@jobgrade.ro"))
  // Should NOT have any agent-specific suffix
  assert.ok(!response.includes("callback"))
  assert.ok(!response.includes("ticket"))
})

test("getDegradedModeResponse defaults to 'ro' when no language specified", () => {
  const response = getDegradedModeResponse("SOA")
  assert.ok(response.includes("capacitate redusă"),
    "Default language should be Romanian")
})

// ── getDegradedModeResponse — different messages per role ─────────────────────

test("Different agent roles produce different messages", () => {
  const soa = getDegradedModeResponse("SOA", "ro")
  const csa = getDegradedModeResponse("CSA", "ro")
  const calauza = getDegradedModeResponse("CALAUZA", "ro")
  const profiler = getDegradedModeResponse("PROFILER", "ro")
  const generic = getDegradedModeResponse("GENERIC", "ro")

  // All should share the base message
  const base = "capacitate redusă"
  assert.ok(soa.includes(base))
  assert.ok(csa.includes(base))
  assert.ok(calauza.includes(base))
  assert.ok(profiler.includes(base))
  assert.ok(generic.includes(base))

  // But agent-specific ones should differ from generic
  assert.notEqual(soa, generic, "SOA should differ from generic")
  assert.notEqual(csa, generic, "CSA should differ from generic")
  assert.notEqual(calauza, generic, "CALAUZA should differ from generic")
  assert.notEqual(profiler, generic, "PROFILER should differ from generic")

  // And they should differ from each other
  assert.notEqual(soa, csa, "SOA should differ from CSA")
  assert.notEqual(calauza, profiler, "CALAUZA should differ from PROFILER")
})

// ── getDegradedModeStatus — initial state ────────────────────────────────────

test("getDegradedModeStatus returns correct initial status", () => {
  const status = getDegradedModeStatus()

  assert.ok(typeof status.health === "object")
  assert.equal(status.health.available, true, "Initial health should be available")
  assert.equal(status.health.consecutiveFailures, 0, "Initial failures should be 0")
  assert.equal(status.circuitOpen, false, "Circuit should be closed initially")
  assert.equal(status.circuitOpenedAt, null, "circuitOpenedAt should be null")
  assert.equal(status.commercialCacheSize, 0, "Cache should be empty initially")
  assert.equal(status.recentFailures, 0, "No recent failures initially")
})

test("getDegradedModeStatus health object has required fields", () => {
  const status = getDegradedModeStatus()

  assert.ok("available" in status.health)
  assert.ok("lastCheck" in status.health)
  assert.ok("consecutiveFailures" in status.health)
  assert.ok(status.health.lastCheck instanceof Date)
})

// ── Circuit breaker concept ──────────────────────────────────────────────────
// Note: We cannot easily test the circuit breaker activation without mocking
// the Anthropic client (callClaudeWithFallback is async and calls real API).
// These tests verify the status reporting after _resetForTesting.

test("After reset, circuit is closed and failures are 0", () => {
  _resetForTesting()
  const status = getDegradedModeStatus()
  assert.equal(status.circuitOpen, false)
  assert.equal(status.health.consecutiveFailures, 0)
  assert.equal(status.health.available, true)
})

test("Status report structure is complete", () => {
  const status = getDegradedModeStatus()

  // Verify all expected fields exist
  assert.ok("health" in status)
  assert.ok("circuitOpen" in status)
  assert.ok("circuitOpenedAt" in status)
  assert.ok("commercialCacheSize" in status)
  assert.ok("recentFailures" in status)

  // Types
  assert.equal(typeof status.circuitOpen, "boolean")
  assert.equal(typeof status.commercialCacheSize, "number")
  assert.equal(typeof status.recentFailures, "number")
})
