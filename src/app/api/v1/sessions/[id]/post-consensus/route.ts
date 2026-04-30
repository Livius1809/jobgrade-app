import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

/**
 * GET — Returns the post-consensus validation data for the current user.
 * For each job in the session: pre-score vs consensus per criterion,
 * plus acceptance status.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const { id: sessionId } = await params
    const userId = session.user.id
    const tenantId = session.user.tenantId

    const evalSession = await prisma.evaluationSession.findFirst({
      where: { id: sessionId, tenantId },
      select: { id: true, status: true },
    })
    if (!evalSession) {
      return NextResponse.json({ message: "Sesiunea nu a fost găsită." }, { status: 404 })
    }

    // Get all session jobs
    const sessionJobs = await prisma.sessionJob.findMany({
      where: { sessionId },
      include: {
        job: {
          select: { id: true, title: true, department: { select: { name: true } } },
        },
      },
    })

    // Get criteria
    const criteria = await prisma.criterion.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
      select: { id: true, name: true, order: true },
    })

    // Get user's pre-scores (evaluations from individual phase)
    const evaluations = await prisma.evaluation.findMany({
      where: {
        sessionId,
        assignment: { userId },
      },
      include: {
        assignment: { select: { sessionJobId: true } },
        subfactor: { select: { code: true } },
      },
    })

    // Map pre-scores: sessionJobId -> criterionId -> code
    const preScoreMap: Record<string, Record<string, string>> = {}
    for (const ev of evaluations) {
      const sjId = ev.assignment.sessionJobId
      if (!preScoreMap[sjId]) preScoreMap[sjId] = {}
      preScoreMap[sjId][ev.criterionId] = ev.subfactor.code
    }

    // Get consensus results (from ConsensusStatus or FacilitatorDecision)
    const consensusStatuses = await prisma.consensusStatus.findMany({
      where: { sessionId },
      include: {
        finalSubfactor: { select: { code: true } },
      },
    })

    // Also get facilitator decisions as fallback
    const facilitatorDecisions = await prisma.facilitatorDecision.findMany({
      where: { sessionId },
      include: {
        subfactor: { select: { code: true } },
      },
    })

    // Also get vote mode (most common vote) as another fallback
    const votes = await prisma.vote.findMany({
      where: { sessionId },
      include: {
        subfactor: { select: { code: true } },
      },
    })

    // Build consensus map: jobId -> criterionId -> code
    const consensusMap: Record<string, Record<string, string>> = {}

    // Priority 1: ConsensusStatus with finalSubfactor
    for (const cs of consensusStatuses) {
      if (cs.finalSubfactor) {
        if (!consensusMap[cs.jobId]) consensusMap[cs.jobId] = {}
        consensusMap[cs.jobId][cs.criterionId] = cs.finalSubfactor.code
      }
    }

    // Priority 2: FacilitatorDecision
    for (const fd of facilitatorDecisions) {
      if (!consensusMap[fd.jobId]) consensusMap[fd.jobId] = {}
      if (!consensusMap[fd.jobId][fd.criterionId]) {
        consensusMap[fd.jobId][fd.criterionId] = fd.subfactor.code
      }
    }

    // Priority 3: Vote mode (most frequent)
    const votesByJobCrit: Record<string, Record<string, Record<string, number>>> = {}
    for (const v of votes) {
      if (!votesByJobCrit[v.jobId]) votesByJobCrit[v.jobId] = {}
      if (!votesByJobCrit[v.jobId][v.criterionId]) votesByJobCrit[v.jobId][v.criterionId] = {}
      const code = v.subfactor.code
      votesByJobCrit[v.jobId][v.criterionId][code] =
        (votesByJobCrit[v.jobId][v.criterionId][code] || 0) + 1
    }
    for (const [jobId, critMap] of Object.entries(votesByJobCrit)) {
      for (const [critId, codeCounts] of Object.entries(critMap)) {
        if (!consensusMap[jobId]?.[critId]) {
          const modeCode = Object.entries(codeCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
          if (modeCode) {
            if (!consensusMap[jobId]) consensusMap[jobId] = {}
            consensusMap[jobId][critId] = modeCode
          }
        }
      }
    }

    // Get existing validations for this user
    const existingValidations = await prisma.memberValidation.findMany({
      where: { sessionId, userId },
    })
    const validationMap: Record<string, Record<string, { accepted: boolean; acceptedAt: string | null }>> = {}
    for (const mv of existingValidations) {
      if (!validationMap[mv.jobId]) validationMap[mv.jobId] = {}
      validationMap[mv.jobId][mv.criterionId] = {
        accepted: mv.accepted,
        acceptedAt: mv.acceptedAt?.toISOString() ?? null,
      }
    }

    // Build response per job
    const jobs = sessionJobs.map((sj) => {
      const preScores = preScoreMap[sj.id] || {}
      const consensusScores = consensusMap[sj.job.id] || {}
      const validations = validationMap[sj.job.id] || {}

      const criteriaComparison = criteria.map((crit) => {
        const pre = preScores[crit.id] ?? null
        const cons = consensusScores[crit.id] ?? null
        const changed = pre !== null && cons !== null && pre !== cons
        const validation = validations[crit.id]

        return {
          criterionId: crit.id,
          criterionName: crit.name,
          criterionOrder: crit.order,
          preScore: pre,
          consensus: cons,
          changed,
          accepted: validation?.accepted ?? false,
          acceptedAt: validation?.acceptedAt ?? null,
        }
      })

      const totalChanged = criteriaComparison.filter((c) => c.changed).length
      const totalAccepted = criteriaComparison.filter((c) => c.changed && c.accepted).length
      const allAccepted = totalChanged === 0 || totalAccepted === totalChanged

      return {
        sessionJobId: sj.id,
        jobId: sj.job.id,
        jobTitle: sj.job.title,
        department: sj.job.department?.name ?? null,
        criteria: criteriaComparison,
        totalChanged,
        totalAccepted,
        allAccepted,
      }
    })

    // Check if ALL jobs are fully validated by this user
    const userFullyValidated = jobs.every((j) => j.allAccepted)

    return NextResponse.json({
      sessionId,
      userId,
      sessionStatus: evalSession.status,
      jobs,
      userFullyValidated,
    })
  } catch (error) {
    console.error("[POST-CONSENSUS GET]", error)
    return NextResponse.json({ message: "Eroare internă." }, { status: 500 })
  }
}

/**
 * POST — Accept a criterion (or batch accept all changed criteria for a job)
 */
