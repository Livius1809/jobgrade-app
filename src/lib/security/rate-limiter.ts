/**
 * Rate Limiter (VUL-038)
 *
 * Upstash Redis rate limiting cu fallback in-memory.
 * Diferențiat per endpoint type:
 *   - Chat (Claude calls): 10 req/min per user
 *   - B2C API: 30 req/min per user
 *   - B2B API: 60 req/min per user
 *   - General API: 100 req/min per IP
 */

import { Redis } from "@upstash/redis"

// ── Redis client (lazy init) ──────────────────────────────────────────────────

let redis: Redis | null = null

function getRedis(): Redis | null {
  if (redis) return redis
  const url = process.env.UPSTASH_REDIS_URL
  const token = process.env.UPSTASH_REDIS_TOKEN
  if (url && token) {
    try {
      redis = new Redis({ url, token })
      return redis
    } catch {
      return null
    }
  }
  return null
}

// ── In-memory fallback ────────────────────────────────────────────────────────

const memoryStore = new Map<string, { count: number; resetAt: number }>()

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of memoryStore) {
    if (now > entry.resetAt) memoryStore.delete(key)
  }
}, 5 * 60_000)

// ── Rate limit configs ────────────────────────────────────────────────────────

export type RateLimitTier = "CHAT" | "B2C_API" | "B2B_API" | "GENERAL"

const LIMITS: Record<RateLimitTier, { max: number; windowSeconds: number }> = {
  CHAT: { max: 10, windowSeconds: 60 },
  B2C_API: { max: 30, windowSeconds: 60 },
  B2B_API: { max: 60, windowSeconds: 60 },
  GENERAL: { max: 100, windowSeconds: 60 },
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetInSeconds: number
}

// ── Core rate limit check ─────────────────────────────────────────────────────

export async function checkRateLimit(
  identifier: string,
  tier: RateLimitTier
): Promise<RateLimitResult> {
  const config = LIMITS[tier]
  const key = `rl:${tier}:${identifier}`

  const r = getRedis()
  if (r) {
    return checkRedisRateLimit(r, key, config.max, config.windowSeconds)
  }
  return checkMemoryRateLimit(key, config.max, config.windowSeconds)
}

// ── Redis implementation ──────────────────────────────────────────────────────

async function checkRedisRateLimit(
  r: Redis,
  key: string,
  max: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  try {
    const pipe = r.pipeline()
    pipe.incr(key)
    pipe.ttl(key)
    const results = await pipe.exec()

    const count = results[0] as number
    const ttl = results[1] as number

    // First request in window — set expiry
    if (count === 1 || ttl === -1) {
      await r.expire(key, windowSeconds)
    }

    return {
      allowed: count <= max,
      remaining: Math.max(0, max - count),
      resetInSeconds: ttl > 0 ? ttl : windowSeconds,
    }
  } catch {
    // Redis error — fallback to memory
    return checkMemoryRateLimit(key, max, windowSeconds)
  }
}

// ── Memory fallback ───────────────────────────────────────────────────────────

function checkMemoryRateLimit(
  key: string,
  max: number,
  windowSeconds: number
): RateLimitResult {
  const now = Date.now()
  const windowMs = windowSeconds * 1000
  const entry = memoryStore.get(key)

  if (!entry || now > entry.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: max - 1, resetInSeconds: windowSeconds }
  }

  entry.count++

  return {
    allowed: entry.count <= max,
    remaining: Math.max(0, max - entry.count),
    resetInSeconds: Math.ceil((entry.resetAt - now) / 1000),
  }
}

// ── Helper: add rate limit headers to response ────────────────────────────────

export function rateLimitHeaders(result: RateLimitResult, tier: RateLimitTier): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(LIMITS[tier].max),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.resetInSeconds),
  }
}
