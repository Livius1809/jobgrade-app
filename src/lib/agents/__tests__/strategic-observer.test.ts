/**
 * Unit tests pentru strategic-observer.
 *
 * Rulare:
 *   npx ts-node --project tsconfig.test.json src/lib/agents/__tests__/strategic-observer.test.ts
 *
 * Acoperire:
 *  - R1 surge: declanșat + nu declanșat (sub prag/sub multiplicator)
 *  - R1 categorie nouă (baseline 0) → surge
 *  - R2 multi-source: ≥3 surse declanșează, <3 nu
 *  - R3 bridge: token găsit în ≥2 semnale + agenți → HIGH
 *  - R3 tokeni prea scurți ignorați
 *  - R4 internal-only: multiSource ≥ 2 fără corespondență externă
 *  - R4 exclude tokenii deja acoperiți de R3
 *  - Sortare: R3 HIGH înainte de R1/R2 MEDIUM → LOW → R4 LOW
 *  - summarizeStrategicThemes
 */

import { test } from "node:test"
import assert from "node:assert/strict"
import {
  observeStrategically,
  summarizeStrategicThemes,
  type StrategicExternalSignalInput,
  type StrategicEmergentThemeInput,
  type StrategicObserverInputs,
} from "../strategic-observer"

// ── Fixtures ──────────────────────────────────────────────────────────────────

const NOW = new Date("2026-04-05T12:00:00Z")
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 60 * 60 * 1000)
const daysAgo = (d: number) => hoursAgo(d * 24)

let sigSeq = 0
function sig(
  category: string,
  source: string,
  at: Date,
  title: string = "Titlu generic",
  rawContent: string = "Conținut generic.",
): StrategicExternalSignalInput {
  sigSeq += 1
  return {
    id: `sig-${sigSeq}`,
    source,
    category,
    title,
    rawContent,
    capturedAt: at,
  }
}

function theme(
  token: string,
  distinctAgents: number,
  agents: string[],
  sources: string[] = ["kb"],
  totalOccurrences: number = distinctAgents,
  at: Date = hoursAgo(12),
): StrategicEmergentThemeInput {
  return {
    token,
    distinctAgents,
    agents,
    sources,
    totalOccurrences,
    firstSeenAt: at,
    lastSeenAt: at,
  }
}

function inputs(
  externalSignals: StrategicExternalSignalInput[] = [],
  emergentThemes: StrategicEmergentThemeInput[] = [],
): StrategicObserverInputs {
  return { externalSignals, emergentThemes }
}

const CONFIG = { now: NOW }

// ── R1: Category surge ────────────────────────────────────────────────────────

test("R1: surge când windowCount > baseline × 2 și ≥ 5 semnale", () => {
  // Baseline: 7 semnale în 7 zile = 1/zi → așteptat în 24h = 1 semnal
  // Window: 10 semnale în 24h → 10/1 = 10× rata, peste prag × 2
  // Folosim hoursAgo(25, 49, ...) pentru baseline ca să evităm boundary exact pe 24h
  const baselineSigs: StrategicExternalSignalInput[] = []
  for (let i = 0; i < 7; i++) {
    baselineSigs.push(sig("MARKET_HR", "a.ro", hoursAgo(25 + i * 24)))
  }
  const windowSigs: StrategicExternalSignalInput[] = []
  for (let i = 0; i < 10; i++) {
    windowSigs.push(sig("MARKET_HR", "a.ro", hoursAgo(1 + i * 2)))
  }
  const themes = observeStrategically(
    inputs([...baselineSigs, ...windowSigs]),
    CONFIG,
  )
  const r1 = themes.filter((t) => t.rule === "R1_surge")
  assert.equal(r1.length, 1)
  assert.equal(r1[0].evidence.matchCount, 10)
  assert.equal(r1[0].severity, "HIGH") // 10/1 = 10× ≥ 5
})

