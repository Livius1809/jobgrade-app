/**
 * GET /api/v1/bridge/map?territory=MEDGIDIA&sector=AGRICULTURA&niche=AGRI_PROCESARE_PRIMARA
 *
 * Hartă economică: Furnizori → Servicii intermediare → Piață de desfacere
 * Suprapunere pe teritoriu per sector/nișă.
 *
 * Returnează 3 straturi cu coordonate GPS + lanțuri valorice + gap-uri.
 */

export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { generateSupplyChainMap } from "@/lib/bridge/supply-chain-map"

export async function GET(req: NextRequest) {
  const territory = req.nextUrl.searchParams.get("territory")
  const sector = req.nextUrl.searchParams.get("sector")

  if (!territory || !sector) {
    return NextResponse.json({ error: "territory și sector sunt obligatorii" }, { status: 400 })
  }

  const niche = req.nextUrl.searchParams.get("niche") || undefined
  const includeNeighbors = req.nextUrl.searchParams.get("neighbors") !== "false"

  const map = await generateSupplyChainMap(
    territory,
    sector.toUpperCase(),
    niche?.toUpperCase(),
    includeNeighbors
  )

  return NextResponse.json(map)
}
