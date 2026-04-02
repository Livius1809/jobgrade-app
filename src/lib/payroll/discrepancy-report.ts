/**
 * discrepancy-report.ts — Raport discrepanțe între grade calculate și evaluate
 *
 * Compară gradeCalculated (din clusterizare salarială) cu gradeEvaluated
 * (din evaluarea joburilor) pentru a identifica neconcordanțe:
 * - SUBEVALUAT: gradul evaluat < gradul calculat (postul e plătit peste evaluare)
 * - SUPRAEVALUAT: gradul evaluat > gradul calculat (postul e plătit sub evaluare)
 * - CORECT: gradele coincid sau diferă cu max ±1
 */

import type { PrismaClient } from "@/generated/prisma"

// ── Tipuri ──────────────────────────────────────────────────────────────────

export type DiscrepancyType = "SUBEVALUAT" | "SUPRAEVALUAT" | "CORECT"

export interface EntryDiscrepancy {
  entryId: string
  jobTitle: string
  department: string
  jobFamily: string
  gradeCalculated: number
  gradeEvaluated: number
  delta: number
  clasificare: DiscrepancyType
  recomandare: string
}

export interface DepartmentSummary {
  department: string
  totalPositii: number
  corecte: number
  subevaluate: number
  supraevaluate: number
  deltaAbsoluMediu: number
  cazuriCritice: EntryDiscrepancy[]
}

export interface JobFamilySummary {
  jobFamily: string
  totalPositii: number
  corecte: number
  subevaluate: number
  supraevaluate: number
  deltaAbsoluMediu: number
}

