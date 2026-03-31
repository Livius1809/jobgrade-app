/**
 * seed-agent-registry.ts — Migrare configurații statice → DB
 *
 * Citește din manager-configs.ts, escalation-chain.ts, cold-start.ts, propagate.ts
 * și populează AgentDefinition + AgentRelationship.
 * Idempotent (upsert pe agentRole unique).
 *
 * Rulează: npx tsx src/lib/agents/seed-agent-registry.ts
 */

import { config } from "dotenv"
config()

import { PrismaClient } from "../../generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"
import { MANAGER_CONFIGS } from "./manager-configs"
import { ESCALATION_CHAIN } from "./escalation-chain"
import { SELF_INTERVIEW_PROMPTS } from "../kb/cold-start"
import { PROPAGATION_RULES } from "../kb/propagate"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

// ── Determine level for non-managers ─────────────────────────────────────────

function inferLevel(role: string): "STRATEGIC" | "TACTICAL" | "OPERATIONAL" {
  // Managers have explicit level
  const mc = MANAGER_CONFIGS.find((m) => m.agentRole === role)
  if (mc) return mc.level.toUpperCase() as "STRATEGIC" | "TACTICAL" | "OPERATIONAL"

  // Non-managers: infer from parent
  const parent = ESCALATION_CHAIN[role]
  if (!parent) return "OPERATIONAL"

  // If parent is strategic → this is tactical
  const parentMc = MANAGER_CONFIGS.find((m) => m.agentRole === parent)
  if (parentMc?.level === "strategic") return "TACTICAL"
  if (parentMc?.level === "tactical") return "OPERATIONAL"

  return "OPERATIONAL"
}

async function main() {
  console.log("🏗️  Seed Agent Registry — static → DB")

  // ── Collect all unique roles ─────────────────────────────────────────────
  const allRoles = new Set<string>()

  // From ESCALATION_CHAIN (both keys and values)
  for (const [child, parent] of Object.entries(ESCALATION_CHAIN)) {
    allRoles.add(child)
    if (parent !== "OWNER") allRoles.add(parent)
  }

  // From MANAGER_CONFIGS
  for (const mc of MANAGER_CONFIGS) {
    allRoles.add(mc.agentRole)
    for (const sub of mc.subordinates) allRoles.add(sub)
  }

  // From SELF_INTERVIEW_PROMPTS
  for (const role of Object.keys(SELF_INTERVIEW_PROMPTS)) {
    allRoles.add(role)
  }

  console.log(`   Roluri unice detectate: ${allRoles.size}`)

  // ── Build manager lookup ─────────────────────────────────────────────────
  const managerMap = new Map(MANAGER_CONFIGS.map((m) => [m.agentRole, m]))

  // ── Upsert AgentDefinitions ──────────────────────────────────────────────
  let created = 0
  let updated = 0

  for (const role of allRoles) {
    const mc = managerMap.get(role)
    const prompt = SELF_INTERVIEW_PROMPTS[role]
    const propTargets = PROPAGATION_RULES[role] || null

    const data = {
      displayName: mc?.role || prompt?.description?.split(" — ")[0] || role,
      description: mc?.description || prompt?.description || `Agent ${role}`,
      level: inferLevel(role),
      isManager: !!mc,
      isActive: true,
      cycleIntervalHours: mc?.cycleIntervalHours || null,
      objectives: mc?.objectives || [],
      thresholds: mc?.thresholds ? (mc.thresholds as any) : null,
      coldStartDescription: prompt?.description || null,
      coldStartPrompts: prompt?.prompts || [],
      propagationTargets: propTargets ? (propTargets as any) : null,
      createdBy: "SYSTEM",
    }

    const existing = await (prisma as any).agentDefinition.findUnique({
      where: { agentRole: role },
    })

    if (existing) {
      await (prisma as any).agentDefinition.update({
        where: { agentRole: role },
        data,
      })
      updated++
    } else {
      await (prisma as any).agentDefinition.create({
        data: { agentRole: role, ...data },
      })
      created++
    }
  }

  console.log(`   ✅ AgentDefinition: ${created} create, ${updated} actualizate`)

  // ── Upsert AgentRelationships ────────────────────────────────────────────
  let relCreated = 0
  let relSkipped = 0

  for (const [childRole, parentRole] of Object.entries(ESCALATION_CHAIN)) {
    if (parentRole === "OWNER") continue // OWNER is external

    try {
      await (prisma as any).agentRelationship.upsert({
        where: {
          parentRole_childRole: { parentRole, childRole },
        },
        update: { isActive: true, relationType: "REPORTS_TO" },
        create: {
          parentRole,
          childRole,
          relationType: "REPORTS_TO",
          isActive: true,
        },
      })
      relCreated++
    } catch (e: any) {
      console.warn(`   ⚠️  Relație ${childRole} → ${parentRole}: ${e.message}`)
      relSkipped++
    }
  }

  console.log(`   ✅ AgentRelationship: ${relCreated} create/actualizate, ${relSkipped} skip`)

  // ── Summary ──────────────────────────────────────────────────────────────
  const totalAgents = await (prisma as any).agentDefinition.count()
  const totalRels = await (prisma as any).agentRelationship.count()
  const managers = await (prisma as any).agentDefinition.count({
    where: { isManager: true },
  })

  console.log(`\n📊 Registry populat:`)
  console.log(`   Agenți: ${totalAgents} (${managers} manageri)`)
  console.log(`   Relații: ${totalRels}`)
  console.log(`   Niveluri: STRATEGIC / TACTICAL / OPERATIONAL`)

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