test("R1: NU surge când ratio < 2", () => {
  // Baseline: 70 semnale în 7 zile = 10/zi. În 24h așteptăm ~10.
  // Window: 15 semnale → ratio 1.5, sub prag × 2
  const baselineSigs: StrategicExternalSignalInput[] = []
  for (let i = 0; i < 70; i++) {
    baselineSigs.push(sig("MARKET_HR", "a.ro", hoursAgo(25 + (i % 7) * 24)))
  }
  const windowSigs: StrategicExternalSignalInput[] = []
  for (let i = 0; i < 15; i++) {
    windowSigs.push(sig("MARKET_HR", "a.ro", hoursAgo(i + 1)))
  }
  const themes = observeStrategically(
    inputs([...baselineSigs, ...windowSigs]),
    CONFIG,
  )
  assert.equal(themes.filter((t) => t.rule === "R1_surge").length, 0)
})

test("R1: categorie NOUĂ cu 0 baseline → surge", () => {
  const windowSigs: StrategicExternalSignalInput[] = []
  for (let i = 0; i < 6; i++) {
    windowSigs.push(sig("TECH_AI", "a.ro", hoursAgo(i + 1)))
  }
  const themes = observeStrategically(inputs(windowSigs), CONFIG)
  const r1 = themes.filter((t) => t.rule === "R1_surge")
  assert.equal(r1.length, 1)
  assert.match(r1[0].rationale, /inactivă|nouă/)
})

test("R1: sub pragul minim (< surgeMinCount) NU declanșează", () => {
  const windowSigs: StrategicExternalSignalInput[] = []
  for (let i = 0; i < 3; i++) {
    windowSigs.push(sig("TECH_AI", "a.ro", hoursAgo(i + 1)))
  }
  const themes = observeStrategically(inputs(windowSigs), CONFIG)
  assert.equal(themes.filter((t) => t.rule === "R1_surge").length, 0)
})

// ── R2: Multi-source concentration ────────────────────────────────────────────

test("R2: 3 surse diferite în 6h → concentration", () => {
  const sigs = [
    sig("LEGAL_REG", "a.ro", hoursAgo(1)),
    sig("LEGAL_REG", "b.ro", hoursAgo(2)),
    sig("LEGAL_REG", "c.ro", hoursAgo(3)),
  ]
  const themes = observeStrategically(inputs(sigs), CONFIG)
  const r2 = themes.filter((t) => t.rule === "R2_concentration")
  assert.equal(r2.length, 1)
  assert.equal(r2[0].confidence, "MEDIUM")
})

test("R2: 2 surse în 6h → NU declanșează", () => {
  const sigs = [
    sig("LEGAL_REG", "a.ro", hoursAgo(1)),
    sig("LEGAL_REG", "a.ro", hoursAgo(2)), // aceeași sursă
    sig("LEGAL_REG", "b.ro", hoursAgo(3)),
  ]
  const themes = observeStrategically(inputs(sigs), CONFIG)
  assert.equal(themes.filter((t) => t.rule === "R2_concentration").length, 0)
})

test("R2: semnale în afara ferestrei de 6h sunt ignorate", () => {
  const sigs = [
    sig("LEGAL_REG", "a.ro", hoursAgo(1)),
    sig("LEGAL_REG", "b.ro", hoursAgo(2)),
    sig("LEGAL_REG", "c.ro", hoursAgo(10)), // > 6h
  ]
  const themes = observeStrategically(inputs(sigs), CONFIG)
  assert.equal(themes.filter((t) => t.rule === "R2_concentration").length, 0)
})

// ── R3: Internal-external bridge ──────────────────────────────────────────────

test("R3: token apare în ≥2 semnale externe + există ca EmergentTheme → HIGH", () => {
  const sigs = [
    sig("LEGAL_REG", "a.ro", hoursAgo(1), "Noua lege pensii 2026"),
    sig("LEGAL_REG", "b.ro", hoursAgo(2), "Analiza pensii și reforma"),
    sig("MARKET_HR", "c.ro", hoursAgo(3), "Salarii și pensii în sectorul public"),
  ]
  const themes = observeStrategically(
    inputs(sigs, [theme("pensii", 5, ["COA", "CFO", "DMA", "EMA", "PMA"])]),
    CONFIG,
  )
  const r3 = themes.filter((t) => t.rule === "R3_bridge")
  assert.equal(r3.length, 1)
  assert.equal(r3[0].confidence, "HIGH")
  assert.equal(r3[0].evidence.matchCount, 3)
  assert.deepEqual(r3[0].evidence.emergentThemeTokens, ["pensii"])
  assert.ok(r3[0].evidence.categoryBreakdown.LEGAL_REG === 2)
  assert.ok(r3[0].evidence.categoryBreakdown.MARKET_HR === 1)
})

