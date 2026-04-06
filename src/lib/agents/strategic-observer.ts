/**
 * Strategic Observer (COSO) — sense-making peste semnalele externe și temele
 * interne emergente. Produce StrategicTheme — interpretări contextualizate cu
 * direcție, confidence și acțiune propusă.
 *
 * Livrat: 05.04.2026, Increment #3 din roadmap-ul "Living Organization".
 *
 * Poziție în arhitectură:
 *   ExternalSignal (#1+#2) ─┐
 *                           ├─► STRATEGIC OBSERVER (#3) ─► StrategicTheme[]
 *   EmergentTheme (#6) ─────┘
 *
 * Principii:
 *  - FUNCȚIE PURĂ — zero I/O, deterministă cu `config.now`
 *  - 4 reguli explicite, aplicate secvențial, fiecare produce candidate theme
 *  - Zero LLM la MVP — R3 e singurul text-match și e literal substring,
 *    nu NLP. Dacă vrem interpretare profundă (sentiment, direction inferată),
 *    adăugăm un al doilea strat opțional care trimite StrategicTheme la Claude
 *    ca input deja distilat.
 *
 * Reguli:
 *   R1 Category surge                   — volumul dintr-o categorie > baseline × N
 *   R2 Multi-source concentration       — ≥K surse diferite pe aceeași categorie într-o fereastră scurtă
 *   R3 Internal-external bridge         — tokenul unei EmergentTheme apare în ≥M semnale externe
 *   R4 Internal-only multi-source theme — EmergentTheme cu sources.length ≥ 2 fără corespondență externă
 *
 * Sortare finală: confidence HIGH → MEDIUM → LOW; la egalitate severity
 * desc; apoi număr de evidențe desc.
 */

// ── Tipuri publice ────────────────────────────────────────────────────────────

export type StrategicDirection = "THREAT" | "OPPORTUNITY" | "AMBIGUOUS"
export type StrategicConfidence = "LOW" | "MEDIUM" | "HIGH"
export type StrategicSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"

export interface StrategicExternalSignalInput {
  id: string
  source: string
  category: string
  title: string
  rawContent: string
  capturedAt: string | Date
  publishedAt?: string | Date | null
}

export interface StrategicEmergentThemeInput {
  token: string
  distinctAgents: number
  agents: string[]
  sources: string[]
  totalOccurrences: number
  firstSeenAt: string | Date
  lastSeenAt: string | Date
}

export interface StrategicObserverInputs {
  externalSignals: StrategicExternalSignalInput[]
  emergentThemes: StrategicEmergentThemeInput[]
}

export interface StrategicObserverConfig {
  /** Fereastra principală pentru surge detection (ore). Default 24. */
  windowHours?: number
  /** Perioada de baseline pentru comparație (zile). Default 7. */
  baselineDays?: number
  /** Multiplicator surge (count / baseline_expected). Default 2. */
  surgeMultiplier?: number
  /** Minim absolut de semnale pentru a declanșa R1. Default 5. */
  surgeMinCount?: number
  /** Fereastra pentru R2 multi-source (ore). Default 6. */
  multiSourceWindowHours?: number
  /** Min surse distincte pentru R2. Default 3. */
  multiSourceMinSources?: number
  /** Min matches externe pentru R3 bridge. Default 2. */
  bridgeMinMatches?: number
  /** Override „acum" pentru teste deterministe. */
  now?: Date
}

export interface StrategicTheme {
  id: string
  rule: "R1_surge" | "R2_concentration" | "R3_bridge" | "R4_internal_only"
  title: string
  direction: StrategicDirection
  confidence: StrategicConfidence
  severity: StrategicSeverity
  rationale: string
  evidence: {
    externalSignalIds: string[]
    emergentThemeTokens: string[]
    categoryBreakdown: Record<string, number>
    matchCount: number
  }
  actionProposed: string
  firstDetectedAt: string
  lastUpdatedAt: string
}

