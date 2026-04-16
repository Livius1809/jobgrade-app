import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/v1/debug/db-info — diagnoza db (auth required, temp)
 */
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ message: "auth" }, { status: 401 })

  try {
    const cols: Array<{ column_name: string }> = await prisma.$queryRawUnsafe(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'company_profiles' ORDER BY column_name`
    )

    const dbUrl = process.env.DATABASE_URL ?? ""
    const host = dbUrl.match(/@([^/]+)\//)?.[1] ?? "unknown"
    const dbName = dbUrl.match(/\/([^?]+)(\?|$)/)?.[1] ?? "unknown"

    return NextResponse.json({
      host,
      database: dbName,
      totalColumns: cols.length,
      columns: cols.map((c) => c.column_name),
      hasCaenCode: cols.some((c) => c.column_name === "caenCode"),
      hasIsVATPayer: cols.some((c) => c.column_name === "isVATPayer"),
    })
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
