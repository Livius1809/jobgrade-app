/**
 * hierarchy-validator.ts — Validare integritate ierarhie agenți
 *
 * Verificări:
 * 1. No cycles (DFS)
 * 2. Max depth 5 (BFS from roots)
 * 3. Every non-root agent has exactly one REPORTS_TO parent
 * 4. Every agent has a path to OWNER (via escalation chain)
 * 5. No orphaned active agents
 */

import type { PrismaClient } from "@/generated/prisma"

export interface HierarchyError {
  type: "CYCLE" | "MAX_DEPTH" | "NO_PARENT" | "ORPHAN" | "MULTI_PARENT" | "NO_PATH_TO_OWNER"
  severity: "CRITICAL" | "WARNING"
  agents: string[]
  message: string
}

export interface HierarchyValidation {
  valid: boolean
  errors: HierarchyError[]
  stats: {
    totalAgents: number
    totalRelationships: number
    maxDepth: number
    roots: string[]
  }
}

const MAX_DEPTH = 5

export async function validateHierarchy(prisma: PrismaClient): Promise<HierarchyValidation> {
  const errors: HierarchyError[] = []

  const agents = await (prisma as any).agentDefinition.findMany({
    where: { isActive: true },
    select: { agentRole: true },
  })
  const agentRoles = new Set<string>(agents.map((a: any) => a.agentRole))

  const relationships = await (prisma as any).agentRelationship.findMany({
    where: { isActive: true, relationType: "REPORTS_TO" },
    select: { parentRole: true, childRole: true },
  })

  // Build adjacency maps
  const childToParent = new Map<string, string[]>()
  const parentToChildren = new Map<string, string[]>()

  for (const r of relationships) {
    const parents = childToParent.get(r.childRole) || []
    parents.push(r.parentRole)
    childToParent.set(r.childRole, parents)

    const children = parentToChildren.get(r.parentRole) || []
    children.push(r.childRole)
    parentToChildren.set(r.parentRole, children)
  }

  // 1. Check for multiple parents
  for (const [child, parents] of childToParent) {
    if (parents.length > 1) {
      errors.push({
        type: "MULTI_PARENT",
        severity: "CRITICAL",
        agents: [child, ...parents],
        message: `${child} are ${parents.length} părinți: ${parents.join(", ")}. Trebuie exact 1.`,
      })
    }
  }

  // 2. Find roots (agents without parent)
  const roots = [...agentRoles].filter((r) => !childToParent.has(r))

  // 3. Check for orphans (agents not reachable from any root)
  const reachable = new Set<string>()
  function dfs(role: string) {
    if (reachable.has(role)) return
    reachable.add(role)
    const children = parentToChildren.get(role) || []
    for (const child of children) dfs(child)
  }
  for (const root of roots) dfs(root)

  const orphans = [...agentRoles].filter((r) => !reachable.has(r))
  if (orphans.length > 0) {
    errors.push({
      type: "ORPHAN",
      severity: "WARNING",
      agents: orphans,
      message: `${orphans.length} agenți orfani (nu pot fi atinși din nicio rădăcină): ${orphans.join(", ")}`,
    })
  }

  // 4. Check for cycles (DFS with visited + recursion stack)
  const visited = new Set<string>()
  const inStack = new Set<string>()
  let hasCycle = false
  const cycleAgents: string[] = []

  function detectCycle(role: string): boolean {
    visited.add(role)
    inStack.add(role)

    const children = parentToChildren.get(role) || []
    for (const child of children) {
      if (!visited.has(child)) {
        if (detectCycle(child)) return true
      } else if (inStack.has(child)) {
        hasCycle = true
        cycleAgents.push(role, child)
        return true
      }
    }

    inStack.delete(role)
    return false
  }

  for (const root of roots) {
    if (!visited.has(root)) detectCycle(root)
  }
  // Also check unreachable nodes
  for (const role of agentRoles) {
    if (!visited.has(role)) detectCycle(role)
  }

  if (hasCycle) {
    errors.push({
      type: "CYCLE",
      severity: "CRITICAL",
      agents: [...new Set(cycleAgents)],
      message: `Ciclu detectat în ierarhie implicând: ${[...new Set(cycleAgents)].join(", ")}`,
    })
  }

  // 5. Check max depth (BFS)
  let maxDepth = 0
  for (const role of agentRoles) {
    let depth = 0
    let current = role
    const seen = new Set<string>()
    while (childToParent.has(current) && !seen.has(current)) {
      seen.add(current)
      const parents = childToParent.get(current)!
      current = parents[0] // follow first parent
      depth++
    }
    if (depth > maxDepth) maxDepth = depth
  }

  if (maxDepth + 1 > MAX_DEPTH) {
    errors.push({
      type: "MAX_DEPTH",
      severity: "WARNING",
      agents: [],
      message: `Ierarhia are ${maxDepth + 1} niveluri, maximum permis: ${MAX_DEPTH}`,
    })
  }

  // 6. Check path to OWNER (every agent should reach a root via parents)
  for (const role of agentRoles) {
    if (roots.includes(role)) continue // roots are fine

    let current = role
    const seen = new Set<string>()
    let reachedRoot = false

    while (childToParent.has(current) && !seen.has(current)) {
      seen.add(current)
      const parents = childToParent.get(current)!
      current = parents[0]
      if (roots.includes(current)) {
        reachedRoot = true
        break
      }
    }

    if (!reachedRoot && !seen.has(current) && !roots.includes(current)) {
      errors.push({
        type: "NO_PATH_TO_OWNER",
        severity: "CRITICAL",
        agents: [role],
        message: `${role} nu are cale către OWNER prin lanțul ierarhic.`,
      })
    }
  }

  return {
    valid: errors.filter((e) => e.severity === "CRITICAL").length === 0,
    errors,
    stats: {
      totalAgents: agentRoles.size,
      totalRelationships: relationships.length,
      maxDepth: maxDepth + 1,
      roots,
    },
  }
}
