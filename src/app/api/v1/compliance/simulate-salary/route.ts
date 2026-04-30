/**
 * /api/v1/compliance/simulate-salary
 *
 * Simulare C2: Ajustez salariu -> impact pay gap si echitate.
 * What-if: daca schimb salariul unui angajat, cum se modifica
 * indicatorii pay gap si alinierea la grila de grade?
 *
 * POST — Simulare impact modificare salariu
 */

import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

export const dynamic = "force-dynamic"

// Schema validare input
const SimulateSalarySchema = z.object({
  employeeId: z.string().optional(),
  jobId: z.string().optional(),
  newSalary: z.number().positive("Salariul trebuie sa fie pozitiv"),
  currentSalary: z.number().positive().optional(),
})

// POST — Simulare impact modificare salariu pe pay gap si echitate
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
    }

    const { tenantId } = session.user

    const body = await req.json()
    const parsed = SimulateSalarySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Date invalide", details: parsed.error.flatten() },
        { status: 422 },
      )
    }

    const { employeeId, jobId, newSalary, currentSalary: inputCurrentSalary } = parsed.data

    // Incarcam toate inregistrarile salariale ale tenant-ului (anul curent)
    const currentYear = new Date().getFullYear()
    const allRecords = await prisma.employeeSalaryRecord.findMany({
      where: { tenantId, periodYear: currentYear },
      select: {
        id: true,
        employeeCode: true,
        gender: true,
        baseSalary: true,
        variableComp: true,
        department: true,
        jobCategory: true,
        salaryGradeId: true,
      },
    })

    if (allRecords.length === 0) {
      return NextResponse.json(
        { error: "Nu exista date salariale pentru anul curent." },
        { status: 400 },
      )
    }

    // Identificam angajatul tinta (dupa employeeId sau jobId)
    let targetRecord = employeeId
      ? allRecords.find((r) => r.id === employeeId || r.employeeCode === employeeId)
      : jobId
        ? allRecords.find((r) => r.jobCategory === jobId || r.salaryGradeId === jobId)
        : null

    // Daca nu gasim angajatul, folosim currentSalary ca referinta generica
    const effectiveCurrentSalary = targetRecord
      ? targetRecord.baseSalary
      : inputCurrentSalary ?? 0

    if (!targetRecord && !inputCurrentSalary) {
      return NextResponse.json(
        { error: "Specificati employeeId, jobId sau currentSalary pentru simulare." },
        { status: 400 },
      )
    }

    // --- Calculam pay gap ACTUAL ---
    const computeGap = (records: typeof allRecords) => {
      const males = records.filter((r) => r.gender === "MALE")
      const females = records.filter((r) => r.gender === "FEMALE")

      const avgMale =
        males.length > 0 ? males.reduce((s, r) => s + r.baseSalary, 0) / males.length : 0
      const avgFemale =
        females.length > 0 ? females.reduce((s, r) => s + r.baseSalary, 0) / females.length : 0

      // Pay gap % = (avgMale - avgFemale) / avgMale * 100
      const gap = avgMale > 0 ? ((avgMale - avgFemale) / avgMale) * 100 : 0

      // Equity ratio = avgFemale / avgMale (1.0 = perfect equity)
      const equityRatio = avgMale > 0 ? avgFemale / avgMale : 1

      return {
        gap: parseFloat(gap.toFixed(2)),
        equityRatio: parseFloat(equityRatio.toFixed(4)),
        avgMale: Math.round(avgMale),
        avgFemale: Math.round(avgFemale),
        countMale: males.length,
        countFemale: females.length,
      }
    }

    const currentMetrics = computeGap(allRecords)

    // --- Calculam pay gap SIMULAT (cu noul salariu) ---
    const simulatedRecords = allRecords.map((r) => {
      if (targetRecord && r.id === targetRecord.id) {
        return { ...r, baseSalary: newSalary }
      }
      return r
    })

    // Daca nu avem target record, adaugam un record virtual cu noul salariu
    // (simulare generica fara angajat specific)
    let simulatedMetrics = currentMetrics
    if (targetRecord) {
      simulatedMetrics = computeGap(simulatedRecords)
    } else {
      // Simulare generica: estimam impactul ca diferenta procentuala
      const salaryDelta = newSalary - effectiveCurrentSalary
      const totalSalary = allRecords.reduce((s, r) => s + r.baseSalary, 0)
      const impactPercent = totalSalary > 0 ? (salaryDelta / totalSalary) * 100 : 0
      simulatedMetrics = {
        ...currentMetrics,
        gap: parseFloat((currentMetrics.gap - impactPercent * 0.5).toFixed(2)),
        equityRatio: parseFloat(
          (currentMetrics.equityRatio + impactPercent * 0.005).toFixed(4),
        ),
        avgMale: currentMetrics.avgMale,
        avgFemale: currentMetrics.avgFemale,
        countMale: currentMetrics.countMale,
        countFemale: currentMetrics.countFemale,
      }
    }

    // --- Verificare aliniere la grila de grade ---
    let gradeAligned = true
    let gradeInfo: {
      gradeName: string
      salaryMin: number | null
      salaryMax: number | null
    } | null = null

    if (targetRecord?.salaryGradeId) {
      const grade = await prisma.salaryGrade.findUnique({
        where: { id: targetRecord.salaryGradeId },
        select: { name: true, salaryMin: true, salaryMax: true },
      })

      if (grade) {
        gradeInfo = {
          gradeName: grade.name,
          salaryMin: grade.salaryMin,
          salaryMax: grade.salaryMax,
        }

        // Verificam daca noul salariu e in intervalul gradului
        if (grade.salaryMin !== null && newSalary < grade.salaryMin) {
          gradeAligned = false
        }
        if (grade.salaryMax !== null && newSalary > grade.salaryMax) {
          gradeAligned = false
        }
      }
    }

    // --- Delta si recomandare ---
    const delta = parseFloat((simulatedMetrics.gap - currentMetrics.gap).toFixed(2))
    const equityDelta = parseFloat(
      (simulatedMetrics.equityRatio - currentMetrics.equityRatio).toFixed(4),
    )

    // Construim recomandare bazata pe rezultate
    let recommendation = ""
    if (Math.abs(delta) < 0.1) {
      recommendation = "Modificarea salariului are impact neglijabil asupra pay gap-ului."
    } else if (delta < 0) {
      recommendation = `Modificarea reduce pay gap-ul cu ${Math.abs(delta)}%. Actiune recomandata pentru conformitate EU 2023/970.`
    } else {
      recommendation = `Atentie: modificarea creste pay gap-ul cu ${delta}%. Evaluati daca exista justificare obiectiva conform Art. 4 Directiva EU 2023/970.`
    }

    if (!gradeAligned && gradeInfo) {
      recommendation += ` Salariul propus (${newSalary} RON) este in afara intervalului gradului "${gradeInfo.gradeName}" (${gradeInfo.salaryMin ?? "?"} - ${gradeInfo.salaryMax ?? "?"} RON).`
    }

    return NextResponse.json({
      currentGap: currentMetrics.gap,
      simulatedGap: simulatedMetrics.gap,
      delta,
      equityDelta,
      gradeAligned,
      gradeInfo,
      recommendation,
      details: {
        currentSalary: effectiveCurrentSalary,
        newSalary,
        targetEmployee: targetRecord?.employeeCode ?? null,
        currentMetrics,
        simulatedMetrics,
      },
    })
  } catch (error) {
    console.error("[SIMULATE-SALARY POST]", error)
    return NextResponse.json({ error: "Eroare server." }, { status: 500 })
  }
}
