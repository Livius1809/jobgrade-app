/**
 * CPU — AI de Continuitate (creierul organismului)
 *
 * CPU = unitatea centrală de procesare. ȘTIE să:
 * - Proceseze (date → informații → cunoaștere → decizie)
 * - Propage (vertical + orizontal)
 * - Simuleze (WIF engine)
 * - Detecteze (disfuncții)
 * - Învețe (learning engine)
 * - Se auto-regleze (homeostasis)
 * - Se protejeze (immune, boundary rules, moral core)
 *
 * CPU NU știe ce e piața HR sau educația.
 * CPU ȘTIE să proceseze, indiferent de sursă.
 *
 * ARHITECTURA:
 *
 *   Claude (resursă externă de calcul)
 *      ↑ apelat DOAR de CPU, când KB-ul propriu nu ajunge
 *      |
 *   CPU (creierul — AI de continuitate)
 *      ├── Cunoaștere proprie (KB, L2, L3)
 *      ├── Profileri N1-N5
 *      ├── PIE (integrare)
 *      ├── WIF (simulare)
 *      ├── Learning (învățare)
 *      ├── Detecție (disfuncții)
 *      │
 *      ├── Business #1: JobGrade (periferic I/O)
 *      ├── Business #2: Antreprenoriat (periferic I/O)
 *      └── Business #N...
 *
 * Perifericele NU apelează Claude direct. Interogă CPU-ul.
 * CPU rezolvă intern (KB-first) sau apelează Claude (gateway.ts).
 * CPU persistă — cunoașterea rămâne indiferent de sesiune.
 */

import { cpuCall, type CPUCallParams, type CPUCallResult, getCPUMetrics } from "./gateway"
import { resolveFromKB, saveToKBAfterExecution } from "@/lib/agents/kb-first-resolver"

// ── Types ──────────────────────────────────────────────────────────────────

export interface CPURequest {
  /** Cine cere (agentul sau business-ul periferic) */
  source: string
  /** Ce cere (descriere liberă sau structurată) */
  query: string
  /** Context suplimentar (date client, parametri specifici business) */
  context?: string
  /** Rolul agentului care procesează (pentru KB lookup) */
  agentRole: string
  /** System prompt (dacă ajunge la Claude) */
  systemPrompt?: string
  /** Max tokens (dacă ajunge la Claude) */
  maxTokens?: number
  /** Model override */
  model?: string
  /** Operația specifică */
  operationType?: string
  /** Tenant (pentru cost tracking) */
  tenantId?: string
  /** User ID */
  userId?: string
  /** Skip KB-first (forțează apel extern) */
  forceExternal?: boolean
  /** Limba */
  language?: "ro" | "en"
}

export interface CPUResponse {
  /** Răspunsul procesat */
  text: string
  /** Sursa răspunsului */
  resolvedBy: "KB_EXACT" | "KB_PROCEDURE" | "KB_KNOWLEDGE" | "KB_CROSS_AGENT" | "KB_LEGACY" | "CLAUDE" | "DEGRADED" | "BLOCKED"
  /** Confidence (1.0 = KB exact, 0.0 = degraded) */
  confidence: number
  /** Tokens consumați (0 dacă din KB) */
  tokensUsed: number
  /** Durata totală (ms) */
  durationMs: number
  /** Learning: ce s-a învățat din acest apel */
  learned: boolean
}

// ── CPU Process — Punctul unic de intrare ──────────────────────────────────

/**
 * Procesează o cerere prin CPU.
 *
 * Fluxul:
 * 1. KB-first — încearcă rezolvare din cunoașterea proprie
 * 2. Dacă KB miss → apelează Claude prin gateway
 * 3. Post-procesare — salvează răspunsul în KB pentru viitor (learning)
 * 4. Returnează răspuns + metadata (sursă, confidence, cost)
 *
 * Orice periferic (business) apelează DOAR această funcție.
 * NU se apelează direct gateway.ts, anthropic, sau Anthropic SDK.
 */
