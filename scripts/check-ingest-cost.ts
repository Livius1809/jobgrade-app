process.env.DATABASE_URL = "postgresql://neondb_owner:npg_F3tgLQ4mZnca@ep-divine-union-alg0gr3m-pooler.c-3.eu-central-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require"
import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })
async function main() {
  const jobs = await prisma.systemConfig.findMany({ where: { key: { startsWith: "INGEST_JOB_" } } })
  console.log("=== JOBURI INGESTIE ===")
  for (const j of jobs) {
    const d = JSON.parse(j.value)
    console.log(`${d.id} | ${d.status} | ${d.sourceTitle?.slice(0, 60)}`)
    console.log(`  Chunks: ${d.processedUpTo}/${d.chunks?.length} | Entries: ${d.entriesCreated} | Creat: ${d.createdAt}`)
    // Estimare cost: ~19 chunks × ~$0.003/chunk (Sonnet) = ~$0.06
    if (d.chunks?.length) {
      const estCost = d.chunks.length * 0.003
      console.log(`  Est. cost: ~$${estCost.toFixed(3)} (${d.chunks.length} chunks × ~$0.003/chunk Sonnet)`)
      // Estimare timp din timestamps
      if (d.createdAt) {
        const start = new Date(d.createdAt).getTime()
        // Nu avem completedAt direct, dar putem estima
        const estMinutes = Math.round(d.chunks.length * 0.5)
        console.log(`  Est. timp: ~${estMinutes} minute`)
      }
    }
  }
}
main().catch(e => console.error(e.message)).finally(() => prisma.$disconnect())
