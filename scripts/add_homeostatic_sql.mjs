#!/usr/bin/env node
import { config } from "dotenv"
import { Client } from "pg"

config({ path: ".env" })
config({ path: ".env.local", override: true })

const client = new Client({ connectionString: process.env.DATABASE_URL })

const SQL = `
DO $$ BEGIN
  CREATE TYPE "HomeostaticTargetType" AS ENUM ('SERVICE', 'ROLE', 'SYSTEM');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "HomeostaticStatus" AS ENUM ('UNKNOWN', 'OPTIMAL', 'NORMAL', 'WARNING', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "homeostatic_targets" (
  "id"              TEXT PRIMARY KEY,
  "businessId"      TEXT NOT NULL,
  "code"            TEXT NOT NULL,
  "name"            TEXT NOT NULL,
  "description"     TEXT,
  "metricName"      TEXT NOT NULL,
  "metricUnit"      TEXT,
  "targetType"      "HomeostaticTargetType" NOT NULL,
  "targetEntityId"  TEXT,
  "minValue"        DOUBLE PRECISION,
  "maxValue"        DOUBLE PRECISION,
  "optimalValue"    DOUBLE PRECISION,
  "warningPct"      DOUBLE PRECISION NOT NULL DEFAULT 10,
  "criticalPct"     DOUBLE PRECISION NOT NULL DEFAULT 25,
  "lastReading"     DOUBLE PRECISION,
  "lastReadingAt"   TIMESTAMP(3),
  "currentStatus"   "HomeostaticStatus" NOT NULL DEFAULT 'UNKNOWN',
  "autoCorrect"     BOOLEAN NOT NULL DEFAULT false,
  "isActive"        BOOLEAN NOT NULL DEFAULT true,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "homeostatic_targets_businessId_code_key"
  ON "homeostatic_targets" ("businessId", "code");
CREATE INDEX IF NOT EXISTS "homeostatic_targets_businessId_isActive_idx"
  ON "homeostatic_targets" ("businessId", "isActive");
CREATE INDEX IF NOT EXISTS "homeostatic_targets_currentStatus_idx"
  ON "homeostatic_targets" ("currentStatus");
`

async function main() {
  await client.connect()
  try {
    await client.query(SQL)
    console.log("OK: homeostatic_targets table + enums applied")
    const r = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='homeostatic_targets' ORDER BY ordinal_position")
    console.log(`Columns (${r.rows.length}):`, r.rows.map(c => c.column_name).join(", "))
  } finally { await client.end() }
}

main().catch(err => { console.error("FAIL:", err); process.exit(1) })
