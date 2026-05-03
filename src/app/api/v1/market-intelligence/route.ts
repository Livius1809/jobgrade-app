/**
 * GET /api/v1/market-intelligence?type=c3&territory=MEDGIDIA&caen=0111
 * GET /api/v1/market-intelligence?type=c4&territory=MEDGIDIA&caen=0111
 * GET /api/v1/market-intelligence?type=card5&participantId=xxx&territory=MEDGIDIA
 *
 * Inteligență de piață din Motorul Teritorial pentru:
 * - B2B C3 (Competitivitate): competiție, piață, nișe, positioning
 * - B2B C4 (Dezvoltare): trenduri, forță muncă, oportunități, riscuri
 * - B2C Card 5 (Antreprenoriat): oportunități personalizate + plan acțiune
 */

export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import {
  generateC3Intelligence,
  generateC4Intelligence,
  generateCard5Intelligence,
} from "@/lib/bridge/market-intelligence"

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type")
  const territory = req.nextUrl.searchParams.get("territory")

  if (!type || !territory) {
    return NextResponse.json({ error: "type (c3/c4/card5) și territory sunt obligatorii" }, { status: 400 })
  }

  switch (type) {
    case "c3": {
      const caen = req.nextUrl.searchParams.get("caen")
      const company = req.nextUrl.searchParams.get("company") || undefined
      if (!caen) {
        return NextResponse.json({ error: "caen obligatoriu pentru C3" }, { status: 400 })
      }
      const intel = await generateC3Intelligence(territory.toUpperCase(), caen, company)
      return NextResponse.json({ type: "B2B_C3_COMPETITIVITATE", ...intel })
    }

    case "c4": {
      const caen = req.nextUrl.searchParams.get("caen")
      if (!caen) {
        return NextResponse.json({ error: "caen obligatoriu pentru C4" }, { status: 400 })
      }
      const intel = await generateC4Intelligence(territory.toUpperCase(), caen)
      return NextResponse.json({ type: "B2B_C4_DEZVOLTARE", ...intel })
    }

    case "card5": {
      const participantId = req.nextUrl.searchParams.get("participantId")
      if (!participantId) {
        return NextResponse.json({ error: "participantId obligatoriu pentru Card 5" }, { status: 400 })
      }
      const intel = await generateCard5Intelligence(participantId, territory.toUpperCase())
      return NextResponse.json({ type: "B2C_CARD5_ANTREPRENORIAT", ...intel })
    }

    default:
      return NextResponse.json({ error: "type trebuie să fie: c3, c4, sau card5" }, { status: 400 })
  }
}
