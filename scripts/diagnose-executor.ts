process.env.DATABASE_URL = "postgresql://neondb_owner:npg_F3tgLQ4mZnca@ep-divine-union-alg0gr3m-pooler.c-3.eu-central-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require"

import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("DB:", new URL(process.env.DATABASE_URL!).host)

  // 1. Kill-switch
  const ks = await prisma.systemConfig.findUnique({ where: { key: "EXECUTOR_CRON_ENABLED" } })
  console.log("\n1. Kill-switch:", ks?.value || "NOT SET (default: enabled)")

  // 2. Task stats
  const stats = await prisma.agentTask.groupBy({ by: ["status"], _count: true })
  console.log("\n2. Task stats:")
  stats.sort((a: any, b: any) => b._count - a._count)
  let total = 0
  for (const s of stats) { console.log("  " + s.status + ": " + s._count); total += s._count }
  console.log("  TOTAL: " + total)

  // 3. Ultimele completate
  const recent = await prisma.agentTask.findMany({
    where: { status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
    take: 5,
    select: { title: true, completedAt: true, assignedTo: true, kbHit: true },
  })
  console.log("\n3. Ultimele 5 completate:")
  for (const t of recent) {
    console.log("  " + (t.completedAt?.toISOString().slice(0, 16) || "?") + " | " + t.assignedTo + " | kbHit=" + t.kbHit + " | " + (t.title || "").slice(0, 50))
  }

  // 4. ASSIGNED asteapta
  const assigned = await prisma.agentTask.count({ where: { status: "ASSIGNED" } })
  console.log("\n4. ASSIGNED (asteapta executie):", assigned)

  // 5. BLOCKED
  const blocked = await prisma.agentTask.count({ where: { status: "BLOCKED" } })
  console.log("5. BLOCKED:", blocked)

  // 6. Learning orchestrator
  const lastDaily = await prisma.systemConfig.findUnique({ where: { key: "LEARNING_ORCHESTRATOR_LAST_DAILY" } })
  console.log("\n6. Learning orchestrator last daily:", lastDaily?.value || "NEVER")

  // 7. Zombie (ASSIGNED > 7 zile)
  const old7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const staleAssigned = await prisma.agentTask.count({ where: { status: "ASSIGNED", createdAt: { lt: old7d } } })
  console.log("7. ASSIGNED > 7 zile (zombie):", staleAssigned)

  // 8. Vercel cron — ultimul executor run
  const lastExec = await prisma.systemConfig.findUnique({ where: { key: "LAST_EXECUTOR_RUN" } })
  console.log("8. Last executor run:", lastExec?.value || "NOT TRACKED")
}

main().catch(e => console.error(e.message)).finally(() => prisma.$disconnect())
