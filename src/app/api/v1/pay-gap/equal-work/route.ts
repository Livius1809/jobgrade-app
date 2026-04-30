import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"
import { analyzeEqualWork } from "@/lib/pay-gap"

export const dynamic = "force-dynamic"

/**
 * GET /api/v1/pay-gap/equal-work?year=2026&tolerance=100
 *
 * Analiză pay gap pe muncă egală (Art. 4 Directiva EU 2023/970).
 * Grupează angajați pe scor evaluare (±toleranță) × normă de lucru.
 * Compară F vs M în fiecare grup.
 *
 * Returnează: grupuri cu gap, flag (OK/ATENȚIE/SEMNIFICATIV), angajați per grup.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ message: "Neautorizat." }, { status: 401 })

    const tenantId = session.user.tenantId
    const { searchParams } = new URL(req.url)
    const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()))
    const tolerance = parseInt(searchParams.get("tolerance") ?? "100")

    const records = await prisma.employeeSalaryRecord.findMany({
      where: { tenantId, periodYear: year },
      select: {
        employeeCode: true,
        gender: true,
        baseSalary: true,
        variableComp: true,
        department: true,
        jobCategory: true,
        salaryGradeId: true,
        workSchedule: true,
        evaluationScore: true,
      },
    })

    if (records.length === 0) {
      return NextResponse.json({
        year,
        hasData: false,
        analysis: null,
        message: "Nu există date salariale pentru acest an.",
      })
    }

    const analysis = analyzeEqualWork(records, tolerance)

    // Flag angajați fără scor evaluare
    const missingScoreWarning = analysis.missingScoreCount > 0
      ? `${analysis.missingScoreCount} angajați nu au scor de evaluare din Modulul 1. Completați evaluarea pentru a include toți angajații în analiza pe muncă egală.`
      : null

    return NextResponse.json({
      year,
      hasData: true,
      tolerance,
      analysis,
      missingScoreWarning,
    })
  } catch (error) {
    console.error("[EQUAL-WORK]", error)
    return NextResponse.json({ message: "Eroare server." }, { status: 500 })
  }
}
