#!/usr/bin/env node
/**
 * Migrare SQL — Straturile D, E, F, G (Living Organization)
 * Aplică direct pe Neon (evită prisma migrate dev din cauza drift-ului).
 * Idempotent: IF NOT EXISTS pe toate.
 *
 * Rulare: node scripts/add_remaining_layers_sql.mjs
 */

import pg from "pg"
const { Pool } = pg

const DATABASE_URL = process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_9zuVxY2XmZbe@ep-odd-water-alccgot0-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require"

const pool = new Pool({ connectionString: DATABASE_URL })

const statements = [
  // ═══ ENUMS ═══

  // D — Immune
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BoundaryRuleType') THEN
    CREATE TYPE "BoundaryRuleType" AS ENUM ('MORAL_CORE','SCOPE_VIOLATION','CONSISTENCY','DATA_INTEGRITY','PRIVACY');
  END IF; END $$`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BoundarySeverity') THEN
    CREATE TYPE "BoundarySeverity" AS ENUM ('CRITICAL','HIGH','MEDIUM','LOW');
  END IF; END $$`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BoundaryAction') THEN
    CREATE TYPE "BoundaryAction" AS ENUM ('BLOCK','QUARANTINE','WARN','LOG');
  END IF; END $$`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'QuarantineStatus') THEN
    CREATE TYPE "QuarantineStatus" AS ENUM ('QUARANTINED','RELEASED','DESTROYED','AUTO_RELEASED');
  END IF; END $$`,

  // E — Metabolism
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NegotiationStatus') THEN
    CREATE TYPE "NegotiationStatus" AS ENUM ('PENDING','GRANTED','DENIED','AUTO_GRANTED','EXPIRED');
  END IF; END $$`,

  // F — Evolution
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PruneReason') THEN
    CREATE TYPE "PruneReason" AS ENUM ('UNUSED_90D','LOW_SUCCESS_RATE','SUPERSEDED','CONTRADICTED','EXPIRED');
  END IF; END $$`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PruneStatus') THEN
    CREATE TYPE "PruneStatus" AS ENUM ('FLAGGED','APPROVED','KEPT','PRUNED','DEFERRED');
  END IF; END $$`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PropagationType') THEN
    CREATE TYPE "PropagationType" AS ENUM ('KB_CLONE','PATCH_TEMPLATE','PATTERN_SHARE');
  END IF; END $$`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PropagationStatus') THEN
    CREATE TYPE "PropagationStatus" AS ENUM ('PROPOSED','APPROVED','APPLIED','CONFIRMED','REVERTED','REJECTED');
  END IF; END $$`,

  // G — Rhythm
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WildCardType') THEN
    CREATE TYPE "WildCardType" AS ENUM ('CONTRARIAN','CROSS_DOMAIN','FUTURE_SELF','CONSTRAINT','ABSURD');
  END IF; END $$`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RitualType') THEN
    CREATE TYPE "RitualType" AS ENUM ('RETROSPECTIVE','POST_INCIDENT','STRATEGIC','CELEBRATION','CALIBRATION');
  END IF; END $$`,

  // ═══ TABLES ═══

  // D1 — Boundary Rules
  `CREATE TABLE IF NOT EXISTS "boundary_rules" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "businessId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ruleType" "BoundaryRuleType" NOT NULL,
    "severity" "BoundarySeverity" NOT NULL DEFAULT 'HIGH',
    "condition" JSONB NOT NULL,
    "action" "BoundaryAction" NOT NULL DEFAULT 'BLOCK',
    "notifyRoles" TEXT[] DEFAULT '{}',
    "escalateToOwner" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "boundary_rules_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "boundary_rules_code_key" ON "boundary_rules"("code")`,
  `CREATE INDEX IF NOT EXISTS "boundary_rules_businessId_ruleType_isActive_idx" ON "boundary_rules"("businessId","ruleType","isActive")`,

  // D1 — Boundary Violations
  `CREATE TABLE IF NOT EXISTS "boundary_violations" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "ruleId" TEXT NOT NULL,
    "businessId" TEXT,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "sourceRole" TEXT,
    "inputSnapshot" TEXT NOT NULL,
    "actionTaken" "BoundaryAction" NOT NULL,
    "wasOverridden" BOOLEAN NOT NULL DEFAULT false,
    "overrideBy" TEXT,
    "overrideReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "boundary_violations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "boundary_violations_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "boundary_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "boundary_violations_ruleId_createdAt_idx" ON "boundary_violations"("ruleId","createdAt")`,
  `CREATE INDEX IF NOT EXISTS "boundary_violations_businessId_createdAt_idx" ON "boundary_violations"("businessId","createdAt")`,

  // D2 — Quarantine
  `CREATE TABLE IF NOT EXISTS "quarantine_entries" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "violationId" TEXT NOT NULL,
    "businessId" TEXT,
    "contentType" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "QuarantineStatus" NOT NULL DEFAULT 'QUARANTINED',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "releaseReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "quarantine_entries_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "quarantine_entries_violationId_fkey" FOREIGN KEY ("violationId") REFERENCES "boundary_violations"("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "quarantine_entries_violationId_key" ON "quarantine_entries"("violationId")`,
  `CREATE INDEX IF NOT EXISTS "quarantine_entries_status_idx" ON "quarantine_entries"("status")`,
  `CREATE INDEX IF NOT EXISTS "quarantine_entries_contentHash_idx" ON "quarantine_entries"("contentHash")`,

  // D2 — Immune Patterns
  `CREATE TABLE IF NOT EXISTS "immune_patterns" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "businessId" TEXT,
    "patternType" TEXT NOT NULL,
    "patternKey" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "occurrenceCount" INTEGER NOT NULL DEFAULT 1,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "violationIds" TEXT[] DEFAULT '{}',
    "autoBlock" BOOLEAN NOT NULL DEFAULT false,
    "threshold" INTEGER NOT NULL DEFAULT 3,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "immune_patterns_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "immune_patterns_businessId_patternType_patternKey_key" ON "immune_patterns"("businessId","patternType","patternKey")`,
  `CREATE INDEX IF NOT EXISTS "immune_patterns_isActive_autoBlock_idx" ON "immune_patterns"("isActive","autoBlock")`,

  // E1 — Resource Usage
  `CREATE TABLE IF NOT EXISTS "resource_usage" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "businessId" TEXT NOT NULL,
    "agentRole" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "llmTokensIn" INTEGER NOT NULL DEFAULT 0,
    "llmTokensOut" INTEGER NOT NULL DEFAULT 0,
    "llmCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dbQueries" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "triggerSource" TEXT,
    "metadata" JSONB,
    "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "resource_usage_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "resource_usage_businessId_agentRole_measuredAt_idx" ON "resource_usage"("businessId","agentRole","measuredAt")`,
  `CREATE INDEX IF NOT EXISTS "resource_usage_businessId_measuredAt_idx" ON "resource_usage"("businessId","measuredAt")`,
  `CREATE INDEX IF NOT EXISTS "resource_usage_agentRole_actionType_idx" ON "resource_usage"("agentRole","actionType")`,

  // E2 — Resource Budget
  `CREATE TABLE IF NOT EXISTS "resource_budgets" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "businessId" TEXT NOT NULL,
    "agentRole" TEXT NOT NULL,
    "maxLlmTokensPerDay" INTEGER NOT NULL DEFAULT 100000,
    "maxLlmCostPerDay" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "maxCyclesPerDay" INTEGER NOT NULL DEFAULT 50,
    "maxDurationMsPerDay" INTEGER NOT NULL DEFAULT 300000,
    "usedLlmTokens" INTEGER NOT NULL DEFAULT 0,
    "usedLlmCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "usedCycles" INTEGER NOT NULL DEFAULT 0,
    "usedDurationMs" INTEGER NOT NULL DEFAULT 0,
    "lastResetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "priority" INTEGER NOT NULL DEFAULT 50,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "resource_budgets_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "resource_budgets_businessId_agentRole_key" ON "resource_budgets"("businessId","agentRole")`,
  `CREATE INDEX IF NOT EXISTS "resource_budgets_businessId_isActive_idx" ON "resource_budgets"("businessId","isActive")`,

  // E2 — Resource Negotiation
  `CREATE TABLE IF NOT EXISTS "resource_negotiations" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "businessId" TEXT NOT NULL,
    "requestorRole" TEXT NOT NULL,
    "donorRole" TEXT,
    "resourceType" TEXT NOT NULL,
    "amountRequested" INTEGER NOT NULL,
    "amountGranted" INTEGER NOT NULL DEFAULT 0,
    "reason" TEXT NOT NULL,
    "objectiveId" TEXT,
    "status" "NegotiationStatus" NOT NULL DEFAULT 'PENDING',
    "decidedBy" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "resource_negotiations_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "resource_negotiations_businessId_status_idx" ON "resource_negotiations"("businessId","status")`,
  `CREATE INDEX IF NOT EXISTS "resource_negotiations_requestorRole_idx" ON "resource_negotiations"("requestorRole")`,

  // F1 — Prune Candidates
  `CREATE TABLE IF NOT EXISTS "prune_candidates" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "businessId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityTitle" TEXT NOT NULL,
    "reason" "PruneReason" NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "metrics" JSONB NOT NULL,
    "status" "PruneStatus" NOT NULL DEFAULT 'FLAGGED',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "prune_candidates_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "prune_candidates_entityType_entityId_key" ON "prune_candidates"("entityType","entityId")`,
  `CREATE INDEX IF NOT EXISTS "prune_candidates_businessId_status_idx" ON "prune_candidates"("businessId","status")`,
  `CREATE INDEX IF NOT EXISTS "prune_candidates_status_score_idx" ON "prune_candidates"("status","score")`,

  // F2 — Propagation Events
  `CREATE TABLE IF NOT EXISTS "propagation_events" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "businessId" TEXT NOT NULL,
    "sourceRole" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetRoles" TEXT[] DEFAULT '{}',
    "propagationType" "PropagationType" NOT NULL,
    "outcomeId" TEXT,
    "successMetric" TEXT NOT NULL,
    "improvementPct" DOUBLE PRECISION NOT NULL,
    "status" "PropagationStatus" NOT NULL DEFAULT 'PROPOSED',
    "appliedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "revertedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "propagation_events_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "propagation_events_businessId_status_idx" ON "propagation_events"("businessId","status")`,
  `CREATE INDEX IF NOT EXISTS "propagation_events_sourceRole_idx" ON "propagation_events"("sourceRole")`,

  // G1 — Service Outcomes
  `CREATE TABLE IF NOT EXISTS "service_outcomes" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "businessId" TEXT NOT NULL,
    "serviceCode" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "metricName" TEXT NOT NULL,
    "metricUnit" TEXT NOT NULL,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "currentValue" DOUBLE PRECISION,
    "collectionMethod" TEXT NOT NULL,
    "collectionFrequency" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "service_outcomes_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "service_outcomes_businessId_serviceCode_key" ON "service_outcomes"("businessId","serviceCode")`,
  `CREATE INDEX IF NOT EXISTS "service_outcomes_businessId_isActive_idx" ON "service_outcomes"("businessId","isActive")`,

  // G1 — Outcome Measurements
  `CREATE TABLE IF NOT EXISTS "outcome_measurements" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "outcomeId" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,
    "notes" TEXT,
    "tenantId" TEXT,
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "outcome_measurements_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "outcome_measurements_outcomeId_fkey" FOREIGN KEY ("outcomeId") REFERENCES "service_outcomes"("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "outcome_measurements_outcomeId_measuredAt_idx" ON "outcome_measurements"("outcomeId","measuredAt")`,

  // G2 — Wild Cards
  `CREATE TABLE IF NOT EXISTS "wild_cards" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "businessId" TEXT NOT NULL,
    "targetRole" TEXT NOT NULL,
    "weekOf" TIMESTAMP(3) NOT NULL,
    "prompt" TEXT NOT NULL,
    "promptType" "WildCardType" NOT NULL,
    "response" TEXT,
    "respondedAt" TIMESTAMP(3),
    "cogReview" TEXT,
    "cogScore" INTEGER,
    "promotedToIdea" BOOLEAN NOT NULL DEFAULT false,
    "brainstormIdeaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "wild_cards_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "wild_cards_targetRole_weekOf_key" ON "wild_cards"("targetRole","weekOf")`,
  `CREATE INDEX IF NOT EXISTS "wild_cards_businessId_weekOf_idx" ON "wild_cards"("businessId","weekOf")`,

  // G3 — Rituals
  `CREATE TABLE IF NOT EXISTS "rituals" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "businessId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ritualType" "RitualType" NOT NULL,
    "cronExpression" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Bucharest',
    "templatePrompt" TEXT NOT NULL,
    "participantRoles" TEXT[] DEFAULT '{}',
    "outputTarget" TEXT NOT NULL,
    "lastRunAt" TIMESTAMP(3),
    "lastRunStatus" TEXT,
    "runCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "rituals_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "rituals_businessId_code_key" ON "rituals"("businessId","code")`,
  `CREATE INDEX IF NOT EXISTS "rituals_isActive_ritualType_idx" ON "rituals"("isActive","ritualType")`,

  // G4 — Adaptation Metrics
  `CREATE TABLE IF NOT EXISTS "adaptation_metrics" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "businessId" TEXT NOT NULL,
    "metricCode" TEXT NOT NULL,
    "metricName" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "windowDays" INTEGER NOT NULL DEFAULT 7,
    "breakdown" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "adaptation_metrics_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "adaptation_metrics_businessId_metricCode_measuredAt_idx" ON "adaptation_metrics"("businessId","metricCode","measuredAt")`,
  `CREATE INDEX IF NOT EXISTS "adaptation_metrics_measuredAt_idx" ON "adaptation_metrics"("measuredAt")`,
]

async function run() {
  const client = await pool.connect()
  try {
    let ok = 0, skip = 0
    for (const sql of statements) {
      try {
        await client.query(sql)
        ok++
      } catch (err) {
        if (err.code === "42710" || err.code === "42P07") {
          skip++ // already exists
        } else {
          console.error(`FAILED: ${sql.slice(0, 80)}...`)
          console.error(err.message)
          throw err
        }
      }
    }
    console.log(`Migration complete: ${ok} applied, ${skip} skipped (already exist)`)
  } finally {
    client.release()
    await pool.end()
  }
}

run().catch((err) => { console.error(err); process.exit(1) })
