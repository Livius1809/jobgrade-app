import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"

const p = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
}) as any

const OBJECTIVE_CODE = "e2e-outreach-hr-tech-ro-v1"

;(async () => {
  const obj = await p.organizationalObjective.findFirst({
    where: { code: OBJECTIVE_CODE },
    select: { id: true, code: true, status: true, currentValue: true, targetValue: true, completedAt: true },
  })
  if (!obj) {
    console.log("Obiectiv absent.")
    return
  }

  const tasks = await p.agentTask.findMany({
    where: { objectiveId: obj.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      assignedBy: true,
      assignedTo: true,
      title: true,
      status: true,
      taskType: true,
      priority: true,
      acceptedAt: true,
      startedAt: true,
      completedAt: true,
      result: true,
      createdAt: true,
    },
  })

  console.log(`\n═══ STARE OBIECTIV E2E ═══\n`)
  console.log(`Code:       ${obj.code}`)
  console.log(`Status:     ${obj.status}`)
  console.log(`Progress:   ${obj.currentValue || 0} / ${obj.targetValue}`)
  console.log(`CompletedAt: ${obj.completedAt?.toISOString() || "—"}`)
  console.log()
  console.log(`Tasks legate (${tasks.length}):`)
  for (const t of tasks) {
    console.log(`  ${t.status.padEnd(12)} ${t.assignedBy.padEnd(6)} → ${t.assignedTo.padEnd(8)} [${t.taskType}] ${t.title.slice(0, 60)}`)
    if (t.acceptedAt) console.log(`                accepted: ${t.acceptedAt.toISOString()}`)
    if (t.completedAt) console.log(`                completed: ${t.completedAt.toISOString()}`)
    if (t.result) console.log(`                result: ${t.result.slice(0, 100)}`)
  }

  // Cicluri CCO din ultima oră
  const recentCycles = await p.cycleLog.findMany({
    where: {
      managerRole: "CCO",
      createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, actionType: true, targetRole: true, description: true, createdAt: true },
  })
  console.log(`\nCiclu logs CCO (ultima oră, ${recentCycles.length}):`)
  for (const c of recentCycles) {
    console.log(`  ${c.createdAt.toISOString().slice(11, 19)} ${c.actionType.padEnd(10)} → ${(c.targetRole || "?").padEnd(8)} ${c.description.slice(0, 60)}`)
  }

  await p.$disconnect()
})()
