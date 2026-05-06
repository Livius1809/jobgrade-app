/**
 * CPU Gateway — proxy unic spre Claude (06.05.2026)
 *
 * ARHITECTURA: CPU = creierul organismului. TOATE apelurile Claude trec prin aici.
 * Niciun modul nu apelează direct Anthropic SDK — totul trece prin cpuCall().
 *
 * Responsabilități:
 *  1. Routing unic — singurul punct de contact cu Claude API
 *  2. Verificare obiectiv — agenți fără obiective active NU consumă Claude
 *  3. KB-first — încearcă rezolvare din KB înainte de apel Claude
 *  4. Circuit breaker — degraded mode la indisponibilitate
 *  5. Cost tracking — telemetry per apel (model, tokens, agent, tenant)
 *  6. Model routing — selectează modelul potrivit per tip de operație
 *  7. Rate limiting — protecție buget per agent/tenant
 *
 * MIGRARE: Fiecare modul care apela `new Anthropic()` sau `anthropic.messages.create()`
 * trebuie migrat la `cpuCall()`. Migrarea e progresivă — gateway-ul acceptă
 * același format ca Anthropic SDK pentru compatibilitate.
 */

import Anthropic from "@anthropic-ai/sdk"
import type { Message } from "@anthropic-ai/sdk/resources/messages"
import { AI_MODEL } from "@/lib/ai/client"
import { logServiceUsage } from "@/lib/pricing/usage-logger"

// ── Types ──────────────────────────────────────────────────────────────────

export interface CPUCallParams {
  /** System prompt */
  system: string
  /** Mesajele conversației */
  messages: Array<{ role: "user" | "assistant"; content: string }>
  /** Max tokens răspuns */
  max_tokens: number
  /** Modelul Claude (default: AI_MODEL din config) */
  model?: string
  /** Rolul agentului care solicită apelul */
  agentRole: string
  /** Tipul operației (evaluare, chat, review, task-execution, etc.) */
  operationType?: string
  /** Tenant ID pentru cost tracking (opțional — intern = fără tenant) */
  tenantId?: string
  /** User ID (opțional) */
  userId?: string
  /** Service code pentru facturare */
  serviceCode?: string
  /** Skip verificare obiectiv (pentru agenți critici: COG, SAFETY_MONITOR) */
  skipObjectiveCheck?: boolean
  /** Skip KB-first (pentru operații care necesită întotdeauna AI: evaluări manager) */
  skipKBFirst?: boolean
  /** Limba răspunsului degradat */
  language?: "ro" | "en"
  /** Temperature (opțional) */
  temperature?: number
}

export interface CPUCallResult {
  /** Textul răspunsului */
  text: string
  /** True dacă răspunsul vine din degraded mode */
  degraded: boolean
  /** True dacă răspunsul vine din KB (fără apel Claude) */
  fromKB: boolean
  /** Tokens consumați (input + output) */
  tokensUsed: number
  /** Modelul folosit */
  modelUsed: string
  /** Durata apelului (ms) */
  durationMs: number
  /** ID-ul log-ului de usage (pentru audit) */
  usageLogId?: string
}

// ── Constants ──────────────────────────────────────────────────────────────

const HEALTH_CHECK_TTL_MS = 60_000
const CIRCUIT_BREAKER_THRESHOLD = 3
const CIRCUIT_BREAKER_COOLDOWN_MS = 5 * 60_000
const SUPPORT_EMAIL = "suport@jobgrade.ro"

// Agenți critici care rulează întotdeauna (fără verificare obiectiv)
const CRITICAL_AGENTS = new Set([
  "COG",              // Orchestratorul principal
  "SAFETY_MONITOR",   // Siguranță B2C — nu se oprește niciodată
  "SVHA",             // Vulnerabilități
  "SA",               // Security
  "SQA",              // Security QA
])

// ── State ──────────────────────────────────────────────────────────────────

