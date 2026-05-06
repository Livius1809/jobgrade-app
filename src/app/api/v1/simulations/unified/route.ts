/**
 * POST /api/v1/simulations/unified
 *
 * Punct unic de intrare pentru TOATE simulările (WIF local + Cascade AI).
 * Dispatch pe baza preset-ului:
 *   - WIF presets (9): CHANGE_RESPONSIBILITIES, VACANT_POSITION, CHANGE_PERSON,
 *     CHANGE_SALARY, CHANGE_STRUCTURE, STRATEGIC_OBJECTIVES, TOGGLE_HUMAN_AI,
 *     ADD_POSITION, REMOVE_POSITION → wif-engine.ts (calcul local, fără AI)
 *   - Cascade presets (5): CHANGE_PERSON, VACANCY, RESTRUCTURE_TEAM, MODIFY_KPI,
 *     CHANGE_SALARY_PACKAGE → cascade-engine.ts (AI-powered, context org din DB)
 *
 * Backward compatible: callers existenti pe /api/v1/wif si /api/v1/simulations/cascade
 * continua sa functioneze fara modificari.
 */

import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { runSimulation, type SimulationInput } from "@/lib/engines/wif-engine"
import { runCascadeSimulation, CASCADE_TYPES, type CascadeType } from "@/lib/engines/cascade-engine"

export const dynamic = "force-dynamic"

const CASCADE_SET = new Set<string>(CASCADE_TYPES)

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const tenantId = session.user.tenantId
  const body = await req.json()
  const { preset, type, mode, params } = body

  // Accept atât "preset" (format WIF) cât și "type" (format cascade)
  const simulationType: string | undefined = preset || type
  if (!simulationType) {
    return NextResponse.json(
      { error: "preset sau type obligatoriu" },
      { status: 400 },
    )
  }

  const simulationMode = mode || "CLASIC"

  // ── Dispatch: cascade (AI) sau WIF (local) ──
  if (CASCADE_SET.has(simulationType)) {
    // Simulare cascadă — AI-powered cu context organizational
    try {
      const result = await runCascadeSimulation(tenantId, {
        type: simulationType as CascadeType,
        params: params || {},
        mode: simulationMode,
      })

      // Learning funnel — cascade
      try {
        const { learningFunnel } = await import("@/lib/agents/learning-funnel")
        await learningFunnel({
          agentRole: "PMA",
          type: "DECISION",
          input: `Cascade ${simulationType} (${simulationMode}): ${JSON.stringify(params).slice(0, 200)}`,
          output: `${result.impacts.length} impacte. ${result.summary}`.slice(0, 1000),
          success: true,
          metadata: {
            source: "unified-simulation",
            engine: "cascade",
            type: simulationType,
            mode: simulationMode,
            tenantId,
          },
        })
      } catch {}

      return NextResponse.json({
        ...result,
        engine: "cascade",
      })
    } catch (error) {
      console.error("[UNIFIED SIMULATION — CASCADE]", error)
      return NextResponse.json({ error: "Eroare simulare cascada." }, { status: 500 })
    }
  }

  // Simulare WIF — calcul local, fara AI
  try {
    const input: SimulationInput = {
      preset: simulationType as SimulationInput["preset"],
      mode: simulationMode,
      tenantId,
      params: params || {},
    }

    const result = await runSimulation(input)

    // Learning funnel — WIF
    try {
      const { learningFunnel } = await import("@/lib/agents/learning-funnel")
      const impactSummary = `${result.summary.pozitive} pozitive, ${result.summary.riscuri} riscuri pe ${result.summary.areasAffected.join(", ")}`
      await learningFunnel({
        agentRole: "PMA",
        type: "DECISION",
        input: `WIF ${simulationType} (${simulationMode}): ${JSON.stringify(params).slice(0, 200)}`,
        output: `Impact: ${impactSummary}. ${result.transformationalInsight || ""}`.slice(0, 1000),
        success: true,
        metadata: {
          source: "unified-simulation",
          engine: "wif",
          preset: simulationType,
          mode: simulationMode,
          tenantId,
          areasAffected: result.summary.areasAffected,
        },
      })
    } catch {}

    return NextResponse.json({
      ...result,
      engine: "wif",
    })
  } catch (error) {
    console.error("[UNIFIED SIMULATION — WIF]", error)
    return NextResponse.json({ error: "Eroare simulare WIF." }, { status: 500 })
  }
}
