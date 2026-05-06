/**
 * org-executor.ts — Execuție propuneri structurale aprobate
 *
 * Tipuri: ADD_AGENT, REMOVE_AGENT, MERGE_AGENTS, MODIFY_HIERARCHY
 * Pre-condition: OrgProposal.status === "APPROVED"
 * Post-condition: ierarhie validă + cold start trigger pentru agenți noi
 */

import type { PrismaClient } from "@/generated/prisma"
import { validateHierarchy } from "./hierarchy-validator"
import { clearRegistryCache } from "./agent-registry"
import { runColdStart } from "../kb/cold-start"

export interface ExecutionResult {
  success: boolean
  proposalId: string
  action: string
  details: string
  warnings: string[]
}

/**
 * Execute an approved proposal.
 */
export async function executeProposal(
  proposalId: string,
  prisma: PrismaClient
): Promise<ExecutionResult> {
  const p = prisma as any

  const proposal = await p.orgProposal.findUnique({ where: { id: proposalId } })
  if (!proposal) throw new Error(`Proposal ${proposalId} not found`)
  if (proposal.status !== "APPROVED") throw new Error(`Proposal status is ${proposal.status}, expected APPROVED`)

  const spec = proposal.changeSpec as any
  const warnings: string[] = []
  let action = ""
  let details = ""

  try {
    // Mark as executing
    await p.orgProposal.update({ where: { id: proposalId }, data: { status: "EXECUTING" } })

    switch (proposal.proposalType) {
      case "ADD_AGENT":
        ({ action, details } = await executeAddAgent(spec, p, warnings))
        break
      case "REMOVE_AGENT":
        ({ action, details } = await executeRemoveAgent(spec, p, warnings))
        break
      case "MERGE_AGENTS":
        ({ action, details } = await executeMergeAgents(spec, p, warnings))
        break
      case "MODIFY_HIERARCHY":
        ({ action, details } = await executeModifyHierarchy(spec, p, warnings))
        break
      case "MODIFY_OBJECTIVES":
        ({ action, details } = await executeModifyObjectives(spec, p, warnings))
        break
      default:
        throw new Error(`Unknown proposal type: ${proposal.proposalType}`)
    }

    // Validate hierarchy post-execution
    const validation = await validateHierarchy(prisma)
    if (!validation.valid) {
      const criticals = validation.errors.filter((e) => e.severity === "CRITICAL")
      throw new Error(
        `Hierarchy invalid after execution: ${criticals.map((e) => e.message).join("; ")}`
      )
    }

    // Clear cache so registry reflects changes
    clearRegistryCache()

    // Mark as executed
    await p.orgProposal.update({
      where: { id: proposalId },
      data: { status: "EXECUTED", executedAt: new Date() },
    })

    return { success: true, proposalId, action, details, warnings }
  } catch (e: any) {
    // Rollback status
    await p.orgProposal.update({
      where: { id: proposalId },
      data: { status: "APPROVED" }, // revert to approved so it can be retried
    })
    clearRegistryCache()
    throw e
  }
}

// ── ADD_AGENT ────────────────────────────────────────────────────────────────

