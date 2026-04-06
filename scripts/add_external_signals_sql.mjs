#!/usr/bin/env node
/**
 * Aplică schema ExternalSignal direct via SQL pe Neon.
 * Folosim SQL direct pentru că `prisma migrate dev` ar reseta DB-ul din cauza
 * driftului existent (vezi project_disfunction_system_status.md).
 *
 * Idempotent: toate statement-urile sunt IF NOT EXISTS.
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
-- Enum
DO $$ BEGIN
  CREATE TYPE "ExternalSignalCategory" AS ENUM (
    'MARKET_HR',
    'LEGAL_REG',
    'TECH_AI',
    'CULTURAL_SOCIAL',
    'COMPETITOR',
    'MACRO_ECONOMIC'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Tabel
CREATE TABLE IF NOT EXISTS "external_signals" (
  "id"          TEXT PRIMARY KEY,
  "source"      TEXT NOT NULL,
  "sourceUrl"   TEXT NOT NULL,
  "category"    "ExternalSignalCategory" NOT NULL,
  "title"       TEXT NOT NULL,
  "rawContent"  TEXT NOT NULL,
  "capturedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "publishedAt" TIMESTAMP(3),
  "fingerprint" TEXT NOT NULL,
  "processedAt" TIMESTAMP(3),
  "themes"      TEXT[] NOT NULL DEFAULT '{}',
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Unique fingerprint
CREATE UNIQUE INDEX IF NOT EXISTS "external_signals_fingerprint_key"
  ON "external_signals" ("fingerprint");

-- Indexuri secundare
CREATE INDEX IF NOT EXISTS "external_signals_category_capturedAt_idx"
  ON "external_signals" ("category", "capturedAt");

CREATE INDEX IF NOT EXISTS "external_signals_processedAt_idx"
  ON "external_signals" ("processedAt");

CREATE INDEX IF NOT EXISTS "external_signals_source_capturedAt_idx"
  ON "external_signals" ("source", "capturedAt");
`

async function main() {
  await client.connect()
  try {
    await client.query(SQL)
    console.log("OK: external_signals table + enum + indexes applied")

    // Verificare
    const r = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'external_signals'
      ORDER BY ordinal_position;
    `)
    console.log("Columns:", r.rows.map((c) => `${c.column_name}:${c.data_type}`).join(", "))
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error("FAIL:", err)
  process.exit(1)
})
