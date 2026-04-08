/**
 * salary-clustering.ts — Clusterizare salarială prin Jenks Natural Breaks
 *
 * Algoritmul:
 * 1. Preia toate intrările PayrollEntry pentru un tenant
 * 2. Sortează crescător după totalMonthlyGross
 * 3. Identifică clase naturale prin Jenks Natural Breaks (simplificat)
 * 4. Atribuie gradeCalculated fiecărei intrări (1 = cel mai mic, N = cel mai mare)
 * 5. Returnează clasele cu statistici + anomalii
 */

import type { PrismaClient } from "@/generated/prisma"

// ── Tipuri ──────────────────────────────────────────────────────────────────

export interface SalaryClass {
  grade: number
  min: number
  max: number
  median: number
  mean: number
  count: number
  entryIds: string[]
}

export interface Anomaly {
  entryId: string
  jobTitle: string
  department: string
  totalMonthlyGross: number
  assignedGrade: number
  classMedian: number
  deviationPercent: number
  tip: "SUB_CLASA" | "SUPRA_CLASA"
}

export interface ClusteringResult {
  tenantId: string
  numClasses: number
  totalEntries: number
  classes: SalaryClass[]
  anomalies: Anomaly[]
  createdAt: string
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Determină numărul optim de clase pe baza dimensiunii datelor.
 * 50-100 intrări → 8 clase, 100-200 → 9, 200-300 → 10, 300-400 → 11, 400+ → 12
 */
function optimalClassCount(dataSize: number): number {
  if (dataSize < 10) return Math.max(2, Math.min(dataSize, 4))
  if (dataSize < 50) return Math.min(dataSize, 6)
  if (dataSize <= 100) return 8
  if (dataSize <= 200) return 9
  if (dataSize <= 300) return 10
  if (dataSize <= 400) return 11
  return 12
}

/**
 * Jenks Natural Breaks — variantă simplificată bazată pe gap-uri.
 *
 * Sortează valorile, calculează gap-urile dintre consecutive,
 * selectează cele mai mari (N-1) gap-uri ca limite de clasă.
 *
 * Returnează array de breakpoints (valori la care se schimbă clasa).
 */
function jenksNaturalBreaks(sortedValues: number[], numClasses: number): number[] {
  if (sortedValues.length <= numClasses) {
    // Fiecare valoare unică = o clasă
    return sortedValues.slice(1)
  }

  // Calculează gap-urile consecutive
  const gaps: { index: number; gap: number }[] = []
  for (let i = 1; i < sortedValues.length; i++) {
    gaps.push({
      index: i,
      gap: sortedValues[i] - sortedValues[i - 1],
    })
  }

  // Sortează descrescător după gap
  gaps.sort((a, b) => b.gap - a.gap)

  // Selectează primele (numClasses - 1) gap-uri ca puncte de separare
  const breakIndices = gaps
    .slice(0, numClasses - 1)
    .map((g) => g.index)
    .sort((a, b) => a - b)

  // Breakpoints = valorile de la indicii selectați
  return breakIndices.map((idx) => sortedValues[idx])
}

/**
 * Atribuie un grad fiecărei valori pe baza breakpoints.
 */
function assignGrade(value: number, breakpoints: number[]): number {
  for (let i = 0; i < breakpoints.length; i++) {
    if (value < breakpoints[i]) return i + 1
  }
  return breakpoints.length + 1
}

/**
 * Calculează mediana unui array sortat.
 */
function median(values: number[]): number {
  if (values.length === 0) return 0
  const mid = Math.floor(values.length / 2)
  return values.length % 2 !== 0
    ? values[mid]
    : (values[mid - 1] + values[mid]) / 2
}

// ── Funcție principală ──────────────────────────────────────────────────────

/**
 * Calculează clasele salariale pentru un tenant prin Jenks Natural Breaks.
 *
 * @param tenantId - ID-ul organizației
 * @param prisma - instanța Prisma (folosit ca `any` pentru modele noi)
 * @param numClasses - nr. clase dorit (opțional, se calculează automat)
 * @returns ClusteringResult cu clase, statistici și anomalii
 */
export async function calculateSalaryClasses(
  tenantId: string,
  prisma: PrismaClient,
  numClasses?: number
): Promise<ClusteringResult> {
  const db = prisma as any

  // 1. Preia toate intrările pentru tenant
  const entries = await db.payrollEntry.findMany({
    where: { tenantId },
    orderBy: { totalMonthlyGross: "asc" },
    select: {
      id: true,
      jobTitle: true,
      department: true,
      totalMonthlyGross: true,
    },
  })

  if (entries.length === 0) {
    return {
      tenantId,
      numClasses: 0,
      totalEntries: 0,
      classes: [],
      anomalies: [],
      createdAt: new Date().toISOString(),
    }
  }

  // 2. Filter out entries with null/undefined totalMonthlyGross
  const validEntries = entries.filter(
    (e: any) => e.totalMonthlyGross != null && e.totalMonthlyGross !== undefined
  )

  if (validEntries.length === 0) {
    return {
      tenantId,
      numClasses: 0,
      totalEntries: 0,
      classes: [],
      anomalies: [],
      createdAt: new Date().toISOString(),
    }
  }

  // 3. Determină numărul de clase
  const effectiveClasses = numClasses ?? optimalClassCount(validEntries.length)
  const finalClasses = Math.min(effectiveClasses, validEntries.length)

  const sortedValues: number[] = validEntries.map(
    (e: any) => Number(e.totalMonthlyGross)
  )

  // 4. Jenks Natural Breaks
  const breakpoints = jenksNaturalBreaks(sortedValues, finalClasses)

  // 5. Atribuie grade și construiește clasele
  const classMap = new Map<number, { values: number[]; entryIds: string[] }>()

  const gradeAssignments: { id: string; grade: number }[] = []

  for (const entry of validEntries) {
    const value = Number(entry.totalMonthlyGross)
    const grade = assignGrade(value, breakpoints)

    if (!classMap.has(grade)) {
      classMap.set(grade, { values: [], entryIds: [] })
    }
    classMap.get(grade)!.values.push(value)
    classMap.get(grade)!.entryIds.push(entry.id)

    gradeAssignments.push({ id: entry.id, grade })
  }

  // 6. Construiește rezultatele per clasă
  const classes: SalaryClass[] = []
  for (const [grade, data] of classMap.entries()) {
    const sorted = data.values.sort((a, b) => a - b)
    const sum = sorted.reduce((a, b) => a + b, 0)
    classes.push({
      grade,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      median: median(sorted),
      mean: Math.round((sum / sorted.length) * 100) / 100,
      count: sorted.length,
      entryIds: data.entryIds,
    })
  }
  classes.sort((a, b) => a.grade - b.grade)

  // 7. Detectează anomalii (> 40% deviație față de mediana clasei)
  const ANOMALY_THRESHOLD = 0.4
  const anomalies: Anomaly[] = []

  for (const entry of validEntries) {
    const value = Number(entry.totalMonthlyGross)
    const grade = assignGrade(value, breakpoints)
    const cls = classes.find((c) => c.grade === grade)
    if (!cls || cls.count < 2) continue

    const deviation = Math.abs(value - cls.median) / cls.median
    if (deviation > ANOMALY_THRESHOLD) {
      anomalies.push({
        entryId: entry.id,
        jobTitle: entry.jobTitle,
        department: entry.department,
        totalMonthlyGross: value,
        assignedGrade: grade,
        classMedian: cls.median,
        deviationPercent: Math.round(deviation * 10000) / 100,
        tip: value < cls.median ? "SUB_CLASA" : "SUPRA_CLASA",
      })
    }
  }

  // Sortează anomaliile descrescător după deviație
  anomalies.sort((a, b) => b.deviationPercent - a.deviationPercent)

  // 8. Actualizează gradeCalculated în DB (batch)
  await Promise.all(
    gradeAssignments.map(({ id, grade }) =>
      db.payrollEntry.update({
        where: { id },
        data: { gradeCalculated: grade },
      })
    )
  )

  return {
    tenantId,
    numClasses: finalClasses,
    totalEntries: validEntries.length,
    classes,
    anomalies,
    createdAt: new Date().toISOString(),
  }
}
