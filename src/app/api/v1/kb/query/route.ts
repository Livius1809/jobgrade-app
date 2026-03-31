import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { searchKB } from "@/lib/kb/search"

const schema = z.object({
  agentRole: z.string().min(1),
  query: z.string().min(1),
  limit: z.number().int().min(1).max(20).optional().default(10),
  kbType: z.enum(["PERMANENT", "SHARED_DOMAIN", "CLIENT_LEXICON", "METHODOLOGY"]).optional(),
})

function verifyInternalAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

export async function POST(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
  }

  try {
    const body = await req.json()
    const data = schema.parse(body)

    const results = await searchKB(data.agentRole, data.query, data.limit, data.kbType)

    return NextResponse.json({ results, count: results.length })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Date invalide.", errors: error.issues },
        { status: 400 }
      )
    }
    console.error("[KB QUERY]", error)
    return NextResponse.json({ message: "Eroare la căutare KB." }, { status: 500 })
  }
}
