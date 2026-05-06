/**
 * remediation-runner.ts — Sidecar autonom de remediere disfuncții
 *
 * Livrat: 05.05.2026, Sprint 2 Sistem Detecție Disfuncții.
 *
 * RESPONSABILITATE:
 *   Preia DisfunctionEvents noi/OPEN și aplică remedierea potrivită:
 *     D1 (AUTO)  → execută din ALLOWLIST fără intervenție umană
 *     D2 (AGENT) → escaladează la managerul responsabil
 *     D3 (OWNER) → escaladează direct la Owner
 *
 * PRINCIPII:
 *   - ALLOWLIST strict: DOAR acțiunile pre-aprobate se execută automat
 *   - Orice altceva escaladează — fail-safe by default
 *   - Logging complet: fiecare tentativă, succes sau eșec, e persistată
 *   - Idempotent: nu remediază un event deja REMEDIATING/RESOLVED/ESCALATED
 *   - Zero conținut semantic — lucrează pe metadate (class, targetType, signal)
 *
 * CONSUMĂ:
 *   - DisfunctionEvent (Prisma) — poll-based sau apelat pe event nou
 *   - escalation-chain.ts — pentru escaladare D2/D3
 *   - cpuCall (CPU gateway) — pentru analiză AI la D2 dacă trebuie
 *
 * NU ÎNLOCUIEȘTE /api/v1/disfunctions/remediate — acela e endpoint-ul pasiv.
 * Acest modul e motorul activ care DECIDE și EXECUTĂ/ESCALADEAZĂ.
 */

import { prisma } from "@/lib/prisma"
import { cpuCall } from "@/lib/cpu/gateway"
import {
  createEscalation,
  ESCALATION_CHAIN,
  type EscalationPriority,
} from "@/lib/agents/escalation-chain"

// ── Types ──────────────────────────────────────────────────────────────────

export type DClass = "D1_TECHNICAL" | "D2_FUNCTIONAL_MGMT" | "D3_BUSINESS_PROCESS"
export type RemediationOutcome = "SUCCESS" | "FAILED" | "ESCALATED" | "SKIPPED"

export interface RemediationAttempt {
  eventId: string
  dClass: DClass
  targetType: string
  targetId: string
  signal: string
  action: string
  outcome: RemediationOutcome
  details: string
  durationMs: number
  timestamp: string
}

export interface RemediationRunResult {
  processed: number
  autoRemediated: number
  escalatedToAgent: number
  escalatedToOwner: number
  skipped: number
  failed: number
  attempts: RemediationAttempt[]
}

// ── ALLOWLIST: Acțiuni auto-remediabile per D1 ─────────────────────────────
//
// Format: targetType:signal → acțiune permisă
// DOAR ce e aici se execută automat. Orice altceva escaladează.
// Principiu: idempotent, reversibil, fără pierdere de date.

interface AllowedAction {
  action: string
  description: string
  maxRetries: number
  cooldownMs: number
  executor: (event: DisfunctionEventRow) => Promise<{ ok: boolean; details: string }>
}

interface DisfunctionEventRow {
  id: string
  class: string
  severity: string
  status: string
  targetType: string
  targetId: string
  signal: string
  detectorSource: string
  detectedAt: Date
  durationMs: number | null
  remediationLevel: string | null
  remediationAction: string | null
  remediationAt: Date | null
  remediationOk: boolean | null
  resolvedAt: Date | null
  resolvedBy: string | null
}

