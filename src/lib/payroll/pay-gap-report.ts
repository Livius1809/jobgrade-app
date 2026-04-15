/**
 * pay-gap-report.ts — Raport diferențe salariale de gen (Gender Pay Gap)
 *
 * Conform Art. 9 din Directiva (UE) 2023/970 — transparență salarială:
 * 1. Diferența medie și mediană a remunerației brute de gen (overall)
 * 2. Diferența medie pe componente fixe (bază + sporuri fixe)
 * 3. Diferența medie pe componente variabile (bonusuri + comisioane)
 * 4. Distribuția pe cuartile (% F și M per cuartilă)
 * 5. Gap per familie de posturi / departament / nivel ierarhic
 * 6. Semnalizare evaluare comună (Art. 10) pentru gap > 5%
 *
 * Export: generatePayGapReport(tenantId, prisma)
 */

import type { PrismaClient } from "@/generated/prisma"

// ── Tipuri ──────────────────────────────────────────────────────────────────

export interface GenderGapStats {
  medieFemei: number
  medieBarbati: number
  gapMedieProcent: number       // (M - F) / M * 100
  medianaFemei: number
  medianaBarbati: number
  gapMedianaProcent: number
  numarFemei: number
  numarBarbati: number
}

export interface ComponentGapStats {
  categorie: string
  medieFemei: number
  medieBarbati: number
  gapProcent: number
}

export interface QuartileDistribution {
  cuartila: number   // 1-4
  totalAngajati: number
  numarFemei: number
  numarBarbati: number
  procentFemei: number
  procentBarbati: number
}

export interface CategoryGap {
  categorie: string
  numarFemei: number
  numarBarbati: number
  medieFemei: number
  medieBarbati: number
  gapProcent: number
  necesitaEvaluareComuna: boolean   // gap > 5% → Art. 10
}

export interface JointAssessmentFlag {
  categorie: string
  tipCategorie: "JOB_FAMILY" | "DEPARTAMENT" | "NIVEL_IERARHIC" | "OVERALL"
  gapProcent: number
  motiv: string
}

// Categorie de lucrători = funcție + normă (mere cu mere)
export interface WorkerCategory {
  functie: string
  norma: string
  numarFemei: number
  numarBarbati: number
  medieFemei: number
  medieBarbati: number
  medianaFemei: number
  medianaBarbati: number
  gapMedieProcent: number      // Art. 9(1)(a)(f)
  gapMedianaProcent: number    // Art. 9(1)(c)
  gapComponenteFixeProcent: number    // Art. 9(1)(b)
  gapComponenteVariabileProcent: number // Art. 9(1)(d)
  necesitaEvaluareComuna: boolean      // gap > 5% → Art. 10
  kAnonymity: boolean          // true dacă ambele grupuri >= 5
  comparabil: boolean          // true dacă ambele genuri prezente
}

// Categorie segregată = doar un gen
export interface SegregatedCategory {
  functie: string
  norma: string
  genPresent: "FEMALE" | "MALE"
  numar: number
  medieSalariu: number
}

export interface PayGapReport {
  tenantId: string
  generatedAt: string
  totalAngajati: number
  totalFemei: number
  totalBarbati: number
  totalCategorii: number
  categoriiComparabile: number
  categoriiSegregrate: number
  categoriiFlagArt10: number

  // Art. 9(1)(a-d, f, g) — per categorie de lucrători (funcție + normă)
  categoriiLucratori: WorkerCategory[]

  // Categorii segregate (un singur gen)
  categoriiSegregate: SegregatedCategory[]

  // Art. 9(1)(e) — distribuție cuartile
  distributieQuartile: QuartileDistribution[]

  // Art. 10 — semnalizări pentru evaluare comună
  semnalizariEvaluareComuna: JointAssessmentFlag[]

