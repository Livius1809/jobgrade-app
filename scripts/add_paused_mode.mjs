import 'dotenv/config'
import pg from 'pg'
const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

try {
  // Adaug valoarea noua in enum (idempotent)
  await pool.query(`ALTER TYPE "AgentActivityMode" ADD VALUE IF NOT EXISTS 'PAUSED_KNOWN_GAP'`)
  console.log('Enum value PAUSED_KNOWN_GAP added (or already existed)')

  // Setez EMA/CCO/QLA (monotonia Situatiei 1 - Calea 1 pending)
  const r = await pool.query(
    `UPDATE agent_definitions SET "activityMode" = 'PAUSED_KNOWN_GAP'
     WHERE "agentRole" = ANY($1::text[]) RETURNING "agentRole"`,
    [['EMA', 'CCO', 'QLA']]
  )
  console.log(`Pauzati: ${r.rows.map(x => x.agentRole).join(', ')}`)

  // Distributie finala
  const dist = await pool.query(`SELECT "activityMode", count(*) FROM agent_definitions GROUP BY "activityMode" ORDER BY "activityMode"`)
  console.log('\nDistribution:')
  for (const x of dist.rows) console.log(`  ${x.activityMode}: ${x.count}`)

  // Close OPEN events for these 3
  const closed = await pool.query(
    `UPDATE disfunction_events SET status='RESOLVED', "resolvedAt"=NOW(),
      "resolvedBy"='paused_known_gap_pending_calea1_05apr2026', "updatedAt"=NOW()
     WHERE status='OPEN' AND "targetType"='ROLE' AND "targetId" = ANY($1::text[]) RETURNING "targetId"`,
    [['EMA', 'CCO', 'QLA']]
  )
  console.log(`\nClosed OPEN events: ${closed.rows.map(x => x.targetId).join(', ')}`)
} catch (e) { console.error('FAIL:', e.message); process.exit(1) } finally { await pool.end() }
