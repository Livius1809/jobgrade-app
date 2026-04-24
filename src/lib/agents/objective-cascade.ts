/**
 * Objective Cascade — COG descompune un obiectiv strategic în sub-obiective
 * pe structura ierarhică a organizației.
 *
 * Livrat: 06.04.2026, extensie Goals layer.
 *
 * Flow:
 *   Owner definește obiectiv STRATEGIC
 *       ↓
 *   COG traversează org chart (AgentRelationship)
 *       ↓
 *   Creează sub-obiective DRAFT:
 *     - TACTICAL pentru manageri direcți ai COG care au legătură cu obiectivul
 *     - OPERATIONAL pentru executanții lor relevanți
 *       ↓
 *   Owner aprobă / ajustează → sub-obiective devin ACTIVE
 *
 * Principii:
 *  - FUNCȚIE PURĂ — zero I/O, zero side-effects. Primește date, returnează propuneri.
 *  - Relevanța se determină din `ownerRoles` + `contributorRoles` pe obiectivul părinte
 *    comparate cu rolurile din org chart.
 *  - Metricile se derivă din `AgentDefinition.objectives[]` unde e populat.
 *    Unde nu e, placeholder explicit "metric_pending_<role>".
 *  - NU inventează conținut semantic — doar structurează pe baza metadatelor existente.
 */

// ── Tipuri ────────────────────────────────────────────────────────────────────

export interface ParentObjective {
  id: string
  businessId: string
  code: string
  title: string
  description: string
  metricName: string
  metricUnit?: string | null
  targetValue: number
  direction: "INCREASE" | "DECREASE" | "MAINTAIN" | "REACH"
  deadlineAt?: string | Date | null
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
  ownerRoles: string[]
  contributorRoles: string[]
  tags: string[]
}

export interface AgentInfo {
  agentRole: string
  displayName: string
  description: string
  level: "STRATEGIC" | "TACTICAL" | "OPERATIONAL"
  isManager: boolean
  activityMode: string
  objectives: string[] // existing agent objectives from AgentDefinition
}

export interface OrgRelationship {
  parentRole: string
  childRole: string
}

export interface CascadeInput {
  parent: ParentObjective
  agents: AgentInfo[]
  relationships: OrgRelationship[]
}

export interface CascadeProposal {
  code: string
  title: string
  description: string
  metricName: string
  metricUnit: string | null
  targetValue: number
  currentValue: number
  direction: ParentObjective["direction"]
  level: "TACTICAL" | "OPERATIONAL"
  ownerRoles: string[]
  contributorRoles: string[]
  tags: string[]
  parentObjectiveId: string
  businessId: string
  cascadedBy: string
  priority: ParentObjective["priority"]
  deadlineAt: string | null
  /** De ce a fost propus acest sub-obiectiv */
  rationale: string
  /** True dacă metrica e auto-derivată din AgentDefinition.objectives; false dacă e placeholder */
  metricDerived: boolean
}

// ── Helper-i ──────────────────────────────────────────────────────────────────

function buildChildMap(
  rels: OrgRelationship[],
): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const r of rels) {
    const arr = map.get(r.parentRole)
    if (arr) arr.push(r.childRole)
    else map.set(r.parentRole, [r.childRole])
  }
  return map
}

function buildAgentMap(agents: AgentInfo[]): Map<string, AgentInfo> {
  const map = new Map<string, AgentInfo>()
  for (const a of agents) map.set(a.agentRole, a)
  return map
}

/**
 * Extrage prima metrica utilă din objectives[] al agentului.
 * Format objectives[]: text liber cu structura "X — descriere" sau pur text.
 * Returnează un metric name simplificat.
 */
function deriveMetricFromObjectives(
  agentObjectives: string[],
  parentMetricName: string,
): { metricName: string; metricDerived: boolean } {
  if (agentObjectives.length === 0) {
    return { metricName: `metric_pending`, metricDerived: false }
  }
  // Ia primul obiectiv, simplifică-l într-un metric name
  const first = agentObjectives[0]
  // Extrage esența: tot până la " — " sau primele 5 cuvinte
  const dashIdx = first.indexOf(" — ")
  const core =
    dashIdx > 0
      ? first.slice(0, dashIdx).trim()
      : first.split(/\s+/).slice(0, 5).join(" ")
  // Normalizează la metric_name format
  const metricName = core
    .toLowerCase()
    .replace(/[^a-z0-9ăâîșț\s_-]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 60)
  return { metricName, metricDerived: true }
}

