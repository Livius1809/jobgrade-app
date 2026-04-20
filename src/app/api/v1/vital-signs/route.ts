/**
 * POST /api/v1/vital-signs
 * Salvează rezultatele vital signs în DB (SystemConfig).
 * Apelat de GitHub Actions după rularea scriptului.
 *
 * GET /api/v1/vital-signs
 * Returnează ultimul raport vital signs.
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

const VS_KEY = "VITAL_SIGNS_LATEST"

export async function POST(req: NextRequest) {
  const key = req.headers.get("x-internal-key")
  if (key !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()

    await prisma.systemConfig.upsert({
      where: { key: VS_KEY },
      update: { value: JSON.stringify(body) },
      create: { key: VS_KEY, value: JSON.stringify(body) },
    })

    return NextResponse.json({ ok: true, saved: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const key = req.headers.get("x-internal-key")
  const session = req.headers.get("authorization")
  if (!key && !session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const config = await prisma.systemConfig.findUnique({ where: { key: VS_KEY } })
  if (!config) {
    return NextResponse.json({ error: "No vital signs report" }, { status: 404 })
  }

  return NextResponse.json(JSON.parse(config.value))
}
