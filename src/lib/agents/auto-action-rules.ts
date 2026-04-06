/**
 * Auto-Action Rules Engine — mapează semnale din awareness + goals layer
 * la propuneri concrete de AgentBehaviorPatch.
 *
 * Livrat: 06.04.2026, Increment B2 "Living Organization".
 *
 * Consumă:
 *  - ObjectiveHealthReport[] (din A2)
 *  - StrategicTheme[] (din #3 COSO)
 *  - AgentDefinition[] (org chart — cine face ce)
 *  - Existing patches (pentru dedup — nu propunem ce e deja activ/propus)
 *
 * Produce:
 *  - PatchProposal[] — gata de scris în DB ca PROPOSED
 *
 * Principii:
 *  - FUNCȚIE PURĂ — zero I/O, deterministă
 *  - Reguli explicite, ordonate pe prioritate, dedup pe (targetRole, patchType)
 *  - Fiecare regulă produce 0-N propuneri; unele pot fi pe mai mulți agenți
 *  - NU aplică patches — doar propune. Owner aprobă.
 *  - Zero LLM
 *
 * Reguli:
 *  AR1: Obiectiv CRITICAL AT_RISK → PRIORITY_SHIFT pe ownerRoles
 *  AR2: Obiectiv cu disfuncție pe owner → ATTENTION_SHIFT pe agent
 *  AR3: StrategicTheme HIGH bridge → ATTENTION_SHIFT pe agenții cu tag overlap
 *  AR4: Agent DORMANT cu obiectiv AT_RISK care-l referențiază → ACTIVITY_MODE upgrade
 *  AR5: Multiple obiective AT_RISK pe același agent → CYCLE_INTERVAL reduce
 */

// ── Tipuri ────────────────────────────────────────────────────────────────────

export interface ObjectiveHealthInput {
  objectiveId: string
  objectiveCode: string
  objectiveTitle: string
  progressPct: number | null
  riskLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "NONE"
  momentum: string
  healthScore: number
  relatedSignals: Array<{
    type: string
    id: string
    title: string
    severity: string
    relevance: string
  }>
  // From the objective itself
  priority: string
  status: string
  ownerRoles: string[]
  contributorRoles: string[]
  tags: string[]
}

export interface StrategicThemeInput {
  id: string
  title: string
  rule: string
  confidence: string
  severity: string
  evidence: {
    emergentThemeTokens: string[]
    categoryBreakdown: Record<string, number>
  }
}

export interface AgentInfoInput {
  agentRole: string
  activityMode: string
  cycleIntervalHours: number | null
  isActive: boolean
}

export interface ExistingPatchInput {
  targetRole: string
  patchType: string
  status: string
}

export interface AutoActionInputs {
  objectiveHealth: ObjectiveHealthInput[]
  strategicThemes: StrategicThemeInput[]
  agents: AgentInfoInput[]
  existingPatches: ExistingPatchInput[]
}

export interface PatchProposal {
  targetRole: string
  patchType: string
  patchSpec: Record<string, unknown>
  triggeredBy: string
  triggerSourceId: string
  rationale: string
  rule: string
}

// ── Dedup helper ──────────────────────────────────────────────────────────────

function buildExistingKey(targetRole: string, patchType: string): string {
  return `${targetRole}:${patchType}`
}

function isAlreadyPatchedOrProposed(
  existing: Set<string>,
  targetRole: string,
  patchType: string,
): boolean {
  return existing.has(buildExistingKey(targetRole, patchType))
}

// ── Reguli ────────────────────────────────────────────────────────────────────

function ar1_critical_at_risk(
  inputs: AutoActionInputs,
  existing: Set<string>,
): PatchProposal[] {
  const proposals: PatchProposal[] = []
  const criticalAtRisk = inputs.objectiveHealth.filter(
    (oh) =>
      oh.priority === "CRITICAL" &&
      (oh.riskLevel === "CRITICAL" || oh.riskLevel === "HIGH") &&
      oh.status === "ACTIVE",
  )

  for (const oh of criticalAtRisk) {
    for (const role of oh.ownerRoles) {
      if (isAlreadyPatchedOrProposed(existing, role, "PRIORITY_SHIFT")) continue
      proposals.push({
        targetRole: role,
        patchType: "PRIORITY_SHIFT",
        patchSpec: {
          to: "CRITICAL",
          context: `Obiectiv ${oh.objectiveCode} (health=${oh.healthScore})`,
        },
        triggeredBy: "AutoActionEngine",
        triggerSourceId: oh.objectiveId,
        rationale: `Obiectivul "${oh.objectiveTitle}" (${oh.objectiveCode}) are prioritate CRITICAL și risk level ${oh.riskLevel} (health=${oh.healthScore}). ${role} e owner role — propunem escalarea priorității la CRITICAL pentru focalizare.`,
        rule: "AR1_critical_at_risk",
      })
    }
  }
  return proposals
}

