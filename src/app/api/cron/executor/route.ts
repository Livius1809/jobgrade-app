/**
 * Executor endpoint — procesează task-urile ASSIGNED ale agenților.
 *
 * Poate fi apelat:
 * - Din cron GitHub Actions (la 2h)
 * - Manual cu x-internal-key (oricând)
 *
 * Auth: CRON_SECRET (Vercel) SAU x-internal-key
 *
 * Principii:
 * - FĂRĂ guard de ore — task-urile se execută când există
 * - Kill-switch ON by default — dacă nu e explicit "false", rulează
 * - Procesează TOATĂ coada, nu doar batch de 5
 * - Task-uri BLOCKED > 24h → retry automat (reset la ASSIGNED)
 */

import { NextRequest, NextResponse } from "next/server"
import { runIntelligentBatch } from "@/lib/agents/intelligent-executor"

export const maxDuration = 300 // 5 min

export async function GET(request: NextRequest) {
  // Auth
  const authHeader = request.headers.get("authorization")
  const internalKey = request.headers.get("x-internal-key")
  const isAuthorized = authHeader === `Bearer ${process.env.CRON_SECRET}` ||
    internalKey === process.env.INTERNAL_API_KEY
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Kill-switch: ON by default — oprește DOAR dacă e explicit "false"
  let executorEnabled = true
  const envVal = process.env.EXECUTOR_CRON_ENABLED
  if (envVal === "false" || envVal === "0") {
    executorEnabled = false
  }
  try {
    const { prisma } = await import("@/lib/prisma")
    const dbConfig = await prisma.systemConfig.findUnique({ where: { key: "EXECUTOR_CRON_ENABLED" } }).catch(() => null)
    if (dbConfig?.value === "false") executorEnabled = false
    if (dbConfig?.value === "true") executorEnabled = true
  } catch { /* DB unavailable — use env var */ }

  if (!executorEnabled) {
    return NextResponse.json({ ok: false, reason: "Kill-switch explicit false" })
  }

  try {
    const { prisma } = await import("@/lib/prisma")

    // ═══ NIVEL 0: HEALTH PROBE — verifică dacă furnizorii răspund ═══
    // Dacă API-ul era down și a revenit, resetăm imediat task-urile eșuate
    let supplierRecovery = 0
    try {
      const Anthropic = (await import("@anthropic-ai/sdk")).default
      const client = new Anthropic()
      // Ping minimal — 1 token, cost ~$0.000003
      await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1,
        messages: [{ role: "user", content: "ping" }],
      })

      // API răspunde — resetăm task-urile eșuate din cauza limitei
      const recovered = await prisma.agentTask.updateMany({
        where: {
          status: "FAILED",
          failureReason: { contains: "API usage limits" },
        },
        data: {
          status: "ASSIGNED",
          failureReason: null,
          failedAt: null,
          startedAt: null,
          acceptedAt: null,
        },
      }).catch(() => ({ count: 0 }))
      supplierRecovery = recovered.count

      if (supplierRecovery > 0) {
        console.log(`[cron/executor] Supplier recovered: ${supplierRecovery} tasks reset from FAILED→ASSIGNED`)
      }
    } catch (probeErr: any) {
      const msg = probeErr?.message || ""
      if (msg.includes("API usage limits") || msg.includes("rate_limit")) {
        // API încă down — nu procesăm, economisim
        return NextResponse.json({
          ok: true,
          supplierDown: true,
          reason: "Anthropic API limit activ — skip execuție, așteptăm revenire",
          timestamp: new Date().toISOString(),
        })
      }
      // Altă eroare (network etc.) — continuăm cu cât putem
      console.log(`[cron/executor] Health probe warning: ${msg.slice(0, 80)}`)
    }

    // Retry: deblocăm task-uri BLOCKED > 24h (punct 4)
    const retried = await prisma.agentTask.updateMany({
      where: {
        status: "BLOCKED",
        blockedAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      data: {
        status: "ASSIGNED",
        blockerType: null,
        blockerDescription: null,
        blockedAt: null,
      },
    }).catch(() => ({ count: 0 }))

    // ═══ HEARTBEAT ADAPTIV (lightweight — doar batch size) ═══
    let heartbeatBatchSize = 5 // default conservativ
    try {
      const { calculateHeartbeat } = await import("@/lib/agents/cognitive-layers")
      const heartbeat = await calculateHeartbeat()
      heartbeatBatchSize = Math.min(heartbeat.batchSize, 3) // max 3 per batch (conservativ)
      console.log(`[cron/executor] Heartbeat: ${heartbeat.urgencyLevel} (batch=${heartbeatBatchSize})`)
    } catch {}
    // Cognitive layers complete + advanced → mutat in /cron/maintenance

    // Procesează coada — batch size din heartbeat adaptiv
    let totalProcessed = 0
    let totalExecuted = 0
    let totalBlocked = 0
    let totalSkippedByMeta = 0
    let allResults: any[] = []
    let batchCount = 0
    const maxBatches = 2 // MAX 2 batches × 3 tasks = 6 tasks max (~60s)
    const executorStartTime = Date.now()
    const MAX_EXECUTOR_MS = 180000 // 180s safety limit (Vercel max 300s)

    while (batchCount < maxBatches) {
      // Safety: oprim daca am depasit 180s
      if (Date.now() - executorStartTime > MAX_EXECUTOR_MS) {
        console.log(`[cron/executor] Safety timeout: ${Math.round((Date.now() - executorStartTime) / 1000)}s — oprire`)
        break
      }

      const result = await runIntelligentBatch(heartbeatBatchSize)

      if (result.tasksProcessed === 0) break

      totalProcessed += result.tasksProcessed
      totalExecuted += result.tasksExecuted
      totalBlocked += result.tasksBlockedAlignment + result.tasksBlockedBudget
      allResults = allResults.concat(result.results)
      batchCount++

      if (result.tasksExecuted === 0 && result.tasksSkippedKB === 0) break
    }

    // NIVEL 3b: PROACTIVE LOOP — ruleaza SEPARAT prin /api/v1/agents/cycle (n8n cron)
    // NU il includem in executor — 7 manageri × Claude call = depaseste 300s timeout Vercel
    // Confirmat functional: COG cycle "8 ON_TRACK, 0 AT_RISK, 1 BLOCKED" (log prod 28.04)
    const proactiveResult = { managersRun: 0, totalActions: 0, errors: [] as string[] }

    // NIVEL 4-6: MUTAT in /api/cron/maintenance (cron separat la 1h)
    // Executor-ul ramane LEAN: doar task execution + cognitive layers
    // Learning, signals, retry, operational engine, rollup, hygiene → maintenance

    // Salvam timestamp
    try {
      await prisma.systemConfig.upsert({
        where: { key: "EXECUTOR_LAST_RUN" },
        update: { value: new Date().toISOString() },
        create: { key: "EXECUTOR_LAST_RUN", value: new Date().toISOString() },
      })
    } catch {}

    // ═══ HEARTBEAT PING — confirmă la UptimeRobot că executorul a rulat ═══
    // Creează un monitor "Heartbeat" în UptimeRobot → copiază URL-ul generat
    // → setează ca UPTIMEROBOT_EXECUTOR_HEARTBEAT în Vercel env vars
    try {
      const heartbeatUrl = process.env.UPTIMEROBOT_EXECUTOR_HEARTBEAT
      if (heartbeatUrl) {
        await fetch(heartbeatUrl, { method: "GET" }).catch(() => {})
      }
    } catch {}

    return NextResponse.json({
      ok: true,
      batches: batchCount,
      supplierRecovery,
      retriedFromBlocked: retried.count,
      totalProcessed,
      totalExecuted,
      totalBlocked,
      heartbeatBatchSize,
      note: "Executor LEAN: doar task exec. Learning/signals/retry/operational/cognitive → /api/cron/maintenance",
      results: allResults.slice(0, 20),
      durationMs: Date.now() - Date.parse(new Date().toISOString()),
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("[cron/executor] Error:", error.message)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}
