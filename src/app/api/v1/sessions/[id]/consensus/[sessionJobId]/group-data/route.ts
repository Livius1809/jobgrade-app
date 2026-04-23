import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

/**
 * GET — Returns full group discussion data for a session job:
 * - All participants with their pre-scores and current votes
 * - Criteria with subfactors
 * - Consensus status per criterion
 * - Job info + representative
 */
export async function GET(
  _req: NextRequest,
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
      select: { id: true, status: true, currentRound: true, evaluationType: true },
    })
    if (!evalSession) {
      return NextResponse.json({ message: "Sesiunea nu a fost găsită." }, { status: 404 })
    }

    const sessionJob = await prisma.sessionJob.findFirst({
      where: { id: sessionJobId, sessionId },
      include: {
        job: {
          include: {
            department: { select: { id: true, name: true } },
            representative: {
              select: { id: true, firstName: true, lastName: true, jobTitle: true },
            },
          },
        },
      },
    })
    if (!sessionJob) {
      return NextResponse.json({ message: "Jobul nu a fost găsit." }, { status: 404 })
    }

    // Criteria with subfactors
    const criteria = await prisma.criterion.findMany({
      where: { isActive: true },
      include: {
        subfactors: { orderBy: { order: "asc" } },
      },
      orderBy: { order: "asc" },
    })

    // All participants
    const participants = await prisma.sessionParticipant.findMany({
      where: { sessionId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            jobTitle: true,
            departmentId: true,
          },
        },
      },
    })

    // All pre-scores (evaluations from individual phase)
    const evaluations = await prisma.evaluation.findMany({
      where: {
        sessionId,
        assignment: { sessionJob: { id: sessionJobId } },
      },
      include: {
        assignment: { select: { userId: true } },
        subfactor: { select: { id: true, code: true } },
      },
    })

    // Group pre-scores by userId -> criterionId -> subfactor code
    const preScores: Record<string, Record<string, string>> = {}
    for (const ev of evaluations) {
      const uid = ev.assignment.userId
      if (!preScores[uid]) preScores[uid] = {}
      preScores[uid][ev.criterionId] = ev.subfactor.code
    }

    // All current votes for this job
    const votes = await prisma.vote.findMany({
      where: { sessionId, jobId: sessionJob.jobId },
      include: {
        subfactor: { select: { id: true, code: true } },
      },
    })

    // Group votes by criterionId -> userId -> { subfactorId, code }
    const voteMap: Record<string, Record<string, { subfactorId: string; code: string }>> = {}
    for (const v of votes) {
      if (!voteMap[v.criterionId]) voteMap[v.criterionId] = {}
      voteMap[v.criterionId][v.userId] = {
        subfactorId: v.subfactorId,
        code: v.subfactor.code,
      }
    }

    // Consensus status per criterion
    const consensusStatuses = await prisma.consensusStatus.findMany({
      where: { sessionId, jobId: sessionJob.jobId },
      include: {
        finalSubfactor: { select: { id: true, code: true } },
      },
    })

    const consensusMap: Record<string, {
      status: string
      finalCode: string | null
      finalSubfactorId: string | null
    }> = {}
    for (const cs of consensusStatuses) {
      consensusMap[cs.criterionId] = {
        status: cs.status,
        finalCode: cs.finalSubfactor?.code ?? null,
        finalSubfactorId: cs.finalSubfactorId,
      }
    }

    // Build per-criterion consensus percentage
    const totalParticipants = participants.length
    const criteriaData = criteria.map((crit) => {
      const critVotes = voteMap[crit.id] || {}
      const voteCounts: Record<string, number> = {}
      for (const v of Object.values(critVotes)) {
        voteCounts[v.code] = (voteCounts[v.code] || 0) + 1
      }
      const maxAgree = Math.max(0, ...Object.values(voteCounts))
      const consensusPercent = totalParticipants > 0
        ? Math.round((maxAgree / totalParticipants) * 100)
        : 0
      const majorityCode = Object.entries(voteCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

      const cs = consensusMap[crit.id]
      const isConsensus = cs?.status === "CONSENSUS" || cs?.status === "FACILITATED" || cs?.status === "RESOLVED" || consensusPercent === 100

      return {
        id: crit.id,
        name: crit.name,
        order: crit.order,
        category: crit.category,
        subfactors: crit.subfactors,
        consensusPercent,
        majorityCode,
        isConsensus,
        consensusStatus: cs?.status ?? "PENDING",
        finalCode: cs?.finalCode ?? (isConsensus ? majorityCode : null),
        votes: critVotes,
      }
    })

    // Discussion comment counts per criterion
    const commentCounts = await prisma.discussionComment.groupBy({
      by: ["criterionId"],
      where: { sessionId, jobId: sessionJob.jobId },
      _count: true,
    })
    const commentCountMap: Record<string, number> = {}
    for (const cc of commentCounts) {
      commentCountMap[cc.criterionId] = cc._count
    }

    return NextResponse.json({
      session: {
        id: evalSession.id,
        status: evalSession.status,
        currentRound: evalSession.currentRound,
        evaluationType: evalSession.evaluationType,
      },
      job: {
        id: sessionJob.job.id,
        sessionJobId: sessionJob.id,
        title: sessionJob.job.title,
        department: sessionJob.job.department,
        representative: sessionJob.job.representative,
      },
      participants: participants.map((p) => ({
        ...p.user,
        completedPreScoring: !!p.completedAt,
      })),
      criteria: criteriaData,
      preScores,
      commentCounts: commentCountMap,
    })
  } catch (error) {
    console.error("[GROUP DATA]", error)
    return NextResponse.json({ message: "Eroare internă." }, { status: 500 })
  }
}
