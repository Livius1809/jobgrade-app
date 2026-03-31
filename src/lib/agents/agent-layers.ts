/**
 * agent-layers.ts — Sistem multi-layer pentru agenți
 *
 * Fiecare agent poate avea mai multe layere:
 * - BASE: competențele de construcție (permanent)
 * - PRODUCTION: competențele operaționale (cresc gradual, se desprind)
 * - CUSTOM: layere specifice per business
 *
 * Flow:
 * 1. Agent creat cu layer BASE
 * 2. Pe măsură ce platforma crește, i se adaugă layer PRODUCTION (skills + KB)
 * 3. Când readyToSplit=true, layer-ul PRODUCTION se extrage:
 *    → Se creează agent nou cu layer-ul extras ca BASE
 *    → Agentul original rămâne doar cu BASE (gata pt next business)
 *    → KB-ul se separă pe tag-uri (layer:build vs layer:ops)
 */

import Anthropic from "@anthropic-ai/sdk"
import type { PrismaClient } from "@/generated/prisma"
import { clearRegistryCache } from "./agent-registry"

const MODEL = "claude-sonnet-4-20250514"

// ── Types ────────────────────────────────────────────────────────────────────

export interface AgentLayer {
  id: string
  type: "BASE" | "PRODUCTION" | "CUSTOM"
  name: string
  description: string
  skills: string[]
  kbTag: string          // tag-ul folosit pt KB entries din acest layer
  active: boolean
  readyToSplit: boolean
  addedAt: string
}

export interface LayerConfig {
  layers: AgentLayer[]
  activeContext?: "build" | "ops" | "both"
}

// ── Default layers ───────────────────────────────────────────────────────────

export function createBaseLayer(agentRole: string, description: string): AgentLayer {
  return {
    id: `${agentRole}-base`,
    type: "BASE",
    name: "Construcție",
    description: `Competențe de construcție: ${description}`,
    skills: [],
    kbTag: "layer:build",
    active: true,
    readyToSplit: false,
    addedAt: new Date().toISOString(),
  }
}

export function createProductionLayer(agentRole: string, opsDescription: string): AgentLayer {
  return {
    id: `${agentRole}-ops`,
    type: "PRODUCTION",
    name: "Producție/Administrare",
    description: `Competențe operaționale: ${opsDescription}`,
    skills: [],
    kbTag: "layer:ops",
    active: true,
    readyToSplit: false,
    addedAt: new Date().toISOString(),
  }
}

// ── Adăugare layer producție la un agent ──────────────────────────────────────

export async function addProductionLayer(
  agentRole: string,
  opsDescription: string,
  prisma: PrismaClient
): Promise<{ success: boolean; layer: AgentLayer }> {
  const p = prisma as any

  const agent = await p.agentDefinition.findUnique({ where: { agentRole } })
  if (!agent) throw new Error(`Agent ${agentRole} not found`)

  // Get or initialize layers
  const currentLayers: AgentLayer[] = (agent.thresholds as any)?.layers || [
    createBaseLayer(agentRole, agent.description),
  ]

  // Check if production layer already exists
  if (currentLayers.find(l => l.type === "PRODUCTION")) {
    throw new Error(`Agent ${agentRole} already has a PRODUCTION layer`)
  }

  // Create production layer
  const opsLayer = createProductionLayer(agentRole, opsDescription)
  currentLayers.push(opsLayer)

  // Update agent with layers
  await p.agentDefinition.update({
    where: { agentRole },
    data: {
      thresholds: { ...(agent.thresholds as any || {}), layers: currentLayers },
    },
  })

  // Generate initial ops KB entries via Claude
  try {
    const client = new Anthropic()
    const response = await client.messages.create({
      model: MODEL, max_tokens: 2000,
      messages: [{
        role: "user",
        content: `Generează 5 entries de Knowledge Base OPERAȚIONALE pentru agentul ${agentRole} (${agent.displayName}).
Rolul BASE (construcție): ${agent.description}
Rolul PRODUCȚIE nou: ${opsDescription}

Entries-urile trebuie să acopere: mentenanță, monitoring, SLA, incident response, suport clienți live.
Perspective operațională, nu de construcție.

Răspunde JSON: [{"content":"...", "tags":["tag1"], "confidence": 0.80}]`,
      }],
    })

    const text = response.content[0].type === "text" ? response.content[0].text : "[]"
    const match = text.match(/\[[\s\S]*\]/)
    if (match) {
      const entries = JSON.parse(match[0])
      for (const e of entries) {
        try {
          await p.kBEntry.create({
            data: {
              agentRole, kbType: "METHODOLOGY",
              content: `[OPS] ${e.content}`,
              source: "SELF_INTERVIEW", confidence: e.confidence || 0.75,
              status: "PERMANENT",
              tags: [...(e.tags || []), "layer:ops", "production"],
              usageCount: 0, validatedAt: new Date(),
            },
          })
        } catch {}
      }
    }
  } catch {}

  clearRegistryCache()
  return { success: true, layer: opsLayer }
}