const D1_ALLOWLIST: Map<string, AllowedAction> = new Map([
  // ── Service restarts ──
  ["SERVICE:ECONNREFUSED", {
    action: "restart_service",
    description: "Restart serviciu via Docker API/healthcheck re-trigger",
    maxRetries: 3,
    cooldownMs: 2 * 60_000, // 2min între retry-uri
    executor: executeServiceRestart,
  }],
  ["SERVICE:health_check_failed", {
    action: "restart_service",
    description: "Restart serviciu la health check eșuat",
    maxRetries: 3,
    cooldownMs: 2 * 60_000,
    executor: executeServiceRestart,
  }],
  ["SERVICE:container_unhealthy", {
    action: "restart_service",
    description: "Restart container marcat unhealthy",
    maxRetries: 2,
    cooldownMs: 3 * 60_000,
    executor: executeServiceRestart,
  }],
  ["SERVICE:memory_pressure", {
    action: "restart_service",
    description: "Restart serviciu la presiune memorie",
    maxRetries: 1,
    cooldownMs: 5 * 60_000,
    executor: executeServiceRestart,
  }],

  // ── Workflow retrigger ──
  ["WORKFLOW:execution_failed", {
    action: "retrigger_workflow",
    description: "Re-trigger workflow n8n eșuat",
    maxRetries: 2,
    cooldownMs: 5 * 60_000,
    executor: executeWorkflowRetrigger,
  }],
  ["WORKFLOW:timeout_exceeded", {
    action: "retrigger_workflow",
    description: "Re-trigger workflow n8n la timeout",
    maxRetries: 1,
    cooldownMs: 10 * 60_000,
    executor: executeWorkflowRetrigger,
  }],

  // ── Agent cycle reset ──
  ["ROLE:cycle_missed_24h", {
    action: "reset_agent_cycle",
    description: "Reset ciclu agent care a depășit 24h fără execuție",
    maxRetries: 1,
    cooldownMs: 30 * 60_000,
    executor: executeAgentCycleReset,
  }],
  ["ROLE:heartbeat_missing", {
    action: "reset_agent_cycle",
    description: "Reset agent cu heartbeat lipsă",
    maxRetries: 2,
    cooldownMs: 10 * 60_000,
    executor: executeAgentCycleReset,
  }],

  // ── Redis reconnect ──
  ["SERVICE:redis_connection_lost", {
    action: "reconnect_redis",
    description: "Forțare reconectare Redis",
    maxRetries: 3,
    cooldownMs: 30_000,
    executor: executeRedisReconnect,
  }],

  // ── DB connection pool ──
  ["SERVICE:db_pool_exhausted", {
    action: "reset_db_pool",
    description: "Reset connection pool Prisma",
    maxRetries: 1,
    cooldownMs: 60_000,
    executor: executeDBPoolReset,
  }],
])

// ── D2 Manager mapping ─────────────────────────────────────────────────────
// Pentru D2, identificăm managerul responsabil pe baza targetId (care e un ROLE)

function getManagerForRole(role: string): string {
  return ESCALATION_CHAIN[role] || "COG"
}

// ── Severity → EscalationPriority mapping ──────────────────────────────────

function severityToPriority(severity: string): EscalationPriority {
  switch (severity) {
    case "CRITICAL": return "CRITICAL"
    case "HIGH": return "HIGH"
    case "MEDIUM": return "MEDIUM"
    default: return "LOW"
  }
}

// ── Cooldown tracking ──────────────────────────────────────────────────────
// In-memory map: allowlistKey → lastAttemptTimestamp
// Prevents hammering the same remediation repeatedly.

const cooldownTracker = new Map<string, { lastAttempt: number; retryCount: number }>()

function isCoolingDown(key: string, allowedAction: AllowedAction): boolean {
  const tracker = cooldownTracker.get(key)
  if (!tracker) return false
  const elapsed = Date.now() - tracker.lastAttempt
  if (elapsed < allowedAction.cooldownMs) return true
  if (tracker.retryCount >= allowedAction.maxRetries) {
    // Max retries exhausted within cooldown window — needs escalation
    return true
  }
  return false
}

function isMaxRetriesExhausted(key: string, allowedAction: AllowedAction): boolean {
  const tracker = cooldownTracker.get(key)
  if (!tracker) return false
  return tracker.retryCount >= allowedAction.maxRetries
}

