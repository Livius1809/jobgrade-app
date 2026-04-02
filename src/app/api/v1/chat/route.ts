import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { chatWithCOG } from "@/lib/agents/cog-chat"

/**
 * POST /api/v1/chat
 * Proxy autentificat pentru COG Chat — folosit din interfața browser.
 * Verifică sesiunea NextAuth (nu x-internal-key).
 * Body: { message: string, history?: Array<{role, content}> }
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Nu ești autentificat" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { message, history } = body

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "Mesajul nu poate fi gol" }, { status: 400 })
    }

    const response = await chatWithCOG(message.trim(), prisma, history)
    return NextResponse.json(response)
  } catch (e: any) {
    console.error("[CHAT PROXY] Error:", e.message)
    return NextResponse.json(
      { error: "Nu am putut procesa mesajul", details: e.message },
      { status: 500 }
    )
  }
}
