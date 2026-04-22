import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ sessions: [] })
  }

  const sessions = await prisma.evaluationSession.findMany({
    where: { tenantId: session.user.tenantId },
    select: { id: true, name: true, status: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ sessions })
}

const schema = z.object({
  name: z.string().min(3),
  jobIds: z.array(z.string()).min(1),
  participantIds: z.array(z.string()).min(1),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const tenantId = session.user.tenantId
    const body = await req.json()
    const data = schema.parse(body)

    // Verifică că joburile aparțin tenantului
    const jobs = await prisma.job.findMany({
      where: { id: { in: data.jobIds }, tenantId },
    })
    if (jobs.length !== data.jobIds.length) {
      return NextResponse.json(
        { message: "Unele joburi nu au fost găsite." },
        { status: 400 }
      )
    }

    // Verifică că participanții aparțin tenantului
    const users = await prisma.user.findMany({
      where: { id: { in: data.participantIds }, tenantId },
    })
    if (users.length !== data.participantIds.length) {
      return NextResponse.json(
        { message: "Unii evaluatori nu au fost găsiți." },
        { status: 400 }
      )
    }

    const evaluationSession = await prisma.$transaction(async (tx: any) => {
      const newSession = await tx.evaluationSession.create({
        data: {
          tenantId,
          name: data.name,
          status: "DRAFT",
          createdById: session.user.id,
        },
      })

      // Adaugă joburile
      await tx.sessionJob.createMany({
        data: data.jobIds.map((jobId: string) => ({
          sessionId: newSession.id,
          jobId,
        })),
      })

      // Adaugă participanții
      await tx.sessionParticipant.createMany({
        data: data.participantIds.map((userId: string) => ({
          sessionId: newSession.id,
          userId,
        })),
      })

      return newSession
    })

    return NextResponse.json({ id: evaluationSession.id }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Date invalide.", errors: error.issues },
        { status: 400 }
      )
    }
    console.error("[SESSIONS POST]", error)
    return NextResponse.json({ message: "Eroare internă." }, { status: 500 })
  }
}
