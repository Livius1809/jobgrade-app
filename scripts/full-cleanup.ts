process.env.DATABASE_URL = "postgresql://neondb_owner:npg_F3tgLQ4mZnca@ep-divine-union-alg0gr3m-pooler.c-3.eu-central-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require"

import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("DB:", new URL(process.env.DATABASE_URL!).host)

  // 1. BLOCKED → CANCELLED
  const blocked = await prisma.agentTask.updateMany({
    where: { status: "BLOCKED" },
    data: { status: "CANCELLED" },
  })
  console.log("BLOCKED anulate:", blocked.count)

  // 2. REVIEW_PENDING > 3 zile → auto-approve
  const old3d = new Date(Date.now() - 3 * 24 * 3600000)
  const staleReview = await prisma.agentTask.updateMany({
    where: { status: "REVIEW_PENDING" as any, completedAt: { lt: old3d } },
    data: { status: "COMPLETED" },
  })
  console.log("REVIEW_PENDING > 3d auto-approved:", staleReview.count)

  // 3. Retururi circulare active → CANCELLED
  const returns = await prisma.agentTask.updateMany({
    where: {
      status: { in: ["ASSIGNED", "ACCEPTED"] },
      title: { startsWith: "[Returnat]" },
      createdAt: { lt: new Date(Date.now() - 24 * 3600000) },
    },
    data: { status: "CANCELLED" },
  })
  console.log("Retururi vechi anulate:", returns.count)

  // 4. Notificari active ramase
  const p = prisma as any
  const notifs = await p.notification.findMany({
    where: { respondedAt: null, type: "AGENT_MESSAGE" },
    select: { sourceRole: true, title: true },
  })
  console.log("\nNotificari active:", notifs.length)
  for (const n of notifs) console.log("  " + n.sourceRole + ": " + (n.title || "").slice(0, 50))

  // 5. Stats finale
  const stats = await prisma.agentTask.groupBy({ by: ["status"], _count: true })
  console.log("\nStats finale:")
  for (const s of stats.sort((a: any, b: any) => b._count - a._count)) {
    console.log("  " + s.status + ": " + s._count)
  }

  // 6. Task-uri active productive ramase
  const active = await prisma.agentTask.findMany({
    where: { status: { in: ["ASSIGNED", "ACCEPTED", "IN_PROGRESS"] } },
    select: { assignedTo: true, title: true },
    take: 15,
  })
  console.log("\nActive productive:", active.length)
  for (const t of active) console.log("  " + t.assignedTo + ": " + (t.title || "").slice(0, 50))
}

main().catch(e => console.error(e.message)).finally(() => prisma.$disconnect())