function ar2_disfunction_on_owner(
  inputs: AutoActionInputs,
  existing: Set<string>,
): PatchProposal[] {
  const proposals: PatchProposal[] = []

  for (const oh of inputs.objectiveHealth) {
    if (oh.status !== "ACTIVE") continue
    const disfunctionSignals = oh.relatedSignals.filter(
      (s) => s.type === "disfunction" && s.relevance === "direct",
    )
    if (disfunctionSignals.length === 0) continue

    for (const signal of disfunctionSignals) {
      // Extragem rolul din title (format: "ROLE: signal [SEVERITY]")
      const roleMatch = signal.title.match(/^(\w+):/)
      const role = roleMatch ? roleMatch[1] : null
      if (!role) continue
      if (isAlreadyPatchedOrProposed(existing, role, "ATTENTION_SHIFT")) continue

      proposals.push({
        targetRole: role,
        patchType: "ATTENTION_SHIFT",
        patchSpec: {
          focusTags: oh.tags,
          reason: `disfunction ${signal.id} pe ${role} afectează obiectivul ${oh.objectiveCode}`,
        },
        triggeredBy: "AutoActionEngine",
        triggerSourceId: oh.objectiveId,
        rationale: `${role} are disfuncție activă (${signal.title}) care afectează obiectivul "${oh.objectiveTitle}". Propunem redirecționarea atenției pe tags [${oh.tags.join(", ")}] pentru deblocare.`,
        rule: "AR2_disfunction_on_owner",
      })
    }
  }
  return proposals
}

function ar3_strategic_bridge(
  inputs: AutoActionInputs,
  existing: Set<string>,
): PatchProposal[] {
  const proposals: PatchProposal[] = []
  const highBridges = inputs.strategicThemes.filter(
    (st) => st.rule === "R3_bridge" && st.confidence === "HIGH",
  )
  if (highBridges.length === 0) return proposals

  // Găsește obiective care au tag overlap cu bridge tokens
  for (const bridge of highBridges) {
    const tokens = new Set(
      bridge.evidence.emergentThemeTokens.map((t) => t.toLowerCase()),
    )
    const matchingObjectives = inputs.objectiveHealth.filter((oh) =>
      oh.tags.some((t) => tokens.has(t.toLowerCase())),
    )
    if (matchingObjectives.length === 0) continue

    // Propunem ATTENTION_SHIFT pe contributorRoles ale obiectivelor matched
    const allContributors = new Set<string>()
    for (const oh of matchingObjectives) {
      for (const r of [...oh.ownerRoles, ...oh.contributorRoles]) {
        allContributors.add(r)
      }
    }

    for (const role of allContributors) {
      if (isAlreadyPatchedOrProposed(existing, role, "ATTENTION_SHIFT")) continue
      proposals.push({
        targetRole: role,
        patchType: "ATTENTION_SHIFT",
        patchSpec: {
          focusTags: Array.from(tokens),
          bridgeThemeId: bridge.id,
          context: `Convergență internă+externă pe ${Array.from(tokens).join(", ")}`,
        },
        triggeredBy: "AutoActionEngine",
        triggerSourceId: bridge.id,
        rationale: `Tema strategică "${bridge.title}" (HIGH confidence) are convergență externă+internă pe tokens [${Array.from(tokens).join(", ")}]. ${role} contribuie la obiective legate. Propunem redirecționare atenție.`,
        rule: "AR3_strategic_bridge",
      })
    }
  }
  return proposals
}

