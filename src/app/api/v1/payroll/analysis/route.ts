import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { calculateSalaryClasses } from "@/lib/payroll/salary-clustering"
import { generateDiscrepancyReport } from "@/lib/payroll/discrepancy-report"

export const maxDuration = 60

const ALLOWED_ROLES = ["OWNER", "SUPER_ADMIN", "COMPANY_ADMIN"]

// ── POST — Rulează analiză (clusterizare sau discrepanțe) ──────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.tenantId || !ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json(
        { error: "Neautorizat. Rol insuficient sau sesiune invalidă." },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { action, numClasses } = body as {
      action?: string
      numClasses?: number
    }

    if (!action || !["cluster", "discrepancy"].includes(action)) {
      return NextResponse.json(
        {
          error:
            'Parametrul "action" este obligatoriu. Valori acceptate: "cluster", "discrepancy".',
        },
        { status: 400 }
      )
    }

    const tenantId = session.user.tenantId

    if (action === "cluster") {
      const validNumClasses =
        numClasses && Number.isInteger(numClasses) && numClasses >= 2 && numClasses <= 20
          ? numClasses
          : undefined

      const result = await calculateSalaryClasses(
        tenantId,
        prisma,
        validNumClasses
      )

      return NextResponse.json({
        success: true,
        action: "cluster",
        mesaj: `Clusterizare finalizată: ${result.totalEntries} intrări distribuite în ${result.numClasses} clase.`,
        rezultat: result,
      })
    }

    if (action === "discrepancy") {
      const report = await generateDiscrepancyReport(tenantId, prisma)

      return NextResponse.json({
        success: true,
        action: "discrepancy",
        mesaj: `Raport discrepanțe generat: ${report.totalAnalizate} posturi analizate, ${report.totalDiscrepante} discrepanțe identificate.`,
        rezultat: report,
      })
    }
  } catch (error) {
    console.error("[PayrollAnalysis POST]", error)
    return NextResponse.json(
      {
        error: "Eroare internă la procesarea analizei.",
        detalii: error instanceof Error ? error.message : "Eroare necunoscută",
      },
      { status: 500 }
    )
  }
}

// ── GET — Starea curentă (clase existente + sumar discrepanțe) ──────────────

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.tenantId || !ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json(
        { error: "Neautorizat. Rol insuficient sau sesiune invalidă." },
        { status: 403 }
      )
    }

    const tenantId = session.user.tenantId
    const db = prisma as any

    // Verifică dacă există grade calculate
    const entriesWithGrades = await db.payrollEntry.findMany({
      where: {
        tenantId,
        gradeCalculated: { not: null },
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
      orderBy: { gradeCalculated: "asc" },
    })

    if (entriesWithGrades.length === 0) {
      return NextResponse.json({
        success: true,
        stare: "FARA_CLASE",
        mesaj:
          "Nu există clase salariale calculate. Rulați mai întâi acțiunea de clusterizare (POST cu action: 'cluster').",
        clase: [],
        sumarDiscrepante: null,
      })
    }

    // Construiește sumar clase din datele existente
    const classMap = new Map<
      number,
      { values: number[]; count: number }
    >()

    for (const entry of entriesWithGrades) {
      const grade = Number(entry.gradeCalculated)
      const value = Number(entry.totalMonthlyGross) || 0
      if (!classMap.has(grade)) {
        classMap.set(grade, { values: [], count: 0 })
      }
      const cls = classMap.get(grade)!
      cls.values.push(value)
      cls.count++
    }

    const clase = Array.from(classMap.entries())
      .map(([grade, data]) => {
        const sorted = data.values.sort((a, b) => a - b)
        const mid = Math.floor(sorted.length / 2)
        const median =
          sorted.length % 2 !== 0
            ? sorted[mid]
            : (sorted[mid - 1] + sorted[mid]) / 2
        return {
          grade,
          min: sorted[0],
          max: sorted[sorted.length - 1],
          median,
          count: data.count,
        }
      })
      .sort((a, b) => a.grade - b.grade)

    // Sumar discrepanțe (dacă există grade evaluate)
    const cuAmble = entriesWithGrades.filter(
      (e: any) => e.gradeEvaluated != null
    )

    let sumarDiscrepante = null
    if (cuAmble.length > 0) {
      let corecte = 0
      let subevaluate = 0
      let supraevaluate = 0

      for (const entry of cuAmble) {
        const delta = Number(entry.gradeEvaluated) - Number(entry.gradeCalculated)
        if (Math.abs(delta) <= 1) {
          corecte++
        } else if (delta < 0) {
          subevaluate++
        } else {
          supraevaluate++
        }
      }

      sumarDiscrepante = {
        totalAnalizate: cuAmble.length,
        corecte,
        subevaluate,
        supraevaluate,
        procentCorecte:
          Math.round((corecte / cuAmble.length) * 10000) / 100,
      }
    }

    return NextResponse.json({
      success: true,
      stare: sumarDiscrepante ? "CLASE_SI_DISCREPANTE" : "DOAR_CLASE",
      mesaj: `${entriesWithGrades.length} intrări cu grade calculate, ${clase.length} clase identificate.`,
      totalIntrari: entriesWithGrades.length,
      clase,
      sumarDiscrepante,
    })
  } catch (error) {
    console.error("[PayrollAnalysis GET]", error)
    return NextResponse.json(
      {
        error: "Eroare internă la citirea stării analizei.",
        detalii: error instanceof Error ? error.message : "Eroare necunoscută",
      },
      { status: 500 }
    )
  }
}
