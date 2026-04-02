/**
 * salary-justification.ts — Raport justificare salarială per post/categorie
 *
 * Conform Art. 4 + Art. 6 din Directiva (UE) 2023/970:
 * - Art. 4: criteriile de evaluare a muncii trebuie să fie neutre din punct de
 *   vedere al genului (cunoștințe, efort, responsabilități, condiții de muncă)
 * - Art. 6: justificarea diferențelor salariale pe baza criteriilor obiective
 *
 * Pentru fiecare post/categorie:
 * 1. Grad evaluat + banda salarială (din clusterizare) + salariul real
 * 2. Scoruri pe cele 6 criterii JobGrade + cele 4 criterii legale (agregate)
 * 3. Justificarea: ce criterii determină gradul, de ce acest salariu
 * 4. Verificare neutralitate de gen: criteriile nu referă genul
 * 5. Detaliere componente salariale, fiecare justificată
 *
 * Export: generateSalaryJustification(tenantId, prisma)
 */

import type { PrismaClient } from "@/generated/prisma"
import {
  CRITERIA_MAP,
  aggregateToLegalCriteria,
  type JobGradeFactor,
  type LegalCriterionKey,
} from "./criteria-mapping"

// ── Tipuri ──────────────────────────────────────────────────────────────────

export interface CriterionScore {
  criteriu: string
  scor: number
  descriere: string
}

export interface LegalCriterionScore {
  criteriu: string
  referintaLegala: string
  scor: number
  factoriComponenti: string[]
}

export interface SalaryComponent {
  componenta: string
  valoare: number
  justificare: string
}

export interface GenderNeutralityCheck {
  esteNeutru: boolean
  observatii: string[]
}

export interface PostJustification {
  jobCode: string
  jobTitle: string
  department: string
  jobFamily: string
  hierarchyLevel: string

  // Grad și salariu
  gradeEvaluated: number | null
  gradeCalculated: number | null
  salaryBandMin: number | null
  salaryBandMax: number | null
  salaryActual: number
  pozitieInBanda: string   // "SUB_BANDA" | "IN_BANDA" | "PESTE_BANDA" | "FARA_BANDA"

  // Scoruri criterii
  scoruriJobGrade: CriterionScore[]
  scoruriLegale: LegalCriterionScore[]

  // Justificare
  justificareGrad: string
  justificareSalariu: string

  // Neutralitate gen
  verificareNeutralitateGen: GenderNeutralityCheck

  // Componente salariale detaliate
  componenteSalariale: SalaryComponent[]
}

export interface CategorySummary {
  categorie: string
  totalPositii: number
  graduriDistincte: number[]
  medieSalariala: number
  dispersieSalariala: number   // coef. variație %
  pozitiiSubBanda: number
  pozitiiPesteBanda: number
}

export interface SalaryJustificationReport {
  tenantId: string
  generatedAt: string
  totalPositii: number
  totalCuGradEvaluat: number
  totalFaraBanda: number

  justificariPerPost: PostJustification[]
  sumarPerDepartament: CategorySummary[]
  sumarPerJobFamily: CategorySummary[]

