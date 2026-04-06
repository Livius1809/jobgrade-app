/**
 * Unit tests pentru objective-cascade.
 *
 * Rulare:
 *   npx ts-node --project tsconfig.test.json src/lib/agents/__tests__/objective-cascade.test.ts
 */

import { test } from "node:test"
import assert from "node:assert/strict"
import {
  cascadeObjective,
  type ParentObjective,
  type AgentInfo,
  type OrgRelationship,
  type CascadeInput,
} from "../objective-cascade"

// ── Fixtures ──────────────────────────────────────────────────────────────────

function parent(overrides: Partial<ParentObjective> = {}): ParentObjective {
  return {
    id: "obj-parent",
    businessId: "biz_jobgrade",
    code: "b2b-first-client",
    title: "Primul client B2B plătitor",
    description: "Descriere obiectiv strategic",
    metricName: "clienti_b2b_activi",
    metricUnit: "numar",
    targetValue: 1,
    direction: "REACH",
    deadlineAt: "2026-06-30T23:59:59Z",
    priority: "CRITICAL",
    ownerRoles: ["CCO", "COCSA"],
    contributorRoles: ["MKA", "CWA", "SOA"],
    tags: ["b2b", "growth"],
    ...overrides,
  }
}

function agent(role: string, overrides: Partial<AgentInfo> = {}): AgentInfo {
  return {
    agentRole: role,
    displayName: `Agent ${role}`,
    description: `Descriere ${role}`,
    level: "TACTICAL",
    isManager: false,
    activityMode: "PROACTIVE_CYCLIC",
    objectives: [],
    ...overrides,
  }
}

const AGENTS: AgentInfo[] = [
  agent("COG", { level: "STRATEGIC", isManager: true }),
  agent("COCSA", { isManager: true, objectives: ["Plan promovare B2B — canale, bugete, timeline"] }),
  agent("COA", { isManager: true, objectives: ["Stack tehnic stabil — 0 erori build"] }),
  agent("CFO", { isManager: true }),
  agent("CCO", { level: "OPERATIONAL", objectives: ["Relații client — satisfacție >90%"] }),
  agent("MKA", { level: "OPERATIONAL" }),
  agent("CWA", { level: "OPERATIONAL" }),
  agent("SOA", { level: "OPERATIONAL" }),
  agent("IRA", { level: "OPERATIONAL" }),
]

const RELS: OrgRelationship[] = [
  { parentRole: "COG", childRole: "COCSA" },
  { parentRole: "COG", childRole: "COA" },
  { parentRole: "COG", childRole: "CFO" },
  { parentRole: "COCSA", childRole: "CCO" },
  { parentRole: "COCSA", childRole: "MKA" },
  { parentRole: "COCSA", childRole: "IRA" },
  { parentRole: "COA", childRole: "CWA" },
  { parentRole: "COA", childRole: "SOA" },
]

function cascadeInput(
  parentObj?: Partial<ParentObjective>,
  agents?: AgentInfo[],
  rels?: OrgRelationship[],
): CascadeInput {
  return {
    parent: parent(parentObj),
    agents: agents ?? AGENTS,
    relationships: rels ?? RELS,
  }
}

// ── Teste ─────────────────────────────────────────────────────────────────────

test("Cascadă produce TACTICAL + OPERATIONAL sub-obiective pentru roluri relevante", () => {
  const proposals = cascadeObjective(cascadeInput())
  assert.ok(proposals.length >= 3, `Expected ≥3 proposals, got ${proposals.length}`)

  const tactical = proposals.filter((p) => p.level === "TACTICAL")
  const operational = proposals.filter((p) => p.level === "OPERATIONAL")
  assert.ok(tactical.length >= 1, "Trebuie cel puțin 1 TACTICAL")
  assert.ok(operational.length >= 1, "Trebuie cel puțin 1 OPERATIONAL")
})

test("COCSA (manager, ownerRole) primește TACTICAL sub-obiectiv", () => {
  const proposals = cascadeObjective(cascadeInput())
  const cocsa = proposals.find((p) => p.ownerRoles[0] === "COCSA")
  assert.ok(cocsa, "COCSA trebuie să aibă sub-obiectiv")
  assert.equal(cocsa.level, "TACTICAL")
  assert.equal(cocsa.cascadedBy, "COG")
  assert.equal(cocsa.parentObjectiveId, "obj-parent")
})

