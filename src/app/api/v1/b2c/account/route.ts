import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { extractB2CAuth, verifyB2COwnership } from "@/lib/security/b2c-auth"
import { checkPromptInjection, getInjectionBlockResponse } from "@/lib/security"

export const maxDuration = 15

const GRACE_PERIOD_DAYS = 30

// ── DELETE /api/v1/b2c/account?userId=... — GDPR Art.17 Soft Delete ───────

/**
 * VUL-027 / BUILD-004 — Ștergerea contului B2C (soft delete).
 *
 * Marchează contul cu deletedAt + deleteScheduledFor (30 zile).
 * Datele NU sunt șterse imediat — utilizatorul poate anula în perioada de grație.
 * Un cron job separat va face hard delete după expirarea perioadei.
 */
export async function DELETE(req: NextRequest) {
  const p = prisma as any
  const userId = req.nextUrl.searchParams.get("userId")

  if (!userId) {
    return NextResponse.json({ error: "userId e obligatoriu" }, { status: 400 })
  }

  // B2C Auth
  const b2cAuth = extractB2CAuth(req)
  if (!b2cAuth || !verifyB2COwnership(b2cAuth, userId)) {
    return NextResponse.json({ error: "Autentificare B2C invalidă" }, { status: 401 })
  }

  try {
    const user = await p.b2CUser.findUnique({
      where: { id: userId },
      select: { id: true, alias: true, status: true, deletedAt: true },
    })

    if (!user) {
      return NextResponse.json({ error: "Utilizator negăsit" }, { status: 404 })
    }

    // Deja marcat pentru ștergere
    if (user.deletedAt) {
      return NextResponse.json({
        message: "Contul este deja programat pentru ștergere.",
        deletedAt: user.deletedAt,
        deleteScheduledFor: user.deleteScheduledFor,
      })
    }

    const now = new Date()
    const deleteScheduledFor = new Date(now)
    deleteScheduledFor.setDate(deleteScheduledFor.getDate() + GRACE_PERIOD_DAYS)

    await p.b2CUser.update({
      where: { id: userId },
      data: {
        deletedAt: now,
        deleteScheduledFor,
        status: "DELETED",
      },
    })

    return NextResponse.json({
      message: "Contul a fost programat pentru ștergere.",
      deletedAt: now.toISOString(),
      deleteScheduledFor: deleteScheduledFor.toISOString(),
      gracePeriodDays: GRACE_PERIOD_DAYS,
      cancelInfo:
        "Poți anula ștergerea în următoarele 30 de zile " +
        "prin PUT /api/v1/b2c/account?userId=... cu { action: \"cancel-deletion\" }.",
    })
  } catch (e: any) {
    console.error("[B2C Account DELETE] Error:", e.message)
    return NextResponse.json(
      { error: "Eroare la programarea ștergerii contului" },
      { status: 500 }
    )
  }
}

// ── PUT /api/v1/b2c/account?userId=... — Cancel Deletion ─────────────────

/**
 * Anulează ștergerea contului (în perioada de grație de 30 zile).
 * Body: { action: "cancel-deletion" }
 */
export async function PUT(req: NextRequest) {
  const p = prisma as any
  const userId = req.nextUrl.searchParams.get("userId")

  if (!userId) {
    return NextResponse.json({ error: "userId e obligatoriu" }, { status: 400 })
  }

  // B2C Auth
  const b2cAuth = extractB2CAuth(req)
  if (!b2cAuth || !verifyB2COwnership(b2cAuth, userId)) {
    return NextResponse.json({ error: "Autentificare B2C invalidă" }, { status: 401 })
  }

  try {
    const body = await req.json()

    // Prompt injection check on any text input
    const injectionCheck = checkPromptInjection(JSON.stringify(body))
    if (injectionCheck.blocked) {
      return NextResponse.json(
        { error: getInjectionBlockResponse() },
        { status: 400 }
      )
    }

    if (body.action !== "cancel-deletion") {
      return NextResponse.json(
        { error: "Acțiune invalidă. Folosește { action: \"cancel-deletion\" }." },
        { status: 400 }
      )
    }

    const user = await p.b2CUser.findUnique({
      where: { id: userId },
      select: { id: true, deletedAt: true, deleteScheduledFor: true },
    })

    if (!user) {
      return NextResponse.json({ error: "Utilizator negăsit" }, { status: 404 })
    }

    if (!user.deletedAt) {
      return NextResponse.json({
        message: "Contul nu este programat pentru ștergere.",
      })
    }

    // Verifică dacă perioada de grație a expirat
    const now = new Date()
    if (user.deleteScheduledFor && new Date(user.deleteScheduledFor) <= now) {
      return NextResponse.json(
        {
          error:
            "Perioada de grație a expirat. Datele sunt în curs de ștergere definitivă.",
        },
        { status: 410 }
      )
    }

    await p.b2CUser.update({
      where: { id: userId },
      data: {
        deletedAt: null,
        deleteScheduledFor: null,
        status: "ACTIVE",
      },
    })

    return NextResponse.json({
      message: "Ștergerea contului a fost anulată. Contul este din nou activ.",
      restoredAt: now.toISOString(),
    })
  } catch (e: any) {
    console.error("[B2C Account PUT] Error:", e.message)
    return NextResponse.json(
      { error: "Eroare la anularea ștergerii" },
      { status: 500 }
    )
  }
}
