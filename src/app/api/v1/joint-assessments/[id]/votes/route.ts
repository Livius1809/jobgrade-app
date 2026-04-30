import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

export const dynamic = "force-dynamic"

const VoteSchema = z.object({
  chapterId: z.string().min(1),
  dimensionId: z.string().min(1),
  validated: z.boolean(),
  comment: z.string().optional(),
})

/**
 * GET /api/v1/joint-assessments/[id]/votes
 * Returnează toate voturile pentru o evaluare comună
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ message: "Neautorizat." }, { status: 401 })

  const { id } = await params
  const assessment = await prisma.jointPayAssessment.findFirst({
    where: { id, tenantId: session.user.tenantId },
  })

  if (!assessment) {
    return NextResponse.json({ message: "Assessment negasit." }, { status: 404 })
  }

  const actionPlan = assessment.actionPlan as Record<string, unknown> | null
  const votes = (actionPlan?.votes as Array<Record<string, unknown>>) ?? []

  return NextResponse.json({ votes })
}

/**
 * POST /api/v1/joint-assessments/[id]/votes
 * Adaugă un vot pe un capitol+dimensiune
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ message: "Neautorizat." }, { status: 401 })

    const { id } = await params
    const body = await req.json()
    const parsed = VoteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ message: "Date invalide.", errors: parsed.error.flatten() }, { status: 422 })
    }

    const assessment = await prisma.jointPayAssessment.findFirst({
      where: { id, tenantId: session.user.tenantId },
    })

    if (!assessment) {
      return NextResponse.json({ message: "Assessment negasit." }, { status: 404 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actionPlan = (assessment.actionPlan as any) ?? {}
    if (!actionPlan.votes) actionPlan.votes = []

    // Verifică dacă a votat deja pe această combinație
    const voteKey = `${parsed.data.chapterId}:${parsed.data.dimensionId}`
    const existingIdx = actionPlan.votes.findIndex(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (v: any) => v.memberId === session.user.id && v.chapterId === voteKey
    )

    const voteEntry = {
      memberId: session.user.id,
      memberName: session.user.name ?? session.user.email,
      memberRole: session.user.role,
      chapterId: voteKey,
      validated: parsed.data.validated,
      comment: parsed.data.comment ?? null,
      votedAt: new Date().toISOString(),
    }

    if (existingIdx >= 0) {
      actionPlan.votes[existingIdx] = voteEntry
    } else {
      actionPlan.votes.push(voteEntry)
    }

    // Jurnal
    if (!actionPlan.jurnal) actionPlan.jurnal = []
    actionPlan.jurnal.push({
      timestamp: new Date().toISOString(),
      actiune: parsed.data.validated ? "VOT_VALIDARE" : "VOT_RESPINGERE",
      detalii: `${voteEntry.memberName} a ${parsed.data.validated ? "validat" : "respins"} ${voteKey}${parsed.data.comment ? `: ${parsed.data.comment}` : ""}`,
      efectuatDe: voteEntry.memberName,
    })

    await prisma.jointPayAssessment.update({
      where: { id },
      data: { actionPlan },
    })

    return NextResponse.json({ vote: voteEntry })
  } catch (error) {
    console.error("[JOINT-ASSESSMENTS VOTES POST]", error)
    return NextResponse.json({ message: "Eroare server." }, { status: 500 })
  }
}
