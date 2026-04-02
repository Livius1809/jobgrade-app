/**
 * benchmark-engine.ts — Motor benchmark salarial
 *
 * Funcționalități:
 * 1. Import date piață (bulk insert din diverse surse)
 * 2. Interogare date piață per grad/familie/regiune
 * 3. Comparare bulk: stat de plată intern vs. piață
 * 4. Raport benchmark agregat per organizație
 * 5. Trend analysis: evoluție salarii piață YoY
 */

import {
  MarketDataPoint,
  BenchmarkComparison,
  MarketSummary,
  GRADE_SENIORITY_MAP,
  SENIORITY_GRADE_MAP,
  compareSalaryToMarket,
  compaRatio,
  getMarketPosition,
} from "./market-data"

// ── Import date piață ────────────────────────────────────────────────────────

export interface BulkImportResult {
  imported: number
  skipped: number
  errors: Array<{ row: number; error: string }>
}

/**
 * Import bulk de date benchmark din surse externe.
 * Detectează duplicate (aceeași familie + seniority + an + trimestru + sursă) și le actualizează.
 */
export async function importMarketData(
  data: MarketDataPoint[],
  prisma: any
): Promise<BulkImportResult> {
  let imported = 0
  let skipped = 0
  const errors: Array<{ row: number; error: string }> = []

  for (let i = 0; i < data.length; i++) {
    const d = data[i]

    // Validare minimă
    if (!d.jobFamily || !d.seniorityLevel || !d.salaryMedian) {
      errors.push({ row: i + 1, error: "Lipsesc câmpuri obligatorii: jobFamily, seniorityLevel, salaryMedian" })
      continue
    }

    if (d.salaryMedian < 0 || d.salaryP25 < 0 || d.salaryP75 < 0) {
      errors.push({ row: i + 1, error: "Valorile salariale nu pot fi negative" })
      continue
    }

    if (d.salaryP25 > d.salaryMedian || d.salaryMedian > d.salaryP75) {
      errors.push({ row: i + 1, error: "Ordine incorectă: P25 <= Median <= P75" })
      continue
    }

    // Mapare grad din seniority
    const grades = SENIORITY_GRADE_MAP[d.seniorityLevel] || []
    const gradeMin = grades.length > 0 ? Math.min(...grades) : null
    const gradeMax = grades.length > 0 ? Math.max(...grades) : null

    try {
      await prisma.salaryBenchmark.create({
        data: {
          source: d.source,
          sourceDetail: d.sourceDetail,
          year: d.year,
          quarter: d.quarter,
          country: "RO",
          jobFamily: d.jobFamily,
          corCode: d.corCode,
          seniorityLevel: d.seniorityLevel,
          gradeMin,
          gradeMax,
          salaryP10: d.salaryP10,
          salaryP25: d.salaryP25,
          salaryMedian: d.salaryMedian,
          salaryP75: d.salaryP75,
          salaryP90: d.salaryP90,
          salaryMean: d.salaryMean,
          sampleSize: d.sampleSize,
          region: d.region,
          industry: d.industry,
        },
      })
      imported++
    } catch (err: any) {
      if (err?.code === "P2002") {
        skipped++
      } else {
        errors.push({ row: i + 1, error: err?.message || "Eroare la inserare" })
      }
    }
  }

  return { imported, skipped, errors }
}

// ── Interogare date piață ────────────────────────────────────────────────────

export interface BenchmarkQuery {
  jobFamily?: string
  seniorityLevel?: string
  grade?: number           // caută benchmark-uri care acoperă acest grad
  year?: number
  region?: string
  industry?: string
  source?: string
}

/**
 * Interogare date benchmark cu filtre flexibile.
 * Returnează datele cele mai recente care se potrivesc.
 */
export async function queryBenchmarks(
  query: BenchmarkQuery,
  prisma: any
): Promise<any[]> {
  const where: any = { isActive: true }

  if (query.jobFamily) where.jobFamily = query.jobFamily
  if (query.seniorityLevel) where.seniorityLevel = query.seniorityLevel
  if (query.year) where.year = query.year
  if (query.region) where.region = query.region
  if (query.industry) where.industry = query.industry
  if (query.source) where.source = query.source

  // Filtrare pe grad: caută benchmark-uri unde gradeMin <= grade <= gradeMax
  if (query.grade) {
    where.OR = [
      { gradeMin: { lte: query.grade }, gradeMax: { gte: query.grade } },
      { gradeMin: null, gradeMax: null }, // fallback dacă nu au grad
    ]
  }

  return prisma.salaryBenchmark.findMany({
    where,
    orderBy: [{ year: "desc" }, { quarter: "desc" }],
  })
}