// ── Helper-i ──────────────────────────────────────────────────────────────────

function toDate(v: string | Date | null | undefined): Date | null {
  if (!v) return null
  return v instanceof Date ? v : new Date(v)
}

function normalizeText(s: string): string {
  return s.toLowerCase()
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * Text match cu word boundary — tokenul trebuie să fie cuvânt întreg în text,
 * nu substring arbitrar. Elimină false positives gen:
 *  - "camp" matching "campanie"
 *  - "test" matching "contestare" / "testimonial"
 *  - "eliberare" matching "eliberat din funcție" (context diferit)
 *
 * Case-insensitive, operează pe text deja normalizat (lowercased).
 * Romanian diacritics OK: \b funcționează pe caractere Unicode.
 */
function containsWholeWord(text: string, token: string): boolean {
  // Word boundary clasic \b acoperă [a-zA-Z0-9_]. Pentru diacritice românești
  // (ă, â, î, ș, ț) folosim o regex mai explicită: vecinătate non-literă.
  const escaped = escapeRegex(token)
  const re = new RegExp(`(^|[^\\p{L}\\p{N}_])${escaped}([^\\p{L}\\p{N}_]|$)`, "iu")
  return re.test(text)
}

function firstLast(dates: Date[]): { first: Date; last: Date } | null {
  if (dates.length === 0) return null
  let first = dates[0]
  let last = dates[0]
  for (const d of dates) {
    if (d < first) first = d
    if (d > last) last = d
  }
  return { first, last }
}

// ── Regulile ─────────────────────────────────────────────────────────────────

interface RuleContext {
  cfg: Required<Omit<StrategicObserverConfig, "now">> & { now: Date }
  inputs: StrategicObserverInputs
}

// ── R1: Category surge ───────────────────────────────────────────────────────
function r1CategorySurge(ctx: RuleContext): StrategicTheme[] {
  const { cfg, inputs } = ctx
  const windowStart = new Date(
    cfg.now.getTime() - cfg.windowHours * 60 * 60 * 1000,
  )
  const baselineStart = new Date(
    windowStart.getTime() - cfg.baselineDays * 24 * 60 * 60 * 1000,
  )

  // Signals în window-ul curent
  const windowSignals = inputs.externalSignals.filter((s) => {
    const d = toDate(s.capturedAt)
    return d !== null && d >= windowStart
  })

  // Signals în baseline (pre-window)
  const baselineSignals = inputs.externalSignals.filter((s) => {
    const d = toDate(s.capturedAt)
    return d !== null && d >= baselineStart && d < windowStart
  })

  const windowByCat = new Map<string, StrategicExternalSignalInput[]>()
  for (const s of windowSignals) {
    const arr = windowByCat.get(s.category)
    if (arr) arr.push(s)
    else windowByCat.set(s.category, [s])
  }

  const baselineByCat = new Map<string, number>()
  for (const s of baselineSignals) {
    baselineByCat.set(s.category, (baselineByCat.get(s.category) ?? 0) + 1)
  }

  const themes: StrategicTheme[] = []

  for (const [category, sigs] of windowByCat) {
    const windowCount = sigs.length
    if (windowCount < cfg.surgeMinCount) continue

    // Baseline-ul e pe `baselineDays` zile. Rata zilnică medie:
    const baselineCount = baselineByCat.get(category) ?? 0
    const baselineDailyRate = baselineCount / cfg.baselineDays
    // Așteptăm în windowHours: baselineDailyRate * (windowHours / 24)
    const expected = baselineDailyRate * (cfg.windowHours / 24)

    // Surge: count > expected * multiplier (și expected > 0, altfel e "nou"
    // ceea ce tot e interesant — tratăm separat).
    const isSurge =
      expected > 0
        ? windowCount > expected * cfg.surgeMultiplier
        : windowCount >= cfg.surgeMinCount // categorie nouă/inactivă → surge

    if (!isSurge) continue

    const ratio = expected > 0 ? windowCount / expected : Infinity
    const severity: StrategicSeverity =
      ratio >= 5 ? "HIGH" : ratio >= 3 ? "MEDIUM" : "LOW"
    const confidence: StrategicConfidence =
      windowCount >= 10 ? "MEDIUM" : "LOW"

    const fl = firstLast(
      sigs.map((s) => toDate(s.capturedAt)).filter((d): d is Date => d !== null),
    )!
    themes.push({
      id: `R1_surge:${category}`,
      rule: "R1_surge",
      title: `Surge în categoria ${category}: ${windowCount} semnale în ${cfg.windowHours}h`,
      direction: "AMBIGUOUS",
      confidence,
      severity,
      rationale:
        expected > 0
          ? `Volumul de semnale în ${category} (${windowCount}) depășește de ${ratio.toFixed(1)}× rata așteptată (${expected.toFixed(1)}) calculată pe ${cfg.baselineDays} zile baseline.`
          : `Categoria ${category} era inactivă în baseline-ul de ${cfg.baselineDays} zile și acum apar ${windowCount} semnale — fie categorie nouă, fie reactivare.`,
      evidence: {
        externalSignalIds: sigs.map((s) => s.id),
        emergentThemeTokens: [],
        categoryBreakdown: { [category]: windowCount },
        matchCount: windowCount,
      },
      actionProposed: `Verifică manual cele ${Math.min(3, windowCount)} cele mai recente semnale din ${category}. Dacă pattern-ul persistă 48h, escaladează ca temă strategică.`,
      firstDetectedAt: fl.first.toISOString(),
      lastUpdatedAt: fl.last.toISOString(),
    })
  }

  return themes
}

// ── R2: Multi-source concentration ───────────────────────────────────────────
function r2MultiSourceConcentration(ctx: RuleContext): StrategicTheme[] {
  const { cfg, inputs } = ctx
  const start = new Date(
    cfg.now.getTime() - cfg.multiSourceWindowHours * 60 * 60 * 1000,
  )

  const recent = inputs.externalSignals.filter((s) => {
    const d = toDate(s.capturedAt)
    return d !== null && d >= start
  })

  const byCategory = new Map<string, StrategicExternalSignalInput[]>()
  for (const s of recent) {
    const arr = byCategory.get(s.category)
    if (arr) arr.push(s)
    else byCategory.set(s.category, [s])
  }

  const themes: StrategicTheme[] = []

  for (const [category, sigs] of byCategory) {
    const distinctSources = new Set(sigs.map((s) => s.source))
    if (distinctSources.size < cfg.multiSourceMinSources) continue

    const fl = firstLast(
      sigs.map((s) => toDate(s.capturedAt)).filter((d): d is Date => d !== null),
    )!
    const sourcesArr = Array.from(distinctSources).sort()
    const severity: StrategicSeverity =
      distinctSources.size >= 5 ? "HIGH" : "MEDIUM"

    themes.push({
      id: `R2_concentration:${category}`,
      rule: "R2_concentration",
      title: `Concentrație multi-sursă în ${category}: ${distinctSources.size} surse în ${cfg.multiSourceWindowHours}h`,
      direction: "AMBIGUOUS",
      confidence: "MEDIUM",
      severity,
      rationale: `În ultimele ${cfg.multiSourceWindowHours}h, ${distinctSources.size} surse diferite (${sourcesArr.join(", ")}) au raportat în ${category}. Când mai multe surse independente converg pe același subiect, e semnal slab că se întâmplă ceva relevant.`,
      evidence: {
        externalSignalIds: sigs.map((s) => s.id),
        emergentThemeTokens: [],
        categoryBreakdown: { [category]: sigs.length },
        matchCount: sigs.length,
      },
      actionProposed: `Scanează rapid titlurile semnalelor din ${category} pentru a identifica subiectul comun. Dacă e material, promovează la temă strategică.`,
      firstDetectedAt: fl.first.toISOString(),
      lastUpdatedAt: fl.last.toISOString(),
    })
  }

  return themes
}

// ── R3: Internal-external bridge (singurul loc cu text match) ────────────────
function r3InternalExternalBridge(
  ctx: RuleContext,
): { themes: StrategicTheme[]; matchedTokens: Set<string> } {
  const { cfg, inputs } = ctx
  const windowStart = new Date(
    cfg.now.getTime() - cfg.windowHours * 60 * 60 * 1000,
  )

  // Semnale în fereastra principală
  const windowSignals = inputs.externalSignals.filter((s) => {
    const d = toDate(s.capturedAt)
    return d !== null && d >= windowStart
  })

  // Pre-computăm textul normalizat per semnal (title + rawContent lowered)
  const signalTexts = windowSignals.map((s) => ({
    signal: s,
    text: normalizeText(`${s.title} ${s.rawContent}`),
  }))

  const themes: StrategicTheme[] = []
  const matchedTokens = new Set<string>()

  for (const theme of inputs.emergentThemes) {
    const token = theme.token.trim().toLowerCase()
    // Tokenii prea scurți produc match-uri random (ex: "ai", "it")
    if (token.length < 4) continue

    const matches = signalTexts.filter(({ text }) =>
      containsWholeWord(text, token),
    )
    if (matches.length < cfg.bridgeMinMatches) continue

    matchedTokens.add(token)

    const categoryBreakdown: Record<string, number> = {}
    for (const m of matches) {
      categoryBreakdown[m.signal.category] =
        (categoryBreakdown[m.signal.category] ?? 0) + 1
    }

    // Severity bazat pe amplitudine combinată
    const combinedScore = matches.length + theme.distinctAgents
    const severity: StrategicSeverity =
      combinedScore >= 20
        ? "HIGH"
        : combinedScore >= 10
          ? "MEDIUM"
          : "LOW"

    const fl = firstLast([
      ...matches
        .map((m) => toDate(m.signal.capturedAt))
        .filter((d): d is Date => d !== null),
      toDate(theme.firstSeenAt),
      toDate(theme.lastSeenAt),
    ].filter((d): d is Date => d !== null))

    themes.push({
      id: `R3_bridge:${token}`,
      rule: "R3_bridge",
      title: `Convergență internă+externă: "${token}" (${matches.length} surse externe, ${theme.distinctAgents} agenți)`,
      direction: "AMBIGUOUS",
      confidence: "HIGH",
      severity,
      rationale: `Tokenul "${token}" apare în ${matches.length} semnale externe din ${Object.keys(categoryBreakdown).length} categorii ȘI în KB/brainstorm/memory la ${theme.distinctAgents} agenți distincți (${theme.agents.slice(0, 5).join(", ")}${theme.agents.length > 5 ? "..." : ""}). Convergența dintre mediul extern și cunoașterea internă sugerează o temă live, cu relevanță imediată.`,
      evidence: {
        externalSignalIds: matches.map((m) => m.signal.id),
        emergentThemeTokens: [token],
        categoryBreakdown,
        matchCount: matches.length,
      },
      actionProposed: `Owner: examinează 2-3 semnale externe (cele mai recente pe ${token}) + întreabă agenții cu multe ocurențe pe token. Decide dacă e temă strategică de urmărit formal.`,
      firstDetectedAt: (fl?.first ?? cfg.now).toISOString(),
      lastUpdatedAt: (fl?.last ?? cfg.now).toISOString(),
    })
  }

  return { themes, matchedTokens }
}

// ── R4: Internal-only multi-source theme ─────────────────────────────────────
function r4InternalOnly(
  ctx: RuleContext,
  alreadyMatched: Set<string>,
): StrategicTheme[] {
  const themes: StrategicTheme[] = []

  for (const theme of ctx.inputs.emergentThemes) {
    const token = theme.token.trim().toLowerCase()
    if (alreadyMatched.has(token)) continue // covered by R3
    if (theme.sources.length < 2) continue // need multiSource ≥ 2

    const severity: StrategicSeverity =
      theme.distinctAgents >= 8
        ? "MEDIUM"
        : "LOW"

    themes.push({
      id: `R4_internal:${token}`,
      rule: "R4_internal_only",
      title: `Temă internă multi-sursă: "${token}" (${theme.distinctAgents} agenți, ${theme.sources.length} surse de metadate)`,
      direction: "AMBIGUOUS",
      confidence: "MEDIUM",
      severity,
      rationale: `Tema "${token}" emerge la ${theme.distinctAgents} agenți pe ${theme.sources.length} surse distincte de metadate (${theme.sources.join(", ")}), dar nu are corespondență în semnalele externe din fereastra curentă. Posibil insight intern care încă nu a ajuns în mediu sau care e specific platformei.`,
      evidence: {
        externalSignalIds: [],
        emergentThemeTokens: [token],
        categoryBreakdown: {},
        matchCount: theme.totalOccurrences,
      },
      actionProposed: `Monitorizează în următoarele 7 zile. Dacă un semnal extern confirmă tema, se va escalada automat la R3 în rulările viitoare.`,
      firstDetectedAt:
        toDate(theme.firstSeenAt)?.toISOString() ?? ctx.cfg.now.toISOString(),
      lastUpdatedAt:
        toDate(theme.lastSeenAt)?.toISOString() ?? ctx.cfg.now.toISOString(),
    })
  }

  return themes
}

// ── Exportul principal ────────────────────────────────────────────────────────

export function observeStrategically(
  inputs: StrategicObserverInputs,
  config: StrategicObserverConfig = {},
): StrategicTheme[] {
  const cfg = {
    windowHours: config.windowHours ?? 24,
    baselineDays: config.baselineDays ?? 7,
    surgeMultiplier: config.surgeMultiplier ?? 2,
    surgeMinCount: config.surgeMinCount ?? 5,
    multiSourceWindowHours: config.multiSourceWindowHours ?? 6,
    multiSourceMinSources: config.multiSourceMinSources ?? 3,
    bridgeMinMatches: config.bridgeMinMatches ?? 2,
    now: config.now ?? new Date(),
  }
  const ctx: RuleContext = { cfg, inputs }

  // R3 primul ca să știm ce tokens sunt deja "bridged" și R4 să le excludă
  const { themes: r3Themes, matchedTokens } = r3InternalExternalBridge(ctx)
  const r1Themes = r1CategorySurge(ctx)
  const r2Themes = r2MultiSourceConcentration(ctx)
  const r4Themes = r4InternalOnly(ctx, matchedTokens)

  const all = [...r3Themes, ...r1Themes, ...r2Themes, ...r4Themes]

  // Sortare: confidence desc (HIGH > MEDIUM > LOW), apoi severity desc, apoi
  // matchCount desc, apoi title alfabetic pentru stabilitate.
  const confOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 }
  const sevOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
  all.sort((a, b) => {
    const c = confOrder[a.confidence] - confOrder[b.confidence]
    if (c !== 0) return c
    const s = sevOrder[a.severity] - sevOrder[b.severity]
    if (s !== 0) return s
    const m = b.evidence.matchCount - a.evidence.matchCount
    if (m !== 0) return m
    return a.title.localeCompare(b.title)
  })

  return all
}

/**
 * Sumar compact pentru cockpit / ntfy digest.
 */
export function summarizeStrategicThemes(themes: StrategicTheme[]): {
  total: number
  highConfidence: number
  bridges: number
  surges: number
  internalOnly: number
  topTheme: StrategicTheme | null
} {
  return {
    total: themes.length,
    highConfidence: themes.filter((t) => t.confidence === "HIGH").length,
    bridges: themes.filter((t) => t.rule === "R3_bridge").length,
    surges: themes.filter((t) => t.rule === "R1_surge").length,
    internalOnly: themes.filter((t) => t.rule === "R4_internal_only").length,
    topTheme: themes[0] ?? null,
  }
}
