import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

function checkAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

/**
 * GET /api/v1/agents/brainstorm/[id]
 * Session detail with all ideas, scores, and aggregation info.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const p = prisma as any

  const session = await p.brainstormSession.findUnique({
    where: { id },
    include: {
      ideas: {
        orderBy: { compositeScore: "desc" },
      },
    },
  })

  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Stats
  const stats = {
    totalIdeas: session.ideas.length,
    scored: session.ideas.filter((i: any) => i.status !== "PROPOSED").length,
    avgScore: session.ideas.length > 0
      ? Math.round(session.ideas.reduce((s: number, i: any) => s + (i.compositeScore || 0), 0) / session.ideas.length * 10) / 10
      : 0,
    topIdea: session.ideas[0] || null,
    byCategory: session.ideas.reduce((acc: any, i: any) => {
      acc[i.category || "other"] = (acc[i.category || "other"] || 0) + 1
      return acc
    }, {}),
  }

  // Check for proposals generated
  const proposals = await p.orgProposal.findMany({
    where: {
      proposedBy: "COG",
      rationale: { contains: session.id },
    },
    select: { id: true, title: true, status: true },
  })

  return NextResponse.json({ session, stats, proposals })
}
