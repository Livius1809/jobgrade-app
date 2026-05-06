/**
 * POST /api/v1/video/room
 *
 * Genereaza o camera video Jitsi unica.
 * Body: { purpose: string } (ex: "evaluation-session", "consultation")
 *
 * Returneaza: { roomUrl: string, roomName: string }
 *
 * Auth: sesiune NextAuth sau internal key.
 */

import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"

export const dynamic = "force-dynamic"
export const maxDuration = 15

// Caractere permise in purpose (slug-safe)
const PURPOSE_REGEX = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const { purpose } = body

  if (!purpose || typeof purpose !== "string") {
    return NextResponse.json(
      { error: "purpose e obligatoriu (ex: 'evaluation-session', 'consultation')" },
      { status: 400 }
    )
  }

  // Normalizeaza purpose la slug
  const slug = purpose
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50)

  if (!slug || slug.length < 3) {
    return NextResponse.json(
      { error: "purpose prea scurt (minim 3 caractere alfanumerice)" },
      { status: 400 }
    )
  }

  // Genereaza room name unic
  const tenantId = session.user.tenantId || "default"
  const timestamp = Date.now()
  const roomName = `jobgrade-${tenantId}-${slug}-${timestamp}`

  const roomUrl = `https://meet.jit.si/${encodeURIComponent(roomName)}`

  return NextResponse.json({
    roomName,
    roomUrl,
    createdBy: session.user.id,
    createdAt: new Date().toISOString(),
  })
}
