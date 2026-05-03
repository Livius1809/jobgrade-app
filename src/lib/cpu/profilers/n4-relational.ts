/**
 * N4: PROFILER RELAȚIONAL — cum interacționează entitățile
 *
 * Integrează N2 și N3 în REȚELE de relații între entități diferite.
 *
 * Tipuri de relații:
 * - Om ↔ Om (sociogramă, echipă, familie, comunitate)
 * - Om ↔ Firmă (angajat↔angajator, client↔furnizor)
 * - Firmă ↔ Firmă (supply chain, competiție, parteneriat)
 * - X ↔ Teritoriu (apartenență, impact, dependență)
 *
 * Vede ce N3 nu vede:
 * - Firma A e sănătoasă DAR depinde de furnizorul B instabil = risc
 * - Angajatul X e performant DAR relația cu managerul Y e toxică = pierdere
 * - Teritoriul Z are resurse DAR firmele nu colaborează = valoare pierdută
 */

import { prisma } from "@/lib/prisma"

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type RelationType =
  | "PERSON_PERSON"       // sociogramă, echipă
  | "PERSON_ORG"          // angajat, client, furnizor persoană
  | "ORG_ORG"             // supply chain, competiție
  | "PERSON_TERRITORY"    // reședință, naveta, migrație
  | "ORG_TERRITORY"       // sediu, impact local, dependență piață

export interface RelationalProfile {
  entityId: string
  entityType: "RELATIONSHIP_NETWORK"

  /** Noduri în rețea */
  nodes: Array<{
    id: string
    type: "PERSON" | "ORGANIZATION" | "TERRITORY"
    name: string
    profileLevel?: number  // cel mai înalt nivel de profil disponibil (1-5)
  }>

  /** Conexiuni între noduri */
  edges: Array<{
    from: string
    to: string
    relationType: RelationType
    strength: number     // 0-1 — intensitatea relației
    quality: "POZITIVA" | "NEUTRA" | "NEGATIVA" | "NECUNOSCUTA"
    description: string
    bidirectional: boolean
  }>

  /** Noduri critice (dacă dispar, rețeaua se destabilizează) */
  criticalNodes: Array<{
    nodeId: string
    reason: string
    riskIfLost: string
  }>

  /** Noduri izolate (deconectate — risc sau oportunitate) */
  isolatedNodes: Array<{
    nodeId: string
    reason: string
    recommendation: string
  }>

  /** Clustere (grupuri strâns conectate) */
  clusters: Array<{
    nodeIds: string[]
    name: string
    cohesion: number  // 0-1
    description: string
  }>

  /** Indicatori rețea */
  networkHealth: {
    density: number          // 0-1 — câte conexiuni existente din totalul posibil
    avgPathLength: number    // câți pași între oricare 2 noduri
    clusteringCoeff: number  // cât de grupată e rețeaua
    vulnerabilities: string[]
  }
}

// ═══════════════════════════════════════════════════════════════
// RELATIONAL PROFILER
// ═══════════════════════════════════════════════════════════════

