import 'dotenv/config'
import pg from 'pg'
const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

// REACTIVE_TRIGGERED: roluri care așteaptă trigger extern (GDPR, audit, L2 support)
const REACTIVE = [
  'DPO', 'CJA', 'CIA', 'CCIA', 'SAFETY_MONITOR',
  'PSE', 'PSYCHOLINGUIST', 'PPMO', 'STA', 'SOC', 'SCA', 'PPA',
  'HR_COUNSELOR', // client-facing, activat de client
]

// DORMANT_UNTIL_DELEGATED: executori operaționali care așteaptă delegare de la manageri
// (pe baza drilldown-ului din Pas B și listei din Situația 2 a triajului)
const DORMANT = [
  'ACA', 'BCA', 'BDA', 'CAA', 'CDIA', 'CMA', 'COAFin', 'CSA', 'CSEO', 'CWA',
  'DDA', 'DEA', 'DMM', 'DOA', 'DOAS', 'DPA', 'EMAS', 'FDA', 'FPA', 'GDA',
  'IRA', 'ISA', 'MAA', 'MDA', 'MKA', 'MOA', 'NSA', 'PCA', 'PCM',
  'PMP_B2B', 'PMP_B2C', 'PMRA', 'PTA', 'QAA', 'RDA', 'REVOPS', 'RPA_FIN',
  'SA', 'SEBC', 'SMMA', 'SQA', 'TDA', 'DVB2C', 'DVB2B',
]

// HYBRID: agenți mixti (ciclu propriu + trigger extern)
const HYBRID = ['SOA'] // prospecting proactiv + răspunde la lead-uri

// PROACTIVE_CYCLIC: default. Lăsăm ce rămâne (managerii: COG, CCO, COCSA, PMA, CFO,
// DMA, CMA, EMA, QLA, etc. — cei care au cycleIntervalHours setat)

async function run() {
  const beforeRes = await pool.query(
    `SELECT "activityMode", count(*) FROM agent_definitions GROUP BY "activityMode" ORDER BY "activityMode"`
  )
  console.log('Before:', beforeRes.rows)

  const rReactive = await pool.query(
    `UPDATE agent_definitions SET "activityMode" = 'REACTIVE_TRIGGERED' WHERE "agentRole" = ANY($1::text[]) RETURNING "agentRole"`,
    [REACTIVE]
  )
  console.log(`REACTIVE_TRIGGERED: ${rReactive.rowCount} agents ->`, rReactive.rows.map(r => r.agentRole).join(', '))

  const rDormant = await pool.query(
    `UPDATE agent_definitions SET "activityMode" = 'DORMANT_UNTIL_DELEGATED' WHERE "agentRole" = ANY($1::text[]) RETURNING "agentRole"`,
    [DORMANT]
  )
  console.log(`DORMANT_UNTIL_DELEGATED: ${rDormant.rowCount} agents ->`, rDormant.rows.map(r => r.agentRole).join(', '))

  const rHybrid = await pool.query(
    `UPDATE agent_definitions SET "activityMode" = 'HYBRID' WHERE "agentRole" = ANY($1::text[]) RETURNING "agentRole"`,
    [HYBRID]
  )
  console.log(`HYBRID: ${rHybrid.rowCount} agents ->`, rHybrid.rows.map(r => r.agentRole).join(', '))

  const afterRes = await pool.query(
    `SELECT "activityMode", count(*) FROM agent_definitions GROUP BY "activityMode" ORDER BY "activityMode"`
  )
  console.log('\nAfter:', afterRes.rows)

  // Cei rămași PROACTIVE_CYCLIC
  const proactives = await pool.query(
    `SELECT "agentRole", "isManager", "cycleIntervalHours" FROM agent_definitions WHERE "activityMode" = 'PROACTIVE_CYCLIC' ORDER BY "agentRole"`
  )
  console.log(`\nPROACTIVE_CYCLIC (${proactives.rows.length}):`)
  for (const r of proactives.rows) {
    console.log(`  ${r.agentRole} (manager=${r.isManager}, cycle=${r.cycleIntervalHours}h)`)
  }
}

try { await run() } catch (e) { console.error('FAIL:', e.message); process.exit(1) } finally { await pool.end() }
