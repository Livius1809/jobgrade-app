import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

export const dynamic = "force-dynamic"

const CreateSchema = z.object({
  employeeName: z.string().min(2),
  employeeEmail: z.string().email().optional(),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
})

// GET — lista rapoarte continue pentru tenant
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ message: "Neautorizat." }, { status: 401 })

  const { role, tenantId } = session.user
  if (!["COMPANY_ADMIN", "OWNER", "SUPER_ADMIN", "FACILITATOR"].includes(role)) {
    return NextResponse.json({ message: "Acces interzis." }, { status: 403 })
  }

  const reports = await prisma.employeeContinuousReport.findMany({
    where: { tenantId },
    include: {
      sections: {
        orderBy: { order: "asc" },
        select: { id: true, module: true, title: true, order: true, version: true, updatedAt: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  })

  return NextResponse.json(reports)
}

// POST — creează raport continuu pentru un angajat
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ message: "Neautorizat." }, { status: 401 })

  const { role, tenantId } = session.user
  if (!["COMPANY_ADMIN", "OWNER", "SUPER_ADMIN"].includes(role)) {
    return NextResponse.json({ message: "Acces interzis." }, { status: 403 })
  }

  const body = await req.json()
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ message: "Date invalide.", errors: parsed.error.flatten() }, { status: 400 })
  }

  // Verifică duplicat
  if (parsed.data.employeeEmail) {
    const existing = await prisma.employeeContinuousReport.findUnique({
      where: { tenantId_employeeEmail: { tenantId, employeeEmail: parsed.data.employeeEmail } },
    })
    if (existing) {
      return NextResponse.json({ message: "Raport existent pentru acest angajat.", id: existing.id }, { status: 409 })
    }
  }

  const report = await prisma.employeeContinuousReport.create({
    data: {
      tenantId,
      ...parsed.data,
    },
  })

  return NextResponse.json(report, { status: 201 })
}
