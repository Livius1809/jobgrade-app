/**
 * resilience.ts — AI de Continuitate
 *
 * KB-ul este un BUFFER INTERMEDIAR ACTIV între Claude și JobGrade.
 * Nu un fallback pasiv, ci STRATUL PRINCIPAL de cunoaștere.
 *
 * Flux KB-first:
 *   Client → KB (am răspuns bun?) → DA → servesc direct (zero Claude, zero cost)
 *                                 → NU → apel Claude → răspuns + SALVARE în KB
 *
 * Cu cât organismul maturizează, cu atât mai puțin depinde de Claude:
 *   Luna 1:  90% Claude, 10% KB
 *   Luna 6:  50-50
 *   Luna 12: 20% Claude, 80% KB
 *   Maturitate: KB știe aproape tot, Claude doar pentru situații inedite
 *
 * Când Claude e down → KB preia complet. Voce identică (e operă Claude).
 * Când Claude e up → KB servește ce știe, Claude completează ce e nou.
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
  fromKB: true
}

export interface AICallResult<T> {
  /** Răspunsul a venit din KB (true) sau din Claude (false) */
  fromKB: boolean
  /** Răspunsul Claude original (doar dacă fromKB=false) */
  aiResponse?: T
  /** Răspunsul din KB (doar dacă fromKB=true) */
  kbResponse?: KBResponse
  /** Nivelul de reziliență la momentul apelului */
  level: ResilienceLevel
  /** Cunoașterea nouă a fost salvată în KB (doar dacă fromKB=false) */
  savedToKB?: boolean
}

// ═══════════════════════════════════════════════════════════════
// CLAUDE HEALTH PROBE — cache 60s
// ═══════════════════════════════════════════════════════════════

let cachedStatus: ResilienceStatus | null = null
let lastProbeTime = 0
const PROBE_INTERVAL_MS = 60_000

export async function getResilienceStatus(): Promise<ResilienceStatus> {
  const now = Date.now()
  if (cachedStatus && now - lastProbeTime < PROBE_INTERVAL_MS) {
    return cachedStatus
  }

  let claudeAvailable = false
  let claudeLatencyMs: number | null = null
  let kbAvailable = false
  let kbEntryCount = 0

  // Probe Claude
  try {
    const { cpuCall } = await import("@/lib/cpu/gateway")
    const t0 = Date.now()
    await cpuCall({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 5,
      system: "",
      messages: [{ role: "user", content: "ping" }],
      agentRole: "SYSTEM",
      operationType: "resilience-probe",
    })
    claudeLatencyMs = Date.now() - t0
    claudeAvailable = true
  } catch {
    claudeLatencyMs = null
  }

  // Probe KB
  try {
    kbEntryCount = await prisma.kBEntry.count({ where: { status: "PERMANENT" } })
    kbAvailable = kbEntryCount > 0
  } catch {
    kbAvailable = false
  }

  let level: ResilienceLevel
  let reason: string
  if (claudeAvailable && claudeLatencyMs !== null && claudeLatencyMs < 10000) {
    level = "NOMINAL"
    reason = `Claude OK (${claudeLatencyMs}ms), KB: ${kbEntryCount} entries`
  } else if (claudeAvailable && claudeLatencyMs !== null) {
    level = "DEGRADED"
    reason = `Claude lent (${claudeLatencyMs}ms), KB: ${kbEntryCount} entries`
  } else if (kbAvailable) {
    level = "KB_ONLY"
    reason = `Claude indisponibil — KB activ (${kbEntryCount} entries)`
  } else {
    level = "OFFLINE"
    reason = "Claude și KB indisponibile"
  }

  cachedStatus = {
    level, claudeAvailable, claudeLatencyMs,
    kbAvailable, kbEntryCount,
    lastProbeAt: new Date().toISOString(), reason,
  }
  lastProbeTime = now

  try {
    await prisma.systemConfig.upsert({
      where: { key: "AI_RESILIENCE_STATUS" },
      update: { value: JSON.stringify(cachedStatus) },
      create: { key: "AI_RESILIENCE_STATUS", value: JSON.stringify(cachedStatus) },
    })
  } catch {}

  return cachedStatus
}

