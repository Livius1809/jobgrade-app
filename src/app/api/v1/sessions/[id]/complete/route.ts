import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const { id: sessionId } = await params
    const userId = session.user.id

    const participant = await prisma.sessionParticipant.findFirst({
      where: { sessionId, userId },
    })
    if (!participant) {
      return NextResponse.json(
        { message: "Nu ești participant la această sesiune." },
        { status: 403 }
      )
    }

    await prisma.sessionParticipant.update({
      where: { id: participant.id },
      data: { completedAt: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[SESSION COMPLETE]", error)
    return NextResponse.json({ message: "Eroare internă." }, { status: 500 })
  }
}
