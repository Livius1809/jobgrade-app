import 'dotenv/config'
import pg from 'pg'
const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

// Găsește toți agenții care NU au primit cold start (0 SELF_INTERVIEW entries)
const result = await pool.query(`
  SELECT ad."agentRole"
  FROM agent_definitions ad
  LEFT JOIN (
    SELECT "agentRole", COUNT(*)::int as cnt
    FROM kb_entries
    WHERE source = 'SELF_INTERVIEW' AND status = 'PERMANENT'
    GROUP BY "agentRole"
  ) kb ON ad."agentRole" = kb."agentRole"
  WHERE ad."isActive" = true
    AND array_length(ad."coldStartPrompts", 1) > 0
    AND (kb.cnt IS NULL OR kb.cnt = 0)
  ORDER BY ad."agentRole"
`)

const agents = result.rows.map(r => r.agentRole)
console.log(`\n=== COLD START pentru ${agents.length} agenți fără self-interview ===`)
console.log(agents.join(', '))
console.log('')

pool.end()

// Acum rulăm cold start
const { runColdStart } = await import('../src/lib/kb/cold-start.ts')
const { PrismaClient } = await import('../src/generated/prisma/index.js')
const { PrismaPg } = await import('@prisma/adapter-pg')
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

let totalGenerated = 0
let totalPersisted = 0

for (const role of agents) {
  console.log(`\n--- ${role} ---`)
  try {
    const result = await runColdStart(role, prisma, { maxBatches: 5 })
    console.log(`  Generat: ${result.entriesGenerated} | Persistat: ${result.persisted} | ${result.durationMs}ms`)
    totalGenerated += result.entriesGenerated
    totalPersisted += result.persisted
  } catch (e) {
    console.error(`  EROARE: ${e.message}`)
  }
}

await prisma.$disconnect()

console.log(`\n=== TOTAL: ${totalGenerated} generate, ${totalPersisted} persistate pe ${agents.length} agenți ===`)
