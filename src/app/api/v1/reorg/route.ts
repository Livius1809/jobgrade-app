import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { ReorgStatus } from "@/generated/prisma"

export const dynamic = "force-dynamic"

/**
 * GET /api/v1/reorg
 *
 * Listare evenimente de reorganizare (Sprint 3 Faza 3c — STUB).
 *
 * Endpoint-ul există pentru:
 *  1. A expune modelul de date concret pentru discuții arhitecturale (Block 2)
 *  2. A permite inspecția tabel-ului prin API, nu doar prin DB direct
 *
 * ACȚIUNILE (POST /reorg/redistribute, POST /reorg/revert) NU sunt încă implementate.
 * Vor fi tăiate într-o sesiune dedicată după ce designul e confirmat de Owner.
 *
 * Principiu: reorganizările atinge DOAR structura temporară (canal/ritm), NICIODATĂ fond.
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
  const statusParam = url.searchParams.get("status")
  const roleCode = url.searchParams.get("roleCode")

  const events = await prisma.reorganizationEvent.findMany({
    where: {
      ...(statusParam && { status: statusParam as ReorgStatus }),
      ...(roleCode && { triggeredByRole: roleCode }),
    },
    orderBy: { appliedAt: "desc" },
    take: 100,
  })

  const summary = {
    total: events.length,
    byStatus: {
      ACTIVE: events.filter((e) => e.status === "ACTIVE").length,
      REVERTED: events.filter((e) => e.status === "REVERTED").length,
      ESCALATED: events.filter((e) => e.status === "ESCALATED").length,
      CONFLICTED: events.filter((e) => e.status === "CONFLICTED").length,
    },
  }

  return NextResponse.json({
    status: "stub_phase_3c_pending_implementation",
    note: "Model e definit. Acțiunile POST (/redistribute, /revert) vor fi implementate după design confirmation.",
    summary,
    events,
  })
}
