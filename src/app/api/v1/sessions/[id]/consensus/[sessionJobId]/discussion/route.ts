import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@/generated/prisma"

export const dynamic = "force-dynamic"

const postSchema = z.object({
  criterionId: z.string(),
  content: z.string().min(3).max(2000),
  parentId: z.string().optional(),
})

const FACILITATOR_ROLES: UserRole[] = [
  UserRole.OWNER,
  UserRole.COMPANY_ADMIN,
  UserRole.FACILITATOR,
]

// GET — fetch all comments for a sessionJob
export async function GET(
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

    const evalSession = await prisma.evaluationSession.findFirst({
      where: { id: sessionId, tenantId },
      select: { id: true },
    })
    if (!evalSession) {
      return NextResponse.json({ message: "Sesiunea nu a fost găsită." }, { status: 404 })
    }

    const sessionJob = await prisma.sessionJob.findFirst({
      where: { id: sessionJobId, sessionId },
      select: { jobId: true },
    })
    if (!sessionJob) {
      return NextResponse.json({ message: "Jobul nu a fost găsit." }, { status: 404 })
    }

    // Optionally filter by criterionId
    const criterionId = req.nextUrl.searchParams.get("criterionId")

    const comments = await prisma.discussionComment.findMany({
      where: {
        sessionId,
        jobId: sessionJob.jobId,
        ...(criterionId ? { criterionId } : {}),
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, jobTitle: true } },
      },
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json({ comments })
  } catch (error) {
    console.error("[DISCUSSION GET]", error)
    return NextResponse.json({ message: "Eroare internă." }, { status: 500 })
  }
}

// POST — add a comment
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
    const data = postSchema.parse(body)

    const evalSession = await prisma.evaluationSession.findFirst({
      where: { id: sessionId, tenantId },
      select: { id: true, currentRound: true },
    })
    if (!evalSession) {
      return NextResponse.json({ message: "Sesiunea nu a fost găsită." }, { status: 404 })
    }

    const sessionJob = await prisma.sessionJob.findFirst({
      where: { id: sessionJobId, sessionId },
      select: { jobId: true },
    })
    if (!sessionJob) {
      return NextResponse.json({ message: "Jobul nu a fost găsit." }, { status: 404 })
    }

    // Verify user is participant or facilitator
    const isParticipant = await prisma.sessionParticipant.findFirst({
      where: { sessionId, userId: session.user.id },
    })
    if (!isParticipant && !FACILITATOR_ROLES.includes(session.user.role as UserRole)) {
      return NextResponse.json(
        { message: "Nu ești participant în această sesiune." },
        { status: 403 }
      )
    }

    const comment = await prisma.discussionComment.create({
      data: {
        sessionId,
        jobId: sessionJob.jobId,
        criterionId: data.criterionId,
        userId: session.user.id,
        round: evalSession.currentRound,
        content: data.content,
        isAi: false,
        parentId: data.parentId || null,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, jobTitle: true } },
      },
    })

    return NextResponse.json({ comment }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Date invalide.", errors: error.issues },
        { status: 400 }
      )
    }
    console.error("[DISCUSSION POST]", error)
    return NextResponse.json({ message: "Eroare internă." }, { status: 500 })
  }
}
