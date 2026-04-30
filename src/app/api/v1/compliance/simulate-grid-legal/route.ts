/**
 * /api/v1/compliance/simulate-grid-legal
 *
 * Simulare C2: Compar grila cu benchmark legal.
 * Verifica daca grila salariala respecta minimul pe economie,
 * regulile de overtime si pozitionarea fata de piata.
 *
 * POST — Comparare grila salariala cu minimele legale si benchmark
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

export const dynamic = "force-dynamic"

// Salariul minim pe economie 2026 (RON brut)
const SALARIUL_MINIM_ECONOMIE_2026 = 3700

// Cote legale overtime conform Codul Muncii Art. 123
const OVERTIME_RATE_NORMAL = 1.75  // 175% — spor minim ore suplimentare
const OVERTIME_RATE_WEEKEND = 2.0  // 200% — spor minim weekend/sarbatori legale

// Schema validare input
const SimulateGridSchema = z.object({
  sessionId: z.string().optional(),
})

interface GradeComplianceResult {
  name: string
  order: number
  salaryMin: number | null
  salaryMax: number | null
  legalMinimum: number
  compliant: boolean
  marketPosition: string | null
  benchmarkMedian: number | null
  issues: string[]
}

// POST — Verificare grila salariala vs minimele legale si benchmark piata
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
    }

    const { tenantId } = session.user

    const body = await req.json()
    const parsed = SimulateGridSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Date invalide", details: parsed.error.flatten() },
        { status: 422 },
      )
    }

    const { sessionId: inputSessionId } = parsed.data

    // Determinam sesiunea de evaluare (specificata sau cea mai recenta)
    let targetSessionId = inputSessionId

    if (!targetSessionId) {
      const latestSession = await prisma.evaluationSession.findFirst({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      })

      if (!latestSession) {
        return NextResponse.json(
          { error: "Nu exista sesiuni de evaluare pentru acest tenant." },
          { status: 400 },
        )
      }

      targetSessionId = latestSession.id
    }

    // Incarcam gradele din sesiunea de evaluare
    const grades = await prisma.salaryGrade.findMany({
      where: { tenantId, sessionId: targetSessionId },
      orderBy: { order: "asc" },
      select: {
        id: true,
        name: true,
        order: true,
        salaryMin: true,
        salaryMax: true,
        scoreMin: true,
        scoreMax: true,
      },
    })

    if (grades.length === 0) {
      return NextResponse.json(
        { error: "Nu exista grade salariale in sesiunea selectata." },
        { status: 400 },
      )
    }

    // Incarcam date benchmark disponibile (daca exista)
    let benchmarkData: Map<number, { median: number; p25: number; p75: number }> = new Map()
    try {
      const benchmarks = await prisma.salaryBenchmark.findMany({
        where: { isActive: true },
        orderBy: [{ year: "desc" }],
        take: 50, // ultimele 50 intrari
        select: {
          gradeMin: true,
          gradeMax: true,
          salaryMedian: true,
          salaryP25: true,
          salaryP75: true,
        },
      })

      // Agregam benchmark-uri per grad
      for (const b of benchmarks) {
        const minG = b.gradeMax ?? 1  // grade 1 = cel mai mare (Executive)
        const maxG = b.gradeMin ?? 8  // grade 8 = cel mai mic (Entry)
        for (let g = minG; g <= maxG; g++) {
          if (!benchmarkData.has(g)) {
            benchmarkData.set(g, { median: b.salaryMedian, p25: b.salaryP25, p75: b.salaryP75 })
          }
        }
      }
    } catch {
      // Benchmark indisponibil — continuam fara date piata
    }

    // Analizam fiecare grad
    const gradeResults: GradeComplianceResult[] = []
    let overallCompliant = true

    for (const grade of grades) {
      const issues: string[] = []
      let compliant = true

      // 1. Verificare salariu minim pe economie
      if (grade.salaryMin !== null && grade.salaryMin < SALARIUL_MINIM_ECONOMIE_2026) {
        issues.push(
          `Salariul minim al gradului (${grade.salaryMin} RON) este sub salariul minim pe economie (${SALARIUL_MINIM_ECONOMIE_2026} RON). Codul Muncii Art. 164.`
        )
        compliant = false
      }

      // 2. Verificare interval valid (min < max)
      if (
        grade.salaryMin !== null &&
        grade.salaryMax !== null &&
        grade.salaryMin > grade.salaryMax
      ) {
        issues.push(
          `Intervalul salarial este invalid: minim (${grade.salaryMin}) > maxim (${grade.salaryMax}).`
        )
        compliant = false
      }

      // 3. Verificare ca gradele nu se suprapun (salariul maxim al gradului N
      //    nu trebuie sa depaseasca salariul minim al gradului N+1)
      //    — se face post-loop

      // 4. Verificare conformitate overtime (informativ)
      if (grade.salaryMin !== null) {
        const hourlyRate = grade.salaryMin / 168 // 168 ore/luna (21 zile * 8h)
        const overtimeHourly = hourlyRate * OVERTIME_RATE_NORMAL
        const weekendHourly = hourlyRate * OVERTIME_RATE_WEEKEND

        // Verificam ca rata orara overtime depaseste minimul legal
        const minHourly = SALARIUL_MINIM_ECONOMIE_2026 / 168
        if (overtimeHourly < minHourly * OVERTIME_RATE_NORMAL) {
          issues.push(
            `Rata orara pentru ore suplimentare (${overtimeHourly.toFixed(2)} RON/h) este sub pragul legal de ${(minHourly * OVERTIME_RATE_NORMAL).toFixed(2)} RON/h (175% din minimul pe economie). Codul Muncii Art. 123.`
          )
          compliant = false
        }
      }

      // 5. Comparare cu benchmark piata (daca disponibil)
      let marketPosition: string | null = null
      let benchmarkMedian: number | null = null

      const gradeOrder = grade.order
      const bm = benchmarkData.get(gradeOrder)

      if (bm && grade.salaryMin !== null) {
        benchmarkMedian = bm.median
        const midpoint = grade.salaryMax !== null
          ? (grade.salaryMin + grade.salaryMax) / 2
          : grade.salaryMin

        if (midpoint < bm.p25) {
          marketPosition = "SUB_PIATA"
          issues.push(
            `Pozitionare sub piata: midpoint grila (${Math.round(midpoint)} RON) < P25 benchmark (${bm.p25} RON). Risc retentie angajati.`
          )
        } else if (midpoint >= bm.p25 && midpoint < bm.median) {
          marketPosition = "P25_MEDIAN"
        } else if (midpoint >= bm.median && midpoint <= bm.p75) {
          marketPosition = "MEDIAN_P75"
        } else {
          marketPosition = "PESTE_P75"
        }
      }

      // 6. Verificare ca exista interval salarial definit
      if (grade.salaryMin === null && grade.salaryMax === null) {
        issues.push(
          "Gradul nu are interval salarial definit. Conformitatea nu poate fi evaluata complet."
        )
      }

      if (!compliant) overallCompliant = false

      gradeResults.push({
        name: grade.name,
        order: grade.order,
        salaryMin: grade.salaryMin,
        salaryMax: grade.salaryMax,
        legalMinimum: SALARIUL_MINIM_ECONOMIE_2026,
        compliant,
        marketPosition,
        benchmarkMedian,
        issues,
      })
    }

    // Verificare suprapuneri intre grade consecutive
    for (let i = 0; i < gradeResults.length - 1; i++) {
      const current = gradeResults[i]
      const next = gradeResults[i + 1]

      if (
        current.salaryMax !== null &&
        next.salaryMin !== null &&
        current.salaryMax > next.salaryMin
      ) {
        current.issues.push(
          `Suprapunere cu gradul urmator "${next.name}": maxim ${current.name} (${current.salaryMax} RON) > minim ${next.name} (${next.salaryMin} RON).`
        )
      }
    }

    // Sumar conformitate overtime (informativ, la nivel de organizatie)
    const overtimeCompliance = {
      normalRate: `${OVERTIME_RATE_NORMAL * 100}%`,
      weekendRate: `${OVERTIME_RATE_WEEKEND * 100}%`,
      legalBasis: "Codul Muncii Art. 123 alin. (2) si Art. 142",
      note: "Sporul minim pentru ore suplimentare este 75% din salariul de baza. Pentru munca in zilele de repaus saptamanal sau sarbatori legale, sporul este de 100%.",
    }

    return NextResponse.json({
      sessionId: targetSessionId,
      grades: gradeResults,
      overallCompliant,
      legalMinimum: SALARIUL_MINIM_ECONOMIE_2026,
      overtimeCompliance,
      benchmarkAvailable: benchmarkData.size > 0,
      summary: {
        totalGrades: gradeResults.length,
        compliantGrades: gradeResults.filter((g) => g.compliant).length,
        nonCompliantGrades: gradeResults.filter((g) => !g.compliant).length,
        gradesWithoutSalary: gradeResults.filter(
          (g) => g.salaryMin === null && g.salaryMax === null,
        ).length,
        gradesBelowMarket: gradeResults.filter((g) => g.marketPosition === "SUB_PIATA").length,
      },
    })
  } catch (error) {
    console.error("[SIMULATE-GRID-LEGAL POST]", error)
    return NextResponse.json({ error: "Eroare server." }, { status: 500 })
  }
}
