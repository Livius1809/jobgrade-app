/**
 * Unit tests pentru pattern-extractor.
 *
 * Rulare:
 *   npx ts-node --project tsconfig.test.json src/lib/agents/__tests__/pattern-extractor.test.ts
 *
 * Acoperire:
 *  - Prag minDistinctAgents (3 → theme, 2 → nimic)
 *  - Fereastra windowDays (in-window vs out-of-window)
 *  - Prag minPerAgent
 *  - Teme din surse multiple (KBEntry + BrainstormIdea)
 *  - Agenți diferiți cu tag-uri diferite → 0 themes
 *  - Sortare: mai mulți agenți → mai sus
 *  - Normalizare token (case-insensitive, trim)
 *  - Sumar summarizePatterns
 *  - Trail entryIds grupat corect pe sursă
 */

import { test } from "node:test"
import assert from "node:assert/strict"
import {
  extractPatterns,
  summarizePatterns,
  type KBEntryInput,
  type BrainstormIdeaInput,
  type ClientMemoryInput,
  type PatternInputs,
} from "../pattern-extractor"

// ── Fixture helpers ───────────────────────────────────────────────────────────

const NOW = new Date("2026-04-05T12:00:00Z")
const daysAgo = (n: number) =>
  new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000)

let kbSeq = 0
function kb(agentRole: string, tags: string[], at: Date = NOW): KBEntryInput {
  kbSeq += 1
  return { id: `kb-${kbSeq}`, agentRole, tags, createdAt: at }
}

let bSeq = 0
function bi(
  generatedBy: string,
  category: string | null,
  at: Date = NOW,
): BrainstormIdeaInput {
  bSeq += 1
  return {
    id: `bi-${bSeq}`,
    generatedBy,
    category,
    createdAt: at,
  }
}

let cmSeq = 0
function cm(
  source: string,
  tags: string[],
  at: Date = NOW,
): ClientMemoryInput {
  cmSeq += 1
  return { id: `cm-${cmSeq}`, source, tags, createdAt: at }
}

function inputs(
  kbEntries: KBEntryInput[] = [],
  brainstormIdeas: BrainstormIdeaInput[] = [],
  clientMemories: ClientMemoryInput[] = [],
): PatternInputs {
  return { kbEntries, brainstormIdeas, clientMemories }
}

const CONFIG = { now: NOW, windowDays: 7, minDistinctAgents: 3, minPerAgent: 1 }

// ── Teste ─────────────────────────────────────────────────────────────────────

test("3 agenți cu același tag în fereastră → 1 theme", () => {
  const themes = extractPatterns(
    inputs([
      kb("EMA", ["burnout"]),
      kb("CCO", ["burnout"]),
      kb("DMA", ["burnout"]),
    ]),
    CONFIG,
  )
  assert.equal(themes.length, 1)
  assert.equal(themes[0].token, "burnout")
  assert.equal(themes[0].distinctAgents, 3)
  assert.deepEqual(themes[0].agents, ["CCO", "DMA", "EMA"])
  assert.deepEqual(themes[0].sources, ["kb"])
  assert.equal(themes[0].totalOccurrences, 3)
  assert.deepEqual(themes[0].entryIds.kb.sort(), ["kb-1", "kb-2", "kb-3"])
})

test("2 agenți cu același tag → 0 themes (sub prag)", () => {
  const themes = extractPatterns(
    inputs([kb("EMA", ["burnout"]), kb("CCO", ["burnout"])]),
    CONFIG,
  )
  assert.equal(themes.length, 0)
})

test("3 agenți dar unul în afara ferestrei → 0 themes", () => {
  const themes = extractPatterns(
    inputs([
      kb("EMA", ["burnout"]),
      kb("CCO", ["burnout"]),
      kb("DMA", ["burnout"], daysAgo(15)), // out of 7-day window
    ]),
    CONFIG,
  )
  assert.equal(themes.length, 0)
})

test("Temă din 2 surse (KBEntry + BrainstormIdea) → 1 theme cu sources=['brainstorm','kb']", () => {
  const themes = extractPatterns(
    inputs(
      [kb("EMA", ["pricing_anxiety"]), kb("CCO", ["pricing_anxiety"])],
      [bi("DMA", "pricing_anxiety")],
    ),
    CONFIG,
  )
  assert.equal(themes.length, 1)
  assert.equal(themes[0].distinctAgents, 3)
  assert.deepEqual(themes[0].sources, ["brainstorm", "kb"])
  assert.equal(themes[0].entryIds.kb.length, 2)
  assert.equal(themes[0].entryIds.brainstorm.length, 1)
})

test("Temă din toate 3 surse → sources=['brainstorm','client_memory','kb']", () => {
  const themes = extractPatterns(
    inputs(
      [kb("EMA", ["legal_change"])],
      [bi("CCO", "legal_change")],
      [cm("DMA", ["legal_change"])],
    ),
    CONFIG,
  )
  assert.equal(themes.length, 1)
  assert.deepEqual(themes[0].sources, ["brainstorm", "client_memory", "kb"])
})

test("3 agenți cu tag-uri diferite → 0 themes", () => {
  const themes = extractPatterns(
    inputs([
      kb("EMA", ["alpha"]),
      kb("CCO", ["beta"]),
      kb("DMA", ["gamma"]),
    ]),
    CONFIG,
  )
  assert.equal(themes.length, 0)
})

