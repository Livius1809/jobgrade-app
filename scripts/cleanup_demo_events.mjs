import 'dotenv/config'
import pg from 'pg'
const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
try {
  const r = await pool.query(
    `UPDATE disfunction_events SET status='RESOLVED', "resolvedAt"=NOW(),
       "resolvedBy"='demo_cleanup_situations_05apr2026', "updatedAt"=NOW()
     WHERE status='OPEN' AND "detectorSource"='demo-situations' RETURNING id`
  )
  console.log(`Demo events cleaned: ${r.rowCount}`)
} catch (e) { console.error('FAIL:', e.message); process.exit(1) } finally { await pool.end() }
