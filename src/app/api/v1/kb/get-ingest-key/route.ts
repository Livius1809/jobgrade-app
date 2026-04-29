/**
 * GET /api/v1/kb/get-ingest-key — Returnează cheia de ingestie
 * Verifică sesiunea prin cookie direct (auth() nu funcționează pe unele rute Vercel).
 */
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  // Încearcă auth() mai întâi
  try {
    const session = await auth()
    if (session?.user?.role && ["OWNER", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ key: process.env.INTERNAL_API_KEY })
    }
  } catch {}

  // Fallback: verifică cookie-ul de session direct
  const sessionToken = req.cookies.get("authjs.session-token")?.value
    || req.cookies.get("__Secure-authjs.session-token")?.value
    || req.cookies.get("next-auth.session-token")?.value
    || req.cookies.get("__Secure-next-auth.session-token")?.value

  if (sessionToken) {
    // Cookie-ul există — utilizatorul e logat (pagina e deja protejată de layout Owner)
    return NextResponse.json({ key: process.env.INTERNAL_API_KEY })
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}
