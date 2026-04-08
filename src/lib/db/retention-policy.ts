/**
 * BUILD-007: Database Retention Policy & Purge Mechanism
 * GDPR-aligned retention with cold storage archiving at 12 months.
 * Alert at 80% capacity.
 *
 * No PII in logs — only counts and model names.
 */

import type { PrismaClient } from "@/generated/prisma"

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────

export type RetentionAction = "DELETE" | "ARCHIVE" | "ANONYMIZE" | "SUMMARIZE"

export interface RetentionRule {
  /** Prisma model name (PascalCase) */
  model: string
  /** Mapped table name in the database */
  table: string
  /** Number of days after which the action applies */
  retentionDays: number
  /** What to do at expiry */
  action: RetentionAction
  /** Description for audit trail */
  description: string
  /** SQL WHERE clause fragment — references the table alias "t" */
  filterSQL: string
  /** Date column used for age calculation */
  dateColumn: string
}

export interface RetentionRuleReport {
  model: string
  action: RetentionAction
  retentionDays: number
  affectedCount: number
}

export interface RetentionReport {
  generatedAt: string
  rules: RetentionRuleReport[]
  totalAffected: number
  b2cHardDeletes: number
}

export interface RetentionResult extends RetentionReport {
  dryRun: boolean
  executed: RetentionRuleExecution[]
  b2cDeletionLog: B2CHardDeleteLog[]
}

export interface RetentionRuleExecution {
  model: string
  action: RetentionAction
  count: number
  archivedCount: number
  durationMs: number
}

export interface B2CHardDeleteLog {
  /** No PII — just the internal ID */
  userId: string
  deletedCounts: Record<string, number>
}

export interface CapacityReport {
  generatedAt: string
  tables: TableCapacity[]
  totalRows: number
  alertLevel: "OK" | "WARNING" | "CRITICAL"
  warnings: string[]
}

export interface TableCapacity {
  table: string
  rowCount: number
  estimatedSizeBytes: number
  estimatedSizeMB: number
}

// ─────────────────────────────────────────
// RETENTION RULES
// ─────────────────────────────────────────

const RETENTION_RULES: RetentionRule[] = [
  {
    model: "ConversationMessage",
    table: "conversation_messages",
    retentionDays: 365,
    action: "ARCHIVE",
    description: "Conversation messages older than 12 months",
    filterSQL: `"createdAt" < NOW() - INTERVAL '365 days'`,
    dateColumn: "createdAt",
  },
  {
    model: "B2CJournalEntry",
    table: "b2c_journal_entries",
    retentionDays: 730,
    action: "ARCHIVE",
    description: "B2C journal entries older than 24 months",
    filterSQL: `"createdAt" < NOW() - INTERVAL '730 days'`,
    dateColumn: "createdAt",
  },
  {
    model: "B2CEvolutionEntry",
    table: "b2c_evolution_entries",
    retentionDays: 730,
    action: "SUMMARIZE",
    description: "B2C evolution entries older than 24 months — summarize then archive",
    filterSQL: `"createdAt" < NOW() - INTERVAL '730 days'`,
    dateColumn: "createdAt",
  },
  {
    model: "KBBuffer",
    table: "kb_buffers",
    retentionDays: 180,
    action: "DELETE",
    description: "KB buffer entries older than 6 months (not promoted)",
    filterSQL: `"createdAt" < NOW() - INTERVAL '180 days' AND "status" != 'APPROVED'`,
    dateColumn: "createdAt",
  },
  {
    model: "InteractionLog",
    table: "interaction_logs",
    retentionDays: 180,
    action: "DELETE",
    description: "Interaction logs older than 6 months",
    filterSQL: `"createdAt" < NOW() - INTERVAL '180 days'`,
    dateColumn: "createdAt",
  },
  {
    model: "CycleLog",
    table: "cycle_logs",
    retentionDays: 90,
    action: "DELETE",
    description: "Cycle logs older than 3 months",
    filterSQL: `"createdAt" < NOW() - INTERVAL '90 days'`,
    dateColumn: "createdAt",
  },
  {
    model: "AgentMetric",
    table: "agent_metrics",
    retentionDays: 365,
    action: "ARCHIVE",
    description: "Agent metrics older than 12 months",
    filterSQL: `"createdAt" < NOW() - INTERVAL '365 days'`,
    dateColumn: "createdAt",
  },
  {
    model: "Escalation",
    table: "escalations",
    retentionDays: 365,
    action: "ARCHIVE",
    description: "Resolved escalations older than 12 months",
    filterSQL: `"resolvedAt" IS NOT NULL AND "resolvedAt" < NOW() - INTERVAL '365 days'`,
    dateColumn: "resolvedAt",
  },
  {
    model: "Lead",
    table: "leads",
    retentionDays: 540,
    action: "ANONYMIZE",
    description: "Lost/inactive leads older than 18 months",
    filterSQL: `"stage" IN ('CLOSED_LOST') AND "updatedAt" < NOW() - INTERVAL '540 days'`,
    dateColumn: "updatedAt",
  },
  {
    model: "DisfunctionEvent",
    table: "disfunction_events",
    retentionDays: 180,
    action: "ARCHIVE",
    description: "Resolved disfunction events older than 6 months",
    filterSQL: `"status" = 'RESOLVED' AND "resolvedAt" IS NOT NULL AND "resolvedAt" < NOW() - INTERVAL '180 days'`,
    dateColumn: "resolvedAt",
  },
]

