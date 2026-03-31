import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

function checkAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

/**
 * GET /api/v1/agents/proposals
 * List proposals with optional filter: ?status=DRAFT&proposedBy=COG
 */
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const url = new URL(req.url)
  const status = url.searchParams.get("status")
  const proposedBy = url.searchParams.get("proposedBy")

  const where: any = {}
  if (status) where.status = status
  if (proposedBy) where.proposedBy = proposedBy

  const proposals = await (prisma as any).orgProposal.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  return NextResponse.json({ proposals, total: proposals.length })
}

/**
 * POST /api/v1/agents/proposals
 * Create a new proposal.
 */
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { proposalType, proposedBy, title, description, rationale, changeSpec, agentRole } = body

    if (!proposalType || !proposedBy || !title || !changeSpec) {
      return NextResponse.json(
        { error: "Required: proposalType, proposedBy, title, changeSpec" },
        { status: 400 }
      )
    }

    const proposal = await (prisma as any).orgProposal.create({
      data: {
        proposalType,
        status: "DRAFT",
        proposedBy,
        title,
        description: description || title,
        rationale: rationale || `Propus de ${proposedBy}`,
        changeSpec,
        agentRole: agentRole || null,
      },
    })

    return NextResponse.json({ proposal }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