export interface DiscrepancyReport {
  tenantId: string
  generatedAt: string
  totalAnalizate: number
  totalDiscrepante: number
  totalCorecte: number
  totalSubevaluate: number
  totalSupraevaluate: number
  deltaMediuAbsolut: number
  deltaMediuAlgebric: number
  perDepartament: DepartmentSummary[]
  perJobFamily: JobFamilySummary[]
  toateDiscrepantele: EntryDiscrepancy[]
  cazuriCritice: EntryDiscrepancy[]
  recomandariGenerale: string[]
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function clasificaDiscrepanta(
  gradeCalculated: number,
  gradeEvaluated: number
): DiscrepancyType {
  const delta = gradeEvaluated - gradeCalculated
  if (Math.abs(delta) <= 1) return "CORECT"
  return delta < 0 ? "SUBEVALUAT" : "SUPRAEVALUAT"
}

function genereazaRecomandare(
  clasificare: DiscrepancyType,
  delta: number,
  jobTitle: string
): string {
  const absDelta = Math.abs(delta)

  switch (clasificare) {
    case "SUBEVALUAT":
      if (absDelta >= 3) {
        return `Postul "${jobTitle}" este semnificativ subevaluat (${absDelta} grade diferență). Se recomandă reevaluarea imediată a complexității și responsabilităților postului sau revizuirea pachetului salarial.`
      }
      return `Postul "${jobTitle}" este subevaluat cu ${absDelta} grade. Verificați dacă evaluarea reflectă corect responsabilitățile actuale sau dacă salariul include componente nejustificate.`

    case "SUPRAEVALUAT":
      if (absDelta >= 3) {
        return `Postul "${jobTitle}" este semnificativ supraevaluat (${absDelta} grade diferență). Pachetul salarial pare sub nivelul de complexitate evaluat. Se recomandă revizuirea politicii de compensare pentru acest post.`
      }
      return `Postul "${jobTitle}" este supraevaluat cu ${absDelta} grade. Verificați dacă salariul reflectă corect nivelul de responsabilitate sau dacă evaluarea a fost prea generoasă.`

    case "CORECT":
      return `Postul "${jobTitle}" are o aliniere corectă între evaluare și compensare.`
  }
}

function genereazaRecomandariGenerale(
  report: Pick<
    DiscrepancyReport,
    | "totalAnalizate"
    | "totalDiscrepante"
    | "totalSubevaluate"
    | "totalSupraevaluate"
    | "deltaMediuAbsolut"
    | "perDepartament"
  >
): string[] {
  const recomandari: string[] = []
  const procentDiscrepante =
    report.totalAnalizate > 0
      ? Math.round((report.totalDiscrepante / report.totalAnalizate) * 100)
      : 0

  if (procentDiscrepante > 40) {
    recomandari.push(
      `Atenție: ${procentDiscrepante}% din posturi prezintă discrepanțe semnificative. Se recomandă o revizuire globală a grilei salariale sau a metodologiei de evaluare.`
    )
  } else if (procentDiscrepante > 20) {
    recomandari.push(
      `${procentDiscrepante}% din posturi au discrepanțe între evaluare și compensare. Se recomandă revizuirea targetată pe departamentele cele mai afectate.`
    )
  } else {
    recomandari.push(
      `Gradul de aliniere evaluare-compensare este bun (${100 - procentDiscrepante}% posturi corecte). Monitorizați periodic pentru a menține echitatea.`
    )
  }

  if (report.totalSubevaluate > report.totalSupraevaluate * 2) {
    recomandari.push(
      "Tendință predominantă de subevaluare: multe posturi sunt plătite peste nivelul lor evaluat. Revizuiți criteriile de evaluare — pot fi prea stricte."
    )
  } else if (report.totalSupraevaluate > report.totalSubevaluate * 2) {
    recomandari.push(
      "Tendință predominantă de supraevaluare: multe posturi sunt plătite sub nivelul evaluat. Posibil ca grila salarială să fie sub piață."
    )
  }

  if (report.deltaMediuAbsolut > 2.5) {
    recomandari.push(
      `Delta medie absolută este ${report.deltaMediuAbsolut.toFixed(1)} grade — decalaj semnificativ. Se recomandă plan de acțiune cu termene clare pentru fiecare departament.`
    )
  }

  // Departamente cu cele mai multe probleme
  const deptProbleme = report.perDepartament
    .filter((d) => d.subevaluate + d.supraevaluate > d.totalPositii * 0.5)
    .map((d) => d.department)

  if (deptProbleme.length > 0) {
    recomandari.push(
      `Departamentele cu cele mai mari discrepanțe: ${deptProbleme.join(", ")}. Prioritizați revizuirea acestora.`
    )
  }

  return recomandari
}

// ── Funcție principală ──────────────────────────────────────────────────────

/**
 * Generează raportul de discrepanțe între gradele calculate și evaluate.
 *
 * @param tenantId - ID-ul organizației
 * @param prisma - instanța Prisma (folosit ca `any` pentru modele noi)
 * @returns DiscrepancyReport complet
 */
export async function generateDiscrepancyReport(
  tenantId: string,
  prisma: PrismaClient
): Promise<DiscrepancyReport> {
  const db = prisma as any

  // 1. Preia intrările care au AMBELE grade
  const entries = await db.payrollEntry.findMany({
    where: {
      tenantId,
      gradeCalculated: { not: null },
      gradeEvaluated: { not: null },
    },
    select: {
      id: true,
      jobTitle: true,
      department: true,
      jobFamily: true,
      gradeCalculated: true,
      gradeEvaluated: true,
      totalMonthlyGross: true,
    },
  })

  if (entries.length === 0) {
    return {
      tenantId,
      generatedAt: new Date().toISOString(),
      totalAnalizate: 0,
      totalDiscrepante: 0,
      totalCorecte: 0,
      totalSubevaluate: 0,
      totalSupraevaluate: 0,
      deltaMediuAbsolut: 0,
      deltaMediuAlgebric: 0,
      perDepartament: [],
      perJobFamily: [],
      toateDiscrepantele: [],
      cazuriCritice: [],
      recomandariGenerale: [
        "Nu există posturi cu ambele grade (calculat și evaluat). Rulați mai întâi clusterizarea salarială și evaluarea posturilor.",
      ],
    }
  }

  // 2. Calculează discrepanțe per intrare
  const discrepante: EntryDiscrepancy[] = entries.map((entry: any) => {
    const gc = Number(entry.gradeCalculated)
    const ge = Number(entry.gradeEvaluated)
    const delta = ge - gc
    const clasificare = clasificaDiscrepanta(gc, ge)

    return {
      entryId: entry.id,
      jobTitle: entry.jobTitle || "N/A",
      department: entry.department || "N/A",
      jobFamily: entry.jobFamily || "N/A",
      gradeCalculated: gc,
      gradeEvaluated: ge,
      delta,
      clasificare,
      recomandare: genereazaRecomandare(clasificare, delta, entry.jobTitle || "N/A"),
    }
  })

  // 3. Statistici globale
  const totalCorecte = discrepante.filter((d) => d.clasificare === "CORECT").length
  const totalSubevaluate = discrepante.filter(
    (d) => d.clasificare === "SUBEVALUAT"
  ).length
  const totalSupraevaluate = discrepante.filter(
    (d) => d.clasificare === "SUPRAEVALUAT"
  ).length
  const totalDiscrepante = totalSubevaluate + totalSupraevaluate

  const sumDeltaAbs = discrepante.reduce((s, d) => s + Math.abs(d.delta), 0)
  const sumDeltaAlg = discrepante.reduce((s, d) => s + d.delta, 0)
  const deltaMediuAbsolut =
    discrepante.length > 0
      ? Math.round((sumDeltaAbs / discrepante.length) * 100) / 100
      : 0
  const deltaMediuAlgebric =
    discrepante.length > 0
      ? Math.round((sumDeltaAlg / discrepante.length) * 100) / 100
      : 0

  // 4. Grupare per departament
  const deptMap = new Map<string, EntryDiscrepancy[]>()
  for (const d of discrepante) {
    if (!deptMap.has(d.department)) deptMap.set(d.department, [])
    deptMap.get(d.department)!.push(d)
  }

  const perDepartament: DepartmentSummary[] = []
  for (const [dept, items] of deptMap.entries()) {
    const corecte = items.filter((i) => i.clasificare === "CORECT").length
    const sub = items.filter((i) => i.clasificare === "SUBEVALUAT").length
    const supra = items.filter((i) => i.clasificare === "SUPRAEVALUAT").length
    const avgDelta =
      items.length > 0
        ? Math.round(
            (items.reduce((s, i) => s + Math.abs(i.delta), 0) / items.length) *
              100
          ) / 100
        : 0

    // Cazuri critice = delta >= 3
    const critice = items
      .filter((i) => Math.abs(i.delta) >= 3)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))

