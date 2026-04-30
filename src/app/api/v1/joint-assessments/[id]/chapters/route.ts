import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

export const dynamic = "force-dynamic"

const UpdateChapterSchema = z.object({
  chapterId: z.string().min(1),
  content: z.string(),
})

/**
 * GET /api/v1/joint-assessments/[id]/chapters
 * Returnează capitolele raportului
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
  const chapters = (actionPlan?.chapters as Record<string, string>) ?? {}
  const categories = (actionPlan?.categories as Array<Record<string, unknown>>) ?? []

  return NextResponse.json({ chapters, categories })
}

/**
 * PATCH /api/v1/joint-assessments/[id]/chapters
 * Actualizează conținutul unui capitol
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ message: "Neautorizat." }, { status: 401 })

    const { role, tenantId } = session.user
    if (!["COMPANY_ADMIN", "OWNER", "SUPER_ADMIN", "FACILITATOR"].includes(role)) {
      return NextResponse.json({ message: "Acces interzis." }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const parsed = UpdateChapterSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ message: "Date invalide." }, { status: 422 })
    }

    const assessment = await prisma.jointPayAssessment.findFirst({
      where: { id, tenantId },
    })

    if (!assessment) {
      return NextResponse.json({ message: "Assessment negasit." }, { status: 404 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actionPlan = (assessment.actionPlan as any) ?? {}
    if (!actionPlan.chapters) actionPlan.chapters = {}

    actionPlan.chapters[parsed.data.chapterId] = parsed.data.content

    // Jurnal
    if (!actionPlan.jurnal) actionPlan.jurnal = []
    actionPlan.jurnal.push({
      timestamp: new Date().toISOString(),
      actiune: "CAPITOL_ACTUALIZAT",
      detalii: `Capitolul "${parsed.data.chapterId}" a fost actualizat de ${session.user.name ?? session.user.email}.`,
      efectuatDe: session.user.name ?? session.user.email,
    })

    // Actualizare status la IN_PROGRESS dacă e OPEN
    const newStatus = assessment.status === "OPEN" ? "IN_PROGRESS" : assessment.status

    await prisma.jointPayAssessment.update({
      where: { id },
      data: {
        actionPlan,
        status: newStatus,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[JOINT-ASSESSMENTS CHAPTERS PATCH]", error)
    return NextResponse.json({ message: "Eroare server." }, { status: 500 })
  }
}
