/**
 * /api/v1/simulations/cascade
 *
 * C3 F8 — Simulări cascadă (What-If)
 * POST — Simulare impact cascadă pe relații, procese, buget, dinamică echipă
 *
 * Logica principală extrasa în @/lib/engines/cascade-engine.ts
 * pentru refolosire din endpoint-ul unificat /api/v1/simulations/unified
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { runCascadeSimulation, cascadeSchema } from "@/lib/engines/cascade-engine"

export const dynamic = "force-dynamic"

/**
 * POST — Simulare what-if cu impact cascadă
 * Analizează impactul pe relații ierarhice, de coordonare, funcționale,
 * de reprezentare, noduri de proces, buget și dinamică echipă
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const tenantId = session.user.tenantId
    const body = await req.json()
    const data = cascadeSchema.parse(body)

    const result = await runCascadeSimulation(tenantId, data)

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Date invalide.", errors: error.issues },
        { status: 400 }
      )
    }
    console.error("[SIMULATIONS CASCADE POST]", error)
    return NextResponse.json({ message: "Eroare internă." }, { status: 500 })
  }
}
