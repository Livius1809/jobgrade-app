process.env.DATABASE_URL = "postgresql://neondb_owner:npg_F3tgLQ4mZnca@ep-divine-union-alg0gr3m-pooler.c-3.eu-central-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require"

import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("DB:", new URL(process.env.DATABASE_URL!).host)

  // 1. Anulam TOATE task-urile care genereaza bucle
  const loops = await prisma.agentTask.updateMany({
    where: {
      status: { in: ["ASSIGNED", "ACCEPTED", "IN_PROGRESS", "BLOCKED", "REVIEW_PENDING"] },
      OR: [
        { title: { contains: "Self-check" } },
        { title: { contains: "Reconfigurare atributii" } },
        { title: { contains: "cold start" } },
        { title: { contains: "Cold start" } },
        { title: { contains: "Cold Start" } },
        { title: { contains: "semnare digital" } },
        { title: { contains: "Solicitare formal" } },
        // Retururi circulare CAA↔COA
        { title: { contains: "[Returnat]" }, assignedBy: "CAA", assignedTo: "COA" },
        { title: { contains: "[Returnat]" }, assignedBy: "COA", assignedTo: "CAA" },
      ],
    },
    data: { status: "CANCELLED" },
  })
  console.log("Bucle anulate:", loops.count)

  // 2. Stats
  const stats = await prisma.agentTask.groupBy({ by: ["status"], _count: true })
  console.log("\nStats:")
  for (const s of stats.sort((a: any, b: any) => b._count - a._count)) {
    console.log("  " + s.status + ": " + s._count)
  }

  // 3. Task-uri active ramase
  const active = await prisma.agentTask.findMany({
    where: { status: { in: ["ASSIGNED", "ACCEPTED", "IN_PROGRESS"] } },
    select: { assignedTo: true, title: true },
    take: 10,
  })
  console.log("\nActive ramase:", active.length)
  for (const t of active) console.log("  " + t.assignedTo + ": " + (t.title || "").slice(0, 50))
}

main().catch(e => console.error(e.message)).finally(() => prisma.$disconnect())
