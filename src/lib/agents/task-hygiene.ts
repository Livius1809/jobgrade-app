/**
 * task-hygiene.ts — Curățare taskuri redundante sau învechite
 *
 * Problema: Organismul creează taskuri care devin inutile când codul e scris
 * de Claude în sesiuni directe. Fiecare task ASSIGNED = 1 apel Claude viitor.
 * Taskuri care nu mai au sens = cost irosit.
 *
 * Curățăm:
 *   1. Taskuri ASSIGNED mai vechi de 14 zile fără progres
 *   2. Taskuri duplicate (același obiectiv, descriere similară)
 *   3. Taskuri cu obiectiv deja 100%
 *   4. Taskuri de tip CONTENT_CREATION/REVIEW pentru funcționalități deja implementate
 */

import { prisma } from "@/lib/prisma"

export async function cleanStaleTasks(): Promise<number> {
  let cleaned = 0

  // 1. Taskuri cu obiectiv deja completat (100%)
  const completedObjectiveIds = await prisma.organizationalObjective.findMany({
    where: { currentValue: { gte: 100 } },
    select: { id: true },
  })

  if (completedObjectiveIds.length > 0) {
    const result = await prisma.agentTask.updateMany({
      where: {
        objectiveId: { in: completedObjectiveIds.map(o => o.id) },
        status: { in: ["ASSIGNED", "IN_PROGRESS"] },
      },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        result: "[AUTO-HYGIENE] Obiectivul este deja 100% — task inutil",
      },
    }).catch(() => ({ count: 0 }))
    cleaned += result.count
  }

  // 2. Taskuri ASSIGNED mai vechi de 14 zile fără nicio actualizare
  const staleDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
  const staleResult = await prisma.agentTask.updateMany({
    where: {
      status: "ASSIGNED",
      createdAt: { lt: staleDate },
      startedAt: null,
      // Nu atingem taskuri CRITICAL
      priority: { not: "CRITICAL" },
    },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      result: "[AUTO-HYGIENE] Task vechi de 14+ zile fără progres — arhivat",
    },
  }).catch(() => ({ count: 0 }))
  cleaned += staleResult.count

  // 3. Taskuri duplicate — același obiectiv + descriere similară (primele 50 chars)
  const assigned = await prisma.agentTask.findMany({
    where: { status: "ASSIGNED" },
    select: { id: true, objectiveId: true, description: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  })

  const seen = new Map<string, string>() // key → first task id
  const duplicateIds: string[] = []

  for (const t of assigned) {
    const key = `${t.objectiveId || "none"}::${(t.description || "").slice(0, 50).toLowerCase()}`
    if (seen.has(key)) {
      duplicateIds.push(t.id) // keep first, remove later ones
    } else {
      seen.set(key, t.id)
    }
  }

  if (duplicateIds.length > 0) {
    const dupResult = await prisma.agentTask.updateMany({
      where: { id: { in: duplicateIds } },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        result: "[AUTO-HYGIENE] Duplicat — un task identic există deja",
      },
    }).catch(() => ({ count: 0 }))
    cleaned += dupResult.count
  }

  return cleaned
}
