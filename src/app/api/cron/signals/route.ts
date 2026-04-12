/**
 * Vercel Cron endpoint — scan unprocessed external signals and create reactive tasks.
 *
 * Runs every 15 minutes. Invokes the internal signal→task pipeline.
 * Auth: CRON_SECRET (auto-injected by Vercel for cron invocations).
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const maxDuration = 60

// Category → executor role mapping (mirrors reactive-scan route)
const CATEGORY_ROLE_MAP: Record<string, string> = {
  LEGAL_REG: "CIA",
  COMPETITIVE: "MKA",
  TECHNOLOGY: "COG",
  MARKET: "DMA",
  SOCIAL: "COCSA",
  TALENT: "HR_COUNSELOR",
  ECONOMIC: "COAFin",
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const signals = await prisma.externalSignal.findMany({
      where: { processedAt: null },
      take: 10,
      orderBy: { capturedAt: "asc" },
    })

    if (signals.length === 0) {
      return NextResponse.json({ ok: true, processed: 0, message: "No pending signals" })
    }

    let created = 0
    for (const signal of signals) {
      const role = CATEGORY_ROLE_MAP[signal.category] || "COG"

      // Find first active objective for the role
      const objective = await prisma.organizationalObjective.findFirst({
        where: {
          status: "ACTIVE",
          OR: [
            { ownerRoles: { has: role } },
            { contributorRoles: { has: role } },
          ],
        },
        select: { id: true },
      })

      await prisma.agentTask.create({
        data: {
          title: `REACT ${signal.category}: ${(signal.title || "Signal").slice(0, 100)}`,
          description: `Semnal extern detectat în categoria ${signal.category}.\n**Sursă:** ${signal.source || "unknown"}\n**Titlu:** ${signal.title || "?"}\n\nAnalizează impactul și propune acțiuni.`,
          assignedTo: role,
          assignedBy: "COSO",
          status: "ASSIGNED",
          priority: "HIGH",
          taskType: "INVESTIGATION",
          businessId: "biz_jobgrade",
          objectiveId: objective?.id || null,
          tags: ["signal-reactive", `signal:${signal.id}`, `category:${signal.category}`, "auto-generated"],
          deadlineAt: new Date(Date.now() + 48 * 3600000),
        },
      })

      await prisma.externalSignal.update({
        where: { id: signal.id },
        data: { processedAt: new Date() },
      })

      created++
    }

    return NextResponse.json({
      ok: true,
      processed: created,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("[cron/signals] Error:", error.message)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}
