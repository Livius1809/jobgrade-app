process.env.DATABASE_URL = "postgresql://neondb_owner:npg_F3tgLQ4mZnca@ep-divine-union-alg0gr3m-pooler.c-3.eu-central-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require"
import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  // Last 30 min entries
  const recent = await prisma.kBEntry.findMany({
    where: { createdAt: { gte: new Date(Date.now() - 30 * 60000) } },
    select: { agentRole: true, source: true, content: true, tags: true, status: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  })
  console.log(`KB entries ultimele 30 min: ${recent.length}`)
  for (const r of recent) {
    console.log(`${r.createdAt.toISOString().slice(11,19)} | ${r.agentRole} | ${r.source} | ${(r.content || "").slice(0, 100)}`)
    if (r.tags?.length) console.log(`   tags: ${r.tags.slice(0, 5).join(", ")}`)
  }

  // Check ingestion jobs
  const jobs = await prisma.systemConfig.findMany({
    where: { key: { startsWith: "INGEST_JOB_" } },
  })
  if (jobs.length > 0) {
    console.log(`\nIngestion jobs: ${jobs.length}`)
    for (const j of jobs) {
      const data = JSON.parse(j.value)
      console.log(`${data.id} | ${data.status} | ${data.sourceTitle} | ${data.processedUpTo}/${data.chunks?.length || "?"} | ${data.entriesCreated} entries`)
    }
  }
}
main().catch(e => console.error(e.message)).finally(() => prisma.$disconnect())
