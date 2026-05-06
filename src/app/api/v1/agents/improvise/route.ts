import { NextRequest, NextResponse } from "next/server"
import { improvise, getImprovisationStats, getImprovisationLog } from "@/lib/engines/improvisation-engine"

export const dynamic = "force-dynamic"

function checkAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

/**
 * POST /api/v1/agents/improvise
 *
 * Test improvisation with a given context.
 * Body: { taskTitle, taskDescription, agentRole, failureReason, availableKB? }
 */
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()

    if (!body.taskTitle || !body.agentRole || !body.failureReason) {
      return NextResponse.json(
        { error: "Required: taskTitle, agentRole, failureReason" },
        { status: 400 },
      )
    }

    const result = await improvise({
      taskTitle: body.taskTitle,
      taskDescription: body.taskDescription ?? body.taskTitle,
      agentRole: body.agentRole,
      failureReason: body.failureReason,
      availableKB: body.availableKB ?? [],
    })

    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * GET /api/v1/agents/improvise
 *
 * Returns improvisation stats and recent log.
 * Query params: ?log=true for log entries, ?limit=N for log limit.
 */
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const url = new URL(req.url)
    const includeLog = url.searchParams.get("log") === "true"
    const limit = parseInt(url.searchParams.get("limit") ?? "20", 10)

    const stats = await getImprovisationStats()

    if (includeLog) {
      const log = await getImprovisationLog(limit)
      return NextResponse.json({ stats, log })
    }

    return NextResponse.json({ stats })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