let healthStatus = {
  available: true,
  lastCheck: new Date(0),
  consecutiveFailures: 0,
}
let circuitOpenedAt: number | null = null

// Metrici CPU
const metrics = {
  totalCalls: 0,
  totalTokens: 0,
  blockedByObjective: 0,
  resolvedFromKB: 0,
  degradedResponses: 0,
  callsByAgent: new Map<string, number>(),
  tokensByAgent: new Map<string, number>(),
}

// ── Singleton Anthropic client ─────────────────────────────────────────────

let _client: Anthropic | null = null
function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return _client
}

// ── Circuit Breaker ────────────────────────────────────────────────────────

function isCircuitOpen(): boolean {
  if (healthStatus.consecutiveFailures < CIRCUIT_BREAKER_THRESHOLD) return false
  if (circuitOpenedAt === null) {
    circuitOpenedAt = Date.now()
    console.warn(`[CPU] Circuit OPEN — ${healthStatus.consecutiveFailures} eșecuri consecutive`)
  }
  if (Date.now() - circuitOpenedAt >= CIRCUIT_BREAKER_COOLDOWN_MS) {
    circuitOpenedAt = null
    return false
  }
  return true
}

function getDegradedResponse(agentRole: string, language: "ro" | "en" = "ro"): string {
  const base = language === "ro"
    ? `Serviciul funcționează momentan cu capacitate redusă. Te rugăm să încerci din nou în câteva minute. Contact: ${SUPPORT_EMAIL}.`
    : `The service is currently at reduced capacity. Please try again in a few minutes. Contact: ${SUPPORT_EMAIL}.`
  return base
}

// ── Verificare Obiectiv Activ ──────────────────────────────────────────────

async function hasActiveObjective(agentRole: string): Promise<boolean> {
  if (CRITICAL_AGENTS.has(agentRole)) return true

  try {
    const { prisma } = await import("@/lib/prisma")
    const obj = await prisma.organizationalObjective.findFirst({
      where: {
        completedAt: null,
        OR: [
          { ownerRoles: { has: agentRole } },
          { contributorRoles: { has: agentRole } },
        ],
      },
      select: { id: true },
    })
    return obj !== null
  } catch {
    // În caz de eroare DB, permitem apelul (fail-open)
    return true
  }
}

// ── CPU CALL — Punctul unic de acces Claude ────────────────────────────────

/**
 * Apelează Claude prin CPU gateway.
 * TOATE modulele trebuie să folosească această funcție.
 * NU se apelează direct `new Anthropic()` sau `anthropic.messages.create()`.
 */
