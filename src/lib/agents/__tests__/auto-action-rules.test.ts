/**
 * Unit tests pentru auto-action-rules.
 *
 * Rulare:
 *   npx ts-node --project tsconfig.test.json src/lib/agents/__tests__/auto-action-rules.test.ts
 */

import { test } from "node:test"
import assert from "node:assert/strict"
import {
  generateAutoProposals,
  type ObjectiveHealthInput,
  type StrategicThemeInput,
  type AgentInfoInput,
  type ExistingPatchInput,
  type AutoActionInputs,
} from "../auto-action-rules"

function oh(overrides: Partial<ObjectiveHealthInput> = {}): ObjectiveHealthInput {
  return {
    objectiveId: "obj-1",
    objectiveCode: "b2b-first-client",
    objectiveTitle: "Primul client B2B",
    progressPct: 0,
    riskLevel: "HIGH",
    momentum: "STALLING",
    healthScore: 25,
    relatedSignals: [],
    priority: "CRITICAL",
    status: "ACTIVE",
    ownerRoles: ["CCO"],
    contributorRoles: ["MKA", "SOA"],
    tags: ["b2b", "growth"],
    ...overrides,
  }
}

function st(overrides: Partial<StrategicThemeInput> = {}): StrategicThemeInput {
  return {
    id: "st-1",
    title: "Convergență leadership",
    rule: "R3_bridge",
    confidence: "HIGH",
    severity: "MEDIUM",
    evidence: { emergentThemeTokens: ["leadership"], categoryBreakdown: {} },
    ...overrides,
  }
}

function agent(role: string, overrides: Partial<AgentInfoInput> = {}): AgentInfoInput {
  return {
    agentRole: role,
    activityMode: "PROACTIVE_CYCLIC",
    cycleIntervalHours: 12,
    isActive: true,
    ...overrides,
  }
}

function inputs(overrides: Partial<AutoActionInputs> = {}): AutoActionInputs {
  return {
    objectiveHealth: [],
    strategicThemes: [],
    agents: [agent("CCO"), agent("MKA"), agent("SOA"), agent("COCSA")],
    existingPatches: [],
    ...overrides,
  }
}

// ── AR1: Critical AT_RISK → PRIORITY_SHIFT ────────────────────────────────────

test("AR1: obiectiv CRITICAL AT_RISK → PRIORITY_SHIFT pe ownerRoles", () => {
  const proposals = generateAutoProposals(
    inputs({ objectiveHealth: [oh()] }),
  )
  const ar1 = proposals.filter((p) => p.rule === "AR1_critical_at_risk")
  assert.equal(ar1.length, 1)
  assert.equal(ar1[0].targetRole, "CCO")
  assert.equal(ar1[0].patchType, "PRIORITY_SHIFT")
})

test("AR1: obiectiv HIGH (nu CRITICAL) → NU propune", () => {
  const proposals = generateAutoProposals(
    inputs({ objectiveHealth: [oh({ priority: "HIGH" })] }),
  )
  assert.equal(
    proposals.filter((p) => p.rule === "AR1_critical_at_risk").length,
    0,
  )
})

test("AR1: obiectiv CRITICAL dar riskLevel LOW → NU propune", () => {
  const proposals = generateAutoProposals(
    inputs({ objectiveHealth: [oh({ riskLevel: "LOW", healthScore: 80 })] }),
  )
  assert.equal(
    proposals.filter((p) => p.rule === "AR1_critical_at_risk").length,
    0,
  )
})

// ── AR2: Disfuncție pe owner → ATTENTION_SHIFT ────────────────────────────────

test("AR2: disfuncție OPEN pe ownerRole → ATTENTION_SHIFT", () => {
  const proposals = generateAutoProposals(
    inputs({
      objectiveHealth: [
        oh({
          relatedSignals: [
            {
              type: "disfunction",
              id: "d-1",
              title: "CCO: monotone_INTERVENE [HIGH]",
              severity: "HIGH",
              relevance: "direct",
            },
          ],
        }),
      ],
    }),
  )
  const ar2 = proposals.filter((p) => p.rule === "AR2_disfunction_on_owner")
  assert.equal(ar2.length, 1)
  assert.equal(ar2[0].targetRole, "CCO")
  assert.equal(ar2[0].patchType, "ATTENTION_SHIFT")
})

// ── AR3: Strategic bridge HIGH → ATTENTION_SHIFT pe contributori ──────────────

test("AR3: bridge HIGH cu tag match pe obiectiv → ATTENTION_SHIFT pe roles", () => {
  const proposals = generateAutoProposals(
    inputs({
      objectiveHealth: [oh({ tags: ["growth", "leadership"] })],
      strategicThemes: [st()],
    }),
  )
  const ar3 = proposals.filter((p) => p.rule === "AR3_strategic_bridge")
  assert.ok(ar3.length >= 1)
  // Ar trebui să propună pe ownerRoles + contributorRoles ale obiectivului matched
  const roles = ar3.map((p) => p.targetRole).sort()
  assert.ok(roles.includes("MKA") || roles.includes("SOA") || roles.includes("CCO"))
})

test("AR3: bridge HIGH fără tag match pe obiective → 0 propuneri", () => {
  const proposals = generateAutoProposals(
    inputs({
      objectiveHealth: [oh({ tags: ["b2b", "commercial"] })], // no "leadership"
      strategicThemes: [st()],
    }),
  )
  assert.equal(
    proposals.filter((p) => p.rule === "AR3_strategic_bridge").length,
    0,
  )
})

