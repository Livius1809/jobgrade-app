/**
 * GET /api/v1/health/resilience
 *
 * Status reziliență AI — ce nivel de degradare e activ.
 * Util pentru Owner Dashboard, monitoring, și debugging.
 *
 * POST /api/v1/health/resilience
 * Forțează re-probe (invalidează cache).
 */

import { NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { getResilienceStatus, invalidateProbe } from "@/lib/ai/resilience"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const status = await getResilienceStatus()
  return NextResponse.json(status)
}

export async function POST() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  invalidateProbe()
  const status = await getResilienceStatus()
  return NextResponse.json({ ...status, reprobed: true })
}