export function getRetentionPolicy(): RetentionRule[] {
  return [...RETENTION_RULES]
}

// ─────────────────────────────────────────
// DRY RUN / CHECK
// ─────────────────────────────────────────

export async function checkRetention(prisma: PrismaClient): Promise<RetentionReport> {
  const rules: RetentionRuleReport[] = []
  let totalAffected = 0

  for (const rule of RETENTION_RULES) {
    const countResult = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
      `SELECT COUNT(*) as count FROM "${rule.table}" WHERE ${rule.filterSQL}`
    )
    const count = Number(countResult[0]?.count ?? 0)
    rules.push({
      model: rule.model,
      action: rule.action,
      retentionDays: rule.retentionDays,
      affectedCount: count,
    })
    totalAffected += count
  }

  // Check B2C hard deletes
  const b2cResult = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
    `SELECT COUNT(*) as count FROM "b2c_users" WHERE "deleteScheduledFor" IS NOT NULL AND "deleteScheduledFor" < NOW()`
  )
  const b2cHardDeletes = Number(b2cResult[0]?.count ?? 0)

  return {
    generatedAt: new Date().toISOString(),
    rules,
    totalAffected,
    b2cHardDeletes,
  }
}

// ─────────────────────────────────────────
// EXECUTE RETENTION
// ─────────────────────────────────────────

export async function executeRetention(
  prisma: PrismaClient,
  dryRun = false
): Promise<RetentionResult> {
  const report = await checkRetention(prisma)
  const executed: RetentionRuleExecution[] = []
  const b2cDeletionLog: B2CHardDeleteLog[] = []

  if (!dryRun) {
    // Process each retention rule
    for (const rule of RETENTION_RULES) {
      const start = Date.now()
      let count = 0
      let archivedCount = 0

      switch (rule.action) {
        case "ARCHIVE":
          archivedCount = await archiveRecords(prisma, rule)
          count = archivedCount
          break

        case "SUMMARIZE":
          archivedCount = await summarizeAndArchive(prisma, rule)
          count = archivedCount
          break

        case "DELETE":
          count = await deleteRecords(prisma, rule)
          break

        case "ANONYMIZE":
          count = await anonymizeRecords(prisma, rule)
          break
      }

      executed.push({
        model: rule.model,
        action: rule.action,
        count,
        archivedCount,
        durationMs: Date.now() - start,
      })

      console.log(
        `[RETENTION] ${rule.action} ${rule.model}: ${count} records (${Date.now() - start}ms)`
      )
    }

    // Process B2C hard deletes (GDPR Art.17)
    const b2cLogs = await executeB2CHardDeletes(prisma)
    b2cDeletionLog.push(...b2cLogs)
  }

  return {
    ...report,
    dryRun,
    executed,
    b2cDeletionLog,
  }
}

// ─────────────────────────────────────────
// ARCHIVE — JSON export to archive table
// ─────────────────────────────────────────

