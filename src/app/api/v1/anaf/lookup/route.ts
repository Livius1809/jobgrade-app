import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { lookupCUI } from "@/lib/integrations/anaf"
import { lookupCAEN } from "@/lib/integrations/caen"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/v1/anaf/lookup?cui=12345678
 *
 * Returnează datele firmei din ANAF + maparea CAEN → industrie.
 * Necesită autentificare (orice user logat).
 */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ message: "Neautentificat" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const cui = searchParams.get("cui")?.trim()

  if (!cui) {
    return NextResponse.json(
      { message: "Parametrul `cui` este obligatoriu." },
      { status: 400 }
    )
  }

  try {
    const data = await lookupCUI(cui)
    if (!data) {
      return NextResponse.json(
        {
          message: `CUI ${cui} nu a fost găsit la ANAF.`,
          notFound: true,
        },
        { status: 404 }
      )
    }

    const caen = data.caenCode ? lookupCAEN(data.caenCode) : null

    return NextResponse.json({
      cui: data.cui,
      name: data.name,
      vatNumber: data.vatNumber,
      isVATPayer: data.isVATPayer,
      address: data.address,
      city: data.city,
      county: data.county,
      registrationNumber: data.registrationNumber,
      status: data.status,
      caen: caen
        ? {
            code: caen.code,
            name: caen.name,
            industry: caen.industry,
          }
        : null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Eroare necunoscută"
    return NextResponse.json({ message }, { status: 502 })
  }
}
