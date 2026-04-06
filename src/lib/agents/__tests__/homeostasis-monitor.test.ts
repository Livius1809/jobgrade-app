/**
 * Unit tests pentru homeostasis-monitor.
 *
 * Rulare:
 *   npx ts-node --project tsconfig.test.json src/lib/agents/__tests__/homeostasis-monitor.test.ts
 */

import { test } from "node:test"
import assert from "node:assert/strict"
import {
  evaluateHomeostasis,
  summarizeHomeostasis,
  type HomeostaticTargetInput,
} from "../homeostasis-monitor"

function target(overrides: Partial<HomeostaticTargetInput> = {}): HomeostaticTargetInput {
  return {
    id: "ht-1",
    code: "response-latency",
    name: "Response Latency P95",
    metricName: "response_latency_p95",
    metricUnit: "ms",
    targetType: "SERVICE",
    targetEntityId: "nextjs-app",
    minValue: null,
    maxValue: 2000,
    optimalValue: 500,
    warningPct: 10,
    criticalPct: 25,
    lastReading: 500,
    lastReadingAt: new Date(),
    autoCorrect: false,
    ...overrides,
  }
}

// ── Status calculation ────────────────────────────────────────────────────────

test("Reading = optimalValue → OPTIMAL", () => {
  const [e] = evaluateHomeostasis([target({ lastReading: 500, optimalValue: 500 })])
  assert.equal(e.status, "OPTIMAL")
  assert.equal(e.deviationPct, 0)
})

test("Reading ușor deviat (sub warningPct) → NORMAL", () => {
  // optimal=500, warningPct=10, reading=540 → deviation=8% → sub 10% → NORMAL
  const [e] = evaluateHomeostasis([target({ lastReading: 540, optimalValue: 500 })])
  assert.equal(e.status, "NORMAL")
  assert.ok(e.deviationPct !== null && e.deviationPct >= 7 && e.deviationPct <= 9)
})

test("Reading deviat > warningPct dar < criticalPct → WARNING", () => {
  // optimal=500, warningPct=10, criticalPct=25, reading=570 → deviation=14% → WARNING
  const [e] = evaluateHomeostasis([target({ lastReading: 570, optimalValue: 500 })])
  assert.equal(e.status, "WARNING")
})

test("Reading deviat > criticalPct → CRITICAL", () => {
  // optimal=500, criticalPct=25, reading=700 → deviation=40% → CRITICAL
  const [e] = evaluateHomeostasis([target({ lastReading: 700, optimalValue: 500 })])
  assert.equal(e.status, "CRITICAL")
})

test("Fără reading → UNKNOWN", () => {
  const [e] = evaluateHomeostasis([target({ lastReading: null })])
  assert.equal(e.status, "UNKNOWN")
  assert.equal(e.reading, null)
  assert.equal(e.deviationPct, null)
})

// ── Band boundaries ───────────────────────────────────────────────────────────

test("Reading peste maxValue → minim WARNING (chiar dacă deviation% e mic)", () => {
  // max=2000, optimal=500, reading=2100 → deviation mare, dar out-of-band forțează minim WARNING
  const [e] = evaluateHomeostasis([target({ lastReading: 2100 })])
  assert.ok(e.status === "WARNING" || e.status === "CRITICAL")
})

test("Reading sub minValue → minim WARNING", () => {
  const [e] = evaluateHomeostasis([
    target({ lastReading: 50, minValue: 75, maxValue: 95, optimalValue: 80, warningPct: 5, criticalPct: 15 }),
  ])
  assert.ok(e.status === "WARNING" || e.status === "CRITICAL")
})

// ── Auto-correct suggestions ──────────────────────────────────────────────────

test("autoCorrect=true + status CRITICAL → sugerează patch", () => {
  const [e] = evaluateHomeostasis([
    target({ lastReading: 700, autoCorrect: true }),
  ])
  assert.ok(e.suggestedPatchType !== null)
  assert.ok(e.suggestedPatchSpec !== null)
})

test("autoCorrect=false + status CRITICAL → NU sugerează patch", () => {
  const [e] = evaluateHomeostasis([
    target({ lastReading: 700, autoCorrect: false }),
  ])
  assert.equal(e.suggestedPatchType, null)
})

test("autoCorrect=true + status OPTIMAL → NU sugerează (nu e nevoie)", () => {
  const [e] = evaluateHomeostasis([
    target({ lastReading: 500, autoCorrect: true }),
  ])
  assert.equal(e.suggestedPatchType, null)
})

test("ROLE target cu autoCorrect sugerează ATTENTION_SHIFT pe targetEntityId", () => {
  const [e] = evaluateHomeostasis([
    target({
      lastReading: 700,
      autoCorrect: true,
      targetType: "ROLE",
      targetEntityId: "CCO",
    }),
  ])
  assert.equal(e.suggestedPatchType, "ATTENTION_SHIFT")
  assert.equal((e.suggestedPatchSpec as Record<string, string>)?.targetRole, "CCO")
})

// ── Optimal computed from band ────────────────────────────────────────────────

test("optimalValue null → computed din (minValue + maxValue) / 2", () => {
  const [e] = evaluateHomeostasis([
    target({ optimalValue: null, minValue: 60, maxValue: 100, lastReading: 80 }),
  ])
  assert.equal(e.optimal, 80)
  assert.equal(e.status, "OPTIMAL") // reading = optimal
})

// ── Summary ───────────────────────────────────────────────────────────────────

test("summarizeHomeostasis numără corect", () => {
  const evals = evaluateHomeostasis([
    target({ id: "1", code: "a", lastReading: 500 }),           // OPTIMAL
    target({ id: "2", code: "b", lastReading: 570 }),           // WARNING
    target({ id: "3", code: "c", lastReading: 700 }),           // CRITICAL
    target({ id: "4", code: "d", lastReading: null }),          // UNKNOWN
  ])
  const s = summarizeHomeostasis(evals)
  assert.equal(s.total, 4)
  assert.equal(s.optimal, 1)
  assert.equal(s.warning, 1)
  assert.equal(s.critical, 1)
  assert.equal(s.unknown, 1)
})