test("R3: token cu 1 match extern → NU declanșează", () => {
  const sigs = [sig("LEGAL_REG", "a.ro", hoursAgo(1), "Noua lege pensii")]
  const themes = observeStrategically(
    inputs(sigs, [theme("pensii", 5, ["A", "B", "C", "D", "E"])]),
    CONFIG,
  )
  assert.equal(themes.filter((t) => t.rule === "R3_bridge").length, 0)
})

test("R3: tokens < 4 caractere ignorați (evită match random pe 'ai', 'it', 'rol')", () => {
  const sigs = [
    sig("TECH_AI", "a.ro", hoursAgo(1), "AI revoluționează totul"),
    sig("TECH_AI", "b.ro", hoursAgo(2), "AI în HR e viitorul"),
  ]
  const themes = observeStrategically(
    inputs(sigs, [theme("ai", 10, ["A", "B", "C", "D", "E"])]),
    CONFIG,
  )
  assert.equal(themes.filter((t) => t.rule === "R3_bridge").length, 0)
})

test("R3: whole-word matching — 'camp' NU match 'campanie' / 'camping'", () => {
  const sigs = [
    sig("MARKET_HR", "a.ro", hoursAgo(1), "Campanie de recrutare masivă"),
    sig("MARKET_HR", "b.ro", hoursAgo(2), "Camping corporate pentru team building"),
    sig("CULTURAL_SOCIAL", "c.ro", hoursAgo(3), "Campionat de șah"),
  ]
  const themes = observeStrategically(
    inputs(sigs, [theme("camp", 10, ["A", "B", "C", "D", "E"])]),
    CONFIG,
  )
  // "camp" NU match în "campanie", "camping", "campionat" → 0 bridges
  assert.equal(themes.filter((t) => t.rule === "R3_bridge").length, 0)
})

test("R3: whole-word match respectă delimitatorii (punctuație, spațiu, capăt)", () => {
  const sigs = [
    sig("MARKET_HR", "a.ro", hoursAgo(1), "Discuție despre burnout, esențial."),
    sig("MARKET_HR", "b.ro", hoursAgo(2), "burnout: un subiect serios"),
    sig("LEGAL_REG", "c.ro", hoursAgo(3), "Articol: (burnout) în noua lege"),
  ]
  const themes = observeStrategically(
    inputs(sigs, [theme("burnout", 5, ["A", "B", "C", "D", "E"])]),
    CONFIG,
  )
  const r3 = themes.filter((t) => t.rule === "R3_bridge")
  assert.equal(r3.length, 1)
  assert.equal(r3[0].evidence.matchCount, 3)
})

test("R3: match case-insensitive pe title SAU rawContent", () => {
  const sigs = [
    sig("LEGAL_REG", "a.ro", hoursAgo(1), "BURNOUT în piața muncii"),
    sig(
      "MARKET_HR",
      "b.ro",
      hoursAgo(2),
      "Analiză HR",
      "Tema despre burnout organizațional.",
    ),
  ]
  const themes = observeStrategically(
    inputs(sigs, [theme("burnout", 5, ["A", "B", "C", "D", "E"])]),
    CONFIG,
  )
  assert.equal(themes.filter((t) => t.rule === "R3_bridge").length, 1)
})

// ── R4: Internal-only multi-source ────────────────────────────────────────────

test("R4: EmergentTheme cu sources ≥ 2 fără bridge extern → theme MEDIUM", () => {
  const themes = observeStrategically(
    inputs(
      [],
      [theme("calibrare", 10, ["A", "B", "C", "D"], ["kb", "brainstorm"])],
    ),
    CONFIG,
  )
  const r4 = themes.filter((t) => t.rule === "R4_internal_only")
  assert.equal(r4.length, 1)
  assert.equal(r4[0].confidence, "MEDIUM")
  assert.equal(r4[0].evidence.emergentThemeTokens[0], "calibrare")
})

