import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { processKnowledgeRequest } from "@/lib/agents/knowledge-request"

function checkAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

/**
 * POST /api/v1/agents/knowledge-request
 * Inițiază o cerere de cunoaștere cu cascadare inteligentă.
 * Body: { initiator, sentTo, question, context? }
 */
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { initiator, sentTo, question, context } = body

    if (!initiator || !sentTo || !question) {
      return NextResponse.json({ error: "Required: initiator, sentTo, question" }, { status: 400 })
    }

    const response = await processKnowledgeRequest(initiator, sentTo, question, context, prisma)
    return NextResponse.json(response)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
