/**
 * add_task_blockers_sql.mjs — Migration: adaugă câmpuri blocaje pe AgentTask
 *
 * Rulează: node scripts/add_task_blockers_sql.mjs
 *
 * Adaugă:
 * 1. Enum BlockerType (7 valori)
 * 2. Status BLOCKED pe AgentTaskStatus
 * 3. Câmpuri blocker pe agent_tasks
 * 4. Index pe (status, blockerType)
 */

import pg from "pg"
import { config } from "dotenv"
config()

const client = new pg.Client({ connectionString: process.env.DATABASE_URL })

const SQL = `
-- 1. Enum BlockerType
DO $$ BEGIN
  CREATE TYPE "BlockerType" AS ENUM (
    'DEPENDENCY',
    'WAITING_INPUT',
    'WAITING_OWNER',
    'EXTERNAL',
    'RESOURCE',
    'TECHNICAL',
    'UNCLEAR_SCOPE'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Adaugă BLOCKED pe AgentTaskStatus (dacă nu există)
ALTER TYPE "AgentTaskStatus" ADD VALUE IF NOT EXISTS 'BLOCKED' AFTER 'IN_PROGRESS';

-- 3. Câmpuri blocker pe agent_tasks
ALTER TABLE "agent_tasks" ADD COLUMN IF NOT EXISTS "blockerType" "BlockerType";
ALTER TABLE "agent_tasks" ADD COLUMN IF NOT EXISTS "blockerDescription" TEXT;
ALTER TABLE "agent_tasks" ADD COLUMN IF NOT EXISTS "blockerAgentRole" TEXT;
ALTER TABLE "agent_tasks" ADD COLUMN IF NOT EXISTS "blockerTaskId" TEXT;
ALTER TABLE "agent_tasks" ADD COLUMN IF NOT EXISTS "blockedAt" TIMESTAMP;
ALTER TABLE "agent_tasks" ADD COLUMN IF NOT EXISTS "unblockedAt" TIMESTAMP;

-- 4. Index pentru query-uri de blocaje
CREATE INDEX IF NOT EXISTS "agent_tasks_status_blockerType_idx"
  ON "agent_tasks" ("status", "blockerType");
`

async function main() {
  await client.connect()
  console.log("Connected to database")

  try {
    await client.query(SQL)
    console.log("✓ Migration completă: blocker fields pe agent_tasks")

    // Verificare
    const result = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'agent_tasks'
        AND column_name LIKE 'blocker%'
      ORDER BY ordinal_position
    `)
    console.log("\nCâmpuri blocker adăugate:")
    for (const row of result.rows) {
      console.log(`  ${row.column_name}: ${row.data_type}`)
    }

    // Verificare enum
    const enumCheck = await client.query(`
      SELECT enumlabel FROM pg_enum
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'BlockerType')
      ORDER BY enumsortorder
    `)
    console.log("\nBlockerType values:")
    for (const row of enumCheck.rows) {
      console.log(`  ${row.enumlabel}`)
    }

    const statusCheck = await client.query(`
      SELECT enumlabel FROM pg_enum
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AgentTaskStatus')
      ORDER BY enumsortorder
    `)
    console.log("\nAgentTaskStatus values:")
    for (const row of statusCheck.rows) {
      console.log(`  ${row.enumlabel}`)
    }

  } catch (err) {
    console.error("Migration error:", err.message)
  } finally {
    await client.end()
  }
}

main()
