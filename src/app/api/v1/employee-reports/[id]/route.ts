import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

export const dynamic = "force-dynamic"

const UpdateSchema = z.object({
  visibleToEmployee: z.boolean().optional(),
  status: z.enum(["ACTIVE", "SUSPENDED", "CLOSED"]).optional(),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
})

const AddSectionSchema = z.object({
  module: z.enum([
    "JOB_EVALUATION", "SALARY_TRANSPARENCY", "PAY_GAP",
    "JOINT_ASSESSMENT", "BENCHMARK", "PERSONNEL_EVAL",
    "ORG_DEVELOPMENT", "CUSTOM",
  ]),
  title: z.string().min(2),
  content: z.any(),
  order: z.number().int().optional(),
})

// GET — raport individual cu toate secțiunile
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ message: "Neautorizat." }, { status: 401 })

  const { id } = await params
  const { tenantId } = session.user

  const report = await prisma.employeeContinuousReport.findFirst({
    where: { id, tenantId },
    include: {
      sections: { orderBy: [{ order: "asc" }, { updatedAt: "desc" }] },
    },
  })

  if (!report) {
    return NextResponse.json({ message: "Raport negăsit." }, { status: 404 })
  }

  return NextResponse.json(report)
}

// PATCH — actualizare raport (vizibilitate, status, etc.)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ message: "Neautorizat." }, { status: 401 })

  const { id } = await params
  const { role, tenantId } = session.user
  if (!["COMPANY_ADMIN", "OWNER", "SUPER_ADMIN"].includes(role)) {
    return NextResponse.json({ message: "Acces interzis." }, { status: 403 })
  }

  const body = await req.json()
  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ message: "Date invalide." }, { status: 400 })
  }

  const report = await prisma.employeeContinuousReport.updateMany({
    where: { id, tenantId },
    data: parsed.data,
  })

  if (report.count === 0) {
    return NextResponse.json({ message: "Raport negăsit." }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}

// POST — adaugă secțiune nouă la raport
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ message: "Neautorizat." }, { status: 401 })

  const { id } = await params
  const { role, tenantId } = session.user
  if (!["COMPANY_ADMIN", "OWNER", "SUPER_ADMIN", "FACILITATOR"].includes(role)) {
    return NextResponse.json({ message: "Acces interzis." }, { status: 403 })
  }

  // Verifică raportul există pentru tenant
  const report = await prisma.employeeContinuousReport.findFirst({
    where: { id, tenantId },
  })
  if (!report) {
    return NextResponse.json({ message: "Raport negăsit." }, { status: 404 })
  }

  const body = await req.json()
  const parsed = AddSectionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ message: "Date invalide.", errors: parsed.error.flatten() }, { status: 400 })
  }

  // Calculează ordinea dacă nu e specificată
  const maxOrder = await prisma.employeeReportSection.aggregate({
    where: { reportId: id },
    _max: { order: true },
  })
  const order = parsed.data.order ?? (maxOrder._max.order ?? 0) + 1

  const section = await prisma.employeeReportSection.create({
    data: {
      reportId: id,
      module: parsed.data.module,
      title: parsed.data.title,
      content: parsed.data.content,
      order,
    },
  })

  return NextResponse.json(section, { status: 201 })
}
