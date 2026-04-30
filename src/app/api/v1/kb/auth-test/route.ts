import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const session = await auth()
  return NextResponse.json({
    hasSession: !!session,
    email: session?.user?.email || null,
    role: session?.user?.role || null,
    cookies: req.cookies.getAll().map(c => c.name),
  })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  // Citim body-ul DUPĂ auth
  const body = await req.json().catch(() => ({}))
  return NextResponse.json({
    hasSession: !!session,
    email: session?.user?.email || null,
    role: session?.user?.role || null,
    bodySize: JSON.stringify(body).length,
  })
}