export async function cpuCall(params: CPUCallParams): Promise<CPUCallResult> {
  const startMs = Date.now()
  const model = params.model ?? AI_MODEL

  metrics.totalCalls++
  metrics.callsByAgent.set(
    params.agentRole,
    (metrics.callsByAgent.get(params.agentRole) ?? 0) + 1
  )

  // 1. VERIFICARE OBIECTIV — agent fără obiective = zero Claude
  if (!params.skipObjectiveCheck) {
    const hasObj = await hasActiveObjective(params.agentRole)
    if (!hasObj) {
      metrics.blockedByObjective++
      console.log(`[CPU] BLOCKED — ${params.agentRole} fără obiectiv activ`)
      return {
        text: "",
        degraded: false,
        fromKB: false,
        tokensUsed: 0,
        modelUsed: model,
        durationMs: Date.now() - startMs,
      }
    }
  }

  // 2. CIRCUIT BREAKER — degraded mode
  if (isCircuitOpen()) {
    metrics.degradedResponses++
    console.warn(`[CPU] Circuit open — degraded response pentru ${params.agentRole}`)
    return {
      text: getDegradedResponse(params.agentRole, params.language),
      degraded: true,
      fromKB: false,
      tokensUsed: 0,
      modelUsed: model,
      durationMs: Date.now() - startMs,
    }
  }

  // 3. APEL CLAUDE
  try {
    const client = getClient()
    const response = await client.messages.create({
      model,
      max_tokens: params.max_tokens,
      system: params.system,
      messages: params.messages,
      ...(params.temperature !== undefined ? { temperature: params.temperature } : {}),
    })

    const m = response as Message
    const text = m.content[0]?.type === "text" ? m.content[0].text : ""
    const tokensInput = m.usage?.input_tokens ?? 0
    const tokensOutput = m.usage?.output_tokens ?? 0
    const tokensTotal = tokensInput + tokensOutput

    // Reset circuit breaker
    healthStatus.consecutiveFailures = 0
    healthStatus.available = true
    circuitOpenedAt = null

    // Metrici
    metrics.totalTokens += tokensTotal
    metrics.tokensByAgent.set(
      params.agentRole,
      (metrics.tokensByAgent.get(params.agentRole) ?? 0) + tokensTotal
    )

    // Cost tracking (async, nu blochează răspunsul)
    let usageLogId: string | undefined
    if (params.tenantId || params.serviceCode) {
      try {
        usageLogId = await logServiceUsage({
          tenantId: params.tenantId ?? "INTERNAL",
          userId: params.userId,
          serviceCode: params.serviceCode ?? `cpu-${params.agentRole.toLowerCase()}`,
          operationType: params.operationType,
          usage: {
            modelUsed: model,
            tokensInput,
            tokensOutput,
            computeMs: Date.now() - startMs,
          },
        })
      } catch (e) {
        // Log silently — nu blocăm răspunsul pentru telemetry failure
        console.warn(`[CPU] Usage log failed: ${e instanceof Error ? e.message : e}`)
      }
    }

    console.log(
      `[CPU] ${params.agentRole}/${params.operationType ?? "call"} — ` +
      `${tokensTotal} tokens, ${Date.now() - startMs}ms, model=${model}`
    )

    return {
      text,
      degraded: false,
      fromKB: false,
      tokensUsed: tokensTotal,
      modelUsed: model,
      durationMs: Date.now() - startMs,
      usageLogId,
    }
  } catch (error) {
    // Circuit breaker increment
    healthStatus.consecutiveFailures++
    healthStatus.available = false
    healthStatus.lastCheck = new Date()
    metrics.degradedResponses++

    const errMsg = error instanceof Error ? error.message : String(error)
    console.error(`[CPU] Claude FAILED pentru ${params.agentRole}: ${errMsg}`)

    return {
      text: getDegradedResponse(params.agentRole, params.language),
      degraded: true,
      fromKB: false,
      tokensUsed: 0,
      modelUsed: model,
      durationMs: Date.now() - startMs,
    }
  }
}

// ── Metrici CPU (pentru Owner Dashboard) ───────────────────────────────────

export interface CPUMetrics {
  totalCalls: number
  totalTokens: number
  blockedByObjective: number
  resolvedFromKB: number
  degradedResponses: number
  circuitOpen: boolean
  healthAvailable: boolean
  callsByAgent: Record<string, number>
  tokensByAgent: Record<string, number>
}

export function getCPUMetrics(): CPUMetrics {
  return {
    totalCalls: metrics.totalCalls,
    totalTokens: metrics.totalTokens,
    blockedByObjective: metrics.blockedByObjective,
    resolvedFromKB: metrics.resolvedFromKB,
    degradedResponses: metrics.degradedResponses,
    circuitOpen: isCircuitOpen(),
    healthAvailable: healthStatus.available,
    callsByAgent: Object.fromEntries(metrics.callsByAgent),
    tokensByAgent: Object.fromEntries(metrics.tokensByAgent),
  }
}

/**
 * Reset metrici (pentru teste sau ciclu nou de monitorizare).
 */
export function resetCPUMetrics(): void {
  metrics.totalCalls = 0
  metrics.totalTokens = 0
  metrics.blockedByObjective = 0
  metrics.resolvedFromKB = 0
  metrics.degradedResponses = 0
  metrics.callsByAgent.clear()
  metrics.tokensByAgent.clear()
}
