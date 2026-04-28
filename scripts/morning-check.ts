process.env.DATABASE_URL = "postgresql://neondb_owner:npg_F3tgLQ4mZnca@ep-divine-union-alg0gr3m-pooler.c-3.eu-central-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require"

import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  const now = new Date()
  const h6 = new Date(now.getTime() - 6 * 3600000)
  const h24 = new Date(now.getTime() - 24 * 3600000)
  const p = prisma as any

  console.log("DB:", new URL(process.env.DATABASE_URL!).host)
  console.log("Ora:", now.toISOString())

  // 1. Notificari active (ce vede Owner)
  console.log("\n=== NOTIFICARI ACTIVE ===")
  const notifs = await p.notification.findMany({
    where: { respondedAt: null, type: "AGENT_MESSAGE" },
    select: { id: true, sourceRole: true, title: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  })
  console.log("Total:", notifs.length)
  for (const n of notifs) {
    console.log("  " + n.sourceRole + " | " + (n.title || "").slice(0, 60) + " | " + n.createdAt.toISOString().slice(0, 16))
  }

  // 2. Task-uri completate in ultimele 6h — ce s-a lucrat
  console.log("\n=== TASK-URI COMPLETATE (6h) ===")
  const completed = await prisma.agentTask.findMany({
    where: { status: "COMPLETED", completedAt: { gte: h6 } },
    select: { assignedTo: true, title: true, kbHit: true, completedAt: true },
    orderBy: { completedAt: "desc" },
  })
  console.log("Total:", completed.length)
  const byAgent: Record<string, number> = {}
  const byKb: { hit: number; real: number } = { hit: 0, real: 0 }
  for (const t of completed) {
    byAgent[t.assignedTo] = (byAgent[t.assignedTo] || 0) + 1
    if (t.kbHit) byKb.hit++
    else byKb.real++
  }
  console.log("Per agent:", JSON.stringify(byAgent))
  console.log("KB hit:", byKb.hit, "| Real exec:", byKb.real)

  // 3. Task-uri create in 6h — cine genereaza munca
  console.log("\n=== TASK-URI CREATE (6h) ===")
  const created = await prisma.agentTask.findMany({
    where: { createdAt: { gte: h6 } },
    select: { assignedBy: true, assignedTo: true, title: true, tags: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  })
  console.log("Total create:", created.length)
  const createdBy: Record<string, number> = {}
  for (const t of created) {
    createdBy[t.assignedBy] = (createdBy[t.assignedBy] || 0) + 1
  }
  console.log("Create de:", JSON.stringify(createdBy))
  // Mostre
  for (const t of created.slice(0, 10)) {
    console.log("  " + t.assignedBy + " → " + t.assignedTo + " | " + (t.title || "").slice(0, 50))
  }

  // 4. Executor timestamps
  console.log("\n=== EXECUTOR STATUS ===")
  const keys = ["EXECUTOR_LAST_RUN", "EXECUTOR_PROACTIVE_RUN", "LEARNING_ORCHESTRATOR_LAST_DAILY", "OPERATIONAL_ENGINE_LAST"]
  for (const key of keys) {
    const val = await prisma.systemConfig.findUnique({ where: { key } })
    if (key === "OPERATIONAL_ENGINE_LAST" && val?.value) {
      try {
        const report = JSON.parse(val.value)
        console.log("  " + key + ":")
        console.log("    anomalies:", report.anomalyCount)
        console.log("    selfCheck:", JSON.stringify(report.selfCheck))
        console.log("    efficiency:", JSON.stringify(report.efficiency))
        console.log("    autoRemediations:", report.autoRemediationsApplied)
      } catch {
        console.log("  " + key + ": " + (val?.value || "NOT SET").slice(0, 80))
      }
    } else {
      console.log("  " + key + ": " + (val?.value || "NOT SET").slice(0, 50))
    }
  }

  // 5. Task-uri repetate (posibil cauza costurilor)
  console.log("\n=== TASK-URI REPETATE (top titluri 6h) ===")
  const titles: Record<string, number> = {}
  for (const t of completed) {
    const key = (t.title || "").slice(0, 40)
    titles[key] = (titles[key] || 0) + 1
  }
  const sorted = Object.entries(titles).sort((a, b) => b[1] - a[1]).slice(0, 10)
  for (const [title, count] of sorted) {
    console.log("  " + count + "x | " + title)
  }
}

main().catch(e => console.error(e.message)).finally(() => prisma.$disconnect())
