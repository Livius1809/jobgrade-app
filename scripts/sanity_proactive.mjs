import 'dotenv/config'
import pg from 'pg'
const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

try {
  const agents = await pool.query(
    `SELECT "agentRole", "displayName", "level", "isManager", "cycleIntervalHours", "activityMode"
     FROM agent_definitions
     WHERE "activityMode" = 'PROACTIVE_CYCLIC'
     ORDER BY "agentRole"`
  )

  console.log(`=== ${agents.rowCount} agenti PROACTIVE_CYCLIC ===\n`)
  console.log('Role      | Level      | Mgr | CycleH | Cycles7d | Cycles24h | LastCycle          | Diagnostic')
  console.log('----------|------------|-----|--------|----------|-----------|--------------------|-----------')

  for (const a of agents.rows) {
    const r = a.agentRole
    const c7d = await pool.query(
      `SELECT count(*) FROM cycle_logs WHERE "managerRole" = $1 AND "createdAt" > NOW() - INTERVAL '7 days'`,
      [r]
    )
    const c24h = await pool.query(
      `SELECT count(*) FROM cycle_logs WHERE "managerRole" = $1 AND "createdAt" > NOW() - INTERVAL '24 hours'`,
      [r]
    )
    const last = await pool.query(
      `SELECT MAX("createdAt") AS last FROM cycle_logs WHERE "managerRole" = $1`,
      [r]
    )

    const cycles7d = parseInt(c7d.rows[0].count)
    const cycles24h = parseInt(c24h.rows[0].count)
    const lastAt = last.rows[0].last
    const lastStr = lastAt ? lastAt.toISOString().substring(0, 19) : 'NICIODATA'

    // Diagnostic
    let diag = ''
    if (!a.isManager) diag = '⚠ nu e manager'
    else if (!a.cycleIntervalHours) diag = '⚠ cycleH=null'
    else if (cycles7d === 0) diag = '⚠ 0 cicluri 7d'
    else if (cycles24h === 0) diag = '⚠ 0 cicluri 24h'
    else diag = '✓ OK'

    const cyclesStr = String(cycles7d).padStart(8)
    const c24Str = String(cycles24h).padStart(9)
    const mgrStr = a.isManager ? ' yes' : ' no '
    const cycleHStr = String(a.cycleIntervalHours ?? 'null').padStart(6)

    console.log(`${r.padEnd(9)} | ${a.level.padEnd(10)} |${mgrStr} | ${cycleHStr} | ${cyclesStr} | ${c24Str} | ${lastStr} | ${diag}`)
  }
} catch (e) { console.error('FAIL:', e.message); process.exit(1) } finally { await pool.end() }
