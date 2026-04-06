#!/usr/bin/env node
/**
 * Calea 1 — Activare executori DORMANT_UNTIL_DELEGATED → REACTIVE_TRIGGERED
 *
 * Executorii devin capabili să primească și execute task-uri delegate de manageri.
 * Nu rulează cicluri proprii (nu devin PROACTIVE_CYCLIC) — sunt activați doar
 * prin task-uri de la manageri.
 *
 * Rulare: node scripts/activate_executors.mjs
 */

import pg from "pg"
const { Pool } = pg

const DATABASE_URL = process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_9zuVxY2XmZbe@ep-odd-water-alccgot0-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require"

const pool = new Pool({ connectionString: DATABASE_URL })

async function run() {
  const client = await pool.connect()
  try {
    // Verifică starea curentă
    const before = await client.query(`
      SELECT "activityMode", COUNT(*) as cnt
      FROM agent_definitions
      GROUP BY "activityMode"
      ORDER BY "activityMode"
    `)
    console.log("=== Stare ÎNAINTE ===")
    before.rows.forEach(r => console.log(`  ${r.activityMode}: ${r.cnt}`))

    // Migrare: DORMANT_UNTIL_DELEGATED → REACTIVE_TRIGGERED
    const result = await client.query(`
      UPDATE agent_definitions
      SET "activityMode" = 'REACTIVE_TRIGGERED'
      WHERE "activityMode" = 'DORMANT_UNTIL_DELEGATED'
      RETURNING "agentRole", "displayName"
    `)

    console.log(`\n=== Migrare: ${result.rowCount} agenți activați ===`)
    result.rows.forEach(r => console.log(`  ✔ ${r.agentRole} (${r.displayName})`))

    // Verifică starea finală
    const after = await client.query(`
      SELECT "activityMode", COUNT(*) as cnt
      FROM agent_definitions
      GROUP BY "activityMode"
      ORDER BY "activityMode"
    `)
    console.log("\n=== Stare DUPĂ ===")
    after.rows.forEach(r => console.log(`  ${r.activityMode}: ${r.cnt}`))

    // De-pauzăm și EMA/CCO/QLA — buclele toxice sunt rezolvate prin Calea 1
    const paused = await client.query(`
      UPDATE agent_definitions
      SET "activityMode" = 'PROACTIVE_CYCLIC'
      WHERE "activityMode" = 'PAUSED_KNOWN_GAP'
      RETURNING "agentRole", "displayName"
    `)
    if (paused.rowCount > 0) {
      console.log(`\n=== De-pauzare: ${paused.rowCount} manageri reactivați ===`)
      paused.rows.forEach(r => console.log(`  ✔ ${r.agentRole} (${r.displayName})`))
    }

    console.log("\nDone. Toți agenții sunt acum operaționali.")

  } finally {
    client.release()
    await pool.end()
  }
}

run().catch((err) => { console.error(err); process.exit(1) })
