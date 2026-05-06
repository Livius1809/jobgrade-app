/**
 * /api/v1/card-inputs
 *
 * Salvare/citire inputuri per card B2B (C3 documente, C3 obiective, C4 climat, C4 obiective CA, C4 documente, C4 calibrare).
 * Stocare in tenant-storage (SystemConfig) — zero migrare schema.
 *
 * GET  ?card=C3_DOCUMENTS | C3_OBJECTIVES | C4_CLIMATE | C4_STRATEGIC_OBJ | C4_DOCUMENTS | C4_CALIBRATION
 * POST { card, data }
 */

import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { getTenantData, setTenantData } from "@/lib/tenant-storage"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

const VALID_CARDS = [
  "C3_DOCUMENTS", "C3_OBJECTIVES",
  "C4_CLIMATE", "C4_STRATEGIC_OBJ", "C4_DOCUMENTS", "C4_CALIBRATION",
]

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const card = req.nextUrl.searchParams.get("card")
  if (!card || !VALID_CARDS.includes(card)) {
    return NextResponse.json({ error: `card invalid. Optiuni: ${VALID_CARDS.join(", ")}` }, { status: 400 })
  }

  // Guard: C3 inputs require C1+C2 completion
  if (card?.startsWith("C3_")) {
    const c1c2Check = await prisma.job.count({ where: { tenantId: session.user.tenantId, isActive: true } })
    if (c1c2Check < 2) {
      return NextResponse.json({ error: "C1+C2 trebuie completate înainte de C3" }, { status: 403 })
    }
  }

  const data = await getTenantData(session.user.tenantId, card)
  return NextResponse.json({ card, data: data || null })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const body = await req.json()
  const { card, data } = body

  if (!card || !VALID_CARDS.includes(card)) {
    return NextResponse.json({ error: `card invalid. Optiuni: ${VALID_CARDS.join(", ")}` }, { status: 400 })
  }

  // Guard: C3 inputs require C1+C2 completion
  if (card?.startsWith("C3_")) {
    const c1c2Check = await prisma.job.count({ where: { tenantId: session.user.tenantId, isActive: true } })
    if (c1c2Check < 2) {
      return NextResponse.json({ error: "C1+C2 trebuie completate înainte de C3" }, { status: 403 })
    }
  }

  if (data === undefined) {
    return NextResponse.json({ error: "data obligatoriu" }, { status: 400 })
  }

  await setTenantData(session.user.tenantId, card, data)

  // Learning: input client = cunoastere despre organizatie
  try {
    const { learnFromClientInput } = await import("@/lib/learning-hooks")
    await learnFromClientInput(session.user.tenantId, card, JSON.stringify(data).slice(0, 400))
  } catch {}

  return NextResponse.json({ ok: true, card })
}
