/**
 * benchmark/index.ts — Punct de intrare modul benchmark salarial
 */

export {
  type MarketDataPoint,
  type BenchmarkComparison,
  type MarketSummary,
  JOB_FAMILIES,
  type JobFamily,
  GRADE_SENIORITY_MAP,
  SENIORITY_GRADE_MAP,
  COR_JOB_FAMILY,
  getMarketPosition,
  compaRatio,
  getRecommendation,
  compareSalaryToMarket,
} from "./market-data"

export {
  type BulkImportResult,
  type BenchmarkQuery,
  type PayrollBenchmarkInput,
  type YoYTrend,
  importMarketData,
  queryBenchmarks,
  getLatestMedians,
  compareBulk,
  getMarketSummaries,
  getYoYTrends,
} from "./benchmark-engine"

export { SEED_DATA_RO_2025 } from "./seed-ro-2025"
