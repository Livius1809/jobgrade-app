import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@/generated/prisma"

export const dynamic = "force-dynamic"

const SIGNER_ROLES: UserRole[] = [UserRole.OWNER, UserRole.COMPANY_ADMIN]

const schema = z.object({
  signatureData: z.string().min(100), // base64 PNG, minimum length
})

/**
 * POST — Sign a session with electronic + handwritten signature.
 * Only OWNER or COMPANY_ADMIN (Director General / Reprezentant legal) can sign.
 * Sets signatureData (base64 PNG), signedAt, and transitions to VALIDATED.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    if (!SIGNER_ROLES.includes(session.user.role as UserRole)) {
      return NextResponse.json(
        { message: "Doar Directorul General sau reprezentantul legal poate semna raportul." },
        { status: 403 }
      )
    }

    const { id: sessionId } = await params
    const tenantId = session.user.tenantId
    const body = await req.json()
    const { signatureData } = schema.parse(body)

    const evalSession = await prisma.evaluationSession.findFirst({
      where: { id: sessionId, tenantId },
      select: { id: true, status: true },
    })

    if (!evalSession) {
      return NextResponse.json({ message: "Sesiunea nu a fost găsită." }, { status: 404 })
    }

    if (!["COMPLETED", "OWNER_VALIDATION"].includes(evalSession.status)) {
      return NextResponse.json(
        { message: "Sesiunea nu este în stadiul de semnare." },
        { status: 400 }
      )
    }

    const now = new Date()

    await prisma.evaluationSession.update({
      where: { id: sessionId },
      data: {
        signatureData,
        signedAt: now,
        validatedAt: now,
        validatedBy: session.user.id,
        status: "VALIDATED",
      },
    })

    return NextResponse.json({
      success: true,
      signedAt: now.toISOString(),
      signedBy: `${session.user.name || session.user.email}`,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Semnătura nu este validă.", errors: error.issues },
        { status: 400 }
      )
    }
    console.error("[SIGN]", error)
    return NextResponse.json({ message: "Eroare internă." }, { status: 500 })
  }
}

/**
 * GET — Check if session is signed.
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

    const evalSession = await prisma.evaluationSession.findFirst({
      where: { id: sessionId, tenantId },
      select: {
        signatureData: true,
        signedAt: true,
        validatedBy: true,
        validator: { select: { firstName: true, lastName: true } },
      },
    })

    if (!evalSession) {
      return NextResponse.json({ message: "Sesiunea nu a fost găsită." }, { status: 404 })
    }

    return NextResponse.json({
      isSigned: !!evalSession.signatureData,
      signedAt: evalSession.signedAt,
      signedBy: evalSession.validator
        ? `${evalSession.validator.firstName} ${evalSession.validator.lastName}`
        : null,
      hasSignature: !!evalSession.signatureData,
    })
  } catch (error) {
    console.error("[SIGN GET]", error)
    return NextResponse.json({ message: "Eroare internă." }, { status: 500 })
  }
}
