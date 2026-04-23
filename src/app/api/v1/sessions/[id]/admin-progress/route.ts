import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@/generated/prisma"

export const dynamic = "force-dynamic"

const ADMIN_ROLES: UserRole[] = [UserRole.OWNER, UserRole.COMPANY_ADMIN, UserRole.FACILITATOR]

/**
 * GET — Admin progress dashboard: per-member completion status.
 * Shows who has completed pre-scoring, who hasn't, deadline proximity.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    if (!ADMIN_ROLES.includes(session.user.role as UserRole)) {
      return NextResponse.json({ message: "Acces restricționat." }, { status: 403 })
    }

    const { id: sessionId } = await params
    const tenantId = session.user.tenantId

    const evalSession = await prisma.evaluationSession.findFirst({
      where: { id: sessionId, tenantId },
      select: { id: true, name: true, status: true, deadline: true, createdAt: true },
    })
    if (!evalSession) return NextResponse.json({ message: "Sesiunea nu a fost găsită." }, { status: 404 })

    // Participants with completion
    const participants = await prisma.sessionParticipant.findMany({
      where: { sessionId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, jobTitle: true, lastLogin: true },
        },
      },
    })

    // All session jobs
    const sessionJobs = await prisma.sessionJob.findMany({
      where: { sessionId },
      select: { id: true, jobId: true },
    })

    // All assignments with submission status
    const assignments = await prisma.jobAssignment.findMany({
      where: { sessionJob: { sessionId } },
      select: { userId: true, sessionJobId: true, submittedAt: true },
    })

    // Build per-member progress
    const memberProgress = participants.map((p) => {
      const userAssignments = assignments.filter((a) => a.userId === p.userId)
      const totalJobs = sessionJobs.length
      const submittedJobs = userAssignments.filter((a) => a.submittedAt).length
      const hasStarted = userAssignments.length > 0
      const percent = totalJobs > 0 ? Math.round((submittedJobs / totalJobs) * 100) : 0

      return {
        userId: p.userId,
        firstName: p.user.firstName,
        lastName: p.user.lastName,
        email: p.user.email,
        jobTitle: p.user.jobTitle,
        lastLogin: p.user.lastLogin,
        completedAt: p.completedAt,
        hasStarted,
        totalJobs,
        submittedJobs,
        percent,
        status: p.completedAt
          ? "completed" as const
          : submittedJobs === totalJobs && totalJobs > 0
          ? "ready" as const
          : submittedJobs > 0
          ? "in_progress" as const
          : hasStarted
          ? "started" as const
          : "not_started" as const,
      }
    })

    // Post-consensus validation status
    const validations = await prisma.memberValidation.findMany({
      where: { sessionId },
      select: { userId: true, accepted: true },
    })
    const validationByUser: Record<string, { total: number; accepted: number }> = {}
    for (const v of validations) {
      if (!validationByUser[v.userId]) validationByUser[v.userId] = { total: 0, accepted: 0 }
      validationByUser[v.userId].total++
      if (v.accepted) validationByUser[v.userId].accepted++
    }

    // Deadline info
    const deadline = evalSession.deadline
    const daysLeft = deadline
      ? Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null

    return NextResponse.json({
      session: {
        id: evalSession.id,
        name: evalSession.name,
        status: evalSession.status,
        deadline: evalSession.deadline,
        daysLeft,
      },
      members: memberProgress.map((m) => ({
        ...m,
        validation: validationByUser[m.userId] || null,
      })),
      totals: {
        totalMembers: participants.length,
        completed: memberProgress.filter((m) => m.status === "completed" || m.status === "ready").length,
        inProgress: memberProgress.filter((m) => m.status === "in_progress" || m.status === "started").length,
        notStarted: memberProgress.filter((m) => m.status === "not_started").length,
      },
    })
  } catch (error) {
    console.error("[ADMIN-PROGRESS]", error)
    return NextResponse.json({ message: "Eroare internă." }, { status: 500 })
  }
}
