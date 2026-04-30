/**
 * POST /api/v1/sessions/auto-evaluate
 *
 * Rulează evaluarea automată AI pe toate posturile dintr-o sesiune.
 * AI-ul citește fișele de post și propune subfactorii per criteriu.
 * Clientul validează apoi rezultatele.
 *
 * Body: { sessionId }
 */

import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { autoEvaluateSession } from "@/lib/agents/job-auto-evaluator"

export const dynamic = "force-dynamic"
export const maxDuration = 120

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const { sessionId } = await request.json()
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId obligatoriu" }, { status: 400 })
  }

  try {
    const result = await autoEvaluateSession(sessionId, session.user.id)

    return NextResponse.json({
      ok: true,
      jobsEvaluated: result.jobsEvaluated,
      scores: result.totalScore,
      message: `${result.jobsEvaluated} posturi evaluate automat. Verificați și validați rezultatele.`,
    })
  } catch (error: any) {
    console.error("[AUTO-EVALUATE]", error)
    return NextResponse.json({ error: error.message || "Eroare la evaluare automată" }, { status: 500 })
  }
}
