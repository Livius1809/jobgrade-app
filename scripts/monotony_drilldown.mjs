import 'dotenv/config'
import pg from 'pg'
const { Pool } = pg

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const managers = ['EMA', 'CCO', 'DMA', 'QLA']
const d7ago = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

for (const m of managers) {
  const { rows } = await pool.query(
    `SELECT "targetRole", "actionType", "resolved", "description", "createdAt"
     FROM cycle_logs
     WHERE "managerRole" = $1 AND "createdAt" >= $2
     ORDER BY "createdAt" ASC`,
    [m, d7ago]
  )
  const byTarget = {}
  const actionTypes = new Set()
  for (const r of rows) {
    byTarget[r.targetRole] = (byTarget[r.targetRole] || 0) + 1
    actionTypes.add(r.actionType)
  }
  const unresolved = rows.filter(r => !r.resolved).length
  console.log(`\n=== ${m} ===`)
  console.log(`  Total cicluri 7d: ${rows.length} | Nerezolvate: ${unresolved}`)
  console.log(`  ActionTypes: ${[...actionTypes].join(', ') || '(niciunul)'}`)
  console.log(`  Pe subordonati:`)
  for (const [t, n] of Object.entries(byTarget).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${t}: ${n}x`)
  }
  if (rows.length > 0) {
    const d = rows[0].description?.slice(0, 140) || '(fara description)'
    console.log(`  Primul description: "${d}"`)
  }
}
await pool.end()
