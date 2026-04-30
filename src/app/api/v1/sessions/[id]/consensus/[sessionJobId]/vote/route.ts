import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@/generated/prisma"

const triggerSchema = z.object({
  criterionId: z.string(),
  action: z.literal("trigger"),
})

const castSchema = z.object({
  criterionId: z.string(),
  action: z.literal("cast"),
  subfactorId: z.string(),
})

const schema = z.union([triggerSchema, castSchema])

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

    const sessionJob = await prisma.sessionJob.findFirst({
      where: { id: sessionJobId, sessionId },
      select: { id: true, jobId: true },
    })
    if (!sessionJob) {
      return NextResponse.json({ message: "Jobul nu a fost găsit în sesiune." }, { status: 404 })
    }

    if (data.action === "trigger") {
      // Only facilitators can trigger voting phase
      if (!FACILITATOR_ROLES.includes(session.user.role as UserRole)) {
        return NextResponse.json(
          { message: "Doar facilitatorii pot declanșa votul." },
          { status: 403 }
        )
      }

      await prisma.$transaction(async (tx) => {
        await tx.consensusStatus.upsert({
          where: {
            sessionId_jobId_criterionId: {
              sessionId,
              jobId: sessionJob.jobId,
              criterionId: data.criterionId,
            },
          },
          update: { status: "VOTING" },
          create: {
            sessionId,
            jobId: sessionJob.jobId,
            criterionId: data.criterionId,
            status: "VOTING",
          },
        })

        if (["IN_PROGRESS", "RECALIBRATION"].includes(evalSession.status)) {
          await tx.evaluationSession.update({
            where: { id: sessionId },
            data: { status: "VOTING" },
          })
        }
      })

      return NextResponse.json({ success: true, action: "triggered" })
    }

    // Cast vote (action === "cast") — any session participant
    // Verify user is a participant
    const isParticipant = await prisma.sessionParticipant.findFirst({
      where: { sessionId, userId: session.user.id },
    })
    if (!isParticipant && !FACILITATOR_ROLES.includes(session.user.role as UserRole)) {
      return NextResponse.json(
        { message: "Nu ești participant în această sesiune." },
        { status: 403 }
      )
    }

    await prisma.vote.upsert({
      where: {
        sessionId_jobId_criterionId_userId: {
          sessionId,
          jobId: sessionJob.jobId,
          criterionId: data.criterionId,
          userId: session.user.id,
        },
      },
      update: { subfactorId: data.subfactorId },
      create: {
        sessionId,
        jobId: sessionJob.jobId,
        criterionId: data.criterionId,
        userId: session.user.id,
        subfactorId: data.subfactorId,
      },
    })

    return NextResponse.json({ success: true, action: "voted" })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Date invalide.", errors: error.issues },
        { status: 400 }
      )
    }
    console.error("[CONSENSUS VOTE]", error)
    return NextResponse.json({ message: "Eroare internă." }, { status: 500 })
  }
}
