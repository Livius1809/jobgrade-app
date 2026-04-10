import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"

const p = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
}) as any

;(async () => {
  const obj = await p.organizationalObjective.findFirst({
    where: { code: "e2e-outreach-hr-tech-ro-v2" },
    select: { id: true, code: true },
  })
  if (!obj) return console.log("Obiectiv absent")

  const tasks = await p.agentTask.findMany({
    where: { objectiveId: obj.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      assignedBy: true,
      assignedTo: true,
      title: true,
      status: true,
      blockerType: true,
      blockerDescription: true,
      failureReason: true,
      result: true,
      completedAt: true,
    },
  })

  console.log(`\n═══ INSPECT E2E v2 (${tasks.length} tasks) ═══\n`)
  for (const t of tasks) {
    console.log(`── ${t.status.padEnd(10)} ${t.assignedBy} → ${t.assignedTo}`)
    console.log(`   ${t.title}`)
    if (t.blockerDescription) {
      console.log(`   BLOCKER [${t.blockerType}]: ${t.blockerDescription}`)
    }
    if (t.failureReason) {
      console.log(`   FAILED: ${t.failureReason}`)
    }
    if (t.result && t.status === "COMPLETED") {
      console.log(`   RESULT (${t.result.length} chars): ${t.result.slice(0, 150).replace(/\n/g, " ")}...`)
    }
    console.log()
  }

  await p.$disconnect()
})()
