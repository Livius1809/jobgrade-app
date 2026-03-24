import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const schema = z.object({
  assignmentId: z.string(),
  scores: z.array(
    z.object({
      criterionId: z.string(),
      subfactorId: z.string(),
      justification: z.string().optional(),
    })
  ),
  isDraft: z.boolean(),
})

export async function PUT(
  req: NextRequest,
  {
    params,
  }: { params: Promise<{ id: string; sessionJobId: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const { id: sessionId, sessionJobId } = await params
    const userId = session.user.id
    const tenantId = session.user.tenantId

    const body = await req.json()
    const data = schema.parse(body)

    // Verifică că sesiunea există și este IN_PROGRESS
    const evalSession = await prisma.evaluationSession.findFirst({
      where: { id: sessionId, tenantId, status: "IN_PROGRESS" },
    })
    if (!evalSession) {
      return NextResponse.json(
        { message: "Sesiunea nu este activă." },
        { status: 400 }
      )
    }

    // Verifică participarea
    const participant = await prisma.sessionParticipant.findFirst({
      where: { sessionId, userId },
    })
    if (!participant) {
      return NextResponse.json(
        { message: "Nu ești participant la această sesiune." },
        { status: 403 }
      )
    }

    // Verifică assignmentul
    const assignment = await prisma.jobAssignment.findFirst({
      where: { id: data.assignmentId, userId, sessionJobId },
    })
    if (!assignment) {
      return NextResponse.json(
        { message: "Assignment negăsit." },
        { status: 404 }
      )
    }

    // Nu permite retrimitere
    if (assignment.submittedAt) {
      return NextResponse.json(
        { message: "Evaluarea a fost deja trimisă." },
        { status: 400 }
      )
    }

    // Upsert evaluations
    await prisma.$transaction(async (tx: any) => {
      for (const score of data.scores) {
        await tx.evaluation.upsert({
          where: {
            assignmentId_criterionId: {
              assignmentId: data.assignmentId,
              criterionId: score.criterionId,
            },
          },
          update: {
            subfactorId: score.subfactorId,
            justification: score.justification ?? null,
          },
          create: {
            sessionId,
            assignmentId: data.assignmentId,
            criterionId: score.criterionId,
            subfactorId: score.subfactorId,
            justification: score.justification ?? null,
          },
        })
      }

      if (!data.isDraft) {
        await tx.jobAssignment.update({
          where: { id: data.assignmentId },
          data: { submittedAt: new Date() },
        })
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Date invalide.", errors: error.issues },
        { status: 400 }
      )
    }
    console.error("[EVALUATE PUT]", error)
    return NextResponse.json({ message: "Eroare internă." }, { status: 500 })
  }
}
