import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { calculatePayGapIndicators } from "@/lib/pay-gap"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ message: "Neautorizat." }, { status: 401 })

    const tenantId = session.user.tenantId
    const { searchParams } = new URL(req.url)
    const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()))

    const records = await prisma.employeeSalaryRecord.findMany({
      where: { tenantId, periodYear: year },
      select: {
        gender: true,
        baseSalary: true,
        variableComp: true,
        department: true,
        jobCategory: true,
        salaryGradeId: true,
      },
    })

    if (records.length === 0) {
      return NextResponse.json({
        year,
        hasData: false,
        indicators: null,
        message: "Nu există date salariale pentru acest an. Importați date din secțiunea Angajați.",
      })
    }

    const indicators = calculatePayGapIndicators(records)

    // Check if JointPayAssessment should be triggered (US-033)
    // Trigger if mean base gap > 5% (default threshold) for this tenant
    let jointAssessmentTriggered = false
    if (
      indicators.a_mean_base_gap !== null &&
      Math.abs(indicators.a_mean_base_gap) >= 5
    ) {
      // Check if there's already an OPEN assessment for this year
      const existing = await prisma.jointPayAssessment.findFirst({
        where: {
          tenantId,
          status: { in: ["OPEN", "IN_PROGRESS"] },
          triggeredAt: {
            gte: new Date(`${year}-01-01`),
            lte: new Date(`${year}-12-31`),
          },
        },
      })

      if (!existing) {
        await prisma.jointPayAssessment.create({
          data: {
            tenantId,
            triggerReason: `Diferența medie de salarizare pe gen a atins ${indicators.a_mean_base_gap}% în anul ${year}, depășind pragul de 5% (Art. 10 Directiva EU 2023/970).`,
            dueDate: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000), // 6 months
            createdBy: session.user.id,
          },
        })
        jointAssessmentTriggered = true

        // Notify HR admins
        const admins = await prisma.user.findMany({
          where: { tenantId, role: { in: ["COMPANY_ADMIN", "OWNER"] } },
          select: { id: true },
        })
        await prisma.notification.createMany({
          data: admins.map((u) => ({
            userId: u.id,
            type: "PAY_GAP_THRESHOLD_EXCEEDED" as const,
            title: "Prag pay gap depășit — Evaluare comună necesară",
            body: `Diferența salarială pe gen (${indicators.a_mean_base_gap}%) depășește 5%. Art. 10 obligă inițierea unei evaluări comune. Un caz JointPayAssessment a fost creat automat.`,
            link: "/pay-gap/assessments",
          })),
        })
      }
    }

    return NextResponse.json({
      year,
      hasData: true,
      indicators,
      jointAssessmentTriggered,
    })
  } catch (error) {
    console.error("[PAY-GAP DASHBOARD]", error)
    return NextResponse.json({ message: "Eroare server." }, { status: 500 })
  }
}
