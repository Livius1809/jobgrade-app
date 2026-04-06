/**
 * Pattern Extractor — detecție teme care emerg *transversal* între agenți.
 *
 * Livrat: 05.04.2026, Increment #6 din roadmap-ul "Living Organization".
 * Motivație: semnalele individuale sunt zgomot; convergența ≥3 agenți distincți
 * pe aceeași temă, independent, e semnal real. Complementează COG (tactic) și
 * brainstorming (generativ) — e strict observator.
 *
 * Principii:
 *  - FUNCȚIE PURĂ — zero I/O, zero side-effects. Testabilă direct.
 *  - Zero conținut semantic — lucrează DOAR pe metadate discrete (tags, category).
 *    Fără NLP, fără clustering pe text, fără LLM.
 *  - Determinism — cu `config.now` controlabil, output-ul e reproducibil.
 *  - Early-return pe praguri — dacă nu e convergență, nu e theme.
 *
 * Surse permise:
 *  1. KBEntry.tags[]              — agent a învățat ceva taguit
 *  2. BrainstormIdea.category     — agent a propus idee în categorie
 *  3. ClientMemory.tags[]         — agent a observat ceva la client
 *
 * NU consumă:
 *  - content/description/rawContent (risc semantic)
 *  - CycleLog.description (text liber)
 *  - Escalation.reason (text liber)
 */

// ── Tipuri publice ────────────────────────────────────────────────────────────

export interface KBEntryInput {
  id: string
  agentRole: string
  tags: string[]
  createdAt: string | Date
}

export interface BrainstormIdeaInput {
  id: string
  generatedBy: string
  category: string | null
  createdAt: string | Date
}

export interface ClientMemoryInput {
  id: string
  source: string // agentRole
  tags: string[]
  createdAt: string | Date
}

export interface PatternInputs {
  kbEntries: KBEntryInput[]
  brainstormIdeas: BrainstormIdeaInput[]
  clientMemories: ClientMemoryInput[]
}

export interface PatternConfig {
  /** Min agenți distincți pentru a emite o temă. Default 3. */
  minDistinctAgents?: number
  /** Fereastra de observare în zile. Default 7. */
  windowDays?: number
  /** Min ocurențe per agent în fereastră. Default 1. */
  minPerAgent?: number
  /** Override „acum" pentru determinism în teste. */
  now?: Date
  /**
   * Tag-uri exacte de exclus (după normalizare lower/trim).
   * Utile pentru a filtra marker-i de propagare / artefacte tehnice care dau
   * convergență falsă pe toți agenții (ex: "broadcast", "brainstorm_insight").
   */
  excludeTokens?: string[]
  /**
   * Prefix-uri de tag-uri de exclus (după normalizare). Ex: "from:" filtrează
   * tag-urile de origine injectate automat la cross-pollination ("from:cog", ...).
   */
  excludeTokenPrefixes?: string[]
}

export type PatternSource = "kb" | "brainstorm" | "client_memory"

export interface EmergentTheme {
  /** Tagul / categoria comună, normalizat (lowercase, trim). */
  token: string
  /** Număr de agenți distincți care au atins tema în fereastră. */
  distinctAgents: number
  /** Lista agenților (sortată, pentru stabilitate). */
  agents: string[]
  /** Din ce surse de metadate provine tema. */
  sources: PatternSource[]
  /** Total apariții brute (sumă peste surse, peste agenți). */
  totalOccurrences: number
  /** Prima apariție în fereastră (ISO). */
  firstSeenAt: string
  /** Ultima apariție în fereastră (ISO). */
  lastSeenAt: string
  /** Trail înapoi la rândurile sursă, grupate pe sursă. */
  entryIds: {
    kb: string[]
    brainstorm: string[]
    clientMemory: string[]
  }
}

// ── Helper-i ──────────────────────────────────────────────────────────────────

function toDate(v: string | Date): Date {
  return v instanceof Date ? v : new Date(v)
}

function normalizeToken(raw: string): string {
  return raw.trim().toLowerCase()
}

interface Observation {
  token: string
  agentRole: string
  source: PatternSource
  entryId: string
  at: Date
}

function collectObservations(
  inputs: PatternInputs,
  windowStart: Date,
): Observation[] {
  const out: Observation[] = []

  for (const e of inputs.kbEntries) {
    const at = toDate(e.createdAt)
    if (at < windowStart) continue
    for (const rawTag of e.tags) {
      const token = normalizeToken(rawTag)
      if (!token) continue
      out.push({
        token,
        agentRole: e.agentRole,
        source: "kb",
        entryId: e.id,
        at,
      })
    }
  }

  for (const b of inputs.brainstormIdeas) {
    if (!b.category) continue
    const at = toDate(b.createdAt)
    if (at < windowStart) continue
    const token = normalizeToken(b.category)
    if (!token) continue
    out.push({
      token,
      agentRole: b.generatedBy,
      source: "brainstorm",
      entryId: b.id,
      at,
    })
  }

  for (const m of inputs.clientMemories) {
    const at = toDate(m.createdAt)
    if (at < windowStart) continue
    for (const rawTag of m.tags) {
      const token = normalizeToken(rawTag)
      if (!token) continue
      out.push({
        token,
        agentRole: m.source,
        source: "client_memory",
        entryId: m.id,
        at,
      })
    }
  }

  return out
}