function recordAttempt(key: string): void {
  const existing = cooldownTracker.get(key)
  cooldownTracker.set(key, {
    lastAttempt: Date.now(),
    retryCount: (existing?.retryCount ?? 0) + 1,
  })
}

function resetCooldown(key: string): void {
  cooldownTracker.delete(key)
}

// ── Main runner ────────────────────────────────────────────────────────────

/**
 * Procesează toate evenimentele OPEN care nu au fost încă remediate.
 * Apelat periodic (cron) sau la detectarea unui event nou.
 */
export async function runRemediationCycle(): Promise<RemediationRunResult> {
  const result: RemediationRunResult = {
    processed: 0,
    autoRemediated: 0,
    escalatedToAgent: 0,
    escalatedToOwner: 0,
    skipped: 0,
    failed: 0,
    attempts: [],
  }

  // Fetch OPEN events, sorted oldest first (FIFO)
  const openEvents = await (prisma as any).disfunctionEvent.findMany({
    where: {
      status: "OPEN",
      // Exclude events already being remediated
      remediationLevel: null,
    },
    orderBy: { detectedAt: "asc" },
    take: 50, // batch limit per cycle
  }).catch((err: Error) => {
    console.error(`[remediation-runner] Failed to fetch events: ${err.message}`)
    return []
  })

  for (const event of openEvents as DisfunctionEventRow[]) {
    result.processed++
    const attempt = await processEvent(event)
    result.attempts.push(attempt)

    switch (attempt.outcome) {
      case "SUCCESS":
        result.autoRemediated++
        break
      case "ESCALATED":
        if (event.class === "D3_BUSINESS_PROCESS") {
          result.escalatedToOwner++
        } else {
          result.escalatedToAgent++
        }
        break
      case "FAILED":
        result.failed++
        break
      case "SKIPPED":
        result.skipped++
        break
    }
  }

  // Log summary
  if (result.processed > 0) {
    console.log(
      `[remediation-runner] Cycle complete: ${result.processed} processed, ` +
      `${result.autoRemediated} auto-fixed, ${result.escalatedToAgent} → agent, ` +
      `${result.escalatedToOwner} → owner, ${result.failed} failed, ${result.skipped} skipped`
    )
  }

  return result
}

/**
 * Procesează un singur event — decide acțiunea pe baza clasei.
 */
async function processEvent(event: DisfunctionEventRow): Promise<RemediationAttempt> {
  const startTime = Date.now()
  const baseAttempt = {
    eventId: event.id,
    dClass: event.class as DClass,
    targetType: event.targetType,
    targetId: event.targetId,
    signal: event.signal,
    timestamp: new Date().toISOString(),
  }

  switch (event.class) {
    case "D1_TECHNICAL":
      return handleD1(event, baseAttempt, startTime)
    case "D2_FUNCTIONAL_MGMT":
      return handleD2(event, baseAttempt, startTime)
    case "D3_BUSINESS_PROCESS":
      return handleD3(event, baseAttempt, startTime)
    default:
      return {
        ...baseAttempt,
        action: "none",
        outcome: "SKIPPED",
        details: `Unknown class: ${event.class}`,
        durationMs: Date.now() - startTime,
      }
  }
}

// ── D1 Handler: Auto-remediation from ALLOWLIST ────────────────────────────

