import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { AssessmentStatus } from "@/generated/prisma"

const UpdateSchema = z.object({
  status: z.nativeEnum(AssessmentStatus).optional(),
  rootCause: z.string().optional(),
  actionPlan: z
    .array(
      z.object({
        milestone: z.string(),
        owner: z.string(),
        dueDate: z.string(),
        done: z.boolean().default(false),
      })
    )
    .optional(),
  dueDate: z.string().datetime().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ message: "Neautorizat." }, { status: 401 })

    const { role, tenantId } = session.user
    if (!["COMPANY_ADMIN", "OWNER", "SUPER_ADMIN", "FACILITATOR"].includes(role)) {
      return NextResponse.json({ message: "Acces interzis." }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const parsed = UpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ message: "Date invalide." }, { status: 422 })
    }

    const existing = await prisma.jointPayAssessment.findFirst({
      where: { id, tenantId },
    })
    if (!existing) {
      return NextResponse.json({ message: "Assessment negăsit." }, { status: 404 })
    }

    const assessment = await prisma.jointPayAssessment.update({
      where: { id },
      data: {
        ...parsed.data,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
        resolvedAt:
          parsed.data.status === "RESOLVED" || parsed.data.status === "CLOSED"
            ? new Date()
            : undefined,
      },
    })

    return NextResponse.json({ assessment })
  } catch (error) {
    console.error("[JOINT-ASSESSMENTS PATCH]", error)
    return NextResponse.json({ message: "Eroare server." }, { status: 500 })
  }
}
