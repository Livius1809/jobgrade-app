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

    // ═══ STRATURI COGNITIVE: heartbeat adaptiv ═══
    let cognitiveResult: any = null
    let heartbeatBatchSize = 10
    try {
      const { runCognitiveLayers, calculateHeartbeat } = await import("@/lib/agents/cognitive-layers")
      const heartbeat = await calculateHeartbeat()
      heartbeatBatchSize = heartbeat.batchSize
      console.log(`[cron/executor] Heartbeat: ${heartbeat.urgencyLevel} (batch=${heartbeat.batchSize}) — ${heartbeat.reason}`)

      // Cognitive layers (anomalii, blind spots, weighted learning)
      cognitiveResult = await runCognitiveLayers()
      if (cognitiveResult.anomalies.length > 0) {
        console.log(`[cron/executor] ${cognitiveResult.anomalies.length} anomalii detectate:`,
          cognitiveResult.anomalies.map((a: any) => a.signal).join("; "))
      }
    } catch (e) {
      console.log("[cron/executor] Cognitive layers skip:", (e as Error).message?.slice(0, 60))
    }

    // ═══ STRATURI COGNITIVE AVANSATE (8-13): context existențial ═══
    let advancedCogResult: any = null
    try {
      const { runAdvancedCognitiveLayers } = await import("@/lib/agents/cognitive-layers-advanced")
      advancedCogResult = await runAdvancedCognitiveLayers()
      console.log(`[cron/executor] Phase: ${advancedCogResult.phase.currentPhase}, Failure impact: ${advancedCogResult.failureImpact.globalRiskAdjustment}%, Narrative age: ${advancedCogResult.narrativeAge}d`)
      if (advancedCogResult.agentAnomalies.length > 0) {
        console.log(`[cron/executor] Agent anomalies: ${advancedCogResult.agentAnomalies.join("; ")}`)
      }
    } catch (e) {
      console.log("[cron/executor] Advanced cognitive skip:", (e as Error).message?.slice(0, 60))
    }

    // Procesează coada — batch size din heartbeat adaptiv
    let totalProcessed = 0
    let totalExecuted = 0
    let totalBlocked = 0
    let totalSkippedByMeta = 0
    let allResults: any[] = []
    let batchCount = 0
    const maxBatches = 10

    while (batchCount < maxBatches) {
      const result = await runIntelligentBatch(heartbeatBatchSize)

      if (result.tasksProcessed === 0) break // nu mai sunt task-uri

      totalProcessed += result.tasksProcessed
      totalExecuted += result.tasksExecuted
      totalBlocked += result.tasksBlockedAlignment + result.tasksBlockedBudget
      allResults = allResults.concat(result.results)
      batchCount++

      // Dacă toate task-urile din batch sunt blocked/skipped, oprim (evităm loop infinit)
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

    return NextResponse.json({
      ok: true,
      batches: batchCount,
      supplierRecovery,
      retriedFromBlocked: retried.count,
      totalProcessed,
      totalExecuted,
      totalBlocked,
      cognitive: cognitiveResult ? {
        heartbeat: cognitiveResult.heartbeat.urgencyLevel,
        batchSize: cognitiveResult.heartbeat.batchSize,
        anomalies: cognitiveResult.anomalies.length,
        blindSpots: cognitiveResult.blindSpots.length,
        weightedLearning: cognitiveResult.weightedLearningUpdated,
        skippedByMeta: totalSkippedByMeta,
      } : null,
      advanced: advancedCogResult ? {
        phase: advancedCogResult.phase.currentPhase,
        phaseConfidence: advancedCogResult.phase.confidence,
        failureImpact: advancedCogResult.failureImpact.globalRiskAdjustment,
        activeTraumas: advancedCogResult.failureImpact.activeTraumas.length,
        agentProfiles: advancedCogResult.agentProfiles,
        agentAnomalies: advancedCogResult.agentAnomalies,
        narrativeAge: advancedCogResult.narrativeAge,
      } : null,
      note: "Learning, signals, retry, operational → /api/cron/maintenance (cron separat)",
      results: allResults.slice(0, 20),
      durationMs: Date.now() - Date.parse(new Date().toISOString()),
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("[cron/executor] Error:", error.message)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}
