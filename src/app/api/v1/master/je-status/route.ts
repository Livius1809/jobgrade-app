/**
 * GET /api/v1/master/je-status
 *
 * Returnează statusul evaluării JE pentru tenant-ul curent:
 * - parcurs detectat (AI_GENERATED / AI_COMMITTEE / COMMITTEE_ONLY)
 * - status validare (validat/nevalidat)
 * - nr modificări din simulator (ScoreOverrides)
 */

import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const tenantId = session.user.tenantId

  // Ultima sesiune completată sau validată
  const latestSession = await prisma.evaluationSession.findFirst({
    where: {
      tenantId,
      status: { in: ["COMPLETED", "VALIDATED", "OWNER_VALIDATION"] },
    },
    orderBy: { completedAt: "desc" },
    select: {
      id: true,
      status: true,
      evaluationType: true,
      validatedAt: true,
      validatedBy: true,
      completedAt: true,
      currentRound: true,
      _count: {
        select: {
          overrides: true,
          participants: true,
        },
      },
    },
  })

  if (!latestSession) {
    return NextResponse.json({
      hasSession: false,
      parcurs: null,
      validated: false,
      message: "Nu există o sesiune de evaluare finalizată.",
    })
  }

  // Detectare parcurs din date
  let detectedParcurs = latestSession.evaluationType

  // Fallback: detectare din date dacă evaluationType nu e setat explicit
  if (!detectedParcurs || detectedParcurs === "AI_GENERATED") {
    if (latestSession._count.participants > 0 && latestSession.currentRound > 1) {
      detectedParcurs = "AI_COMMITTEE"
    } else if (latestSession._count.participants > 1) {
      detectedParcurs = "COMMITTEE_ONLY"
    }
  }

  return NextResponse.json({
    hasSession: true,
    sessionId: latestSession.id,
    parcurs: detectedParcurs,
    validated: latestSession.status === "VALIDATED" || !!latestSession.validatedAt,
    validatedAt: latestSession.validatedAt,
    completedAt: latestSession.completedAt,
    overridesCount: latestSession._count.overrides,
    participantsCount: latestSession._count.participants,
  })
}
