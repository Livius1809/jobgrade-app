#!/usr/bin/env node
/**
 * Migrare SQL — Calea 1: AgentTask + enums
 * Idempotent: IF NOT EXISTS.
 */
import pg from "pg"
const { Pool } = pg

const DATABASE_URL = process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_9zuVxY2XmZbe@ep-odd-water-alccgot0-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require"

const pool = new Pool({ connectionString: DATABASE_URL })

const statements = [
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AgentTaskType') THEN
    CREATE TYPE "AgentTaskType" AS ENUM ('KB_RESEARCH','KB_VALIDATION','DATA_ANALYSIS','CONTENT_CREATION','PROCESS_EXECUTION','REVIEW','INVESTIGATION','OUTREACH');
  END IF; END $$`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AgentTaskPriority') THEN
    CREATE TYPE "AgentTaskPriority" AS ENUM ('CRITICAL','HIGH','MEDIUM','LOW');
  END IF; END $$`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AgentTaskStatus') THEN
    CREATE TYPE "AgentTaskStatus" AS ENUM ('ASSIGNED','ACCEPTED','IN_PROGRESS','COMPLETED','FAILED','CANCELLED','EXPIRED','REVIEW_PENDING');
  END IF; END $$`,
  `CREATE TABLE IF NOT EXISTS "agent_tasks" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "businessId" TEXT NOT NULL,
    "assignedBy" TEXT NOT NULL,
    "cycleLogId" TEXT,
    "assignedTo" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "taskType" "AgentTaskType" NOT NULL,
    "priority" "AgentTaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "objectiveId" TEXT,
    "tags" TEXT[] DEFAULT '{}',
    "deadlineAt" TIMESTAMP(3),
    "estimatedMinutes" INTEGER,
    "status" "AgentTaskStatus" NOT NULL DEFAULT 'ASSIGNED',
    "acceptedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "result" TEXT,
    "resultQuality" INTEGER,
    "failureReason" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "agent_tasks_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "agent_tasks_businessId_assignedTo_status_idx" ON "agent_tasks"("businessId","assignedTo","status")`,
  `CREATE INDEX IF NOT EXISTS "agent_tasks_businessId_assignedBy_status_idx" ON "agent_tasks"("businessId","assignedBy","status")`,
  `CREATE INDEX IF NOT EXISTS "agent_tasks_assignedTo_status_idx" ON "agent_tasks"("assignedTo","status")`,
  `CREATE INDEX IF NOT EXISTS "agent_tasks_status_priority_idx" ON "agent_tasks"("status","priority")`,
  `CREATE INDEX IF NOT EXISTS "agent_tasks_deadlineAt_idx" ON "agent_tasks"("deadlineAt")`,
]

async function run() {
  const client = await pool.connect()
  try {
    let ok = 0
    for (const sql of statements) {
      try { await client.query(sql); ok++ }
      catch (err) { if (err.code !== "42710" && err.code !== "42P07") throw err }
    }
    console.log(`Calea 1 migration: ${ok} statements applied`)
  } finally { client.release(); await pool.end() }
}
run().catch((err) => { console.error(err); process.exit(1) })