async function ensureArchiveTable(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "_archived_data" (
      "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "model" TEXT NOT NULL,
      "recordId" TEXT NOT NULL,
      "data" JSONB NOT NULL,
      "archivedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "retentionExpiry" TIMESTAMPTZ,
      "summary" JSONB
    )
  `)
  // Index for lookups by model and record
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "idx_archived_data_model" ON "_archived_data" ("model")
  `)
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "idx_archived_data_record" ON "_archived_data" ("model", "recordId")
  `)
}

async function archiveRecords(prisma: PrismaClient, rule: RetentionRule): Promise<number> {
  await ensureArchiveTable(prisma)

  // Batch processing — 500 at a time to avoid memory issues
  const BATCH_SIZE = 500
  let totalArchived = 0

  while (true) {
    const records = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT "id" FROM "${rule.table}" WHERE ${rule.filterSQL} LIMIT ${BATCH_SIZE}`
    )

    if (records.length === 0) break

    const ids = records.map((r) => r.id)
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ")

    // Copy to archive
    await prisma.$executeRawUnsafe(
      `INSERT INTO "_archived_data" ("id", "model", "recordId", "data", "archivedAt", "retentionExpiry")
       SELECT gen_random_uuid()::text, '${rule.model}', "id", to_jsonb(t.*), NOW(), NOW() + INTERVAL '5 years'
       FROM "${rule.table}" t
       WHERE t."id" IN (${placeholders})`,
      ...ids
    )

    // Delete originals
    await prisma.$executeRawUnsafe(
      `DELETE FROM "${rule.table}" WHERE "id" IN (${placeholders})`,
      ...ids
    )

    totalArchived += records.length

    if (records.length < BATCH_SIZE) break
  }

  return totalArchived
}

// ─────────────────────────────────────────
// SUMMARIZE — aggregate stats then archive
// ─────────────────────────────────────────

async function summarizeAndArchive(prisma: PrismaClient, rule: RetentionRule): Promise<number> {
  await ensureArchiveTable(prisma)

  // Generate per-user summary for B2CEvolutionEntry
  if (rule.model === "B2CEvolutionEntry") {
    const summaries = await prisma.$queryRawUnsafe<
      Array<{
        userId: string
        count: bigint
        minDate: Date
        maxDate: Date
        cards: string
        types: string
      }>
    >(
      `SELECT "userId",
              COUNT(*) as count,
              MIN("createdAt") as "minDate",
              MAX("createdAt") as "maxDate",
              STRING_AGG(DISTINCT "card", ', ') as cards,
              STRING_AGG(DISTINCT "type", ', ') as types
       FROM "${rule.table}"
       WHERE ${rule.filterSQL}
       GROUP BY "userId"`
    )

    let totalCount = 0
    for (const s of summaries) {
      const recordCount = Number(s.count)
      totalCount += recordCount

      // Store summary in archive
      await prisma.$executeRawUnsafe(
        `INSERT INTO "_archived_data" ("id", "model", "recordId", "data", "archivedAt", "retentionExpiry", "summary")
         VALUES (gen_random_uuid()::text, $1, $2, '{}', NOW(), NOW() + INTERVAL '5 years', $3::jsonb)`,
        `${rule.model}_SUMMARY`,
        s.userId,
        JSON.stringify({
          userId: s.userId,
          totalEntries: recordCount,
          dateRange: { from: s.minDate, to: s.maxDate },
          cards: s.cards,
          types: s.types,
          summarizedAt: new Date().toISOString(),
        })
      )
    }

    // Now archive individual records
    if (totalCount > 0) {
      await archiveRecords(prisma, rule)
    }

    return totalCount
  }

  // Fallback: plain archive for other models
  return archiveRecords(prisma, rule)
}

// ─────────────────────────────────────────
// DELETE — straight removal
// ─────────────────────────────────────────

async function deleteRecords(prisma: PrismaClient, rule: RetentionRule): Promise<number> {
  const BATCH_SIZE = 1000
  let totalDeleted = 0

  while (true) {
    const result = await prisma.$executeRawUnsafe(
      `DELETE FROM "${rule.table}" WHERE "id" IN (
        SELECT "id" FROM "${rule.table}" WHERE ${rule.filterSQL} LIMIT ${BATCH_SIZE}
      )`
    )

    totalDeleted += result
    if (result < BATCH_SIZE) break
  }

  return totalDeleted
}

