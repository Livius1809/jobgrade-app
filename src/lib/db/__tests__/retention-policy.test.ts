/**
 * Unit tests pentru retention-policy.
 *
 * Rulare:
 *   npx ts-node --project tsconfig.test.json src/lib/db/__tests__/retention-policy.test.ts
 *
 * Testează doar getRetentionPolicy() — funcțiile async (checkRetention, executeRetention)
 * necesită un PrismaClient real sau mock complet.
 */

import { test } from "node:test"
import assert from "node:assert/strict"
import {
  getRetentionPolicy,
  type RetentionRule,
  type RetentionAction,
} from "../retention-policy"

const VALID_ACTIONS: RetentionAction[] = ["DELETE", "ARCHIVE", "ANONYMIZE", "SUMMARIZE"]

// ── Returns all retention rules ──────────────────────────────────────────────

test("getRetentionPolicy returns all 10 retention rules", () => {
  const rules = getRetentionPolicy()
  assert.equal(rules.length, 10, `Expected 10 rules, got ${rules.length}`)
})

test("getRetentionPolicy returns a new array each call (immutable)", () => {
  const rules1 = getRetentionPolicy()
  const rules2 = getRetentionPolicy()
  assert.notEqual(rules1, rules2, "Should return a copy, not the same reference")
  assert.deepStrictEqual(rules1, rules2, "Copies should have identical content")
})

// ── Each rule has required fields ────────────────────────────────────────────

test("Each rule has model, retentionDays, action, filterSQL", () => {
  const rules = getRetentionPolicy()
  for (const rule of rules) {
    assert.ok(typeof rule.model === "string" && rule.model.length > 0,
      `Rule should have non-empty model, got: ${rule.model}`)
    assert.ok(typeof rule.retentionDays === "number" && rule.retentionDays > 0,
      `Rule ${rule.model} should have positive retentionDays, got: ${rule.retentionDays}`)
    assert.ok(typeof rule.action === "string" && rule.action.length > 0,
      `Rule ${rule.model} should have non-empty action, got: ${rule.action}`)
    assert.ok(typeof rule.filterSQL === "string" && rule.filterSQL.length > 0,
      `Rule ${rule.model} should have non-empty filterSQL, got: ${rule.filterSQL}`)
  }
})

test("Each rule has table, description, and dateColumn", () => {
  const rules = getRetentionPolicy()
  for (const rule of rules) {
    assert.ok(typeof rule.table === "string" && rule.table.length > 0,
      `Rule ${rule.model} should have non-empty table`)
    assert.ok(typeof rule.description === "string" && rule.description.length > 0,
      `Rule ${rule.model} should have non-empty description`)
    assert.ok(typeof rule.dateColumn === "string" && rule.dateColumn.length > 0,
      `Rule ${rule.model} should have non-empty dateColumn`)
  }
})

// ── Actions are valid ────────────────────────────────────────────────────────

test("All actions are valid RetentionAction values", () => {
  const rules = getRetentionPolicy()
  for (const rule of rules) {
    assert.ok(
      VALID_ACTIONS.includes(rule.action),
      `Rule ${rule.model} has invalid action '${rule.action}'. Valid: ${VALID_ACTIONS.join(", ")}`
    )
  }
})

// ── Specific rules validation ────────────────────────────────────────────────

test("ConversationMessage rule: ARCHIVE at 365 days", () => {
  const rules = getRetentionPolicy()
  const rule = rules.find((r) => r.model === "ConversationMessage")
  assert.ok(rule, "ConversationMessage rule should exist")
  assert.equal(rule!.action, "ARCHIVE")
  assert.equal(rule!.retentionDays, 365)
})

test("KBBuffer rule: DELETE at 180 days", () => {
  const rules = getRetentionPolicy()
  const rule = rules.find((r) => r.model === "KBBuffer")
  assert.ok(rule, "KBBuffer rule should exist")
  assert.equal(rule!.action, "DELETE")
  assert.equal(rule!.retentionDays, 180)
})

test("Lead rule: ANONYMIZE at 540 days", () => {
  const rules = getRetentionPolicy()
  const rule = rules.find((r) => r.model === "Lead")
  assert.ok(rule, "Lead rule should exist")
  assert.equal(rule!.action, "ANONYMIZE")
  assert.equal(rule!.retentionDays, 540)
})

test("B2CEvolutionEntry rule: SUMMARIZE at 730 days", () => {
  const rules = getRetentionPolicy()
  const rule = rules.find((r) => r.model === "B2CEvolutionEntry")
  assert.ok(rule, "B2CEvolutionEntry rule should exist")
  assert.equal(rule!.action, "SUMMARIZE")
  assert.equal(rule!.retentionDays, 730)
})

test("CycleLog rule: DELETE at 90 days (shortest retention)", () => {
  const rules = getRetentionPolicy()
  const rule = rules.find((r) => r.model === "CycleLog")
  assert.ok(rule, "CycleLog rule should exist")
  assert.equal(rule!.action, "DELETE")
  assert.equal(rule!.retentionDays, 90)
})

// ── All expected models are present ──────────────────────────────────────────

test("All expected models are present in the policy", () => {
  const rules = getRetentionPolicy()
  const models = rules.map((r) => r.model)

  const expectedModels = [
    "ConversationMessage",
    "B2CJournalEntry",
    "B2CEvolutionEntry",
    "KBBuffer",
    "InteractionLog",
    "CycleLog",
    "AgentMetric",
    "Escalation",
    "Lead",
    "DisfunctionEvent",
  ]

  for (const model of expectedModels) {
    assert.ok(models.includes(model), `Model '${model}' should be in the retention policy`)
  }
})

// ── Action distribution ──────────────────────────────────────────────────────

test("Policy uses all 4 action types across rules", () => {
  const rules = getRetentionPolicy()
  const usedActions = new Set(rules.map((r) => r.action))

  for (const action of VALID_ACTIONS) {
    assert.ok(usedActions.has(action),
      `Action '${action}' should be used by at least one rule`)
  }
})

// ── Unique models ────────────────────────────────────────────────────────────

test("No duplicate model names in the policy", () => {
  const rules = getRetentionPolicy()
  const models = rules.map((r) => r.model)
  const unique = new Set(models)
  assert.equal(unique.size, models.length, "Each model should appear only once")
})
