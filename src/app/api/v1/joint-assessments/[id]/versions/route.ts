import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

export const dynamic = "force-dynamic"

const CreateVersionSchema = z.object({
  label: z.string().min(1),
  gapProcent: z.number(),
})

/**
 * GET /api/v1/joint-assessments/[id]/versions
 * Returnează toate versiunile raportului
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
  const versions = (actionPlan?.versions as Array<Record<string, unknown>>) ?? []

  return NextResponse.json({ versions })
}

/**
 * POST /api/v1/joint-assessments/[id]/versions
 * Creează o nouă versiune (snapshot) a raportului curent
 */
export async function POST(
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
    const parsed = CreateVersionSchema.safeParse(body)
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
    if (!actionPlan.versions) actionPlan.versions = []

    const nextVersion = actionPlan.versions.length + 1

    // Snapshot al capitolelor si semnaturilor curente
    const versionSnapshot = {
      version: nextVersion,
      label: parsed.data.label,
      createdAt: new Date().toISOString(),
      createdBy: session.user.name ?? session.user.email,
      gapProcent: parsed.data.gapProcent,
      chapters: { ...(actionPlan.chapters ?? {}) },
      signatures: (actionPlan.signatures ?? [])
        .filter((s: { version: number }) => s.version === nextVersion)
        .map((s: { memberId: string; memberName: string; signedAt: string }) => ({
          memberId: s.memberId,
          memberName: s.memberName,
          signedAt: s.signedAt,
        })),
    }

    actionPlan.versions.push(versionSnapshot)
    actionPlan.currentVersion = nextVersion

    // Jurnal
    if (!actionPlan.jurnal) actionPlan.jurnal = []
    actionPlan.jurnal.push({
      timestamp: new Date().toISOString(),
      actiune: "VERSIUNE_CREATA",
      detalii: `Versiunea V${nextVersion} "${parsed.data.label}" creata. Gap curent: ${parsed.data.gapProcent}%.`,
      efectuatDe: session.user.name ?? session.user.email,
    })

    await prisma.jointPayAssessment.update({
      where: { id },
      data: { actionPlan },
    })

    return NextResponse.json({ version: versionSnapshot }, { status: 201 })
  } catch (error) {
    console.error("[JOINT-ASSESSMENTS VERSIONS POST]", error)
    return NextResponse.json({ message: "Eroare server." }, { status: 500 })
  }
}
