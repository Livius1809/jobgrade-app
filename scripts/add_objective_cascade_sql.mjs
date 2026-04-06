#!/usr/bin/env node
/**
 * Adaugă câmpurile de cascadă pe organizational_objectives.
 * Idempotent — doar ADD COLUMN IF NOT EXISTS.
 */
import { config } from "dotenv"
import { Client } from "pg"

config({ path: ".env" })
config({ path: ".env.local", override: true })

const client = new Client({ connectionString: process.env.DATABASE_URL })

const SQL = `
-- Enum
DO $$ BEGIN
  CREATE TYPE "ObjectiveLevel" AS ENUM ('STRATEGIC', 'TACTICAL', 'OPERATIONAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- New columns (idempotent)
DO $$ BEGIN
  ALTER TABLE "organizational_objectives" ADD COLUMN "parentObjectiveId" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "organizational_objectives" ADD COLUMN "level" "ObjectiveLevel" NOT NULL DEFAULT 'STRATEGIC';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "organizational_objectives" ADD COLUMN "cascadedBy" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Index pe parent (pentru child lookup)
CREATE INDEX IF NOT EXISTS "organizational_objectives_parentObjectiveId_idx"
  ON "organizational_objectives" ("parentObjectiveId");
`

async function main() {
  await client.connect()
  try {
    await client.query(SQL)
    console.log("OK: cascade columns + ObjectiveLevel enum applied")

    const check = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'organizational_objectives'
        AND column_name IN ('parentObjectiveId', 'level', 'cascadedBy')
      ORDER BY column_name;
    `)
    console.log("Verified columns:", check.rows.map((c) => c.column_name).join(", "))
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error("FAIL:", err)
  process.exit(1)
})
