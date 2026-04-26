/**
 * GET /api/v1/health/heartbeat
 *
 * Heartbeat endpoint — verifică dacă organismul e viu:
 * 1. DB conectat
 * 2. Ultimul task creat (dacă e mai vechi de 24h → alertă)
 * 3. Ultimul KB entry creat
 * 4. n8n accesibil (opțional)
 *
 * Apelat de:
 * - Uptime monitor extern (UptimeRobot, Better Uptime, etc.)
 * - n8n safety workflow
 * - Owner Dashboard (puls vizual)
 *
 * Returnează:
 * - status: "alive" | "degraded" | "critical"
 * - checks: detalii per componentă
 */

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

const STALE_HOURS_WARN = 24    // galben: nicio activitate 24h
const STALE_HOURS_CRITICAL = 72 // roșu: nicio activitate 72h

export async function GET() {
  const checks: Record<string, { ok: boolean; detail: string }> = {}
  let overallStatus: "alive" | "degraded" | "critical" = "alive"

  // 1. DB
  try {
    const p = prisma as any
    await p.$queryRaw`SELECT 1`
    checks.database = { ok: true, detail: "connected" }
  } catch (e: any) {
    checks.database = { ok: false, detail: e.message }
    overallStatus = "critical"
  }

  // 2. Ultimul task creat
  try {
    const p = prisma as any
    const lastTask = await p.agentTask.findFirst({
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, assignedTo: true, status: true },
    })
    if (lastTask) {
      const hoursAgo = Math.round((Date.now() - new Date(lastTask.createdAt).getTime()) / 3600000)
      const stale = hoursAgo > STALE_HOURS_CRITICAL ? "critical" : hoursAgo > STALE_HOURS_WARN ? "stale" : "recent"
      checks.lastTask = { ok: stale === "recent", detail: `${hoursAgo}h ago (${lastTask.assignedTo}, ${lastTask.status})` }
      if (stale === "critical") overallStatus = "critical"
      else if (stale === "stale" && overallStatus === "alive") overallStatus = "degraded"
    } else {
      checks.lastTask = { ok: false, detail: "no tasks ever created" }
      overallStatus = "degraded"
    }
  } catch { checks.lastTask = { ok: false, detail: "query failed" } }

  // 3. Ultimul KB entry
  try {
    const p = prisma as any
    const lastKB = await p.kBEntry.findFirst({
      where: { status: "PERMANENT" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, agentRole: true },
    })
    if (lastKB) {
      const hoursAgo = Math.round((Date.now() - new Date(lastKB.createdAt).getTime()) / 3600000)
      checks.lastKBEntry = { ok: hoursAgo < STALE_HOURS_WARN, detail: `${hoursAgo}h ago (${lastKB.agentRole})` }
    }
  } catch { checks.lastKBEntry = { ok: false, detail: "query failed" } }

  // 4. Agent count
  try {
    const p = prisma as any
    const count = await p.agentDefinition.count({ where: { isActive: true } })
    checks.activeAgents = { ok: count > 0, detail: `${count} agents` }
  } catch { checks.activeAgents = { ok: false, detail: "query failed" } }

  // 5. KB total
  try {
    const p = prisma as any
    const count = await p.kBEntry.count({ where: { status: "PERMANENT" } })
    checks.kbTotal = { ok: count > 100, detail: `${count} entries` }
  } catch { checks.kbTotal = { ok: false, detail: "query failed" } }

  // 6. Escalări vechi (nerezolvate > 48h)
  try {
    const p = prisma as any
    const oldEscalations = await p.escalation.count({
      where: {
        status: "OPEN",
        createdAt: { lt: new Date(Date.now() - 48 * 3600000) },
      },
    }).catch(() => 0)
    checks.staleEscalations = { ok: oldEscalations === 0, detail: `${oldEscalations} older than 48h` }
    if (oldEscalations > 3 && overallStatus === "alive") overallStatus = "degraded"
  } catch {}

  // Verificare externă servicii dependente
  // 6b. Anthropic API
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (apiKey) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 1, messages: [{ role: "user", content: "ping" }] }),
        signal: controller.signal,
      }).catch(() => null)
      clearTimeout(timeout)
      checks.anthropicApi = { ok: res !== null && res.status < 500, detail: res ? `status ${res.status}` : "unreachable" }
      if (!checks.anthropicApi.ok && overallStatus === "alive") overallStatus = "degraded"
    }
  } catch { checks.anthropicApi = { ok: false, detail: "check failed" } }

  return NextResponse.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    checks,
    // UptimeRobot-friendly: dacă status != alive, HTTP 503 → alertă
  }, {
    status: overallStatus === "critical" ? 503 : 200,
  })
}
