/**
 * POST /api/v1/wif
 *
 * What-If Engine — simulare impact.
 * Un singur endpoint, N preset-uri. Clientul trimite preset + parametri, primeste cascada impact.
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { runSimulation, type SimulationInput } from "@/lib/engines/wif-engine"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const body = await req.json()
  const { preset, mode, params } = body

  if (!preset) {
    return NextResponse.json({ error: "preset obligatoriu" }, { status: 400 })
  }

  const input: SimulationInput = {
    preset,
    mode: mode || "CLASIC",
    tenantId: session.user.tenantId,
    params: params || {},
  }

  const result = await runSimulation(input)

  return NextResponse.json(result)
}
