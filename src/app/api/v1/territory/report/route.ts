/**
 * GET /api/v1/territory/report?territory=MEDGIDIA
 *
 * Raport teritorial complet:
 * - Scor vitalitate, nivel transformare, balanță
 * - Resurse (naturale, culturale, umane, infra)
 * - Consum (local vs import per categorie)
 * - Gap-uri ordonate per criticitate
 * - Sectoare cu nișe evaluate (L1 + L3)
 * - Lanțuri valorice per nișă recomandată
 * - Punți recomandate imediat
 */

export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { generateTerritorialReport } from "@/lib/crawl/territorial-report"

export async function GET(req: NextRequest) {
  const territory = req.nextUrl.searchParams.get("territory")
  if (!territory) {
    return NextResponse.json({ error: "territory parameter required" }, { status: 400 })
  }

  const report = await generateTerritorialReport(territory)

  return NextResponse.json(report)
}
