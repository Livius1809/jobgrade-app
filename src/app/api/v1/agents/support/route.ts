import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { handleSupportRequest } from "@/lib/agents/support-department"

function checkAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

/**
 * POST /api/v1/agents/support
 * Trimite cerere la departamentul suport.
 * Body: { fromAgent: string, situation: string, context?: string }
 *
 * Departamentul face triaj automat, formează echipa, integrează răspunsul.
 */
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { fromAgent, situation, context } = body

    if (!fromAgent || !situation) {
      return NextResponse.json({ error: "Required: fromAgent, situation" }, { status: 400 })
    }

    const response = await handleSupportRequest(
      { fromAgent, situation, context },
      prisma
    )

    return NextResponse.json(response)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
