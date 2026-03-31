import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAllAgents, getManagerConfigs, clearRegistryCache } from "@/lib/agents/agent-registry"

function checkAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

/**
 * GET /api/v1/agents/registry
 * List all agents with optional filters: ?level=TACTICAL&isManager=true&isActive=true
 */
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const level = url.searchParams.get("level")
  const isManager = url.searchParams.get("isManager")
  const isActive = url.searchParams.get("isActive")

  try {
    const where: any = {}
    if (level) where.level = level.toUpperCase()
    if (isManager !== null && isManager !== undefined && isManager !== "")
      where.isManager = isManager === "true"
    if (isActive !== null && isActive !== undefined && isActive !== "")
      where.isActive = isActive === "true"
    else where.isActive = true

    const agents = await (prisma as any).agentDefinition.findMany({
      where,
      include: {
        parentRelations: { where: { isActive: true }, select: { parentRole: true } },
        childRelations: { where: { isActive: true }, select: { childRole: true } },
      },
      orderBy: { agentRole: "asc" },
    })

    const result = agents.map((a: any) => ({
      ...a,
      parentRole: a.parentRelations[0]?.parentRole || null,
      subordinates: a.childRelations.map((r: any) => r.childRole),
      parentRelations: undefined,
      childRelations: undefined,
    }))

    return NextResponse.json({ agents: result, total: result.length })
  } catch (e: any) {
    // Table might not exist yet — fallback to static
    const configs = await getManagerConfigs(prisma)
    const agents = await getAllAgents(prisma)

    if (agents.length === 0) {
      return NextResponse.json({
        agents: configs.map((c) => ({
          agentRole: c.agentRole,
          displayName: c.role,
          level: c.level.toUpperCase(),
          isManager: true,
          subordinates: c.subordinates,
          parentRole: c.reportsTo,
        })),
        total: configs.length,
        source: "static-fallback",
      })
    }

    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

/**
 * PUT /api/v1/agents/registry
 * Update agent definition (non-structural: objectives, thresholds, description, prompts)
 */
export async function PUT(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { agentRole, ...updates } = body

    if (!agentRole) {
      return NextResponse.json({ error: "agentRole required" }, { status: 400 })
    }

    // Only allow non-structural updates
    const allowed = [
      "displayName", "description", "objectives", "thresholds",
      "coldStartDescription", "coldStartPrompts", "propagationTargets",
      "cycleIntervalHours",
    ]
    const filtered: any = {}
    for (const key of allowed) {
      if (updates[key] !== undefined) filtered[key] = updates[key]
    }

    const updated = await (prisma as any).agentDefinition.update({
      where: { agentRole },
      data: filtered,
    })

    clearRegistryCache()

    return NextResponse.json({ agent: updated })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
