/**
 * POST /api/v1/crawl/discover
 *
 * Descoperă automat sursele de date pentru un teritoriu.
 * Body: { localitate: "Medgidia", judet: "Constanta", dryRun?: true }
 *
 * dryRun=true: doar descoperă (nu creează surse)
 * dryRun=false: descoperă + creează surse automat
 */

import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { discoverSources } from "@/lib/crawl/auto-discovery"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Neautorizat" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { localitate, judet, dryRun } = body

  if (!localitate || !judet) {
    return NextResponse.json({ error: "localitate și judet sunt obligatorii" }, { status: 400 })
  }

  const result = await discoverSources(localitate, judet, dryRun ?? false)

  return NextResponse.json(result)
}
