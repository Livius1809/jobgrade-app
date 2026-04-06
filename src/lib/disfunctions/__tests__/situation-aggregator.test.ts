/**
 * Unit tests pentru situation-aggregator.
 *
 * Rulare:
 *   npx ts-node --project tsconfig.test.json src/lib/disfunctions/__tests__/situation-aggregator.test.ts
 *
 * Folosește `node:test` built-in — zero deps adăugate. Aggregatorul e funcție
 * pură, deci testele sunt deterministe (cu excepția ferestrelor temporale
 * care sunt controlate prin `detectedAt` relativ la Date.now()).
 *
 * Acoperire:
 *  - R1 known_gap_calea1_monotony
 *  - R2 stack_auto_healed
 *  - R2b stack_open_recent
 *  - R3 stack_open_needs_owner
 *  - R4 workflow_fail_rate
 *  - R5 role_cluster (≥3) + fallback single-role (<3)
 *  - R6 flux_step_stuck
 *  - fallback CONFIG_NOISE
 *  - sortare clasă + severity
 *  - summarizeSituations
 */

import { test } from "node:test"
import assert from "node:assert/strict"
import {
  aggregateSituations,
  summarizeSituations,
  type EventInput,
} from "../situation-aggregator"

// ── Helpers ────────────────────────────────────────────────────────────────────

let seq = 0
function ev(partial: Partial<EventInput>): EventInput {
  seq += 1
  return {
    id: `evt-${seq}`,
    class: "D1_TECHNICAL",
    severity: "MEDIUM",
    status: "OPEN",
    targetType: "SERVICE",
    targetId: "some-service",
    signal: "generic_signal",
    detectedAt: new Date(),
    resolvedAt: null,
    remediationOk: null,
    detectorSource: "test",
    durationMs: null,
    ...partial,
  }
}

const minutesAgo = (m: number) => new Date(Date.now() - m * 60 * 1000)

// ── R1: known_gap_calea1_monotony ──────────────────────────────────────────────

test("R1: clusterizează monotonia EMA/CCO/QLA în KNOWN_GAP_ACCEPTED", () => {
  const events: EventInput[] = [
    ev({ targetType: "ROLE", targetId: "EMA", signal: "monotone_intervene", class: "D2_FUNCTIONAL_MGMT" }),
    ev({ targetType: "ROLE", targetId: "CCO", signal: "monotone_intervene", class: "D2_FUNCTIONAL_MGMT" }),
    ev({ targetType: "ROLE", targetId: "QLA", signal: "monotone_cycle", class: "D2_FUNCTIONAL_MGMT" }),
  ]
  const situations = aggregateSituations(events)
  assert.equal(situations.length, 1)
  const s = situations[0]
  assert.equal(s.classification, "KNOWN_GAP_ACCEPTED")
  assert.equal(s.scope.count, 3)
  assert.deepEqual(s.scope.entities, ["CCO", "EMA", "QLA"])
  assert.equal(s.eventIds.length, 3)
})

test("R1: un rol non-pausat cu monotone_* NU intră în known_gap", () => {
  const events: EventInput[] = [
    ev({ targetType: "ROLE", targetId: "DMA", signal: "monotone_intervene", class: "D2_FUNCTIONAL_MGMT" }),
  ]
  const situations = aggregateSituations(events)
  assert.equal(situations.length, 1)
  assert.notEqual(situations[0].classification, "KNOWN_GAP_ACCEPTED")
})

// ── R2: stack_auto_healed ──────────────────────────────────────────────────────

test("R2: D1 RESOLVED cu remediationOk=true în 15min → AUTO_REMEDIATING", () => {
  const events: EventInput[] = [
    ev({
      class: "D1_TECHNICAL",
      status: "RESOLVED",
      remediationOk: true,
      targetId: "svc-a",
      resolvedAt: minutesAgo(3),
    }),
    ev({
      class: "D1_TECHNICAL",
      status: "RESOLVED",
      remediationOk: true,
      targetId: "svc-b",
      resolvedAt: minutesAgo(10),
    }),
  ]
  const situations = aggregateSituations(events)
  assert.equal(situations.length, 1)
  assert.equal(situations[0].classification, "AUTO_REMEDIATING")
  assert.equal(situations[0].scope.count, 2)
  assert.deepEqual(situations[0].scope.entities, ["svc-a", "svc-b"])
})

test("R2: RESOLVED mai vechi de 15min NU intră în stack_auto_healed", () => {
  const events: EventInput[] = [
    ev({
      class: "D1_TECHNICAL",
      status: "RESOLVED",
      remediationOk: true,
      targetId: "svc-old",
      resolvedAt: minutesAgo(30),
    }),
  ]
  const situations = aggregateSituations(events)
  // Cade pe fallback CONFIG_NOISE (nu se potrivește nici o altă regulă)
  assert.equal(situations.length, 1)
  assert.equal(situations[0].classification, "CONFIG_NOISE")
})

