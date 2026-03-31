import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { runDailyReflection, reflectAgent } from "@/lib/agents/idle-reflection"
import { generateIdeas, evaluateIdeas, aggregateToParent } from "@/lib/agents/brainstorm-engine"
import { autoBroadcastRecent } from "@/lib/agents/knowledge-broadcast"

function checkAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

/**
 * POST /api/v1/agents/reflection
 * Trigger reflection. Body: { role?: string, managersOnly?: boolean }
 * If role specified, reflects single agent. Otherwise batch.
 */
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json().catch(() => ({}))

    if (body.role) {
      const result = await reflectAgent(body.role, prisma)
      return NextResponse.json(result)
    }

    const result = await runDailyReflection(prisma, {
      managersOnly: body.managersOnly,
      roles: body.roles,
    })

    // Auto-complete brainstorm sessions created by reflection
    try {
      const pendingSessions = await (prisma as any).brainstormSession.findMany({
        where: { status: "GENERATING" },
        take: 5,
      })
      for (const session of pendingSessions) {
        await generateIdeas(session.id, prisma)
        await evaluateIdeas(session.id, prisma)
        await aggregateToParent(session.id, prisma)
      }
      if (pendingSessions.length > 0) {
        (result as any).brainstormSessionsCompleted = pendingSessions.length
      }
    } catch { /* non-blocking */ }

    // Auto-broadcast recent brainstorm insights to ALL agents
    try {
      const broadcast = await autoBroadcastRecent(prisma)
      if (broadcast.ideas > 0) {
        (result as any).broadcastedIdeas = broadcast.ideas
        ;(result as any).broadcastReach = broadcast.reach
      }
    } catch { /* non-blocking */ }

    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
