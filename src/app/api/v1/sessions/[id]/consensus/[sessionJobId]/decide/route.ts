import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@/generated/prisma"

const schema = z.object({
  criterionId: z.string(),
  subfactorId: z.string(),
  rationale: z.string().min(1, "Motivarea este obligatorie."),
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
        { message: "Doar facilitatorii pot decide direct." },
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
      select: { id: true },
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

    // Verify subfactor exists
    const subfactor = await prisma.subfactor.findUnique({
      where: { id: data.subfactorId },
      select: { id: true },
    })
    if (!subfactor) {
      return NextResponse.json({ message: "Subfactorul nu a fost găsit." }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      // Upsert facilitator decision
      await tx.facilitatorDecision.upsert({
        where: {
          sessionId_jobId_criterionId: {
            sessionId,
            jobId: sessionJob.jobId,
            criterionId: data.criterionId,
          },
        },
        update: {
          subfactorId: data.subfactorId,
          rationale: data.rationale,
          facilitatorId: session.user.id,
        },
        create: {
          sessionId,
          jobId: sessionJob.jobId,
          criterionId: data.criterionId,
          subfactorId: data.subfactorId,
          rationale: data.rationale,
          facilitatorId: session.user.id,
        },
      })

      // Update consensus status to FACILITATED with final subfactor
      await tx.consensusStatus.upsert({
        where: {
          sessionId_jobId_criterionId: {
            sessionId,
            jobId: sessionJob.jobId,
            criterionId: data.criterionId,
          },
        },
        update: {
          status: "FACILITATED",
          finalSubfactorId: data.subfactorId,
        },
        create: {
          sessionId,
          jobId: sessionJob.jobId,
          criterionId: data.criterionId,
          status: "FACILITATED",
          finalSubfactorId: data.subfactorId,
        },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Date invalide.", errors: error.issues },
        { status: 400 }
      )
    }
    console.error("[CONSENSUS DECIDE]", error)
    return NextResponse.json({ message: "Eroare internă." }, { status: 500 })
  }
}
