import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const CreateSchema = z.object({
  triggerReason: z.string().min(10),
  reportId: z.string().optional(),
  dueDate: z.string().datetime().optional(),
})

export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ message: "Neautorizat." }, { status: 401 })

  const assessments = await prisma.jointPayAssessment.findMany({
    where: { tenantId: session.user.tenantId },
    include: { report: { select: { reportYear: true } } },
    orderBy: { triggeredAt: "desc" },
  })

  return NextResponse.json({ assessments })
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ message: "Neautorizat." }, { status: 401 })

    const { role, tenantId, id: userId } = session.user
    if (!["COMPANY_ADMIN", "OWNER", "SUPER_ADMIN"].includes(role)) {
      return NextResponse.json({ message: "Acces interzis." }, { status: 403 })
    }

    const body = await req.json()
    const parsed = CreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ message: "Date invalide." }, { status: 422 })
    }

    const assessment = await prisma.jointPayAssessment.create({
      data: {
        tenantId,
        triggerReason: parsed.data.triggerReason,
        reportId: parsed.data.reportId,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
        createdBy: userId,
      },
    })

    return NextResponse.json({ assessment }, { status: 201 })
  } catch (error) {
    console.error("[JOINT-ASSESSMENTS POST]", error)
    return NextResponse.json({ message: "Eroare server." }, { status: 500 })
  }
}
