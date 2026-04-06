import 'dotenv/config'
import pg from 'pg'
const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

try {
  // Corectii backfill bazate pe investigatia reala
  const fixes = [
    { role: 'SOA', mode: 'DORMANT_UNTIL_DELEGATED', reason: 'cycleIntervalHours=null, objectives=[]' },
    { role: 'DVB2B', mode: 'PROACTIVE_CYCLIC', reason: 'are cicluri reale in CycleLog (6/7d)' },
  ]
  for (const f of fixes) {
    const r = await pool.query(
      `UPDATE agent_definitions SET "activityMode" = $1 WHERE "agentRole" = $2 RETURNING "agentRole","activityMode"`,
      [f.mode, f.role]
    )
    console.log(`${f.role} -> ${f.mode} (${f.reason}): ${r.rowCount === 1 ? 'OK' : 'FAIL'}`)
  }

  // Close out SOA OPEN (era fals pozitiv)
  const closed = await pool.query(
    `UPDATE disfunction_events SET status='RESOLVED', "resolvedAt"=NOW(),
       "resolvedBy"='classification_correction_soa_05apr2026', "updatedAt"=NOW()
     WHERE status='OPEN' AND "targetType"='ROLE' AND "targetId"='SOA' RETURNING id`
  )
  console.log(`SOA OPEN events closed: ${closed.rowCount}`)

  // Distributia finala
  const dist = await pool.query(`SELECT "activityMode", count(*) FROM agent_definitions GROUP BY "activityMode" ORDER BY "activityMode"`)
  console.log('\nDistributie finala:')
  for (const r of dist.rows) console.log(`  ${r.activityMode}: ${r.count}`)
} catch (e) { console.error('FAIL:', e.message); process.exit(1) } finally { await pool.end() }
