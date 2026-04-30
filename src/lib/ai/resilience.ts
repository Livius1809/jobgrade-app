/**
 * resilience.ts — Stratul de reziliență AI al organismului
 *
 * Când Claude e down, organismul continuă din cunoașterea acumulată (KB).
 * Structura E operă Claude → devine un AI distilat care asigură continuitatea.
 *
 * 4 niveluri de degradare:
 * 1. NOMINAL    — Claude funcționează normal
 * 2. DEGRADED   — Claude lent, comutăm pe Haiku
 * 3. KB_ONLY    — Claude down, servim din KB (voce identică, zero hallucination)
 * 4. OFFLINE    — Nici KB nu funcționează, doar date statice
 */

import { prisma } from "@/lib/prisma"
import { searchKB, searchKBCrossAgent, type KBSearchResult } from "@/lib/kb/search"

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type ResilienceLevel = "NOMINAL" | "DEGRADED" | "KB_ONLY" | "OFFLINE"

export interface ResilienceStatus {
  level: ResilienceLevel
  claudeAvailable: boolean
  claudeLatencyMs: number | null
  kbAvailable: boolean
  kbEntryCount: number
  lastProbeAt: string
  reason: string
}

export interface KBResponse {
  content: string
  confidence: number
  source: "KB_DIRECT" | "KB_CROSS_AGENT" | "KB_TEMPLATE"
  entries: Array<{ id: string; agentRole: string; similarity: number }>
  degradedMode: true
}

// ═══════════════════════════════════════════════════════════════
// CLAUDE HEALTH PROBE — cache 60s
// ═══════════════════════════════════════════════════════════════

let cachedStatus: ResilienceStatus | null = null
let lastProbeTime = 0
const PROBE_INTERVAL_MS = 60_000 // re-probe la fiecare 60s

/**
 * Verifică starea Claude API — cached 60s.
 * NU face apel AI real — doar un messages.create minimal.
 */
export async function getResilienceStatus(): Promise<ResilienceStatus> {
  const now = Date.now()
  if (cachedStatus && now - lastProbeTime < PROBE_INTERVAL_MS) {
    return cachedStatus
  }

  let claudeAvailable = false
  let claudeLatencyMs: number | null = null
  let kbAvailable = false
  let kbEntryCount = 0

  // Probe Claude — mesaj minimal
  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const t0 = Date.now()
    await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 5,
      messages: [{ role: "user", content: "ping" }],
    })
    claudeLatencyMs = Date.now() - t0
    claudeAvailable = true
  } catch (e: any) {
    claudeLatencyMs = null
    // Clasificare eroare
    const msg = e.message || ""
    if (msg.includes("rate_limit") || msg.includes("overloaded")) {
      // API overloaded — dar nu complet down
      claudeAvailable = false
    }
  }

  // Probe KB
  try {
    kbEntryCount = await prisma.kBEntry.count({ where: { status: "PERMANENT" } })
    kbAvailable = kbEntryCount > 0
  } catch {
    kbAvailable = false
  }

  // Determinare nivel
  let level: ResilienceLevel
  let reason: string
  if (claudeAvailable && claudeLatencyMs !== null && claudeLatencyMs < 10000) {
    level = "NOMINAL"
    reason = `Claude OK (${claudeLatencyMs}ms)`
  } else if (claudeAvailable && claudeLatencyMs !== null) {
    level = "DEGRADED"
    reason = `Claude lent (${claudeLatencyMs}ms) — folosim Haiku`
  } else if (kbAvailable) {
    level = "KB_ONLY"
    reason = `Claude indisponibil — servim din KB (${kbEntryCount} entries)`
  } else {
    level = "OFFLINE"
    reason = "Claude și KB indisponibile"
  }

  cachedStatus = {
    level,
    claudeAvailable,
    claudeLatencyMs,
    kbAvailable,
    kbEntryCount,
    lastProbeAt: new Date().toISOString(),
    reason,
  }
  lastProbeTime = now

  // Persistăm starea în SystemConfig
  try {
    await prisma.systemConfig.upsert({
      where: { key: "AI_RESILIENCE_STATUS" },
      update: { value: JSON.stringify(cachedStatus) },
      create: { key: "AI_RESILIENCE_STATUS", value: JSON.stringify(cachedStatus) },
    })
  } catch {}

  return cachedStatus
}

/**
 * Forțează re-probe (ignoră cache). Util după un incident.
 */
export function invalidateProbe() {
  lastProbeTime = 0
  cachedStatus = null
}

// ═══════════════════════════════════════════════════════════════
// KB RESPONDER — servește răspuns din cunoașterea acumulată
// ═══════════════════════════════════════════════════════════════

const SIMILARITY_THRESHOLD = 0.75 // prag pentru răspuns direct
const HIGH_CONFIDENCE_THRESHOLD = 0.85 // prag pentru răspuns fără disclaimer

/**
 * Generează un răspuns din KB fără apel AI.
 * Folosit când Claude e down (nivel KB_ONLY).
 *
 * Strategia:
 * 1. Search semantic per agent role
 * 2. Dacă scor > 0.85 → răspuns direct (voce identică cu Claude)
 * 3. Dacă scor 0.75-0.85 → răspuns cu notă de precauție
 * 4. Dacă scor < 0.75 → search cross-agent
 * 5. Dacă tot nu → mesaj onest "revenim"
 */
