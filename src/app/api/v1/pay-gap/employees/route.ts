import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { Gender } from "@/generated/prisma"

const RecordSchema = z.object({
  employeeCode: z.string().min(1),
  gender: z.nativeEnum(Gender),
  baseSalary: z.number().positive(),
  variableComp: z.number().min(0).default(0),
  department: z.string().optional(),
  jobCategory: z.string().optional(),
  salaryGradeId: z.string().optional(),
  periodYear: z.number().int().min(2000).max(2100),
  periodMonth: z.number().int().min(1).max(12).optional(),
})

const BulkImportSchema = z.object({
  records: z.array(RecordSchema).min(1).max(5000),
})

// GET — list employee salary records
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ message: "Neautorizat." }, { status: 401 })

  const tenantId = session.user.tenantId
  const { searchParams } = new URL(req.url)
  const year = searchParams.get("year")

  const records = await prisma.employeeSalaryRecord.findMany({
    where: {
      tenantId,
      ...(year ? { periodYear: parseInt(year) } : {}),
    },
    include: { salaryGrade: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  })

  return NextResponse.json({ records, total: records.length })
}

// POST — bulk import / upsert employee salary records
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ message: "Neautorizat." }, { status: 401 })

    const tenantId = session.user.tenantId
    const body = await req.json()
    const parsed = BulkImportSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Date invalide.", errors: parsed.error.flatten() },
        { status: 422 }
      )
    }

    const { records } = parsed.data

    // Upsert all records (one DB call per record via transaction)
    const results = await prisma.$transaction(
      records.map((r) =>
        prisma.employeeSalaryRecord.upsert({
          where: {
            tenantId_employeeCode_periodYear: {
              tenantId,
              employeeCode: r.employeeCode,
              periodYear: r.periodYear,
            },
          },
          create: { tenantId, ...r },
          update: {
            gender: r.gender,
            baseSalary: r.baseSalary,
            variableComp: r.variableComp,
            department: r.department,
            jobCategory: r.jobCategory,
            salaryGradeId: r.salaryGradeId,
            periodMonth: r.periodMonth,
          },
        })
      )
    )

    return NextResponse.json(
      { message: `${results.length} înregistrări importate.`, count: results.length },
      { status: 201 }
    )
  } catch (error) {
    console.error("[PAY-GAP EMPLOYEES POST]", error)
    return NextResponse.json({ message: "Eroare server." }, { status: 500 })
  }
}
