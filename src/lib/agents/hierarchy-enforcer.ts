/**
 * hierarchy-enforcer.ts — Validare ierarhică la delegare
 *
 * Principiu: poți delega DOAR la subordonații tăi direcți.
 * COG → directori → manageri → operaționali.
 * Fiecare nivel rafinează, nu sare peste.
 *
 * Fluxul deductiv:
 *   OWNER → COG → Directori → Manageri → Operaționali
 *   Fiecare nivel adaugă cunoaștere de domeniu la descompunere.
 *
 * Fluxul inductiv:
 *   Operațional → Manager → Director → COG → OWNER
 *   Fiecare nivel sintetizează cu viziune de domeniu.
 */

import { prisma } from "@/lib/prisma"

// Cache ierarhie (refreshed la fiecare 5 min)
let hierarchyCache: Map<string, string[]> | null = null
let hierarchyCacheTime = 0
const CACHE_TTL = 5 * 60 * 1000

/**
 * Returnează subordonații direcți ai unui agent.
 */
export async function getDirectSubordinates(parentRole: string): Promise<string[]> {
  const hierarchy = await getHierarchy()
  return hierarchy.get(parentRole) || []
}

/**
 * Returnează superiorul direct al unui agent.
 */
export async function getDirectSuperior(childRole: string): Promise<string | null> {
  const hierarchy = await getHierarchy()
  for (const [parent, children] of hierarchy) {
    if (children.includes(childRole)) return parent
  }
  return null
}

/**
 * Verifică dacă assignedBy poate delega la assignedTo.
 * Regulă: doar la subordonați direcți + OWNER/SYSTEM pot la oricine.
 */
export async function canDelegate(assignedBy: string, assignedTo: string): Promise<{
  allowed: boolean
  reason: string
  correctPath?: string[]
}> {
  // OWNER și SYSTEM pot delega la oricine (bypass ierarhie)
  if (assignedBy === "OWNER" || assignedBy === "SYSTEM") {
    return { allowed: true, reason: "Owner/System bypass" }
  }

  // Self-assignment permis (manager ia task pentru sine)
  if (assignedBy === assignedTo) {
    return { allowed: true, reason: "Self-assignment" }
  }

  const subordinates = await getDirectSubordinates(assignedBy)

  if (subordinates.includes(assignedTo)) {
    return { allowed: true, reason: `${assignedTo} e subordonat direct al ${assignedBy}` }
  }

  // Nu e subordonat direct — găsește calea corectă
  const path = await findDelegationPath(assignedBy, assignedTo)

  return {
    allowed: false,
    reason: `${assignedBy} nu poate delega direct la ${assignedTo}. Trebuie să treacă prin ierarhie.`,
    correctPath: path,
  }
}

/**
 * Găsește calea corectă de delegare prin ierarhie.
 * Ex: COG → FDA => COG → COA → EMA → FDA
 */
async function findDelegationPath(from: string, to: string): Promise<string[]> {
  const hierarchy = await getHierarchy()

  // BFS invers: de la "to" urcăm spre "from"
  const parent = new Map<string, string>()
  const visited = new Set<string>()
  const queue = [to]
  visited.add(to)

  while (queue.length > 0) {
    const current = queue.shift()!

    // Găsește superiorul
    for (const [p, children] of hierarchy) {
      if (children.includes(current) && !visited.has(p)) {
        parent.set(current, p)
        visited.add(p)
        queue.push(p)

        if (p === from) {
          // Reconstituie calea
          const path = [from]
          let node = current
          while (node !== to) {
            path.push(node)
            // Găsește următorul în lanț spre "to"
            for (const [pp, cc] of hierarchy) {
              if (pp === node && cc.some(c => {
                // Verificăm dacă de la acest copil ajungem la "to"
                let n = c
                while (n) {
                  if (n === to) return true
                  const subs = hierarchy.get(n) || []
                  n = subs[0] // Simplificare: urmăm prima ramură
                }
                return false
              })) {
                node = cc.find(c => visited.has(c)) || to
                break
              }
            }
            if (!path.includes(node)) path.push(node)
            break
          }
          path.push(to)
          return path
        }
      }
    }
  }

  return [from, "?", to] // Calea nu a fost găsită
}

/**
 * Redirecționează un task la nivelul corect.
 * În loc să blocheze, COG trimite la directorul potrivit
 * care va descompune mai departe.
 */
export async function redirectToCorrectLevel(
  originalAssignedBy: string,
  originalAssignedTo: string,
): Promise<{ redirectTo: string; reason: string }> {
  const subordinates = await getDirectSubordinates(originalAssignedBy)

  if (subordinates.length === 0) {
    // Agentul nu are subordonați — e el executantul
    return { redirectTo: originalAssignedTo, reason: "Agentul nu are subordonați, execută singur" }
  }

  // Găsește care subordonat direct conduce spre destinatar
  const hierarchy = await getHierarchy()

  for (const sub of subordinates) {
    if (isAncestorOf(sub, originalAssignedTo, hierarchy)) {
      return {
        redirectTo: sub,
        reason: `Redirecționat la ${sub} (subordonat direct) care va rafina și delega mai departe spre ${originalAssignedTo}`,
      }
    }
  }

  // Fallback: primul subordonat direct
  return {
    redirectTo: subordinates[0],
    reason: `Redirecționat la ${subordinates[0]} (subordonat direct) pentru rafinare`,
  }
}

function isAncestorOf(potentialAncestor: string, target: string, hierarchy: Map<string, string[]>): boolean {
  const children = hierarchy.get(potentialAncestor) || []
  if (children.includes(target)) return true
  for (const child of children) {
    if (isAncestorOf(child, target, hierarchy)) return true
  }
  return false
}

/**
 * Încarcă ierarhia din DB cu cache.
 */
async function getHierarchy(): Promise<Map<string, string[]>> {
  if (hierarchyCache && Date.now() - hierarchyCacheTime < CACHE_TTL) {
    return hierarchyCache
  }

  const p = prisma as any
  const relationships = await p.agentRelationship.findMany({
    where: { relationType: "REPORTS_TO", isActive: true },
    select: { parentRole: true, childRole: true },
  })

  const map = new Map<string, string[]>()
  for (const rel of relationships) {
    const children = map.get(rel.parentRole) || []
    children.push(rel.childRole)
    map.set(rel.parentRole, children)
  }

  hierarchyCache = map
  hierarchyCacheTime = Date.now()
  return map
}