export async function respondFromKB(
  query: string,
  agentRole: string,
  options?: {
    language?: "ro" | "en"
    maxEntries?: number
    includeDisclaimer?: boolean
  }
): Promise<KBResponse | null> {
  const lang = options?.language || "ro"
  const maxEntries = options?.maxEntries || 3

  // 1. Search per agent
  let entries: KBSearchResult[] = []
  try {
    entries = await searchKB(agentRole, query, maxEntries)
  } catch {
    // KB search eșuat — try cross-agent
  }

  // 2. Verificare prag
  const bestScore = entries[0]?.similarity || 0

  if (bestScore >= SIMILARITY_THRESHOLD && entries.length > 0) {
    // Construiește răspuns din KB entries
    const content = buildKBResponseText(entries, bestScore >= HIGH_CONFIDENCE_THRESHOLD, lang)

    return {
      content,
      confidence: bestScore,
      source: "KB_DIRECT",
      entries: entries.map(e => ({
        id: e.id,
        agentRole: e.agentRole,
        similarity: e.similarity || 0,
      })),
      degradedMode: true,
    }
  }

  // 3. Cross-agent search
  try {
    const crossEntries = await searchKBCrossAgent(query, maxEntries, SIMILARITY_THRESHOLD)
    if (crossEntries.length > 0) {
      const content = buildKBResponseText(crossEntries, false, lang)
      return {
        content,
        confidence: crossEntries[0].similarity || 0,
        source: "KB_CROSS_AGENT",
        entries: crossEntries.map(e => ({
          id: e.id,
          agentRole: e.agentRole,
          similarity: e.similarity || 0,
        })),
        degradedMode: true,
      }
    }
  } catch {}

  // 4. Nimic relevant — mesaj onest
  return {
    content: lang === "ro"
      ? "Momentan nu pot oferi un răspuns complet la această întrebare. Sistemul nostru de asistență se va relua în scurt timp și vei primi un răspuns detaliat."
      : "I cannot provide a complete answer right now. Our assistance system will resume shortly and you will receive a detailed response.",
    confidence: 0,
    source: "KB_TEMPLATE",
    entries: [],
    degradedMode: true,
  }
}

/**
 * Construiește text de răspuns din KB entries.
 * Vocea rămâne identică — KB-ul conține răspunsuri generate tot de Claude.
 */
function buildKBResponseText(
  entries: KBSearchResult[],
  highConfidence: boolean,
  lang: "ro" | "en"
): string {
  // Combinăm conținutul celor mai relevante entries
  const mainContent = entries
    .slice(0, 3)
    .map(e => e.content.trim())
    .join("\n\n")

  if (highConfidence) {
    // Răspuns direct, fără disclaimer
    return mainContent
  }

  // Cu notă discretă
  const note = lang === "ro"
    ? "\n\n_Aceste informații sunt bazate pe experiența acumulată. Pentru detalii suplimentare, sistemul complet va fi disponibil în scurt timp._"
    : "\n\n_This information is based on accumulated experience. For additional details, the full system will be available shortly._"

  return mainContent + note
}

// ═══════════════════════════════════════════════════════════════
// AI CLIENT WRAPPER — interceptare cu fallback automat
// ═══════════════════════════════════════════════════════════════

/**
 * Wrapper peste apelul Claude care gestionează automat fallback-ul.
 *
 * Utilizare (înlocuiește direct anthropic.messages.create):
 *
 *   const result = await resilientAICall({
 *     agentRole: "HR_COUNSELOR",
 *     query: userMessage,
 *     aiCall: () => anthropic.messages.create({ ... }),
 *   })
 *
 *   if (result.fromKB) {
 *     // Răspuns din KB — nu alimenta learning funnel
 *     return result.kbResponse.content
 *   } else {
 *     // Răspuns normal de la Claude
 *     return result.aiResponse
 *   }
 */
export async function resilientAICall<T>(params: {
  agentRole: string
  query: string
  aiCall: () => Promise<T>
  language?: "ro" | "en"
}): Promise<
  | { fromKB: false; aiResponse: T; level: ResilienceLevel }
  | { fromKB: true; kbResponse: KBResponse; level: ResilienceLevel }
> {
  const status = await getResilienceStatus()

  // NOMINAL sau DEGRADED → apelăm Claude
  if (status.level === "NOMINAL" || status.level === "DEGRADED") {
    try {
      const aiResponse = await params.aiCall()
      return { fromKB: false, aiResponse, level: status.level }
    } catch (e: any) {
      // Claude a eșuat la runtime — fallback KB
      invalidateProbe()
      console.warn(`[RESILIENCE] Claude call failed, falling back to KB: ${e.message?.slice(0, 80)}`)
    }
  }

  // KB_ONLY sau fallback după eroare
  const kbResponse = await respondFromKB(params.query, params.agentRole, {
    language: params.language || "ro",
  })

  if (kbResponse) {
    return { fromKB: true, kbResponse, level: "KB_ONLY" }
  }

  // OFFLINE — nimic nu merge
  return {
    fromKB: true,
    kbResponse: {
      content: params.language === "en"
        ? "The system is temporarily unavailable. Please try again later."
        : "Sistemul este temporar indisponibil. Reîncercați mai târziu.",
      confidence: 0,
      source: "KB_TEMPLATE",
      entries: [],
      degradedMode: true,
    },
    level: "OFFLINE",
  }
}
