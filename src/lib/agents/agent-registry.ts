/**
 * agent-registry.ts — DB-backed agent registry cu cache + fallback static
 *
 * Înlocuiește importurile statice din manager-configs, escalation-chain,
 * cold-start și propagate cu citiri din DB (AgentDefinition + AgentRelationship).
 * Dacă tabelele sunt goale, fallback la exporturile statice.
 */

import type { PrismaClient } from "@/generated/prisma"
import { MANAGER_CONFIGS, type ManagerConfig, type ManagerThresholds } from "./manager-configs"
import { ESCALATION_CHAIN } from "./escalation-chain"
import { SELF_INTERVIEW_PROMPTS, ALL_AGENT_ROLES } from "../kb/cold-start"

// ── Cache ────────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 60_000 // 60 seconds
const cache = new Map<string, { data: any; expiresAt: number }>()

function getCached<T>(key: string): T | null {
  const entry = cache.get(key)
  if (entry && Date.now() < entry.expiresAt) return entry.data as T
  cache.delete(key)
  return null
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS })
}

export function clearRegistryCache(): void {
  cache.clear()
}

// ── Org Tree Types ───────────────────────────────────────────────────────────

export interface OrgNode {
  agentRole: string
  displayName: string
  description: string
  level: string
  isManager: boolean
  isActive: boolean
  parentRole: string | null
  children: OrgNode[]
  objectives: string[]
  cycleIntervalHours: number | null
}

// ── Registry Functions ───────────────────────────────────────────────────────

/**
 * Get all active agent definitions from DB, or fallback to static.
 */
export async function getAllAgents(prisma: PrismaClient): Promise<any[]> {
  const cached = getCached<any[]>("allAgents")
  if (cached) return cached

  try {
    const agents = await (prisma as any).agentDefinition.findMany({
      where: { isActive: true },
      orderBy: { agentRole: "asc" },
    })
    if (agents.length > 0) {
      setCache("allAgents", agents)
      return agents
    }
  } catch {
    // Table doesn't exist yet — use fallback
  }

  return [] // empty = use fallback
}

/**
 * Get all agent roles — DB-backed with static fallback.
 */
export async function getAllAgentRoles(prisma: PrismaClient): Promise<string[]> {
  const agents = await getAllAgents(prisma)
  if (agents.length > 0) return agents.map((a: any) => a.agentRole)
  return ALL_AGENT_ROLES
}

/**
 * Get manager configs — DB-backed with static fallback.
 */
export async function getManagerConfigs(prisma: PrismaClient): Promise<ManagerConfig[]> {
  const cached = getCached<ManagerConfig[]>("managerConfigs")
  if (cached) return cached

  const agents = await getAllAgents(prisma)
  if (agents.length === 0) return MANAGER_CONFIGS

  const managers = agents.filter((a: any) => a.isManager)
  if (managers.length === 0) return MANAGER_CONFIGS

  // Build configs from DB
  const relationships = await getRelationships(prisma)
  const configs: ManagerConfig[] = managers.map((m: any) => {
    const subordinates = relationships
      .filter((r: any) => r.parentRole === m.agentRole && r.isActive)
      .map((r: any) => r.childRole)

    const parent = relationships.find(
      (r: any) => r.childRole === m.agentRole && r.isActive
    )

    return {
      agentRole: m.agentRole,
      role: m.displayName,
      description: m.description,
      level: m.level.toLowerCase() as "strategic" | "tactical" | "operational",
      subordinates,
      reportsTo: parent?.parentRole || "OWNER",
      objectives: m.objectives || [],
      thresholds: (m.thresholds as ManagerThresholds) || {
        healthScoreCritical: 30,
        healthScoreWarning: 55,
        maxIdleDays: 5,
        maxPendingBuffer: 20,
      },
      cycleIntervalHours: m.cycleIntervalHours || 12,
    }
  })

  setCache("managerConfigs", configs)
  return configs
}

/**
 * Get single manager config.
 */
export async function getManagerConfig(
  agentRole: string,
  prisma: PrismaClient
): Promise<ManagerConfig | undefined> {
  const configs = await getManagerConfigs(prisma)
  return configs.find((c) => c.agentRole === agentRole)
}

/**
 * Get managers by level.
 */
export async function getManagersByLevel(
  level: "strategic" | "tactical" | "operational",
  prisma: PrismaClient
): Promise<ManagerConfig[]> {
  const configs = await getManagerConfigs(prisma)
  return configs.filter((c) => c.level === level)
}

/**
 * Get escalation chain — DB-backed with static fallback.
 */
export async function getEscalationChain(
  prisma: PrismaClient
): Promise<Record<string, string>> {
  const cached = getCached<Record<string, string>>("escalationChain")
  if (cached) return cached

  const relationships = await getRelationships(prisma)
  if (relationships.length === 0) return ESCALATION_CHAIN

  const chain: Record<string, string> = {}
  for (const r of relationships) {
    if (r.isActive && r.relationType === "REPORTS_TO") {
      chain[r.childRole] = r.parentRole
    }
  }

  if (Object.keys(chain).length === 0) return ESCALATION_CHAIN

  setCache("escalationChain", chain)
  return chain
}