// ── AR4: DORMANT + obiectiv AT_RISK → ACTIVITY_MODE upgrade ──────────────────

test("AR4: agent DORMANT contribuie la obiectiv AT_RISK → propune PROACTIVE", () => {
  const proposals = generateAutoProposals(
    inputs({
      objectiveHealth: [oh({ contributorRoles: ["DOAS"] })],
      agents: [
        agent("CCO"),
        agent("DOAS", { activityMode: "DORMANT_UNTIL_DELEGATED" }),
      ],
    }),
  )
  const ar4 = proposals.filter((p) => p.rule === "AR4_dormant_upgrade")
  assert.equal(ar4.length, 1)
  assert.equal(ar4[0].targetRole, "DOAS")
  assert.equal(ar4[0].patchType, "ACTIVITY_MODE")
})

test("AR4: agent PROACTIVE (nu DORMANT) → NU propune upgrade", () => {
  const proposals = generateAutoProposals(
    inputs({
      objectiveHealth: [oh()],
      agents: [agent("CCO"), agent("MKA")],
    }),
  )
  assert.equal(
    proposals.filter((p) => p.rule === "AR4_dormant_upgrade").length,
    0,
  )
})

// ── AR5: Multiple obiective AT_RISK pe același agent → CYCLE_INTERVAL ────────

test("AR5: agent cu ≥2 obiective AT_RISK → reduce cycle interval", () => {
  const proposals = generateAutoProposals(
    inputs({
      objectiveHealth: [
        oh({ objectiveId: "o1", ownerRoles: ["COCSA"] }),
        oh({ objectiveId: "o2", objectiveCode: "other", ownerRoles: ["COCSA"] }),
      ],
      agents: [agent("CCO"), agent("COCSA", { cycleIntervalHours: 12 })],
    }),
  )
  const ar5 = proposals.filter((p) => p.rule === "AR5_multiple_at_risk")
  assert.equal(ar5.length, 1)
  assert.equal(ar5[0].targetRole, "COCSA")
  assert.equal(ar5[0].patchType, "CYCLE_INTERVAL")
  assert.equal((ar5[0].patchSpec as Record<string, number>).to, 6)
})

test("AR5: agent cu 1 obiectiv AT_RISK → NU propune (sub prag)", () => {
  const proposals = generateAutoProposals(
    inputs({
      objectiveHealth: [oh({ ownerRoles: ["COCSA"] })],
      agents: [agent("COCSA", { cycleIntervalHours: 12 })],
    }),
  )
  assert.equal(
    proposals.filter((p) => p.rule === "AR5_multiple_at_risk").length,
    0,
  )
})

// ── Dedup ─────────────────────────────────────────────────────────────────────

test("Dedup: patch deja ACTIVE pe (CCO, PRIORITY_SHIFT) → NU propune din nou", () => {
  const proposals = generateAutoProposals(
    inputs({
      objectiveHealth: [oh()],
      existingPatches: [
        { targetRole: "CCO", patchType: "PRIORITY_SHIFT", status: "ACTIVE" },
      ],
    }),
  )
  assert.equal(
    proposals.filter(
      (p) => p.targetRole === "CCO" && p.patchType === "PRIORITY_SHIFT",
    ).length,
    0,
  )
})

test("Dedup: patch EXPIRED pe (CCO, PRIORITY_SHIFT) → propune din nou (terminal)", () => {
  const proposals = generateAutoProposals(
    inputs({
      objectiveHealth: [oh()],
      existingPatches: [
        { targetRole: "CCO", patchType: "PRIORITY_SHIFT", status: "EXPIRED" },
      ],
    }),
  )
  assert.ok(
    proposals.filter(
      (p) => p.targetRole === "CCO" && p.patchType === "PRIORITY_SHIFT",
    ).length >= 1,
  )
})

test("Dedup inter-reguli: AR1 și AR2 propun pe CCO → doar una trece", () => {
  const proposals = generateAutoProposals(
    inputs({
      objectiveHealth: [
        oh({
          relatedSignals: [
            {
              type: "disfunction",
              id: "d-1",
              title: "CCO: cycle_missed [HIGH]",
              severity: "HIGH",
              relevance: "direct",
            },
          ],
        }),
      ],
      // AR3 va propune ATTENTION_SHIFT pe CCO. AR1 propune PRIORITY_SHIFT pe CCO.
      // Ambele trec — sunt patchType diferit.
    }),
  )
  const ccoPriority = proposals.filter(
    (p) => p.targetRole === "CCO" && p.patchType === "PRIORITY_SHIFT",
  )
  const ccoAttention = proposals.filter(
    (p) => p.targetRole === "CCO" && p.patchType === "ATTENTION_SHIFT",
  )
  assert.equal(ccoPriority.length, 1, "AR1 propune PRIORITY_SHIFT")
  assert.equal(ccoAttention.length, 1, "AR2 propune ATTENTION_SHIFT")
})

// ── Zero input ────────────────────────────────────────────────────────────────

test("Zero obiective + zero themes → zero propuneri", () => {
  const proposals = generateAutoProposals(inputs())
  assert.equal(proposals.length, 0)
})
