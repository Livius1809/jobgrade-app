/**
 * GET /api/v1/territory/analysis?territory=MEDGIDIA
 *
 * Analiză completă pe cele 3 axe: resurse × consum × nevoi.
 * Returnează gap-urile (oportunități de punți/afaceri).
 */

import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { analyzeTerritory } from "@/lib/crawl/territorial-analysis"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Neautorizat" }, { status: 401 })

  const url = new URL(req.url)
  const territory = url.searchParams.get("territory") || "MEDGIDIA"

  const analysis = await analyzeTerritory(territory)

  return NextResponse.json(analysis)
}
