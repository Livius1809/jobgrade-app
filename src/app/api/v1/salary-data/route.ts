/**
 * POST /api/v1/salary-data
 *
 * Import date salariale JSON (alternativă la Excel import).
 * Creează EmployeeSalaryRecord entries.
 * Auth: internal key sau COMPANY_ADMIN/OWNER.
 */

import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

export const dynamic = "force-dynamic"

const RecordSchema = z.object({
  employeeCode: z.string().min(1),
  gender: z.enum(["MALE", "FEMALE"]),
  baseSalary: z.number().positive(),
  variableComp: z.number().default(0),
  department: z.string().optional(),
  jobCategory: z.string().optional(),
  evaluationScore: z.number().int().optional(),
  workSchedule: z.string().default("8h"),
  periodYear: z.number().int().min(2020).max(2100),
  periodMonth: z.number().int().min(1).max(12).optional(),
})

const ImportSchema = z.object({
  records: z.array(RecordSchema).min(1),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const { tenantId } = session.user

  try {
    const body = await req.json()
    const parsed = ImportSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Date invalide", details: parsed.error.flatten() }, { status: 422 })
    }

    let created = 0
    let skipped = 0

    for (const rec of parsed.data.records) {
      // Skip duplicat
      const existing = await prisma.employeeSalaryRecord.findFirst({
        where: {
          tenantId,
          employeeCode: rec.employeeCode,
          periodYear: rec.periodYear,
          ...(rec.periodMonth ? { periodMonth: rec.periodMonth } : {}),
        },
      })

      if (existing) {
        skipped++
        continue
      }

      await prisma.employeeSalaryRecord.create({
        data: {
          tenantId,
          employeeCode: rec.employeeCode,
          gender: rec.gender,
          baseSalary: rec.baseSalary,
          variableComp: rec.variableComp,
          department: rec.department,
          jobCategory: rec.jobCategory,
          evaluationScore: rec.evaluationScore,
          workSchedule: rec.workSchedule,
          periodYear: rec.periodYear,
          periodMonth: rec.periodMonth,
        },
      })
      created++
    }

    return NextResponse.json({ ok: true, created, skipped, total: created + skipped })
  } catch (error) {
    console.error("[SALARY-DATA]", error)
    return NextResponse.json({ error: "Eroare server" }, { status: 500 })
  }
}
