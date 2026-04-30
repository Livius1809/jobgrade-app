import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@/generated/prisma"

export const dynamic = "force-dynamic"

const ADMIN_ROLES: UserRole[] = [
  UserRole.OWNER,
  UserRole.COMPANY_ADMIN,
  UserRole.FACILITATOR,
]

/**
 * GET — Returns the complete structured process journal for a session.
 * Categories: Setup | Pre-scorare | Discuție grup | Mediere AI | Validare | Notificări
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
    const tenantId = session.user.tenantId

    // Only admins can view full journal
    if (!ADMIN_ROLES.includes(session.user.role as UserRole)) {
      return NextResponse.json({ message: "Acces restricționat." }, { status: 403 })
    }

    const evalSession = await prisma.evaluationSession.findFirst({
      where: { id: sessionId, tenantId },
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
        startedAt: true,
        completedAt: true,
        validatedAt: true,
        evaluationType: true,
      },
    })
    if (!evalSession) {
      return NextResponse.json({ message: "Sesiunea nu a fost găsită." }, { status: 404 })
    }

    // ─── Setup ──────────────────────────────
    const participants = await prisma.sessionParticipant.findMany({
      where: { sessionId },
      include: {
        user: { select: { firstName: true, lastName: true, jobTitle: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    })

    const sessionJobs = await prisma.sessionJob.findMany({
      where: { sessionId },
      include: {
        job: { select: { title: true, department: { select: { name: true } } } },
      },
      orderBy: { createdAt: "asc" },
    })

    const setup = {
      sessionName: evalSession.name,
      createdAt: evalSession.createdAt,
      startedAt: evalSession.startedAt,
      evaluationType: evalSession.evaluationType,
      members: participants.map((p) => ({
        name: `${p.user.firstName} ${p.user.lastName}`,
        jobTitle: p.user.jobTitle,
        email: p.user.email,
        joinedAt: p.createdAt,
      })),
      jobs: sessionJobs.map((sj) => ({
        title: sj.job.title,
        department: sj.job.department?.name ?? null,
      })),
    }

    // ─── Pre-scorare ────────────────────────
    const evaluations = await prisma.evaluation.findMany({
      where: { sessionId },
      include: {
        assignment: {
          include: {
            user: { select: { firstName: true, lastName: true } },
            sessionJob: { include: { job: { select: { title: true } } } },
          },
        },
        criterion: { select: { name: true } },
        subfactor: { select: { code: true } },
      },
      orderBy: { createdAt: "asc" },
    })

    const preScoring = evaluations.map((ev) => ({
      evaluator: `${ev.assignment.user.firstName} ${ev.assignment.user.lastName}`,
      job: ev.assignment.sessionJob.job.title,
      criterion: ev.criterion.name,
      letter: ev.subfactor.code,
      justification: ev.justification,
      timestamp: ev.createdAt,
    }))

    // ─── Discuție grup ──────────────────────
    const comments = await prisma.discussionComment.findMany({
      where: { sessionId },
      include: {
        user: { select: { firstName: true, lastName: true } },
        criterion: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
    })

    const discussion = comments.map((c) => ({
      author: c.isAi ? "AI Mediator" : `${c.user?.firstName ?? ""} ${c.user?.lastName ?? ""}`,
      isAi: c.isAi,
      criterion: c.criterion.name,
      content: c.content,
      round: c.round,
      timestamp: c.createdAt,
    }))

    // ─── Voturi ─────────────────────────────
    const votes = await prisma.vote.findMany({
      where: { sessionId },
      include: {
        user: { select: { firstName: true, lastName: true } },
        criterion: { select: { name: true } },
        subfactor: { select: { code: true } },
      },
      orderBy: { createdAt: "asc" },
    })

    const votingEntries = votes.map((v) => ({
      voter: `${v.user.firstName} ${v.user.lastName}`,
      criterion: v.criterion.name,
      letter: v.subfactor.code,
      round: v.round,
      timestamp: v.createdAt,
    }))

    // ─── Mediere AI ─────────────────────────
    const facilitatorDecisions = await prisma.facilitatorDecision.findMany({
      where: { sessionId },
      include: {
        facilitator: { select: { firstName: true, lastName: true } },
        criterion: { select: { name: true } },
        subfactor: { select: { code: true } },
      },
      orderBy: { createdAt: "asc" },
    })

    const mediation = facilitatorDecisions.map((fd) => ({
      facilitator: `${fd.facilitator.firstName} ${fd.facilitator.lastName}`,
      criterion: fd.criterion.name,
      decision: fd.subfactor.code,
      rationale: fd.rationale,
      timestamp: fd.createdAt,
    }))

    // ─── Validare ───────────────────────────
    const validations = await prisma.memberValidation.findMany({
      where: { sessionId },
      include: {
        user: { select: { firstName: true, lastName: true } },
        criterion: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
    })

    const validationEntries = validations.map((v) => ({
      member: `${v.user.firstName} ${v.user.lastName}`,
      criterion: v.criterion.name,
      preScore: v.preScore,
      consensus: v.consensus,
      accepted: v.accepted,
      acceptedAt: v.acceptedAt,
      timestamp: v.createdAt,
    }))

    // ─── Consensus statuses ─────────────────
    const consensusStatuses = await prisma.consensusStatus.findMany({
      where: { sessionId },
      include: {
        criterion: { select: { name: true } },
        finalSubfactor: { select: { code: true } },
      },
    })

    const consensusResults = consensusStatuses.map((cs) => ({
      criterion: cs.criterion.name,
      status: cs.status,
      finalLetter: cs.finalSubfactor?.code ?? null,
      updatedAt: cs.updatedAt,
    }))

    return NextResponse.json({
      session: {
        ...evalSession,
      },
      journal: {
        setup,
        preScoring,
        discussion,
        voting: votingEntries,
        mediation,
        validation: validationEntries,
        consensusResults,
      },
      totals: {
        participants: participants.length,
        jobs: sessionJobs.length,
        evaluations: evaluations.length,
        comments: comments.length,
        votes: votes.length,
        decisions: facilitatorDecisions.length,
        validations: validations.length,
      },
    })
  } catch (error) {
    console.error("[JOURNAL]", error)
    return NextResponse.json({ message: "Eroare internă." }, { status: 500 })
  }
}
