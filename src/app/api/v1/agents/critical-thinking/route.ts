import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  evaluateCritically,
  getCriticalThinkingStats,
} from "@/lib/cpu/critical-thinker"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function checkAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

/**
 * GET /api/v1/agents/critical-thinking
 *
 * Returns stats: how many responses were flagged/contested/rejected in last N days.
 * Query params: ?days=30
 */
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const days = parseInt(searchParams.get("days") ?? "30", 10)

  try {
    const stats = await getCriticalThinkingStats(days)

    return NextResponse.json({
      ok: true,
      stats,
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * POST /api/v1/agents/critical-thinking
 *
 * Manually evaluate a text against KB and heuristics.
 *
 * Body: { text: string, agentRole: string, taskTitle?: string, taskDescription?: string }
 */
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { text, agentRole, taskTitle, taskDescription } = body

    if (!text || !agentRole) {
      return NextResponse.json(
        { error: "Missing required fields: text, agentRole" },
        { status: 400 }
      )
    }

    const evaluation = await evaluateCritically(text, {
      agentRole,
      taskTitle,
      taskDescription,
    })

    return NextResponse.json({
      ok: true,
      evaluation,
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
