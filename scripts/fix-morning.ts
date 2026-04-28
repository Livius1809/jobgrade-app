process.env.DATABASE_URL = "postgresql://neondb_owner:npg_F3tgLQ4mZnca@ep-divine-union-alg0gr3m-pooler.c-3.eu-central-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require"

import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("DB:", new URL(process.env.DATABASE_URL!).host)

  // 1. Anulam task-urile "Self-check" si "Reconfigurare atributii" (bucla infinita)
  const selfCheck = await prisma.agentTask.updateMany({
    where: {
      status: { in: ["ASSIGNED", "ACCEPTED", "IN_PROGRESS", "BLOCKED", "REVIEW_PENDING"] },
      OR: [
        { title: { contains: "Self-check: 7 agenti" } },
        { title: { contains: "Reconfigurare atributii" } },
        { title: { contains: "cold start" } },
        { title: { contains: "Cold start" } },
      ],
    },
    data: { status: "CANCELLED" },
  })
  console.log("Task-uri bucla anulate:", selfCheck.count)

  // 2. Marcam toate notificarile COA repetate
  const coaNotifs = await (prisma as any).notification.updateMany({
    where: { respondedAt: null, type: "AGENT_MESSAGE", sourceRole: "COA" },
    data: { respondedAt: new Date(), responseKind: "ADJUSTED", read: true },
  })
  console.log("Notificari COA rezolvate:", coaNotifs.count)

  // 3. Marcam si CWA (veche de ieri)
  const cwaNotifs = await (prisma as any).notification.updateMany({
    where: { respondedAt: null, type: "AGENT_MESSAGE", sourceRole: "CWA" },
    data: { respondedAt: new Date(), responseKind: "ADJUSTED", read: true },
  })
  console.log("Notificari CWA rezolvate:", cwaNotifs.count)

  // 4. Ce a ramas activ
  const remaining = await (prisma as any).notification.findMany({
    where: { respondedAt: null, type: "AGENT_MESSAGE" },
    select: { sourceRole: true, title: true },
  })
  console.log("\nNotificari ramase:", remaining.length)
  for (const n of remaining) console.log("  " + n.sourceRole + ": " + (n.title || "").slice(0, 60))

  // 5. Task-uri ramase active
  const stats = await prisma.agentTask.groupBy({ by: ["status"], _count: true })
  console.log("\nTask stats:")
  for (const s of stats.sort((a: any, b: any) => b._count - a._count)) {
    console.log("  " + s.status + ": " + s._count)
  }
}

main().catch(e => console.error(e.message)).finally(() => prisma.$disconnect())
