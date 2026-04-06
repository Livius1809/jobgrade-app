import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import {
  cascadeObjective,
  type AgentInfo,
  type OrgRelationship,
  type ParentObjective,
} from "@/lib/agents/objective-cascade"
import { ObjectiveLevel } from "@/generated/prisma"

export const dynamic = "force-dynamic"

/**
 * POST /api/v1/objectives/cascade
 *
 * COG descompune un obiectiv strategic în sub-obiective TACTICAL + OPERATIONAL
 * pe structura ierarhică. Sub-obiectivele sunt create ca DRAFT — Owner aprobă
 * (PATCH status → ACTIVE) sau ajustează.
 *
 * Body:
 *  - parentObjectiveId (required) — obiectivul strategic de descompus
 *  - dryRun (optional, default false) — dacă true, returnează propunerile fără a le scrie în DB
 *
 * Response:
 *  {
 *    parent: { code, title },
 *    created: number,
 *    proposals: CascadeProposal[] (ce s-a creat sau s-ar crea la dryRun)
 *  }
 */

function verifyInternalAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

const bodySchema = z.object({
  parentObjectiveId: z.string().min(1),
  dryRun: z.boolean().optional().default(false),
})

export async function POST(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    )
  }
  const { parentObjectiveId, dryRun } = parsed.data

  // Fetch parent objective
  const parentObj = await prisma.organizationalObjective.findUnique({
    where: { id: parentObjectiveId },
  })
  if (!parentObj) {
    return NextResponse.json(
      { error: "parent_objective_not_found" },
      { status: 404 },
    )
  }

  // Fetch org chart (active relationships + agent definitions)
  const [relationships, agents] = await Promise.all([
    prisma.agentRelationship.findMany({
      where: { isActive: true },
      select: { parentRole: true, childRole: true },
    }),
    prisma.agentDefinition.findMany({
      where: { isActive: true },
      select: {
        agentRole: true,
        displayName: true,
        description: true,
        level: true,
        isManager: true,
        activityMode: true,
        objectives: true,
      },
    }),
  ])

  const parentInput: ParentObjective = {
    id: parentObj.id,
    businessId: parentObj.businessId,
    code: parentObj.code,
    title: parentObj.title,
    description: parentObj.description,
    metricName: parentObj.metricName,
    metricUnit: parentObj.metricUnit,
    targetValue: parentObj.targetValue,
    direction: parentObj.direction,
    deadlineAt: parentObj.deadlineAt,
    priority: parentObj.priority,
    ownerRoles: parentObj.ownerRoles,
    contributorRoles: parentObj.contributorRoles,
    tags: parentObj.tags,
  }

  const agentInfos: AgentInfo[] = agents.map((a) => ({
    agentRole: a.agentRole,
    displayName: a.displayName,
    description: a.description,
    level: a.level as AgentInfo["level"],
    isManager: a.isManager,
    activityMode: a.activityMode,
    objectives: a.objectives,
  }))

  const rels: OrgRelationship[] = relationships.map((r) => ({
    parentRole: r.parentRole,
    childRole: r.childRole,
  }))

  const proposals = cascadeObjective({
    parent: parentInput,
    agents: agentInfos,
    relationships: rels,
  })

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      parent: { code: parentObj.code, title: parentObj.title },
      proposalCount: proposals.length,
      proposals,
    })
  }

  // Create sub-objectives as DRAFT in DB
  let created = 0
  const results: Array<{ code: string; id: string; status: string }> = []

  for (const p of proposals) {
    // Skip dacă deja există (idempotent — re-run cascade nu duplică)
    const existing = await prisma.organizationalObjective.findUnique({
      where: {
        businessId_code: { businessId: p.businessId, code: p.code },
      },
    })
    if (existing) {
      results.push({ code: p.code, id: existing.id, status: "already_exists" })
      continue
    }

    const obj = await prisma.organizationalObjective.create({
      data: {
        businessId: p.businessId,
        code: p.code,
        title: p.title,
        description: p.description,
        metricName: p.metricName,
        metricUnit: p.metricUnit,
        targetValue: p.targetValue,
        direction: p.direction,
        deadlineAt: p.deadlineAt ? new Date(p.deadlineAt) : null,
        priority: p.priority,
        status: "DRAFT",
        level: p.level as ObjectiveLevel,
        parentObjectiveId: p.parentObjectiveId,
        cascadedBy: p.cascadedBy,
        ownerRoles: p.ownerRoles,
        contributorRoles: p.contributorRoles,
        tags: p.tags,
        createdBy: "COG",
      },
    })
    created++
    results.push({ code: p.code, id: obj.id, status: "created" })
  }

  return NextResponse.json({
    dryRun: false,
    parent: { code: parentObj.code, title: parentObj.title },
    proposalCount: proposals.length,
    created,
    results,
  })
}
