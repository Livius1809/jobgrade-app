import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

/**
 * POST /api/v1/external-signals/cleanup
 *
 * Șterge semnalele externe mai vechi de N zile (default 90).
 * Rulat de un cron n8n o dată pe zi — fără state, fără lock.
 *
 * Query params:
 *   ?days=90   (default 90, min 7, max 365)
 *   ?dryRun=true (nu șterge, doar raportează)
 */

function verifyInternalAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

export async function POST(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const days = Math.min(
    Math.max(parseInt(url.searchParams.get("days") ?? "90", 10) || 90, 7),
    365,
  )
  const dryRun = url.searchParams.get("dryRun") === "true"
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  if (dryRun) {
    const wouldDelete = await prisma.externalSignal.count({
      where: { capturedAt: { lt: cutoff } },
    })
    return NextResponse.json({ dryRun: true, days, cutoff, wouldDelete })
  }

  const result = await prisma.externalSignal.deleteMany({
    where: { capturedAt: { lt: cutoff } },
  })

  return NextResponse.json({
    days,
    cutoff,
    deleted: result.count,
  })
}
