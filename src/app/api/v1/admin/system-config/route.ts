import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/v1/admin/system-config
 * Returns all system config key-value pairs. Owner/SuperAdmin only.
 *
 * POST /api/v1/admin/system-config
 * Upsert a config value. Body: { key, value }
 */

export const dynamic = "force-dynamic"

async function checkOwner() {
  const session = await auth()
  return session && ["OWNER", "SUPER_ADMIN"].includes(session.user.role)
}

export async function GET() {
  if (!(await checkOwner())) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 403 })
  }

  const configs = await prisma.systemConfig.findMany({
    orderBy: { key: "asc" },
  })

  return NextResponse.json({ configs })
}

export async function POST(req: NextRequest) {
  if (!(await checkOwner())) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 403 })
  }

  const { key, value } = await req.json()
  if (!key || value === undefined) {
    return NextResponse.json({ error: "key și value sunt obligatorii" }, { status: 400 })
  }

  const config = await prisma.systemConfig.upsert({
    where: { key },
    update: { value: String(value) },
    create: { key, value: String(value) },
  })

  return NextResponse.json({ ok: true, config })
}