// ─────────────────────────────────────────
// ANONYMIZE — strip PII, keep structure
// ─────────────────────────────────────────

async function anonymizeRecords(prisma: PrismaClient, rule: RetentionRule): Promise<number> {
  if (rule.model === "Lead") {
    const result = await prisma.$executeRawUnsafe(
      `UPDATE "leads" SET
        "companyName" = 'ANONYMIZED',
        "contactName" = 'ANONYMIZED',
        "contactEmail" = CONCAT('anon-', "id", '@redacted.local'),
        "contactRole" = NULL,
        "contactPhone" = NULL,
        "website" = NULL,
        "bantNotes" = NULL,
        "notes" = NULL
       WHERE ${rule.filterSQL}`
    )
    return result
  }
  return 0
}

// ─────────────────────────────────────────
// B2C HARD DELETE — GDPR Art.17
// ─────────────────────────────────────────

/**
 * When deleteScheduledFor has passed, delete ALL related data for the B2C user.
 * Log the deletion without PII (only counts per model).
 */
async function executeB2CHardDeletes(prisma: PrismaClient): Promise<B2CHardDeleteLog[]> {
  const usersToDelete = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT "id" FROM "b2c_users"
     WHERE "deleteScheduledFor" IS NOT NULL
       AND "deleteScheduledFor" < NOW()`
  )

  const logs: B2CHardDeleteLog[] = []

  for (const user of usersToDelete) {
    const deletedCounts: Record<string, number> = {}

    // Order matters — delete children first (respecting FK constraints)
    // Most of these have onDelete: Cascade on the B2CUser FK,
    // but we delete explicitly to count and log properly.

    const relatedTables: Array<{ model: string; table: string; fk: string }> = [
      { model: "B2CJournalEntry", table: "b2c_journal_entries", fk: "userId" },
      { model: "B2CEvolutionEntry", table: "b2c_evolution_entries", fk: "userId" },
      { model: "B2CTestResult", table: "b2c_test_results", fk: "userId" },
      { model: "B2CCommunityMember", table: "b2c_community_members", fk: "userId" },
      { model: "B2CCreditTransaction", table: "b2c_credit_transactions", fk: "userId" },
      { model: "B2CCreditBalance", table: "b2c_credit_balances", fk: "userId" },
      { model: "B2CCardProgress", table: "b2c_card_progress", fk: "userId" },
      { model: "B2CProfile", table: "b2c_profiles", fk: "userId" },
    ]

    // Delete B2C sessions and their linked conversation threads/messages
    const sessions = await prisma.$queryRawUnsafe<Array<{ id: string; threadId: string | null }>>(
      `SELECT "id", "threadId" FROM "b2c_sessions" WHERE "userId" = $1`,
      user.id
    )

    // Delete conversation messages and threads linked to B2C sessions
    const threadIds = sessions.map((s) => s.threadId).filter(Boolean) as string[]
    if (threadIds.length > 0) {
      const threadPlaceholders = threadIds.map((_, i) => `$${i + 1}`).join(", ")

      const msgCount = await prisma.$executeRawUnsafe(
        `DELETE FROM "conversation_messages" WHERE "threadId" IN (${threadPlaceholders})`,
        ...threadIds
      )
      deletedCounts["ConversationMessage"] = msgCount

      const threadCount = await prisma.$executeRawUnsafe(
        `DELETE FROM "conversation_threads" WHERE "id" IN (${threadPlaceholders})`,
        ...threadIds
      )
      deletedCounts["ConversationThread"] = threadCount
    }

    // Delete sessions themselves
    const sessionCount = await prisma.$executeRawUnsafe(
      `DELETE FROM "b2c_sessions" WHERE "userId" = $1`,
      user.id
    )
    deletedCounts["B2CSession"] = sessionCount

    // Delete all related B2C data
    for (const rel of relatedTables) {
      const count = await prisma.$executeRawUnsafe(
        `DELETE FROM "${rel.table}" WHERE "${rel.fk}" = $1`,
        user.id
      )
      deletedCounts[rel.model] = count
    }

    // Finally delete the B2CUser itself
    await prisma.$executeRawUnsafe(`DELETE FROM "b2c_users" WHERE "id" = $1`, user.id)
    deletedCounts["B2CUser"] = 1

    logs.push({ userId: user.id, deletedCounts })

    console.log(
      `[RETENTION] B2C hard delete userId=${user.id}: ${JSON.stringify(deletedCounts)}`
    )
  }

  return logs
}

// ─────────────────────────────────────────
// CAPACITY MONITORING
// ─────────────────────────────────────────

const MAJOR_TABLES = [
  "conversation_messages",
  "conversation_threads",
  "interaction_logs",
  "kb_entries",
  "kb_buffers",
  "cycle_logs",
  "escalations",
  "agent_metrics",
  "disfunction_events",
  "leads",
  "b2c_users",
  "b2c_sessions",
  "b2c_journal_entries",
  "b2c_evolution_entries",
  "b2c_test_results",
  "b2c_profiles",
  "jobs",
  "users",
  "tenants",
]

/** Default row limit per table for alert purposes (configurable via env) */
const ROW_LIMIT = parseInt(process.env.DB_ROW_LIMIT_PER_TABLE ?? "1000000", 10)

export async function checkDatabaseCapacity(prisma: PrismaClient): Promise<CapacityReport> {
  const tables: TableCapacity[] = []
  const warnings: string[] = []
  let totalRows = 0

  for (const table of MAJOR_TABLES) {
    try {
      const countResult = await prisma.$queryRawUnsafe<[{ estimate: bigint }]>(
        `SELECT reltuples::bigint AS estimate FROM pg_class WHERE relname = $1`,
        table
      )
      const rowCount = Number(countResult[0]?.estimate ?? 0)

      const sizeResult = await prisma.$queryRawUnsafe<[{ size: bigint }]>(
        `SELECT pg_total_relation_size($1) AS size`,
        table
      )
      const sizeBytes = Number(sizeResult[0]?.size ?? 0)

      tables.push({
        table,
        rowCount,
        estimatedSizeBytes: sizeBytes,
        estimatedSizeMB: Math.round((sizeBytes / (1024 * 1024)) * 100) / 100,
      })

      totalRows += rowCount

      const pct = (rowCount / ROW_LIMIT) * 100
      if (pct >= 90) {
        warnings.push(`CRITICAL: ${table} at ${pct.toFixed(1)}% capacity (${rowCount} rows)`)
      } else if (pct >= 80) {
        warnings.push(`WARNING: ${table} at ${pct.toFixed(1)}% capacity (${rowCount} rows)`)
      }
    } catch {
      // Table may not exist yet — skip
      tables.push({
        table,
        rowCount: 0,
        estimatedSizeBytes: 0,
        estimatedSizeMB: 0,
      })
    }
  }

  // Also check total DB size
  try {
    const dbSizeResult = await prisma.$queryRawUnsafe<[{ size: bigint }]>(
      `SELECT pg_database_size(current_database()) AS size`
    )
    const dbSizeBytes = Number(dbSizeResult[0]?.size ?? 0)
    const dbSizeMB = dbSizeBytes / (1024 * 1024)
    const dbLimitMB = parseInt(process.env.DB_SIZE_LIMIT_MB ?? "10240", 10) // 10 GB default
    const dbPct = (dbSizeMB / dbLimitMB) * 100

    if (dbPct >= 90) {
      warnings.push(
        `CRITICAL: Database at ${dbPct.toFixed(1)}% capacity (${dbSizeMB.toFixed(0)} MB / ${dbLimitMB} MB)`
      )
    } else if (dbPct >= 80) {
      warnings.push(
        `WARNING: Database at ${dbPct.toFixed(1)}% capacity (${dbSizeMB.toFixed(0)} MB / ${dbLimitMB} MB)`
      )
    }
  } catch {
    // pg_database_size may not be available in all environments
  }

  let alertLevel: "OK" | "WARNING" | "CRITICAL" = "OK"
  if (warnings.some((w) => w.startsWith("CRITICAL"))) {
    alertLevel = "CRITICAL"
  } else if (warnings.some((w) => w.startsWith("WARNING"))) {
    alertLevel = "WARNING"
  }

  return {
    generatedAt: new Date().toISOString(),
    tables,
    totalRows,
    alertLevel,
    warnings,
  }
}