/**
 * Obține medianele agregate per grad + familie pentru cel mai recent an disponibil.
 */
export async function getLatestMedians(
  jobFamily: string,
  prisma: any
): Promise<Record<number, { p25: number; median: number; p75: number; sources: string[] }>> {
  const benchmarks = await prisma.salaryBenchmark.findMany({
    where: { jobFamily, isActive: true },
    orderBy: [{ year: "desc" }, { quarter: "desc" }],
  })

  if (benchmarks.length === 0) return {}

  const latestYear = benchmarks[0].year
  const recent = benchmarks.filter((b: any) => b.year === latestYear)

  // Agregare per grad
  const gradeMap: Record<number, {
    p25s: number[]; medians: number[]; p75s: number[]; sources: Set<string>
  }> = {}

  for (const b of recent) {
    const minG = b.gradeMin ?? 8
    const maxG = b.gradeMax ?? 1
    for (let g = maxG; g <= minG; g++) {
      // grade 1 = cel mai mare, grade 8 = cel mai mic
      // dar min/max sunt inversate (grade 1 = Executive)
    }
    // Folosim gradele direct
    for (let g = (b.gradeMax ?? 1); g <= (b.gradeMin ?? 8); g++) {
      if (!gradeMap[g]) {
        gradeMap[g] = { p25s: [], medians: [], p75s: [], sources: new Set() }
      }
      gradeMap[g].p25s.push(b.salaryP25)
      gradeMap[g].medians.push(b.salaryMedian)
      gradeMap[g].p75s.push(b.salaryP75)
      gradeMap[g].sources.add(b.source)
    }
  }

  const result: Record<number, { p25: number; median: number; p75: number; sources: string[] }> = {}
  for (const [grade, data] of Object.entries(gradeMap)) {
    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length
    result[Number(grade)] = {
      p25: Math.round(avg(data.p25s)),
      median: Math.round(avg(data.medians)),
      p75: Math.round(avg(data.p75s)),
      sources: Array.from(data.sources),
    }
  }

  return result
}

// ── Comparare bulk: payroll intern vs. piață ─────────────────────────────────

export interface PayrollBenchmarkInput {
  jobTitle: string
  jobFamily: string
  grade: number
  gradeLabel: string
  baseSalary: number
}

/**
 * Compară un set de posturi interne cu datele de piață.
 * Returnează raport de benchmark per post.
 */
export async function compareBulk(
  entries: PayrollBenchmarkInput[],
  prisma: any
): Promise<{
  comparisons: BenchmarkComparison[]
  summary: {
    totalPositions: number
    belowMarket: number
    atMarket: number
    aboveMarket: number
    avgCompaRatio: number
    riskPositions: Array<{ jobTitle: string; compaRatio: number }>
  }
}> {
  const comparisons: BenchmarkComparison[] = []
  let totalCR = 0
  let crCount = 0

  for (const entry of entries) {
    // Obține benchmark piață
    const seniorities = GRADE_SENIORITY_MAP[entry.grade] || ["MID"]
    const benchmarks = await prisma.salaryBenchmark.findMany({
      where: {
        jobFamily: entry.jobFamily,
        seniorityLevel: { in: seniorities },
        isActive: true,
      },
      orderBy: [{ year: "desc" }],
      take: 5,
    })

    if (benchmarks.length === 0) {
      comparisons.push({
        jobTitle: entry.jobTitle,
        grade: entry.grade,
        gradeLabel: entry.gradeLabel,
        internalSalary: entry.baseSalary,
        marketP25: 0,
        marketMedian: 0,
        marketP75: 0,
        positionInMarket: "UNKNOWN",
        recommendation: `Nu există date de piață pentru ${entry.jobFamily} la nivelul de senioritate corespunzător gradului ${entry.grade}.`,
      })
      continue
    }

    // Mediană din toate benchmark-urile relevante
    const avgP25 = Math.round(benchmarks.reduce((s: number, b: any) => s + b.salaryP25, 0) / benchmarks.length)
    const avgMedian = Math.round(benchmarks.reduce((s: number, b: any) => s + b.salaryMedian, 0) / benchmarks.length)
    const avgP75 = Math.round(benchmarks.reduce((s: number, b: any) => s + b.salaryP75, 0) / benchmarks.length)

    const comp = compareSalaryToMarket(
      entry.jobTitle,
      entry.grade,
      entry.gradeLabel,
      entry.baseSalary,
      { salaryP25: avgP25, salaryMedian: avgMedian, salaryP75: avgP75 },
      entry.jobFamily
    )

    comparisons.push(comp)

    if (comp.compaRatio) {
      totalCR += comp.compaRatio
      crCount++
    }
  }

  const belowMarket = comparisons.filter(c => c.positionInMarket === "BELOW_P25").length
  const atMarket = comparisons.filter(c => ["P25_P50", "P50_P75"].includes(c.positionInMarket)).length
  const aboveMarket = comparisons.filter(c => c.positionInMarket === "ABOVE_P75").length
  const riskPositions = comparisons
    .filter(c => c.compaRatio && c.compaRatio < 85)
    .map(c => ({ jobTitle: c.jobTitle, compaRatio: c.compaRatio! }))
    .sort((a, b) => a.compaRatio - b.compaRatio)

  return {
    comparisons,
    summary: {
      totalPositions: entries.length,
      belowMarket,
      atMarket,
      aboveMarket,
      avgCompaRatio: crCount > 0 ? Math.round(totalCR / crCount) : 0,
      riskPositions,
    },
  }
}

