#!/usr/bin/env node
/**
 * Activate marketing agents: MKA, CMA, CWA → REACTIVE_TRIGGERED
 * Idempotent.
 *
 * Usage: node scripts/activate_agents_sql.mjs
 */

import pg from "pg"
const { Pool } = pg

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const statements = [
  `UPDATE "agent_definitions" SET "activityMode" = 'REACTIVE_TRIGGERED', "updatedAt" = now() WHERE "agentRole" IN ('MKA', 'CMA', 'CWA') AND "activityMode" = 'DORMANT_UNTIL_DELEGATED'`,
]

async function main() {
  console.log("Activate marketing agents — " + new Date().toISOString())
  for (const sql of statements) {
    const res = await pool.query(sql)
    console.log("  Updated:", res.rowCount, "rows")
  }
  await pool.end()
  console.log("Done.")
}

main().catch(console.error)
