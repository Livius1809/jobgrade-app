/**
 * coherence-report.ts — Raport coerență salarială
 *
 * Verificări de coerență internă a grilei salariale:
 * 1. Același grad = aceeași bandă salarială? (verificare per grad)
 * 2. Diferențele justificate de: vechime, certificări, locație?
 * 3. Diferențe nejustificate semnalizate
 * 4. Dimensiunea gen: același grad, salariu diferit, gen diferit?
 *
 * Export: generateCoherenceReport(tenantId, prisma)
 */

import type { PrismaClient } from "@/generated/prisma"

// ── Tipuri ──────────────────────────────────────────────────────────────────

export type IncoherentaType =
  | "DIFERENTA_NEJUSTIFICATA"
  | "GAP_GEN_ACELASI_GRAD"
  | "DISPERSIE_EXCESIVA"
  | "OUTLIER"

export interface GradeCoherenceEntry {
  entryId: string
  jobCode: string
  jobTitle: string
  department: string
  gender: string
  totalMonthlyGross: number
  baseSalary: number
  tenureOrg: number
  tenureRole: number
  certifications: string | null
  workLocation: string
  city: string
  deviatieProcentFataDeMedie: number   // % deviație față de media gradului
}

export interface GradeCoherence {
  grad: number
  totalAngajati: number
  medieSalariala: number
  medianaSalariala: number
  minSalariu: number
  maxSalariu: number
  coeficientVariatie: number            // dispersie %
  esteCoherent: boolean                 // CV < 15%
  angajati: GradeCoherenceEntry[]
  incoerente: IncoherentaEntry[]
}

export interface IncoherentaEntry {
  entryId: string
  jobCode: string
  jobTitle: string
  department: string
  gender: string
  totalMonthlyGross: number
  grad: number
  tip: IncoherentaType
  deviatieProcentFataDeMedie: number
  justificariPosibile: string[]
  poateJustifica: boolean              // are factori obiectivi care pot explica diferența
  descriere: string
}

export interface GenderGradeGap {
  grad: number
  numarFemei: number
  numarBarbati: number
  medieFemei: number
  medieBarbati: number
  gapProcent: number                   // (M - F) / M * 100
  necesitaInvestigare: boolean         // gap > 3%
  cazuri: Array<{
    femeie: { entryId: string; jobTitle: string; totalMonthlyGross: number }
    barbat: { entryId: string; jobTitle: string; totalMonthlyGross: number }
    diferentaProcent: number
  }>
}

export interface CoherenceReport {
  tenantId: string
  generatedAt: string
  totalAnalizate: number

  // Per grad
  coherentaPerGrad: GradeCoherence[]

  // Incoerențe globale
  totalIncoerente: number
  totalNejustificate: number
  incoerente: IncoherentaEntry[]

  // Dimensiune gen
  gapGenPerGrad: GenderGradeGap[]
  totalGradelorCuGapGen: number

