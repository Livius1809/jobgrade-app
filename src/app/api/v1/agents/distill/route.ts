import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { runDistillationCycle, distillForManager } from "@/lib/agents/knowledge-distiller"

function checkAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

/**
 * POST /api/v1/agents/distill
 * Rulare ciclu distilare cunoaștere bottom-up.
 * Body: { managerRole?: string } — un singur manager sau toți
 */
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json().catch(() => ({}))

    if (body.managerRole) {
      const result = await distillForManager(body.managerRole, prisma)
      return NextResponse.json(result || { message: "Nothing to distill" })
    }

    const result = await runDistillationCycle(prisma)
    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