// ── R2b: stack_open_recent ─────────────────────────────────────────────────────

test("R2b: D1 SERVICE OPEN <10min → AUTO_REMEDIATING (în curs de recuperare)", () => {
  const events: EventInput[] = [
    ev({
      class: "D1_TECHNICAL",
      targetType: "SERVICE",
      status: "OPEN",
      targetId: "svc-recent",
      detectedAt: minutesAgo(3),
    }),
  ]
  const situations = aggregateSituations(events)
  assert.equal(situations.length, 1)
  assert.equal(situations[0].classification, "AUTO_REMEDIATING")
  assert.match(situations[0].title, /auto-remediere/)
})

// ── R3: stack_open_needs_owner ─────────────────────────────────────────────────

test("R3: D1 OPEN >10min → DECISION_REQUIRED", () => {
  const events: EventInput[] = [
    ev({
      class: "D1_TECHNICAL",
      targetType: "SERVICE",
      status: "OPEN",
      targetId: "svc-stuck",
      severity: "HIGH",
      detectedAt: minutesAgo(20),
    }),
  ]
  const situations = aggregateSituations(events)
  assert.equal(situations.length, 1)
  assert.equal(situations[0].classification, "DECISION_REQUIRED")
  assert.equal(situations[0].severity, "HIGH")
  assert.match(situations[0].title, /svc-stuck/)
})

// ── R4: workflow_fail_rate ─────────────────────────────────────────────────────

test("R4: D1 WORKFLOW OPEN → DECISION_REQUIRED separat pe workflow", () => {
  const events: EventInput[] = [
    ev({ class: "D1_TECHNICAL", targetType: "WORKFLOW", targetId: "FLUX-024", status: "OPEN" }),
    ev({ class: "D1_TECHNICAL", targetType: "WORKFLOW", targetId: "FLUX-024", status: "OPEN" }),
    ev({ class: "D1_TECHNICAL", targetType: "WORKFLOW", targetId: "FLUX-050", status: "OPEN" }),
  ]
  const situations = aggregateSituations(events)
  assert.equal(situations.length, 2)
  for (const s of situations) {
    assert.equal(s.classification, "DECISION_REQUIRED")
  }
  const ids = situations.map((s) => s.scope.entities[0]).sort()
  assert.deepEqual(ids, ["FLUX-024", "FLUX-050"])
})

// ── R5: role_cluster ───────────────────────────────────────────────────────────

test("R5: ≥3 roluri D2 cu același signal → DECISION_REQUIRED cluster", () => {
  const events: EventInput[] = [
    ev({ class: "D2_FUNCTIONAL_MGMT", targetType: "ROLE", targetId: "DMA", signal: "dependency_broken" }),
    ev({ class: "D2_FUNCTIONAL_MGMT", targetType: "ROLE", targetId: "CFO", signal: "dependency_broken" }),
    ev({ class: "D2_FUNCTIONAL_MGMT", targetType: "ROLE", targetId: "COA", signal: "dependency_broken" }),
  ]
  const situations = aggregateSituations(events)
  assert.equal(situations.length, 1)
  const s = situations[0]
  assert.equal(s.classification, "DECISION_REQUIRED")
  assert.equal(s.scope.count, 3)
  assert.match(s.title, /dependency_broken/)
})

test("R5: <3 roluri D2 → fallback single DECISION_REQUIRED (nu cluster)", () => {
  const events: EventInput[] = [
    ev({ class: "D2_FUNCTIONAL_MGMT", targetType: "ROLE", targetId: "DMA", signal: "dependency_broken" }),
    ev({ class: "D2_FUNCTIONAL_MGMT", targetType: "ROLE", targetId: "CFO", signal: "dependency_broken" }),
  ]
  const situations = aggregateSituations(events)
  assert.equal(situations.length, 2)
  for (const s of situations) {
    assert.equal(s.classification, "DECISION_REQUIRED")
    assert.match(s.id, /^single:/)
  }
})

// ── R6: flux_step_stuck ────────────────────────────────────────────────────────

test("R6: FLUX_STEP OPEN/ESCALATED → DECISION_REQUIRED per step", () => {
  const events: EventInput[] = [
    ev({ targetType: "FLUX_STEP", targetId: "FLUX-003:step-4", status: "ESCALATED", class: "D3_BUSINESS_PROCESS" }),
  ]
  const situations = aggregateSituations(events)
  assert.equal(situations.length, 1)
  assert.equal(situations[0].classification, "DECISION_REQUIRED")
  assert.match(situations[0].title, /FLUX-003:step-4/)
})

// ── Fallback CONFIG_NOISE ──────────────────────────────────────────────────────

test("Fallback: RESOLVED administrativ (remediationOk=null) neclasificabil → CONFIG_NOISE", () => {
  const events: EventInput[] = [
    ev({
      class: "D2_FUNCTIONAL_MGMT",
      targetType: "ROLE",
      status: "RESOLVED",
      remediationOk: null,
      targetId: "SOA",
      signal: "monotone_intervene",
      resolvedAt: minutesAgo(60),
    }),
  ]
  const situations = aggregateSituations(events)
  assert.equal(situations.length, 1)
  assert.equal(situations[0].classification, "CONFIG_NOISE")
})