/**
 * Get self-interview prompts — DB-backed with static fallback.
 */
export async function getSelfInterviewPrompts(
  prisma: PrismaClient
): Promise<Record<string, { description: string; prompts: string[] }>> {
  const agents = await getAllAgents(prisma)
  if (agents.length === 0) return SELF_INTERVIEW_PROMPTS

  const prompts: Record<string, { description: string; prompts: string[] }> = {}
  for (const a of agents) {
    if (a.coldStartPrompts && a.coldStartPrompts.length > 0) {
      prompts[a.agentRole] = {
        description: a.coldStartDescription || a.description,
        prompts: a.coldStartPrompts,
      }
    }
  }

  // Fallback: merge with static for agents not yet in DB
  for (const [role, config] of Object.entries(SELF_INTERVIEW_PROMPTS)) {
    if (!prompts[role]) prompts[role] = config
  }

  return prompts
}

/**
 * Get propagation rules — DB-backed with static fallback.
 */
export async function getPropagationRules(
  prisma: PrismaClient
): Promise<Record<string, Array<{ targetRole: string; reason: string }>>> {
  const agents = await getAllAgents(prisma)
  if (agents.length === 0) return {} // will use static fallback in propagate.ts

  const rules: Record<string, Array<{ targetRole: string; reason: string }>> = {}
  for (const a of agents) {
    if (a.propagationTargets && Array.isArray(a.propagationTargets)) {
      rules[a.agentRole] = a.propagationTargets as Array<{
        targetRole: string
        reason: string
      }>
    }
  }

  return Object.keys(rules).length > 0 ? rules : {}
}

/**
 * Get full org tree.
 */
export async function getOrgTree(prisma: PrismaClient): Promise<OrgNode[]> {
  const agents = await getAllAgents(prisma)
  const relationships = await getRelationships(prisma)

  if (agents.length === 0) {
    // Build from static
    return buildStaticOrgTree()
  }

  // Build parent map
  const parentMap = new Map<string, string>()
  for (const r of relationships) {
    if (r.isActive && r.relationType === "REPORTS_TO") {
      parentMap.set(r.childRole, r.parentRole)
    }
  }

  // Build nodes
  const nodeMap = new Map<string, OrgNode>()
  for (const a of agents) {
    nodeMap.set(a.agentRole, {
      agentRole: a.agentRole,
      displayName: a.displayName,
      description: a.description,
      level: a.level,
      isManager: a.isManager,
      isActive: a.isActive,
      parentRole: parentMap.get(a.agentRole) || null,
      children: [],
      objectives: a.objectives || [],
      cycleIntervalHours: a.cycleIntervalHours,
    })
  }

  // Link children
  for (const [role, parent] of parentMap) {
    const parentNode = nodeMap.get(parent)
    const childNode = nodeMap.get(role)
    if (parentNode && childNode) {
      parentNode.children.push(childNode)
    }
  }

  // Return roots (nodes without parent)
  return [...nodeMap.values()].filter((n) => !n.parentRole)
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getRelationships(prisma: PrismaClient): Promise<any[]> {
  const cached = getCached<any[]>("relationships")
  if (cached) return cached

  try {
    const rels = await (prisma as any).agentRelationship.findMany({
      where: { isActive: true },
    })
    if (rels.length > 0) {
      setCache("relationships", rels)
      return rels
    }
  } catch {
    // Table doesn't exist
  }

  return []
}

function buildStaticOrgTree(): OrgNode[] {
  // Build from ESCALATION_CHAIN + MANAGER_CONFIGS
  const managerMap = new Map(MANAGER_CONFIGS.map((m) => [m.agentRole, m]))
  const allRoles = new Set([
    ...Object.keys(ESCALATION_CHAIN),
    ...MANAGER_CONFIGS.map((m) => m.agentRole),
  ])

  const nodeMap = new Map<string, OrgNode>()
  for (const role of allRoles) {
    const mc = managerMap.get(role)
    const prompt = SELF_INTERVIEW_PROMPTS[role]
    nodeMap.set(role, {
      agentRole: role,
      displayName: mc?.role || role,
      description: prompt?.description || mc?.description || role,
      level: mc?.level?.toUpperCase() || "OPERATIONAL",
      isManager: !!mc,
      isActive: true,
      parentRole: ESCALATION_CHAIN[role] || null,
      children: [],
      objectives: mc?.objectives || [],
      cycleIntervalHours: mc?.cycleIntervalHours || null,
    })
  }

  // Link children
  for (const [role, parent] of Object.entries(ESCALATION_CHAIN)) {
    const parentNode = nodeMap.get(parent)
    const childNode = nodeMap.get(role)
    if (parentNode && childNode) {
      parentNode.children.push(childNode)
    }
  }

  // Root = COG (no parent or parent=OWNER)
  return [...nodeMap.values()].filter(
    (n) => !n.parentRole || n.parentRole === "OWNER"
  )
}
