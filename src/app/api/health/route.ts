import { NextResponse } from "next/server"
import { auditSecrets } from "@/lib/security"
import { prisma } from "@/lib/prisma"
import { checkAnthropicHealth } from "@/lib/ai/degraded-mode"

export const dynamic = "force-dynamic"

type CheckStatus = "ok" | "degraded" | "down"

interface CheckResult {
  status: CheckStatus
  latencyMs?: number
  error?: string
}

async function checkDatabase(): Promise<CheckResult> {
  const start = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    return { status: "ok", latencyMs: Date.now() - start }
  } catch (err) {
    return {
      status: "down",
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : "Unknown error",
    }
  }
}

async function checkRedis(): Promise<CheckResult> {
  const url = process.env.UPSTASH_REDIS_URL
  const token = process.env.UPSTASH_REDIS_TOKEN

  if (!url || !token) {
    return { status: "degraded", error: "UPSTASH_REDIS_URL or UPSTASH_REDIS_TOKEN not configured" }
  }

  const start = Date.now()
  try {
    // Use the Upstash REST API directly to avoid importing the full client
    const res = await fetch(`${url}/ping`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) {
      return { status: "down", latencyMs: Date.now() - start, error: `HTTP ${res.status}` }
    }
    return { status: "ok", latencyMs: Date.now() - start }
  } catch (err) {
    return {
      status: "down",
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : "Unknown error",
    }
  }
}

async function checkClaude(): Promise<CheckResult> {
  const start = Date.now()
  try {
    const health = await checkAnthropicHealth()
    return {
      status: health.available ? "ok" : "down",
      latencyMs: Date.now() - start,
      error: health.available ? undefined : `${health.consecutiveFailures} consecutive failures`,
    }
  } catch (err) {
    return {
      status: "down",
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : "Unknown error",
    }
  }
}

function deriveOverallStatus(checks: Record<string, CheckResult>): "healthy" | "degraded" | "down" {
  const statuses = Object.values(checks).map((c) => c.status)

  // If DB is down, everything is down
  if (checks.db.status === "down") return "down"

  // If Claude is down, we are degraded (degraded mode exists)
  // If Redis is down, we are degraded (fallback in-memory rate limiter)
  if (statuses.some((s) => s === "down")) return "degraded"

  // If any check is degraded (e.g., missing config)
  if (statuses.some((s) => s === "degraded")) return "degraded"

  return "healthy"
}

export async function GET() {
  const secrets = auditSecrets()

  const [db, redis, claude] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkClaude(),
  ])

  const secretsCheck: CheckResult = {
    status: secrets.ok ? "ok" : "degraded",
    error: secrets.ok ? undefined : `${secrets.missing.length} required secrets missing`,
  }

  const checks = { db, redis, claude, secrets: secretsCheck }
  const status = deriveOverallStatus(checks)

  return NextResponse.json({
    status,
    checks,
    timestamp: new Date().toISOString(),
    service: "jobgrade-app",
  })
}
