/**
 * GET /api/v1/kb/get-ingest-key — Returnează cheia de ingestie pentru sesiunea curentă
 * Doar pentru useri autentificați OWNER/SUPER_ADMIN.
 * Cheia se folosește apoi pe ingest-chunked.
 */
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await auth()
  if (!session?.user?.role || !["OWNER", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return NextResponse.json({ key: process.env.INTERNAL_API_KEY })
}
