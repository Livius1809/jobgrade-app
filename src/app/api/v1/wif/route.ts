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

  // WIF → Learning: fiecare simulare produce cunoastere despre tipare organizationale
  // Cunoasterea e UNA — folosita de Profiler B2B/B2C, de agenti interni, de WIF insusi
  try {
    const { learningFunnel } = await import("@/lib/agents/learning-funnel")
    const impactSummary = `${result.summary.pozitive} pozitive, ${result.summary.riscuri} riscuri pe ${result.summary.areasAffected.join(", ")}`
    await learningFunnel({
      agentRole: "PMA", // Product Manager — agreca cunoasterea despre comportament organizational
      type: "DECISION",
      input: `WIF simulare ${preset} (${mode}): ${JSON.stringify(params).slice(0, 200)}`,
      output: `Impact: ${impactSummary}. ${result.transformationalInsight || ""}`.slice(0, 1000),
      success: true,
      metadata: { source: "wif-simulation", preset, mode, tenantId: session.user.tenantId, areasAffected: result.summary.areasAffected },
    })
  } catch {}

  return NextResponse.json(result)
}
