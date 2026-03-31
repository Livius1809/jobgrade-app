import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  addProductionLayer,
  addToLayer,
  checkSplitReadiness,
  splitProductionLayer,
  getAgentLayers,
} from "@/lib/agents/agent-layers"

function checkAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

/**
 * GET /api/v1/agents/layers?agentRole=FDA
 * Get layers info for an agent.
 */
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const url = new URL(req.url)
  const agentRole = url.searchParams.get("agentRole")
  if (!agentRole) return NextResponse.json({ error: "agentRole required" }, { status: 400 })

  try {
    const info = await getAgentLayers(agentRole, prisma)
    const readiness = await checkSplitReadiness(agentRole, prisma)
    return NextResponse.json({ ...info, splitReadiness: readiness })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

/**
 * POST /api/v1/agents/layers
 * Actions: addProduction, addKB, checkSplit, split
 */
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()

    switch (body.action) {
      case "addProduction": {
        const result = await addProductionLayer(body.agentRole, body.opsDescription, prisma)
        return NextResponse.json(result)
      }

      case "addKB": {
        const id = await addToLayer(body.agentRole, body.layerType, body.content, body.tags || [], prisma)
        return NextResponse.json({ id })
      }

      case "checkSplit": {
        const readiness = await checkSplitReadiness(body.agentRole, prisma)
        return NextResponse.json(readiness)
      }

      case "split": {
        const result = await splitProductionLayer(
          body.agentRole,
          body.newSuffix || "OPS",
          body.parentRole || "COCSA",
          prisma
        )
        return NextResponse.json(result)
      }

      default:
        return NextResponse.json({ error: "action required: addProduction, addKB, checkSplit, split" }, { status: 400 })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