// ── Cascadă ───────────────────────────────────────────────────────────────────

export function cascadeObjective(input: CascadeInput): CascadeProposal[] {
  const { parent } = input
  const agentMap = buildAgentMap(input.agents)
  const childMap = buildChildMap(input.relationships)

  // Set cu toate rolurile implicate în obiectivul părinte
  const involvedRoles = new Set([
    ...parent.ownerRoles,
    ...parent.contributorRoles,
  ])

  // Găsește managerii care au subordonați implicați
  // Un manager e relevant dacă:
  //  a) El însuși e în involvedRoles, SAU
  //  b) Cel puțin un subordonat al lui e în involvedRoles
  const relevantManagers = new Map<string, { reason: string; subRoles: string[] }>()

  for (const [mgrRole, children] of childMap) {
    const agent = agentMap.get(mgrRole)
    if (!agent) continue

    const selfInvolved = involvedRoles.has(mgrRole)
    const involvedChildren = children.filter((c) => involvedRoles.has(c))

    if (selfInvolved || involvedChildren.length > 0) {
      relevantManagers.set(mgrRole, {
        reason: selfInvolved
          ? `Direct owner/contributor pe ${parent.code}`
          : `Manager al ${involvedChildren.join(", ")} care sunt owner/contributor`,
        subRoles: involvedChildren,
      })
    }
  }

  // Adaugă și roluri care sunt direct în involvedRoles dar nu sunt manageri
  // și nu sunt sub nici un manager relevant (edge case: roluri independente)
  const coveredByManagers = new Set<string>()
  for (const [, { subRoles }] of relevantManagers) {
    for (const r of subRoles) coveredByManagers.add(r)
  }
  for (const [mgrRole] of relevantManagers) coveredByManagers.add(mgrRole)

  const proposals: CascadeProposal[] = []
  const deadlineIso = parent.deadlineAt
    ? typeof parent.deadlineAt === "string"
      ? parent.deadlineAt
      : parent.deadlineAt.toISOString()
    : null

  // ── TACTICAL sub-obiective (pentru manageri) ────────────────────────────────
  for (const [mgrRole, { reason, subRoles }] of relevantManagers) {
    const agent = agentMap.get(mgrRole)
    if (!agent) continue

    const { metricName, metricDerived } = deriveMetricFromObjectives(
      agent.objectives,
      parent.metricName,
    )

    proposals.push({
      code: `${parent.code}--${mgrRole.toLowerCase()}`,
      title: metricDerived
        ? `[${mgrRole}] ${agent.objectives[0]?.split(" — ")[0] ?? agent.displayName} — contribuție la ${parent.title}`
        : `[${mgrRole}] Contribuție ${agent.displayName} la ${parent.title}`,
      description: `Sub-obiectiv TACTICAL generat de COG pentru ${agent.displayName} (${mgrRole}). ${reason}. Derivat din obiectivul strategic "${parent.title}" (${parent.code}).`,
      metricName: metricDerived ? metricName : `metric_pending_${mgrRole.toLowerCase()}`,
      metricUnit: parent.metricUnit ?? null,
      targetValue: parent.targetValue,
      currentValue: 0,
      direction: parent.direction,
      level: "TACTICAL",
      ownerRoles: [mgrRole],
      contributorRoles: subRoles,
      tags: [...parent.tags, `cascade:${parent.code}`, `role:${mgrRole.toLowerCase()}`],
      parentObjectiveId: parent.id,
      businessId: parent.businessId,
      cascadedBy: "COG",
      priority: parent.priority,
      deadlineAt: deadlineIso,
      rationale: reason,
      metricDerived,
    })

    // ── OPERATIONAL sub-obiective (pentru executanții relevanți) ───────────────
    for (const subRole of subRoles) {
      const subAgent = agentMap.get(subRole)
      if (!subAgent) continue

      const subMetric = deriveMetricFromObjectives(
        subAgent.objectives,
        parent.metricName,
      )

      proposals.push({
        code: `${parent.code}--${subRole.toLowerCase()}`,
        title: subMetric.metricDerived
          ? `[${subRole}] ${subAgent.objectives[0]?.split(" — ")[0] ?? subAgent.displayName} → ${parent.title}`
          : `[${subRole}] Contribuție ${subAgent.displayName} la ${parent.title}`,
        description: `Sub-obiectiv OPERATIONAL generat de COG pentru ${subAgent.displayName} (${subRole}). Subordonat ${mgrRole}. Contribuie la obiectivul strategic "${parent.title}" (${parent.code}).`,
        metricName: subMetric.metricDerived
          ? subMetric.metricName
          : `metric_pending_${subRole.toLowerCase()}`,
        metricUnit: parent.metricUnit ?? null,
        targetValue: parent.targetValue,
        currentValue: 0,
        direction: parent.direction,
        level: "OPERATIONAL",
        ownerRoles: [subRole],
        contributorRoles: [],
        tags: [
          ...parent.tags,
          `cascade:${parent.code}`,
          `role:${subRole.toLowerCase()}`,
          `manager:${mgrRole.toLowerCase()}`,
        ],
        parentObjectiveId: parent.id,
        businessId: parent.businessId,
        cascadedBy: "COG",
        priority: parent.priority === "CRITICAL" ? "HIGH" : parent.priority,
        deadlineAt: deadlineIso,
        rationale: `Executor sub ${mgrRole}, contributor direct pe ${parent.code}`,
        metricDerived: subMetric.metricDerived,
      })
    }
  }

  // ── Roluri independente (nu sub manageri relevanți) ──────────────────────────
  for (const role of involvedRoles) {
    if (coveredByManagers.has(role)) continue
    const agent = agentMap.get(role)
    if (!agent) continue

    const { metricName, metricDerived } = deriveMetricFromObjectives(
      agent.objectives,
      parent.metricName,
    )

    proposals.push({
      code: `${parent.code}--${role.toLowerCase()}`,
      title: metricDerived
        ? `[${role}] ${agent.objectives[0]?.split(" — ")[0] ?? agent.displayName} → ${parent.title}`
        : `[${role}] Contribuție ${agent.displayName} la ${parent.title}`,
      description: `Sub-obiectiv generat de COG pentru ${agent.displayName} (${role}). Contributor independent la "${parent.title}" (${parent.code}).`,
      metricName: metricDerived ? metricName : `metric_pending_${role.toLowerCase()}`,
      metricUnit: parent.metricUnit ?? null,
      targetValue: parent.targetValue,
      currentValue: 0,
      direction: parent.direction,
      level: agent.level === "TACTICAL" ? "TACTICAL" : "OPERATIONAL",
      ownerRoles: [role],
      contributorRoles: [],
      tags: [...parent.tags, `cascade:${parent.code}`, `role:${role.toLowerCase()}`],
      parentObjectiveId: parent.id,
      businessId: parent.businessId,
      cascadedBy: "COG",
      priority: parent.priority,
      deadlineAt: deadlineIso,
      rationale: `Contributor direct pe ${parent.code}, fără manager intermediar relevant`,
      metricDerived,
    })
  }

  // Dedup pe code: dacă un rol apare și ca TACTICAL (ownerRole direct) și ca
  // OPERATIONAL (subordonat al unui manager relevant), păstrăm versiunea de
  // nivel mai înalt (TACTICAL). Cel mai mare contribuie strategic, nu operațional.
  const seen = new Map<string, CascadeProposal>()
  for (const p of proposals) {
    const existing = seen.get(p.code)
    if (!existing) {
      seen.set(p.code, p)
    } else {
      // Păstrăm TACTICAL peste OPERATIONAL
      if (p.level === "TACTICAL" && existing.level === "OPERATIONAL") {
        seen.set(p.code, p)
      }
    }
  }
  const dedupedProposals = Array.from(seen.values())

  // Sortare: TACTICAL primele, apoi OPERATIONAL; în cadrul fiecărui nivel, pe role
  dedupedProposals.sort((a, b) => {
    if (a.level !== b.level) return a.level === "TACTICAL" ? -1 : 1
    return a.code.localeCompare(b.code)
  })

  return dedupedProposals
}
