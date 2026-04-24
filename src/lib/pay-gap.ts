/**
 * Pay Gap Calculations — EU Directive 2023/970, Art. 9
 * Implements all 7 mandatory indicators with k-anonymity (k≥5)
 *
 * PRINCIPIU LEGAL: Pay gap se calculează între angajați care:
 * 1. Fac MUNCĂ EGALĂ (scor egal din Modul 1, chiar dacă criteriile diferă)
 * 2. Au ACEEAȘI NORMĂ DE LUCRU (Art. 3 alin. 1 lit. e)
 *
 * Comparația se face PE GRUP (aceeași categorie de muncă egală × normă),
 * nu pe toți angajații la grămadă.
 */

import { EmployeeSalaryRecord } from "@/generated/prisma"

const K_ANONYMITY = 5

type Record = Pick<
  EmployeeSalaryRecord,
  | "gender"
  | "baseSalary"
  | "variableComp"
  | "department"
  | "jobCategory"
  | "salaryGradeId"
> & {
  workSchedule?: string | null
  evaluationScore?: number | null
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2
}

function payGap(female: number, male: number): number | null {
  if (male === 0) return null
  return parseFloat((((male - female) / male) * 100).toFixed(2))
}

export interface PayGapIndicators {
  // Art. 9.1(a) — gender pay gap in mean base salary
  a_mean_base_gap: number | null
  // Art. 9.1(b) — gender pay gap in mean supplementary/variable
  b_mean_variable_gap: number | null
  // Art. 9.1(c) — gender pay gap in median base salary
  c_median_base_gap: number | null
  // Art. 9.1(d) — gender pay gap in median supplementary/variable
  d_median_variable_gap: number | null
  // Art. 9.1(e) — proportion receiving supplementary/variable pay
  e_variable_proportion: { male: number | null; female: number | null }
  // Art. 9.1(f) — proportion in each salary quartile
  f_quartile_distribution: {
    q1: { male: number | null; female: number | null }
    q2: { male: number | null; female: number | null }
    q3: { male: number | null; female: number | null }
    q4: { male: number | null; female: number | null }
  }
  // Art. 9.1(g) — pay gap per job category / salary grade
  g_by_grade: Array<{
    grade: string
    mean_base_gap: number | null
    count_male: number
    count_female: number
    suppressed: boolean
  }>
  // Metadata
  total_employees: number
  total_male: number
  total_female: number
  mean_base_male: number
  mean_base_female: number
}

