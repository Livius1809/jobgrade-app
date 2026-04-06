#!/usr/bin/env node
/**
 * A1 — OrganizationalObjective schema.
 * Aplică direct SQL pe Neon. Idempotent.
 */
import { config } from "dotenv"
import { Client } from "pg"

config({ path: ".env" })
config({ path: ".env.local", override: true })

const client = new Client({ connectionString: process.env.DATABASE_URL })

const SQL = `
-- Enums
DO $$ BEGIN
  CREATE TYPE "ObjectiveDirection" AS ENUM ('INCREASE', 'DECREASE', 'MAINTAIN', 'REACH');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ObjectivePriority" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ObjectiveStatus" AS ENUM (
    'DRAFT', 'ACTIVE', 'AT_RISK', 'MET', 'FAILED', 'SUSPENDED', 'ARCHIVED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tabel
CREATE TABLE IF NOT EXISTS "organizational_objectives" (
  "id"               TEXT PRIMARY KEY,
  "businessId"       TEXT NOT NULL,
  "code"             TEXT NOT NULL,
  "title"            TEXT NOT NULL,
  "description"      TEXT NOT NULL,
  "metricName"       TEXT NOT NULL,
  "metricUnit"       TEXT,
  "targetValue"      DOUBLE PRECISION NOT NULL,
  "currentValue"     DOUBLE PRECISION,
  "direction"        "ObjectiveDirection" NOT NULL DEFAULT 'INCREASE',
  "startDate"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deadlineAt"       TIMESTAMP(3),
  "completedAt"      TIMESTAMP(3),
  "priority"         "ObjectivePriority" NOT NULL DEFAULT 'MEDIUM',
  "status"           "ObjectiveStatus" NOT NULL DEFAULT 'ACTIVE',
  "ownerRoles"       TEXT[] NOT NULL DEFAULT '{}',
  "contributorRoles" TEXT[] NOT NULL DEFAULT '{}',
  "tags"             TEXT[] NOT NULL DEFAULT '{}',
  "sourceDocUrl"     TEXT,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdBy"        TEXT
);

-- Unicitate code per business
CREATE UNIQUE INDEX IF NOT EXISTS "organizational_objectives_businessId_code_key"
  ON "organizational_objectives" ("businessId", "code");

-- Indexuri secundare
CREATE INDEX IF NOT EXISTS "organizational_objectives_businessId_status_idx"
  ON "organizational_objectives" ("businessId", "status");
CREATE INDEX IF NOT EXISTS "organizational_objectives_businessId_priority_idx"
  ON "organizational_objectives" ("businessId", "priority");
CREATE INDEX IF NOT EXISTS "organizational_objectives_deadlineAt_idx"
  ON "organizational_objectives" ("deadlineAt");
`

async function main() {
  await client.connect()
  try {
    await client.query(SQL)
    console.log("OK: organizational_objectives table + enums + indexes applied")

    const check = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'organizational_objectives'
      ORDER BY ordinal_position;
    `)
    console.log(
      `Columns (${check.rows.length}):`,
      check.rows.map((c) => c.column_name).join(", "),
    )
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error("FAIL:", err)
  process.exit(1)
})
