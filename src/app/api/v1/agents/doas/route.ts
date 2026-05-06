import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import {
  auditMVVCoherence,
  gapAnalysis,
  proposeRemediation,
  getLiveRegistry,
  getProcedureRegistry,
  getAttributionRegistry,
  getSkillRegistry,
} from "@/lib/agents/doas-functions"

export const dynamic = "force-dynamic"

function checkAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

const requestSchema = z.object({
  function: z.enum(["F1", "F2", "F3", "F4", "F5", "F6", "F7"]),
  params: z.object({
    tenantId: z.string().optional(),
    gapArea: z.string().optional(),
  }).optional(),
})

/**
 * POST /api/v1/agents/doas
 *
 * Dispatch la cele 7 funcții DOAS.
 * Body: { function: "F1"|...|"F7", params?: { tenantId?, gapArea? } }
 */
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = requestSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { function: fn, params } = parsed.data
  const tenantId = params?.tenantId || "shared"

  try {
    switch (fn) {
      case "F1": {
        const result = await auditMVVCoherence(tenantId)
        return NextResponse.json({ function: "F1", name: "Audit coerență MVV", ...result })
      }
      case "F2": {
        const result = await gapAnalysis(tenantId)
        return NextResponse.json({ function: "F2", name: "Gap analysis", ...result })
      }
      case "F3": {
        const gapArea = params?.gapArea
        if (!gapArea) {
          return NextResponse.json(
            { error: "F3 necesită params.gapArea" },
            { status: 400 },
          )
        }
        const result = await proposeRemediation(tenantId, gapArea)
        return NextResponse.json({ function: "F3", name: "Remediere colaborativă", ...result })
      }
      case "F4": {
        const result = await getLiveRegistry(tenantId)
        return NextResponse.json({ function: "F4", name: "Registru viu fluxuri", ...result })
      }
      case "F5": {
        const result = await getProcedureRegistry(tenantId)
        return NextResponse.json({ function: "F5", name: "Registru proceduri", ...result })
      }
      case "F6": {
        const result = await getAttributionRegistry(tenantId)
        return NextResponse.json({ function: "F6", name: "Registru atribuții", ...result })
      }
      case "F7": {
        const result = await getSkillRegistry(tenantId)
        return NextResponse.json({ function: "F7", name: "Registru skill-uri", ...result })
      }
      default:
        return NextResponse.json({ error: `Unknown function: ${fn}` }, { status: 400 })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