test("R4: EmergentTheme cu sources.length = 1 NU declanșează (nu e multiSource)", () => {
  const themes = observeStrategically(
    inputs([], [theme("x_only", 10, ["A", "B", "C", "D"], ["kb"])]),
    CONFIG,
  )
  assert.equal(themes.filter((t) => t.rule === "R4_internal_only").length, 0)
})

test("R4: tokenii acoperiți deja de R3 sunt EXCLUSI din R4 (fără dublu-raport)", () => {
  const sigs = [
    sig("LEGAL_REG", "a.ro", hoursAgo(1), "Articol despre burnout"),
    sig("MARKET_HR", "b.ro", hoursAgo(2), "Analiză burnout"),
  ]
  const themes = observeStrategically(
    inputs(sigs, [
      theme("burnout", 10, ["A", "B", "C", "D"], ["kb", "brainstorm"]),
    ]),
    CONFIG,
  )
  assert.equal(themes.filter((t) => t.rule === "R3_bridge").length, 1)
  assert.equal(themes.filter((t) => t.rule === "R4_internal_only").length, 0)
})

// ── Sortare ───────────────────────────────────────────────────────────────────

test("Sortare: R3 HIGH înaintea R1/R2 MEDIUM → LOW → R4", () => {
  // Baseline pentru R1 (TECH_AI surge)
  const baseline: StrategicExternalSignalInput[] = []
  for (let i = 0; i < 7; i++) {
    baseline.push(sig("TECH_AI", "x.ro", daysAgo(1 + i)))
  }
  const sigs: StrategicExternalSignalInput[] = [
    // R3 bridge: "blockchain" în 3 semnale + theme
    sig("LEGAL_REG", "a.ro", hoursAgo(1), "Reglementare blockchain"),
    sig("MARKET_HR", "b.ro", hoursAgo(2), "Specialist blockchain cerut"),
    sig("TECH_AI", "c.ro", hoursAgo(3), "Blockchain și AI"),
    // R1 surge pe TECH_AI (baseline=1/zi, window=10/24h)
    sig("TECH_AI", "x.ro", hoursAgo(4)),
    sig("TECH_AI", "x.ro", hoursAgo(5)),
    sig("TECH_AI", "x.ro", hoursAgo(6)),
    sig("TECH_AI", "x.ro", hoursAgo(7)),
    sig("TECH_AI", "x.ro", hoursAgo(8)),
    sig("TECH_AI", "x.ro", hoursAgo(9)),
    sig("TECH_AI", "x.ro", hoursAgo(10)),
  ]
  const themes = observeStrategically(
    inputs(
      [...baseline, ...sigs],
      [
        theme("blockchain", 7, ["A", "B", "C", "D", "E", "F", "G"]),
        theme(
          "standalone_internal",
          5,
          ["P", "Q", "R", "S", "T"],
          ["kb", "brainstorm"],
        ),
      ],
    ),
    CONFIG,
  )
  // Primul trebuie să fie R3 (HIGH), urmate de MEDIUM (R1/R2/R4)
  assert.ok(themes.length >= 2)
  assert.equal(themes[0].confidence, "HIGH")
  assert.equal(themes[0].rule, "R3_bridge")
})

// ── summarizeStrategicThemes ──────────────────────────────────────────────────

test("summarizeStrategicThemes — numărători corecte + topTheme", () => {
  const sigs = [
    sig("LEGAL_REG", "a.ro", hoursAgo(1), "Burnout în lege"),
    sig("LEGAL_REG", "b.ro", hoursAgo(2), "Analiză burnout"),
  ]
  const themes = observeStrategically(
    inputs(sigs, [
      theme("burnout", 5, ["A", "B", "C", "D", "E"]),
      theme("intern", 5, ["X", "Y", "Z"], ["kb", "brainstorm"]),
    ]),
    CONFIG,
  )
  const summary = summarizeStrategicThemes(themes)
  assert.ok(summary.total >= 2)
  assert.ok(summary.bridges >= 1)
  assert.ok(summary.topTheme !== null)
  assert.equal(summary.topTheme?.confidence, "HIGH")
})

test("summarizeStrategicThemes gol → zerouri + topTheme null", () => {
  const summary = summarizeStrategicThemes([])
  assert.equal(summary.total, 0)
  assert.equal(summary.topTheme, null)
  assert.equal(summary.highConfidence, 0)
})
