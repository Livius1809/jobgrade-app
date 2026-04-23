import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendEvaluationReminderEmail } from "@/lib/email"

export const dynamic = "force-dynamic"

/**
 * POST — Cron endpoint: sends reminder emails to evaluators who haven't completed.
 * Should be called daily. Protected by CRON_SECRET.
 *
 * Logic:
 * - Find sessions with status IN_PROGRESS or PRE_SCORING
 * - For each session, find participants who haven't submitted all evaluations
 * - If deadline is within 3 days (or past), send reminder
 * - Log reminders as DiscussionComment (for journal audit trail)
 */
export async function POST(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    // Find active sessions
    const activeSessions = await prisma.evaluationSession.findMany({
      where: {
        status: { in: ["IN_PROGRESS", "PRE_SCORING", "VOTING"] },
      },
      include: {
        participants: {
          include: {
            user: { select: { id: true, firstName: true, email: true } },
          },
        },
        sessionJobs: { select: { id: true } },
      },
    })

    let remindersSent = 0

    for (const session of activeSessions) {
      // Check if deadline is within 3 days
      if (session.deadline) {
        const daysLeft = Math.ceil(
          (new Date(session.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
        if (daysLeft > 3) continue // Too early for reminder
      }

      const totalJobs = session.sessionJobs.length

      for (const participant of session.participants) {
        if (participant.completedAt) continue // Already done

        // Count submitted assignments
        const submitted = await prisma.jobAssignment.count({
          where: {
            sessionJob: { sessionId: session.id },
            userId: participant.userId,
            submittedAt: { not: null },
          },
        })

        const pending = totalJobs - submitted
        if (pending <= 0) continue // All submitted

        try {
          await sendEvaluationReminderEmail({
            to: participant.user.email,
            firstName: participant.user.firstName,
            sessionName: session.name,
            deadline: session.deadline ?? undefined,
            sessionId: session.id,
            pendingJobs: pending,
          })
          remindersSent++
        } catch (err) {
          console.error(`[REMINDER] Failed for ${participant.user.email}:`, err)
        }
      }
    }

    return NextResponse.json({
      success: true,
      remindersSent,
      sessionsChecked: activeSessions.length,
    })
  } catch (error) {
    console.error("[EVALUATION-REMINDERS]", error)
    return NextResponse.json({ message: "Eroare internă." }, { status: 500 })
  }
}
