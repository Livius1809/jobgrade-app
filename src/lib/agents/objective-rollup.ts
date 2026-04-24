/**
 * objective-rollup.ts — Agregare obiective de jos în sus
 *
 * Când un sub-obiectiv își actualizează currentValue, media ponderată
 * urcă automat: OPERATIONAL → TACTICAL → STRATEGIC.
 *
 * Principiu: obiectivul părinte = media currentValue a copiilor.
 * Dacă toți copiii au 100% → părintele are 100%.
 * Dacă un copil are 0% → media scade proporțional.
 *
 * Apelat de:
 *   1. Cron executor (după fiecare ciclu) — rollupAllObjectives()
 *   2. Manual din dashboard — POST /api/v1/objectives/rollup
 */

import { prisma } from "@/lib/prisma"

interface ObjectiveNode {
  id: string
  code: string
  currentValue: number | null
  targetValue: number
  parentObjectiveId: string | null
  level: string | null
}

/**
 * Agregă currentValue de la copii la părinte, recursiv.
 * Returnează câte obiective au fost actualizate.
 */
export async function rollupAllObjectives(): Promise<{ updated: number; details: Array<{ code: string; oldValue: number | null; newValue: number }> }> {
  const allObjectives = await prisma.organizationalObjective.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, code: true, currentValue: true, targetValue: true, parentObjectiveId: true, level: true },
  })

  // Construim arborele
  const byParent = new Map<string, ObjectiveNode[]>()
  const byId = new Map<string, ObjectiveNode>()

  for (const o of allObjectives) {
    byId.set(o.id, o)
    if (o.parentObjectiveId) {
      const siblings = byParent.get(o.parentObjectiveId) || []
      siblings.push(o)
      byParent.set(o.parentObjectiveId, siblings)
    }
  }

  const details: Array<{ code: string; oldValue: number | null; newValue: number }> = []

  // Parcurgem de la frunze în sus (OPERATIONAL → TACTICAL → STRATEGIC)
  const levels = ["OPERATIONAL", "TACTICAL", "STRATEGIC"]

  // Preîncărcăm contorul de taskuri per obiectiv (pentru a exclude obiective dormante)
  const taskCounts = await prisma.agentTask.groupBy({
    by: ["objectiveId"],
    where: { objectiveId: { not: null } },
    _count: { _all: true },
  })
  const taskCountMap = new Map<string, number>()
  for (const t of taskCounts) {
    if (t.objectiveId) taskCountMap.set(t.objectiveId, t._count._all)
  }

  for (const level of levels) {
    const parents = allObjectives.filter(o => {
      const children = byParent.get(o.id)
      return children && children.length > 0
    })

    for (const parent of parents) {
      const children = byParent.get(parent.id) || []
      if (children.length === 0) continue

      // Excludem copiii dormanti (0 taskuri) — nu trag media în jos
      const activeChildren = children.filter(c => (taskCountMap.get(c.id) ?? 0) > 0)
      const source = activeChildren.length > 0 ? activeChildren : children

      const childValues = source.map(c => c.currentValue ?? 0)
      const avg = Math.round(childValues.reduce((a, b) => a + b, 0) / childValues.length)

      if (avg !== parent.currentValue) {
        await prisma.organizationalObjective.update({
          where: { id: parent.id },
          data: { currentValue: avg },
        })

        details.push({ code: parent.code, oldValue: parent.currentValue, newValue: avg })

        // Actualizăm și în memorie pentru nivelul următor
        parent.currentValue = avg
      }
    }
  }

  return { updated: details.length, details }
}

/**
 * Auto-cascade: când un obiectiv STRATEGIC este creat,
 * cascadează automat la departamente.
 */
export async function autoCascadeNewObjective(objectiveId: string): Promise<number> {
  const obj = await prisma.organizationalObjective.findUnique({ where: { id: objectiveId } })
  if (!obj || obj.level !== "STRATEGIC") return 0

  // Verificăm dacă are deja copii
  const existingChildren = await prisma.organizationalObjective.count({
    where: { parentObjectiveId: objectiveId },
  })
  if (existingChildren > 0) return 0

  // Apelăm cascade logic
  const { cascadeObjective } = await import("./objective-cascade")

  const [relationships, agents] = await Promise.all([
    prisma.agentRelationship.findMany({
      where: { isActive: true },
      select: { parentRole: true, childRole: true },
    }),
    prisma.agentDefinition.findMany({
      where: { isActive: true },
      select: {
        agentRole: true, displayName: true, description: true,
        level: true, isManager: true, activityMode: true, objectives: true,
      },
    }),
  ])

  const proposals = cascadeObjective({
    parent: {
      id: obj.id, businessId: obj.businessId, code: obj.code, title: obj.title,
      description: obj.description, metricName: obj.metricName, metricUnit: obj.metricUnit,
      targetValue: obj.targetValue, direction: obj.direction, deadlineAt: obj.deadlineAt,
      priority: obj.priority, ownerRoles: obj.ownerRoles, contributorRoles: obj.contributorRoles,
      tags: obj.tags,
    },
    agents: agents.map(a => ({
      agentRole: a.agentRole, displayName: a.displayName, description: a.description,
      level: a.level as any, isManager: a.isManager, activityMode: a.activityMode,
      objectives: a.objectives,
    })),
    relationships: relationships.map(r => ({ parentRole: r.parentRole, childRole: r.childRole })),
  })

  let created = 0
  for (const p of proposals) {
    const existing = await prisma.organizationalObjective.findFirst({
      where: { businessId: p.businessId, code: p.code },
    })
    if (existing) continue

    await prisma.organizationalObjective.create({
      data: {
        businessId: p.businessId, code: p.code, title: p.title,
        description: p.description, metricName: p.metricName, metricUnit: p.metricUnit,
        targetValue: p.targetValue, direction: p.direction,
        deadlineAt: p.deadlineAt ? new Date(p.deadlineAt) : null,
        priority: p.priority, status: "ACTIVE", // Direct activ, nu DRAFT
        level: p.level as any, parentObjectiveId: p.parentObjectiveId,
        cascadedBy: p.cascadedBy, ownerRoles: p.ownerRoles,
        contributorRoles: p.contributorRoles, tags: p.tags, createdBy: "COG",
      },
    })
    created++
  }

  return created
}