    perDepartament.push({
      department: dept,
      totalPositii: items.length,
      corecte,
      subevaluate: sub,
      supraevaluate: supra,
      deltaAbsoluMediu: avgDelta,
      cazuriCritice: critice,
    })
  }
  perDepartament.sort((a, b) => b.deltaAbsoluMediu - a.deltaAbsoluMediu)

  // 5. Grupare per job family
  const familyMap = new Map<string, EntryDiscrepancy[]>()
  for (const d of discrepante) {
    if (!familyMap.has(d.jobFamily)) familyMap.set(d.jobFamily, [])
    familyMap.get(d.jobFamily)!.push(d)
  }

  const perJobFamily: JobFamilySummary[] = []
  for (const [family, items] of familyMap.entries()) {
    const corecte = items.filter((i) => i.clasificare === "CORECT").length
    const sub = items.filter((i) => i.clasificare === "SUBEVALUAT").length
    const supra = items.filter((i) => i.clasificare === "SUPRAEVALUAT").length
    const avgDelta =
      items.length > 0
        ? Math.round(
            (items.reduce((s, i) => s + Math.abs(i.delta), 0) / items.length) *
              100
          ) / 100
        : 0

    perJobFamily.push({
      jobFamily: family,
      totalPositii: items.length,
      corecte,
      subevaluate: sub,
      supraevaluate: supra,
      deltaAbsoluMediu: avgDelta,
    })
  }
  perJobFamily.sort((a, b) => b.deltaAbsoluMediu - a.deltaAbsoluMediu)

  // 6. Cazuri critice globale (delta >= 3)
  const cazuriCritice = discrepante
    .filter((d) => Math.abs(d.delta) >= 3)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))

  // 7. Doar discrepanțele (fără CORECT)
  const toateDiscrepantele = discrepante
    .filter((d) => d.clasificare !== "CORECT")
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))

  // 8. Construiește raportul parțial pentru recomandări
  const partialReport = {
    totalAnalizate: discrepante.length,
    totalDiscrepante,
    totalSubevaluate,
    totalSupraevaluate,
    deltaMediuAbsolut,
    perDepartament,
  }

  const recomandariGenerale = genereazaRecomandariGenerale(partialReport)

  return {
    tenantId,
    generatedAt: new Date().toISOString(),
    totalAnalizate: discrepante.length,
    totalDiscrepante,
    totalCorecte,
    totalSubevaluate,
    totalSupraevaluate,
    deltaMediuAbsolut,
    deltaMediuAlgebric,
    perDepartament,
    perJobFamily,
    toateDiscrepantele,
    cazuriCritice,
    recomandariGenerale,
  }
}
