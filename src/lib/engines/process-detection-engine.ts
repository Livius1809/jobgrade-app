/**
 * process-detection-engine.ts — D3 Process Detection (tracking procesual)
 *
 * Principiu (05.04.2026): strict funcțional. Zero conținut semantic.
 * Atingem DOAR canale / ritm / tranziții (D1/D2/D3).
 *
 * Engine care urmărește tranzițiile între agenți și detectează anomalii
 * procesuale: bucle, blocaje, dead-end-uri, escaladări excesive, timeout-uri.
 *
 * Arhitectura: buffer in-memory (AgentMetric nu stochează tranziții granulare)
 * cu flush periodic opțional spre DisfunctionEvent.
 */

// ── Types ──────────────────────────────────────────────────────────────────

export interface ProcessTransition {
  fromAgent: string
  toAgent: string
  transitionType: "HANDOFF" | "ESCALATION" | "DELEGATION" | "FEEDBACK"
  timestamp: Date
  success: boolean
  durationMs?: number
}

export interface ProcessAnomaly {
  type: "LOOP" | "BOTTLENECK" | "DEAD_END" | "EXCESSIVE_ESCALATION" | "TIMEOUT"
  agents: string[]
  description: string
  severity: "D1" | "D2" | "D3" // D1=canal, D2=ritm, D3=tranziție
  detectedAt: Date
}

// ── In-memory buffer ───────────────────────────────────────────────────────

const MAX_BUFFER_SIZE = 2000
const transitionBuffer: ProcessTransition[] = []

// ── Track ──────────────────────────────────────────────────────────────────

/**
 * Înregistrează o tranziție între doi agenți.
 * Stocată in-memory (AgentMetric nu are coloane de tranziție).
 * Buffer circular — la MAX_BUFFER_SIZE se elimină cele mai vechi.
 */
export async function trackTransition(transition: ProcessTransition): Promise<void> {
  transitionBuffer.push({
    ...transition,
    timestamp: transition.timestamp instanceof Date ? transition.timestamp : new Date(transition.timestamp),
  })

  // Buffer circular — păstrăm ultimele MAX_BUFFER_SIZE tranziții
  if (transitionBuffer.length > MAX_BUFFER_SIZE) {
    transitionBuffer.splice(0, transitionBuffer.length - MAX_BUFFER_SIZE)
  }
}

// ── Detect ─────────────────────────────────────────────────────────────────

/**
 * Detectează anomalii procesuale în fereastra de timp dată.
 * Default: ultimele 60 de minute.
 *
 * Reguli:
 *  - LOOP: aceeași pereche agent apare 3+ ori în fereastră
 *  - BOTTLENECK: un agent are 5+ tranziții pending (incoming fără outgoing)
 *  - DEAD_END: tranziție fără răspuns în 30 min
 *  - EXCESSIVE_ESCALATION: 3+ escaladări de la același agent în fereastră
 *  - TIMEOUT: durată tranziție > 10 minute
 */
