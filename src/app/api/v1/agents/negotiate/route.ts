import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { negotiate } from "@/lib/agents/lateral-negotiation"

function checkAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

/**
 * POST /api/v1/agents/negotiate
 * Start a lateral negotiation between two agents.
 * Body: {
 *   topic: string,
 *   agentA: { role, position, arguments[], priority },
 *   agentB: { role, position, arguments[], priority }
 * }
 */
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { topic, agentA, agentB } = body

    if (!topic || !agentA?.role || !agentB?.role) {
      return NextResponse.json({ error: "Required: topic, agentA.role, agentB.role" }, { status: 400 })
    }

    const result = await negotiate(
      topic,
      {
        agentRole: agentA.role,
        position: agentA.position || "Nedefinită",
        arguments: agentA.arguments || [],
        priority: agentA.priority || "MEDIUM",
      },
      {
        agentRole: agentB.role,
        position: agentB.position || "Nedefinită",
        arguments: agentB.arguments || [],
        priority: agentB.priority || "MEDIUM",
      },
      prisma
    )

    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