export function invalidateProbe() {
  lastProbeTime = 0
  cachedStatus = null
}

// ═══════════════════════════════════════════════════════════════
// KB SEARCH — cunoașterea acumulată
// ═══════════════════════════════════════════════════════════════

const KB_SERVE_THRESHOLD = 0.80   // servim direct din KB
const KB_ENRICH_THRESHOLD = 0.65  // KB are ceva dar incomplet → Claude completează

export async function respondFromKB(
  query: string,
  agentRole: string,
  options?: { language?: "ro" | "en"; maxEntries?: number }
): Promise<KBResponse | null> {
  const lang = options?.language || "ro"
  const maxEntries = options?.maxEntries || 3

  // 1. Search per agent
  let entries: KBSearchResult[] = []
  try {
    entries = await searchKB(agentRole, query, maxEntries)
  } catch {}

  const bestScore = entries[0]?.similarity || 0

  if (bestScore >= KB_SERVE_THRESHOLD && entries.length > 0) {
    return {
      content: buildKBResponseText(entries, bestScore >= 0.90, lang),
      confidence: bestScore,
      source: "KB_DIRECT",
      entries: entries.map(e => ({ id: e.id, agentRole: e.agentRole, similarity: e.similarity || 0 })),
      fromKB: true,
    }
  }

  // 2. Cross-agent search
  try {
    const crossEntries = await searchKBCrossAgent(query, maxEntries, KB_SERVE_THRESHOLD)
    if (crossEntries.length > 0) {
      return {
        content: buildKBResponseText(crossEntries, false, lang),
        confidence: crossEntries[0].similarity || 0,
        source: "KB_CROSS_AGENT",
        entries: crossEntries.map(e => ({ id: e.id, agentRole: e.agentRole, similarity: e.similarity || 0 })),
        fromKB: true,
      }
    }
  } catch {}

  // 3. Nimic suficient de relevant
  return null
}

function buildKBResponseText(
  entries: KBSearchResult[],
  highConfidence: boolean,
  lang: "ro" | "en"
): string {
  const mainContent = entries
    .slice(0, 3)
    .map(e => e.content.trim())
    .join("\n\n")

  if (highConfidence) return mainContent

  const note = lang === "ro"
    ? "\n\n_Aceste informații sunt bazate pe experiența acumulată. Pentru detalii suplimentare, sistemul complet va fi disponibil în scurt timp._"
    : "\n\n_This information is based on accumulated experience. For additional details, the full system will be available shortly._"

  return mainContent + note
}

// ═══════════════════════════════════════════════════════════════
// KB-FIRST PIPELINE — stratul principal
// ═══════════════════════════════════════════════════════════════

/**
 * Pipeline KB-first — buffer intermediar activ.
 *
 * 1. ÎNTREABĂ KB → dacă știe (>0.80) → servește direct, zero Claude
 * 2. KB nu știe → ÎNTREABĂ CLAUDE → răspuns
 * 3. SALVEAZĂ în KB → data viitoare se servește din KB
 * 4. Claude DOWN → servește ce are KB (orice scor > 0.65)
 *
 * @param agentRole - rolul agentului care procesează
 * @param query - întrebarea / contextul
 * @param aiCall - funcția care apelează Claude (se execută DOAR dacă KB nu știe)
 * @param extractKnowledge - extrage cunoașterea din răspunsul Claude pt salvare în KB
 */