function ar4_dormant_upgrade(
  inputs: AutoActionInputs,
  existing: Set<string>,
): PatchProposal[] {
  const proposals: PatchProposal[] = []
  const agentMap = new Map(inputs.agents.map((a) => [a.agentRole, a]))

  const atRiskObjectives = inputs.objectiveHealth.filter(
    (oh) =>
      oh.status === "ACTIVE" &&
      (oh.riskLevel === "CRITICAL" || oh.riskLevel === "HIGH"),
  )

  for (const oh of atRiskObjectives) {
    const allRoles = [...oh.ownerRoles, ...oh.contributorRoles]
    for (const role of allRoles) {
      const agent = agentMap.get(role)
      if (!agent) continue
      if (agent.activityMode !== "DORMANT_UNTIL_DELEGATED") continue
      if (isAlreadyPatchedOrProposed(existing, role, "ACTIVITY_MODE")) continue

      proposals.push({
        targetRole: role,
        patchType: "ACTIVITY_MODE",
        patchSpec: {
          from: "DORMANT_UNTIL_DELEGATED",
          to: "PROACTIVE_CYCLIC",
        },
        triggeredBy: "AutoActionEngine",
        triggerSourceId: oh.objectiveId,
        rationale: `${role} e DORMANT dar contribuie la obiectivul "${oh.objectiveTitle}" care e ${oh.riskLevel} (health=${oh.healthScore}). Propunem activare temporară PROACTIVE_CYCLIC pentru a debloca contribuția.`,
        rule: "AR4_dormant_upgrade",
      })
    }
  }
  return proposals
}

function ar5_multiple_at_risk(
  inputs: AutoActionInputs,
  existing: Set<string>,
): PatchProposal[] {
  const proposals: PatchProposal[] = []

  // Numără câte obiective AT_RISK are fiecare agent
  const roleRiskCount = new Map<string, number>()
  for (const oh of inputs.objectiveHealth) {
    if (oh.riskLevel !== "CRITICAL" && oh.riskLevel !== "HIGH") continue
    if (oh.status !== "ACTIVE") continue
    for (const role of [...oh.ownerRoles, ...oh.contributorRoles]) {
      roleRiskCount.set(role, (roleRiskCount.get(role) ?? 0) + 1)
    }
  }

  const agentMap = new Map(inputs.agents.map((a) => [a.agentRole, a]))

  for (const [role, count] of roleRiskCount) {
    if (count < 2) continue // doar dacă ≥2 obiective AT_RISK
    const agent = agentMap.get(role)
    if (!agent || !agent.cycleIntervalHours) continue
    if (agent.cycleIntervalHours <= 4) continue // deja la minim
    if (isAlreadyPatchedOrProposed(existing, role, "CYCLE_INTERVAL")) continue

    const newInterval = Math.max(4, Math.floor(agent.cycleIntervalHours / 2))

    proposals.push({
      targetRole: role,
      patchType: "CYCLE_INTERVAL",
      patchSpec: {
        from: agent.cycleIntervalHours,
        to: newInterval,
      },
      triggeredBy: "AutoActionEngine",
      triggerSourceId: `multiple_at_risk:${role}`,
      rationale: `${role} contribuie la ${count} obiective AT_RISK simultan. Propunem reducerea intervalului de ciclu de la ${agent.cycleIntervalHours}h la ${newInterval}h pentru reacție mai rapidă.`,
      rule: "AR5_multiple_at_risk",
    })
  }
  return proposals
}

// ── Export principal ──────────────────────────────────────────────────────────

export function generateAutoProposals(
  inputs: AutoActionInputs,
): PatchProposal[] {
  // Build dedup set din patches existente non-terminal
  const existingKeys = new Set<string>()
  for (const p of inputs.existingPatches) {
    if (["PROPOSED", "APPROVED", "ACTIVE", "CONFIRMED"].includes(p.status)) {
      existingKeys.add(buildExistingKey(p.targetRole, p.patchType))
    }
  }

  // Rulează reguli în ordine de prioritate
  const all = [
    ...ar1_critical_at_risk(inputs, existingKeys),
    ...ar2_disfunction_on_owner(inputs, existingKeys),
    ...ar3_strategic_bridge(inputs, existingKeys),
    ...ar4_dormant_upgrade(inputs, existingKeys),
    ...ar5_multiple_at_risk(inputs, existingKeys),
  ]

  // Dedup: dacă două reguli propun pe același (targetRole, patchType),
  // păstrăm prima (prioritatea mai mare)
  const seen = new Set<string>()
  const deduped: PatchProposal[] = []
  for (const p of all) {
    const key = buildExistingKey(p.targetRole, p.patchType)
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(p)
  }

  return deduped
}