const acceptSchema = z.object({
  jobId: z.string(),
  criterionId: z.string().optional(), // if omitted, accept all changed for this job
  preScore: z.string(),
  consensus: z.string(),
})

const batchAcceptSchema = z.object({
  jobId: z.string(),
  acceptAll: z.literal(true),
})

const postSchema = z.union([acceptSchema, batchAcceptSchema])

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
    const tenantId = session.user.tenantId
    const body = await req.json()

    const evalSession = await prisma.evaluationSession.findFirst({
      where: { id: sessionId, tenantId },
      select: { id: true, status: true },
    })
    if (!evalSession) {
      return NextResponse.json({ message: "Sesiunea nu a fost găsită." }, { status: 404 })
    }

    // Verify participant
    const isParticipant = await prisma.sessionParticipant.findFirst({
      where: { sessionId, userId },
    })
    if (!isParticipant) {
      return NextResponse.json(
        { message: "Nu ești participant." },
        { status: 403 }
      )
    }

    const data = postSchema.parse(body)
    const now = new Date()

    if ("acceptAll" in data && data.acceptAll) {
      // Batch accept: find all changed criteria, upsert all as accepted
      // First get this job's pre-scores and consensus
      const res = await fetch(
        new URL(`/api/v1/sessions/${sessionId}/post-consensus`, req.url),
        { headers: { cookie: req.headers.get("cookie") || "" } }
      )
      // Instead of fetching self, just do direct DB queries
      const existingValidations = await prisma.memberValidation.findMany({
        where: { sessionId, jobId: data.jobId, userId },
      })

      // Mark all as accepted
      await prisma.$transaction(
        existingValidations
          .filter((v) => !v.accepted)
          .map((v) =>
            prisma.memberValidation.update({
              where: { id: v.id },
              data: { accepted: true, acceptedAt: now },
            })
          )
      )

      return NextResponse.json({ success: true, action: "batch-accepted" })
    }

    // Single criterion accept
    const { jobId, criterionId, preScore, consensus } = data as z.infer<typeof acceptSchema>
    if (!criterionId) {
      return NextResponse.json({ message: "criterionId obligatoriu." }, { status: 400 })
    }

    await prisma.memberValidation.upsert({
      where: {
        sessionId_jobId_userId_criterionId: {
          sessionId,
          jobId,
          userId,
          criterionId,
        },
      },
      update: { accepted: true, acceptedAt: now },
      create: {
        sessionId,
        jobId,
        userId,
        criterionId,
        preScore,
        consensus,
        accepted: true,
        acceptedAt: now,
      },
    })

    // Check if all participants have validated everything → auto-close
    await checkAutoClose(sessionId)

    return NextResponse.json({ success: true, action: "accepted" })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Date invalide.", errors: error.issues },
        { status: 400 }
      )
    }
    console.error("[POST-CONSENSUS POST]", error)
    return NextResponse.json({ message: "Eroare internă." }, { status: 500 })
  }
}

/**
 * Check if all participants have validated all changed criteria
 * → transition session to OWNER_VALIDATION
 */
async function checkAutoClose(sessionId: string) {
  const participants = await prisma.sessionParticipant.findMany({
    where: { sessionId },
    select: { userId: true },
  })

  const validations = await prisma.memberValidation.findMany({
    where: { sessionId },
  })

  // Group by user: check that all non-accepted entries are 0
  const pendingByUser: Record<string, number> = {}
  for (const p of participants) {
    pendingByUser[p.userId] = 0
  }
  for (const v of validations) {
    if (!v.accepted && pendingByUser[v.userId] !== undefined) {
      pendingByUser[v.userId]++
    }
  }

  // All have validations and none pending
  const allDone = Object.values(pendingByUser).every((count) => count === 0)
  // But we also need to ensure each user HAS validations (i.e., the records were created)
  const usersWithValidations = new Set(validations.map((v) => v.userId))
  const allUsersHaveRecords = participants.every((p) => usersWithValidations.has(p.userId))

  if (allDone && allUsersHaveRecords) {
    await prisma.evaluationSession.update({
      where: { id: sessionId },
      data: { status: "OWNER_VALIDATION" },
    })
  }
}
