import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { executeProposal, rollbackProposal } from "@/lib/agents/org-executor"

function checkAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

/**
 * POST /api/v1/agents/proposals/[id]/execute
 * Execute an approved proposal.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  try {
    const result = await executeProposal(id, prisma)
    return NextResponse.json({ result })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

/**
 * DELETE /api/v1/agents/proposals/[id]/execute
 * Rollback an executed proposal.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  try {
    const result = await rollbackProposal(id, prisma)
    return NextResponse.json({ result })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