  // Sumar
  scorCoerenta: number                  // 0-100, 100 = perfect coerent
  recomandari: string[]
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function calcMediana(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2
}

function calcCoefVariatie(values: number[]): number {
  if (values.length < 2) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  if (mean === 0) return 0
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length
  return round2((Math.sqrt(variance) / mean) * 100)
}

function evalueazaJustificari(entry: any, deviatieAbs: number): {
  justificari: string[]
  poateJustifica: boolean
} {
  const justificari: string[] = []
  let poateJustifica = false

  // Vechime organizație > 5 ani poate justifica +/- 10%
  if (Number(entry.tenureOrg) > 5) {
    justificari.push(`Vechime organizație: ${entry.tenureOrg} ani`)
    if (deviatieAbs <= 15) poateJustifica = true
  }

  // Vechime în rol > 3 ani
  if (Number(entry.tenureRole) > 3) {
    justificari.push(`Vechime în rol: ${entry.tenureRole} ani`)
    if (deviatieAbs <= 10) poateJustifica = true
  }

  // Certificări profesionale
  if (entry.certifications && entry.certifications.trim().length > 0) {
    justificari.push(`Certificări: ${entry.certifications}`)
    if (deviatieAbs <= 12) poateJustifica = true
  }

  // Locație diferită (poate justifica diferențe de cost of living)
  if (entry.city) {
    justificari.push(`Localitate: ${entry.city}`)
  }
  if (entry.workLocation) {
    justificari.push(`Mod lucru: ${entry.workLocation}`)
  }

  // Dacă deviația e peste 25%, niciun factor nu poate justifica singur
  if (deviatieAbs > 25) {
    poateJustifica = false
  }

  return { justificari, poateJustifica }
}

// ── Funcție principală ──────────────────────────────────────────────────────

/**
 * Generează raportul de coerență salarială per grad.
 *
 * @param tenantId - ID-ul organizației
 * @param prisma - instanța Prisma
 * @returns CoherenceReport complet
 */
export async function generateCoherenceReport(
  tenantId: string,
  prisma: PrismaClient
): Promise<CoherenceReport> {
  const db = prisma as any

  // 1. Preia toate intrările cu grad evaluat
  const entries = await db.payrollEntry.findMany({
    where: {
      tenantId,
      gradeEvaluated: { not: null },
      totalMonthlyGross: { not: null },
    },
    select: {
      id: true,
      jobCode: true,
      jobTitle: true,
      department: true,
      gender: true,
      totalMonthlyGross: true,
      baseSalary: true,
      gradeEvaluated: true,
      tenureOrg: true,
      tenureRole: true,
      certifications: true,
      workLocation: true,
      city: true,
    },
  })

  if (entries.length === 0) {
    return {
      tenantId,
      generatedAt: new Date().toISOString(),
      totalAnalizate: 0,
      coherentaPerGrad: [],
      totalIncoerente: 0,
      totalNejustificate: 0,
      incoerente: [],
      gapGenPerGrad: [],
      totalGradelorCuGapGen: 0,
      scorCoerenta: 100,
      recomandari: [
        "Nu există date suficiente (posturi cu grad evaluat și salariu calculat). Rulați evaluarea și importul salarial.",
      ],
    }
  }

  // 2. Grupare per grad
  const gradeMap = new Map<number, any[]>()
  for (const e of entries) {
    const g = Number(e.gradeEvaluated)
    if (!gradeMap.has(g)) gradeMap.set(g, [])
    gradeMap.get(g)!.push(e)
  }

  const coherentaPerGrad: GradeCoherence[] = []
  const toateIncoerente: IncoherentaEntry[] = []
  const THRESHOLD_OUTLIER = 20        // > 20% deviație = outlier
  const THRESHOLD_DISPERSIE = 15      // CV > 15% = dispersie excesivă

  for (const [grad, gradeEntries] of gradeMap.entries()) {
    const salarii = gradeEntries.map((e: any) => Number(e.totalMonthlyGross))
    const medie = salarii.reduce((a: number, b: number) => a + b, 0) / salarii.length
    const mediana = calcMediana(salarii)
    const cv = calcCoefVariatie(salarii)

    const angajati: GradeCoherenceEntry[] = gradeEntries.map((e: any) => {
      const gross = Number(e.totalMonthlyGross)
      const deviatie = medie > 0 ? round2(((gross - medie) / medie) * 100) : 0
      return {
        entryId: e.id,
        jobCode: e.jobCode,
        jobTitle: e.jobTitle,
        department: e.department,
        gender: e.gender,
        totalMonthlyGross: gross,
        baseSalary: Number(e.baseSalary),
        tenureOrg: Number(e.tenureOrg),
        tenureRole: Number(e.tenureRole),
        certifications: e.certifications,
        workLocation: e.workLocation,
        city: e.city,
        deviatieProcentFataDeMedie: deviatie,
      }
    })

    // Detectare incoerențe
    const incoerente: IncoherentaEntry[] = []

    for (const e of gradeEntries) {
      const gross = Number(e.totalMonthlyGross)
      const deviatie = medie > 0 ? ((gross - medie) / medie) * 100 : 0
      const deviatieAbs = Math.abs(deviatie)

      if (deviatieAbs > THRESHOLD_OUTLIER) {
        const { justificari, poateJustifica } = evalueazaJustificari(e, deviatieAbs)

        const tip: IncoherentaType = poateJustifica ? "OUTLIER" : "DIFERENTA_NEJUSTIFICATA"
        const descriere = poateJustifica
          ? `Salariul deviază cu ${round2(deviatie)}% față de media gradului ${grad}, dar are justificări posibile: ${justificari.join("; ")}.`
          : `Salariul deviază cu ${round2(deviatie)}% față de media gradului ${grad} fără justificări obiective suficiente.`

        const entry: IncoherentaEntry = {
          entryId: e.id,
          jobCode: e.jobCode,
          jobTitle: e.jobTitle,
          department: e.department,
          gender: e.gender,
          totalMonthlyGross: gross,
          grad,
          tip,
          deviatieProcentFataDeMedie: round2(deviatie),
          justificariPosibile: justificari,
          poateJustifica,
          descriere,
        }

        incoerente.push(entry)
        toateIncoerente.push(entry)
      }
    }

    // Dispersie excesivă la nivel de grad
    if (cv > THRESHOLD_DISPERSIE && gradeEntries.length >= 3) {
      // Adaugă o incoerență de tip DISPERSIE_EXCESIVA pentru gradul întreg
      // (doar dacă nu există deja outlieri care explică dispersia)
      if (incoerente.length === 0) {
        const incoerenta: IncoherentaEntry = {
          entryId: `grade-${grad}`,
          jobCode: "*",
          jobTitle: `Toate posturile din gradul ${grad}`,
          department: "*",
          gender: "*",
          totalMonthlyGross: round2(medie),
          grad,
          tip: "DISPERSIE_EXCESIVA",
          deviatieProcentFataDeMedie: cv,
          justificariPosibile: [],
          poateJustifica: false,
          descriere: `Gradul ${grad} are coeficient de variație ${cv}% (prag: ${THRESHOLD_DISPERSIE}%). Salariile sunt prea dispersate pentru același grad.`,
        }
        incoerente.push(incoerenta)
        toateIncoerente.push(incoerenta)
      }
    }

    coherentaPerGrad.push({
      grad,
      totalAngajati: gradeEntries.length,
      medieSalariala: round2(medie),
      medianaSalariala: round2(mediana),
      minSalariu: Math.min(...salarii),
      maxSalariu: Math.max(...salarii),
      coeficientVariatie: cv,
      esteCoherent: cv <= THRESHOLD_DISPERSIE && incoerente.length === 0,
      angajati,
      incoerente,
    })
  }

  coherentaPerGrad.sort((a, b) => a.grad - b.grad)

  // 3. Dimensiune gen: per grad, compară salarii F vs M
  const gapGenPerGrad: GenderGradeGap[] = []

  for (const [grad, gradeEntries] of gradeMap.entries()) {
    const femei = gradeEntries.filter((e: any) => e.gender === "FEMALE")
    const barbati = gradeEntries.filter((e: any) => e.gender === "MALE")

    if (femei.length === 0 || barbati.length === 0) continue

    const medieFemei = femei.reduce((s: number, e: any) => s + Number(e.totalMonthlyGross), 0) / femei.length
    const medieBarbati = barbati.reduce((s: number, e: any) => s + Number(e.totalMonthlyGross), 0) / barbati.length
    const gap = medieBarbati > 0
      ? round2(((medieBarbati - medieFemei) / medieBarbati) * 100)
      : 0

    // Cazuri concrete: perechi F-M cu diferențe semnificative
    const cazuri: GenderGradeGap["cazuri"] = []
    for (const f of femei) {
      for (const m of barbati) {
        const fGross = Number(f.totalMonthlyGross)
        const mGross = Number(m.totalMonthlyGross)
        if (mGross === 0) continue
        const diff = round2(((mGross - fGross) / mGross) * 100)
        if (Math.abs(diff) > 5) {
          cazuri.push({
            femeie: { entryId: f.id, jobTitle: f.jobTitle, totalMonthlyGross: fGross },
            barbat: { entryId: m.id, jobTitle: m.jobTitle, totalMonthlyGross: mGross },
            diferentaProcent: diff,
          })
        }
      }
    }

    // Sortare descrescătoare după diferență
    cazuri.sort((a, b) => Math.abs(b.diferentaProcent) - Math.abs(a.diferentaProcent))

    const necesitaInvestigare = Math.abs(gap) > 3

    gapGenPerGrad.push({
      grad,
      numarFemei: femei.length,
      numarBarbati: barbati.length,
      medieFemei: round2(medieFemei),
      medieBarbati: round2(medieBarbati),
      gapProcent: gap,
      necesitaInvestigare,
      cazuri: cazuri.slice(0, 10),  // max 10 cazuri per grad
    })

    // Adaugă ca incoerență de gen
    if (necesitaInvestigare) {
      for (const caz of cazuri.slice(0, 3)) {
        const incoerenta: IncoherentaEntry = {
          entryId: caz.femeie.entryId,
          jobCode: "",
          jobTitle: `${caz.femeie.jobTitle} vs ${caz.barbat.jobTitle}`,
          department: "",
          gender: "F vs M",
          totalMonthlyGross: caz.femeie.totalMonthlyGross,
          grad,
          tip: "GAP_GEN_ACELASI_GRAD",
          deviatieProcentFataDeMedie: caz.diferentaProcent,
          justificariPosibile: [],
          poateJustifica: false,
          descriere: `Același grad ${grad}: femeie (${caz.femeie.totalMonthlyGross} RON) vs bărbat (${caz.barbat.totalMonthlyGross} RON) — diferență ${caz.diferentaProcent}%.`,
        }
        toateIncoerente.push(incoerenta)
      }
    }
  }

  gapGenPerGrad.sort((a, b) => Math.abs(b.gapProcent) - Math.abs(a.gapProcent))

  // 4. Scor coerență global (0-100)
  const totalGrade = coherentaPerGrad.length
  const gradeCoerente = coherentaPerGrad.filter(g => g.esteCoherent).length
  const totalNejustificate = toateIncoerente.filter(i => !i.poateJustifica).length
  const totalGradelorCuGapGen = gapGenPerGrad.filter(g => g.necesitaInvestigare).length

  let scorCoerenta = totalGrade > 0
    ? round2((gradeCoerente / totalGrade) * 100)
    : 100
  // Penalizare pentru gap de gen
  if (totalGradelorCuGapGen > 0) {
    scorCoerenta = Math.max(0, scorCoerenta - totalGradelorCuGapGen * 5)
  }
  // Penalizare pentru incoerențe nejustificate
  if (totalNejustificate > 0) {
    scorCoerenta = Math.max(0, scorCoerenta - Math.min(totalNejustificate * 3, 30))
  }
  scorCoerenta = round2(scorCoerenta)

  // 5. Recomandări
  const recomandari: string[] = []

  if (scorCoerenta >= 80) {
    recomandari.push(
      `Scor coerență: ${scorCoerenta}/100 — bun. Grila salarială este în mare parte coerentă cu evaluarea posturilor.`
    )
  } else if (scorCoerenta >= 50) {
    recomandari.push(
      `Scor coerență: ${scorCoerenta}/100 — necesită atenție. Se recomandă revizuirea targetată a gradelor cu dispersie mare.`
    )
  } else {
    recomandari.push(
      `Scor coerență: ${scorCoerenta}/100 — critic. Grila salarială prezintă incoerențe semnificative. Se impune plan de acțiune imediat.`
    )
  }

  if (totalNejustificate > 0) {
    recomandari.push(
      `${totalNejustificate} diferențe salariale nejustificate detectate. Fiecare trebuie documentată sau corectată conform Art. 6.`
    )
  }

  if (totalGradelorCuGapGen > 0) {
    recomandari.push(
      `${totalGradelorCuGapGen} grad(e) prezintă diferențe salariale de gen > 3% pentru același grad. Investigați cauzele și documentați justificarea sau corectați.`
    )
  }

  const gradeIncoerente = coherentaPerGrad.filter(g => !g.esteCoherent)
  if (gradeIncoerente.length > 0) {
    recomandari.push(
      `Grade cu dispersie excesivă: ${gradeIncoerente.map(g => `Grad ${g.grad} (CV: ${g.coeficientVariatie}%)`).join(", ")}. Verificați dacă aceste posturi sunt corect clasificate.`
    )
  }

  // Sortare incoerențe: nejustificate primele
  toateIncoerente.sort((a, b) => {
    if (a.poateJustifica !== b.poateJustifica) return a.poateJustifica ? 1 : -1
    return Math.abs(b.deviatieProcentFataDeMedie) - Math.abs(a.deviatieProcentFataDeMedie)
  })

  return {
    tenantId,
    generatedAt: new Date().toISOString(),
    totalAnalizate: entries.length,
    coherentaPerGrad,
    totalIncoerente: toateIncoerente.length,
    totalNejustificate,
    incoerente: toateIncoerente,
    gapGenPerGrad,
    totalGradelorCuGapGen,
    scorCoerenta,
    recomandari,
  }
}