  // Recomandări
  recomandari: string[]
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function calcMediana(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2
}

function calcMedie(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function calcGapProcent(medieFemei: number, medieBarbati: number): number {
  if (medieBarbati === 0) return 0
  return round2(((medieBarbati - medieFemei) / medieBarbati) * 100)
}

function calcGenderStats(
  femei: number[],
  barbati: number[]
): GenderGapStats {
  const mF = calcMedie(femei)
  const mB = calcMedie(barbati)
  const mdF = calcMediana(femei)
  const mdB = calcMediana(barbati)
  return {
    medieFemei: round2(mF),
    medieBarbati: round2(mB),
    gapMedieProcent: calcGapProcent(mF, mB),
    medianaFemei: round2(mdF),
    medianaBarbati: round2(mdB),
    gapMedianaProcent: calcGapProcent(mdF, mdB),
    numarFemei: femei.length,
    numarBarbati: barbati.length,
  }
}

function calcCategoryGaps(
  entries: any[],
  groupKey: string
): CategoryGap[] {
  const groups = new Map<string, { femei: number[]; barbati: number[] }>()

  for (const e of entries) {
    const key = String(e[groupKey] || "Necunoscut")
    if (!groups.has(key)) groups.set(key, { femei: [], barbati: [] })
    const gross = Number(e.totalMonthlyGross) || 0
    if (e.gender === "FEMALE") {
      groups.get(key)!.femei.push(gross)
    } else if (e.gender === "MALE") {
      groups.get(key)!.barbati.push(gross)
    }
  }

  const results: CategoryGap[] = []
  for (const [cat, data] of groups.entries()) {
    const mF = calcMedie(data.femei)
    const mB = calcMedie(data.barbati)
    const gap = calcGapProcent(mF, mB)
    results.push({
      categorie: cat,
      numarFemei: data.femei.length,
      numarBarbati: data.barbati.length,
      medieFemei: round2(mF),
      medieBarbati: round2(mB),
      gapProcent: gap,
      necesitaEvaluareComuna: Math.abs(gap) > 5,
    })
  }

  return results.sort((a, b) => Math.abs(b.gapProcent) - Math.abs(a.gapProcent))
}

// ── Funcție principală ──────────────────────────────────────────────────────

/**
 * Generează raportul de diferențe salariale de gen conform Art. 9.
 *
 * @param tenantId - ID-ul organizației
 * @param prisma - instanța Prisma
 * @returns PayGapReport complet, structurat pentru export ITM
 */
export async function generatePayGapReport(
  tenantId: string,
  prisma: PrismaClient
): Promise<PayGapReport> {
  const db = prisma as any

  // 1. Preia toate intrările cu totalMonthlyGross calculat
  const entries = await db.payrollEntry.findMany({
    where: {
      tenantId,
      totalMonthlyGross: { not: null },
      gender: { in: ["MALE", "FEMALE"] },
    },
    select: {
      id: true,
      gender: true,
      totalMonthlyGross: true,
      baseSalary: true,
      fixedAllowances: true,
      annualBonuses: true,
      annualCommissions: true,
      jobFamily: true,
      department: true,
      hierarchyLevel: true,
      salaryQuartile: true,
      workSchedule: true,
    },
  })

  if (entries.length === 0) {
    return {
      tenantId,
      generatedAt: new Date().toISOString(),
      totalAngajati: 0,
      totalFemei: 0,
      totalBarbati: 0,
      totalCategorii: 0,
      categoriiComparabile: 0,
      categoriiSegregrate: 0,
      categoriiFlagArt10: 0,
      categoriiLucratori: [],
      categoriiSegregate: [],
      distributieQuartile: [],
      semnalizariEvaluareComuna: [],
      recomandari: [
        "Nu există date suficiente pentru generarea raportului. Importați datele salariale cu gender specificat.",
      ],
    }
  }

  // 2. Grupare per categorie de lucrători (funcție + normă = mere cu mere)
  const groups = new Map<string, any[]>()
  for (const e of entries) {
    const key = `${e.jobFamily || "Necunoscut"}|${e.workSchedule || "H8"}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(e)
  }

  const fEntries = entries.filter((e: any) => e.gender === "FEMALE")
  const mEntries = entries.filter((e: any) => e.gender === "MALE")

  // 3. Analiză per categorie de lucrători
  const categoriiLucratori: WorkerCategory[] = []
  const categoriiSegregate: SegregatedCategory[] = []
  const semnalizariEvaluareComuna: JointAssessmentFlag[] = []

  for (const [key, group] of groups.entries()) {
    const [functie, norma] = key.split("|")
    const fem = group.filter((e: any) => e.gender === "FEMALE")
    const masc = group.filter((e: any) => e.gender === "MALE")

    if (fem.length === 0 || masc.length === 0) {
      categoriiSegregate.push({
        functie,
        norma,
        genPresent: fem.length > 0 ? "FEMALE" : "MALE",
        numar: group.length,
        medieSalariu: round2(calcMedie(group.map((e: any) => Number(e.totalMonthlyGross)))),
      })
      continue
    }

    const fGross = fem.map((e: any) => Number(e.totalMonthlyGross))
    const mGross = masc.map((e: any) => Number(e.totalMonthlyGross))
    const fFixed = fem.map((e: any) => Number(e.baseSalary) + Number(e.fixedAllowances))
    const mFixed = masc.map((e: any) => Number(e.baseSalary) + Number(e.fixedAllowances))
    const fVar = fem.map((e: any) => (Number(e.annualBonuses) + Number(e.annualCommissions)) / 12)
    const mVar = masc.map((e: any) => (Number(e.annualBonuses) + Number(e.annualCommissions)) / 12)

    const gapMedie = calcGapProcent(calcMedie(fGross), calcMedie(mGross))
    const gapMediana = calcGapProcent(calcMediana(fGross), calcMediana(mGross))
    const gapFixe = calcGapProcent(calcMedie(fFixed), calcMedie(mFixed))
    const gapVar = calcGapProcent(calcMedie(fVar), calcMedie(mVar))
    const necesitaArt10 = Math.abs(gapMedie) > 5

    categoriiLucratori.push({
      functie,
      norma,
      numarFemei: fem.length,
      numarBarbati: masc.length,
      medieFemei: round2(calcMedie(fGross)),
      medieBarbati: round2(calcMedie(mGross)),
      medianaFemei: round2(calcMediana(fGross)),
      medianaBarbati: round2(calcMediana(mGross)),
      gapMedieProcent: gapMedie,
      gapMedianaProcent: gapMediana,
      gapComponenteFixeProcent: gapFixe,
      gapComponenteVariabileProcent: gapVar,
      necesitaEvaluareComuna: necesitaArt10,
      kAnonymity: fem.length >= 5 && masc.length >= 5,
      comparabil: true,
    })

    if (necesitaArt10) {
      semnalizariEvaluareComuna.push({
        categorie: `${functie} (${norma})`,
        tipCategorie: "JOB_FAMILY",
        gapProcent: gapMedie,
        motiv: `Categoria „${functie}" cu norma ${norma} are decalaj de ${gapMedie}% (F: ${fem.length}, M: ${masc.length}). Conform Art. 10, se impune evaluare comună.`,
      })
    }
  }

  // Sortare: cele cu gap mai mare primele
  categoriiLucratori.sort((a, b) => Math.abs(b.gapMedieProcent) - Math.abs(a.gapMedieProcent))

  // 4. Distribuție cuartile (Art. 9(1)(e))
  const allGross = entries.map((e: any) => Number(e.totalMonthlyGross)).sort((a: number, b: number) => a - b)
  const q1Threshold = allGross[Math.floor(allGross.length * 0.25)] || 0
  const q2Threshold = allGross[Math.floor(allGross.length * 0.5)] || 0
  const q3Threshold = allGross[Math.floor(allGross.length * 0.75)] || 0

  const distributieQuartile: QuartileDistribution[] = [1, 2, 3, 4].map(q => {
    const inQ = entries.filter((e: any) => {
      const g = Number(e.totalMonthlyGross)
      if (q === 1) return g <= q1Threshold
      if (q === 2) return g > q1Threshold && g <= q2Threshold
      if (q === 3) return g > q2Threshold && g <= q3Threshold
      return g > q3Threshold
    })
    const numF = inQ.filter((e: any) => e.gender === "FEMALE").length
    const numM = inQ.filter((e: any) => e.gender === "MALE").length
    const total = numF + numM
    return {
      cuartila: q,
      totalAngajati: total,
      numarFemei: numF,
      numarBarbati: numM,
      procentFemei: total > 0 ? round2((numF / total) * 100) : 0,
      procentBarbati: total > 0 ? round2((numM / total) * 100) : 0,
    }
  })

  // 5. Recomandări
  const recomandari: string[] = []

  if (semnalizariEvaluareComuna.length > 0) {
    recomandari.push(
      `${semnalizariEvaluareComuna.length} categorie/categorii de lucrători necesită evaluare comună (Art. 10) datorită decalajului > 5%.`
    )
  } else if (categoriiLucratori.length > 0) {
    recomandari.push("Nicio categorie de lucrători comparabilă nu depășește pragul de 5%. Monitorizați periodic.")
  }

  if (categoriiSegregate.length > 0) {
    recomandari.push(
      `${categoriiSegregate.length} categorie/categorii au un singur gen prezent (segregare ocupațională). Analiza decalajului nu este posibilă pentru aceste categorii.`
    )
  }

  const q1Data = distributieQuartile.find(q => q.cuartila === 1)
  const q4Data = distributieQuartile.find(q => q.cuartila === 4)
  if (q1Data && q1Data.procentFemei > 70) {
    recomandari.push(`Concentrare disproporționată de femei în cuartila inferioară (${q1Data.procentFemei}%).`)
  }
  if (q4Data && q4Data.procentBarbati > 80) {
    recomandari.push(`Concentrare disproporționată de bărbați în cuartila superioară (${q4Data.procentBarbati}%).`)
  }

  return {
    tenantId,
    generatedAt: new Date().toISOString(),
    totalAngajati: entries.length,
    totalFemei: fEntries.length,
    totalBarbati: mEntries.length,
    totalCategorii: categoriiLucratori.length + categoriiSegregate.length,
    categoriiComparabile: categoriiLucratori.length,
    categoriiSegregrate: categoriiSegregate.length,
    categoriiFlagArt10: semnalizariEvaluareComuna.length,
    categoriiLucratori,
    categoriiSegregate,
    distributieQuartile,
    semnalizariEvaluareComuna,
    recomandari,
  }
}
