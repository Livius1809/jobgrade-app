/**
 * Îngheață obiectivul E2E după primul test — îl scoate din status ACTIVE
 * ca să nu polueze ciclurile proactive peste noapte, dar păstrează datele
 * pentru re-lansare după ce construim task executor.
 */
import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"

const p = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
}) as any

;(async () => {
  // 1. Obiectivul → PAUSED (nu COMPLETED, nu CANCELED — vrem să-l re-lansăm)
  const obj = await p.organizationalObjective.findFirst({
    where: { code: "e2e-outreach-hr-tech-ro-v1" },
    select: { id: true },
  })
  if (obj) {
    await p.organizationalObjective.update({
      where: { id: obj.id },
      data: {
        status: "SUSPENDED",
        tags: { set: ["e2e-test", "outreach", "b2b-first-client", "owner-initiated", "paused-pending-executor"] },
      },
    })
    console.log(`[freeze] Obiectiv ${obj.id} → PAUSED`)
  }

  // 2. Seed task CCO → COMPLETED cu notă test (nu cancelled — important pentru istoric)
  const seedTask = await p.agentTask.findFirst({
    where: { objectiveId: obj?.id, assignedBy: "OWNER" },
    select: { id: true },
  })
  if (seedTask) {
    await p.agentTask.update({
      where: { id: seedTask.id },
      data: {
        status: "CANCELLED",
        failedAt: new Date(),
        failureReason:
          "E2E test oprit după 30 min. Gap identificat: task executor lipsește complet. CCO nu are mecanism să execute task-uri asignate lui. Re-lansare după construire executor.",
      },
    })
    console.log(`[freeze] Seed task ${seedTask.id} → CANCELED (test-halt)`)
  }

  // 3. Task-ul DMA generat de ciclu (sync meeting) → CANCELED (decuplat semantic)
  const dmaTask = await p.agentTask.findFirst({
    where: {
      objectiveId: obj?.id,
      assignedTo: "DMA",
      assignedBy: "CCO",
    },
    select: { id: true },
  })
  if (dmaTask) {
    await p.agentTask.update({
      where: { id: dmaTask.id },
      data: {
        status: "CANCELLED",
        failedAt: new Date(),
        failureReason:
          "Task generat de ciclu proactiv fără legătură semantică cu obiectivul outreach. Linking sintactic via findManagerObjectiveId (code desc order). Semnal fals de aliniament.",
      },
    })
    console.log(`[freeze] DMA task ${dmaTask.id} → CANCELED (semnal fals)`)
  }

  await p.$disconnect()
})()
