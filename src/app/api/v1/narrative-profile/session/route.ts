/**
 * POST /api/v1/narrative-profile/session
 *
 * Gestionează sesiunile de feedback dual view:
 * - Creare sesiune (SCHEDULED)
 * - Start sesiune (IN_PROGRESS)
 * - Scroll sync (broadcast position)
 * - Complete sesiune (cu action plan)
 *
 * GET /api/v1/narrative-profile/session?id=X
 * - Returnează starea sesiunii curente
 */

export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import type { DualViewSession, ActionDirection } from "@/lib/cpu/profilers/narrative-profile"

// In-memory store (va fi migrat în DB la producție)
const sessions = new Map<string, DualViewSession>()

// ═══════════════════════════════════════════════════════════════
// GET — starea sesiunii
// ═══════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("id")

  if (!sessionId) {
    // List all sessions for a consultant
    const consultantId = request.nextUrl.searchParams.get("consultantId")
    if (consultantId) {
      const consultantSessions = Array.from(sessions.values())
        .filter((s) => s.consultantId === consultantId)
        .sort((a, b) => (b.startedAt || "").localeCompare(a.startedAt || ""))
      return NextResponse.json({ sessions: consultantSessions })
    }
    return NextResponse.json({ error: "Session ID or consultantId required" }, { status: 400 })
  }

  const session = sessions.get(sessionId)
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 })
  }

  return NextResponse.json(session)
}

// ═══════════════════════════════════════════════════════════════
// POST — acțiuni pe sesiune
// ═══════════════════════════════════════════════════════════════

interface SessionAction {
  action: "create" | "start" | "scroll" | "complete" | "cancel"
  sessionId?: string
  documentId?: string
  consultantId?: string
  subjectId?: string
  scrollPosition?: string
  outcome?: {
    actionPlan: ActionDirection[]
    consultantNotes: string
    nextSessionDate?: string
  }
}

export async function POST(request: NextRequest) {
  const body: SessionAction = await request.json()

  switch (body.action) {
    case "create": {
      if (!body.documentId || !body.consultantId || !body.subjectId) {
        return NextResponse.json(
          { error: "documentId, consultantId, subjectId required" },
          { status: 400 }
        )
      }

      const session: DualViewSession = {
        sessionId: `dvs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        documentId: body.documentId,
        consultantId: body.consultantId,
        subjectId: body.subjectId,
        mode: "LIVE",
        status: "SCHEDULED",
      }

      sessions.set(session.sessionId, session)
      return NextResponse.json(session, { status: 201 })
    }

    case "start": {
      const session = sessions.get(body.sessionId || "")
      if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 })

      session.status = "IN_PROGRESS"
      session.startedAt = new Date().toISOString()
      return NextResponse.json(session)
    }

    case "scroll": {
      const session = sessions.get(body.sessionId || "")
      if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 })

      session.currentScrollPosition = body.scrollPosition || null
      return NextResponse.json({ position: session.currentScrollPosition })
    }

    case "complete": {
      const session = sessions.get(body.sessionId || "")
      if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 })

      session.status = "COMPLETED"
      session.outcome = body.outcome
      return NextResponse.json(session)
    }

    case "cancel": {
      const session = sessions.get(body.sessionId || "")
      if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 })

      session.status = "CANCELLED"
      return NextResponse.json(session)
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  }
}