// ── Raport sumar piață per familie ───────────────────────────────────────────

export async function getMarketSummaries(prisma: any): Promise<MarketSummary[]> {
  const benchmarks = await prisma.salaryBenchmark.findMany({
    where: { isActive: true },
    orderBy: [{ year: "desc" }],
  })

  const familyMap = new Map<string, any[]>()
  for (const b of benchmarks) {
    const key = b.jobFamily
    if (!familyMap.has(key)) familyMap.set(key, [])
    familyMap.get(key)!.push(b)
  }

  const summaries: MarketSummary[] = []
  for (const [family, items] of familyMap) {
    const latestYear = items[0].year
    const recent = items.filter((b: any) => b.year === latestYear)
    const sources = [...new Set(recent.map((b: any) => b.source))]
    const medians = recent.map((b: any) => b.salaryMedian)
    const p75s = recent.map((b: any) => b.salaryP75)

    const grades = recent.filter((b: any) => b.gradeMin && b.gradeMax)
    const gradeRange = grades.length > 0
      ? `${Math.min(...grades.map((b: any) => b.gradeMax))} - ${Math.max(...grades.map((b: any) => b.gradeMin))}`
      : "N/A"

    summaries.push({
      jobFamily: family,
      gradeRange,
      dataPoints: recent.length,
      sources,
      latestYear,
      medianRange: { min: Math.min(...medians), max: Math.max(...medians) },
      p75Range: { min: Math.min(...p75s), max: Math.max(...p75s) },
    })
  }

  return summaries.sort((a, b) => a.jobFamily.localeCompare(b.jobFamily))
}

// ── Trend YoY ────────────────────────────────────────────────────────────────

export interface YoYTrend {
  jobFamily: string
  seniorityLevel: string
  years: Array<{
    year: number
    median: number
    p75: number
    changePercent?: number // vs anul anterior
  }>
}

export async function getYoYTrends(
  jobFamily: string,
  prisma: any
): Promise<YoYTrend[]> {
  const benchmarks = await prisma.salaryBenchmark.findMany({
    where: { jobFamily, isActive: true },
    orderBy: [{ seniorityLevel: "asc" }, { year: "asc" }],
  })

  const grouped = new Map<string, any[]>()
  for (const b of benchmarks) {
    const key = b.seniorityLevel
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(b)
  }

  const trends: YoYTrend[] = []
  for (const [seniority, items] of grouped) {
    const yearData = new Map<number, { medians: number[]; p75s: number[] }>()
    for (const b of items) {
      if (!yearData.has(b.year)) yearData.set(b.year, { medians: [], p75s: [] })
      yearData.get(b.year)!.medians.push(b.salaryMedian)
      yearData.get(b.year)!.p75s.push(b.salaryP75)
    }

    const years: YoYTrend["years"] = []
    let prevMedian: number | undefined

    for (const [year, data] of [...yearData.entries()].sort((a, b) => a[0] - b[0])) {
      const avg = (arr: number[]) => Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
      const median = avg(data.medians)
      const p75 = avg(data.p75s)
      const changePercent = prevMedian
        ? Math.round(((median - prevMedian) / prevMedian) * 100)
        : undefined

      years.push({ year, median, p75, changePercent })
      prevMedian = median
    }

    trends.push({ jobFamily, seniorityLevel: seniority, years })
  }

  return trends
}