  verificareGlobalaNeutralitate: GenderNeutralityCheck
  recomandari: string[]
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function determinePositieInBanda(
  actual: number,
  min: number | null,
  max: number | null
): string {
  if (min === null || max === null) return "FARA_BANDA"
  if (actual < min) return "SUB_BANDA"
  if (actual > max) return "PESTE_BANDA"
  return "IN_BANDA"
}

function genereazaJustificareGrad(
  grade: number | null,
  scoruriLegale: LegalCriterionScore[]
): string {
  if (grade === null) {
    return "Postul nu a fost evaluat încă. Se recomandă includerea în sesiunea de evaluare."
  }

  const sorted = [...scoruriLegale].sort((a, b) => b.scor - a.scor)
  const topCriteriu = sorted[0]
  const scalaMax = 10  // presupunem scorare 1-10

  if (topCriteriu.scor >= scalaMax * 0.8) {
    return `Gradul ${grade} reflectă un nivel ridicat de ${topCriteriu.criteriu.toLowerCase()} (scor ${topCriteriu.scor}). Criteriile dominante: ${sorted.slice(0, 2).map(s => s.criteriu).join(", ")}.`
  }
  return `Gradul ${grade} este determinat de combinația criteriilor: ${sorted.map(s => `${s.criteriu} (${s.scor})`).join(", ")}. Evaluarea reflectă complexitatea și responsabilitățile postului.`
}

function genereazaJustificareSalariu(
  pozitie: string,
  actual: number,
  min: number | null,
  max: number | null
): string {
  switch (pozitie) {
    case "SUB_BANDA":
      return `Salariul actual (${actual} RON) este sub banda minimă (${min} RON). Se recomandă revizuirea salariului sau reclasificarea postului.`
    case "PESTE_BANDA":
      return `Salariul actual (${actual} RON) depășește banda maximă (${max} RON). Justificarea trebuie să includă factori obiectivi (vechime, certificări, performanță excepțională).`
    case "IN_BANDA":
      return `Salariul actual (${actual} RON) se încadrează în banda salarială (${min}-${max} RON) corespunzătoare gradului evaluat.`
    case "FARA_BANDA":
      return `Banda salarială nu este definită pentru acest grad. Se recomandă definirea benzilor salariale prin clusterizare.`
    default:
      return ""
  }
}

function verificaNeutralitateGen(): GenderNeutralityCheck {
  // Criteriile JobGrade sunt prin definiție neutre — nu referă genul
  // Verificarea se face pe structura criteriilor, nu pe date individuale
  const observatii: string[] = []

  for (const [key, config] of Object.entries(CRITERIA_MAP)) {
    // Verifică că descrierea criteriului nu conține referințe de gen
    const desc = config.description.toLowerCase()
    const genTerms = ["bărbat", "femeie", "masculin", "feminin", "sex", "gen "]
    const found = genTerms.filter(t => desc.includes(t))
    if (found.length > 0) {
      observatii.push(
        `Criteriul „${config.label}" conține potențiale referințe de gen: ${found.join(", ")}. Revizuiți formularea.`
      )
    }
  }

  return {
    esteNeutru: observatii.length === 0,
    observatii: observatii.length === 0
      ? ["Toate criteriile de evaluare sunt neutre din punct de vedere al genului, conform Art. 4."]
      : observatii,
  }
}

function calcCoefVariatie(values: number[]): number {
  if (values.length < 2) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  if (mean === 0) return 0
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length
  return round2((Math.sqrt(variance) / mean) * 100)
}

function calcSumarPerCategorie(
  justificari: PostJustification[],
  groupKey: "department" | "jobFamily"
): CategorySummary[] {
  const groups = new Map<string, PostJustification[]>()

  for (const j of justificari) {
    const key = j[groupKey]
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(j)
  }

  const results: CategorySummary[] = []
  for (const [cat, items] of groups.entries()) {
    const salarii = items.map(i => i.salaryActual)
    const grade = [...new Set(items.map(i => i.gradeEvaluated).filter((g): g is number => g !== null))].sort((a, b) => a - b)

    results.push({
      categorie: cat,
      totalPositii: items.length,
      graduriDistincte: grade,
      medieSalariala: round2(salarii.reduce((a, b) => a + b, 0) / salarii.length),
      dispersieSalariala: calcCoefVariatie(salarii),
      pozitiiSubBanda: items.filter(i => i.pozitieInBanda === "SUB_BANDA").length,
      pozitiiPesteBanda: items.filter(i => i.pozitieInBanda === "PESTE_BANDA").length,
    })
  }

  return results.sort((a, b) => a.categorie.localeCompare(b.categorie, "ro"))
}

// ── Funcție principală ──────────────────────────────────────────────────────

/**
 * Generează raportul de justificare salarială per post/categorie.
 *
 * @param tenantId - ID-ul organizației
 * @param prisma - instanța Prisma
 * @returns SalaryJustificationReport complet
 */
export async function generateSalaryJustification(
  tenantId: string,
  prisma: PrismaClient
): Promise<SalaryJustificationReport> {
  const db = prisma as any

  // 1. Preia toate intrările payroll
  const entries = await db.payrollEntry.findMany({
    where: { tenantId },
    select: {
      id: true,
      jobCode: true,
      jobTitle: true,
      department: true,
      jobFamily: true,
      hierarchyLevel: true,
      gradeCalculated: true,
      gradeEvaluated: true,
      baseSalary: true,
      fixedAllowances: true,
      annualBonuses: true,
      annualCommissions: true,
      benefitsInKind: true,
      mealVouchers: true,
      totalMonthlyGross: true,
      workSchedule: true,
      gender: true,
    },
  })

  // 2. Preia benzile salariale (SalaryGrade)
  const salaryGrades = await db.salaryGrade.findMany({
    where: { tenantId },
    select: {
      id: true,
      name: true,
      scoreMin: true,
      scoreMax: true,
      salaryMin: true,
      salaryMax: true,
      order: true,
    },
    orderBy: { order: "asc" },
  })

  // Construiește maparea grad → bandă salarială
  // Presupunem order = grad (1-based)
  const gradeToBand = new Map<number, { salaryMin: number | null; salaryMax: number | null }>()
  for (const sg of salaryGrades) {
    gradeToBand.set(sg.order, {
      salaryMin: sg.salaryMin,
      salaryMax: sg.salaryMax,
    })
  }

  // 3. Preia scorurile din evaluări (ultimele sesiuni complete)
  const completedSessions = await db.evaluationSession.findMany({
    where: { tenantId, status: "COMPLETED" },
    select: { id: true },
    orderBy: { completedAt: "desc" },
    take: 1,
  })

  // Mapare jobCode → scoruri criterii (din ultima sesiune completă)
  const jobScoresMap = new Map<string, Record<string, number>>()

  if (completedSessions.length > 0) {
    const sessionId = completedSessions[0].id

    // Preia jobResults cu scoruri per criteriu
    const jobResults = await db.jobResult.findMany({
      where: { sessionId },
      select: {
        jobId: true,
        totalScore: true,
        job: {
          select: {
            code: true,
            title: true,
          },
        },
      },
    })

    // Preia evaluările (scoruri finale = consensStatuses)
    const consensusStatuses = await db.consensusStatus.findMany({
      where: {
        sessionId,
        status: "RESOLVED",
      },
      select: {
        jobId: true,
        criterionId: true,
        finalSubfactor: {
          select: {
            points: true,
            criterion: {
              select: { name: true },
            },
          },
        },
      },
    })

    // Grupare scoruri per job
    for (const cs of consensusStatuses) {
      const jobResult = jobResults.find((jr: any) => jr.jobId === cs.jobId)
      const jobCode = jobResult?.job?.code || cs.jobId
      const criterionName = cs.finalSubfactor?.criterion?.name || "N/A"
      const points = cs.finalSubfactor?.points || 0

      if (!jobScoresMap.has(jobCode)) jobScoresMap.set(jobCode, {})
      jobScoresMap.get(jobCode)![criterionName] = points
    }
  }

  // 4. Verificare neutralitate gen (globală)
  const verificareGlobala = verificaNeutralitateGen()

  // 5. Construiește justificări per post
  const justificari: PostJustification[] = entries.map((entry: any) => {
    const gross = Number(entry.totalMonthlyGross) || 0
    const ge = entry.gradeEvaluated !== null ? Number(entry.gradeEvaluated) : null

    // Banda salarială
    const band = ge !== null ? gradeToBand.get(ge) : undefined
    const salaryMin = band?.salaryMin ?? null
    const salaryMax = band?.salaryMax ?? null
    const pozitie = determinePositieInBanda(gross, salaryMin, salaryMax)

    // Scoruri JobGrade (dacă există)
    const rawScores = jobScoresMap.get(entry.jobCode) || {}
    const jobGradeFactors: JobGradeFactor[] = [
      "Knowledge", "Communications", "Problem Solving",
      "Decision Making", "Business Impact", "Working Conditions",
    ]

    const scoruriJobGrade: CriterionScore[] = jobGradeFactors.map(f => ({
      criteriu: f,
      scor: rawScores[f] || 0,
      descriere: `Scor criteriu ${f}`,
    }))

    // Scoruri legale (agregate)
    const scoresRecord: Record<JobGradeFactor, number> = {
      Knowledge: rawScores["Knowledge"] || 0,
      Communications: rawScores["Communications"] || 0,
      "Problem Solving": rawScores["Problem Solving"] || 0,
      "Decision Making": rawScores["Decision Making"] || 0,
      "Business Impact": rawScores["Business Impact"] || 0,
      "Working Conditions": rawScores["Working Conditions"] || 0,
    }
    const legalScores = aggregateToLegalCriteria(scoresRecord)

    const scoruriLegale: LegalCriterionScore[] = (
      Object.entries(CRITERIA_MAP) as [LegalCriterionKey, typeof CRITERIA_MAP[LegalCriterionKey]][]
    ).map(([key, config]) => ({
      criteriu: config.label,
      referintaLegala: config.legalRef,
      scor: legalScores[key],
      factoriComponenti: [...config.jobgradeFactors],
    }))

    // Componente salariale
    const componenteSalariale: SalaryComponent[] = [
      {
        componenta: "Salariu bază",
        valoare: Number(entry.baseSalary),
        justificare: "Reflectă gradul postului, complexitatea muncii și piața relevantă.",
      },
      {
        componenta: "Sporuri fixe",
        valoare: Number(entry.fixedAllowances),
        justificare: "Sporuri stabilite prin lege, CCM sau regulament intern (vechime, condiții speciale etc.).",
      },
      {
        componenta: "Bonusuri anuale (lunar echiv.)",
        valoare: round2(Number(entry.annualBonuses) / 12),
        justificare: "Componenta variabilă legată de performanța individuală/organizațională.",
      },
      {
        componenta: "Comisioane anuale (lunar echiv.)",
        valoare: round2(Number(entry.annualCommissions) / 12),
        justificare: "Componenta variabilă legată de rezultate comerciale cuantificabile.",
      },
      {
        componenta: "Beneficii în natură",
        valoare: Number(entry.benefitsInKind),
        justificare: "Beneficii non-monetare evaluate la echivalent bănesc (mașină, telefon etc.).",
      },
      {
        componenta: "Tichete masă/vacanță",
        valoare: Number(entry.mealVouchers),
        justificare: "Acordate uniform conform politicii companiei sau CCM.",
      },
    ]

    return {
      jobCode: entry.jobCode,
      jobTitle: entry.jobTitle,
      department: entry.department,
      jobFamily: entry.jobFamily,
      hierarchyLevel: entry.hierarchyLevel,
      gradeEvaluated: ge,
      gradeCalculated: entry.gradeCalculated !== null ? Number(entry.gradeCalculated) : null,
      salaryBandMin: salaryMin,
      salaryBandMax: salaryMax,
      salaryActual: gross,
      pozitieInBanda: pozitie,
      scoruriJobGrade,
      scoruriLegale,
      justificareGrad: genereazaJustificareGrad(ge, scoruriLegale),
      justificareSalariu: genereazaJustificareSalariu(pozitie, gross, salaryMin, salaryMax),
      verificareNeutralitateGen: verificareGlobala,
      componenteSalariale,
    }
  })

  // 6. Sumar per categorie
  const sumarPerDepartament = calcSumarPerCategorie(justificari, "department")
  const sumarPerJobFamily = calcSumarPerCategorie(justificari, "jobFamily")

  // 7. Recomandări
  const recomandari: string[] = []
  const totalCuGrad = justificari.filter(j => j.gradeEvaluated !== null).length
  const totalFaraBanda = justificari.filter(j => j.pozitieInBanda === "FARA_BANDA").length
  const subBanda = justificari.filter(j => j.pozitieInBanda === "SUB_BANDA").length
  const pesteBanda = justificari.filter(j => j.pozitieInBanda === "PESTE_BANDA").length

  if (totalCuGrad < justificari.length) {
    recomandari.push(
      `${justificari.length - totalCuGrad} posturi nu au grad evaluat. Includeți-le în sesiunile de evaluare pentru conformitate completă.`
    )
  }

  if (totalFaraBanda > 0) {
    recomandari.push(
      `${totalFaraBanda} posturi nu au bandă salarială definită. Rulați clusterizarea salarială pentru a stabili benzile.`
    )
  }

  if (subBanda > 0) {
    recomandari.push(
      `${subBanda} posturi au salariul sub banda minimă a gradului lor. Riscul de subevaluare sau sub-plată — revizuiți conform Art. 6.`
    )
  }

  if (pesteBanda > 0) {
    recomandari.push(
      `${pesteBanda} posturi au salariul peste banda maximă. Asigurați-vă că diferențele sunt justificate de factori obiectivi (vechime, certificări, performanță).`
    )
  }

  if (!verificareGlobala.esteNeutru) {
    recomandari.push(
      "ATENȚIE: Criteriile de evaluare nu sunt pe deplin neutre din punct de vedere al genului. Revizuiți formulările conform Art. 4."
    )
  }

  // Departamente cu dispersie mare
  const deptDispersie = sumarPerDepartament.filter(d => d.dispersieSalariala > 30)
  if (deptDispersie.length > 0) {
    recomandari.push(
      `Departamente cu dispersie salarială ridicată (> 30%): ${deptDispersie.map(d => `${d.categorie} (${d.dispersieSalariala}%)`).join(", ")}. Verificați dacă diferențele sunt justificate.`
    )
  }

  return {
    tenantId,
    generatedAt: new Date().toISOString(),
    totalPositii: justificari.length,
    totalCuGradEvaluat: totalCuGrad,
    totalFaraBanda,
    justificariPerPost: justificari,
    sumarPerDepartament,
    sumarPerJobFamily,
    verificareGlobalaNeutralitate: verificareGlobala,
    recomandari,
  }
}
