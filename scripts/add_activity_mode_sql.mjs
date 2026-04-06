import 'dotenv/config'
import pg from 'pg'
const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const sql = `
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AgentActivityMode') THEN
    CREATE TYPE "AgentActivityMode" AS ENUM (
      'PROACTIVE_CYCLIC',
      'REACTIVE_TRIGGERED',
      'DORMANT_UNTIL_DELEGATED',
      'HYBRID'
    );
  END IF;
END$$;

ALTER TABLE agent_definitions
  ADD COLUMN IF NOT EXISTS "activityMode" "AgentActivityMode" NOT NULL DEFAULT 'PROACTIVE_CYCLIC';
`

try {
  await pool.query(sql)
  console.log('OK: enum + column added')
  const { rows } = await pool.query(`SELECT "activityMode", count(*) FROM agent_definitions GROUP BY "activityMode"`)
  console.log('Current distribution:', rows)
} catch (e) {
  console.error('FAIL:', e.message)
  process.exit(1)
} finally {
  await pool.end()
}
