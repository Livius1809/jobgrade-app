/**
 * POST /api/v1/agents/adjust-config
 *
 * Permite COG (prin task executor) să ajusteze parametri operaționali.
 * Allowlist strict — COG NU poate opri executorul sau modifica setări critice.
 *
 * Body: { key, value, reason, requestedBy }
 * Auth: CRON_SECRET (apelat doar de executor/cron, nu de UI)
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

// Chei pe care COG le poate modifica
const COG_ALLOWED_KEYS = new Set([
  "SIGNAL_FILTER_LEVEL",      // critical/focused/broad/full
  "EXECUTOR_BATCH_SIZE",      // câte task-uri per ciclu (1-10)
  "PROACTIVE_CYCLE_INTERVAL", // interval ciclu proactiv (minute)
])

// Chei INTERZISE — doar Owner
const OWNER_ONLY_KEYS = new Set([
  "EXECUTOR_ENABLED",         // on/off executor — doar Owner
  "MAINTENANCE_MODE",         // mod mentenanță — doar Owner
])

// Validări per cheie
const VALUE_VALIDATORS: Record<string, (v: string) => boolean> = {
  SIGNAL_FILTER_LEVEL: (v) => ["critical", "focused", "broad", "full"].includes(v),
  EXECUTOR_BATCH_SIZE: (v) => { const n = parseInt(v); return !isNaN(n) && n >= 1 && n <= 10; },
  PROACTIVE_CYCLE_INTERVAL: (v) => { const n = parseInt(v); return !isNaN(n) && n >= 5 && n <= 120; },
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { key, value, reason, requestedBy } = await request.json()

  if (!key || value === undefined) {
    return NextResponse.json({ error: "key și value sunt obligatorii" }, { status: 400 })
  }

  if (OWNER_ONLY_KEYS.has(key)) {
    return NextResponse.json(
      { error: `Cheia "${key}" poate fi modificată doar de Owner prin dashboard.` },
      { status: 403 },
    )
  }

  if (!COG_ALLOWED_KEYS.has(key)) {
    return NextResponse.json(
      { error: `Cheia "${key}" nu este în allowlist. Chei permise: ${[...COG_ALLOWED_KEYS].join(", ")}` },
      { status: 403 },
    )
  }

  const validator = VALUE_VALIDATORS[key]
  if (validator && !validator(String(value))) {
    return NextResponse.json(
      { error: `Valoare invalidă pentru "${key}": "${value}"` },
      { status: 400 },
    )
  }

  const config = await prisma.systemConfig.upsert({
    where: { key },
    update: { value: String(value) },
    create: { key, value: String(value) },
  })

  // Log adjustment for audit trail
  console.log(`[CONFIG-ADJUST] ${key}=${value} | by=${requestedBy || "COG"} | reason=${reason || "n/a"}`)

  return NextResponse.json({
    ok: true,
    key: config.key,
    value: config.value,
    adjustedBy: requestedBy || "COG",
    timestamp: new Date().toISOString(),
  })
}
