/**
 * GET /api/v1/cor — Căutare în nomenclatorul COR
 *
 * ?q=programator → sugestii cod COR
 * ?code=2514 → detalii ocupație
 * ?suggest=Director IT → sugestie automată
 */

import { NextRequest, NextResponse } from "next/server"
import { searchCOR, getCORByCode, suggestCOR, COR_GROUPS } from "@/lib/cor/nomenclator"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")
  const code = req.nextUrl.searchParams.get("code")
  const suggest = req.nextUrl.searchParams.get("suggest")

  if (code) {
    const entry = getCORByCode(code)
    return NextResponse.json(entry || { error: "Cod COR negăsit" })
  }

  if (suggest) {
    const suggestions = suggestCOR(suggest)
    return NextResponse.json({ suggestions, query: suggest })
  }

  if (q) {
    const results = searchCOR(q, 15)
    return NextResponse.json({ results, query: q })
  }

  // Fără parametri → returnează grupele mari
  return NextResponse.json({
    groups: Object.entries(COR_GROUPS).map(([code, name]) => ({ code, name })),
    usage: "?q=text pentru căutare, ?code=2514 pentru detalii, ?suggest=Director IT pentru sugestie automată",
  })
}