export function calculatePayGapIndicators(records: Record[]): PayGapIndicators {
  const male = records.filter((r) => r.gender === "MALE")
  const female = records.filter((r) => r.gender === "FEMALE")

  // Helper: suppress if group smaller than k
  const safeGap = (f: number[], m: number[], fn: (arr: number[]) => number) => {
    if (f.length < K_ANONYMITY || m.length < K_ANONYMITY) return null
    return payGap(fn(f), fn(m))
  }

  const safeProportion = (subset: number, total: number): number | null => {
    if (total < K_ANONYMITY) return null
    return parseFloat(((subset / total) * 100).toFixed(1))
  }

  // (a) mean base
  const a_mean_base_gap = safeGap(
    female.map((r) => r.baseSalary),
    male.map((r) => r.baseSalary),
    (arr) => arr.reduce((s, v) => s + v, 0) / arr.length
  )

  // (b) mean variable
  const a_mean_var_gap = safeGap(
    female.map((r) => r.variableComp),
    male.map((r) => r.variableComp),
    (arr) => arr.reduce((s, v) => s + v, 0) / arr.length
  )

  // (c) median base
  const c_median_base_gap = safeGap(
    female.map((r) => r.baseSalary),
    male.map((r) => r.baseSalary),
    median
  )

  // (d) median variable
  const d_median_var_gap = safeGap(
    female.map((r) => r.variableComp),
    male.map((r) => r.variableComp),
    median
  )

  // (e) proportion receiving variable pay
  const maleWithVar = male.filter((r) => r.variableComp > 0).length
  const femaleWithVar = female.filter((r) => r.variableComp > 0).length
  const e_variable_proportion = {
    male: safeProportion(maleWithVar, male.length),
    female: safeProportion(femaleWithVar, female.length),
  }

  // (f) quartile distribution
  const allSorted = [...records].sort((a, b) => a.baseSalary - b.baseSalary)
  const n = allSorted.length
  const q1 = allSorted.slice(0, Math.floor(n / 4))
  const q2 = allSorted.slice(Math.floor(n / 4), Math.floor(n / 2))
  const q3 = allSorted.slice(Math.floor(n / 2), Math.floor((3 * n) / 4))
  const q4 = allSorted.slice(Math.floor((3 * n) / 4))

  const quartileProportion = (quartile: typeof allSorted) => {
    const m = quartile.filter((r) => r.gender === "MALE").length
    const f = quartile.filter((r) => r.gender === "FEMALE").length
    return {
      male: safeProportion(m, quartile.length),
      female: safeProportion(f, quartile.length),
    }
  }

  const f_quartile_distribution = {
    q1: quartileProportion(q1),
    q2: quartileProportion(q2),
    q3: quartileProportion(q3),
    q4: quartileProportion(q4),
  }

  // (g) by salary grade / job category
  const grades = new Set(records.map((r) => r.salaryGradeId ?? r.jobCategory ?? "Necategorizat"))
  const g_by_grade = Array.from(grades).map((grade) => {
    const gradeRecords = records.filter(
      (r) => (r.salaryGradeId ?? r.jobCategory ?? "Necategorizat") === grade
    )
    const gm = gradeRecords.filter((r) => r.gender === "MALE")
    const gf = gradeRecords.filter((r) => r.gender === "FEMALE")
    const suppressed = gm.length < K_ANONYMITY || gf.length < K_ANONYMITY

    const mean_base_gap = suppressed
      ? null
      : payGap(
          gf.reduce((s, r) => s + r.baseSalary, 0) / gf.length,
          gm.reduce((s, r) => s + r.baseSalary, 0) / gm.length
        )

    return {
      grade,
      mean_base_gap,
      count_male: gm.length,
      count_female: gf.length,
      suppressed,
    }
  })

  const meanBase = (arr: Record[]) =>
    arr.length ? arr.reduce((s, r) => s + r.baseSalary, 0) / arr.length : 0

  return {
    a_mean_base_gap,
    b_mean_variable_gap: a_mean_var_gap,
    c_median_base_gap,
    d_median_variable_gap: d_median_var_gap,
    e_variable_proportion,
    f_quartile_distribution,
    g_by_grade,
    total_employees: records.length,
    total_male: male.length,
    total_female: female.length,
    mean_base_male: parseFloat(meanBase(male).toFixed(2)),
    mean_base_female: parseFloat(meanBase(female).toFixed(2)),
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPARAȚIE PE MUNCĂ EGALĂ — Art. 4 Directiva EU 2023/970
//
// Muncă egală = scor total egal din Modul 1 (evaluare posturi).
// Chiar dacă structura pe criterii diferă, scorurile totale egale
// înseamnă valoare egală a muncii.
//
// Comparația se face pe GRUP:
//   - Aceeași normă de lucru (workSchedule)
//   - Același scor evaluare (evaluationScore ± toleranță)
// ═══════════════════════════════════════════════════════════════════════════

export interface EqualWorkGroup {
  /** Descriere grup: "Scor 1500-1600 · Normă 8h" */
  groupLabel: string
  workSchedule: string
  scoreRange: string
  scoreMin: number
  scoreMax: number
  maleCount: number
  femaleCount: number
  maleAvgSalary: number
  femaleAvgSalary: number
  gap: number | null // % (pozitiv = bărbați câștigă mai mult)
  flag: "OK" | "ATENTIE" | "SEMNIFICATIV"
  suppressed: boolean
  employees: Array<{
    employeeCode: string
    gender: string
    salary: number
    score: number
    jobCategory: string | null
  }>
}

export interface EqualWorkAnalysis {
  groups: EqualWorkGroup[]
  totalGroups: number
  groupsWithGap: number
  averageGap: number | null
  missingScoreCount: number
  comparisonType: "intern" | "benchmark" | "both"
}

/**
 * Analiză pay gap pe muncă egală.
 * Grupează angajații pe (scor evaluare ± toleranță) × (normă de lucru).
 * Compară F vs M în fiecare grup.
 *
 * @param scoreTolerance — toleranță punctaj (default 100 = ±50 puncte)
 */
export function analyzeEqualWork(
  records: Record[],
  scoreTolerance: number = 100,
): EqualWorkAnalysis {
  // Filtrăm doar records cu scor
  const withScore = records.filter(r => r.evaluationScore != null && r.evaluationScore > 0)
  const missingScoreCount = records.length - withScore.length

  if (withScore.length === 0) {
    return { groups: [], totalGroups: 0, groupsWithGap: 0, averageGap: null, missingScoreCount, comparisonType: "intern" }
  }

  // Sortăm după scor
  const sorted = [...withScore].sort((a, b) => (a.evaluationScore ?? 0) - (b.evaluationScore ?? 0))

  // Construim grupuri: scoruri similare (±toleranță) × normă
  const groups: EqualWorkGroup[] = []
  const scoreMin = sorted[0].evaluationScore!
  const scoreMax = sorted[sorted.length - 1].evaluationScore!

  for (let start = scoreMin; start <= scoreMax; start += scoreTolerance) {
    const end = start + scoreTolerance
    const schedules = new Set(withScore.map(r => r.workSchedule ?? "8h"))

    for (const schedule of schedules) {
      const groupRecords = withScore.filter(r =>
        r.evaluationScore! >= start && r.evaluationScore! < end &&
        (r.workSchedule ?? "8h") === schedule
      )

      if (groupRecords.length < 2) continue

      const males = groupRecords.filter(r => r.gender === "MALE")
      const females = groupRecords.filter(r => r.gender === "FEMALE")

      const suppressed = males.length < 2 || females.length < 2
      const maleAvg = males.length > 0 ? males.reduce((s, r) => s + r.baseSalary, 0) / males.length : 0
      const femaleAvg = females.length > 0 ? females.reduce((s, r) => s + r.baseSalary, 0) / females.length : 0

      const rawGap = suppressed ? null : payGap(femaleAvg, maleAvg)
      const gap = rawGap !== null ? parseFloat(rawGap.toFixed(1)) : null

      let flag: "OK" | "ATENTIE" | "SEMNIFICATIV" = "OK"
      if (gap !== null) {
        if (Math.abs(gap) >= 10) flag = "SEMNIFICATIV"
        else if (Math.abs(gap) >= 5) flag = "ATENTIE"
      }

      groups.push({
        groupLabel: `Scor ${start}-${end} · Normă ${schedule}`,
        workSchedule: schedule,
        scoreRange: `${start}-${end}`,
        scoreMin: start,
        scoreMax: end,
        maleCount: males.length,
        femaleCount: females.length,
        maleAvgSalary: Math.round(maleAvg),
        femaleAvgSalary: Math.round(femaleAvg),
        gap,
        flag,
        suppressed,
        employees: groupRecords.map(r => ({
          employeeCode: (r as any).employeeCode ?? "—",
          gender: r.gender,
          salary: r.baseSalary,
          score: r.evaluationScore!,
          jobCategory: r.jobCategory ?? null,
        })),
      })
    }
  }

  const validGroups = groups.filter(g => g.gap !== null)
  const groupsWithGap = validGroups.filter(g => g.flag !== "OK").length
  const averageGap = validGroups.length > 0
    ? parseFloat((validGroups.reduce((s, g) => s + Math.abs(g.gap!), 0) / validGroups.length).toFixed(1))
    : null

  return {
    groups,
    totalGroups: groups.length,
    groupsWithGap,
    averageGap,
    missingScoreCount,
    comparisonType: "intern",
  }
}
