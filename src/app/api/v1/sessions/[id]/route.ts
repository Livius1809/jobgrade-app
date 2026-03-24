import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { SessionStatus } from "@/generated/prisma"
import { sendSessionInviteEmail } from "@/lib/email"

const schema = z.object({
  status: z.nativeEnum(SessionStatus).optional(),
  name: z.string().min(3).optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const data = schema.parse(body)

    const existing = await prisma.evaluationSession.findFirst({
      where: { id, tenantId: session.user.tenantId },
      include: {
        participants: {
          include: {
            user: { select: { email: true, firstName: true, status: true } },
          },
        },
      },
    })
    if (!existing) {
      return NextResponse.json({ message: "Nu a fost găsit." }, { status: 404 })
    }

    const updated = await prisma.evaluationSession.update({
      where: { id },
      data: {
        ...(data.status !== undefined && { status: data.status }),
        ...(data.name !== undefined && { name: data.name }),
        ...(data.status === "IN_PROGRESS" && { startedAt: new Date() }),
        ...(data.status === "COMPLETED" && { completedAt: new Date() }),
      },
    })

    // When session starts, notify all active participants by email
    if (data.status === "IN_PROGRESS" && existing.status === "DRAFT") {
      const activeParticipants = existing.participants.filter(
        (p) => p.user.status === "ACTIVE"
      )
      // Fire-and-forget — don't block the response on email sending
      Promise.allSettled(
        activeParticipants.map((p) =>
          sendSessionInviteEmail({
            to: p.user.email,
            firstName: p.user.firstName,
            sessionName: existing.name,
            deadline: existing.deadline ?? undefined,
            sessionId: id,
          })
        )
      ).catch((err) => console.error("[SESSION EMAIL NOTIFY]", err))
    }

    return NextResponse.json({ id: updated.id })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Date invalide.", errors: error.issues },
        { status: 400 }
      )
    }
    console.error("[SESSIONS PATCH]", error)
    return NextResponse.json({ message: "Eroare internă." }, { status: 500 })
  }
}
