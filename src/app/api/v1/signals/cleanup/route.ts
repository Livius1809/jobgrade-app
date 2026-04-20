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

const RELEVANT_CATEGORIES = new Set(["LEGAL_REG", "COMPETITIVE", "MARKET", "TECHNOLOGY", "TALENT"])

export async function POST(req: NextRequest) {
  const key = req.headers.get("x-internal-key")
  if (key !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const result = await prisma.externalSignal.updateMany({
    where: {
      processedAt: null,
      category: { notIn: [...RELEVANT_CATEGORIES] },
    },
    data: {
      processedAt: new Date(),
    },
  })

  return NextResponse.json({
    ok: true,
    cleaned: result.count,
    message: `${result.count} semnale irelevante marcate ca processed`,
  })
}
