import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { runBrainstormPipeline } from "@/lib/agents/brainstorm-engine"

function checkAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

/**
 * GET /api/v1/agents/brainstorm
 * List brainstorm sessions. ?level=TACTICAL&status=EVALUATED&initiatedBy=EMA
 */
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const url = new URL(req.url)
  const level = url.searchParams.get("level")
  const status = url.searchParams.get("status")
  const initiatedBy = url.searchParams.get("initiatedBy")

  const where: any = {}
  if (level) where.level = level
  if (status) where.status = status
  if (initiatedBy) where.initiatedBy = initiatedBy

  const sessions = await (prisma as any).brainstormSession.findMany({
    where,
    include: {
      ideas: {
        orderBy: { compositeScore: "desc" },
        take: 10,
        select: {
          id: true, title: true, generatedBy: true, compositeScore: true,
          rank: true, status: true, category: true,
        },
      },
      _count: { select: { ideas: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  })

  return NextResponse.json({ sessions, total: sessions.length })
}

/**
 * POST /api/v1/agents/brainstorm
 * Run full brainstorm pipeline: create → generate → evaluate → aggregate.
 * Body: { initiatedBy, topic, context?, topN?, aggregateUp? }
 */
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { initiatedBy, topic, context, topN, aggregateUp } = body

    if (!initiatedBy || !topic) {
      return NextResponse.json({ error: "Required: initiatedBy, topic" }, { status: 400 })
    }

    const result = await runBrainstormPipeline(
      initiatedBy, topic, context || "", prisma,
      { topN: topN || 5, aggregateUp: aggregateUp !== false }
    )

    return NextResponse.json(result, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
