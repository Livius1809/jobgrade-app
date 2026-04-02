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

export interface PayGapReport {
  tenantId: string
  generatedAt: string
  totalAngajati: number
  totalFemei: number
  totalBarbati: number

  // Art. 9(1)(a) — gap overall
  gapOverall: GenderGapStats

  // Art. 9(1)(b-c) — gap pe componente
  gapComponenteFixe: ComponentGapStats
  gapComponenteVariabile: ComponentGapStats

  // Art. 9(1)(d) — distribuție cuartile
  distributieQuartile: QuartileDistribution[]

  // Detaliere per categorie
  perJobFamily: CategoryGap[]
  perDepartament: CategoryGap[]
  perNivelIerarhic: CategoryGap[]

  // Art. 10 — semnalizări pentru evaluare comună
  semnalizariEvaluareComuna: JointAssessmentFlag[]

  // Sumar
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
      gapOverall: {
        medieFemei: 0, medieBarbati: 0, gapMedieProcent: 0,
        medianaFemei: 0, medianaBarbati: 0, gapMedianaProcent: 0,
        numarFemei: 0, numarBarbati: 0,
      },
      gapComponenteFixe: { categorie: "Componente fixe", medieFemei: 0, medieBarbati: 0, gapProcent: 0 },
      gapComponenteVariabile: { categorie: "Componente variabile", medieFemei: 0, medieBarbati: 0, gapProcent: 0 },
      distributieQuartile: [],
      perJobFamily: [],
      perDepartament: [],
      perNivelIerarhic: [],
      semnalizariEvaluareComuna: [],
      recomandari: [
        "Nu există date suficiente pentru generarea raportului. Importați datele salariale cu gender specificat.",
      ],
    }
  }

  // 2. Separă pe genuri
  const fEntries = entries.filter((e: any) => e.gender === "FEMALE")
  const mEntries = entries.filter((e: any) => e.gender === "MALE")

  const fGross = fEntries.map((e: any) => Number(e.totalMonthlyGross))
  const mGross = mEntries.map((e: any) => Number(e.totalMonthlyGross))

  // 3. Gap overall (Art. 9(1)(a))
  const gapOverall = calcGenderStats(fGross, mGross)

  // 4. Gap componente fixe (Art. 9(1)(b))
  const fFixed = fEntries.map((e: any) => Number(e.baseSalary) + Number(e.fixedAllowances))
  const mFixed = mEntries.map((e: any) => Number(e.baseSalary) + Number(e.fixedAllowances))
  const gapComponenteFixe: ComponentGapStats = {
    categorie: "Componente fixe (salariu bază + sporuri fixe)",
    medieFemei: round2(calcMedie(fFixed)),
    medieBarbati: round2(calcMedie(mFixed)),
    gapProcent: calcGapProcent(calcMedie(fFixed), calcMedie(mFixed)),
  }

  // 5. Gap componente variabile (Art. 9(1)(c))
  const fVar = fEntries.map((e: any) => (Number(e.annualBonuses) + Number(e.annualCommissions)) / 12)
  const mVar = mEntries.map((e: any) => (Number(e.annualBonuses) + Number(e.annualCommissions)) / 12)
  const gapComponenteVariabile: ComponentGapStats = {
    categorie: "Componente variabile (bonusuri + comisioane, lunar)",
    medieFemei: round2(calcMedie(fVar)),
    medieBarbati: round2(calcMedie(mVar)),
    gapProcent: calcGapProcent(calcMedie(fVar), calcMedie(mVar)),
  }

  // 6. Distribuție cuartile (Art. 9(1)(d))
  const distributieQuartile: QuartileDistribution[] = []
  for (let q = 1; q <= 4; q++) {
    const inQ = entries.filter((e: any) => e.salaryQuartile === q)
    const numF = inQ.filter((e: any) => e.gender === "FEMALE").length
    const numM = inQ.filter((e: any) => e.gender === "MALE").length
    const total = numF + numM
    distributieQuartile.push({
      cuartila: q,
      totalAngajati: total,
      numarFemei: numF,
      numarBarbati: numM,
      procentFemei: total > 0 ? round2((numF / total) * 100) : 0,
      procentBarbati: total > 0 ? round2((numM / total) * 100) : 0,
    })
  }

  // 7. Gap per categorie
  const perJobFamily = calcCategoryGaps(entries, "jobFamily")
  const perDepartament = calcCategoryGaps(entries, "department")
  const perNivelIerarhic = calcCategoryGaps(entries, "hierarchyLevel")

  // 8. Semnalizări Art. 10 — categorii cu gap > 5%
  const semnalizariEvaluareComuna: JointAssessmentFlag[] = []

  if (Math.abs(gapOverall.gapMedieProcent) > 5) {
    semnalizariEvaluareComuna.push({
      categorie: "Overall",
      tipCategorie: "OVERALL",
      gapProcent: gapOverall.gapMedieProcent,
      motiv: `Diferența medie globală de remunerație între genuri este ${gapOverall.gapMedieProcent}% (prag Art. 10: 5%). Se impune evaluare comună cu reprezentanții salariaților.`,
    })
  }

  for (const cat of perJobFamily.filter(c => Math.abs(c.gapProcent) > 5)) {
    semnalizariEvaluareComuna.push({
      categorie: cat.categorie,
      tipCategorie: "JOB_FAMILY",
      gapProcent: cat.gapProcent,
      motiv: `Familia de posturi „${cat.categorie}" are gap de ${cat.gapProcent}% (F: ${cat.numarFemei}, M: ${cat.numarBarbati}).`,
    })
  }

  for (const cat of perDepartament.filter(c => Math.abs(c.gapProcent) > 5)) {
    semnalizariEvaluareComuna.push({
      categorie: cat.categorie,
      tipCategorie: "DEPARTAMENT",
      gapProcent: cat.gapProcent,
      motiv: `Departamentul „${cat.categorie}" are gap de ${cat.gapProcent}% (F: ${cat.numarFemei}, M: ${cat.numarBarbati}).`,
    })
  }

  for (const cat of perNivelIerarhic.filter(c => Math.abs(c.gapProcent) > 5)) {
    semnalizariEvaluareComuna.push({
      categorie: cat.categorie,
      tipCategorie: "NIVEL_IERARHIC",
      gapProcent: cat.gapProcent,
      motiv: `Nivelul ierarhic „${cat.categorie}" are gap de ${cat.gapProcent}% (F: ${cat.numarFemei}, M: ${cat.numarBarbati}).`,
    })
  }

  // 9. Recomandări
  const recomandari: string[] = []

  if (Math.abs(gapOverall.gapMedieProcent) > 15) {
    recomandari.push(
      `Gap salarial mediu de gen: ${gapOverall.gapMedieProcent}% — nivel critic. Se impune plan de acțiune imediat conform Art. 10 și raportare ITM.`
    )
  } else if (Math.abs(gapOverall.gapMedieProcent) > 5) {
    recomandari.push(
      `Gap salarial mediu de gen: ${gapOverall.gapMedieProcent}% — depășește pragul de 5%. Inițiați evaluarea comună cu reprezentanții salariaților (Art. 10).`
    )
  } else {
    recomandari.push(
      `Gap salarial mediu de gen: ${gapOverall.gapMedieProcent}% — în limita acceptabilă (< 5%). Monitorizați periodic.`
    )
  }

  if (semnalizariEvaluareComuna.length > 0) {
    recomandari.push(
      `${semnalizariEvaluareComuna.length} categorie/categorii necesită evaluare comună (Art. 10) datorită gap-ului > 5%.`
    )
  }

  // Verificare concentrare genuri în cuartile
  const q1 = distributieQuartile.find(q => q.cuartila === 1)
  const q4 = distributieQuartile.find(q => q.cuartila === 4)
  if (q1 && q1.procentFemei > 70) {
    recomandari.push(
      `Concentrare disproporționată de femei în cuartila inferioară (${q1.procentFemei}%). Analizați cauzele structurale.`
    )
  }
  if (q4 && q4.procentBarbati > 80) {
    recomandari.push(
      `Concentrare disproporționată de bărbați în cuartila superioară (${q4.procentBarbati}%). Verificați egalitatea de acces la pozițiile de top.`
    )
  }

  const deptCritice = perDepartament.filter(d => Math.abs(d.gapProcent) > 10)
  if (deptCritice.length > 0) {
    recomandari.push(
      `Departamente cu gap > 10%: ${deptCritice.map(d => `${d.categorie} (${d.gapProcent}%)`).join(", ")}. Prioritizați revizuirea.`
    )
  }

  return {
    tenantId,
    generatedAt: new Date().toISOString(),
    totalAngajati: entries.length,
    totalFemei: fEntries.length,
    totalBarbati: mEntries.length,
    gapOverall,
    gapComponenteFixe,
    gapComponenteVariabile,
    distributieQuartile,
    perJobFamily,
    perDepartament,
    perNivelIerarhic,
    semnalizariEvaluareComuna,
    recomandari,
  }
}
