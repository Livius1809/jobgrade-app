import 'dotenv/config'
import pg from 'pg'
const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

try {
  const def = await pool.query(
    `SELECT "agentRole","displayName","level","isManager","activityMode","cycleIntervalHours"
     FROM agent_definitions WHERE "agentRole" IN ('DVB2B','DVB2C') ORDER BY "agentRole"`
  )
  console.log('=== DVB definitions ===')
  for (const r of def.rows) console.log(`  ${r.agentRole}: mgr=${r.isManager} mode=${r.activityMode} cycle=${r.cycleIntervalHours}h`)

  const rec = await pool.query(
    `SELECT "managerRole","targetRole","actionType","createdAt"
     FROM cycle_logs WHERE "managerRole" IN ('DVB2B','DVB2C')
     ORDER BY "createdAt" DESC LIMIT 10`
  )
  console.log(`\n=== Recent DVB cycles as manager (${rec.rowCount}) ===`)
  for (const r of rec.rows) console.log(`  ${r.createdAt.toISOString()} ${r.managerRole} ${r.actionType} -> ${r.targetRole}`)

  // Totalizez per DVB
  const total = await pool.query(
    `SELECT "managerRole", count(*) FROM cycle_logs
     WHERE "managerRole" IN ('DVB2B','DVB2C') AND "createdAt" > NOW() - INTERVAL '7 days'
     GROUP BY "managerRole"`
  )
  console.log(`\n=== Cycles 7d total ===`)
  for (const r of total.rows) console.log(`  ${r.managerRole}: ${r.count}`)
} catch (e) { console.error('FAIL:', e.message) } finally { await pool.end() }
