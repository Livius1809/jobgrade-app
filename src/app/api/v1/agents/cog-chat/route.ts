import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { chatWithCOG } from "@/lib/agents/cog-chat"

function checkAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

/**
 * POST /api/v1/agents/cog-chat
 * Chat with COG (Chief Orchestrator General).
 * Body: { message: string, history?: Array<{role: "owner"|"cog", content: string}> }
 */
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { message, history } = body

    if (!message) {
      return NextResponse.json({ error: "Required: message" }, { status: 400 })
    }

    const response = await chatWithCOG(message, prisma, history)
    return NextResponse.json(response)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
