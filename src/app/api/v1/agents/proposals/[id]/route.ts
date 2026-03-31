import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

function checkAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

/**
 * GET /api/v1/agents/proposals/[id]
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const proposal = await (prisma as any).orgProposal.findUnique({ where: { id } })
  if (!proposal) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({ proposal })
}