// ── Sortare ────────────────────────────────────────────────────────────────────

test("Sortare: DECISION_REQUIRED înainte de AUTO_REMEDIATING / KNOWN_GAP / CONFIG_NOISE", () => {
  const events: EventInput[] = [
    // KNOWN_GAP
    ev({ targetType: "ROLE", targetId: "EMA", signal: "monotone_intervene", class: "D2_FUNCTIONAL_MGMT" }),
    ev({ targetType: "ROLE", targetId: "CCO", signal: "monotone_intervene", class: "D2_FUNCTIONAL_MGMT" }),
    ev({ targetType: "ROLE", targetId: "QLA", signal: "monotone_intervene", class: "D2_FUNCTIONAL_MGMT" }),
    // AUTO_REMEDIATING
    ev({
      class: "D1_TECHNICAL",
      status: "RESOLVED",
      remediationOk: true,
      targetId: "svc-healed",
      resolvedAt: minutesAgo(2),
    }),
    // DECISION_REQUIRED
    ev({
      class: "D1_TECHNICAL",
      targetType: "SERVICE",
      status: "OPEN",
      targetId: "svc-down",
      severity: "CRITICAL",
      detectedAt: minutesAgo(30),
    }),
  ]
  const situations = aggregateSituations(events)
  assert.equal(situations.length, 3)
  assert.equal(situations[0].classification, "DECISION_REQUIRED")
  assert.equal(situations[1].classification, "AUTO_REMEDIATING")
  assert.equal(situations[2].classification, "KNOWN_GAP_ACCEPTED")
})

test("Sortare în cadrul aceleiași clase: CRITICAL înaintea HIGH", () => {
  const events: EventInput[] = [
    ev({
      class: "D1_TECHNICAL",
      targetType: "SERVICE",
      status: "OPEN",
      targetId: "svc-high",
      severity: "HIGH",
      detectedAt: minutesAgo(20),
    }),
    ev({
      class: "D1_TECHNICAL",
      targetType: "SERVICE",
      status: "OPEN",
      targetId: "svc-critical",
      severity: "CRITICAL",
      detectedAt: minutesAgo(20),
    }),
  ]
  const situations = aggregateSituations(events)
  assert.equal(situations.length, 2)
  assert.equal(situations[0].severity, "CRITICAL")
  assert.equal(situations[1].severity, "HIGH")
})

// ── summarizeSituations ────────────────────────────────────────────────────────

test("summarizeSituations: conturează corect numărătoarea pe clase + topDecision", () => {
  const events: EventInput[] = [
    ev({
      class: "D1_TECHNICAL",
      targetType: "SERVICE",
      status: "OPEN",
      targetId: "svc-down",
      severity: "CRITICAL",
      detectedAt: minutesAgo(30),
    }),
    ev({
      class: "D1_TECHNICAL",
      status: "RESOLVED",
      remediationOk: true,
      targetId: "svc-ok",
      resolvedAt: minutesAgo(2),
    }),
    ev({ targetType: "ROLE", targetId: "EMA", signal: "monotone_intervene", class: "D2_FUNCTIONAL_MGMT" }),
    ev({ targetType: "ROLE", targetId: "CCO", signal: "monotone_intervene", class: "D2_FUNCTIONAL_MGMT" }),
    ev({ targetType: "ROLE", targetId: "QLA", signal: "monotone_intervene", class: "D2_FUNCTIONAL_MGMT" }),
  ]
  const situations = aggregateSituations(events)
  const summary = summarizeSituations(situations)
  assert.equal(summary.total, 3)
  assert.equal(summary.decisionRequired, 1)
  assert.equal(summary.autoRemediating, 1)
  assert.equal(summary.knownGap, 1)
  assert.equal(summary.configNoise, 0)
  assert.ok(summary.topDecision !== null)
  assert.equal(summary.topDecision?.severity, "CRITICAL")
})

// ── Trail integrity ────────────────────────────────────────────────────────────

test("eventIds păstrează toate id-urile pentru drill-down", () => {
  const events: EventInput[] = [
    ev({ id: "a1", class: "D2_FUNCTIONAL_MGMT", targetType: "ROLE", targetId: "R1", signal: "x" }),
    ev({ id: "a2", class: "D2_FUNCTIONAL_MGMT", targetType: "ROLE", targetId: "R2", signal: "x" }),
    ev({ id: "a3", class: "D2_FUNCTIONAL_MGMT", targetType: "ROLE", targetId: "R3", signal: "x" }),
  ]
  const situations = aggregateSituations(events)
  assert.equal(situations.length, 1)
  assert.deepEqual(situations[0].eventIds.sort(), ["a1", "a2", "a3"])
})