// ── Exportul principal ────────────────────────────────────────────────────────

export function extractPatterns(
  inputs: PatternInputs,
  config: PatternConfig = {},
): EmergentTheme[] {
  const minDistinctAgents = config.minDistinctAgents ?? 3
  const windowDays = config.windowDays ?? 7
  const minPerAgent = config.minPerAgent ?? 1
  const now = config.now ?? new Date()
  const windowStart = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000)
  const excludeTokens = new Set(
    (config.excludeTokens ?? []).map((t) => t.trim().toLowerCase()),
  )
  const excludePrefixes = (config.excludeTokenPrefixes ?? []).map((p) =>
    p.trim().toLowerCase(),
  )
  const isExcluded = (token: string): boolean => {
    if (excludeTokens.has(token)) return true
    for (const p of excludePrefixes) if (token.startsWith(p)) return true
    return false
  }

  let observations = collectObservations(inputs, windowStart)
  if (excludeTokens.size > 0 || excludePrefixes.length > 0) {
    observations = observations.filter((o) => !isExcluded(o.token))
  }
  if (observations.length === 0) return []

  // Grupare pe token
  const byToken = new Map<string, Observation[]>()
  for (const o of observations) {
    const arr = byToken.get(o.token)
    if (arr) arr.push(o)
    else byToken.set(o.token, [o])
  }

  const themes: EmergentTheme[] = []

  for (const [token, obs] of byToken) {
    // Ocurențe per agent
    const perAgent = new Map<string, number>()
    for (const o of obs) {
      perAgent.set(o.agentRole, (perAgent.get(o.agentRole) ?? 0) + 1)
    }

    // Praguri:
    //  - toți agenții care apar trebuie să aibă >= minPerAgent (altfel ignorăm)
    //  - după filtrare, numărul agenților distincți trebuie >= minDistinctAgents
    const validAgents = Array.from(perAgent.entries())
      .filter(([, n]) => n >= minPerAgent)
      .map(([a]) => a)

    if (validAgents.length < minDistinctAgents) continue

    const validAgentSet = new Set(validAgents)
    const validObs = obs.filter((o) => validAgentSet.has(o.agentRole))

    const sourcesSet = new Set<PatternSource>(validObs.map((o) => o.source))
    const times = validObs.map((o) => o.at.getTime())
    const firstSeen = new Date(Math.min(...times))
    const lastSeen = new Date(Math.max(...times))

    const entryIds = {
      kb: validObs.filter((o) => o.source === "kb").map((o) => o.entryId),
      brainstorm: validObs
        .filter((o) => o.source === "brainstorm")
        .map((o) => o.entryId),
      clientMemory: validObs
        .filter((o) => o.source === "client_memory")
        .map((o) => o.entryId),
    }

    themes.push({
      token,
      distinctAgents: validAgents.length,
      agents: validAgents.slice().sort(),
      sources: Array.from(sourcesSet).sort() as PatternSource[],
      totalOccurrences: validObs.length,
      firstSeenAt: firstSeen.toISOString(),
      lastSeenAt: lastSeen.toISOString(),
      entryIds,
    })
  }

  // Sortare: mai mulți agenți distincți → mai sus;
  //         la egalitate, mai multe ocurențe totale → mai sus;
  //         la egalitate finală, alfabetic (stabilitate).
  themes.sort((a, b) => {
    if (b.distinctAgents !== a.distinctAgents)
      return b.distinctAgents - a.distinctAgents
    if (b.totalOccurrences !== a.totalOccurrences)
      return b.totalOccurrences - a.totalOccurrences
    return a.token.localeCompare(b.token)
  })

  return themes
}

/**
 * Sumar compact pentru header cockpit / COSO input.
 */
export function summarizePatterns(themes: EmergentTheme[]): {
  total: number
  topTheme: EmergentTheme | null
  multiSource: number // teme care apar pe ≥2 surse — semnal mai puternic
  avgAgentsPerTheme: number
} {
  if (themes.length === 0) {
    return { total: 0, topTheme: null, multiSource: 0, avgAgentsPerTheme: 0 }
  }
  const multiSource = themes.filter((t) => t.sources.length >= 2).length
  const totalAgents = themes.reduce((s, t) => s + t.distinctAgents, 0)
  return {
    total: themes.length,
    topTheme: themes[0],
    multiSource,
    avgAgentsPerTheme: Math.round((totalAgents / themes.length) * 10) / 10,
  }
}
