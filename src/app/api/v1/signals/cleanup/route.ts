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

  // Procesăm în batch-uri de 100 pentru a evita timeout
  let totalCleaned = 0
  const batchSize = 100

  for (let i = 0; i < 10; i++) {
    const batch = await prisma.externalSignal.findMany({
      where: {
        processedAt: null,
        category: { notIn: RELEVANT_CATEGORIES as any },
      },
      select: { id: true },
      take: batchSize,
    })

    if (batch.length === 0) break

    await prisma.externalSignal.updateMany({
      where: { id: { in: batch.map(s => s.id) } },
      data: { processedAt: new Date() },
    })

    totalCleaned += batch.length
  }

  return NextResponse.json({
    ok: true,
    cleaned: totalCleaned,
    message: `${totalCleaned} semnale irelevante marcate ca processed`,
  })
}
