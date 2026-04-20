/**
 * POST /api/v1/signals/cleanup
 *
 * Marchează ca processed toate semnalele care nu trec filtrul activ.
 * Apelat de n8n cron sau manual.
 * Auth: x-internal-key
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const RELEVANT_CATEGORIES = ["LEGAL_REG", "COMPETITIVE", "MARKET", "TECHNOLOGY", "TALENT"] as const

export async function POST(req: NextRequest) {
  const key = req.headers.get("x-internal-key")
  if (key !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // SQL raw — instant, fără overhead Prisma
  const result = await prisma.$executeRawUnsafe(`
    UPDATE "external_signals"
    SET "processedAt" = NOW()
    WHERE "processedAt" IS NULL
    AND "category" NOT IN ('LEGAL_REG', 'COMPETITIVE', 'MARKET', 'TECHNOLOGY', 'TALENT')
  `)

  return NextResponse.json({
    ok: true,
    cleaned: result,
    message: `${result} semnale irelevante marcate ca processed`,
  })
}
