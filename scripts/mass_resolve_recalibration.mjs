import 'dotenv/config'
import pg from 'pg'
const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

// Strategie: mass-resolve TOATE evenimentele OPEN D2 cu motivul clar de
// "sprint2_recalibration_activitymode". Detectorul va reemite, la următorul run,
// DOAR pe agenții cu activityMode relevant (PROACTIVE_CYCLIC + HYBRID). Trail-ul
// istoric rămâne — nu ștergem nimic, doar închidem cu motiv clar.

const RESOLUTION_NOTE = 'sprint2_recalibration_activitymode_05apr2026'

try {
  // 1. Count ce avem înainte
  const before = await pool.query(
    `SELECT class, count(*) FROM disfunction_events WHERE status = 'OPEN' GROUP BY class ORDER BY class`
  )
  console.log('Before (OPEN by class):')
  for (const r of before.rows) console.log(`  ${r.class}: ${r.count}`)

  // 2. Mass-resolve D2 OPEN (motivul: recalibrare sprint 2)
  const result = await pool.query(
    `UPDATE disfunction_events
     SET status = 'RESOLVED',
         "resolvedAt" = NOW(),
         "resolvedBy" = $1,
         "updatedAt" = NOW()
     WHERE status = 'OPEN' AND class = 'D2_FUNCTIONAL_MGMT'
     RETURNING id`,
    [RESOLUTION_NOTE]
  )
  console.log(`\nRezolvate (D2): ${result.rowCount}`)

  // 3. Count after
  const after = await pool.query(
    `SELECT class, status, count(*) FROM disfunction_events
     WHERE "detectedAt" > NOW() - INTERVAL '24 hours'
     GROUP BY class, status ORDER BY class, status`
  )
  console.log('\nAfter (24h all):')
  for (const r of after.rows) console.log(`  ${r.class} ${r.status}: ${r.count}`)
} catch (e) {
  console.error('FAIL:', e.message); process.exit(1)
} finally { await pool.end() }
