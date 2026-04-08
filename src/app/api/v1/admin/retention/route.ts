import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  checkRetention,
  executeRetention,
  checkDatabaseCapacity,
  getRetentionPolicy,
} from "@/lib/db/retention-policy"

function checkAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

/**
 * GET /api/v1/admin/retention
 *
 * Dry-run report: what would be purged + capacity status.
 * Query params:
 *   ?include=capacity  — also include database capacity report
 *   ?include=policy    — also include the raw retention policy rules
 */
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const include = req.nextUrl.searchParams.get("include") ?? ""
    const parts = include.split(",").map((s) => s.trim())

    const retentionReport = await checkRetention(prisma)

    const response: Record<string, unknown> = {
      retention: retentionReport,
    }

    if (parts.includes("capacity")) {
      response.capacity = await checkDatabaseCapacity(prisma)
    }

    if (parts.includes("policy")) {
      response.policy = getRetentionPolicy()
    }

    return NextResponse.json(response)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error"
    console.error("[RETENTION] GET error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * POST /api/v1/admin/retention
 *
 * Execute retention purge.
 * Query params:
 *   ?dryRun=true  — simulate without actually deleting (default: true for safety)
 */
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const dryRunParam = req.nextUrl.searchParams.get("dryRun")
    // Default to dry run for safety — must explicitly pass dryRun=false to execute
    const dryRun = dryRunParam !== "false"

    console.log(`[RETENTION] Executing retention ${dryRun ? "(DRY RUN)" : "(LIVE)"}`)

    const result = await executeRetention(prisma, dryRun)

    // If live run produced capacity warnings, log them
    if (!dryRun) {
      const capacity = await checkDatabaseCapacity(prisma)
      if (capacity.alertLevel !== "OK") {
        console.warn(`[RETENTION] Capacity alert: ${capacity.alertLevel}`, capacity.warnings)
      }
    }

    return NextResponse.json(result)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error"
    console.error("[RETENTION] POST error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