export async function cpuProcess(request: CPURequest): Promise<CPUResponse> {
  const startMs = Date.now()

  // ═══ ETAPA 1: KB-FIRST — rezolvare internă ═══
  if (!request.forceExternal) {
    try {
      const kbResult = await resolveFromKB(
        request.agentRole,
        request.query,
        request.context ?? "",
        0.85 // threshold confidence
      )

      if (kbResult.hit && kbResult.content) {
        console.log(
          `[CPU] ${request.agentRole} rezolvat din KB (${kbResult.level}, ` +
          `confidence=${kbResult.confidence}) — zero Claude tokens`
        )
        return {
          text: kbResult.content,
          resolvedBy: `KB_${kbResult.level}` as CPUResponse["resolvedBy"],
          confidence: kbResult.confidence,
          tokensUsed: 0,
          durationMs: Date.now() - startMs,
          learned: false, // deja în KB
        }
      }
    } catch (e) {
      // KB indisponibil — continuăm cu Claude
      console.warn(`[CPU] KB lookup failed for ${request.agentRole}: ${e instanceof Error ? e.message : e}`)
    }
  }

  // ═══ ETAPA 2: APEL EXTERN — Claude prin gateway ═══
  const systemPrompt = request.systemPrompt ?? buildDefaultSystemPrompt(request)
  const messages: Array<{ role: "user" | "assistant"; content: string }> = [
    {
      role: "user" as const,
      content: request.context
        ? `${request.query}\n\nContext:\n${request.context}`
        : request.query,
    },
  ]

  const callResult = await cpuCall({
    system: systemPrompt,
    messages,
    max_tokens: request.maxTokens ?? 2048,
    model: request.model,
    agentRole: request.agentRole,
    operationType: request.operationType,
    tenantId: request.tenantId,
    userId: request.userId,
    serviceCode: `cpu-${request.agentRole.toLowerCase()}`,
    language: request.language,
  })

  // Blocked (fără obiectiv activ)
  if (!callResult.text && !callResult.degraded) {
    return {
      text: "",
      resolvedBy: "BLOCKED",
      confidence: 0,
      tokensUsed: 0,
      durationMs: Date.now() - startMs,
      learned: false,
    }
  }

  // Degraded mode
  if (callResult.degraded) {
    return {
      text: callResult.text,
      resolvedBy: "DEGRADED",
      confidence: 0.1,
      tokensUsed: 0,
      durationMs: Date.now() - startMs,
      learned: false,
    }
  }

  // ═══ ETAPA 3: LEARNING — salvăm în KB pentru viitor ═══
  let learned = false
  try {
    await saveToKBAfterExecution(
      request.agentRole,
      request.query,
      callResult.text,
      0.7 // confidence medie pentru răspuns Claude nevalidat
    )
    learned = true
  } catch {
    // Learning failure nu blochează răspunsul
  }

  return {
    text: callResult.text,
    resolvedBy: "CLAUDE",
    confidence: 0.7, // Claude răspuns nevalidat = confidence medie
    tokensUsed: callResult.tokensUsed,
    durationMs: Date.now() - startMs,
    learned,
  }
}

// ── System prompt default ──────────────────────────────────────────────────

function buildDefaultSystemPrompt(request: CPURequest): string {
  return [
    `Ești ${request.agentRole} în cadrul organismului JobGrade.`,
    `Răspunzi în limba ${request.language === "en" ? "engleză" : "română"}.`,
    `Fii concis, precis și util.`,
  ].join(" ")
}

// ── Export metrici CPU ─────────────────────────────────────────────────────

export { getCPUMetrics } from "./gateway"
export type { CPUMetrics } from "./gateway"

// ── Re-export gateway pentru cazurile care necesită acces direct ───────────
// (DOAR pentru module interne CPU — profileri, PIE, engines)
// Perifericele (businessurile) folosesc DOAR cpuProcess().

export { cpuCall } from "./gateway"
export type { CPUCallParams, CPUCallResult } from "./gateway"