async function executeAddAgent(
  spec: any,
  prisma: any,
  warnings: string[]
): Promise<{ action: string; details: string }> {
  const {
    agentRole,
    displayName,
    description,
    level = "OPERATIONAL",
    parentRole,
    isManager = false,
    coldStartPrompts = [],
    propagationTargets = null,
    objectives = [],
    cycleIntervalHours = null,
    thresholds = null,
  } = spec

  if (!agentRole || !displayName || !parentRole) {
    throw new Error("ADD_AGENT requires agentRole, displayName, parentRole")
  }

  // Check parent exists
  const parent = await prisma.agentDefinition.findUnique({ where: { agentRole: parentRole } })
  if (!parent) throw new Error(`Parent ${parentRole} not found`)

  // Check agent doesn't exist already
  const existing = await prisma.agentDefinition.findUnique({ where: { agentRole } })
  if (existing) throw new Error(`Agent ${agentRole} already exists`)

  // Create agent definition
  await prisma.agentDefinition.create({
    data: {
      agentRole,
      displayName,
      description: description || `${displayName} — agent auto-generat`,
      level: level.toUpperCase(),
      isManager,
      isActive: true,
      cycleIntervalHours,
      objectives,
      thresholds,
      coldStartDescription: description,
      coldStartPrompts,
      propagationTargets,
      createdBy: "PROPOSAL",
    },
  })

  // Create relationship
  await prisma.agentRelationship.create({
    data: {
      parentRole,
      childRole: agentRole,
      relationType: "REPORTS_TO",
      isActive: true,
    },
  })

  // ── AUTO SEED KB (3 straturi) ──────────────────────────────────────────────

  let hawkinsEntries = 0
  let coldStartEntries = 0
  let domainEntries = 0

  // 1. AUTOMAT: Copiere Hawkins KB (fundament CÂMP)
  try {
    const hawkinsKB = await prisma.kBEntry.findMany({
      where: { agentRole: "PSYCHOLINGUIST", tags: { has: "hawkins" }, status: "PERMANENT" },
      select: { content: true, tags: true, confidence: true },
    })
    for (const e of hawkinsKB) {
      try {
        await prisma.kBEntry.create({
          data: {
            agentRole, kbType: "METHODOLOGY", content: e.content,
            source: "EXPERT_HUMAN", confidence: e.confidence, status: "PERMANENT",
            tags: e.tags, usageCount: 0, validatedAt: new Date(),
          },
        })
        hawkinsEntries++
      } catch { /* duplicate */ }
    }
  } catch (e: any) {
    warnings.push(`Hawkins KB copy failed: ${e.message}`)
  }

  // 2. AUTOMAT: Cold start (din prompts dacă disponibile)
  if (coldStartPrompts.length > 0) {
    try {
      const result = await runColdStart(agentRole, prisma, { maxBatches: 3 })
      coldStartEntries = result.persisted
    } catch (e: any) {
      warnings.push(`Cold start failed: ${e.message}`)
    }
  }

  // 3. AUTOMAT: Generare cunoaștere domeniu din descriere (via Claude)
  if (description) {
    try {
      const { cpuCall } = await import("@/lib/cpu/gateway")
      const cpuResult = await cpuCall({
        model: "claude-sonnet-4-20250514",
        max_tokens: 3000,
        system: "",
        messages: [{
          role: "user",
          content: `Generează 10 entries de Knowledge Base pentru un agent AI cu rolul: "${displayName}" (${description}). Fiecare entry trebuie să fie o cunoaștere fundamentală din domeniul de activitate al agentului — teorie, autori cheie, modele, best practices, aplicabilitate organizațională. Răspunde JSON array: [{"content":"...", "tags":["tag1","tag2"], "confidence": 0.85}]`,
        }],
        agentRole: agentRole,
        operationType: "org-executor-domain-kb",
      })
      const text = cpuResult.text
      const match = text.match(/\[[\s\S]*\]/)
      if (match) {
        const entries = JSON.parse(match[0])
        for (const e of entries) {
          try {
            await prisma.kBEntry.create({
              data: {
                agentRole, kbType: "METHODOLOGY",
                content: `[${agentRole}] ${e.content}`,
                source: "SELF_INTERVIEW", confidence: e.confidence || 0.80,
                status: "PERMANENT", tags: [...(e.tags || []), "domain-auto", "field-knowledge"],
                usageCount: 0, validatedAt: new Date(),
              },
            })
            domainEntries++
          } catch { /* duplicate */ }
        }
      }
    } catch (e: any) {
      warnings.push(`Domain KB generation failed: ${e.message}`)
    }
  }

  // 4. NOTIFICARE Owner
  try {
    await fetch("https://ntfy.sh/jobgrade-owner-liviu-2026", {
      method: "POST",
      headers: { Title: `Agent ${agentRole} creat + KB populat`, Priority: "default", Tags: "robot_face,books" },
      body: `${displayName} creat sub ${parentRole}\nKB: ${hawkinsEntries} Hawkins + ${coldStartEntries} cold start + ${domainEntries} domeniu = ${hawkinsEntries + coldStartEntries + domainEntries} total`,
    })
  } catch { /* non-blocking */ }

  return {
    action: "ADD_AGENT",
    details: `Created ${agentRole} (${displayName}) under ${parentRole}. KB: ${hawkinsEntries} Hawkins + ${coldStartEntries} cold start + ${domainEntries} domain = ${hawkinsEntries + coldStartEntries + domainEntries} total.`,
  }
}

// ── REMOVE_AGENT ─────────────────────────────────────────────────────────────

async function executeRemoveAgent(
  spec: any,
  prisma: any,
  warnings: string[]
): Promise<{ action: string; details: string }> {
  const { agentRole, reassignChildrenTo } = spec
  if (!agentRole) throw new Error("REMOVE_AGENT requires agentRole")

  const agent = await prisma.agentDefinition.findUnique({ where: { agentRole } })
  if (!agent) throw new Error(`Agent ${agentRole} not found`)

  // Check for children
  const children = await prisma.agentRelationship.findMany({
    where: { parentRole: agentRole, isActive: true },
  })

  if (children.length > 0) {
    if (!reassignChildrenTo) {
      throw new Error(`Agent ${agentRole} has ${children.length} children. Provide reassignChildrenTo.`)
    }

    // Verify reassign target exists
    const target = await prisma.agentDefinition.findUnique({ where: { agentRole: reassignChildrenTo } })
    if (!target) throw new Error(`Reassign target ${reassignChildrenTo} not found`)

    // Reassign children
    for (const child of children) {
      await prisma.agentRelationship.update({
        where: { id: child.id },
        data: { parentRole: reassignChildrenTo },
      })
    }
    warnings.push(`${children.length} copii reasignați de la ${agentRole} la ${reassignChildrenTo}`)
  }

  // Deactivate agent
  await prisma.agentDefinition.update({
    where: { agentRole },
    data: { isActive: false },
  })

  // Deactivate relationships
  await prisma.agentRelationship.updateMany({
    where: { childRole: agentRole },
    data: { isActive: false },
  })

  // Archive KB entries
  const archived = await prisma.kBEntry.updateMany({
    where: { agentRole, status: "PERMANENT" },
    data: { status: "ARCHIVED" },
  })

  return {
    action: "REMOVE_AGENT",
    details: `Deactivated ${agentRole}. ${archived.count} KB entries archived.${children.length > 0 ? ` ${children.length} children reassigned to ${reassignChildrenTo}.` : ""}`,
  }
}