export const RelationalProfiler = {
  /**
   * Construiește rețeaua relațională pentru un context:
   * - Per organizație: angajați + furnizori + clienți + teritoriu
   * - Per teritoriu: firme + persoane + furnizori + consumatori
   * - Per persoană: relații profesionale + personale + teritoriale
   */
  async buildOrgNetwork(tenantId: string): Promise<RelationalProfile> {
    const [tenant, jobs, employees] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: tenantId } }),
      prisma.job.findMany({ where: { tenantId }, select: { id: true, title: true, department: true } }),
      prisma.employee?.findMany?.({ where: { tenantId } }).catch(() => []),
    ])

    // Sociograme dacă există
    const sociogramData = await prisma.sociogramGroup?.findMany?.({
      where: { tenantId },
      include: { members: true },
    }).catch(() => [])

    const nodes: RelationalProfile["nodes"] = []
    const edges: RelationalProfile["edges"] = []

    // Organizația ca nod central
    nodes.push({
      id: tenantId,
      type: "ORGANIZATION",
      name: tenant?.name || "Organizație",
      profileLevel: 3,
    })

    // Angajații ca noduri
    for (const emp of (employees as any[]) || []) {
      nodes.push({
        id: emp.id,
        type: "PERSON",
        name: emp.name || "Angajat",
        profileLevel: 2,
      })
      // Relație angajat → organizație
      edges.push({
        from: emp.id, to: tenantId,
        relationType: "PERSON_ORG",
        strength: 0.8,
        quality: "POZITIVA",
        description: "Angajat",
        bidirectional: true,
      })
    }

    // Relații din sociogramă (om↔om)
    if (sociogramData && Array.isArray(sociogramData)) {
      for (const group of sociogramData) {
        for (const member of (group as any).members || []) {
          if (member.preferences) {
            // Preferințe sociometrice
            for (const pref of member.preferences) {
              edges.push({
                from: member.employeeId,
                to: pref.targetId,
                relationType: "PERSON_PERSON",
                strength: pref.score > 0 ? 0.8 : 0.2,
                quality: pref.isRejection ? "NEGATIVA" : "POZITIVA",
                description: pref.isRejection ? "Respingere" : "Preferință colaborare",
                bidirectional: false,
              })
            }
          }
        }
      }
    }

    // Analiză rețea
    const networkHealth = analyzeNetwork(nodes, edges)
    const criticalNodes = findCriticalNodes(nodes, edges)
    const isolatedNodes = findIsolatedNodes(nodes, edges)

    return {
      entityId: tenantId,
      entityType: "RELATIONSHIP_NETWORK",
      nodes,
      edges,
      criticalNodes,
      isolatedNodes,
      clusters: [], // TODO: algoritem clustering
      networkHealth,
    }
  },

  /**
   * Rețea teritorială — firme, persoane, supply chain
   */
  async buildTerritoryNetwork(territory: string): Promise<RelationalProfile> {
    const [entities, connections] = await Promise.all([
      prisma.localEntity.findMany({ where: { territory, isActive: true }, take: 100 }),
      prisma.bridgeConnection.findMany({
        where: { status: { in: ["ACCEPTED", "IN_PROGRESS", "COMPLETED"] } },
        include: {
          client: { select: { id: true, alias: true, territory: true } },
          provider: { select: { id: true, alias: true, territory: true } },
        },
      }),
    ])

    const nodes: RelationalProfile["nodes"] = []
    const edges: RelationalProfile["edges"] = []

    // Teritoriul ca nod
    nodes.push({ id: territory, type: "TERRITORY", name: territory, profileLevel: 5 })

    // Entități locale
    for (const e of entities) {
      const nodeType = e.type === "BUSINESS" ? "ORGANIZATION" : "PERSON"
      nodes.push({ id: e.id, type: nodeType as any, name: e.name })
      edges.push({
        from: e.id, to: territory,
        relationType: nodeType === "ORGANIZATION" ? "ORG_TERRITORY" : "PERSON_TERRITORY",
        strength: 0.6,
        quality: "POZITIVA",
        description: `${e.type} în ${territory}`,
        bidirectional: true,
      })
    }

    // Conexiuni bridge (punți active)
    for (const conn of connections) {
      if (conn.client.territory === territory || conn.provider.territory === territory) {
        edges.push({
          from: conn.clientId, to: conn.providerId,
          relationType: "PERSON_PERSON",
          strength: conn.matchScore,
          quality: conn.status === "COMPLETED" ? "POZITIVA" : "NEUTRA",
          description: `Punte ${conn.status.toLowerCase()}`,
          bidirectional: true,
        })
      }
    }

    const networkHealth = analyzeNetwork(nodes, edges)

    return {
      entityId: territory,
      entityType: "RELATIONSHIP_NETWORK",
      nodes,
      edges,
      criticalNodes: findCriticalNodes(nodes, edges),
      isolatedNodes: findIsolatedNodes(nodes, edges),
      clusters: [],
      networkHealth,
    }
  },
}

// ═══════════════════════════════════════════════════════════════
// ANALIZĂ REȚEA
// ═══════════════════════════════════════════════════════════════

function analyzeNetwork(
  nodes: RelationalProfile["nodes"],
  edges: RelationalProfile["edges"]
): RelationalProfile["networkHealth"] {
  const n = nodes.length
  const e = edges.length
  const maxEdges = n * (n - 1) / 2
  const density = maxEdges > 0 ? Math.round((e / maxEdges) * 100) / 100 : 0

  const vulnerabilities: string[] = []
  if (density < 0.1) vulnerabilities.push("Rețea foarte rară — entitățile sunt deconectate")
  if (density > 0.8) vulnerabilities.push("Rețea prea densă — posibilă dependență excesivă")

  const negativeEdges = edges.filter(ed => ed.quality === "NEGATIVA").length
  if (negativeEdges > e * 0.3) vulnerabilities.push("Peste 30% relații negative — conflict sistemic")

  return {
    density,
    avgPathLength: density > 0 ? Math.round(1 / density * 10) / 10 : Infinity,
    clusteringCoeff: 0, // TODO: calcul real
    vulnerabilities,
  }
}

function findCriticalNodes(
  nodes: RelationalProfile["nodes"],
  edges: RelationalProfile["edges"]
): RelationalProfile["criticalNodes"] {
  // Noduri cu cele mai multe conexiuni (hub-uri)
  const connectionCount: Record<string, number> = {}
  for (const e of edges) {
    connectionCount[e.from] = (connectionCount[e.from] || 0) + 1
    connectionCount[e.to] = (connectionCount[e.to] || 0) + 1
  }

  const avgConnections = Object.values(connectionCount).reduce((s, c) => s + c, 0) / Math.max(1, Object.keys(connectionCount).length)

  return Object.entries(connectionCount)
    .filter(([, count]) => count > avgConnections * 2)
    .map(([nodeId, count]) => ({
      nodeId,
      reason: `${count} conexiuni — hub central al rețelei`,
      riskIfLost: "Pierderea acestui nod deconectează o parte semnificativă a rețelei",
    }))
}

function findIsolatedNodes(
  nodes: RelationalProfile["nodes"],
  edges: RelationalProfile["edges"]
): RelationalProfile["isolatedNodes"] {
  const connected = new Set<string>()
  for (const e of edges) {
    connected.add(e.from)
    connected.add(e.to)
  }

  return nodes
    .filter(n => !connected.has(n.id))
    .map(n => ({
      nodeId: n.id,
      reason: "Zero conexiuni — complet izolat",
      recommendation: "Identificare și creare punți cu noduri complementare",
    }))
}
