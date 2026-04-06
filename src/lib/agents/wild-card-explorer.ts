/**
 * Wild Card Explorer — generare conexiuni neașteptate între semnale.
 *
 * Livrat: 06.04.2026, Increment #7 din roadmap-ul "Living Organization".
 *
 * Complement la:
 *  - Pattern Extractor (#6): caută convergență (≥N agenți pe aceeași temă)
 *  - Strategic Observer (#3): caută corelații logice (extern↔intern)
 *
 * Wild Card caută DIVERGENȚĂ: două semnale care nu au legătură aparentă dar
 * co-apar într-o fereastră scurtă în surse diferite. Scopul e să provoace
 * gândirea laterală — "de ce apar leadership și compliance împreună?"
 *
 * Principii:
 *  - FUNCȚIE PURĂ — zero I/O, deterministă cu `config.now`
 *  - Zero LLM — juxtapunerea e mecanică, interpretarea e la Owner
 *  - Randomizare controlabilă cu seed pentru reproductibilitate
 *  - Output mic (max N wild cards) — calitate > cantitate
 *
 * Algoritmul:
 *  1. Colectează tokens din surse diferite (externe, KB, brainstorm)
 *  2. Calculează co-apariție temporală (aceeași zi) între surse DIFERITE
 *  3. Filtrează perechi cu co-apariție frecventă (>threshold = banal)
 *  4. Sortează restul pe "surpriză" (raritate × recency)
 *  5. Returnează top N perechi cu context
 */

// ── Tipuri publice ────────────────────────────────────────────────────────────

export interface WildCardInput {
  token: string
  source: "external" | "internal_kb" | "internal_brainstorm" | "outcome"
  category?: string
  timestamp: string | Date
  detail?: string // titlu sau context scurt
}

export interface WildCard {
  /** Pereche de tokens juxtapuse */
  pair: [string, string]
  /** Din ce surse vin */
  sources: [string, string]
  /** Scor de surpriză (0-1, 1 = maxim neașteptat) */
  surpriseScore: number
  /** Câte zile au co-apărut în fereastră */
  coOccurrenceDays: number
  /** Frecvența individuală a fiecărui token (cât de comun e fiecare) */
  individualFrequency: [number, number]
  /** Întrebare generativă sugerată */
  question: string
  /** Primul co-occurrence timestamp */
  firstCoOccurrence: string
}

export interface WildCardConfig {
  /** Fereastra de observare în zile. Default 7. */
  windowDays?: number
  /** Max wild cards returnate. Default 5. */
  maxResults?: number
  /** Prag maxim de co-occurrence frecvență: peste asta e „banal". Default 3. */
  banalThreshold?: number
  /** Tokens de exclus (prea generice). */
  excludeTokens?: string[]
  /** Override „acum" pentru determinism. */
  now?: Date
  /** Seed pentru randomizare deterministă. Default 42. */
  seed?: number
}

// ── Helper-i ──────────────────────────────────────────────────────────────────