export async function kbFirstPipeline<T>(params: {
  agentRole: string
  query: string
  aiCall: () => Promise<T>
  extractKnowledge?: (aiResponse: T) => string | null
  language?: "ro" | "en"
}): Promise<AICallResult<T>> {
  const status = await getResilienceStatus()

  // ══ PAS 1: Întreabă KB ══
  const kbResponse = await respondFromKB(params.query, params.agentRole, {
    language: params.language || "ro",
  })

  if (kbResponse && kbResponse.confidence >= KB_SERVE_THRESHOLD) {
    // KB știe → servim direct, zero Claude, zero cost
    return {
      fromKB: true,
      kbResponse,
      level: status.level,
    }
  }

  // ══ PAS 2: KB nu știe suficient → Întreabă Claude ══
  if (status.level === "NOMINAL" || status.level === "DEGRADED") {
    try {
      const aiResponse = await params.aiCall()

      // ══ PAS 3: Salvează cunoașterea nouă în KB ══
      let savedToKB = false
      if (params.extractKnowledge) {
        try {
          const knowledge = params.extractKnowledge(aiResponse)
          if (knowledge && knowledge.length >= 30) {
            await saveToKB(params.agentRole, params.query, knowledge)
            savedToKB = true
          }
        } catch {} // fire-and-forget
      }

      return {
        fromKB: false,
        aiResponse,
        level: status.level,
        savedToKB,
      }
    } catch (e: any) {
      // Claude a eșuat la runtime → fallback KB
      invalidateProbe()
      console.warn(`[KB-FIRST] Claude failed, serving from KB: ${e.message?.slice(0, 80)}`)
    }
  }

  // ══ PAS 4: Claude down → servește ce are KB (prag mai scăzut) ══
  if (kbResponse && kbResponse.confidence >= KB_ENRICH_THRESHOLD) {
    return {
      fromKB: true,
      kbResponse,
      level: status.level === "KB_ONLY" ? "KB_ONLY" : "DEGRADED",
    }
  }

  // Nici KB nu are nimic relevant
  const fallbackMsg = params.language === "en"
    ? "I cannot provide a complete answer right now. Please try again shortly."
    : "Momentan nu pot oferi un răspuns complet. Reîncercați în scurt timp."

  return {
    fromKB: true,
    kbResponse: {
      content: fallbackMsg,
      confidence: 0,
      source: "KB_TEMPLATE",
      entries: [],
      fromKB: true,
    },
    level: status.level === "KB_ONLY" || status.level === "OFFLINE" ? status.level : "KB_ONLY",
  }
}

// ═══════════════════════════════════════════════════════════════
// KB WRITE — salvare cunoaștere nouă de la Claude
// ═══════════════════════════════════════════════════════════════

/**
 * Salvează cunoaștere nouă în KB.
 * Verifică duplicat înainte de salvare.
 * Folosește learning funnel existent pentru distilare.
 */
async function saveToKB(
  agentRole: string,
  query: string,
  knowledge: string
): Promise<void> {
  // Verificare duplicat — search semantic pe ce tocmai am generat
  try {
    const existing = await searchKB(agentRole, knowledge, 1)
    if (existing.length > 0 && (existing[0].similarity || 0) >= 0.92) {
      // Deja avem ceva foarte similar → nu duplicăm
      return
    }
  } catch {}

  // Salvăm ca KBBuffer → learning funnel-ul îl va valida și promova la PERMANENT
  try {
    await prisma.kBBuffer.create({
      data: {
        agentRole,
        rawContent: knowledge.slice(0, 2000),
        sessionRef: `kb-first:${new Date().toISOString()}`,
        status: "PENDING",
      },
    })
  } catch {}

  // Fire-and-forget: alimentăm learning funnel
  try {
    const { learnFrom } = await import("@/lib/learning-hooks")
    await learnFrom(
      agentRole,
      "CONVERSATION",
      query.slice(0, 500),
      knowledge.slice(0, 1500),
      { source: "kb-first-pipeline" }
    )
  } catch {}
}

// ═══════════════════════════════════════════════════════════════
// BACKWARD COMPAT — păstrăm resilientAICall ca alias
// ═══════════════════════════════════════════════════════════════

/** @deprecated Folosește kbFirstPipeline în loc */
export const resilientAICall = kbFirstPipeline
