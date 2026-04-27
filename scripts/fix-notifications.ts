/**
 * Fix notificari — marcheaza cele nelegitime ca rezolvate, pastreaza cele 2 legitime.
 * Ruleaza pe DB PROD cu: DATABASE_URL=<prod_url> npx tsx scripts/fix-notifications.ts
 */
import { config } from "dotenv"
config()

import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const host = new URL(process.env.DATABASE_URL!).host
  console.log(`\nDB: ${host}`)
  if (!host.includes("ep-divine-union")) {
    console.log("ATENTIE: Nu e DB prod! Adauga DATABASE_URL prod explicit.")
    console.log("Continui pe DB curent...\n")
  }

  // 1. Gasim toate notificarile AGENT_MESSAGE nerezolvate
  const active = await (prisma as any).notification.findMany({
    where: { respondedAt: null, type: "AGENT_MESSAGE" },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, sourceRole: true, body: true, createdAt: true },
  })

  console.log(`Notificari active: ${active.length}\n`)

  if (active.length === 0) {
    console.log("Nicio notificare activa.")
    return
  }

  // 2. Clasificam: legitime vs nelegitime
  const legitimate: any[] = []
  const illegitimate: any[] = []

  for (const n of active) {
    const title = (n.title || "").toLowerCase()
    const body = (n.body || "").toLowerCase()

    // Legitime: biografia Owner + clarificare agent nou
    const isBiography = body.includes("biografie") && body.includes("owner")
    const isLegitimateStrategic = body.includes("buget") && body.includes("aprobat")

    if (isBiography || isLegitimateStrategic) {
      legitimate.push(n)
    } else {
      illegitimate.push(n)
    }
  }

  console.log(`Legitime: ${legitimate.length}`)
  for (const n of legitimate) {
    console.log(`  PASTREZ: [${n.sourceRole}] ${n.title.slice(0, 60)}`)
  }

  console.log(`\nNelegitime (de marcat rezolvate): ${illegitimate.length}`)
  for (const n of illegitimate) {
    console.log(`  REZOLV: [${n.sourceRole}] ${n.title.slice(0, 60)}`)
  }

  // 3. Marcam cele nelegitime ca rezolvate
  if (illegitimate.length > 0) {
    const ids = illegitimate.map((n: any) => n.id)
    const updated = await (prisma as any).notification.updateMany({
      where: { id: { in: ids } },
      data: {
        respondedAt: new Date(),
        responseKind: "ADJUSTED",
        read: true,
      },
    })
    console.log(`\nMarcate rezolvate: ${updated.count}`)
    console.log("Motiv: task-uri cu placeholder-uri/descrieri incomplete/atribuiri gresite ierarhic — structura trebuie sa le rezolve intern.")
  }

  // 4. Stergem si task-urile BLOCKED legate de aceste notificari (task-uri prost generate)
  const blockedTasks = await (prisma as any).agentTask.findMany({
    where: {
      status: "BLOCKED",
      title: { contains: "Reconfigurare atributii" },
      createdAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
    },
    select: { id: true, title: true, assignedTo: true },
  })

  if (blockedTasks.length > 0) {
    console.log(`\nTask-uri BLOCKED cu placeholder-uri (ultimele 48h): ${blockedTasks.length}`)
    for (const t of blockedTasks) {
      console.log(`  CANCEL: [${t.assignedTo}] ${t.title.slice(0, 60)}`)
    }

    const cancelled = await (prisma as any).agentTask.updateMany({
      where: { id: { in: blockedTasks.map((t: any) => t.id) } },
      data: { status: "CANCELLED" },
    })
    console.log(`Task-uri anulate: ${cancelled.count}`)
  }

  console.log("\nDone.")
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect())