async function handleD1(
  event: DisfunctionEventRow,
  baseAttempt: Omit<RemediationAttempt, "action" | "outcome" | "details" | "durationMs">,
  startTime: number
): Promise<RemediationAttempt> {
  const allowlistKey = `${event.targetType}:${event.signal}`
  const allowedAction = D1_ALLOWLIST.get(allowlistKey)

  // Not in allowlist → escalate to manager (fail-safe)
  if (!allowedAction) {
    await escalateD1ToAgent(event, `Signal "${event.signal}" nu e în ALLOWLIST auto-remediere`)
    return {
      ...baseAttempt,
      action: "escalate_not_in_allowlist",
      outcome: "ESCALATED",
      details: `D1 signal "${allowlistKey}" absent din allowlist — escaladat la agent`,
      durationMs: Date.now() - startTime,
    }
  }

  // Check cooldown / max retries
  const cooldownKey = `${event.targetType}:${event.targetId}:${event.signal}`
  if (isMaxRetriesExhausted(cooldownKey, allowedAction)) {
    await escalateD1ToAgent(event, `Max retries (${allowedAction.maxRetries}) epuizate pentru ${allowlistKey}`)
    resetCooldown(cooldownKey)
    return {
      ...baseAttempt,
      action: "escalate_max_retries",
      outcome: "ESCALATED",
      details: `Max retries exhausted for ${cooldownKey} — escaladat la agent`,
      durationMs: Date.now() - startTime,
    }
  }

  if (isCoolingDown(cooldownKey, allowedAction)) {
    return {
      ...baseAttempt,
      action: "cooldown_wait",
      outcome: "SKIPPED",
      details: `In cooldown (${allowedAction.cooldownMs}ms) — skip until next cycle`,
      durationMs: Date.now() - startTime,
    }
  }

  // Mark as REMEDIATING before executing
  await markRemediating(event.id, allowedAction.action)

  // Execute the action
  try {
    recordAttempt(cooldownKey)
    const execResult = await allowedAction.executor(event)

    if (execResult.ok) {
      await markResolved(event.id, allowedAction.action)
      resetCooldown(cooldownKey)
      return {
        ...baseAttempt,
        action: allowedAction.action,
        outcome: "SUCCESS",
        details: execResult.details,
        durationMs: Date.now() - startTime,
      }
    } else {
      // Execution failed but not max retries yet — mark OPEN again for next cycle
      await markOpenAgain(event.id, allowedAction.action)
      return {
        ...baseAttempt,
        action: allowedAction.action,
        outcome: "FAILED",
        details: execResult.details,
        durationMs: Date.now() - startTime,
      }
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "unknown error"
    await markOpenAgain(event.id, allowedAction.action)
    return {
      ...baseAttempt,
      action: allowedAction.action,
      outcome: "FAILED",
      details: `Exception during execution: ${errMsg}`,
      durationMs: Date.now() - startTime,
    }
  }
}

// ── D2 Handler: Escalate to responsible manager ────────────────────────────

async function handleD2(
  event: DisfunctionEventRow,
  baseAttempt: Omit<RemediationAttempt, "action" | "outcome" | "details" | "durationMs">,
  startTime: number
): Promise<RemediationAttempt> {
  const managerRole = getManagerForRole(event.targetId)

  // Use CPU to generate a brief analysis for the manager
  let analysisText = ""
  try {
    const cpuResult = await cpuCall({
      system: `Ești sistemul de detecție disfuncții al organismului JobGrade. Generează un rezumat scurt (max 3 propoziții) pentru managerul ${managerRole} despre disfuncția detectată. Fii concis, tehnic, acționabil.`,
      messages: [{
        role: "user",
        content: `Disfuncție D2 detectată:\n- Rol afectat: ${event.targetId}\n- Semnal: ${event.signal}\n- Severitate: ${event.severity}\n- Detectat de: ${event.detectorSource}\n- Durată: ${event.durationMs ? `${event.durationMs}ms` : "necunoscută"}\n\nCe ar trebui să facă ${managerRole}?`,
      }],
      max_tokens: 200,
      agentRole: "REMEDIATION_RUNNER",
      operationType: "disfunction-analysis",
      skipObjectiveCheck: true,
      skipKBFirst: true,
    })
    analysisText = cpuResult.text
  } catch {
    // CPU not available — use template
    analysisText = `Rolul ${event.targetId} raportează "${event.signal}" (${event.severity}). Investigați starea agentului și decideți dacă necesită reconfigurare sau redistribuire.`
  }

  // Create escalation
  await createEscalation(
    {
      sourceRole: "REMEDIATION_RUNNER",
      targetRole: managerRole,
      aboutRole: event.targetId,
      reason: `D2 disfuncție: ${event.signal} pe ${event.targetId}`,
      details: analysisText,
      priority: severityToPriority(event.severity),
    },
    prisma
  )

  // Update event status
  await (prisma as any).disfunctionEvent.update({
    where: { id: event.id },
    data: {
      status: "ESCALATED",
      remediationLevel: "AGENT",
      remediationAction: `escalated_to_${managerRole}`,
      remediationAt: new Date(),
    },
  }).catch(() => {})

  return {
    ...baseAttempt,
    action: `escalate_to_${managerRole}`,
    outcome: "ESCALATED",
    details: `Escaladat la ${managerRole}: ${analysisText.slice(0, 100)}...`,
    durationMs: Date.now() - startTime,
  }
}

// ── D3 Handler: Escalate directly to Owner ─────────────────────────────────

async function handleD3(
  event: DisfunctionEventRow,
  baseAttempt: Omit<RemediationAttempt, "action" | "outcome" | "details" | "durationMs">,
  startTime: number
): Promise<RemediationAttempt> {
  // D3 always goes to Owner — structural issue
  await createEscalation(
    {
      sourceRole: "REMEDIATION_RUNNER",
      targetRole: "OWNER",
      aboutRole: event.targetType === "ROLE" ? event.targetId : "SYSTEM",
      reason: `D3 disfuncție structurală: ${event.signal} pe ${event.targetType}=${event.targetId}`,
      details:
        `Problemă structurală detectată de ${event.detectorSource}. ` +
        `Severitate: ${event.severity}. Semnal: ${event.signal}. ` +
        `Acest tip de disfuncție necesită decizie Owner — nu poate fi rezolvat automat sau de agenți.`,
      priority: severityToPriority(event.severity),
    },
    prisma
  )

  // Update event
  await (prisma as any).disfunctionEvent.update({
    where: { id: event.id },
    data: {
      status: "ESCALATED",
      remediationLevel: "OWNER",
      remediationAction: "escalated_to_owner",
      remediationAt: new Date(),
    },
  }).catch(() => {})

  return {
    ...baseAttempt,
    action: "escalate_to_owner",
    outcome: "ESCALATED",
    details: `D3 structural — escaladat direct la Owner (${event.severity})`,
    durationMs: Date.now() - startTime,
  }
}

// ── DB status helpers ──────────────────────────────────────────────────────

async function markRemediating(eventId: string, action: string): Promise<void> {
  await (prisma as any).disfunctionEvent.update({
    where: { id: eventId },
    data: {
      status: "REMEDIATING",
      remediationLevel: "AUTO",
      remediationAction: action,
      remediationAt: new Date(),
    },
  }).catch(() => {})
}

async function markResolved(eventId: string, action: string): Promise<void> {
  await (prisma as any).disfunctionEvent.update({
    where: { id: eventId },
    data: {
      status: "RESOLVED",
      remediationLevel: "AUTO",
      remediationAction: action,
      remediationOk: true,
      resolvedAt: new Date(),
      resolvedBy: "auto",
    },
  }).catch(() => {})
}

async function markOpenAgain(eventId: string, action: string): Promise<void> {
  await (prisma as any).disfunctionEvent.update({
    where: { id: eventId },
    data: {
      status: "OPEN",
      remediationLevel: "AUTO",
      remediationAction: `${action}_failed`,
      remediationOk: false,
    },
  }).catch(() => {})
}

async function escalateD1ToAgent(event: DisfunctionEventRow, reason: string): Promise<void> {
  // D1 that can't be auto-remediated goes to the nearest manager
  const targetRole = event.targetType === "ROLE"
    ? getManagerForRole(event.targetId)
    : "COA" // Technical issues without role target go to COA (tech oversight)

  await createEscalation(
    {
      sourceRole: "REMEDIATION_RUNNER",
      targetRole,
      aboutRole: event.targetId,
      reason: `D1 auto-remediere eșuată: ${event.signal}`,
      details: reason,
      priority: severityToPriority(event.severity),
    },
    prisma
  )

  await (prisma as any).disfunctionEvent.update({
    where: { id: event.id },
    data: {
      status: "ESCALATED",
      remediationLevel: "AGENT",
      remediationAction: `escalated_to_${targetRole}`,
      remediationAt: new Date(),
    },
  }).catch(() => {})
}

// ── Executors: Implementări concrete auto-remediere ────────────────────────
//
// Fiecare executor e idempotent și reversibil.
// Returnează { ok, details } — nu aruncă excepții.

async function executeServiceRestart(
  event: DisfunctionEventRow
): Promise<{ ok: boolean; details: string }> {
  const serviceId = event.targetId

  // Try Docker API restart via internal endpoint
  try {
    const internalKey = process.env.INTERNAL_API_KEY
    if (!internalKey) {
      return { ok: false, details: "INTERNAL_API_KEY not configured" }
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const response = await fetch(`${baseUrl}/api/v1/infra/restart`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-key": internalKey,
      },
      body: JSON.stringify({ service: serviceId }),
      signal: AbortSignal.timeout(30_000),
    })

    if (response.ok) {
      return { ok: true, details: `Service ${serviceId} restart triggered successfully` }
    }

    const errorBody = await response.text().catch(() => "no body")
    return { ok: false, details: `Restart API returned ${response.status}: ${errorBody}` }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown"
    return { ok: false, details: `Service restart failed: ${msg}` }
  }
}

