import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"

/**
 * POST /api/v1/track
 *
 * Logează interacțiuni utilizator pentru construirea contextului.
 * Fire-and-forget din client — nu blochează UI.
 *
 * Body: { eventType, pageRoute?, entityType?, entityId?, detail?, durationMs? }
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { eventType, pageRoute, entityType, entityId, detail, durationMs } = body

    if (!eventType) {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    await (prisma as any).interactionLog.create({
      data: {
        tenantId: (session.user as any).tenantId || "",
        userId: session.user.id,
        eventType,
        pageRoute: pageRoute || null,
        entityType: entityType || null,
        entityId: entityId || null,
        detail: detail || null,
        durationMs: durationMs || null,
      },
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true }) // Fail silently — tracking is non-critical
  }
}