// ── MERGE_AGENTS ─────────────────────────────────────────────────────────────

async function executeMergeAgents(
  spec: any,
  prisma: any,
  warnings: string[]
): Promise<{ action: string; details: string }> {
  const { keepRole, removeRole } = spec
  if (!keepRole || !removeRole) throw new Error("MERGE_AGENTS requires keepRole, removeRole")

  // Transfer KB entries from removeRole to keepRole
  const transferred = await prisma.kBEntry.updateMany({
    where: { agentRole: removeRole, status: "PERMANENT" },
    data: { agentRole: keepRole, propagatedFrom: removeRole },
  })

  // Remove the merged agent
  await executeRemoveAgent(
    { agentRole: removeRole, reassignChildrenTo: keepRole },
    prisma,
    warnings
  )

  return {
    action: "MERGE_AGENTS",
    details: `Merged ${removeRole} into ${keepRole}. ${transferred.count} KB entries transferred.`,
  }
}

// ── MODIFY_HIERARCHY ─────────────────────────────────────────────────────────

async function executeModifyHierarchy(
  spec: any,
  prisma: any,
  warnings: string[]
): Promise<{ action: string; details: string }> {
  const { agentRole, newParentRole } = spec
  if (!agentRole || !newParentRole) throw new Error("MODIFY_HIERARCHY requires agentRole, newParentRole")

  // Verify both exist
  const agent = await prisma.agentDefinition.findUnique({ where: { agentRole } })
  if (!agent) throw new Error(`Agent ${agentRole} not found`)
  const parent = await prisma.agentDefinition.findUnique({ where: { agentRole: newParentRole } })
  if (!parent) throw new Error(`New parent ${newParentRole} not found`)

  // Deactivate old relationship
  await prisma.agentRelationship.updateMany({
    where: { childRole: agentRole, isActive: true, relationType: "REPORTS_TO" },
    data: { isActive: false },
  })

  // Create new relationship
  await prisma.agentRelationship.create({
    data: {
      parentRole: newParentRole,
      childRole: agentRole,
      relationType: "REPORTS_TO",
      isActive: true,
    },
  })

  return {
    action: "MODIFY_HIERARCHY",
    details: `Moved ${agentRole} under ${newParentRole} (was under old parent).`,
  }
}

// ── MODIFY_OBJECTIVES ────────────────────────────────────────────────────────

async function executeModifyObjectives(
  spec: any,
  prisma: any,
  warnings: string[]
): Promise<{ action: string; details: string }> {
  const { agentRole, objectives } = spec
  if (!agentRole || !objectives) throw new Error("MODIFY_OBJECTIVES requires agentRole, objectives")

  await prisma.agentDefinition.update({
    where: { agentRole },
    data: { objectives },
  })

  return {
    action: "MODIFY_OBJECTIVES",
    details: `Updated objectives for ${agentRole}: ${objectives.length} objectives.`,
  }
}

/**
 * Rollback an executed proposal (soft: reactivate/deactivate).
 */
export async function rollbackProposal(
  proposalId: string,
  prisma: PrismaClient
): Promise<{ success: boolean; message: string }> {
  const p = prisma as any
  const proposal = await p.orgProposal.findUnique({ where: { id: proposalId } })
  if (!proposal) throw new Error(`Proposal ${proposalId} not found`)
  if (proposal.status !== "EXECUTED") throw new Error(`Cannot rollback: status is ${proposal.status}`)

  // For ADD_AGENT: deactivate the added agent
  // For REMOVE_AGENT: reactivate
  // Generic: mark as rolled back, manual intervention needed

  await p.orgProposal.update({
    where: { id: proposalId },
    data: { status: "ROLLED_BACK", rollbackAt: new Date() },
  })

  clearRegistryCache()

  return {
    success: true,
    message: `Proposal ${proposalId} marked as ROLLED_BACK. Manual cleanup may be needed.`,
  }
}
