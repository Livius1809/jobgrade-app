#!/usr/bin/env node
/**
 * A0 — Business model + seed JobGrade ca Business #1.
 * Aplică direct SQL pe Neon (evită drift-ul de la `prisma migrate dev`).
 * Idempotent prin IF NOT EXISTS + ON CONFLICT.
 */
import { config } from "dotenv"
import { Client } from "pg"

config({ path: ".env" })
config({ path: ".env.local", override: true })

const url = process.env.DATABASE_URL
if (!url) {
  console.error("DATABASE_URL missing")
  process.exit(1)
}

const client = new Client({ connectionString: url })

const SQL = `
-- Enums
DO $$ BEGIN
  CREATE TYPE "BusinessStatus" AS ENUM (
    'PRE_LAUNCH', 'PILOT', 'ACTIVE', 'CONSOLIDATING', 'SUSPENDED', 'ARCHIVED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "BusinessLifecyclePhase" AS ENUM (
    'GROWTH', 'MATURE', 'CONSOLIDATION', 'PIVOT'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tabel Business (top-level organism)
CREATE TABLE IF NOT EXISTS "businesses" (
  "id"             TEXT PRIMARY KEY,
  "code"           TEXT NOT NULL,
  "name"           TEXT NOT NULL,
  "description"    TEXT,
  "status"         "BusinessStatus" NOT NULL DEFAULT 'ACTIVE',
  "lifecyclePhase" "BusinessLifecyclePhase" NOT NULL DEFAULT 'GROWTH',
  "mvvStatement"   TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "businesses_code_key" ON "businesses" ("code");
CREATE INDEX IF NOT EXISTS "businesses_status_idx" ON "businesses" ("status");
`

const SEED_JOBGRADE = `
INSERT INTO "businesses" (id, code, name, description, status, "lifecyclePhase", "mvvStatement", "createdAt", "updatedAt")
VALUES (
  'biz_jobgrade',
  'jobgrade',
  'JobGrade',
  'Platformă B2B de evaluare joburi, structură salarială și pay-gap (EU 2023/970), plus engine B2C de metamorfoză și evoluție personală. Business #1 — primul organism viu al holdingului.',
  'PILOT',
  'GROWTH',
  'Punte de evoluție: B2B evaluează corect structura muncii, B2C ajută oamenii să devină autentici. Împreună: antreprenoriat transformațional real.',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("code") DO NOTHING
RETURNING id, code, name, status;
`

async function main() {
  await client.connect()
  try {
    await client.query(SQL)
    console.log("OK: businesses table + enums applied")

    const seedResult = await client.query(SEED_JOBGRADE)
    if (seedResult.rows.length > 0) {
      console.log("SEEDED JobGrade as Business #1:", seedResult.rows[0])
    } else {
      console.log("JobGrade already exists (seed skipped via ON CONFLICT)")
    }

    // Verificare
    const check = await client.query(`
      SELECT id, code, name, status, "lifecyclePhase" FROM "businesses" ORDER BY "createdAt";
    `)
    console.log("\nCurrent businesses:")
    for (const b of check.rows) {
      console.log(
        `  - ${b.code.padEnd(25)} | ${b.name.padEnd(20)} | ${b.status.padEnd(12)} | ${b.lifecyclePhase}`,
      )
    }
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error("FAIL:", err)
  process.exit(1)
})
