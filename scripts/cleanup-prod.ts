process.env.DATABASE_URL = "postgresql://neondb_owner:npg_F3tgLQ4mZnca@ep-divine-union-alg0gr3m-pooler.c-3.eu-central-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require"

import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("DB:", new URL(process.env.DATABASE_URL!).host)

  // 1. Anulam BLOCKED (ramasite)
  const blocked = await prisma.agentTask.updateMany({
    where: { status: "BLOCKED" },
    data: { status: "CANCELLED" },
  })
  console.log("BLOCKED anulate:", blocked.count)

  // 2. Auto-approve REVIEW_PENDING > 48h
  const old48h = new Date(Date.now() - 48 * 60 * 60 * 1000)
  const staleReview = await prisma.agentTask.updateMany({
    where: { status: "REVIEW_PENDING" as any, completedAt: { lt: old48h } },
    data: { status: "COMPLETED" },
  })
  console.log("REVIEW_PENDING > 48h auto-approved:", staleReview.count)

  // 3. Anulam ACCEPTED care nu au progresat > 7 zile
  const old7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const staleAccepted = await prisma.agentTask.updateMany({
    where: { status: "ACCEPTED", acceptedAt: { lt: old7d } },
    data: { status: "CANCELLED" },
  })
  console.log("ACCEPTED > 7 zile anulate:", staleAccepted.count)

  // 4. Stats finale
  const stats = await prisma.agentTask.groupBy({ by: ["status"], _count: true })
  console.log("\nStats finale:")
  for (const s of stats.sort((a: any, b: any) => b._count - a._count)) {
    console.log("  " + s.status + ": " + s._count)
  }

  // 5. Ultimele 3 completate CU executie reala (kbHit=false)
  const realExec = await prisma.agentTask.findMany({
    where: { status: "COMPLETED", kbHit: false },
    orderBy: { completedAt: "desc" },
    take: 3,
    select: { title: true, completedAt: true, assignedTo: true },
  })
  console.log("\nUltimele 3 cu executie REALA (kbHit=false):")
  for (const t of realExec) {
    console.log("  " + (t.completedAt?.toISOString().slice(0, 16) || "?") + " | " + t.assignedTo + " | " + (t.title || "").slice(0, 50))
  }
}

main().catch(e => console.error(e.message)).finally(() => prisma.$disconnect())