// ── Adăugare KB entry la un layer specific ───────────────────────────────────

export async function addToLayer(
  agentRole: string,
  layerType: "BASE" | "PRODUCTION",
  content: string,
  tags: string[],
  prisma: PrismaClient
): Promise<string> {
  const p = prisma as any
  const layerTag = layerType === "BASE" ? "layer:build" : "layer:ops"

  const entry = await p.kBEntry.create({
    data: {
      agentRole, kbType: "SHARED_DOMAIN",
      content: `[${layerType === "BASE" ? "BUILD" : "OPS"}] ${content}`,
      source: "DISTILLED_INTERACTION", confidence: 0.70,
      status: "PERMANENT",
      tags: [...tags, layerTag],
      usageCount: 0, validatedAt: new Date(),
    },
  })
  return entry.id
}

// ── Verificare readiness pentru split ─────────────────────────────────────────

export async function checkSplitReadiness(
  agentRole: string,
  prisma: PrismaClient
): Promise<{ ready: boolean; opsKBCount: number; buildKBCount: number; reason: string }> {
  const p = prisma as any

  const opsCount = await p.kBEntry.count({
    where: { agentRole, tags: { has: "layer:ops" }, status: "PERMANENT" },
  })
  const buildCount = await p.kBEntry.count({
    where: { agentRole, tags: { has: "layer:build" }, status: "PERMANENT" },
  })

  // Criterii de readiness
  const minOpsEntries = 10
  const ready = opsCount >= minOpsEntries

  return {
    ready,
    opsKBCount: opsCount,
    buildKBCount: buildCount,
    reason: ready
      ? `Layer OPS are ${opsCount} entries (minim ${minOpsEntries}). Gata de split.`
      : `Layer OPS are doar ${opsCount} entries (nevoie minim ${minOpsEntries}). Încă nu e gata.`,
  }
}

// ── Split: desprindere layer producție ────────────────────────────────────────

