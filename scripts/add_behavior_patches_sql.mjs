#!/usr/bin/env node
import { config } from "dotenv"
import { Client } from "pg"

config({ path: ".env" })
config({ path: ".env.local", override: true })

const client = new Client({ connectionString: process.env.DATABASE_URL })

const SQL = `
DO $$ BEGIN
  CREATE TYPE "PatchType" AS ENUM (
    'PRIORITY_SHIFT', 'ATTENTION_SHIFT', 'SCOPE_EXPAND', 'SCOPE_NARROW', 'ACTIVITY_MODE', 'CYCLE_INTERVAL'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PatchStatus" AS ENUM (
    'PROPOSED', 'APPROVED', 'ACTIVE', 'EXPIRED', 'CONFIRMED', 'REVERTED', 'REJECTED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "agent_behavior_patches" (
  "id"              TEXT PRIMARY KEY,
  "businessId"      TEXT NOT NULL,
  "targetRole"      TEXT NOT NULL,
  "patchType"       "PatchType" NOT NULL,
  "patchSpec"       JSONB NOT NULL,
  "triggeredBy"     TEXT NOT NULL,
  "triggerSourceId"  TEXT,
  "rationale"       TEXT NOT NULL,
  "status"          "PatchStatus" NOT NULL DEFAULT 'PROPOSED',
  "appliedAt"       TIMESTAMP(3),
  "expiresAt"       TIMESTAMP(3),
  "confirmedAt"     TIMESTAMP(3),
  "revertedAt"      TIMESTAMP(3),
  "revertReason"    TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "agent_behavior_patches_businessId_status_idx"
  ON "agent_behavior_patches" ("businessId", "status");
CREATE INDEX IF NOT EXISTS "agent_behavior_patches_targetRole_status_idx"
  ON "agent_behavior_patches" ("targetRole", "status");
CREATE INDEX IF NOT EXISTS "agent_behavior_patches_expiresAt_idx"
  ON "agent_behavior_patches" ("expiresAt");
`

async function main() {
  await client.connect()
  try {
    await client.query(SQL)
    console.log("OK: agent_behavior_patches table + enums applied")
    const r = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name='agent_behavior_patches' ORDER BY ordinal_position;
    `)
    console.log(`Columns (${r.rows.length}):`, r.rows.map(c => c.column_name).join(", "))
  } finally {
    await client.end()
  }
}

main().catch(err => { console.error("FAIL:", err); process.exit(1) })