test("Sortare: theme cu 5 agenți înainte de theme cu 3", () => {
  const themes = extractPatterns(
    inputs(
      [
        // token "small" — 3 agenți
        kb("EMA", ["small"]),
        kb("CCO", ["small"]),
        kb("DMA", ["small"]),
        // token "big" — 5 agenți
        kb("COA", ["big"]),
        kb("CFO", ["big"]),
        kb("CCO", ["big"]),
        kb("PMA", ["big"]),
        kb("QLA", ["big"]),
      ],
    ),
    CONFIG,
  )
  assert.equal(themes.length, 2)
  assert.equal(themes[0].token, "big")
  assert.equal(themes[0].distinctAgents, 5)
  assert.equal(themes[1].token, "small")
  assert.equal(themes[1].distinctAgents, 3)
})

test("Normalizare token: case-insensitive + trim → 'Burnout', 'burnout', '  BURNOUT  ' = același", () => {
  const themes = extractPatterns(
    inputs([
      kb("EMA", ["Burnout"]),
      kb("CCO", ["burnout"]),
      kb("DMA", ["  BURNOUT  "]),
    ]),
    CONFIG,
  )
  assert.equal(themes.length, 1)
  assert.equal(themes[0].token, "burnout")
  assert.equal(themes[0].distinctAgents, 3)
})

test("minPerAgent=2 filtrează agenți cu o singură apariție", () => {
  const themes = extractPatterns(
    inputs([
      kb("EMA", ["x"]),
      kb("EMA", ["x"]), // 2x — valid
      kb("CCO", ["x"]), // 1x — invalid la minPerAgent=2
      kb("DMA", ["x"]),
      kb("DMA", ["x"]), // 2x — valid
      kb("COA", ["x"]),
      kb("COA", ["x"]), // 2x — valid
    ]),
    { ...CONFIG, minPerAgent: 2 },
  )
  assert.equal(themes.length, 1)
  assert.equal(themes[0].distinctAgents, 3) // EMA, DMA, COA (CCO filtrat)
  assert.deepEqual(themes[0].agents, ["COA", "DMA", "EMA"])
})

test("Tags null / empty / whitespace-only sunt ignorate", () => {
  const themes = extractPatterns(
    inputs([
      kb("EMA", ["", "   ", "real_tag"]),
      kb("CCO", ["real_tag"]),
      kb("DMA", ["real_tag", ""]),
    ]),
    CONFIG,
  )
  assert.equal(themes.length, 1)
  assert.equal(themes[0].token, "real_tag")
  assert.equal(themes[0].totalOccurrences, 3)
})

test("BrainstormIdea cu category=null e ignorat", () => {
  const themes = extractPatterns(
    inputs(
      [],
      [
        bi("EMA", "strategy"),
        bi("CCO", "strategy"),
        bi("DMA", null), // ignored
      ],
    ),
    CONFIG,
  )
  assert.equal(themes.length, 0) // doar 2 agenți, DMA ignorat
})

test("Acelasi agent apare de multe ori — contează ca 1 distinct", () => {
  const themes = extractPatterns(
    inputs([
      kb("EMA", ["x"]),
      kb("EMA", ["x"]),
      kb("EMA", ["x"]),
      kb("EMA", ["x"]),
      kb("EMA", ["x"]),
    ]),
    CONFIG,
  )
  assert.equal(themes.length, 0) // distinctAgents = 1 < 3
})

test("summarizePatterns — multiSource count + topTheme", () => {
  const themes = extractPatterns(
    inputs(
      [
        // single-source theme
        kb("EMA", ["single"]),
        kb("CCO", ["single"]),
        kb("DMA", ["single"]),
        // multi-source theme (kb + brainstorm)
        kb("COA", ["multi"]),
        kb("CFO", ["multi"]),
      ],
      [bi("PMA", "multi")],
    ),
    CONFIG,
  )
  const summary = summarizePatterns(themes)
  assert.equal(summary.total, 2)
  assert.ok(summary.topTheme !== null)
  assert.equal(summary.multiSource, 1)
  assert.equal(summary.avgAgentsPerTheme, 3)
})

test("excludeTokens filtrează tag-uri exacte", () => {
  const themes = extractPatterns(
    inputs([
      kb("EMA", ["broadcast", "real_theme"]),
      kb("CCO", ["broadcast", "real_theme"]),
      kb("DMA", ["broadcast", "real_theme"]),
    ]),
    { ...CONFIG, excludeTokens: ["broadcast"] },
  )
  assert.equal(themes.length, 1)
  assert.equal(themes[0].token, "real_theme")
})

test("excludeTokenPrefixes filtrează toate tag-urile care încep cu prefix", () => {
  const themes = extractPatterns(
    inputs([
      kb("EMA", ["from:coa", "from:cog", "real"]),
      kb("CCO", ["from:coa", "real"]),
      kb("DMA", ["from:ema", "real"]),
    ]),
    { ...CONFIG, excludeTokenPrefixes: ["from:"] },
  )
  assert.equal(themes.length, 1)
  assert.equal(themes[0].token, "real")
  assert.equal(themes[0].distinctAgents, 3)
})

test("summarizePatterns gol → zerouri + topTheme null", () => {
  const summary = summarizePatterns([])
  assert.equal(summary.total, 0)
  assert.equal(summary.topTheme, null)
  assert.equal(summary.multiSource, 0)
  assert.equal(summary.avgAgentsPerTheme, 0)
})
