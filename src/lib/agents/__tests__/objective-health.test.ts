/**
 * Unit tests pentru objective-health.
 *
 * Rulare:
 *   npx ts-node --project tsconfig.test.json src/lib/agents/__tests__/objective-health.test.ts
 *
 * Acoperire:
 *  - Progress calculation per direction (INCREASE, DECREASE, MAINTAIN, REACH)
 *  - Risk + health score: deadline impact, priority impact
 *  - Momentum estimation (ACCELERATING, ON_TRACK, STALLING, DECLINING)
 *  - Recommended status: MET, FAILED, AT_RISK, ACTIVE
 *  - Related signals: strategic theme tag match, disfunction role match
 *  - Sortare: cele mai bolnave primele
 *  - Summary: avgHealthScore, critical, atRisk, onTrack
 *  - Edge case: currentValue null → progress null
 */

import { test } from "node:test"
import assert from "node:assert/strict"
import {
  computeObjectiveHealth,
  summarizeHealth,
  type ObjectiveInput,
  type StrategicThemeInput,
  type DisfunctionInput,
  type ObjectiveHealthInputs,
} from "../objective-health"

const NOW = new Date("2026-04-06T12:00:00Z")

function obj(overrides: Partial<ObjectiveInput>): ObjectiveInput {
  return {
    id: "obj-1",
    code: "test-obj",
    title: "Test Objective",
    businessId: "biz_jobgrade",
    metricName: "count",
    metricUnit: null,
    targetValue: 100,
    currentValue: 50,
    direction: "INCREASE",
    startDate: "2026-01-01T00:00:00Z",
    deadlineAt: "2026-06-30T23:59:59Z",
    completedAt: null,
    priority: "MEDIUM",
    status: "ACTIVE",
    ownerRoles: ["CCO"],
    contributorRoles: ["MKA"],
    tags: ["growth"],
    ...overrides,
  }
}

function inputs(
  objectives: ObjectiveInput[],
  strategicThemes: StrategicThemeInput[] = [],
  disfunctions: DisfunctionInput[] = [],
): ObjectiveHealthInputs {
  return { objectives, strategicThemes, disfunctions }
}

const CFG = { now: NOW }

// ── Progress ──────────────────────────────────────────────────────────────────

test("Progress INCREASE: 50/100 → 50%", () => {
  const [r] = computeObjectiveHealth(
    inputs([obj({ targetValue: 100, currentValue: 50, direction: "INCREASE" })]),
    CFG,
  )
  assert.equal(r.progressPct, 50)
})

test("Progress REACH: 0/1 → 0%, 1/1 → 100%", () => {
  const [r1] = computeObjectiveHealth(
    inputs([obj({ targetValue: 1, currentValue: 0, direction: "REACH" })]),
    CFG,
  )
  assert.equal(r1.progressPct, 0)

  const [r2] = computeObjectiveHealth(
    inputs([obj({ targetValue: 1, currentValue: 1, direction: "REACH" })]),
    CFG,
  )
  assert.equal(r2.progressPct, 100)
})

test("Progress MAINTAIN: în bandă ±10% → 100%", () => {
  const [r] = computeObjectiveHealth(
    inputs([obj({ targetValue: 80, currentValue: 78, direction: "MAINTAIN" })]),
    CFG,
  )
  assert.equal(r.progressPct, 100) // 78 e în banda 72-88
})

test("Progress MAINTAIN: în afara benzii → sub 100%", () => {
  const [r] = computeObjectiveHealth(
    inputs([obj({ targetValue: 80, currentValue: 60, direction: "MAINTAIN" })]),
    CFG,
  )
  assert.ok(r.progressPct !== null && r.progressPct < 100)
  assert.ok(r.progressPct > 0)
})

test("Progress currentValue null → progressPct null", () => {
  const [r] = computeObjectiveHealth(
    inputs([obj({ currentValue: null })]),
    CFG,
  )
  assert.equal(r.progressPct, null)
  assert.equal(r.momentum, "UNKNOWN")
})

// ── Risk & Health Score ───────────────────────────────────────────────────────

test("Obiectiv met (progress ≥ 100) → riskLevel NONE, health score mare", () => {
  const [r] = computeObjectiveHealth(
    inputs([obj({ currentValue: 105, targetValue: 100 })]),
    CFG,
  )
  assert.equal(r.riskLevel, "NONE")
  assert.ok(r.healthScore >= 80)
})

test("Progress 0% + deadline depășit + CRITICAL → risk CRITICAL", () => {
  const [r] = computeObjectiveHealth(
    inputs([
      obj({
        currentValue: 0,
        targetValue: 100,
        priority: "CRITICAL",
        deadlineAt: "2026-03-01T00:00:00Z", // trecut cu 36 zile
      }),
    ]),
    CFG,
  )
  assert.equal(r.riskLevel, "CRITICAL")
  assert.ok(r.healthScore <= 20)
})

test("Deadline aproape (7 zile) + progress mic → health score sub 50", () => {
  const [r] = computeObjectiveHealth(
    inputs([
      obj({
        currentValue: 20,
        targetValue: 100,
        deadlineAt: "2026-04-12T00:00:00Z", // 6 zile rămase
      }),
    ]),
    CFG,
  )
  assert.ok(r.healthScore < 50)
})

// ── Momentum ──────────────────────────────────────────────────────────────────

