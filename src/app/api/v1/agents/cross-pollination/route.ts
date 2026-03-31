import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { runCrossPollination } from "@/lib/agents/cross-pollination"

function checkAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

/**
 * POST /api/v1/agents/cross-pollination
 * Run cross-pollination sessions. Body: { pairs?: number }
 */
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json().catch(() => ({}))
    const result = await runCrossPollination(prisma, body.pairs || 3)
    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
