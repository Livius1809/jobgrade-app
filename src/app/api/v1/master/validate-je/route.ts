/**
 * POST /api/v1/master/validate-je
 *
 * Validare finală a evaluării JE de către Director General / reprezentant legal.
 * Blochează sesiunea, setează status VALIDATED, loghează în jurnal.
 *
 * Body: { sessionId: string }
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  // Doar OWNER sau COMPANY_ADMIN pot valida
  if (!["OWNER", "SUPER_ADMIN", "COMPANY_ADMIN"].includes(session.user.role)) {
    return NextResponse.json(
      { error: "Doar Directorul General sau reprezentantul legal poate valida evaluarea." },
      { status: 403 },
    )
  }

  const { sessionId } = await req.json()
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId obligatoriu" }, { status: 400 })
  }

  // Verificăm că sesiunea aparține tenant-ului curent
  const evalSession = await prisma.evaluationSession.findFirst({
    where: {
      id: sessionId,
      tenantId: session.user.tenantId,
      status: { in: ["COMPLETED", "OWNER_VALIDATION"] },
    },
  })

  if (!evalSession) {
    return NextResponse.json(
      { error: "Sesiune inexistentă sau deja validată." },
      { status: 404 },
    )
  }

  // Validare
  const updated = await prisma.evaluationSession.update({
    where: { id: sessionId },
    data: {
      status: "VALIDATED",
      validatedAt: new Date(),
      validatedBy: session.user.id,
    },
  })

  console.log(`[validate-je] Session ${sessionId} validated by ${session.user.email} for tenant ${session.user.tenantId}`)

  return NextResponse.json({
    ok: true,
    sessionId: updated.id,
    validatedAt: updated.validatedAt,
    validatedBy: session.user.email,
  })
}
