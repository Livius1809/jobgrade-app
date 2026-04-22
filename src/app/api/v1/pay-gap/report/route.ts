import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { calculatePayGapIndicators } from "@/lib/pay-gap"
import { z } from "zod"

const GenerateSchema = z.object({
  year: z.number().int().min(2020).max(2100),
  publish: z.boolean().default(false),
})

// GET — list all pay gap reports for tenant
export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ message: "Neautorizat." }, { status: 401 })

  const reports = await prisma.payGapReport.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { reportYear: "desc" },
  })

  return NextResponse.json({ reports })
}

// POST — generate / regenerate pay gap report for a year
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ message: "Neautorizat." }, { status: 401 })

    const { role, tenantId, id: userId } = session.user
    if (!["COMPANY_ADMIN", "OWNER", "SUPER_ADMIN"].includes(role)) {
      return NextResponse.json({ message: "Acces interzis." }, { status: 403 })
    }

    const body = await req.json()
    const parsed = GenerateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ message: "Date invalide." }, { status: 422 })
    }

    const { year, publish } = parsed.data

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
      return NextResponse.json(
        { message: "Nu există date salariale pentru acest an." },
        { status: 400 }
      )
    }

    const indicators = calculatePayGapIndicators(records)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const indicatorsJson = indicators as any

    // Company Profiler — secțiuni coerență MVV ↔ structură salarială
    let profilerSections: any[] = []
    try {
      const { getReportSections } = await import("@/lib/company-profiler")
      profilerSections = await getReportSections(tenantId, "PAY_GAP_ANALYSIS", {
        year,
        employeeCount: records.length,
        gapCategories: indicators,
      })
    } catch {}

    const report = await prisma.payGapReport.upsert({
      where: { tenantId_reportYear: { tenantId, reportYear: year } },
      create: {
        tenantId,
        reportYear: year,
        indicators: indicatorsJson,
        employeeCount: records.length,
        generatedBy: userId,
        status: publish ? "PUBLISHED" : "DRAFT",
        publishedAt: publish ? new Date() : null,
      },
      update: {
        indicators: indicatorsJson,
        employeeCount: records.length,
        generatedAt: new Date(),
        generatedBy: userId,
        status: publish ? "PUBLISHED" : "DRAFT",
        publishedAt: publish ? new Date() : null,
      },
    })

    // Company Profiler: acțiune semnificativă — raport pay gap generat
    import("@/lib/company-profiler").then(m => m.onSignificantAction(tenantId)).catch(() => {})

    return NextResponse.json({ report, profilerSections }, { status: 201 })
  } catch (error) {
    console.error("[PAY-GAP REPORT POST]", error)
    return NextResponse.json({ message: "Eroare server." }, { status: 500 })
  }
}
