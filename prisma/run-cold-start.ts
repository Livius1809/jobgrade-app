import { config } from "dotenv"
config()

import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"
import { runColdStart, ALL_AGENT_ROLES } from "../src/lib/kb/cold-start"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log(`🚀 Cold Start KB — ${ALL_AGENT_ROLES.length} agenți`)
  console.log(`   Model: claude-sonnet-4-20250514`)
  console.log(`   Entries per agent: ~50 (5 batches × 10)`)
  console.log(`   Estimare: ~${ALL_AGENT_ROLES.length * 5} apeluri API\n`)

  const results: Array<{ role: string; generated: number; persisted: number; ms: number }> = []

  for (const role of ALL_AGENT_ROLES) {
    console.log(`\n═══ ${role} ═══`)
    try {
      const r = await runColdStart(role, prisma, {
        maxBatches: 5,
        clearExisting: true,
      })
      results.push({ role, generated: r.entriesGenerated, persisted: r.persisted, ms: r.durationMs })
    } catch (err: any) {
      console.error(`❌ ${role}: ${err.message}`)
      results.push({ role, generated: 0, persisted: 0, ms: 0 })
    }
  }

  console.log("\n\n════════════════════════════════════════════")
  console.log("📊 REZUMAT COLD START")
  console.log("════════════════════════════════════════════")

  let totalGenerated = 0
  let totalPersisted = 0
  let totalMs = 0

  for (const r of results) {
    const status = r.persisted > 0 ? "✅" : "❌"
    console.log(`${status} ${r.role.padEnd(20)} ${r.generated} gen / ${r.persisted} saved (${(r.ms / 1000).toFixed(1)}s)`)
    totalGenerated += r.generated
    totalPersisted += r.persisted
    totalMs += r.ms
  }

  console.log("────────────────────────────────────────────")
  console.log(`TOTAL: ${totalGenerated} generate, ${totalPersisted} persistate`)
  console.log(`Timp: ${(totalMs / 1000 / 60).toFixed(1)} minute`)
  console.log(`Agenți: ${results.filter(r => r.persisted > 0).length}/${ALL_AGENT_ROLES.length} cu succes`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