export async function detectAnomalies(windowMinutes: number = 60): Promise<ProcessAnomaly[]> {
  const anomalies: ProcessAnomaly[] = []
  const now = Date.now()
  const windowMs = windowMinutes * 60 * 1000

  // Filtrăm tranzițiile din fereastră
  const window = transitionBuffer.filter(
    (t) => now - t.timestamp.getTime() <= windowMs
  )

  if (window.length === 0) return anomalies

  // ── LOOP: aceeași pereche from→to apare 3+ ori ─────────────
  const pairCount = new Map<string, number>()
  for (const t of window) {
    const key = `${t.fromAgent}→${t.toAgent}`
    pairCount.set(key, (pairCount.get(key) ?? 0) + 1)
  }
  for (const [pair, count] of pairCount) {
    if (count >= 3) {
      const [from, to] = pair.split("→")
      anomalies.push({
        type: "LOOP",
        agents: [from, to],
        description: `Buclă detectată: ${pair} apare de ${count} ori în ultimele ${windowMinutes} min`,
        severity: "D3",
        detectedAt: new Date(),
      })
    }
  }

  // ── BOTTLENECK: un agent are 5+ incoming fără outgoing corespunzător ──
  const incoming = new Map<string, number>()
  const outgoing = new Map<string, number>()
  for (const t of window) {
    incoming.set(t.toAgent, (incoming.get(t.toAgent) ?? 0) + 1)
    outgoing.set(t.fromAgent, (outgoing.get(t.fromAgent) ?? 0) + 1)
  }
  for (const [agent, inCount] of incoming) {
    const outCount = outgoing.get(agent) ?? 0
    const pending = inCount - outCount
    if (pending >= 5) {
      anomalies.push({
        type: "BOTTLENECK",
        agents: [agent],
        description: `Bottleneck: ${agent} are ${pending} tranziții pending (${inCount} in, ${outCount} out)`,
        severity: "D2",
        detectedAt: new Date(),
      })
    }
  }

  // ── DEAD_END: tranziție fără succes și fără răspuns în 30 min ──────
  const DEAD_END_THRESHOLD_MS = 30 * 60 * 1000
  for (const t of window) {
    if (!t.success && (now - t.timestamp.getTime()) > DEAD_END_THRESHOLD_MS) {
      // Verificăm că nu există o tranziție ulterioară de la toAgent
      const hasFollowUp = window.some(
        (f) => f.fromAgent === t.toAgent && f.timestamp.getTime() > t.timestamp.getTime()
      )
      if (!hasFollowUp) {
        anomalies.push({
          type: "DEAD_END",
          agents: [t.fromAgent, t.toAgent],
          description: `Dead end: ${t.fromAgent}→${t.toAgent} (${t.transitionType}) fără răspuns de ${Math.round((now - t.timestamp.getTime()) / 60000)} min`,
          severity: "D3",
          detectedAt: new Date(),
        })
      }
    }
  }

  // ── EXCESSIVE_ESCALATION: 3+ escaladări de la același agent ────────
  const escalationCount = new Map<string, number>()
  for (const t of window) {
    if (t.transitionType === "ESCALATION") {
      escalationCount.set(t.fromAgent, (escalationCount.get(t.fromAgent) ?? 0) + 1)
    }
  }
  for (const [agent, count] of escalationCount) {
    if (count >= 3) {
      anomalies.push({
        type: "EXCESSIVE_ESCALATION",
        agents: [agent],
        description: `Escaladare excesivă: ${agent} a escalat de ${count} ori în ultimele ${windowMinutes} min`,
        severity: "D2",
        detectedAt: new Date(),
      })
    }
  }

  // ── TIMEOUT: durată tranziție > 10 minute ──────────────────────────
  const TIMEOUT_THRESHOLD_MS = 10 * 60 * 1000
  for (const t of window) {
    if (t.durationMs && t.durationMs > TIMEOUT_THRESHOLD_MS) {
      anomalies.push({
        type: "TIMEOUT",
        agents: [t.fromAgent, t.toAgent],
        description: `Timeout: ${t.fromAgent}→${t.toAgent} a durat ${Math.round(t.durationMs / 60000)} min (limita: 10 min)`,
        severity: "D1",
        detectedAt: new Date(),
      })
    }
  }

  return anomalies
}

// ── Utilități ──────────────────────────────────────────────────────────────

/** Returnează tranzițiile din buffer (pentru debugging / API). */
export function getRecentTransitions(limit: number = 50): ProcessTransition[] {
  return transitionBuffer.slice(-limit)
}

/** Golește buffer-ul (pentru teste). */
export function clearTransitionBuffer(): void {
  transitionBuffer.length = 0
}

/** Statistici sumar buffer. */
export function getBufferStats(): {
  totalTransitions: number
  oldestTimestamp: Date | null
  newestTimestamp: Date | null
  uniqueAgents: number
} {
  if (transitionBuffer.length === 0) {
    return { totalTransitions: 0, oldestTimestamp: null, newestTimestamp: null, uniqueAgents: 0 }
  }

  const agents = new Set<string>()
  for (const t of transitionBuffer) {
    agents.add(t.fromAgent)
    agents.add(t.toAgent)
  }

  return {
    totalTransitions: transitionBuffer.length,
    oldestTimestamp: transitionBuffer[0].timestamp,
    newestTimestamp: transitionBuffer[transitionBuffer.length - 1].timestamp,
    uniqueAgents: agents.size,
  }
}