function toDate(v: string | Date): Date {
  return v instanceof Date ? v : new Date(v)
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function normalizeToken(raw: string): string {
  return raw.trim().toLowerCase()
}

/** PRNG simplu (mulberry32) pentru reproductibilitate fără crypto */
function mulberry32(seed: number): () => number {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Tokens prea generice care apar în aproape orice context
const DEFAULT_EXCLUDE = new Set([
  "general", "update", "misc", "other", "none", "default",
  "test", "todo", "info", "data", "system", "config",
  // Verbe/adverbe românești frecvente din titluri RSS
  "poate", "foarte", "pentru", "despre", "după", "între",
  "continuă", "extindă", "anunță", "prezintă", "devine",
  "această", "astfel", "totuși", "acesta", "acestei",
  "România", "românia", "române", "bucuresti",
])

// Întrebări-șablon per combinație de surse
const QUESTION_TEMPLATES: Record<string, string> = {
  "external+internal_kb": "Ce legătură ar putea exista între tendința externă «{a}» și cunoștința internă «{b}»?",
  "external+internal_brainstorm": "Ideea internă «{b}» ar putea fi un răspuns la semnalul extern «{a}»?",
  "external+outcome": "Metrica «{b}» ar putea fi afectată de tendința externă «{a}»?",
  "internal_kb+internal_brainstorm": "Cunoștința «{a}» și ideea «{b}» indică aceeași direcție neexplorată?",
  "internal_kb+outcome": "Evoluția metricii «{b}» reflectă ce-am învățat despre «{a}»?",
  "internal_brainstorm+outcome": "Brainstorm-ul pe «{a}» ar putea influența metrica «{b}»?",
}

function generateQuestion(a: string, b: string, srcA: string, srcB: string): string {
  const key = [srcA, srcB].sort().join("+")
  const template = QUESTION_TEMPLATES[key] ?? `Ce legătură neașteptată ar putea exista între «{a}» și «{b}»?`
  return template.replace("{a}", a).replace("{b}", b)
}

// ── Funcția principală ───────────────────────────────────────────────────────

export function exploreWildCards(
  inputs: WildCardInput[],
  config: WildCardConfig = {},
): WildCard[] {
  const {
    windowDays = 7,
    maxResults = 5,
    banalThreshold = 3,
    excludeTokens = [],
    now = new Date(),
    seed = 42,
  } = config

  const windowStart = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000)
  const excludeSet = new Set([
    ...DEFAULT_EXCLUDE,
    ...excludeTokens.map(t => normalizeToken(t)),
  ])

  // 1. Filtrare + normalizare
  const items = inputs
    .filter(i => toDate(i.timestamp) >= windowStart)
    .map(i => ({
      token: normalizeToken(i.token),
      source: i.source,
      day: dayKey(toDate(i.timestamp)),
      timestamp: toDate(i.timestamp),
      detail: i.detail,
    }))
    .filter(i => i.token.length >= 3 && !excludeSet.has(i.token))

  if (items.length < 2) return []

  // 2. Index: token → { surse, zile, frecvență }
  const tokenIndex = new Map<string, {
    sources: Set<string>
    days: Set<string>
    count: number
    firstSeen: Date
  }>()
  for (const item of items) {
    let entry = tokenIndex.get(item.token)
    if (!entry) {
      entry = { sources: new Set(), days: new Set(), count: 0, firstSeen: item.timestamp }
      tokenIndex.set(item.token, entry)
    }
    entry.sources.add(item.source)
    entry.days.add(item.day)
    entry.count++
    if (item.timestamp < entry.firstSeen) entry.firstSeen = item.timestamp
  }

  // 3. Construiește perechi cross-source
  // Doar tokens care apar în cel puțin 2 surse diferite sunt candidați
  const crossSourceTokens = Array.from(tokenIndex.entries())
    .filter(([, v]) => v.sources.size >= 2)
    .map(([token, v]) => ({ token, ...v }))

  if (crossSourceTokens.length < 2) {
    // Fallback: perechile din surse diferite, chiar dacă fiecare token e single-source
    // Generăm perechi (tokenA din sursa X, tokenB din sursa Y) care co-apar în aceeași zi
  }

  // 4. Co-apariție temporală: perechi de tokens din surse diferite pe aceeași zi
  // Indexăm per zi → set de tokens cu sursa lor
  const dayIndex = new Map<string, Map<string, Set<string>>>() // day → token → sources
  for (const item of items) {
    let dayMap = dayIndex.get(item.day)
    if (!dayMap) { dayMap = new Map(); dayIndex.set(item.day, dayMap) }
    let sources = dayMap.get(item.token)
    if (!sources) { sources = new Set(); dayMap.set(item.token, sources) }
    sources.add(item.source)
  }

  // Generăm perechi
  interface PairCandidate {
    a: string; b: string
    srcA: string; srcB: string
    coOccurrenceDays: number
    freqA: number; freqB: number
    firstCo: Date
  }

  const pairMap = new Map<string, PairCandidate>()

  for (const [day, dayMap] of dayIndex) {
    const tokens = Array.from(dayMap.entries())
    for (let i = 0; i < tokens.length; i++) {
      for (let j = i + 1; j < tokens.length; j++) {
        const [tokA, srcSetA] = tokens[i]
        const [tokB, srcSetB] = tokens[j]

        // Trebuie surse diferite
        const commonSources = new Set([...srcSetA].filter(s => srcSetB.has(s)))
        if (commonSources.size === srcSetA.size && commonSources.size === srcSetB.size) continue

        // Alege sursa dominantă per token
        const srcA = [...srcSetA].find(s => !srcSetB.has(s)) ?? [...srcSetA][0]
        const srcB = [...srcSetB].find(s => !srcSetA.has(s)) ?? [...srcSetB][0]
        if (srcA === srcB) continue

        const key = [tokA, tokB].sort().join("||")
        const existing = pairMap.get(key)
        const dayDate = new Date(day)
        if (existing) {
          existing.coOccurrenceDays++
          if (dayDate < existing.firstCo) existing.firstCo = dayDate
        } else {
          pairMap.set(key, {
            a: tokA, b: tokB,
            srcA, srcB,
            coOccurrenceDays: 1,
            freqA: tokenIndex.get(tokA)?.count ?? 1,
            freqB: tokenIndex.get(tokB)?.count ?? 1,
            firstCo: dayDate,
          })
        }
      }
    }
  }

  // 5. Filtrare: exclude perechi prea frecvente (banale)
  const candidates = Array.from(pairMap.values())
    .filter(p => p.coOccurrenceDays <= banalThreshold)

  if (candidates.length === 0) return []

  // 6. Scor de surpriză: raritate (inversul frecvenței) × recency
  const maxFreq = Math.max(...candidates.map(p => p.freqA + p.freqB), 1)
  const rng = mulberry32(seed)

  const scored = candidates.map(p => {
    const raritate = 1 - (p.freqA + p.freqB) / (maxFreq * 2)
    const recency = 1 - (now.getTime() - p.firstCo.getTime()) / (windowDays * 86400000)
    const jitter = rng() * 0.1 // 10% randomness
    const surprise = Math.max(0, Math.min(1, raritate * 0.5 + Math.max(0, recency) * 0.3 + (1 / (p.coOccurrenceDays + 1)) * 0.1 + jitter))
    return { ...p, surprise }
  })

  // 7. Sortare pe surpriză desc, top N
  scored.sort((a, b) => b.surprise - a.surprise)

  return scored.slice(0, maxResults).map(p => ({
    pair: [p.a, p.b],
    sources: [p.srcA, p.srcB],
    surpriseScore: Math.round(p.surprise * 1000) / 1000,
    coOccurrenceDays: p.coOccurrenceDays,
    individualFrequency: [p.freqA, p.freqB],
    question: generateQuestion(p.a, p.b, p.srcA, p.srcB),
    firstCoOccurrence: p.firstCo.toISOString(),
  }))
}

/**
 * Sumar rapid pentru rapoarte.
 */
export function summarizeWildCards(cards: WildCard[]): {
  total: number
  avgSurprise: number
  topQuestion: string | null
} {
  if (cards.length === 0) return { total: 0, avgSurprise: 0, topQuestion: null }
  const avg = cards.reduce((s, c) => s + c.surpriseScore, 0) / cards.length
  return {
    total: cards.length,
    avgSurprise: Math.round(avg * 1000) / 1000,
    topQuestion: cards[0].question,
  }
}
