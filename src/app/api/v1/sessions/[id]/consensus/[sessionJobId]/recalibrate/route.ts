import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"
import { deductCredits, hasCredits, CREDIT_COSTS } from "@/lib/credits"
import { UserRole } from "@/generated/prisma"

const CREDIT_COST = CREDIT_COSTS.RECALIBRATION_ROUND

const schema = z.object({
  criterionId: z.string(),
})

const FACILITATOR_ROLES: UserRole[] = [
  UserRole.OWNER,
  UserRole.COMPANY_ADMIN,
  UserRole.FACILITATOR,
]

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; sessionJobId: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    if (!FACILITATOR_ROLES.includes(session.user.role as UserRole)) {
      return NextResponse.json(
        { message: "Doar facilitatorii pot declanșa recalibrarea." },
        { status: 403 }
      )
    }

    const { id: sessionId, sessionJobId } = await params
    const tenantId = session.user.tenantId
    const body = await req.json()
    const data = schema.parse(body)

    // Verify session belongs to tenant
    const evalSession = await prisma.evaluationSession.findFirst({
      where: { id: sessionId, tenantId },
      select: { id: true, status: true },
    })
    if (!evalSession) {
      return NextResponse.json({ message: "Sesiunea nu a fost găsită." }, { status: 404 })
    }

    // Verify sessionJob belongs to session
    const sessionJob = await prisma.sessionJob.findFirst({
      where: { id: sessionJobId, sessionId },
      select: { id: true, jobId: true },
    })
    if (!sessionJob) {
      return NextResponse.json({ message: "Jobul nu a fost găsit în sesiune." }, { status: 404 })
    }

    const sufficient = await hasCredits(tenantId, CREDIT_COST)
    if (!sufficient) {
      return NextResponse.json(
        { message: `Credite insuficiente. Necesari: ${CREDIT_COST}.` },
        { status: 402 }
      )
    }

    // Upsert ConsensusStatus to RECALIBRATING
    await prisma.$transaction(async (tx) => {
      await tx.consensusStatus.upsert({
        where: {
          sessionId_jobId_criterionId: {
            sessionId,
            jobId: sessionJob.jobId,
            criterionId: data.criterionId,
          },
        },
        update: { status: "RECALIBRATING" },
        create: {
          sessionId,
          jobId: sessionJob.jobId,
          criterionId: data.criterionId,
          status: "RECALIBRATING",
        },
      })

      // Update session status if not already in a special state
      if (evalSession.status === "IN_PROGRESS") {
        await tx.evaluationSession.update({
          where: { id: sessionId },
          data: { status: "RECALIBRATION" },
        })
      }
    })

    await deductCredits(
      tenantId,
      CREDIT_COST,
      `Recalibrare criteriu — sesiune ${sessionId}`,
      sessionId
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Date invalide.", errors: error.issues },
        { status: 400 }
      )
    }
    console.error("[CONSENSUS RECALIBRATE]", error)
    return NextResponse.json({ message: "Eroare internă." }, { status: 500 })
  }
}
