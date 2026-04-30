process.env.DATABASE_URL = "postgresql://neondb_owner:npg_F3tgLQ4mZnca@ep-divine-union-alg0gr3m-pooler.c-3.eu-central-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require"
import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })
async function main() {
  const b = await prisma.agentTask.findMany({ where: { status: "BLOCKED" }, select: { title: true, assignedTo: true, assignedBy: true, blockerType: true } })
  console.log("BLOCKED: " + b.length)
  for (const t of b) console.log("  " + t.assignedBy + "->" + t.assignedTo + " | " + (t.blockerType || "?") + " | " + (t.title || "").slice(0, 80))
  const c = await prisma.agentTask.groupBy({ by: ["status"], _count: { _all: true } })
  console.log("\nSTATUS:")
  for (const x of c) console.log("  " + x.status + ": " + x._count._all)
  const cost: any[] = await prisma.$queryRaw`SELECT ROUND(SUM("estimatedCostUSD")::numeric, 2) as cost, COUNT(*) as calls FROM execution_telemetry WHERE "createdAt" > NOW() - interval '24 hours'`
  console.log("\nCOST 24h: $" + (cost[0]?.cost || 0) + " / " + Number(cost[0]?.calls || 0) + " apeluri")
}
main().catch(e => console.error(e.message)).finally(() => prisma.$disconnect())