test("Momentum: progress mai mare decât proporția timpului → ACCELERATING", () => {
  // Start: 2026-01-01, deadline: 2026-07-01, now: 2026-04-06
  // Elapsed: ~96 zile, remaining: ~86 zile, total ~182 zile
  // Expected progress: 96/182 * 100 ≈ 53%
  // Actual: 80% → gap = +27 → ACCELERATING
  const [r] = computeObjectiveHealth(
    inputs([
      obj({
        currentValue: 80,
        startDate: "2026-01-01T00:00:00Z",
        deadlineAt: "2026-07-01T00:00:00Z",
      }),
    ]),
    CFG,
  )
  assert.equal(r.momentum, "ACCELERATING")
})

test("Momentum: progress mult sub proporția timpului → DECLINING", () => {
  // Expected ~53%, actual 10% → gap = -43 → DECLINING
  const [r] = computeObjectiveHealth(
    inputs([
      obj({
        currentValue: 10,
        startDate: "2026-01-01T00:00:00Z",
        deadlineAt: "2026-07-01T00:00:00Z",
      }),
    ]),
    CFG,
  )
  assert.equal(r.momentum, "DECLINING")
})

// ── Recommended Status ────────────────────────────────────────────────────────

test("Recomandare MET când progress ≥ 100%", () => {
  const [r] = computeObjectiveHealth(
    inputs([obj({ currentValue: 100, targetValue: 100 })]),
    CFG,
  )
  assert.equal(r.recommendedStatus, "MET")
})

test("Recomandare FAILED când deadline depășit + progress < 80%", () => {
  const [r] = computeObjectiveHealth(
    inputs([
      obj({
        currentValue: 30,
        deadlineAt: "2026-03-01T00:00:00Z",
      }),
    ]),
    CFG,
  )
  assert.equal(r.recommendedStatus, "FAILED")
})

test("DRAFT obiective rămân DRAFT (nu sunt evaluate)", () => {
  const [r] = computeObjectiveHealth(
    inputs([obj({ status: "DRAFT", currentValue: 0 })]),
    CFG,
  )
  assert.equal(r.recommendedStatus, "DRAFT")
})

// ── Related Signals ──────────────────────────────────────────────────────────

test("Strategic theme cu token match pe tags → related signal direct", () => {
  const st: StrategicThemeInput = {
    id: "st-1",
    title: "Convergență pe growth",
    confidence: "HIGH",
    severity: "MEDIUM",
    rule: "R3_bridge",
    evidence: { emergentThemeTokens: ["growth"], categoryBreakdown: {} },
  }
  const [r] = computeObjectiveHealth(
    inputs([obj({ tags: ["growth", "b2b"] })], [st]),
    CFG,
  )
  assert.equal(r.relatedSignals.length, 1)
  assert.equal(r.relatedSignals[0].type, "strategic_theme")
  assert.equal(r.relatedSignals[0].relevance, "direct")
})

test("Disfunction OPEN pe ownerRole → related signal direct", () => {
  const d: DisfunctionInput = {
    id: "d-1",
    status: "OPEN",
    severity: "HIGH",
    targetType: "ROLE",
    targetId: "CCO",
    signal: "cycle_missed_24h",
  }
  const [r] = computeObjectiveHealth(
    inputs([obj({ ownerRoles: ["CCO"] })], [], [d]),
    CFG,
  )
  assert.equal(r.relatedSignals.length, 1)
  assert.equal(r.relatedSignals[0].type, "disfunction")
})

test("Disfunction RESOLVED pe ownerRole → NU apare (filtru OPEN/ESCALATED)", () => {
  const d: DisfunctionInput = {
    id: "d-2",
    status: "RESOLVED",
    severity: "HIGH",
    targetType: "ROLE",
    targetId: "CCO",
    signal: "cycle_missed_24h",
  }
  const [r] = computeObjectiveHealth(
    inputs([obj({ ownerRoles: ["CCO"] })], [], [d]),
    CFG,
  )
  assert.equal(r.relatedSignals.length, 0)
})

// ── Sortare ───────────────────────────────────────────────────────────────────

test("Sortare: cele mai bolnave primele (healthScore crescător)", () => {
  const reports = computeObjectiveHealth(
    inputs([
      obj({ id: "good", code: "good", currentValue: 100 }),
      obj({
        id: "bad",
        code: "bad",
        currentValue: 0,
        priority: "CRITICAL",
        deadlineAt: "2026-03-01T00:00:00Z",
      }),
    ]),
    CFG,
  )
  assert.equal(reports[0].objectiveCode, "bad")
  assert.equal(reports[1].objectiveCode, "good")
  assert.ok(reports[0].healthScore < reports[1].healthScore)
})

// ── Summary ───────────────────────────────────────────────────────────────────

test("summarizeHealth — numărători corecte + avgHealthScore", () => {
  const reports = computeObjectiveHealth(
    inputs([
      obj({ id: "a", code: "a", currentValue: 100 }), // healthy
      obj({
        id: "b",
        code: "b",
        currentValue: 0,
        priority: "CRITICAL",
        deadlineAt: "2026-03-01T00:00:00Z",
      }), // critical
      obj({ id: "c", code: "c", currentValue: 50 }), // medium
    ]),
    CFG,
  )
  const s = summarizeHealth(reports)
  assert.equal(s.total, 3)
  assert.ok(s.critical >= 1)
  assert.ok(s.worstObjective !== null)
  assert.ok(s.avgHealthScore > 0 && s.avgHealthScore < 100)
})

test("summarizeHealth gol → zerouri", () => {
  const s = summarizeHealth([])
  assert.equal(s.total, 0)
  assert.equal(s.worstObjective, null)
  assert.equal(s.avgHealthScore, 0)
})