export async function splitProductionLayer(
  agentRole: string,
  newAgentSuffix: string,
  parentRole: string,
  prisma: PrismaClient
): Promise<{
  success: boolean
  originalAgent: string
  newAgent: string
  kbTransferred: number
}> {
  const p = prisma as any

  const agent = await p.agentDefinition.findUnique({ where: { agentRole } })
  if (!agent) throw new Error(`Agent ${agentRole} not found`)

  const layers: AgentLayer[] = (agent.thresholds as any)?.layers || []
  const opsLayer = layers.find(l => l.type === "PRODUCTION")
  if (!opsLayer) throw new Error(`Agent ${agentRole} has no PRODUCTION layer`)

  const readiness = await checkSplitReadiness(agentRole, prisma)
  if (!readiness.ready) throw new Error(readiness.reason)

  const newAgentRole = `${agentRole}_${newAgentSuffix}`

  // 1. Creează agentul nou cu layer-ul OPS ca BASE
  try {
    await p.agentDefinition.create({
      data: {
        agentRole: newAgentRole,
        displayName: `${agent.displayName} (Ops)`,
        description: opsLayer.description,
        level: agent.level,
        isManager: agent.isManager,
        isActive: true,
        objectives: agent.objectives || [],
        coldStartPrompts: [],
        createdBy: "LAYER_SPLIT",
        thresholds: {
          layers: [{
            ...opsLayer,
            id: `${newAgentRole}-base`,
            type: "BASE",
            kbTag: "layer:build", // devine baza lui
          }],
        },
      },
    })
  } catch (e: any) {
    throw new Error(`Failed to create ${newAgentRole}: ${e.message}`)
  }

  // 2. Creează relația ierarhică
  try {
    await p.agentRelationship.create({
      data: { parentRole, childRole: newAgentRole, relationType: "REPORTS_TO", isActive: true },
    })
  } catch {}

  // 3. Transferă KB entries cu tag layer:ops la agentul nou
  const opsEntries = await p.kBEntry.findMany({
    where: { agentRole, tags: { has: "layer:ops" }, status: "PERMANENT" },
  })

  let transferred = 0
  for (const entry of opsEntries) {
    try {
      // Creează copie la agentul nou (cu tag-ul actualizat)
      await p.kBEntry.create({
        data: {
          agentRole: newAgentRole, kbType: entry.kbType,
          content: entry.content,
          source: entry.source, confidence: entry.confidence,
          status: "PERMANENT",
          tags: entry.tags.map((t: string) => t === "layer:ops" ? "layer:build" : t),
          usageCount: 0, validatedAt: new Date(),
          propagatedFrom: agentRole,
        },
      })

      // Arhivează la agentul original
      await p.kBEntry.update({
        where: { id: entry.id },
        data: { status: "ARCHIVED" },
      })

      transferred++
    } catch {}
  }

  // 4. Actualizează agentul original — elimină layer-ul PRODUCTION
  const remainingLayers = layers.filter(l => l.type !== "PRODUCTION")
  await p.agentDefinition.update({
    where: { agentRole },
    data: {
      thresholds: { ...(agent.thresholds as any || {}), layers: remainingLayers },
    },
  })

  // 5. Copiază Hawkins KB la agentul nou
  const hawkins = await p.kBEntry.findMany({
    where: { agentRole: "PSYCHOLINGUIST", tags: { has: "hawkins" }, status: "PERMANENT" },
    select: { content: true, tags: true, confidence: true },
  })
  for (const e of hawkins) {
    try {
      await p.kBEntry.create({
        data: {
          agentRole: newAgentRole, kbType: "METHODOLOGY", content: e.content,
          source: "EXPERT_HUMAN", confidence: e.confidence, status: "PERMANENT",
          tags: e.tags, usageCount: 0, validatedAt: new Date(),
        },
      })
    } catch {}
  }

  // 6. Notificare
  try {
    await fetch("https://ntfy.sh/jobgrade-owner-liviu-2026", {
      method: "POST",
      headers: { Title: `Split! ${agentRole} → ${newAgentRole}`, Priority: "high", Tags: "scissors,robot_face" },
      body: `Layer PRODUCȚIE desprins.\n${agentRole} → rămâne constructor\n${newAgentRole} → operator producție\nKB transferat: ${transferred} entries`,
    })
  } catch {}

  clearRegistryCache()

  return {
    success: true,
    originalAgent: agentRole,
    newAgent: newAgentRole,
    kbTransferred: transferred,
  }
}

// ── Get layer info for an agent ──────────────────────────────────────────────

export async function getAgentLayers(
  agentRole: string,
  prisma: PrismaClient
): Promise<{
  agentRole: string
  layers: AgentLayer[]
  kbPerLayer: Record<string, number>
}> {
  const p = prisma as any

  const agent = await p.agentDefinition.findUnique({ where: { agentRole } })
  if (!agent) throw new Error(`Agent ${agentRole} not found`)

  const layers: AgentLayer[] = (agent.thresholds as any)?.layers || [
    createBaseLayer(agentRole, agent.description),
  ]

  const kbPerLayer: Record<string, number> = {}
  for (const layer of layers) {
    kbPerLayer[layer.type] = await p.kBEntry.count({
      where: { agentRole, tags: { has: layer.kbTag }, status: "PERMANENT" },
    })
  }

  return { agentRole, layers, kbPerLayer }
}
