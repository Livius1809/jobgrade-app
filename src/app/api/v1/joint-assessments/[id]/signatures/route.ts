import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

export const dynamic = "force-dynamic"

const SignatureSchema = z.object({
  signatureDataUrl: z.string().min(1),
  version: z.number().int().positive(),
})

/**
 * GET /api/v1/joint-assessments/[id]/signatures
 * Returnează toate semnăturile
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
  const signatures = (actionPlan?.signatures as Array<Record<string, unknown>>) ?? []

  return NextResponse.json({ signatures })
}

/**
 * POST /api/v1/joint-assessments/[id]/signatures
 * Adaugă semnătura unui membru
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
    const parsed = SignatureSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ message: "Date invalide." }, { status: 422 })
    }

    const assessment = await prisma.jointPayAssessment.findFirst({
      where: { id, tenantId: session.user.tenantId },
    })

    if (!assessment) {
      return NextResponse.json({ message: "Assessment negasit." }, { status: 404 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actionPlan = (assessment.actionPlan as any) ?? {}
    if (!actionPlan.signatures) actionPlan.signatures = []

    // Verifică duplicat pe aceeași versiune
    const existing = actionPlan.signatures.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (s: any) => s.memberId === session.user.id && s.version === parsed.data.version
    )
    if (existing) {
      return NextResponse.json(
        { message: "Ati semnat deja aceasta versiune." },
        { status: 409 }
      )
    }

    const signatureEntry = {
      memberId: session.user.id,
      memberName: session.user.name ?? session.user.email,
      memberRole: session.user.role,
      version: parsed.data.version,
      signatureDataUrl: parsed.data.signatureDataUrl,
      signedAt: new Date().toISOString(),
    }

    actionPlan.signatures.push(signatureEntry)

    // Jurnal
    if (!actionPlan.jurnal) actionPlan.jurnal = []
    actionPlan.jurnal.push({
      timestamp: new Date().toISOString(),
      actiune: "SEMNATURA_ADAUGATA",
      detalii: `${signatureEntry.memberName} (${signatureEntry.memberRole}) a semnat versiunea V${parsed.data.version}.`,
      efectuatDe: signatureEntry.memberName,
    })

    await prisma.jointPayAssessment.update({
      where: { id },
      data: { actionPlan },
    })

    return NextResponse.json({ signature: { ...signatureEntry, signatureDataUrl: "[saved]" } })
  } catch (error) {
    console.error("[JOINT-ASSESSMENTS SIGNATURES POST]", error)
    return NextResponse.json({ message: "Eroare server." }, { status: 500 })
  }
}