async function executeWorkflowRetrigger(
  event: DisfunctionEventRow
): Promise<{ ok: boolean; details: string }> {
  const workflowId = event.targetId

  try {
    const n8nUrl = process.env.N8N_API_URL
    const n8nApiKey = process.env.N8N_API_KEY

    if (!n8nUrl || !n8nApiKey) {
      return { ok: false, details: "N8N_API_URL or N8N_API_KEY not configured" }
    }

    // Activate workflow if deactivated, then trigger
    const activateResponse = await fetch(`${n8nUrl}/workflows/${workflowId}/activate`, {
      method: "POST",
      headers: {
        "X-N8N-API-KEY": n8nApiKey,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(15_000),
    })

    if (activateResponse.ok || activateResponse.status === 409) {
      // 409 = already active, that's fine
      return { ok: true, details: `Workflow ${workflowId} re-triggered/activated` }
    }

    return { ok: false, details: `n8n activate returned ${activateResponse.status}` }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown"
    return { ok: false, details: `Workflow retrigger failed: ${msg}` }
  }
}

async function executeAgentCycleReset(
  event: DisfunctionEventRow
): Promise<{ ok: boolean; details: string }> {
  const roleCode = event.targetId

  try {
    // Reset lastCycleAt to null to force next cycle execution
    const updated = await (prisma as any).agentDefinition.updateMany({
      where: { roleCode },
      data: { lastCycleAt: null },
    })

    if (updated.count > 0) {
      // Also log a metric for the reset
      await (prisma as any).agentMetric.create({
        data: {
          agentRole: roleCode,
          metricType: "CYCLE_RESET",
          value: 1,
          context: `Auto-remediation: cycle reset due to ${event.signal}`,
        },
      }).catch(() => {})

      return { ok: true, details: `Agent ${roleCode} cycle reset (lastCycleAt cleared)` }
    }

    return { ok: false, details: `Agent ${roleCode} not found in agentDefinition` }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown"
    return { ok: false, details: `Agent cycle reset failed: ${msg}` }
  }
}

async function executeRedisReconnect(
  _event: DisfunctionEventRow
): Promise<{ ok: boolean; details: string }> {
  try {
    // Import Redis client and force reconnection
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const redis = await import("@upstash/redis").then(m => (m as any).Redis?.fromEnv?.()).catch(() => null)
    if (!redis) {
      return { ok: false, details: "Redis module not available" }
    }

    // Ping to verify connection, which triggers reconnect if disconnected
    const pong = await (redis as any).ping().catch(() => null)
    if (pong === "PONG") {
      return { ok: true, details: "Redis connection verified (PONG)" }
    }

    // Try disconnect + reconnect
    await (redis as any).disconnect?.().catch(() => {})
    await (redis as any).connect?.().catch(() => {})
    const pong2 = await (redis as any).ping().catch(() => null)

    if (pong2 === "PONG") {
      return { ok: true, details: "Redis reconnected successfully after disconnect/connect" }
    }

    return { ok: false, details: "Redis reconnect failed — PING did not return PONG" }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown"
    return { ok: false, details: `Redis reconnect failed: ${msg}` }
  }
}

async function executeDBPoolReset(
  _event: DisfunctionEventRow
): Promise<{ ok: boolean; details: string }> {
  try {
    // Prisma doesn't expose pool reset directly, but $disconnect + next query
    // forces a new pool. This is idempotent and safe.
    await (prisma as any).$disconnect()
    // Next query will re-establish pool. Verify with a simple query.
    const check = await (prisma as any).$queryRaw`SELECT 1 as ok`
    if (check && check.length > 0) {
      return { ok: true, details: "DB pool reset via $disconnect + reconnect" }
    }
    return { ok: false, details: "DB pool reset: reconnect query returned empty" }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown"
    return { ok: false, details: `DB pool reset failed: ${msg}` }
  }
}

// ── Single event processing (for real-time trigger) ────────────────────────

/**
 * Procesează un singur event imediat (fără poll).
 * Util când detectorul emite un event și vrea remediere imediată.
 */
export async function remediateEvent(eventId: string): Promise<RemediationAttempt | null> {
  const event = await (prisma as any).disfunctionEvent.findUnique({
    where: { id: eventId },
  }).catch(() => null)

  if (!event) return null
  if (event.status !== "OPEN") return null
  if (event.remediationLevel !== null) return null

  return processEvent(event as DisfunctionEventRow)
}

// ── Allowlist introspection (for dashboard/audit) ──────────────────────────

export function getAllowlistEntries(): Array<{
  key: string
  action: string
  description: string
  maxRetries: number
  cooldownMs: number
}> {
  return Array.from(D1_ALLOWLIST.entries()).map(([key, val]) => ({
    key,
    action: val.action,
    description: val.description,
    maxRetries: val.maxRetries,
    cooldownMs: val.cooldownMs,
  }))
}

/**
 * Verifică dacă un signal e auto-remediabil.
 */
export function isAutoRemediable(targetType: string, signal: string): boolean {
  return D1_ALLOWLIST.has(`${targetType}:${signal}`)
}

// ── Cooldown state reset (for testing / admin) ─────────────────────────────

export function resetAllCooldowns(): void {
  cooldownTracker.clear()
}

// ── Metrics export ─────────────────────────────────────────────────────────

export async function getRemediationStats(): Promise<{
  last24h: { total: number; autoFixed: number; escalated: number; failed: number }
  allowlistSize: number
  activeCooldowns: number
}> {
  const since = new Date(Date.now() - 24 * 60 * 60_000)

  const events = await (prisma as any).disfunctionEvent.findMany({
    where: {
      remediationAt: { gte: since },
    },
    select: {
      remediationLevel: true,
      remediationOk: true,
      status: true,
    },
  }).catch(() => [])

  const autoFixed = events.filter(
    (e: any) => e.remediationLevel === "AUTO" && e.remediationOk === true
  ).length
  const escalated = events.filter(
    (e: any) => e.status === "ESCALATED"
  ).length
  const failed = events.filter(
    (e: any) => e.remediationOk === false
  ).length

  return {
    last24h: {
      total: events.length,
      autoFixed,
      escalated,
      failed,
    },
    allowlistSize: D1_ALLOWLIST.size,
    activeCooldowns: cooldownTracker.size,
  }
}
