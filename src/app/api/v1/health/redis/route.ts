/**
 * Redis Health Check — GET /api/v1/health/redis
 *
 * Verificare conectivitate Upstash Redis.
 * Public (fara autentificare) — health checks trebuie accesibile.
 * Returneaza 200 chiar si cand Redis e indisponibil (app-ul merge cu fallback in-memory).
 */

import { NextResponse } from "next/server"
import { Redis } from "@upstash/redis"

export const dynamic = "force-dynamic"

export async function GET() {
  const envVarsPresent = {
    url: !!process.env.UPSTASH_REDIS_URL,
    token: !!process.env.UPSTASH_REDIS_TOKEN,
  }

  // Daca variabilele de mediu lipsesc, raportam degraded (nu down)
  if (!envVarsPresent.url || !envVarsPresent.token) {
    return NextResponse.json({
      status: "degraded" as const,
      latencyMs: 0,
      envVarsPresent,
      error: "UPSTASH_REDIS_URL sau UPSTASH_REDIS_TOKEN nu sunt configurate",
    })
  }

  const start = Date.now()

  try {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_URL!,
      token: process.env.UPSTASH_REDIS_TOKEN!,
    })

    const result = await redis.ping()
    const latencyMs = Date.now() - start

    if (result === "PONG") {
      return NextResponse.json({
        status: "healthy" as const,
        latencyMs,
        envVarsPresent,
      })
    }

    // PING a raspuns dar nu cu PONG — ceva e ciudat
    return NextResponse.json({
      status: "degraded" as const,
      latencyMs,
      envVarsPresent,
      error: `PING a returnat: ${String(result)}`,
    })
  } catch (err) {
    const latencyMs = Date.now() - start
    return NextResponse.json({
      status: "down" as const,
      latencyMs,
      envVarsPresent,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}
