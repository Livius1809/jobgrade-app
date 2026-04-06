import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  DisfunctionClass,
  DisfunctionStatus,
  DisfunctionTarget,
} from "@/generated/prisma"

export const dynamic = "force-dynamic"

/**
 * GET /api/v1/disfunctions
 *
 * Listare evenimente de disfuncție. Query params:
 * - class: D1_TECHNICAL | D2_FUNCTIONAL_MGMT | D3_BUSINESS_PROCESS
 * - status: OPEN | REMEDIATING | RESOLVED | ESCALATED
 * - targetType: SERVICE | WORKFLOW | ROLE | FLUX_STEP
 * - targetId: string
 * - sinceHours: number (default 24)
 * - limit: number (default 100, max 500)
 */

function verifyInternalAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

export async function GET(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const classParam = url.searchParams.get("class")
  const statusParam = url.searchParams.get("status")
  const targetTypeParam = url.searchParams.get("targetType")
  const targetId = url.searchParams.get("targetId") ?? undefined
  const sinceHours = Math.min(
    Math.max(parseInt(url.searchParams.get("sinceHours") ?? "24", 10) || 24, 1),
    24 * 30,
  )
  const limit = Math.min(
    Math.max(parseInt(url.searchParams.get("limit") ?? "100", 10) || 100, 1),
    500,
  )

  const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000)

  const events = await prisma.disfunctionEvent.findMany({
    where: {
      detectedAt: { gte: since },
      ...(classParam && { class: classParam as DisfunctionClass }),
      ...(statusParam && { status: statusParam as DisfunctionStatus }),
      ...(targetTypeParam && { targetType: targetTypeParam as DisfunctionTarget }),
      ...(targetId && { targetId }),
    },
    orderBy: { detectedAt: "desc" },
    take: limit,
  })

  // Summary agregat pentru dashboard
  const summary = {
    total: events.length,
    byClass: {
      D1_TECHNICAL: events.filter((e) => e.class === "D1_TECHNICAL").length,
      D2_FUNCTIONAL_MGMT: events.filter((e) => e.class === "D2_FUNCTIONAL_MGMT").length,
      D3_BUSINESS_PROCESS: events.filter((e) => e.class === "D3_BUSINESS_PROCESS").length,
    },
    byStatus: {
      OPEN: events.filter((e) => e.status === "OPEN").length,
      REMEDIATING: events.filter((e) => e.status === "REMEDIATING").length,
      RESOLVED: events.filter((e) => e.status === "RESOLVED").length,
      ESCALATED: events.filter((e) => e.status === "ESCALATED").length,
    },
  }

  return NextResponse.json({ summary, events })
}
