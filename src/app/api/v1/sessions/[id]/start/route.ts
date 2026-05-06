/**
 * POST /api/v1/sessions/[id]/start
 *
 * Porneste evaluarea unei sesiuni:
 *  - AI_GENERATED: AI evalueaza automat toate posturile, sesiunea trece direct la COMPLETED
 *  - AI_COMMITTEE: AI evalueaza (T0), sesiunea trece la IN_PROGRESS pentru dezbatere comisie
 *  - COMMITTEE_ONLY: doar trece sesiunea la IN_PROGRESS (fara evaluare AI)
 *
 * Auth: sesiune utilizator (creatorul sesiunii sau admin tenant).
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"
import { autoEvaluateSession } from "@/lib/agents/job-auto-evaluator"

export const dynamic = "force-dynamic"
export const maxDuration = 120

const schema = z.object({
  evaluationType: z
    .enum(["AI_GENERATED", "AI_COMMITTEE", "COMMITTEE_ONLY"])
    .optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const { id: sessionId } = await params
    const tenantId = session.user.tenantId
    const userId = session.user.id

    const body = await req.json().catch(() => ({}))
    const data = schema.parse(body)

    // Load session
    const evalSession = await prisma.evaluationSession.findFirst({
      where: { id: sessionId, tenantId },
      include: {
        sessionJobs: {
          include: {
            job: {
              select: {
                id: true,
                title: true,
                purpose: true,
                description: true,
                responsibilities: true,
                requirements: true,
              },
            },
          },
        },
        participants: { select: { userId: true } },
      },
    })

    if (!evalSession) {
      return NextResponse.json(
        { message: "Sesiunea nu a fost gasita." },
        { status: 404 }
      )
    }

    if (evalSession.status !== "DRAFT") {
      return NextResponse.json(
        { message: "Sesiunea nu este in stare DRAFT." },
        { status: 400 }
      )
    }

    if (evalSession.sessionJobs.length === 0) {
      return NextResponse.json(
        { message: "Sesiunea nu are posturi de evaluat." },
        { status: 400 }
      )
    }

    // Override evaluationType if provided, otherwise use session default
    const evaluationType =
      data.evaluationType ?? evalSession.evaluationType ?? "AI_GENERATED"

    // Update evaluationType on session if overridden
    if (data.evaluationType && data.evaluationType !== evalSession.evaluationType) {
      await prisma.evaluationSession.update({
        where: { id: sessionId },
        data: { evaluationType: data.evaluationType },
      })
    }

    // COMMITTEE_ONLY: just transition to IN_PROGRESS, no AI evaluation
    if (evaluationType === "COMMITTEE_ONLY") {
      const updated = await prisma.evaluationSession.update({
        where: { id: sessionId },
        data: {
          status: "IN_PROGRESS",
          startedAt: new Date(),
        },
      })

      return NextResponse.json({
        ok: true,
        sessionId: updated.id,
        evaluationType: "COMMITTEE_ONLY",
        status: "IN_PROGRESS",
        message: "Sesiunea a fost pornita. Comisia poate incepe evaluarea.",
      })
    }

    // AI_GENERATED or AI_COMMITTEE: run AI auto-evaluation
    // Transition to IN_PROGRESS first (so participants see it's started)
    await prisma.evaluationSession.update({
      where: { id: sessionId },
      data: {
        status: "IN_PROGRESS",
        startedAt: new Date(),
      },
    })

    let aiResult
    try {
      aiResult = await autoEvaluateSession(sessionId, userId)
    } catch (error: any) {
      // Revert to DRAFT if AI evaluation fails completely
      await prisma.evaluationSession.update({
        where: { id: sessionId },
        data: {
          status: "DRAFT",
          startedAt: null,
        },
      })
      console.error("[SESSION START] AI evaluation failed:", error)
      return NextResponse.json(
        {
          message:
            "Evaluarea AI a esuat. Sesiunea ramane in DRAFT.",
          error: error.message,
        },
        { status: 500 }
      )
    }

    // AI_GENERATED: auto-complete after AI evaluation
    const finalStatus =
      evaluationType === "AI_GENERATED" ? "COMPLETED" : "IN_PROGRESS"

    if (evaluationType === "AI_GENERATED") {
      await prisma.evaluationSession.update({
        where: { id: sessionId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      })
    }

    return NextResponse.json({
      ok: true,
      sessionId,
      evaluationType,
      status: finalStatus,
      jobsEvaluated: aiResult.jobsEvaluated,
      errors: aiResult.errors,
      scores: aiResult.totalScore,
      message:
        evaluationType === "AI_GENERATED"
          ? `${aiResult.jobsEvaluated} posturi evaluate automat. Sesiune finalizata.`
          : `${aiResult.jobsEvaluated} posturi evaluate de AI (T0). Comisia poate dezbate si ajusta.`,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Date invalide.", errors: error.issues },
        { status: 400 }
      )
    }
    console.error("[SESSION START]", error)
    return NextResponse.json(
      { message: "Eroare interna." },
      { status: 500 }
    )
  }
}
