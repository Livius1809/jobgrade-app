import { NextRequest, NextResponse } from "next/server"
import { getKBHealth } from "@/lib/kb/search"

function verifyInternalAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ role: string }> }
) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
  }

  try {
    const { role } = await params
    const agentRole = decodeURIComponent(role).toUpperCase()

    const health = await getKBHealth(agentRole)

    return NextResponse.json(health)
  } catch (error) {
    console.error("[KB HEALTH]", error)
    return NextResponse.json({ message: "Eroare la verificare KB." }, { status: 500 })
  }
}
