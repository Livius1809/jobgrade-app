process.env.DATABASE_URL = "postgresql://neondb_owner:npg_F3tgLQ4mZnca@ep-divine-union-alg0gr3m-pooler.c-3.eu-central-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require"
import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  // Last 15 min
  const recent = await prisma.kBEntry.findMany({
    where: { createdAt: { gte: new Date(Date.now() - 15 * 60000) } },
    select: { agentRole: true, source: true, content: true, tags: true, status: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 30,
  })
  console.log(`KB entries ultimele 15 min: ${recent.length}`)
  for (const r of recent) {
    console.log(`${r.createdAt.toISOString().slice(11,19)} | ${r.agentRole} | ${r.source} | ${(r.content || "").slice(0, 120)}`)
  }
  if (recent.length === 0) {
    // Check last hour
    const lastHour = await prisma.kBEntry.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 60 * 60000) } },
      select: { agentRole: true, source: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    })
    console.log(`\nUltima ora: ${lastHour.length} entries`)
    for (const r of lastHour) console.log(`${r.createdAt.toISOString().slice(11,19)} | ${r.agentRole} | ${r.source}`)
  }

  // Check Vercel function logs via telemetry
  const telRecent = await prisma.$queryRaw`
    SELECT "agentRole", "taskType", "estimatedCostUSD", "durationMs", "createdAt"
    FROM execution_telemetry
    WHERE "createdAt" > NOW() - interval '15 minutes'
    ORDER BY "createdAt" DESC
    LIMIT 10
  ` as any[]
  console.log(`\nTelemetry 15 min: ${telRecent.length}`)
  for (const t of telRecent) console.log(`${t.createdAt} | ${t.agentRole} | ${t.taskType} | $${t.estimatedCostUSD} | ${t.durationMs}ms`)
}
main().catch(e => console.error(e.message)).finally(() => prisma.$disconnect())
