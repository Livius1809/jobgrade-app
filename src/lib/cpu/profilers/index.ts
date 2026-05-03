/**
 * CPU Profiler Hierarchy — Motor de Profilare Ierarhic
 *
 * 5 niveluri de integrare a cunoașterii:
 *
 * N1: DIMENSIONAL — o dimensiune specifică (competențe, motivație, personalitate)
 * N2: INDIVIDUAL — sinteza omului complet
 * N3: ORGANIZAȚIONAL — firma ca organism
 * N4: RELAȚIONAL — cum interacționează entitățile
 * N5: ECOSISTEMIC — totul cu totul
 *
 * Regula de aur: nivelul superior NU contrazice inferiorul. Îl CONTEXTUALIZEAZĂ.
 *
 * Acest modul e COMPONENTA CPU — shared între toate businessurile.
 * JG, edu4life, orice business periferic consumă din el.
 *
 * ═══════════════════════════════════════════════════════════════
 * INVENTAR COMPONENTE EXISTENTE (extrase din JG):
 * ═══════════════════════════════════════════════════════════════
 *
 * N1 (Dimensional):
 *   - Herrmann HBDI (72 itemi, 4 cadrane) → src/lib/b2c/questionnaires/hermann-hbdi.ts
 *   - MBTI (95 itemi, 16 tipuri) → src/lib/b2c/questionnaires/mbti.ts
 *   - Score Normalizer (CPI260, ESQ-2, AMI, PASAT → T-score) → src/lib/profiling/score-normalizer.ts
 *   - Evaluare 6 criterii JG (scoring table) → src/lib/evaluation/scoring-table.ts
 *   - Criterion descriptions → src/lib/evaluation/criterion-descriptions.ts
 *
 * N2 (Individual):
 *   - Profiler Engine B2C (agregator UserProfile) → src/lib/b2c/profiler-engine.ts
 *   - Profiler Shadow (observator invizibil cross-card) → src/lib/b2c/profiler-shadow.ts
 *   - Coherence Guard (anti-proxy, anti-sharing) → src/lib/b2c/coherence-guard.ts
 *   - Cognitive Adapter (adaptare per Herrmann) → src/lib/b2c/journaling/cognitive-adapter.ts
 *   - Dosage Calibrator (calibrare profunzime insight) → src/lib/b2c/journaling/dosage-calibrator.ts
 *   - Matching Engine B2C↔B2B (compatibilitate 6 criterii) → src/lib/b2c/matching-engine.ts
 *
 * N3 (Organizațional):
 *   - JE Process Engine (lifecycle evaluare) → src/lib/evaluation/je-process-engine.ts
 *   - Pitariu Grades (formarea grilei salariale) → src/lib/evaluation/pitariu-grades.ts
 *   - Anti-Gaming (protecție tabel scorare) → src/lib/evaluation/anti-gaming.ts
 *   - Culture Audit (7 dimensiuni) → src/app/api/v1/culture/audit/route.ts
 *   - Culture RO Calibration → src/lib/agents/cultural-calibration-ro.ts
 *   - Personnel Evaluation → src/app/api/v1/personnel-evaluation/route.ts
 *   - Psychometrics Battery → src/app/api/v1/psychometrics/route.ts
 *   - Benchmark Engine → src/lib/benchmark/benchmark-engine.ts
 *
 * N4 (Relațional):
 *   - Sociogram Balint → src/app/api/v1/sociogram/route.ts
 *   - Supply Chain Map → src/lib/bridge/supply-chain-map.ts
 *   - Matching Engine (cerere↔ofertă) → src/lib/bridge/matching-engine.ts
 *   - Market Intelligence → src/lib/bridge/market-intelligence.ts
 *
 * N5 (Ecosistemic):
 *   - Motor Teritorial → src/lib/crawl/territorial-analysis.ts + report + balance
 *   - Claude Opportunity Analysis → src/lib/crawl/claude-opportunity-analysis.ts
 *   - Opportunity Filters L1+L3 → src/lib/crawl/opportunity-filters.ts
 *   - Territory Compare → src/app/api/v1/territory/compare/route.ts
 *   - Territory Trends → src/app/api/v1/territory/trends/route.ts
 * ═══════════════════════════════════════════════════════════════
 */

// Re-export niveluri
export { DimensionalProfiler, type DimensionalProfile } from "./n1-dimensional"
export { IndividualProfiler, type IndividualProfile } from "./n2-individual"
export { OrganizationalProfiler, type OrganizationalProfile } from "./n3-organizational"
export { RelationalProfiler, type RelationalProfile } from "./n4-relational"
export { EcosystemicProfiler, type EcosystemicProfile } from "./n5-ecosystemic"

// Tipul complet — un profil la orice nivel
export type ProfileLevel = 1 | 2 | 3 | 4 | 5

export interface ProfileRequest {
  level: ProfileLevel
  /** ID-ul entității de profilat */
  entityId: string
  /** Tipul entității */
  entityType: "PERSON" | "ORGANIZATION" | "RELATIONSHIP" | "TERRITORY" | "ECOSYSTEM"
  /** Context suplimentar */
  context?: Record<string, any>
}