test("CCO (sub COCSA, ownerRole) primește OPERATIONAL sub-obiectiv", () => {
  const proposals = cascadeObjective(cascadeInput())
  const cco = proposals.find((p) => p.ownerRoles[0] === "CCO")
  assert.ok(cco, "CCO trebuie să aibă sub-obiectiv")
  assert.equal(cco.level, "OPERATIONAL")
  assert.ok(cco.tags.includes("manager:cocsa"))
})

test("MKA (sub COCSA, contributorRole) primește OPERATIONAL sub-obiectiv", () => {
  const proposals = cascadeObjective(cascadeInput())
  const mka = proposals.find((p) => p.ownerRoles[0] === "MKA")
  assert.ok(mka, "MKA trebuie să aibă sub-obiectiv")
  assert.equal(mka.level, "OPERATIONAL")
})

test("COA (manager cu subordonați CWA+SOA implicați) primește TACTICAL", () => {
  const proposals = cascadeObjective(cascadeInput())
  const coa = proposals.find((p) => p.ownerRoles[0] === "COA")
  assert.ok(coa, "COA trebuie să primească sub-obiectiv (manager al CWA, SOA)")
  assert.equal(coa.level, "TACTICAL")
  assert.ok(coa.contributorRoles.includes("CWA") || coa.contributorRoles.includes("SOA"))
})

test("CFO (manager fără subordonați implicați) NU primește sub-obiectiv", () => {
  const proposals = cascadeObjective(cascadeInput())
  const cfo = proposals.find((p) => p.ownerRoles[0] === "CFO")
  assert.equal(cfo, undefined, "CFO nu e relevant, nu trebuie inclus")
})

test("IRA (sub COCSA dar NU în ownerRoles/contributorRoles) NU primește sub-obiectiv", () => {
  const proposals = cascadeObjective(cascadeInput())
  const ira = proposals.find((p) => p.ownerRoles[0] === "IRA")
  assert.equal(ira, undefined, "IRA nu e owner/contributor pe obiectiv")
})

test("Metrici derivate din agent.objectives cand populat (metricDerived=true)", () => {
  const proposals = cascadeObjective(cascadeInput())
  const cocsa = proposals.find((p) => p.ownerRoles[0] === "COCSA")
  assert.ok(cocsa)
  assert.equal(cocsa.metricDerived, true)
  assert.ok(!cocsa.metricName.startsWith("metric_pending"))
})

test("Metrici placeholder cand agent.objectives e gol (metricDerived=false)", () => {
  const proposals = cascadeObjective(cascadeInput())
  const mka = proposals.find((p) => p.ownerRoles[0] === "MKA")
  assert.ok(mka)
  assert.equal(mka.metricDerived, false)
  assert.ok(mka.metricName.startsWith("metric_pending"))
})

test("Code-ul sub-obiectivului e parent.code--role.lowercase", () => {
  const proposals = cascadeObjective(cascadeInput())
  const cocsa = proposals.find((p) => p.ownerRoles[0] === "COCSA")
  assert.ok(cocsa)
  assert.equal(cocsa.code, "b2b-first-client--cocsa")
})

test("Tags includ cascade:<parent.code> + role:<role>", () => {
  const proposals = cascadeObjective(cascadeInput())
  const cco = proposals.find((p) => p.ownerRoles[0] === "CCO")
  assert.ok(cco)
  assert.ok(cco.tags.includes("cascade:b2b-first-client"))
  assert.ok(cco.tags.includes("role:cco"))
})

test("Sortare: TACTICAL primele, OPERATIONAL după", () => {
  const proposals = cascadeObjective(cascadeInput())
  const firstOp = proposals.findIndex((p) => p.level === "OPERATIONAL")
  const lastTact = proposals.reduce(
    (acc, p, i) => (p.level === "TACTICAL" ? i : acc),
    -1,
  )
  assert.ok(lastTact < firstOp || firstOp === -1, "TACTICAL before OPERATIONAL")
})

test("Priority CRITICAL pe parent → OPERATIONAL primesc HIGH (o treaptă sub)", () => {
  const proposals = cascadeObjective(cascadeInput({ priority: "CRITICAL" }))
  const operational = proposals.filter((p) => p.level === "OPERATIONAL")
  for (const o of operational) {
    assert.equal(o.priority, "HIGH")
  }
})

test("Obiectiv fără ownerRoles/contributorRoles → zero proposals", () => {
  const proposals = cascadeObjective(
    cascadeInput({ ownerRoles: [], contributorRoles: [] }),
  )
  assert.equal(proposals.length, 0)
})
