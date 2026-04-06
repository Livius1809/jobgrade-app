#!/usr/bin/env node
/**
 * Adds Lead pipeline table + enums to Neon DB.
 * Idempotent — safe to run multiple times.
 *
 * Usage: node scripts/add_leads_sql.mjs
 */

import pg from "pg"
const { Pool } = pg

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const statements = [
  // Enums
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LeadStage') THEN
    CREATE TYPE "LeadStage" AS ENUM ('NEW','QUALIFIED','DEMO_SCHEDULED','DEMO_DONE','PROPOSAL','NEGOTIATION','CLOSED_WON','ONBOARDING','ACTIVE','CLOSED_LOST');
  END IF; END $$`,

  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LeadSource') THEN
    CREATE TYPE "LeadSource" AS ENUM ('OUTBOUND_EMAIL','INBOUND_WEBSITE','REFERRAL','LINKEDIN','EVENT','MANUAL');
  END IF; END $$`,

  // Table
  `CREATE TABLE IF NOT EXISTS "leads" (
    "id"                TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "companyName"       TEXT NOT NULL,
    "contactName"       TEXT NOT NULL,
    "contactEmail"      TEXT NOT NULL,
    "contactRole"       TEXT,
    "contactPhone"      TEXT,
    "companySize"       TEXT,
    "industry"          TEXT,
    "website"           TEXT,

    "stage"             "LeadStage" NOT NULL DEFAULT 'NEW',
    "source"            "LeadSource" NOT NULL DEFAULT 'MANUAL',
    "score"             INTEGER DEFAULT 0,

    "bantBudget"        BOOLEAN,
    "bantAuthority"     BOOLEAN,
    "bantNeed"          BOOLEAN,
    "bantTimeline"      BOOLEAN,
    "bantNotes"         TEXT,

    "assignedAgent"     TEXT NOT NULL DEFAULT 'SOA',
    "tenantId"          TEXT,
    "threadId"          TEXT,

    "lastEmailSentAt"   TIMESTAMPTZ,
    "emailSequenceStep" INTEGER DEFAULT 0,
    "nextFollowUpAt"    TIMESTAMPTZ,

    "qualifiedAt"       TIMESTAMPTZ,
    "demoAt"            TIMESTAMPTZ,
    "proposalSentAt"    TIMESTAMPTZ,
    "closedAt"          TIMESTAMPTZ,
    "lostReason"        TEXT,
    "notes"             TEXT,

    "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
  )`,

  // Indexes
  `CREATE INDEX IF NOT EXISTS "leads_stage_idx" ON "leads"("stage")`,
  `CREATE INDEX IF NOT EXISTS "leads_contactEmail_idx" ON "leads"("contactEmail")`,
  `CREATE INDEX IF NOT EXISTS "leads_nextFollowUpAt_idx" ON "leads"("nextFollowUpAt") WHERE "nextFollowUpAt" IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS "leads_assignedAgent_idx" ON "leads"("assignedAgent")`,

  // Activate SOA as HYBRID
  `UPDATE "agent_definitions" SET "activityMode" = 'HYBRID', "updatedAt" = now() WHERE "agentRole" = 'SOA' AND "activityMode" != 'HYBRID'`,
]

async function main() {
  console.log("Add Leads pipeline — " + new Date().toISOString())
  for (const sql of statements) {
    const label = sql.trim().substring(0, 60).replace(/\n/g, " ")
    try {
      await pool.query(sql)
      console.log("  OK:", label)
    } catch (err) {
      console.error("  FAIL:", label, err.message)
    }
  }
  await pool.end()
  console.log("Done.")
}

main().catch(console.error)
